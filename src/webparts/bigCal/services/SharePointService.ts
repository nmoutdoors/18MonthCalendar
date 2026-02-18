import { WebPartContext } from '@microsoft/sp-webpart-base';
import { spfi, SPFx } from '@pnp/sp';
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';
import '@pnp/sp/fields';
import '@pnp/sp/attachments';
import { Logger } from './LoggingService';
import '@pnp/sp/content-types';
import { withTimeout, NETWORK_TIMEOUTS } from '../utils/BigCalUtilities';

export interface ISharePointEvent {
  Id: number;
  Title: string;
  EventDate: string; // Standard SharePoint Events list field
  EndDate: string;   // Standard SharePoint Events list field
  Swimlane: string;
  Status: string;
  IMO: string;
  OPR: string;
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

export interface IAttachmentInfo {
  FileName: string;
  ServerRelativeUrl: string;
  FileSize?: number;
  TimeCreated?: string;
  TimeLastModified?: string;
}

export interface IAttachmentUploadResult {
  success: boolean;
  fileName: string;
  serverRelativeUrl?: string;
  errorMessage?: string;
}

/**
 * SharePoint service for managing lists, fields, and data operations
 * Handles Events list, PrivateEvents list, and BigCalConfig list management
 *
 * STANDARD PRACTICE: All BigCal-created lists use Classic experience (ListExperienceOptions: 1)
 * for better data management, field visibility, and power user functionality.
 */
export class SharePointService {
  private sp: ReturnType<typeof spfi>;
  private listName: string;
  private context: WebPartContext;

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
        'Seniors',
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
      internalName: 'IMO',
      displayName: 'IMO',
      fieldType: 'Choice',
      required: false,
      choices: [
        'IMO 1',
        'IMO 2',
        'IMO 3',
        'IMO 4',
        'IMO 5',
        'IMO 6',
        'IMO 7',
        'IMO 8'
      ],
      defaultValue: '' // No default - allow blank/null
    },
    {
      internalName: 'OPR',
      displayName: 'OPR',
      fieldType: 'Choice',
      required: false, // Not required in SharePoint list (Outlook sync compatibility)
      choices: [
        'J-0',
        'J-3/5/7',
        'Industry – EM',
        'DAFA – SPIO',
        'MILDEPs – SPIO',
        'International Engagements',
        'Speaking Engagements – PAO',
        'Media Engagements/Queries – PAO',
        'Conferences and Exhibits – PAO',
        'J9',
        'Internal Engagements',
        'OSD/Congress'
      ],
      defaultValue: '' // No default - allow blank/null for Outlook compatibility
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
    this.context = context;
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
   * Convert Date to SharePoint-compatible UTC string
   * Following SharePoint golden rule: "Always store UTC to the list"
   */
  private toSharePointDateString(date: Date): string {
    // Use toISOString() which always returns UTC with 'Z' suffix
    // This is the SharePoint-recommended approach
    const result = date.toISOString();



    return result;
  }

  /**
   * Check if current user has admin rights to the specified list
   * Admin rights = can manage list (add/edit/delete items and manage list settings)
   */
  public async checkUserIsListAdmin(listName?: string): Promise<boolean> {
    const targetListName = listName || this.listName;

    try {
      // Try to access list permissions - this will fail if user doesn't have admin rights
      await this.sp.web.lists.getByTitle(targetListName).effectiveBasePermissions();

      // Try to access list settings - only admins can do this
      await this.sp.web.lists.getByTitle(targetListName).select('Title', 'Id')();

      // If we can access both, user likely has admin rights
      Logger.debug(`User has admin rights to list: ${targetListName}`);
      return true;
    } catch (error) {
      // If any permission check fails, user is not an admin
      Logger.debug(`User does not have admin rights to list: ${targetListName}`, error);
      return false;
    }
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
      let selectFields = 'Id,Title,EventDate,EndDate,Swimlane,Status,IMO,OPR,Description';

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



      const itemsPromise = this.sp.web.lists.getByTitle(this.listName).items
        .select(selectFields)
        .orderBy('EventDate', true)
        .top(5000)(); // Increase limit to 5000 events

      const items = await withTimeout(itemsPromise, NETWORK_TIMEOUTS.STANDARD, `Get events from ${this.listName}`);

      Logger.info(`Loaded ${items.length} events from SharePoint`);



      return items.map((item: {
        Id: number;
        Title: string;
        EventDate: string;
        EndDate: string;
        Swimlane: string;
        Status: string;
        IMO: string;
        OPR: string;
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
          IMO: item.IMO === 'null' || item.IMO === null || item.IMO === undefined ? '' : item.IMO,
          OPR: item.OPR === 'null' || item.OPR === null || item.OPR === undefined ? '' : item.OPR,
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
   * Get events within a specific date range (for lazy loading optimization)
   * @param startDate - Start of date range (inclusive)
   * @param endDate - End of date range (inclusive)
   */
  public async getEventsByDateRange(startDate: Date, endDate: Date): Promise<ISharePointEvent[]> {
    try {
      // Check if the list has the new Private fields
      const hasPrivateFields = await this.checkForPrivateFields();

      // Use PnP.js to get items from the Events list
      let selectFields = 'Id,Title,EventDate,EndDate,Swimlane,Status,IMO,OPR,Description';

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

      // Build OData filter for date range
      // Filter events where EventDate is within the range
      const startISO = startDate.toISOString();
      const endISO = endDate.toISOString();
      const filterQuery = `EventDate ge datetime'${startISO}' and EventDate le datetime'${endISO}'`;

      const itemsPromise = this.sp.web.lists.getByTitle(this.listName).items
        .select(selectFields)
        .filter(filterQuery)
        .orderBy('EventDate', true)
        .top(5000)(); // Increase limit to 5000 events

      const items = await withTimeout(itemsPromise, NETWORK_TIMEOUTS.STANDARD, `Get events from ${this.listName} (${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()})`);

      Logger.info(`Loaded ${items.length} events from SharePoint for date range ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`);

      return items.map((item: {
        Id: number;
        Title: string;
        EventDate: string;
        EndDate: string;
        Swimlane: string;
        Status: string;
        IMO: string;
        OPR: string;
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
          IMO: item.IMO === 'null' || item.IMO === null || item.IMO === undefined ? '' : item.IMO,
          OPR: item.OPR === 'null' || item.OPR === null || item.OPR === undefined ? '' : item.OPR,
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
      Logger.error('Error fetching events by date range from SharePoint', {
        message: errorMessage,
        listName: this.listName,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });
      throw new Error(`Failed to fetch events by date range: ${errorMessage}`);
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
    imo?: string; // Make IMO optional
    opr?: string; // Make OPR optional
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
          EventDate: this.toSharePointDateString(event.start), // Store without timezone conversion
          EndDate: this.toSharePointDateString(event.end),     // Store without timezone conversion
          Swimlane: event.swimlane,
          Description: event.description
        };

        // Only add Status if it's provided (not undefined/null/empty)
        if (event.status && event.status.trim()) {
          itemData.Status = event.status;
        }

        // Only add IMO if it's provided (not undefined/null/empty)
        if (event.imo && event.imo.trim()) {
          itemData.IMO = event.imo;
        }

        // Only add OPR if it's provided (not undefined/null/empty)
        if (event.opr && event.opr.trim()) {
          itemData.OPR = event.opr;
        }

        // Only add Private fields if they exist in the list
        if (hasPrivateFields) {
          itemData.Private = event.isPrivate || false;
          if (event.privateEventId) {
            itemData.PrivateEventId = event.privateEventId;
          }
        }

        const createPromise = this.sp.web.lists.getByTitle(this.listName).items.add(itemData);
        const result = await withTimeout(createPromise, NETWORK_TIMEOUTS.STANDARD, `Create event in ${this.listName}`);

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
          IMO: itemData_result.IMO,
          OPR: itemData_result.OPR,
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

  public async createEvent(title: string, start: Date, end: Date, swimlane: string = 'Category 1', status: string = 'Green', imo: string = '', opr: string = '', description: string = '', isPrivate: boolean = false, privateEventId?: string): Promise<ISharePointEvent> {
    try {
      Logger.debug('Creating event', { title, isPrivate });

      // Check if the list has the new Private fields
      const hasPrivateFields = await this.checkForPrivateFields();

      // Use PnP.js to create a new item in the Events list
      const itemData: Record<string, unknown> = {
        Title: title,
        EventDate: this.toSharePointDateString(start), // Store without timezone conversion
        EndDate: this.toSharePointDateString(end),     // Store without timezone conversion
        Swimlane: swimlane,
        Description: description
      };

      // Only add Status if it's provided (not undefined/null/empty)
      if (status && status.trim()) {
        itemData.Status = status;
      }

      // Only add IMO if it's provided (not undefined/null/empty)
      if (imo && imo.trim()) {
        itemData.IMO = imo;
      }

      // Only add OPR if it's provided (not undefined/null/empty)
      if (opr && opr.trim()) {
        itemData.OPR = opr;
      }

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

      const createPromise = this.sp.web.lists.getByTitle(this.listName).items.add(itemData);
      const result = await withTimeout(createPromise, NETWORK_TIMEOUTS.STANDARD, `Create single event in ${this.listName}`);

      Logger.debug(`Created event: ${result.Title}`);

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
        Private: result.Private || false,
        PrivateEventId: result.PrivateEventId || undefined
      };

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      Logger.error('Error creating event in SharePoint', error);
      throw new Error(`Failed to create event: ${errorMessage}`);
    }
  }

  public async updateEvent(id: number, title: string, start: Date, end: Date, swimlane?: string, status?: string, imo?: string, opr?: string, description?: string, isPrivate?: boolean, privateEventId?: string): Promise<void> {
    try {
      // Check if the list has the new Private fields
      const hasPrivateFields = await this.checkForPrivateFields();

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
      // Check if list exists with timeout protection
      const listPromise = this.sp.web.lists.getByTitle(targetListName)();
      const list = await withTimeout(listPromise, NETWORK_TIMEOUTS.FAST, `Check if list ${targetListName} exists`);

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
      const coreFields = ['EventDate', 'EndDate', 'Description', 'Swimlane', 'Status', 'IMO', 'OPR'];
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
    const requiredFields = ['ConfigType', 'FieldName', 'OptionValue', 'ColorHex', 'IconName', 'OriginalColorHex', 'OriginalIconName', 'UseDarkText', 'IsActive', 'SortOrder'];

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
          '• IconName (Single line of text) - Icon name for display (optional)\n' +
          '• OriginalColorHex (Single line of text) - Original default color for reset functionality\n' +
          '• OriginalIconName (Single line of text) - Original default icon for reset functionality\n' +
          '• UseDarkText (Yes/No field) - Use dark text on light backgrounds (optional)\n' +
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

      // Set to Classic experience for better data management
      try {
        const createdList = this.sp.web.lists.getByTitle(listName);
        await createdList.update({
          ListExperienceOptions: 1 // 1 = Classic, 0 = Auto (Modern), 2 = Modern
        });
        Logger.info('Set Events list to Classic experience');
      } catch (experienceError) {
        Logger.warn('Could not set Classic experience, continuing with default', experienceError);
      }

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
          internalName: 'IconName',
          displayName: 'Icon Name',
          fieldType: 'Text',
          description: 'Icon name for display (optional)'
        },
        {
          internalName: 'OriginalColorHex',
          displayName: 'Original Color Hex',
          fieldType: 'Text',
          description: 'Original default hex color code for reset functionality'
        },
        {
          internalName: 'OriginalIconName',
          displayName: 'Original Icon Name',
          fieldType: 'Text',
          description: 'Original default icon name for reset functionality (optional)'
        },
        {
          internalName: 'UseDarkText',
          displayName: 'Use Dark Text',
          fieldType: 'Boolean',
          description: 'Use dark text on light backgrounds (optional)',
          defaultValue: false
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
      // The list will have all required fields: Title, ConfigType, FieldName, OptionValue, ColorHex, IconName, OriginalColorHex, OriginalIconName, UseDarkText, IsActive, SortOrder
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

  /**
   * Get the GUID of a SharePoint list for Outlook connection
   */
  public async getListGuid(listName: string): Promise<string> {
    try {
      const list = await this.sp.web.lists.getByTitle(listName).select('Id')();
      return `{${list.Id.toUpperCase()}}`;
    } catch (error) {
      Logger.error(`Error getting GUID for list ${listName}`, error);
      throw new Error(`Failed to get list GUID: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ==================== ATTACHMENT METHODS ====================

  /**
   * Get all attachments for a specific event
   */
  public async getEventAttachments(eventId: number): Promise<IAttachmentInfo[]> {
    try {
      Logger.debug(`Getting attachments for event ${eventId}`);

      const item = this.sp.web.lists.getByTitle(this.listName).items.getById(eventId);
      const attachmentsPromise = item.attachmentFiles.select('FileName', 'ServerRelativeUrl', 'Length', 'TimeCreated', 'TimeLastModified')();
      const attachments = await withTimeout(attachmentsPromise, NETWORK_TIMEOUTS.STANDARD, `Get attachments for event ${eventId}`);

      return attachments.map((att: {
        FileName: string;
        ServerRelativeUrl: string;
        Length?: number;
        TimeCreated?: string;
        TimeLastModified?: string;
      }) => ({
        FileName: att.FileName,
        ServerRelativeUrl: att.ServerRelativeUrl,
        FileSize: att.Length,
        TimeCreated: att.TimeCreated,
        TimeLastModified: att.TimeLastModified
      }));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      Logger.error(`Error getting attachments for event ${eventId}`, error);
      throw new Error(`Failed to get event attachments: ${errorMessage}`);
    }
  }

  /**
   * Add an attachment to an event
   */
  public async addEventAttachment(eventId: number, fileName: string, fileContent: string | ArrayBuffer | Blob): Promise<IAttachmentUploadResult> {
    try {
      Logger.debug(`Adding attachment ${fileName} to event ${eventId}`);

      // Validate file name
      if (!fileName || fileName.trim().length === 0) {
        return {
          success: false,
          fileName: fileName,
          errorMessage: 'File name cannot be empty'
        };
      }

      // Sanitize file name to prevent issues
      const sanitizedFileName = fileName.replace(/[<>:"/\\|?*]/g, '_');

      const item = this.sp.web.lists.getByTitle(this.listName).items.getById(eventId);

      const addPromise = item.attachmentFiles.add(sanitizedFileName, fileContent);
      const result = await withTimeout(addPromise, NETWORK_TIMEOUTS.SLOW, `Add attachment ${sanitizedFileName} to event ${eventId}`);

      Logger.debug(`Successfully added attachment ${sanitizedFileName} to event ${eventId}`);

      return {
        success: true,
        fileName: sanitizedFileName,
        serverRelativeUrl: (result as { data?: { ServerRelativeUrl?: string }; ServerRelativeUrl?: string }).data?.ServerRelativeUrl ||
                          (result as { data?: { ServerRelativeUrl?: string }; ServerRelativeUrl?: string }).ServerRelativeUrl
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      Logger.error(`Error adding attachment ${fileName} to event ${eventId}`, error);
      return {
        success: false,
        fileName: fileName,
        errorMessage: `Failed to add attachment: ${errorMessage}`
      };
    }
  }

  /**
   * Delete an attachment from an event
   */
  public async deleteEventAttachment(eventId: number, fileName: string): Promise<boolean> {
    try {
      Logger.debug(`Deleting attachment ${fileName} from event ${eventId}`);

      const item = this.sp.web.lists.getByTitle(this.listName).items.getById(eventId);
      const deletePromise = item.attachmentFiles.getByName(fileName).delete();
      await withTimeout(deletePromise, NETWORK_TIMEOUTS.STANDARD, `Delete attachment ${fileName} from event ${eventId}`);

      Logger.debug(`Successfully deleted attachment ${fileName} from event ${eventId}`);
      return true;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      Logger.error(`Error deleting attachment ${fileName} from event ${eventId}`, error);
      throw new Error(`Failed to delete attachment: ${errorMessage}`);
    }
  }

  /**
   * Download attachment content as text
   */
  public async downloadAttachmentAsText(eventId: number, fileName: string): Promise<string> {
    try {
      Logger.debug(`Downloading attachment ${fileName} as text from event ${eventId}`);

      const item = this.sp.web.lists.getByTitle(this.listName).items.getById(eventId);
      const textPromise = item.attachmentFiles.getByName(fileName).getText();
      const content = await withTimeout(textPromise, NETWORK_TIMEOUTS.SLOW, `Download attachment ${fileName} as text from event ${eventId}`);

      return content;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      Logger.error(`Error downloading attachment ${fileName} as text from event ${eventId}`, error);
      throw new Error(`Failed to download attachment as text: ${errorMessage}`);
    }
  }

  /**
   * Download attachment content as blob (for browser use)
   */
  public async downloadAttachmentAsBlob(eventId: number, fileName: string): Promise<Blob> {
    try {
      Logger.debug(`Downloading attachment ${fileName} as blob from event ${eventId}`);

      const item = this.sp.web.lists.getByTitle(this.listName).items.getById(eventId);
      const blobPromise = item.attachmentFiles.getByName(fileName).getBlob();
      const blob = await withTimeout(blobPromise, NETWORK_TIMEOUTS.SLOW, `Download attachment ${fileName} as blob from event ${eventId}`);

      return blob;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      Logger.error(`Error downloading attachment ${fileName} as blob from event ${eventId}`, error);
      throw new Error(`Failed to download attachment as blob: ${errorMessage}`);
    }
  }

  /**
   * Get attachment download URL for direct browser download
   */
  public getAttachmentDownloadUrl(eventId: number, fileName: string): string {
    // Construct the direct download URL for SharePoint list item attachment
    const siteUrl = this.context.pageContext.web.absoluteUrl;
    const encodedFileName = encodeURIComponent(fileName);
    return `${siteUrl}/_api/web/lists/getbytitle('${this.listName}')/items(${eventId})/AttachmentFiles('${encodedFileName}')/$value`;
  }

  /**
   * Get the site URL
   */
  public getSiteUrl(): string {
    return this.context.pageContext.web.absoluteUrl;
  }

  /**
   * Validate file for upload (size, type, etc.)
   */
  public validateFileForUpload(file: File): { isValid: boolean; errorMessage?: string } {
    // File size limit (10MB)
    const maxSizeBytes = 10 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return {
        isValid: false,
        errorMessage: `File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds the 10MB limit`
      };
    }

    // Blocked file extensions for security
    const blockedExtensions = ['.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js', '.jar', '.ps1'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    if (blockedExtensions.indexOf(fileExtension) !== -1) {
      return {
        isValid: false,
        errorMessage: `File type ${fileExtension} is not allowed for security reasons`
      };
    }

    return { isValid: true };
  }
}
