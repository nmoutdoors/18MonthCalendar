import * as React from 'react';
import * as ReactDom from 'react-dom';
import { Version } from '@microsoft/sp-core-library';
import {
  type IPropertyPaneConfiguration,
  PropertyPaneTextField,
  PropertyPaneToggle,
  PropertyPaneDropdown,
  IPropertyPaneDropdownOption
} from '@microsoft/sp-property-pane';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';
import { IReadonlyTheme } from '@microsoft/sp-component-base';
import { DisplayMode } from '@microsoft/sp-core-library';

import * as strings from 'BigCalWebPartStrings';
import BigCal from './components/BigCal';
import { IBigCalProps } from './components/IBigCalProps';

export interface IBigCalWebPartProps {
  description: string;
  startInFullscreen: boolean;
  colorPalette: string;
}

export default class BigCalWebPart extends BaseClientSideWebPart<IBigCalWebPartProps> {

  private _isDarkTheme: boolean = false;

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
              groupFields: [
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
                })
              ]
            }
          ]
        }
      ]
    };
  }
}
