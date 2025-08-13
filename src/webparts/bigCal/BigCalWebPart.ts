import * as React from 'react';
import * as ReactDom from 'react-dom';
import { Version } from '@microsoft/sp-core-library';
import {
  type IPropertyPaneConfiguration,
  PropertyPaneTextField,
  PropertyPaneToggle,
  PropertyPaneDropdown,
  IPropertyPaneDropdownOption,
  PropertyPaneButton,
  PropertyPaneButtonType,
  IPropertyPaneField
} from '@microsoft/sp-property-pane';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';
import { IReadonlyTheme } from '@microsoft/sp-component-base';
import { DisplayMode } from '@microsoft/sp-core-library';

import * as strings from 'BigCalWebPartStrings';
import BigCal from './components/BigCal';
import { IBigCalProps } from './components/IBigCalProps';
import { SharePointService, IListValidationResult, IListCreationResult } from './services/SharePointService';

export interface IBigCalWebPartProps {
  description: string;
  startInFullscreen: boolean;
  colorPalette: string;
  listName: string;
}

export default class BigCalWebPart extends BaseClientSideWebPart<IBigCalWebPartProps> {

  private _isDarkTheme: boolean = false;
  private _sharePointService: SharePointService | undefined;
  private _listValidationResult: IListValidationResult | undefined;
  private _isCreatingList: boolean = false;

  // Color palette options
  private getColorPaletteOptions(): IPropertyPaneDropdownOption[] {
    return [
      { key: 'classic', text: 'Classic (Blue/Yellow/Red)' },
      { key: 'nature', text: 'Nature (Forest Green/Amber/Red)' },
      { key: 'professional', text: 'Professional (Teal/Gold/Red)' },
      { key: 'forest', text: 'Forest (Web Forest Green/Fluorescent Orange/Amaranth Red)' },
      { key: 'emerald', text: 'Emerald (Pakistan Green/Fluorescent Orange/Amaranth Red)' },
      { key: 'disa1', text: 'DISA Standard (Medium Blue/Gold/Shield Red)' },
      { key: 'disa1Deep', text: 'DISA Standard Deep (Medium Blue/Gold/Deep Red)' },
      { key: 'disa2', text: 'DISA Authority (Crest Blue/Gold/Shield Red)' },
      { key: 'disa2Deep', text: 'DISA Authority Deep (Crest Blue/Gold/Deep Red)' },
      { key: 'disa4', text: 'DISA Tactical (Crest Blue/Brown/Deep Red)' }
    ];
  }

  public render(): void {
    const element: React.ReactElement<IBigCalProps> = React.createElement(
      BigCal,
      {
        description: this.properties.description,
        isDarkTheme: this._isDarkTheme,
        hasTeamsContext: !!this.context.sdks.microsoftTeams,
        userDisplayName: this.context.pageContext.user.displayName,
        startInFullscreen: this.properties.startInFullscreen !== false, // Default to true
        isUserAdmin: this._checkUserPermissions(),
        context: this.context,
        colorPalette: this.properties.colorPalette || 'disa2Deep',
        listName: this.properties.listName || 'Events',
        onConfigureProperties: () => {
          this.context.propertyPane.open();
        }
      }
    );

    ReactDom.render(element, this.domElement);
  }

  protected onInit(): Promise<void> {
    // Set default value for startInFullscreen if not already set (ProgramTracker pattern)
    if (this.properties.startInFullscreen === undefined) {
      this.properties.startInFullscreen = true;  // Default to fullscreen
    }

    // Set default color palette if not already set
    if (this.properties.colorPalette === undefined) {
      this.properties.colorPalette = 'disa2Deep';  // Default to DISA Authority Deep
    }

    // Set default list name if not already set
    if (this.properties.listName === undefined) {
      this.properties.listName = 'Events';  // Default to Events list
    }

    // Initialize SharePoint service
    this._sharePointService = new SharePointService(this.context, this.properties.listName);

    return Promise.resolve();
  }

  private _checkUserPermissions(): boolean {
    // Check if user has edit permissions on the page
    // In SharePoint, users who can edit the page can configure web parts
    try {
      return this.context.pageContext.legacyPageContext?.canUserEditExperience ||
             this.context.pageContext.legacyPageContext?.isPageInEditMode ||
             this.displayMode === DisplayMode.Edit;
    } catch (error) {
      // Fallback: if we can't determine permissions, assume no admin rights
      console.warn('Could not determine user permissions:', error);
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

    return await this._sharePointService.validateList(listName);
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
        return '✅ List validated successfully - contains all required fields (Swimlane and Status)';
      } else if (!this._listValidationResult.listExists && this._listValidationResult.canCreate) {
        return '❌ List does not exist - use the "Create List" button below to create it automatically';
      } else if (!this._listValidationResult.listExists) {
        return '❌ List does not exist';
      } else if (this._listValidationResult.missingFields.length > 0) {
        return `⚠️ List exists but missing required fields: ${this._listValidationResult.missingFields.join(', ')}`;
      }
    }
    return 'Name of the SharePoint list containing events (must have Swimlane and Status fields)';
  }

  private _getListNameErrorMessage(): string | undefined {
    if (this._listValidationResult && !this._listValidationResult.isValid) {
      return this._listValidationResult.errorMessage;
    }
    return undefined;
  }

  private _getPropertyPaneFields(): IPropertyPaneField<unknown>[] {
    const fields = [
      PropertyPaneTextField('description', {
        label: strings.DescriptionFieldLabel
      }),
      PropertyPaneToggle('startInFullscreen', {
        label: 'Start in Fullscreen Mode',
        onText: 'Yes',
        offText: 'No'
      }),
      PropertyPaneDropdown('colorPalette', {
        label: 'Color Palette',
        options: this.getColorPaletteOptions(),
        selectedKey: this.properties.colorPalette || 'disa2Deep'
      }),
      PropertyPaneTextField('listName', {
        label: 'SharePoint List Name',
        description: this._getListNameDescription(),
        placeholder: 'Events',
        errorMessage: this._getListNameErrorMessage()
      })
    ];

    // Add create list button if validation shows we can create the list
    if (this._listValidationResult && this._listValidationResult.canCreate && !this._listValidationResult.isValid) {
      fields.push(
        PropertyPaneButton('createList', {
          text: this._isCreatingList ? 'Creating List...' : 'Create List with Required Fields',
          buttonType: PropertyPaneButtonType.Primary,
          onClick: () => {
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            this._createList();
          },
          disabled: this._isCreatingList
        })
      );
    }

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
}
