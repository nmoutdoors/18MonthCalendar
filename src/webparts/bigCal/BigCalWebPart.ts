import * as React from 'react';
import * as ReactDom from 'react-dom';
import { Version } from '@microsoft/sp-core-library';
import {
  type IPropertyPaneConfiguration,
  PropertyPaneTextField,
  PropertyPaneToggle
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
}

export default class BigCalWebPart extends BaseClientSideWebPart<IBigCalWebPartProps> {

  private _isDarkTheme: boolean = false;

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
        onConfigureProperties: () => {
          this.context.propertyPane.open();
        }
      }
    );

    ReactDom.render(element, this.domElement);
  }

  protected onInit(): Promise<void> {
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
                })
              ]
            }
          ]
        }
      ]
    };
  }
}
