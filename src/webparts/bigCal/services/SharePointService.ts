import { WebPartContext } from '@microsoft/sp-webpart-base';
import { spfi, SPFx } from '@pnp/sp';
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';
import '@pnp/sp/fields';
import '@pnp/sp/content-types';

export interface ISharePointEvent {
  Id: number;
  Title: string;
  Start: string;
  End: string;
  Swimlane: string;
  Status: string;
  Description: string;
}

export interface IListValidationResult {
  isValid: boolean;
  listExists: boolean;
  missingFields: string[];
  errorMessage?: string;
  canCreate?: boolean;
}

export interface IListCreationResult {
  success: boolean;
  listName: string;
  errorMessage?: string;
}

export interface IFieldDefinition {
  internalName: string;
  displayName: string;
  fieldType: string;
  required?: boolean;
  choices?: string[];
  defaultValue?: string;
}

export class SharePointService {
  private sp: ReturnType<typeof spfi>;
  private siteUrl: string = 'https://scottsdevnstuff.sharepoint.com/sites/Dev';
  private listName: string;

  // Field definitions for list creation
  private static readonly REQUIRED_FIELDS: IFieldDefinition[] = [
    {
      internalName: 'Start',
      displayName: 'Start',
      fieldType: 'DateTime',
      required: false
    },
    {
      internalName: 'End',
      displayName: 'End',
      fieldType: 'DateTime',
      required: false
    },
    {
      internalName: 'Description',
      displayName: 'Description',
      fieldType: 'Note',
      required: false
    },
    {
      internalName: 'Swimlane',
      displayName: 'Swimlane',
      fieldType: 'Choice',
      required: false,
      choices: [
        'Away w/RON',
        'Day Trip - NCR',
        'Exercise',
        'FYSA',
        'Out of Office',
        'Training Holiday',
        'VIP/High Priority'
      ],
      defaultValue: 'FYSA'
    },
    {
      internalName: 'Status',
      displayName: 'Status',
      fieldType: 'Choice',
      required: false,
      choices: [
        'Confirmed',
        'Tentative',
        'Canceled'
      ],
      defaultValue: 'Confirmed'
    }
  ];

  constructor(context: WebPartContext, listName: string = 'Events') {
    // Initialize PnP.js with the SPFx context
    this.sp = spfi().using(SPFx(context));
    this.listName = listName;
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

  public async validateList(listName?: string): Promise<IListValidationResult> {
    const targetListName = listName || this.listName;
    const requiredFields = ['Start', 'End', 'Description', 'Swimlane', 'Status'];

    try {
      // Check if list exists
      const list = await this.sp.web.lists.getByTitle(targetListName)();

      if (!list) {
        return {
          isValid: false,
          listExists: false,
          missingFields: [],
          errorMessage: `List '${targetListName}' does not exist.`,
          canCreate: true
        };
      }

      // Get all fields in the list
      const fields = await this.sp.web.lists.getByTitle(targetListName).fields
        .select('InternalName', 'Title')();

      const fieldNames = fields.map(field => field.InternalName);
      const missingFields = requiredFields.filter(field => fieldNames.indexOf(field) === -1);

      const isValid = missingFields.length === 0;

      return {
        isValid,
        listExists: true,
        missingFields,
        errorMessage: isValid ? undefined :
          `List '${targetListName}' is missing required fields: ${missingFields.join(', ')}`,
        canCreate: false // List exists, so we can't create it
      };

    } catch (error: unknown) {
      console.error('Error validating list:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

      // Check if it's a "list not found" error
      if (errorMessage.indexOf('does not exist') !== -1 || errorMessage.indexOf('not found') !== -1) {
        return {
          isValid: false,
          listExists: false,
          missingFields: [],
          errorMessage: `List '${targetListName}' does not exist.`,
          canCreate: true
        };
      }

      return {
        isValid: false,
        listExists: false,
        missingFields: [],
        errorMessage: `Error validating list: ${errorMessage}`,
        canCreate: false // Unknown error, don't offer to create
      };
    }
  }

  public async createList(listName: string): Promise<IListCreationResult> {
    try {
      console.log(`Creating SharePoint list: ${listName}`);

      // Create the list based on Calendar template (simpler than Events)
      await this.sp.web.lists.add(listName, `Calendar list created by BigCal webpart with required fields for event management`, 100, true);
      console.log(`List '${listName}' created successfully`);

      // Get the created list to add fields
      const createdList = this.sp.web.lists.getByTitle(listName);

      // Add custom fields
      for (const fieldDef of SharePointService.REQUIRED_FIELDS) {
        try {
          if (fieldDef.fieldType === 'DateTime') {
            // Create date and time field
            await createdList.fields.addDateTime(fieldDef.internalName, {
              DisplayFormat: 0, // DateTime format (0 = DateTime, 1 = DateOnly)
              DateTimeCalendarType: 1, // Gregorian calendar
              FriendlyDisplayFormat: 0, // Standard format
              Required: fieldDef.required || false
            });
            console.log(`Added DateTime field: ${fieldDef.internalName}`);
          } else if (fieldDef.fieldType === 'Choice') {
            // Create choice field
            await createdList.fields.addChoice(fieldDef.internalName, {
              Choices: fieldDef.choices || [],
              Required: fieldDef.required || false,
              FillInChoice: false
            });
            console.log(`Added choice field: ${fieldDef.internalName}`);
          } else if (fieldDef.fieldType === 'Note') {
            // Create multiple lines of text field
            await createdList.fields.addMultilineText(fieldDef.internalName, {
              NumberOfLines: 3,
              RichText: false,
              RestrictedMode: false,
              AppendOnly: false,
              AllowHyperlink: true,
              Required: fieldDef.required || false
            });
            console.log(`Added multiline text field: ${fieldDef.internalName}`);
          }
        } catch (fieldError) {
          console.warn(`Warning: Could not add field ${fieldDef.internalName}:`, fieldError);
          // Continue with other fields even if one fails
        }
      }

      // Verify the list was created successfully
      const validationResult = await this.validateList(listName);
      if (validationResult.isValid) {
        return {
          success: true,
          listName: listName
        };
      } else {
        return {
          success: false,
          listName: listName,
          errorMessage: `List created but validation failed: ${validationResult.errorMessage}`
        };
      }

    } catch (error: unknown) {
      console.error('Error creating list:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        success: false,
        listName: listName,
        errorMessage: `Failed to create list: ${errorMessage}`
      };
    }
  }


}
