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
  EventDate: string; // Standard SharePoint Events list field
  EndDate: string;   // Standard SharePoint Events list field
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
  // NOTE: For standard SharePoint Events lists, use EventDate and EndDate (built-in fields)
  // These custom fields are only for when creating new lists from scratch
  private static readonly REQUIRED_FIELDS: IFieldDefinition[] = [
    {
      internalName: 'EventDate',
      displayName: 'Start Time',
      fieldType: 'DateTime',
      required: false
    },
    {
      internalName: 'EndDate',
      displayName: 'End Time',
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
        'DCDC',
        'DISA',
        'DOD CIO / NSA / USCC',
        'Exec Time',
        'Exercises',
        'FYSA',
        'Joint DISA & DCDC',
        'Mission Partner',
        'Out of Office',
        'Speaking Event',
        'TDY Meetings/Congressional',
        'Transit'
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
      defaultValue: '' // No default - allow blank/null
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
      let selectFields = 'Id,Title,EventDate,EndDate,Swimlane,Status,Description';

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
        .orderBy('EventDate', true)
        .top(5000)(); // Increase limit to 5000 events

      Logger.info(`Loaded ${items.length} events from SharePoint`);

      return items.map((item: {
        Id: number;
        Title: string;
        EventDate: string;
        EndDate: string;
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
          EventDate: item.EventDate,
          EndDate: item.EndDate,
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



  /**
   * Create multiple events in a single batch operation for better performance
   */
  public async createEventsBatch(events: Array<{
    title: string;
    start: Date;
    end: Date;
    swimlane: string;
    status?: string; // Make status optional
    description: string;
    isPrivate?: boolean;
    privateEventId?: string;
  }>): Promise<ISharePointEvent[]> {
    try {
      Logger.debug(`Creating batch of ${events.length} events`);

      // Check if the list has the new Private fields
      const hasPrivateFields = await this.checkForPrivateFields();

      // Use Promise.all for parallel processing (simpler and more reliable than batch)
      const promises = events.map(async event => {
        const itemData: Record<string, unknown> = {
          Title: event.title,
          EventDate: event.start.toISOString(), // Standard SharePoint Events field
          EndDate: event.end.toISOString(),     // Standard SharePoint Events field
          Swimlane: event.swimlane,
          Description: event.description
        };

        // Only add Status if it's provided (not undefined/null/empty)
        if (event.status && event.status.trim()) {
          itemData.Status = event.status;
        }

        // Only add Private fields if they exist in the list
        if (hasPrivateFields) {
          itemData.Private = event.isPrivate || false;
          if (event.privateEventId) {
            itemData.PrivateEventId = event.privateEventId;
          }
        }

        const result = await this.sp.web.lists.getByTitle(this.listName).items.add(itemData);

        Logger.debug('Batch item creation result:', result);

        // Handle different PnP.js response formats
        let itemData_result;
        if (result && result.data) {
          Logger.debug('Using result.data format');
          itemData_result = result.data;
        } else if (result && result.Id) {
          Logger.debug('Using direct result format');
          itemData_result = result;
        } else {
          Logger.error('Unexpected response format:', result);
          throw new Error('Unexpected response format from SharePoint item creation');
        }

        return {
          Id: itemData_result.Id,
          Title: itemData_result.Title,
          EventDate: itemData_result.EventDate,
          EndDate: itemData_result.EndDate,
          Swimlane: itemData_result.Swimlane,
          Status: itemData_result.Status,
          Description: itemData_result.Description || '',
          Private: itemData_result.Private || false,
          PrivateEventId: itemData_result.PrivateEventId || undefined
        };
      });

      const results = await Promise.all(promises);

      Logger.debug(`Successfully created batch of ${results.length} events`);
      return results;

    } catch (error) {
      Logger.error('Error creating events batch', error);
      throw error;
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
        EventDate: start.toISOString(), // Standard SharePoint Events field
        EndDate: end.toISOString(),     // Standard SharePoint Events field
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
        EventDate: result.EventDate,
        EndDate: result.EndDate,
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
        EventDate: start.toISOString(), // Standard SharePoint Events field
        EndDate: end.toISOString()      // Standard SharePoint Events field
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

    // For Events lists (template 106), use EventDate/EndDate. For custom lists, use Start/End
    // We'll determine the correct field names after checking the list type
    let requiredFields: string[] = [];
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

      // Check if list is Events type (template 106) for Outlook sync capability
      if (list.BaseTemplate !== 106) {
        return {
          isValid: false,
          listExists: true,
          missingFields: [],
          errorMessage: `List '${targetListName}' exists but is not an Events list (template ${list.BaseTemplate}). For Outlook sync capability, please use an Events list (template 106) or create a new one using the button below.`,
          canCreate: true
        };
      }

      // For Events lists (template 106), use the built-in field names
      const coreFields = ['EventDate', 'EndDate', 'Description', 'Swimlane', 'Status'];
      requiredFields = coreFields.concat(requirePrivateFields ? privateFields : []);

      // Get all fields in the list
      const fields = await this.sp.web.lists.getByTitle(targetListName).fields
        .select('InternalName', 'Title')();

      const fieldNames = fields.map(field => field.InternalName);
      const missingFields = requiredFields.filter(field => fieldNames.indexOf(field) === -1);

      // Separate missing fields into core and private
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

  public async validateConfigList(listName: string): Promise<IListValidationResult> {
    const requiredFields = ['ConfigType', 'FieldName', 'OptionValue', 'ColorHex', 'IsActive', 'SortOrder'];

    try {
      // Check if list exists
      const list = await this.sp.web.lists.getByTitle(listName)();

      if (!list) {
        return {
          isValid: false,
          listExists: false,
          missingFields: [],
          errorMessage: `Configuration list '${listName}' does not exist.`,
          canCreate: true
        };
      }

      // Get all fields in the list
      const fields = await this.sp.web.lists.getByTitle(listName).fields
        .select('InternalName', 'Title', 'TypeAsString')();

      const fieldNames = fields.map(f => f.InternalName.toLowerCase());
      const missingFields: string[] = [];

      // Check for required fields (case-insensitive)
      for (const requiredField of requiredFields) {
        const fieldFound = fieldNames.some(name =>
          name === requiredField.toLowerCase() ||
          name.indexOf(requiredField.toLowerCase()) !== -1
        );

        if (!fieldFound) {
          missingFields.push(requiredField);
        }
      }

      const isValid = missingFields.length === 0;
      let errorMessage = '';

      if (!isValid) {
        errorMessage = `Configuration list '${listName}' is missing required fields: ${missingFields.join(', ')}\n\n` +
          'Required fields for BigCalConfig list:\n' +
          '• ConfigType (Choice field) - Type of configuration (e.g., "ColorMapping")\n' +
          '• FieldName (Single line of text) - SharePoint field name (e.g., "Swimlanes", "Status")\n' +
          '• OptionValue (Single line of text) - The choice value from SharePoint field\n' +
          '• ColorHex (Single line of text) - Hex color code (e.g., "#FF5733")\n' +
          '• IsActive (Yes/No field) - Enable/disable this color mapping\n' +
          '• SortOrder (Number field) - Display order in UI';
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
      Logger.error('Error validating config list', error);

      // Check if it's a "list not found" error
      if (errorMessage.indexOf('does not exist') !== -1 || errorMessage.indexOf('not found') !== -1) {
        return {
          isValid: false,
          listExists: false,
          missingFields: [],
          errorMessage: `Configuration list '${listName}' does not exist.`,
          canCreate: true
        };
      }

      return {
        isValid: false,
        listExists: false,
        missingFields: [],
        errorMessage: `Error validating config list: ${errorMessage}`,
        canCreate: false // Unknown error, don't offer to create
      };
    }
  }

  public async createList(listName: string): Promise<IListCreationResult> {
    try {
      Logger.info(`Creating SharePoint list: ${listName}`);

      // Create the list based on Events template (enables Outlook sync)
      await this.sp.web.lists.add(listName, `Events list created by BigCal webpart with required fields for event management and Outlook sync`, 106, true);

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

  /**
   * Update field choices for existing SharePoint list fields
   */
  public async updateFieldChoices(listName: string, fieldName: string, choices: string[]): Promise<void> {
    try {
      Logger.info(`Updating field choices for ${fieldName} in list ${listName}`);

      const field = await this.sp.web.lists.getByTitle(listName).fields.getByInternalNameOrTitle(fieldName)();

      if (field && field.TypeAsString === 'Choice') {
        await this.sp.web.lists.getByTitle(listName).fields.getByInternalNameOrTitle(fieldName).update({
          Choices: choices
        });
        Logger.info(`Successfully updated ${fieldName} field choices`);
      } else {
        Logger.warn(`Field ${fieldName} is not a choice field or does not exist`);
      }
    } catch (error) {
      Logger.error(`Error updating field choices for ${fieldName}`, error);
      throw new Error(`Failed to update field choices: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update all field choices to match current requirements
   */
  public async updateAllFieldChoices(listName?: string): Promise<void> {
    const targetListName = listName || this.listName;

    try {
      Logger.info(`Updating all field choices for list ${targetListName}`);

      // Update each choice field with current choices from REQUIRED_FIELDS
      for (const fieldDef of SharePointService.REQUIRED_FIELDS) {
        if (fieldDef.fieldType === 'Choice' && fieldDef.choices) {
          try {
            await this.updateFieldChoices(targetListName, fieldDef.internalName, fieldDef.choices);
          } catch (fieldError) {
            Logger.warn(`Could not update field ${fieldDef.internalName}`, fieldError);
            // Continue with other fields even if one fails
          }
        }
      }

      Logger.info(`Completed updating field choices for list ${targetListName}`);
    } catch (error) {
      Logger.error(`Error updating field choices for list ${targetListName}`, error);
      throw new Error(`Failed to update field choices: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async createPrivateEventsList(listName: string = 'PrivateEvents'): Promise<IListCreationResult> {
    try {
      Logger.info(`Creating PrivateEvents list: ${listName}`);

      // Create the list as an Events list (template 106) - same as main Events list
      await this.sp.web.lists.add(listName, `Private events list created by BigCal webpart for storing private event details with Outlook sync capability`, 106, true);

      // Set to Classic experience for better data management
      try {
        const createdList = this.sp.web.lists.getByTitle(listName);
        await createdList.update({
          ListExperienceOptions: 1 // 1 = Classic, 0 = Auto (Modern), 2 = Modern
        });
        Logger.info('Set PrivateEvents list to Classic experience');
      } catch (experienceError) {
        Logger.warn('Could not set Classic experience, continuing with default', experienceError);
      }

      // Get the created list to add custom fields
      const createdList = this.sp.web.lists.getByTitle(listName);

      // Add all the same custom fields as the main Events list
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
            // Create boolean field
            await createdList.fields.addBoolean(fieldDef.internalName, {
              Required: fieldDef.required || false
            });
          } else if (fieldDef.fieldType === 'Text') {
            // Create text field
            await createdList.fields.addText(fieldDef.internalName, {
              MaxLength: 255,
              Required: fieldDef.required || false
            });
          }

          Logger.info(`Added field: ${fieldDef.internalName} (${fieldDef.fieldType})`);
        } catch (fieldError) {
          Logger.warn(`Could not add field ${fieldDef.internalName}:`, fieldError);
        }
      }

      // Add the additional field that PrivateEvents needs (PrivateEventId is already in REQUIRED_FIELDS)
      // Note: Private field is also already in REQUIRED_FIELDS, so PrivateEvents list will have all needed fields



      // Note: Custom view creation will be handled manually in SharePoint
      // The list will have all required fields for private events
      Logger.info('PrivateEvents list created with all required fields');

      // Verify the list was created successfully
      const validationResult = await this.validateList(listName, true); // true = check for Private/PrivateEventId fields (PrivateEvents needs them)
      if (validationResult.isValid) {
        return {
          success: true,
          listName: listName
        };
      } else {
        return {
          success: false,
          listName: listName,
          errorMessage: `PrivateEvents list created but validation failed: ${validationResult.errorMessage}`
        };
      }

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      Logger.error(`Error creating PrivateEvents list: ${errorMessage}`);
      return {
        success: false,
        listName: listName,
        errorMessage: `Failed to create PrivateEvents list: ${errorMessage}`
      };
    }
  }

  public async createConfigList(listName: string): Promise<IListCreationResult> {
    try {
      Logger.info(`Creating BigCal configuration list: ${listName}`);

      // Create the list as a custom list (template 100)
      await this.sp.web.lists.add(listName, `BigCal configuration list for storing dynamic color palettes and settings`, 100, true);

      // Set to Classic experience for better data management
      try {
        const createdList = this.sp.web.lists.getByTitle(listName);
        await createdList.update({
          ListExperienceOptions: 1 // 1 = Classic, 0 = Auto (Modern), 2 = Modern
        });
        Logger.info('Set BigCalConfig list to Classic experience');
      } catch (experienceError) {
        Logger.warn('Could not set Classic experience, continuing with default', experienceError);
      }

      // Get the created list to add fields
      const createdList = this.sp.web.lists.getByTitle(listName);

      // Define the required fields for BigCalConfig
      const configFields = [
        {
          internalName: 'ConfigType',
          displayName: 'Configuration Type',
          fieldType: 'Choice',
          choices: ['ColorMapping', 'Settings'],
          defaultValue: 'ColorMapping'
        },
        {
          internalName: 'FieldName',
          displayName: 'Field Name',
          fieldType: 'Text',
          description: 'SharePoint field name (e.g., Swimlanes, Status)'
        },
        {
          internalName: 'OptionValue',
          displayName: 'Option Value',
          fieldType: 'Text',
          description: 'The choice value from SharePoint field'
        },
        {
          internalName: 'ColorHex',
          displayName: 'Color Hex',
          fieldType: 'Text',
          description: 'Hex color code (e.g., #FF5733)'
        },
        {
          internalName: 'IsActive',
          displayName: 'Is Active',
          fieldType: 'Boolean',
          defaultValue: true
        },
        {
          internalName: 'SortOrder',
          displayName: 'Sort Order',
          fieldType: 'Number',
          defaultValue: 0
        }
      ];

      // Add each field to the list
      for (const fieldDef of configFields) {
        try {
          if (fieldDef.fieldType === 'Choice') {
            await createdList.fields.addChoice(fieldDef.internalName, {
              Choices: fieldDef.choices || [],
              Description: fieldDef.description || ''
            });
          } else if (fieldDef.fieldType === 'Boolean') {
            await createdList.fields.addBoolean(fieldDef.internalName, {
              Description: fieldDef.description || ''
            });
          } else if (fieldDef.fieldType === 'Number') {
            await createdList.fields.addNumber(fieldDef.internalName, {
              Description: fieldDef.description || ''
            });
          } else {
            // Text field
            await createdList.fields.addText(fieldDef.internalName, {
              MaxLength: 255,
              Description: fieldDef.description || ''
            });
          }
          Logger.info(`Added field: ${fieldDef.internalName}`);
        } catch (fieldError) {
          Logger.warn(`Could not add field ${fieldDef.internalName}`, fieldError);
          // Continue with other fields even if one fails
        }
      }

      // Note: Custom view creation will be handled manually in SharePoint
      // The list will have all required fields: Title, ConfigType, FieldName, OptionValue, ColorHex, IsActive, SortOrder
      Logger.info('BigCalConfig list created with all required fields');

      // Verify the list was created successfully
      const validationResult = await this.validateConfigList(listName);
      if (validationResult.isValid) {
        return {
          success: true,
          listName: listName
        };
      } else {
        return {
          success: false,
          listName: listName,
          errorMessage: `Configuration list created but validation failed: ${validationResult.errorMessage}`
        };
      }

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      Logger.error('Error creating config list', error);
      return {
        success: false,
        listName: listName,
        errorMessage: `Failed to create configuration list: ${errorMessage}`
      };
    }
  }


}
