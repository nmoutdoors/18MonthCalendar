import { WebPartContext } from '@microsoft/sp-webpart-base';
import { spfi, SPFx } from '@pnp/sp';
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';
import '@pnp/sp/fields';
import { Logger } from './LoggingService';
import '@pnp/sp/content-types';

export interface ISharePointEvent {
  Id: number;
  Title: string;
  Start: string;
  End: string;
  Swimlane: string;
  Status: string;
  Description: string;
  Private: boolean;
  PrivateEventId?: string;
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
    },
    {
      internalName: 'Private',
      displayName: 'Private',
      fieldType: 'Boolean',
      required: false,
      defaultValue: 'No'
    },
    {
      internalName: 'PrivateEventId',
      displayName: 'Private Event ID',
      fieldType: 'Text',
      required: false
    }
  ];

  constructor(context: WebPartContext, listName: string = 'Events') {
    // Initialize PnP.js with the SPFx context
    this.sp = spfi().using(SPFx(context));
    this.listName = listName;
  }

  /**
   * Normalize boolean values from SharePoint across different environments
   * SharePoint can return: true/false, 1/0, "Yes"/"No", "True"/"False"
   */
  private normalizeBoolean(value: unknown): boolean {
    if (value === null || value === undefined) {
      return false;
    }

    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'number') {
      return value === 1;
    }

    if (typeof value === 'string') {
      const lowerValue = value.toLowerCase();
      return lowerValue === 'true' || lowerValue === 'yes' || lowerValue === '1';
    }

    return false;
  }

  /**
   * Check if the list has the Private and PrivateEventId fields
   * Enhanced for production environment compatibility
   */
  private async checkForPrivateFields(): Promise<boolean> {
    try {
      const fields = await this.sp.web.lists.getByTitle(this.listName).fields
        .select('InternalName', 'Title', 'TypeAsString')();

      const fieldNames = fields.map(f => f.InternalName.toLowerCase());

      // Case-insensitive field detection using ES5-compatible methods
      const hasPrivate = fieldNames.some(name =>
        name === 'private' || name === 'private0' || name.indexOf('private') !== -1
      );
      const hasPrivateEventId = fieldNames.some(name =>
        name === 'privateeventid' || name === 'privateeventid0' || name.indexOf('privateeventid') !== -1
      );

      Logger.debug('Private fields detection', {
        totalFields: fieldNames.length,
        hasPrivate,
        hasPrivateEventId
      });

      // Additional validation: try to query with these fields to ensure they're accessible
      if (hasPrivate && hasPrivateEventId) {
        try {
          // Find the actual field names (case-sensitive) using ES5-compatible methods
          let privateField: { InternalName: string } | undefined = undefined;
          let privateEventIdField: { InternalName: string } | undefined = undefined;

          for (let i = 0; i < fields.length; i++) {
            const field = fields[i];
            const lowerName = field.InternalName.toLowerCase();
            if (lowerName.indexOf('private') !== -1 && lowerName.indexOf('privateeventid') === -1) {
              privateField = field;
            }
            if (lowerName.indexOf('privateeventid') !== -1) {
              privateEventIdField = field;
            }
          }

          if (privateField && privateEventIdField) {
            // Test query to ensure fields are accessible
            await this.sp.web.lists.getByTitle(this.listName).items
              .select(`Id,${privateField.InternalName},${privateEventIdField.InternalName}`)
              .top(1)();

            Logger.debug('Private fields validated successfully');

            return true;
          }
        } catch (testError) {
          Logger.warn('Private fields exist but not accessible', testError);
          return false;
        }
      }

      return false;
    } catch (error: unknown) {
      Logger.error('Critical error checking for private fields', error);
      return false;
    }
  }

  public async getEvents(): Promise<ISharePointEvent[]> {
    try {
      // Check if the list has the new Private fields
      const hasPrivateFields = await this.checkForPrivateFields();

      // Use PnP.js to get items from the Events list
      // Increase limit to handle large datasets (default is 100)
      let selectFields = 'Id,Title,Start,End,Swimlane,Status,Description';

      // Enhanced field selection for production environments
      if (hasPrivateFields) {
        try {
          // Get actual field names to handle case sensitivity
          const fields = await this.sp.web.lists.getByTitle(this.listName).fields
            .select('InternalName')();

          let privateField: { InternalName: string } | undefined = undefined;
          let privateEventIdField: { InternalName: string } | undefined = undefined;

          for (let i = 0; i < fields.length; i++) {
            const field = fields[i];
            const lowerName = field.InternalName.toLowerCase();
            if (lowerName.indexOf('private') !== -1 && lowerName.indexOf('privateeventid') === -1) {
              privateField = field;
            }
            if (lowerName.indexOf('privateeventid') !== -1) {
              privateEventIdField = field;
            }
          }

          if (privateField && privateEventIdField) {
            selectFields += `,${privateField.InternalName},${privateEventIdField.InternalName}`;
            Logger.debug('Using actual private field names');
          } else {
            Logger.warn('Private fields detected but actual field names not found');
            selectFields += ',Private,PrivateEventId'; // Fallback to expected names
          }
        } catch (fieldError) {
          Logger.warn('Error getting field names, using defaults', fieldError);
          selectFields += ',Private,PrivateEventId'; // Fallback to expected names
        }
      }

      const items = await this.sp.web.lists.getByTitle(this.listName).items
        .select(selectFields)
        .orderBy('Start', true)
        .top(5000)(); // Increase limit to 5000 events

      Logger.info(`Loaded ${items.length} events from SharePoint`);

      return items.map((item: {
        Id: number;
        Title: string;
        Start: string;
        End: string;
        Swimlane: string;
        Status: string;
        Description?: string;
        Private?: unknown;
        PrivateEventId?: string;
      }) => {
        // Enhanced boolean field handling for production environments
        const isPrivate = this.normalizeBoolean(item.Private);

        const mappedEvent = {
          Id: item.Id,
          Title: item.Title,
          Start: item.Start,
          End: item.End,
          Swimlane: item.Swimlane,
          Status: item.Status,
          Description: item.Description || '',
          Private: isPrivate,
          PrivateEventId: item.PrivateEventId
        };

        // Only log private events in debug mode to avoid performance impact
        if ((isPrivate || item.PrivateEventId) && Logger.getConfig().level >= 3) {
          Logger.debug(`Private event: ${item.Title} (ID: ${item.Id})`);
        }

        return mappedEvent;
      });

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      Logger.error('Error fetching events from SharePoint', {
        message: errorMessage,
        listName: this.listName
      });
      throw new Error(`Failed to fetch events: ${errorMessage}`);
    }
  }



  public async createEvent(title: string, start: Date, end: Date, swimlane: string = 'Category 1', status: string = 'Green', description: string = '', isPrivate: boolean = false, privateEventId?: string): Promise<ISharePointEvent> {
    try {
      Logger.debug('Creating event', { title, isPrivate });

      // Check if the list has the new Private fields
      const hasPrivateFields = await this.checkForPrivateFields();

      // Use PnP.js to create a new item in the Events list
      const itemData: Record<string, unknown> = {
        Title: title,
        Start: start,
        End: end,
        Swimlane: swimlane,
        Status: status,
        Description: description
      };

      // Only add Private fields if they exist in the list
      if (hasPrivateFields) {
        itemData.Private = isPrivate;
        if (privateEventId) {
          itemData.PrivateEventId = privateEventId;
        }
      } else if (isPrivate) {
        // If Private fields don't exist but user wants private event, log warning
        Logger.warn('Cannot create private event - Private fields do not exist in SharePoint list');
      }

      const result = await this.sp.web.lists.getByTitle(this.listName).items.add(itemData);

      Logger.debug(`Created event: ${result.Title}`);

      return {
        Id: result.Id,
        Title: result.Title,
        Start: result.Start,
        End: result.End,
        Swimlane: result.Swimlane,
        Status: result.Status,
        Description: result.Description || '',
        Private: result.Private || false,
        PrivateEventId: result.PrivateEventId || undefined
      };

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      Logger.error('Error creating event in SharePoint', error);
      throw new Error(`Failed to create event: ${errorMessage}`);
    }
  }

  public async updateEvent(id: number, title: string, start: Date, end: Date, swimlane?: string, status?: string, description?: string, isPrivate?: boolean, privateEventId?: string): Promise<void> {
    try {
      // Check if the list has the new Private fields
      const hasPrivateFields = await this.checkForPrivateFields();

      const updateData: Record<string, unknown> = {
        Title: title,
        Start: start,
        End: end
      };

      if (swimlane) updateData.Swimlane = swimlane;
      if (status) updateData.Status = status;
      if (description !== undefined) updateData.Description = description;

      // Only add Private fields if they exist in the list
      if (hasPrivateFields) {
        if (isPrivate !== undefined) updateData.Private = isPrivate;
        if (privateEventId !== undefined) updateData.PrivateEventId = privateEventId;
      }

      await this.sp.web.lists.getByTitle(this.listName).items.getById(id).update(updateData);

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      Logger.error('Error updating event in SharePoint', error);
      throw new Error(`Failed to update event: ${errorMessage}`);
    }
  }

  public async deleteEvent(id: number): Promise<void> {
    try {
      await this.sp.web.lists.getByTitle(this.listName).items.getById(id).delete();

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      Logger.error('Error deleting event in SharePoint', error);
      throw new Error(`Failed to delete event: ${errorMessage}`);
    }
  }

  public async validateList(listName?: string, requirePrivateFields: boolean = true): Promise<IListValidationResult> {
    const targetListName = listName || this.listName;
    let requiredFields = ['Start', 'End', 'Description', 'Swimlane', 'Status'];
    const privateFields = ['Private', 'PrivateEventId'];

    // Include private fields as required for full functionality
    if (requirePrivateFields) {
      requiredFields = requiredFields.concat(privateFields);
    }

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

      // Separate missing fields into core and private
      const coreFields = ['Start', 'End', 'Description', 'Swimlane', 'Status'];
      const missingCoreFields = missingFields.filter(field => coreFields.indexOf(field) !== -1);
      const missingPrivateFields = missingFields.filter(field => privateFields.indexOf(field) !== -1);

      const isValid = missingFields.length === 0;
      const hasCoreFields = missingCoreFields.length === 0;
      const hasPrivateSupport = missingPrivateFields.length === 0;

      let errorMessage = undefined;

      if (!hasCoreFields) {
        errorMessage = `List '${targetListName}' is missing required core fields: ${missingCoreFields.join(', ')}`;
      }

      if (!hasPrivateSupport && requirePrivateFields) {
        const privateMessage = (errorMessage ? '\n\n' : '') +
          `Missing required private event fields: ${missingPrivateFields.join(', ')}\n` +
          missingPrivateFields.map(field => {
            if (field === 'Private') return '• Private (Yes/No field) - marks events as private';
            if (field === 'PrivateEventId') return '• PrivateEventId (Single line of text field) - links to private event details';
            return `• ${field}`;
          }).join('\n') +
          `\n\nThese fields must be added to the main Events list for private events to work.`;

        errorMessage = (errorMessage || '') + privateMessage;
      } else if (!hasPrivateSupport && !requirePrivateFields) {
        const privateMessage = (errorMessage ? '\n\n' : '') +
          `Optional: For private events support, add these fields to the main Events list:\n` +
          missingPrivateFields.map(field => {
            if (field === 'Private') return '• Private (Yes/No field)';
            if (field === 'PrivateEventId') return '• PrivateEventId (Single line of text field)';
            return `• ${field}`;
          }).join('\n') +
          `\n\nWithout these fields, all events will be public only.`;

        errorMessage = (errorMessage || '') + privateMessage;
      }

      return {
        isValid,
        listExists: true,
        missingFields,
        errorMessage,
        canCreate: false // List exists, so we can't create it
      };

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      Logger.error('Error validating list', error);

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
      Logger.info(`Creating SharePoint list: ${listName}`);

      // Create the list based on Calendar template (simpler than Events)
      await this.sp.web.lists.add(listName, `Calendar list created by BigCal webpart with required fields for event management`, 100, true);

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
          } else if (fieldDef.fieldType === 'Choice') {
            // Create choice field
            await createdList.fields.addChoice(fieldDef.internalName, {
              Choices: fieldDef.choices || [],
              Required: fieldDef.required || false,
              FillInChoice: false
            });
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
          } else if (fieldDef.fieldType === 'Boolean') {
            // Create Yes/No field
            await createdList.fields.addBoolean(fieldDef.internalName, {
              Required: fieldDef.required || false
            });
          } else if (fieldDef.fieldType === 'Text') {
            // Create single line of text field
            await createdList.fields.addText(fieldDef.internalName, {
              MaxLength: 255,
              Required: fieldDef.required || false
            });
          }
        } catch (fieldError) {
          Logger.warn(`Could not add field ${fieldDef.internalName}`, fieldError);
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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      Logger.error('Error creating list', error);
      return {
        success: false,
        listName: listName,
        errorMessage: `Failed to create list: ${errorMessage}`
      };
    }
  }


}
