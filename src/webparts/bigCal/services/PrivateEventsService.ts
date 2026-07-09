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
   * Convert Date to SharePoint-compatible UTC string.
   *
   * Keep serialization consistent with SharePointService so a public event can be
   * converted to private without changing its stored instant or displayed time.
   */
  private toSharePointDateString(date: Date): string {
    return date.toISOString();
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
        .select('Id', 'Title', 'EventDate', 'EndDate', 'Swimlane', 'Status', 'IMO', 'OPR', 'Description', 'Notes', 'Private', 'BigRock', 'PrivateEventId')
        .orderBy('EventDate', true)
        .top(5000)();

      return items.map((item: {
        Id: number;
        Title: string;
        EventDate: string;
        EndDate: string;
        Swimlane: string;
        Status: string;
        IMO: string;
        OPR: string;
        Description: string;
        Notes?: string;
        Private: boolean;
        BigRock?: boolean;
        PrivateEventId: string;
      }) => ({
        Id: item.Id,
        Title: item.Title,
        EventDate: item.EventDate,
        EndDate: item.EndDate,
        Swimlane: item.Swimlane,
        Status: item.Status,
        IMO: item.IMO,
        OPR: item.OPR,
        Description: item.Description || '',
        Notes: item.Notes,
        Private: item.Private || false,
        BigRock: item.BigRock || false,
        PrivateEventId: item.PrivateEventId
      }));

    } catch (error: unknown) {
      Logger.error('Error fetching private events', error);
      return []; // Return empty array on error
    }
  }

  /**
   * Get private events within a specific date range (for lazy loading optimization)
   * @param startDate - Start of date range (inclusive)
   * @param endDate - End of date range (inclusive)
   */
  public async getPrivateEventsByDateRange(startDate: Date, endDate: Date): Promise<IPrivateEventData[]> {
    const hasAccess = await this.canUserAccessPrivateEvents();
    if (!hasAccess) {
      return []; // Return empty array if no access
    }

    try {
      // Build OData filter for date range
      const startISO = startDate.toISOString();
      const endISO = endDate.toISOString();
      const filterQuery = `EventDate ge datetime'${startISO}' and EventDate le datetime'${endISO}'`;

      const items = await this.sp.web.lists.getByTitle(this.privateListName).items
        .select('Id', 'Title', 'EventDate', 'EndDate', 'Swimlane', 'Status', 'IMO', 'OPR', 'Description', 'Notes', 'Private', 'BigRock', 'PrivateEventId')
        .filter(filterQuery)
        .orderBy('EventDate', true)
        .top(5000)();

      Logger.info(`Loaded ${items.length} private events for date range ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`);

      return items.map((item: {
        Id: number;
        Title: string;
        EventDate: string;
        EndDate: string;
        Swimlane: string;
        Status: string;
        IMO: string;
        OPR: string;
        Description: string;
        Notes?: string;
        Private: boolean;
        BigRock?: boolean;
        PrivateEventId: string;
      }) => ({
        Id: item.Id,
        Title: item.Title,
        EventDate: item.EventDate,
        EndDate: item.EndDate,
        Swimlane: item.Swimlane,
        Status: item.Status,
        IMO: item.IMO,
        OPR: item.OPR,
        Description: item.Description || '',
        Notes: item.Notes,
        Private: item.Private || false,
        BigRock: item.BigRock || false,
        PrivateEventId: item.PrivateEventId
      }));

    } catch (error: unknown) {
      Logger.error('Error fetching private events by date range', error);
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
    imo: string,
    opr: string,
    description: string,
    notes: string = '',
    isBigRock: boolean = false
  ): Promise<IPrivateEventData | undefined> {
    const hasAccess = await this.canUserAccessPrivateEvents();
    if (!hasAccess) {
      throw new Error('Access denied to private events');
    }

    try {
      const result = await this.sp.web.lists.getByTitle(this.privateListName).items.add({
        Title: title,
        EventDate: this.toSharePointDateString(start), // Store without timezone conversion
        EndDate: this.toSharePointDateString(end),     // Store without timezone conversion
        Swimlane: swimlane,
        Status: status,
        IMO: imo,
        OPR: opr,
        Description: description,
        Notes: notes || '',
        Private: true,
        BigRock: isBigRock
      });

      return {
        Id: result.Id,
        Title: result.Title,
        EventDate: result.EventDate,
        EndDate: result.EndDate,
        Swimlane: result.Swimlane,
        Status: result.Status,
        IMO: result.IMO,
        OPR: result.OPR,
        Description: result.Description || '',
        Notes: result.Notes,
        Private: result.Private || false,
        BigRock: result.BigRock || false
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
    imo?: string,
    opr?: string,
    description?: string,
    notes?: string,
    isBigRock?: boolean
  ): Promise<void> {
    const hasAccess = await this.canUserAccessPrivateEvents();
    if (!hasAccess) {
      throw new Error('Access denied to private events');
    }

    try {
      const updateData: Record<string, unknown> = {
        Title: title,
        EventDate: this.toSharePointDateString(start), // Store without timezone conversion
        EndDate: this.toSharePointDateString(end)      // Store without timezone conversion
      };

      if (swimlane) updateData.Swimlane = swimlane;
      if (status) updateData.Status = status;
      if (imo !== undefined) updateData.IMO = imo;
      if (opr !== undefined) updateData.OPR = opr;
      if (description !== undefined) updateData.Description = description;
      if (notes !== undefined) updateData.Notes = notes;
      if (isBigRock !== undefined) updateData.BigRock = isBigRock;

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
        .select('Id', 'Title', 'EventDate', 'EndDate', 'Swimlane', 'Status', 'IMO', 'OPR', 'Description', 'Private', 'BigRock', 'PrivateEventId')
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
        IMO: item.IMO,
        OPR: item.OPR,
        Description: item.Description || '',
        Private: item.Private || false,
        BigRock: item.BigRock || false,
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
