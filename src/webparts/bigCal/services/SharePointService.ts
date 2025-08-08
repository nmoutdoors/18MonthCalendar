import { WebPartContext } from '@microsoft/sp-webpart-base';
import { spfi, SPFx } from '@pnp/sp';
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';

export interface ISharePointEvent {
  Id: number;
  Title: string;
  Start: string;
  End: string;
  Swimlane: string;
  Status: string;
}

export class SharePointService {
  private sp: ReturnType<typeof spfi>;
  private siteUrl: string = 'https://scottsdevnstuff.sharepoint.com/sites/Dev';
  private listName: string = 'Events';

  constructor(context: WebPartContext) {
    // Initialize PnP.js with the SPFx context
    this.sp = spfi().using(SPFx(context));

    console.log('SharePointService initialized for site:', context.pageContext.web.title);
    console.log('Target site URL:', this.siteUrl);
    console.log('Target list name:', this.listName);
  }

  public async getEvents(): Promise<ISharePointEvent[]> {
    try {
      console.log(`Fetching events from SharePoint list: ${this.listName}`);
      console.log(`Site URL: ${this.siteUrl}`);

      // Use PnP.js to get items from the Events list
      const items = await this.sp.web.lists.getByTitle(this.listName).items
        .select('Id', 'Title', 'Start', 'End', 'Swimlane', 'Status')
        .orderBy('Start', true)();

      console.log(`Retrieved ${items.length} events from SharePoint:`, items);

      return items.map((item: {Id: number; Title: string; Start: string; End: string; Swimlane: string; Status: string}) => ({
        Id: item.Id,
        Title: item.Title,
        Start: item.Start,
        End: item.End,
        Swimlane: item.Swimlane,
        Status: item.Status
      }));

    } catch (error: unknown) {
      console.error('Error fetching events from SharePoint:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Error details:', {
        message: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        siteUrl: this.siteUrl,
        listName: this.listName
      });
      throw new Error(`Failed to fetch events: ${errorMessage}`);
    }
  }

  public async createEvent(title: string, start: Date, end: Date, swimlane: string = 'Category 1', status: string = 'Green'): Promise<ISharePointEvent> {
    try {
      console.log(`Creating new event: ${title}`);

      // Use PnP.js to create a new item in the Events list
      const result = await this.sp.web.lists.getByTitle(this.listName).items.add({
        Title: title,
        Start: start.toISOString(),
        End: end.toISOString(),
        Swimlane: swimlane,
        Status: status
      });

      console.log('Event created successfully:', result);

      return {
        Id: result.Id,
        Title: result.Title,
        Start: result.Start,
        End: result.End,
        Swimlane: result.Swimlane,
        Status: result.Status
      };

    } catch (error: unknown) {
      console.error('Error creating event in SharePoint:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Failed to create event: ${errorMessage}`);
    }
  }

  public async updateEvent(id: number, title: string, start: Date, end: Date, swimlane?: string, status?: string): Promise<void> {
    try {
      console.log(`Updating event ${id}: ${title}`);

      const updateData: Record<string, unknown> = {
        Title: title,
        Start: start.toISOString(),
        End: end.toISOString()
      };

      if (swimlane) updateData.Swimlane = swimlane;
      if (status) updateData.Status = status;

      await this.sp.web.lists.getByTitle(this.listName).items.getById(id).update(updateData);

      console.log('Event updated successfully');

    } catch (error: unknown) {
      console.error('Error updating event in SharePoint:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Failed to update event: ${errorMessage}`);
    }
  }

  public async deleteEvent(id: number): Promise<void> {
    try {
      console.log(`Deleting event ${id}`);

      await this.sp.web.lists.getByTitle(this.listName).items.getById(id).delete();

      console.log('Event deleted successfully');

    } catch (error: unknown) {
      console.error('Error deleting event in SharePoint:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Failed to delete event: ${errorMessage}`);
    }
  }
}
