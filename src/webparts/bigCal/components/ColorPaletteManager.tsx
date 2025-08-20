import * as React from 'react';
import { WebPartContext } from '@microsoft/sp-webpart-base';
import { ColorMappingService } from '../services/ColorMappingService';
import { IColorMapping, IFieldOption, IColorPaletteConfig } from '../interfaces/IColorMapping';
import { ColorPaletteStudio } from './ColorPaletteStudio';

export interface IColorPaletteManagerProps {
  context: WebPartContext;
  listName: string;
  isOpen: boolean;
  onDismiss: () => void;
  onColorsChanged: () => void; // Callback to refresh calendar when colors change
}

export interface IColorPaletteManagerState {
  discoveredOptions: IFieldOption[];
  colorMappings: IColorMapping[];
  isLoadingColorMappings: boolean;
  colorPaletteConfig?: IColorPaletteConfig;
  error?: string;
}

/**
 * Manager component for Color Palette Studio functionality
 * Handles all color mapping logic and state management
 */
export class ColorPaletteManager extends React.Component<IColorPaletteManagerProps, IColorPaletteManagerState> {
  private colorMappingService: ColorMappingService;

  constructor(props: IColorPaletteManagerProps) {
    super(props);
    
    this.state = {
      discoveredOptions: [],
      colorMappings: [],
      isLoadingColorMappings: false,
      colorPaletteConfig: undefined,
      error: undefined
    };

    this.colorMappingService = new ColorMappingService(props.context);
  }

  public componentDidUpdate(prevProps: IColorPaletteManagerProps): void {
    // Load color mappings when modal opens
    if (!prevProps.isOpen && this.props.isOpen) {
      this.loadColorMappings().catch(error => 
        console.error('Failed to load color mappings:', error)
      );
    }
  }

  /**
   * Load color mappings and discovered options from SharePoint
   */
  private loadColorMappings = async (): Promise<void> => {
    this.setState({ isLoadingColorMappings: true, error: undefined });

    try {
      // First check if BigCalConfig list exists
      const configListExists = await this.colorMappingService.checkConfigListExists();

      if (!configListExists) {
        // BigCalConfig list doesn't exist - provide helpful guidance
        this.setState({
          isLoadingColorMappings: false,
          error: 'BigCalConfig list not found. Please create it using the webpart configuration panel.',
          discoveredOptions: [],
          colorMappings: [],
          colorPaletteConfig: {
            swimlaneColors: new Map(),
            statusColors: new Map(),
            lastUpdated: new Date(),
            version: 1
          }
        });
        return;
      }

      // Discover field options from Events list
      const discoveredOptions = await this.colorMappingService.discoverFieldOptions(this.props.listName);

      // Get existing color mappings (this should now work since list exists)
      const colorMappings = await this.colorMappingService.getColorMappings();

      // Get current color palette config
      const colorPaletteConfig = await this.colorMappingService.getColorPaletteConfig();

      this.setState({
        discoveredOptions,
        colorMappings,
        colorPaletteConfig,
        isLoadingColorMappings: false
      });

    } catch (error) {
      console.error('Error loading color mappings:', error);
      this.setState({
        isLoadingColorMappings: false,
        error: `Failed to load color mappings: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  };

  /**
   * Save color mappings to SharePoint and refresh calendar
   */
  private handleSaveColorMappings = async (mappings: IColorMapping[]): Promise<void> => {
    try {
      await this.colorMappingService.saveBulkColorMappings(mappings);
      
      // Reload color mappings
      await this.loadColorMappings();
      
      // Notify parent to refresh calendar
      this.props.onColorsChanged();
      
    } catch (error) {
      console.error('Error saving color mappings:', error);
      throw error;
    }
  };





  /**
   * Get current color palette configuration for calendar rendering
   */
  public getColorPaletteConfig = async (): Promise<IColorPaletteConfig | undefined> => {
    try {
      return await this.colorMappingService.getColorPaletteConfig();
    } catch (error) {
      console.error('Error getting color palette config:', error);
      return undefined;
    }
  };

  /**
   * Invalidate color mapping cache (useful when external changes occur)
   */
  public invalidateCache = (): void => {
    this.colorMappingService.invalidateCache();
  };

  public render(): React.ReactElement {
    const { isOpen, onDismiss } = this.props;
    const {
      discoveredOptions,
      colorMappings,
      isLoadingColorMappings,
      error
    } = this.state;

    return (
      <ColorPaletteStudio
        isOpen={isOpen}
        onDismiss={onDismiss}
        discoveredOptions={discoveredOptions}
        colorMappings={colorMappings}
        isLoading={isLoadingColorMappings}
        error={error}
        onSaveColorMappings={this.handleSaveColorMappings}
        onColorsChanged={this.props.onColorsChanged}
      />
    );
  }
}
