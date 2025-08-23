import { WebPartContext } from '@microsoft/sp-webpart-base';
import { SharePointService, ISharePointEvent } from './SharePointService';
import { PrivateEventsService, IPrivateEventData } from './PrivateEventsService';
import { Logger } from './LoggingService';
import { ICalendarEvent, SwimlaneType, StatusType } from '../components/ICalendarEvent';


export interface IHybridEventResult {
  success: boolean;
  event?: ICalendarEvent;
  errorMessage?: string;
  warning?: string;
}

/**
 * Service that manages both public and private events using the hybrid approach
 */
export class HybridEventsService {
  private sharePointService: SharePointService;
  private privateEventsService: PrivateEventsService;
  private canAccessPrivateEvents: boolean | undefined = undefined;

  constructor(context: WebPartContext, listName: string = 'Events') {
    this.sharePointService = new SharePointService(context, listName);
    this.privateEventsService = new PrivateEventsService(context);
  }

  /**
   * Get all events (public + private based on user permissions)
   */
  public async getAllEvents(emulateNonPrivilegedUser: boolean = false): Promise<ICalendarEvent[]> {
    try {
      // Get public events
      const publicEvents = await this.sharePointService.getEvents();
      
      // Check if user can access private events (or if we're emulating non-privileged user)
      this.canAccessPrivateEvents = emulateNonPrivilegedUser ? false : await this.privateEventsService.canUserAccessPrivateEvents();

      if (!this.canAccessPrivateEvents) {
        // User cannot see private events - return public events with "Unavailable" placeholders
        return this.convertToCalendarEvents(publicEvents, []);
      }

      // User can see private events - get private data and merge
      const privateEvents = await this.privateEventsService.getPrivateEvents();
      return this.convertToCalendarEvents(publicEvents, privateEvents);

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Failed to fetch events: ${errorMessage}`);
    }
  }

  /**
   * Create a new event (public or private)
   */
  public async createEvent(
    title: string,
    start: Date,
    end: Date,
    swimlane: string,
    status: string,
    description: string,
    isPrivate: boolean = false
  ): Promise<IHybridEventResult> {
    try {
      if (!isPrivate) {
        // Create regular public event
        const result = await this.sharePointService.createEvent(
          title, start, end, swimlane, status, description, false
        );

        return {
          success: true,
          event: this.sharePointEventToCalendarEvent(result)
        };
      }

      // Try to create private event using hybrid approach
      try {
        // 1. Create full event in private list first to get numeric ID
        const privateEvent = await this.privateEventsService.createPrivateEvent(
          title, // Real title
          start,
          end,
          swimlane,
          status,
          description // Full description
        );

        if (!privateEvent) {
          return {
            success: false,
            errorMessage: 'Failed to create private event'
          };
        }

        // 2. Create placeholder in main list using the numeric ID
        const placeholder = await this.sharePointService.createEvent(
          'Unavailable', // Generic title
          start,
          end,
          swimlane, // Keep category for filtering
          status,
          '', // No description in placeholder
          true, // Mark as private
          privateEvent.Id.toString() // Store numeric ID as string
        );



        return {
          success: true,
          event: this.privateEventToCalendarEvent(privateEvent, placeholder)
        };

      } catch (privateError) {
        Logger.warn('Could not create private event with hybrid approach, falling back to simple private event', privateError);

        // Fallback: Create as private event in main list only (without separate private list)
        const result = await this.sharePointService.createEvent(
          title, start, end, swimlane, status, description, true // Still mark as private
        );

        return {
          success: true,
          event: this.sharePointEventToCalendarEvent(result),
          warning: 'Event created as private in main list only - private details list not available'
        };
      }

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        success: false,
        errorMessage: `Failed to create event: ${errorMessage}`
      };
    }
  }

  /**
   * Update an existing event
   */
  public async updateEvent(
    id: number | string,
    title: string,
    start: Date,
    end: Date,
    swimlane?: string,
    status?: string,
    description?: string,
    isPrivate?: boolean
  ): Promise<IHybridEventResult> {
    try {

      // Get the current event to understand its current state
      const currentEvents = await this.sharePointService.getEvents();
      let currentEvent: ISharePointEvent | undefined;
      for (const e of currentEvents) {
        if (e.Id === id) {
          currentEvent = e;
          break;
        }
      }

      if (!currentEvent) {
        return {
          success: false,
          errorMessage: `Event with ID ${id} not found`
        };
      }

      const wasPrivate = currentEvent.Private;
      const willBePrivate = isPrivate || false;



      // Case 1: Public -> Private conversion
      if (!wasPrivate && willBePrivate) {
        return await this.convertPublicToPrivate(
          id as number, title, start, end, swimlane!, status!, description || ''
        );
      }

      // Case 2: Private -> Public conversion
      if (wasPrivate && !willBePrivate) {
        return await this.convertPrivateToPublic(
          id as number, title, start, end, swimlane!, status!, description || ''
        );
      }

      // Case 3: Regular update (no privacy change)
      if (wasPrivate && willBePrivate) {
        // Update private event
        return await this.updatePrivateEvent(
          id as number, title, start, end, swimlane!, status!, description || ''
        );
      } else {
        // Update public event
        await this.sharePointService.updateEvent(
          id as number, title, start, end, swimlane!, status!, description, false
        );
        return { success: true };
      }

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        success: false,
        errorMessage: `Failed to update event: ${errorMessage}`
      };
    }
  }

  /**
   * Convert a public event to private
   */
  private async convertPublicToPrivate(
    id: number,
    title: string,
    start: Date,
    end: Date,
    swimlane: string,
    status: string,
    description: string
  ): Promise<IHybridEventResult> {

    // 1. Create private event in PrivateEvents list
    const privateEvent = await this.privateEventsService.createPrivateEvent(
      title, start, end, swimlane, status, description
    );

    if (!privateEvent) {
      return {
        success: false,
        errorMessage: 'Failed to create private event'
      };
    }

    // 2. Update main list event to "Unavailable" placeholder
    await this.sharePointService.updateEvent(
      id, 'Unavailable', start, end, swimlane, status, '', true, privateEvent.Id.toString()
    );

    return {
      success: true,
      warning: 'Event converted to private. Other users will see "Unavailable".'
    };
  }

  /**
   * Convert a private event to public
   */
  private async convertPrivateToPublic(
    id: number,
    title: string,
    start: Date,
    end: Date,
    swimlane: string,
    status: string,
    description: string
  ): Promise<IHybridEventResult> {

    // Get current event to find PrivateEventId
    const currentEvents = await this.sharePointService.getEvents();
    let currentEvent: ISharePointEvent | undefined;
    for (const e of currentEvents) {
      if (e.Id === id) {
        currentEvent = e;
        break;
      }
    }

    if (!currentEvent?.PrivateEventId) {
      return {
        success: false,
        errorMessage: 'Cannot convert to public: Private event ID not found'
      };
    }

    // 1. Delete private event from PrivateEvents list (convert string ID to number)
    await this.privateEventsService.deletePrivateEvent(parseInt(currentEvent.PrivateEventId, 10));

    // 2. Update main list event with actual data
    await this.sharePointService.updateEvent(
      id, title, start, end, swimlane, status, description, false
    );

    return {
      success: true,
      warning: 'Event converted to public. All users can now see the details.'
    };
  }

  /**
   * Update an existing private event
   */
  private async updatePrivateEvent(
    id: number,
    title: string,
    start: Date,
    end: Date,
    swimlane: string,
    status: string,
    description: string
  ): Promise<IHybridEventResult> {

    // Get current event to find PrivateEventId
    const currentEvents = await this.sharePointService.getEvents();
    let currentEvent: ISharePointEvent | undefined;
    for (const e of currentEvents) {
      if (e.Id === id) {
        currentEvent = e;
        break;
      }
    }

    if (!currentEvent?.PrivateEventId) {
      return {
        success: false,
        errorMessage: 'Cannot update private event: Private event ID not found'
      };
    }

    // 1. Update private event in PrivateEvents list (convert string ID to number)
    await this.privateEventsService.updatePrivateEvent(
      parseInt(currentEvent.PrivateEventId, 10), title, start, end, swimlane, status, description
    );

    // 2. Update placeholder in main list (keep as "Unavailable" but update times/category)
    await this.sharePointService.updateEvent(
      id, 'Unavailable', start, end, swimlane, status, '', true, currentEvent.PrivateEventId
    );

    return { success: true };
  }

  /**
   * Delete an event (handles both public and private)
   */
  public async deleteEvent(id: number | string): Promise<IHybridEventResult> {
    try {
      // Implementation for deleting events will be added in next step
      return {
        success: false,
        errorMessage: 'Delete functionality not yet implemented'
      };

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        success: false,
        errorMessage: `Failed to delete event: ${errorMessage}`
      };
    }
  }

  /**
   * Convert SharePoint events to Calendar events, merging private data when available
   */
  private convertToCalendarEvents(
    publicEvents: ISharePointEvent[],
    privateEvents: IPrivateEventData[]
  ): ICalendarEvent[] {


    const privateEventMap = new Map<string, IPrivateEventData>();

    // Create lookup map for private events by their numeric ID (converted to string)
    privateEvents.forEach(pe => {
      privateEventMap.set(pe.Id.toString(), pe);
    });

    const convertedEvents = publicEvents.map(event => {
      if (event.Private && event.PrivateEventId) {
        // This is a private event placeholder
        const privateData = privateEventMap.get(event.PrivateEventId);

        if (privateData && this.canAccessPrivateEvents) {
          // User can see private events - return real data
          return this.privateEventToCalendarEvent(privateData, event);
        } else {
          // User cannot see private events - return "Unavailable" placeholder
          return this.createUnavailableEvent(event);
        }
      }

      // Regular public event
      return this.sharePointEventToCalendarEvent(event);
    });



    return convertedEvents;
  }

  /**
   * Convert SharePoint event to Calendar event
   */
  private sharePointEventToCalendarEvent(event: ISharePointEvent): ICalendarEvent {
    return {
      id: event.Id,
      title: event.Title,
      start: this.parseSharePointDate(event.EventDate),
      end: this.parseSharePointDate(event.EndDate),
      swimlane: event.Swimlane as SwimlaneType,
      status: event.Status as StatusType,
      description: event.Description,
      isPrivate: event.Private,
      privateEventId: event.PrivateEventId
    };
  }

  /**
   * Convert private event data to Calendar event
   */
  private privateEventToCalendarEvent(privateEvent: IPrivateEventData, placeholder: ISharePointEvent): ICalendarEvent {
    return {
      id: placeholder.Id, // Use placeholder ID for UI operations
      title: privateEvent.Title, // Real title from private list
      start: this.parseSharePointDate(privateEvent.EventDate),
      end: this.parseSharePointDate(privateEvent.EndDate),
      swimlane: privateEvent.Swimlane as SwimlaneType,
      status: privateEvent.Status as StatusType,
      description: privateEvent.Description,
      isPrivate: true,
      privateEventId: privateEvent.PrivateEventId
    };
  }

  /**
   * Create "Unavailable" event for users who cannot see private events
   */
  private createUnavailableEvent(placeholder: ISharePointEvent): ICalendarEvent {
    return {
      id: placeholder.Id,
      title: 'Unavailable',
      start: this.parseSharePointDate(placeholder.EventDate),
      end: this.parseSharePointDate(placeholder.EndDate),
      swimlane: placeholder.Swimlane as SwimlaneType,
      status: placeholder.Status as StatusType,
      description: '',
      isPrivate: true,
      privateEventId: placeholder.PrivateEventId
    };
  }

  /**
   * Parse SharePoint date string to JavaScript Date
   * Handle timezone-safe parsing for local time preservation
   */
  private parseSharePointDate(dateString: string): Date {
    // SharePoint always returns UTC dates with 'Z' suffix
    // Standard Date constructor handles this correctly
    const date = new Date(dateString);



    // Check if we got a valid date
    if (isNaN(date.getTime())) {
      Logger.warn('Invalid date string:', dateString);
      return new Date(); // Fallback to current date
    }

    return date;
  }

  /**
   * Check if current user can access private events
   */
  public async canUserAccessPrivateEvents(): Promise<boolean> {
    if (this.canAccessPrivateEvents === undefined) {
      this.canAccessPrivateEvents = await this.privateEventsService.canUserAccessPrivateEvents();
    }
    return this.canAccessPrivateEvents;
  }

  /**
   * Reset permission cache
   */
  public resetPermissionCache(): void {
    this.canAccessPrivateEvents = undefined;
    this.privateEventsService.resetPermissionCache();
  }
}
