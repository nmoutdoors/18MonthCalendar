import { WebPartContext } from '@microsoft/sp-webpart-base';
import { spfi, SPFx } from '@pnp/sp';
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';
import { ISharePointEvent } from './SharePointService';
import { Logger } from './LoggingService';

export interface IPrivateEventData extends ISharePointEvent {
  // Private events use the same structure as SharePoint events
  // The linking is done via the main list's PrivateEventId field pointing to this event's Id
}

export class PrivateEventsService {
  private sp: ReturnType<typeof spfi>;
  private privateListName: string = 'PrivateEvents';
  private canAccessPrivateEvents: boolean | undefined = undefined; // Cache permission check

  constructor(context: WebPartContext) {
    // Initialize PnP.js with the SPFx context
    this.sp = spfi().using(SPFx(context));
  }

  /**
   * Check if current user can access private events list
   * Uses 403 error approach as requested
   */
  public async canUserAccessPrivateEvents(): Promise<boolean> {
    // Return cached result if available
    if (this.canAccessPrivateEvents !== undefined) {
      return this.canAccessPrivateEvents;
    }

    try {
      // Try to query the private events list
      await this.sp.web.lists.getByTitle(this.privateListName).items
        .select('Id')
        .top(1)();
      
      Logger.debug('User has access to private events');
      this.canAccessPrivateEvents = true;
      return true;
    } catch {
      Logger.debug('User does not have access to private events');
      this.canAccessPrivateEvents = false;
      return false;
    }
  }

  /**
   * Get all private events (only if user has permission)
   */
  public async getPrivateEvents(): Promise<IPrivateEventData[]> {
    const hasAccess = await this.canUserAccessPrivateEvents();
    if (!hasAccess) {
      return []; // Return empty array if no access
    }

    try {
      const items = await this.sp.web.lists.getByTitle(this.privateListName).items
        .select('Id', 'Title', 'EventDate', 'EndDate', 'Swimlane', 'Status', 'Description', 'Private', 'PrivateEventId')
        .orderBy('EventDate', true)
        .top(5000)();

      return items.map((item: {
        Id: number;
        Title: string;
        EventDate: string;
        EndDate: string;
        Swimlane: string;
        Status: string;
        Description: string;
        Private: boolean;
        PrivateEventId: string;
      }) => ({
        Id: item.Id,
        Title: item.Title,
        EventDate: item.EventDate,
        EndDate: item.EndDate,
        Swimlane: item.Swimlane,
        Status: item.Status,
        Description: item.Description || '',
        Private: item.Private || false,
        PrivateEventId: item.PrivateEventId
      }));

    } catch (error: unknown) {
      Logger.error('Error fetching private events', error);
      return []; // Return empty array on error
    }
  }

  /**
   * Create a private event
   */
  public async createPrivateEvent(
    title: string,
    start: Date,
    end: Date,
    swimlane: string,
    status: string,
    description: string
  ): Promise<IPrivateEventData | undefined> {
    const hasAccess = await this.canUserAccessPrivateEvents();
    if (!hasAccess) {
      throw new Error('Access denied to private events');
    }

    try {
      const result = await this.sp.web.lists.getByTitle(this.privateListName).items.add({
        Title: title,
        EventDate: start.toISOString(), // Standard SharePoint Events field
        EndDate: end.toISOString(),     // Standard SharePoint Events field
        Swimlane: swimlane,
        Status: status,
        Description: description,
        Private: true
      });

      return {
        Id: result.Id,
        Title: result.Title,
        EventDate: result.EventDate,
        EndDate: result.EndDate,
        Swimlane: result.Swimlane,
        Status: result.Status,
        Description: result.Description || '',
        Private: result.Private || false
      };

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      Logger.error('Error creating private event', error);
      throw new Error(`Failed to create private event: ${errorMessage}`);
    }
  }

  /**
   * Update a private event
   */
  public async updatePrivateEvent(
    id: number,
    title: string, 
    start: Date, 
    end: Date, 
    swimlane?: string, 
    status?: string, 
    description?: string
  ): Promise<void> {
    const hasAccess = await this.canUserAccessPrivateEvents();
    if (!hasAccess) {
      throw new Error('Access denied to private events');
    }

    try {
      const updateData: Record<string, unknown> = {
        Title: title,
        EventDate: start.toISOString(), // Standard SharePoint Events field
        EndDate: end.toISOString()      // Standard SharePoint Events field
      };

      if (swimlane) updateData.Swimlane = swimlane;
      if (status) updateData.Status = status;
      if (description !== undefined) updateData.Description = description;

      await this.sp.web.lists.getByTitle(this.privateListName).items.getById(id).update(updateData);

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      Logger.error('Error updating private event', error);
      throw new Error(`Failed to update private event: ${errorMessage}`);
    }
  }

  /**
   * Delete a private event
   */
  public async deletePrivateEvent(id: number): Promise<void> {
    const hasAccess = await this.canUserAccessPrivateEvents();
    if (!hasAccess) {
      throw new Error('Access denied to private events');
    }

    try {
      await this.sp.web.lists.getByTitle(this.privateListName).items.getById(id).delete();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      Logger.error('Error deleting private event', error);
      throw new Error(`Failed to delete private event: ${errorMessage}`);
    }
  }

  /**
   * Find private event by PrivateEventId (GUID)
   */
  public async getPrivateEventByGuid(privateEventId: string): Promise<IPrivateEventData | undefined> {
    const hasAccess = await this.canUserAccessPrivateEvents();
    if (!hasAccess) {
      return undefined;
    }

    try {
      const items = await this.sp.web.lists.getByTitle(this.privateListName).items
        .select('Id', 'Title', 'EventDate', 'EndDate', 'Swimlane', 'Status', 'Description', 'Private', 'PrivateEventId')
        .filter(`PrivateEventId eq '${privateEventId}'`)
        .top(1)();

      if (items.length === 0) {
        return undefined;
      }

      const item = items[0];
      return {
        Id: item.Id,
        Title: item.Title,
        EventDate: item.EventDate,
        EndDate: item.EndDate,
        Swimlane: item.Swimlane,
        Status: item.Status,
        Description: item.Description || '',
        Private: item.Private || false,
        PrivateEventId: item.PrivateEventId
      };

    } catch (error: unknown) {
      Logger.error('Error fetching private event by GUID', error);
      return undefined;
    }
  }

  /**
   * Reset permission cache (useful for testing or when permissions change)
   */
  public resetPermissionCache(): void {
    this.canAccessPrivateEvents = undefined;
  }
}
