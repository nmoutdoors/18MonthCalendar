import * as React from 'react';
import * as ReactDom from 'react-dom';
import { Version } from '@microsoft/sp-core-library';
import {
  type IPropertyPaneConfiguration,
  PropertyPaneTextField,
  PropertyPaneToggle,
  PropertyPaneSlider,
  PropertyPaneButton,
  PropertyPaneButtonType,
  PropertyPaneLabel,
  IPropertyPaneField
} from '@microsoft/sp-property-pane';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';
import { IReadonlyTheme } from '@microsoft/sp-component-base';

import * as strings from 'BigCalWebPartStrings';
import BigCal from './components/BigCal';
import { SharePointService, IListValidationResult, IListCreationResult } from './services/SharePointService';
import { ColorMappingService } from './services/ColorMappingService';
import { Logger } from './services/LoggingService';

export interface IBigCalWebPartProps {
  description: string;
  startInFullscreen: boolean;
  listName: string;
  showImpersonateButton: boolean;
  showIconSelector: boolean;
  showTimelineView: boolean;
  gridLineOpacity: number;
  // Lazy Loading Configuration
  enableLazyLoading: boolean;
  lazyLoadMonthsPast: number;
  lazyLoadMonthsFuture: number;
  enablePerformanceLogging: boolean;
}

export default class BigCalWebPart extends BaseClientSideWebPart<IBigCalWebPartProps> {

  private _isDarkTheme: boolean = false;
  private _sharePointService: SharePointService | undefined;
  private _listValidationResult: IListValidationResult | undefined;
  private _privateListValidationResult: IListValidationResult | undefined;
  private _configListValidationResult: IListValidationResult | undefined;
  private _isCreatingList: boolean = false;
  private _isCreatingPrivateList: boolean = false;
  private _isCreatingConfigList: boolean = false;
  // COMMENTED OUT: Refresh Swimlanes functionality moved to Legend Studio
  // private _isRefreshingSwimlanes: boolean = false;
  // private _refreshSwimlanesMessage: string = '';



  public async render(): Promise<void> {
    // Check user permissions asynchronously
    const isUserAdmin = await this._checkUserPermissions();

    const element = React.createElement(
      BigCal,
      {
        description: this.properties.description,
        isDarkTheme: this._isDarkTheme,
        hasTeamsContext: !!this.context.sdks.microsoftTeams,
        userDisplayName: this.context.pageContext.user.displayName,
        startInFullscreen: this.properties.startInFullscreen !== false, // Default to true
        isUserAdmin: isUserAdmin,
        context: this.context,
        listName: this.properties.listName || 'Events',
        showImpersonateButton: this.properties.showImpersonateButton || false, // Default to false
        showIconSelector: this.properties.showIconSelector || false, // Default to false
        showTimelineView: this.properties.showTimelineView !== false, // Default to true for backward compatibility
        gridLineOpacity: this.properties.gridLineOpacity || 0.5, // Default to 50% opacity
        webPartDomElement: this.domElement, // Pass reference for fullscreen toggle
        // Lazy Loading Configuration
        enableLazyLoading: this.properties.enableLazyLoading !== undefined ? this.properties.enableLazyLoading : true, // Default to true
        lazyLoadMonthsPast: this.properties.lazyLoadMonthsPast !== undefined ? this.properties.lazyLoadMonthsPast : 1, // Default to 1
        lazyLoadMonthsFuture: this.properties.lazyLoadMonthsFuture !== undefined ? this.properties.lazyLoadMonthsFuture : 4, // Default to 4
        enablePerformanceLogging: this.properties.enablePerformanceLogging || false, // Default to false
        onConfigureProperties: () => {
          this.context.propertyPane.open();
        }
      }
    );

    ReactDom.render(element, this.domElement);
  }

  protected async onInit(): Promise<void> {
    // COLD START FIX: Detect cold start and auto-refresh if needed
    this.handleColdStartDetection();

    // Set default value for startInFullscreen if not already set (ProgramTracker pattern)
    if (this.properties.startInFullscreen === undefined) {
      this.properties.startInFullscreen = true;  // Default to fullscreen
    }

    // FLICKER FIX: Apply fullscreen CSS BEFORE React renders (UnityFX pattern)
    // This prevents the flicker/disappear/reappear issue on page load
    if (this.properties.startInFullscreen) {
      this.applyFullscreenBootstrap();
    }



    // Set default list name if not already set
    if (this.properties.listName === undefined) {
      this.properties.listName = 'Events';  // Default to Events list
    }

    // Set default value for showImpersonateButton if not already set
    if (this.properties.showImpersonateButton === undefined) {
      this.properties.showImpersonateButton = false;  // Default to hidden
    }

    // Set default value for showIconSelector if not already set
    if (this.properties.showIconSelector === undefined) {
      this.properties.showIconSelector = false;  // Default to hidden
    }

    // Set default value for gridLineOpacity if not already set
    if (this.properties.gridLineOpacity === undefined) {
      this.properties.gridLineOpacity = 0.5;  // Default to 50% opacity (medium darkness)
    }

    // Initialize SharePoint services
    this._sharePointService = new SharePointService(this.context, this.properties.listName);

    // Validate lists on initialization
    this._listValidationResult = await this._validateListName(this.properties.listName);
    this._privateListValidationResult = await this._validatePrivateList();
    this._configListValidationResult = await this._validateConfigList();

    return Promise.resolve();
  }

  private async _checkUserPermissions(): Promise<boolean> {
    // Check if user has admin rights to the Public Events list
    // This is more accurate than page edit permissions for webpart configuration
    try {
      if (!this._sharePointService) {
        return false;
      }

      const isListAdmin = await this._sharePointService.checkUserIsListAdmin(this.properties.listName || 'Events');
      Logger.debug(`User admin status for Events list: ${isListAdmin}`);
      return isListAdmin;
    } catch (error) {
      // Fallback: if we can't determine permissions, assume no admin rights
      Logger.warn('Could not determine user list permissions', error);
      return false;
    }
  }

  private async _validateListName(listName: string): Promise<IListValidationResult> {
    if (!this._sharePointService) {
      return {
        isValid: false,
        listExists: false,
        missingFields: [],
        errorMessage: 'SharePoint service not initialized'
      };
    }

    // Require private fields for full functionality
    return await this._sharePointService.validateList(listName, true);
  }

  protected async onPropertyPaneFieldChanged(propertyPath: string, oldValue: unknown, newValue: unknown): Promise<void> {
    if (propertyPath === 'listName' && typeof newValue === 'string') {
      // Validate the new list name
      this._listValidationResult = await this._validateListName(newValue);

      // Update the SharePoint service with the new list name
      if (this._sharePointService) {
        this._sharePointService = new SharePointService(this.context, newValue);
      }

      // Refresh the property pane to show validation results
      this.context.propertyPane.refresh();
    }

    // Refresh property pane when lazy loading is toggled to enable/disable month sliders
    if (propertyPath === 'enableLazyLoading') {
      this.context.propertyPane.refresh();
      // Re-render the web part to apply the new lazy loading setting
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.render();
    }

    // Re-render when lazy loading months are changed
    if (propertyPath === 'lazyLoadMonthsPast' || propertyPath === 'lazyLoadMonthsFuture') {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.render();
    }
  }

  private async _validatePrivateList(): Promise<IListValidationResult> {
    if (!this._sharePointService) {
      return {
        isValid: false,
        listExists: false,
        missingFields: [],
        errorMessage: 'SharePoint service not initialized',
        canCreate: false
      };
    }

    try {
      // Check if PrivateEvents list exists and has required fields
      // PrivateEvents list does NOT need Private/PrivateEventId fields - those are in the main Events list
      const result = await this._sharePointService.validateList('PrivateEvents', false);
      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        isValid: false,
        listExists: false,
        missingFields: [],
        errorMessage: `Failed to validate PrivateEvents list: ${errorMessage}`,
        canCreate: true
      };
    }
  }

  private async _validateConfigList(): Promise<IListValidationResult> {
    if (!this._sharePointService) {
      return {
        isValid: false,
        listExists: false,
        missingFields: [],
        errorMessage: 'SharePoint service not initialized',
        canCreate: false
      };
    }

    try {
      // Check if BigCalConfig list exists - it's a custom list for storing color configurations
      const result = await this._sharePointService.validateConfigList('BigCalConfig');
      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        isValid: false,
        listExists: false,
        missingFields: [],
        errorMessage: `Failed to validate BigCalConfig list: ${errorMessage}`,
        canCreate: true
      };
    }
  }

  private async _createList(): Promise<void> {
    if (!this._sharePointService || !this.properties.listName || this._isCreatingList) {
      return;
    }

    this._isCreatingList = true;
    this.context.propertyPane.refresh();

    try {
      const result: IListCreationResult = await this._sharePointService.createList(this.properties.listName);

      if (result.success) {
        // Re-validate the list to update the UI
        this._listValidationResult = await this._validateListName(this.properties.listName);

        // Update the SharePoint service to use the new list
        this._sharePointService = new SharePointService(this.context, this.properties.listName);
      } else {
        // Update validation result with creation error
        this._listValidationResult = {
          isValid: false,
          listExists: false,
          missingFields: [],
          errorMessage: result.errorMessage,
          canCreate: true
        };
      }
    } catch (error) {
      console.error('Error creating list:', error);
      this._listValidationResult = {
        isValid: false,
        listExists: false,
        missingFields: [],
        errorMessage: `Failed to create list: ${error instanceof Error ? error.message : 'Unknown error'}`,
        canCreate: true
      };
    } finally {
      this._isCreatingList = false;
      this.context.propertyPane.refresh();
    }
  }

  private async _createPrivateList(): Promise<void> {
    if (!this._sharePointService || this._isCreatingPrivateList) {
      return;
    }

    this._isCreatingPrivateList = true;
    this.context.propertyPane.refresh();

    try {
      const result: IListCreationResult = await this._sharePointService.createPrivateEventsList('PrivateEvents');

      if (result.success) {
        // Re-validate the private list to update the UI
        this._privateListValidationResult = await this._validatePrivateList();
      } else {
        // Update validation result with creation error
        this._privateListValidationResult = {
          isValid: false,
          listExists: false,
          missingFields: [],
          errorMessage: result.errorMessage,
          canCreate: true
        };
      }
    } catch (error) {
      console.error('Error creating private list:', error);
      this._privateListValidationResult = {
        isValid: false,
        listExists: false,
        missingFields: [],
        errorMessage: `Failed to create PrivateEvents list: ${error instanceof Error ? error.message : 'Unknown error'}`,
        canCreate: true
      };
    } finally {
      this._isCreatingPrivateList = false;
      this.context.propertyPane.refresh();
    }
  }

  private async _createConfigList(): Promise<void> {
    if (!this._sharePointService || this._isCreatingConfigList) {
      return;
    }

    this._isCreatingConfigList = true;
    this.context.propertyPane.refresh();

    try {
      const result: IListCreationResult = await this._sharePointService.createConfigList('BigCalConfig');

      if (result.success) {
        // Initialize the BigCalConfig list with default color mappings using custom colors
        try {
          const colorMappingService = new ColorMappingService(this.context);

          // Use the configured list name (or default to 'Events') for field discovery
          const eventsListName = this.properties.listName || 'Events';
          await colorMappingService.initializeConfigListWithDefaults(eventsListName);

          Logger.info('BigCalConfig list created and initialized with custom color defaults');
        } catch (initError) {
          Logger.warn('BigCalConfig list created but failed to initialize with defaults', initError);
          // Don't fail the entire operation if initialization fails
        }

        // Re-validate the config list to update the UI
        this._configListValidationResult = await this._validateConfigList();
      } else {
        // Update validation result with creation error
        this._configListValidationResult = {
          isValid: false,
          listExists: false,
          missingFields: [],
          errorMessage: result.errorMessage,
          canCreate: true
        };
      }
    } catch (error) {
      console.error('Error creating config list:', error);
      this._configListValidationResult = {
        isValid: false,
        listExists: false,
        missingFields: [],
        errorMessage: `Failed to create BigCalConfig list: ${error instanceof Error ? error.message : 'Unknown error'}`,
        canCreate: true
      };
    } finally {
      this._isCreatingConfigList = false;
      this.context.propertyPane.refresh();
    }
  }

  // COMMENTED OUT: Refresh Swimlanes functionality moved to Legend Studio
  /*
  private async _refreshSwimlanes(): Promise<void> {
    if (!this._sharePointService || this._isRefreshingSwimlanes) {
      return;
    }

    this._isRefreshingSwimlanes = true;
    this._refreshSwimlanesMessage = '';
    this.context.propertyPane.refresh();

    try {
      const colorMappingService = new ColorMappingService(this.context);

      // First, clean up any orphaned swimlane mappings
      const cleanupResult = await colorMappingService.cleanupOrphanedSwimlanes(this.properties.listName || 'Events');

      // Discover field options from the Events list (same logic as Legend Studio)
      const discoveredOptions = await colorMappingService.discoverFieldOptions(this.properties.listName || 'Events');

      // Filter to only newly discovered swimlanes (not status options)
      const newSwimlanes = discoveredOptions.filter(option =>
        option.fieldName === 'Swimlanes' && option.isNewlyDiscovered
      );

      // Build comprehensive feedback message
      const feedbackParts: string[] = [];

      // Report cleanup results
      if (cleanupResult.deletedCount > 0) {
        feedbackParts.push(`Removed ${cleanupResult.deletedCount} obsolete swimlane(s): ${cleanupResult.deletedSwimlanes.join(', ')}`);
      }

      // Report new discoveries
      if (newSwimlanes.length === 0) {
        if (cleanupResult.deletedCount === 0) {
          feedbackParts.push('No changes needed - all swimlanes are up to date');
        }
      } else {
        // Generate default mappings for new swimlanes
        const newMappings = await colorMappingService.generateDefaultMappings(newSwimlanes);

        if (newMappings.length > 0) {
          // Save the new mappings to BigCalConfig
          await colorMappingService.saveBulkColorMappings(newMappings);
          Logger.info(`Added ${newMappings.length} new swimlane(s) with default colors and icons`);

          const swimlaneNames = newSwimlanes.map(s => s.optionValue).join(', ');
          feedbackParts.push(`Discovered ${newMappings.length} new swimlane(s): ${swimlaneNames}`);
        }
      }

      // Set comprehensive feedback message
      this._refreshSwimlanesMessage = feedbackParts.length > 0
        ? feedbackParts.join('. ')
        : 'Refresh completed - no changes needed';

      // Refresh validation to show updated status
      this._configListValidationResult = await this._validateConfigList();

    } catch (error) {
      Logger.error('Error refreshing swimlanes', error);
      this._refreshSwimlanesMessage = `Error refreshing swimlanes: ${error.message || 'Unknown error'}`;
    } finally {
      this._isRefreshingSwimlanes = false;
      this.context.propertyPane.refresh();
    }
  }
  */

  protected onThemeChanged(currentTheme: IReadonlyTheme | undefined): void {
    if (!currentTheme) {
      return;
    }

    this._isDarkTheme = !!currentTheme.isInverted;
    const {
      semanticColors
    } = currentTheme;

    if (semanticColors) {
      this.domElement.style.setProperty('--bodyText', semanticColors.bodyText || null);
      this.domElement.style.setProperty('--link', semanticColors.link || null);
      this.domElement.style.setProperty('--linkHovered', semanticColors.linkHovered || null);
    }

  }

  protected onDispose(): void {
    ReactDom.unmountComponentAtNode(this.domElement);
  }

  protected get dataVersion(): Version {
    return Version.parse('1.0');
  }

  private _getListNameDescription(): string {
    if (this._isCreatingList) {
      return '🔄 Creating list with required fields...';
    }

    if (this._listValidationResult) {
      if (this._listValidationResult.isValid) {
        return '✅ Events list validated successfully - contains all required fields and supports Outlook sync';
      } else if (!this._listValidationResult.listExists && this._listValidationResult.canCreate) {
        return '❌ Events list does not exist - use the "Create List" button below to create it automatically';
      } else if (!this._listValidationResult.listExists) {
        return '❌ Events list does not exist';
      } else if (this._listValidationResult.missingFields.length > 0) {
        return `⚠️ List exists but missing required fields: ${this._listValidationResult.missingFields.join(', ')}`;
      }
    }
    return 'Name of the SharePoint Events list containing events (must be Events list type for Outlook sync)';
  }

  private _getListNameErrorMessage(): string | undefined {
    if (this._listValidationResult && !this._listValidationResult.isValid) {
      return this._listValidationResult.errorMessage;
    }
    return undefined;
  }

  private _getPrivateFieldsStatus(): string {
    if (!this._listValidationResult) {
      return 'Checking private fields...';
    }

    if (!this._listValidationResult.listExists) {
      return 'Private Fields: List must exist first';
    }

    // Check specifically for Private and PrivateEventId fields
    const missingPrivateFields = this._listValidationResult.missingFields.filter(field =>
      field === 'Private' || field === 'PrivateEventId'
    );

    if (missingPrivateFields.length === 0) {
      return '✅ Private Fields: Private and PrivateEventId fields found - private events enabled';
    } else {
      return `❌ Private Fields: Missing ${missingPrivateFields.join(', ')} in main Events list - required for private events`;
    }
  }

  private _getPrivateListDescription(): string {
    if (this._isCreatingPrivateList) {
      return '🔄 Creating PrivateEvents list with required fields...';
    }

    if (!this._privateListValidationResult) {
      return 'Checking PrivateEvents list...';
    }

    if (this._privateListValidationResult.isValid) {
      return '✅ PrivateEvents list exists with all required fields - private events enabled';
    }

    if (!this._privateListValidationResult.listExists && this._privateListValidationResult.canCreate) {
      return '❌ PrivateEvents list does not exist - use the "Create PrivateEvents List" button below';
    }

    if (!this._privateListValidationResult.listExists) {
      return '❌ PrivateEvents list does not exist - private events will not work';
    }

    if (this._privateListValidationResult.missingFields.length > 0) {
      return `⚠️ PrivateEvents list exists but missing required fields: ${this._privateListValidationResult.missingFields.join(', ')}`;
    }

    return '❌ PrivateEvents list validation failed';
  }

  private _getConfigListDescription(): string {
    if (this._isCreatingConfigList) {
      return '🔄 Creating BigCalConfig list with required fields...';
    }

    if (!this._configListValidationResult) {
      return 'Checking BigCalConfig list...';
    }

    if (this._configListValidationResult.isValid) {
      return '✅ BigCalConfig list exists with all required fields - dynamic color palettes enabled';
    }

    if (!this._configListValidationResult.listExists && this._configListValidationResult.canCreate) {
      return '❌ BigCalConfig list does not exist - use the "Create BigCalConfig List" button below';
    }

    if (!this._configListValidationResult.listExists) {
      return '❌ BigCalConfig list does not exist - dynamic color palettes will not work';
    }

    if (this._configListValidationResult.missingFields.length > 0) {
      return `⚠️ BigCalConfig list exists but missing required fields: ${this._configListValidationResult.missingFields.join(', ')}`;
    }

    return '❌ BigCalConfig list validation failed';
  }

  private _getPropertyPaneFields(): IPropertyPaneField<unknown>[] {
    const fields: IPropertyPaneField<unknown>[] = [
      PropertyPaneTextField('description', {
        label: strings.DescriptionFieldLabel
      }),
      PropertyPaneToggle('startInFullscreen', {
        label: 'Start in Fullscreen Mode',
        onText: 'Yes',
        offText: 'No'
      }),
      PropertyPaneToggle('showImpersonateButton', {
        label: 'Show Impersonate Button (Testing)',
        onText: 'Visible',
        offText: 'Hidden'
      }),
      PropertyPaneToggle('showIconSelector', {
        label: 'Show Icon Selector (Temporary Feature)',
        onText: 'Visible',
        offText: 'Hidden'
      }),
      PropertyPaneToggle('showTimelineView', {
        label: 'Display Timeline View',
        onText: 'Enabled',
        offText: 'Disabled (Performance Optimization)'
      }),
      PropertyPaneSlider('gridLineOpacity', {
        label: 'Grid Line Darkness',
        min: 0.1,
        max: 1.0,
        step: 0.1,
        showValue: true,
        value: this.properties.gridLineOpacity || 0.5
      }),
      PropertyPaneToggle('enableLazyLoading', {
        label: 'Enable Fast Loading (Lazy Load Events)',
        onText: 'Enabled',
        offText: 'Disabled (Load All Events)',
        checked: this.properties.enableLazyLoading !== undefined ? this.properties.enableLazyLoading : true
      }),
      PropertyPaneSlider('lazyLoadMonthsPast', {
        label: 'Months to Load (Past)',
        min: 0,
        max: 12,
        step: 1,
        showValue: true,
        value: this.properties.lazyLoadMonthsPast !== undefined ? this.properties.lazyLoadMonthsPast : 1,
        disabled: this.properties.enableLazyLoading === false // Only disable if explicitly set to false
      }),
      PropertyPaneSlider('lazyLoadMonthsFuture', {
        label: 'Months to Load (Future)',
        min: 0,
        max: 12,
        step: 1,
        showValue: true,
        value: this.properties.lazyLoadMonthsFuture !== undefined ? this.properties.lazyLoadMonthsFuture : 4,
        disabled: this.properties.enableLazyLoading === false // Only disable if explicitly set to false
      }),
      PropertyPaneToggle('enablePerformanceLogging', {
        label: 'Enable Performance Logging',
        onText: 'Enabled',
        offText: 'Disabled',
        checked: this.properties.enablePerformanceLogging || false
      }),
      PropertyPaneTextField('listName', {
        label: 'SharePoint List Name',
        description: this._getListNameDescription(),
        placeholder: 'Events',
        errorMessage: this._getListNameErrorMessage()
      })
    ];

    // Add create list button directly after the list name field if validation shows we can create the list
    if (this._listValidationResult && this._listValidationResult.canCreate && !this._listValidationResult.isValid) {
      fields.push(
        PropertyPaneButton('createList', {
          text: this._isCreatingList ? 'Creating Events List...' : 'Create Events List with Outlook Sync',
          buttonType: PropertyPaneButtonType.Primary,
          onClick: () => {
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            this._createList();
          },
          disabled: this._isCreatingList
        })
      );
    }

    // Add private events configuration fields
    fields.push(
      PropertyPaneLabel('privateFieldsStatus', {
        text: this._getPrivateFieldsStatus()
      })
    );
    fields.push(
      PropertyPaneLabel('privateListStatus', {
        text: 'Private Events Configuration'
      })
    );
    fields.push(
      PropertyPaneLabel('privateListDescription', {
        text: this._getPrivateListDescription()
      })
    );

    // Add create private list button if validation shows we can create it
    if (this._privateListValidationResult && this._privateListValidationResult.canCreate && !this._privateListValidationResult.isValid) {
      fields.push(
        PropertyPaneButton('createPrivateList', {
          text: this._isCreatingPrivateList ? 'Creating PrivateEvents List...' : 'Create PrivateEvents List',
          buttonType: PropertyPaneButtonType.Normal,
          onClick: () => {
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            this._createPrivateList();
          },
          disabled: this._isCreatingPrivateList
        })
      );
    }

    // Add BigCalConfig list configuration fields
    fields.push(
      PropertyPaneLabel('configListStatus', {
        text: 'Dynamic Color Palette Configuration'
      })
    );
    fields.push(
      PropertyPaneLabel('configListDescription', {
        text: this._getConfigListDescription()
      })
    );

    // Add create config list button if validation shows we can create it
    if (this._configListValidationResult && this._configListValidationResult.canCreate && !this._configListValidationResult.isValid) {
      fields.push(
        PropertyPaneButton('createConfigList', {
          text: this._isCreatingConfigList ? 'Creating BigCalConfig List...' : 'Create BigCalConfig List',
          buttonType: PropertyPaneButtonType.Normal,
          onClick: () => {
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            this._createConfigList();
          },
          disabled: this._isCreatingConfigList
        })
      );
    }

    // COMMENTED OUT: Refresh Swimlanes button - now handled by Legend Studio modal
    // Legend Studio provides a better UX for swimlane management with immediate feedback
    /*
    // Add refresh swimlanes button if BigCalConfig list exists and is valid
    if (this._configListValidationResult && this._configListValidationResult.isValid) {
      fields.push(
        PropertyPaneButton('refreshSwimlanes', {
          text: this._isRefreshingSwimlanes ? 'Refreshing Swimlanes...' : 'Refresh Swimlanes',
          buttonType: PropertyPaneButtonType.Normal,
          onClick: () => {
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            this._refreshSwimlanes();
          },
          disabled: this._isRefreshingSwimlanes
        })
      );

      // Add feedback message if available
      if (this._refreshSwimlanesMessage) {
        fields.push(
          PropertyPaneLabel('refreshSwimlanesMessage', {
            text: this._refreshSwimlanesMessage
          })
        );
      }
    }
    */

    return fields;
  }

  protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration {
    return {
      pages: [
        {
          header: {
            description: strings.PropertyPaneDescription
          },
          groups: [
            {
              groupName: strings.BasicGroupName,
              groupFields: this._getPropertyPaneFields()
            }
          ]
        }
      ]
    };
  }

  /**
   * FLICKER FIX: Apply fullscreen CSS to web part container BEFORE React renders
   * This follows the UnityFX Fullscreen Layout Pattern to prevent flicker
   * Reference: unityfx/patterns/ui-shell/02-Fullscreen-Layout-Pattern.md
   */
  private applyFullscreenBootstrap(): void {
    try {
      // Apply styles directly to the web part's DOM element
      // This happens BEFORE React.render(), preventing any intermediate page states
      const container = this.domElement;

      if (container) {
        container.style.position = 'fixed';
        container.style.top = '0';
        container.style.left = '0';
        container.style.right = '0';
        container.style.bottom = '0';
        container.style.zIndex = '100';  // Lower than SharePoint's toolbar (z-index: 1000+)
        container.style.height = '100vh';
        container.style.width = '100vw';
        container.style.maxWidth = '100vw';
        container.style.padding = '0';
        container.style.margin = '0';
        container.style.backgroundColor = '#ffffff';

        Logger.debug('Fullscreen CSS bootstrap applied to web part container');
      }
    } catch (error) {
      Logger.error('Error applying fullscreen bootstrap', error);
    }
  }

  /**
   * COLD START FIX: Simple detection and auto-refresh solution
   * If F5 fixes it every time, let's just auto-F5 on cold starts
   */
  private handleColdStartDetection(): void {
    try {
      // Only apply to fullscreen webparts
      if (!this.properties.startInFullscreen) {
        return;
      }

      // Detect cold start vs page refresh
      const isColdStart = !window.performance.navigation ||
                         window.performance.navigation.type === 0;

      const isPageRefresh = window.performance.navigation &&
                           window.performance.navigation.type === 1;

      // If this is a cold start, set up auto-refresh after component mount
      if (isColdStart && !isPageRefresh) {
        // Use sessionStorage to prevent infinite refresh loops
        const refreshKey = 'bigcal-cold-start-refresh';
        const hasAlreadyRefreshed = sessionStorage.getItem(refreshKey);

        if (!hasAlreadyRefreshed) {
          // Mark that we're about to refresh
          sessionStorage.setItem(refreshKey, 'true');

          // Auto-refresh after a short delay to let the component mount first
          setTimeout(() => {
            window.location.reload();
          }, 2000); // 2 second delay to let user see it's loading
        }
      }

    } catch {
      // Silently handle cold start detection failures
    }
  }
}
