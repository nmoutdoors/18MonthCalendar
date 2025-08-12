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
  Description: string;
}

export class SharePointService {
  private sp: ReturnType<typeof spfi>;
  private siteUrl: string = 'https://scottsdevnstuff.sharepoint.com/sites/Dev';
  private listName: string = 'Events';

  constructor(context: WebPartContext) {
    // Initialize PnP.js with the SPFx context
    this.sp = spfi().using(SPFx(context));
  }

  public async getEvents(): Promise<ISharePointEvent[]> {
    try {
      // Use PnP.js to get items from the Events list
      // Increase limit to handle large datasets (default is 100)
      const items = await this.sp.web.lists.getByTitle(this.listName).items
        .select('Id', 'Title', 'Start', 'End', 'Swimlane', 'Status', 'Description')
        .orderBy('Start', true)
        .top(5000)(); // Increase limit to 5000 events

      console.log(`SharePoint query returned ${items.length} events`);

      return items.map((item: {Id: number; Title: string; Start: string; End: string; Swimlane: string; Status: string; Description: string}) => ({
        Id: item.Id,
        Title: item.Title,
        Start: item.Start,
        End: item.End,
        Swimlane: item.Swimlane,
        Status: item.Status,
        Description: item.Description || ''
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

  public async createEvent(title: string, start: Date, end: Date, swimlane: string = 'Category 1', status: string = 'Green', description: string = ''): Promise<ISharePointEvent> {
    try {
      // Use PnP.js to create a new item in the Events list
      const result = await this.sp.web.lists.getByTitle(this.listName).items.add({
        Title: title,
        Start: start,
        End: end,
        Swimlane: swimlane,
        Status: status,
        Description: description
      });

      return {
        Id: result.Id,
        Title: result.Title,
        Start: result.Start,
        End: result.End,
        Swimlane: result.Swimlane,
        Status: result.Status,
        Description: result.Description || ''
      };

    } catch (error: unknown) {
      console.error('Error creating event in SharePoint:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Failed to create event: ${errorMessage}`);
    }
  }

  public async updateEvent(id: number, title: string, start: Date, end: Date, swimlane?: string, status?: string, description?: string): Promise<void> {
    try {
      const updateData: Record<string, unknown> = {
        Title: title,
        Start: start,
        End: end
      };

      if (swimlane) updateData.Swimlane = swimlane;
      if (status) updateData.Status = status;
      if (description !== undefined) updateData.Description = description;

      await this.sp.web.lists.getByTitle(this.listName).items.getById(id).update(updateData);

    } catch (error: unknown) {
      console.error('Error updating event in SharePoint:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Failed to update event: ${errorMessage}`);
    }
  }

  public async deleteEvent(id: number): Promise<void> {
    try {
      await this.sp.web.lists.getByTitle(this.listName).items.getById(id).delete();

    } catch (error: unknown) {
      console.error('Error deleting event in SharePoint:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Failed to delete event: ${errorMessage}`);
    }
  }


}
