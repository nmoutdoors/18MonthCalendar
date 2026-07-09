import * as React from 'react';
import { WebPartContext } from '@microsoft/sp-webpart-base';
import { View } from 'react-big-calendar';
import { ICalendarEvent } from './ICalendarEvent';
import { ExcelExport } from './ExcelExport';
import { PrintDialog } from './PrintDialog';
import { SharePointService } from '../services/SharePointService';
import { HybridEventsService } from '../services/HybridEventsService';
import { Logger } from '../services/LoggingService';
import { SPECIFIC_COLOR_MAPPINGS, IColorMapping } from '../interfaces/IColorMapping';
import { withTimeout, NETWORK_TIMEOUTS } from '../utils/BigCalUtilities';

export interface IExportManagerProps {
  context: WebPartContext;
  events: ICalendarEvent[];
  filteredEvents: ICalendarEvent[];
  currentView: View;
  currentDate: Date;
  isExcelExportOpen: boolean;
  isPrintDialogOpen: boolean;
  onDismissExcelExport: () => void;
  onDismissPrintDialog: () => void;
  listName: string;
  onEventsImported?: () => void;
  onAddEventsToUI?: (events: ICalendarEvent[]) => void;
  onImportError?: (error: string) => void;
  dynamicColorMappings?: Map<string, string>;
  colorPaletteMappings?: IColorMapping[];
}

export interface IExportManagerState {
  isExporting: boolean;
  isPrinting: boolean;
  exportError?: string;
  printError?: string;
}

/**
 * Manager component for Export and Print functionality
 * Handles Excel export and Print operations
 */
export class ExportManager extends React.Component<IExportManagerProps, IExportManagerState> {
  private sharePointService: SharePointService;
  private hybridEventsService: HybridEventsService;

  constructor(props: IExportManagerProps) {
    super(props);

    this.state = {
      isExporting: false,
      isPrinting: false,
      exportError: undefined,
      printError: undefined
    };

    this.sharePointService = new SharePointService(props.context, props.listName);
    this.hybridEventsService = new HybridEventsService(props.context, props.listName);
  }

  /**
   * Handle importing events from Excel file
   */
  private handleImportEvents = async (importedEvents: ICalendarEvent[]): Promise<void> => {
    try {
      Logger.info(`Starting import of ${importedEvents.length} events`);

      // IMMEDIATE UI UPDATE: Add events to UI immediately for fast user feedback
      if (this.props.onAddEventsToUI) {
        this.props.onAddEventsToUI(importedEvents);
      }

      // Process events individually to handle private events correctly
      const creationPromises = importedEvents.map(async (event) => {
        if (event.isPrivate) {
          // Use HybridEventsService for private events
          return await this.hybridEventsService.createEvent(
            event.title,
            event.start,
            event.end,
            event.swimlane || 'FYSA',
            event.status || '',
            event.imo || '',
            event.opr || '',
            event.description || '',
            event.notes || '',
            true, // isPrivate
            event.isBigRock || false
          );
        } else {
          // Use SharePointService for regular events
          return await this.sharePointService.createEvent(
            event.title,
            event.start,
            event.end,
            event.swimlane || 'FYSA',
            event.status || '',
            event.imo || '',
            event.opr || '',
            event.description || '',
            event.notes || '',
            false, // isPrivate
            undefined,
            event.isBigRock || false
          );
        }
      });

      // Execute all creations in parallel with timeout protection
      const importPromise = Promise.all(creationPromises);
      await withTimeout(importPromise, NETWORK_TIMEOUTS.VERY_SLOW, `Import ${importedEvents.length} events to SharePoint`);

      Logger.info(`Successfully imported ${importedEvents.length} events to SharePoint`);

      // Notify parent component to refresh events from SharePoint (to get proper IDs)
      if (this.props.onEventsImported) {
        this.props.onEventsImported();
      }

    } catch (error) {
      Logger.error('Error importing events to SharePoint', error);
      throw error; // Let ExcelExport component handle the error display
    }
  };

  /**
   * Get export statistics for display
   */
  public getExportStats = (): { totalEvents: number; filteredEvents: number; dateRange: string } => {
    const { events, filteredEvents, currentDate } = this.props;
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    
    return {
      totalEvents: events.length,
      filteredEvents: filteredEvents.length,
      dateRange: `${startOfMonth.toLocaleDateString()} - ${endOfMonth.toLocaleDateString()}`
    };
  };

  private eventStyleGetter = (event: ICalendarEvent): { style: React.CSSProperties } => {
    // Holiday events get special styling
    if (event.isHoliday) {
      return {
        style: {
          backgroundColor: '#ff9800',
          color: 'white',
          border: 'none'
        }
      };
    }

    // Private events always get grey styling regardless of status
    if (event.isPrivate) {
      return {
        style: {
          backgroundColor: '#8a8886', // Neutral grey color
          color: 'white',
          border: 'none'
        }
      };
    }

    // Use Color Palette Studio system for all events
    const backgroundColor = this.getEventColorFromMapping(event.swimlane || 'FYSA', event.status || 'Confirmed');
    const textColor = this.getEventTextColorFromMapping(event.swimlane || 'FYSA', event.status || 'Confirmed');

    return {
      style: {
        backgroundColor,
        color: textColor,
        border: 'none'
      }
    };
  };

  private getEventColorFromMapping = (swimlane: string, status: string): string => {
    // New color strategy: Confirmed and blank/null use swimlane color, Tentative uses its own color
    if (status === 'Tentative') {
      return this.props.dynamicColorMappings?.get('Tentative') ||
             SPECIFIC_COLOR_MAPPINGS.Tentative ||
             '#ffc107'; // Yellow fallback for Tentative
    }

    // For Confirmed and blank/null status, use swimlane color
    return this.props.dynamicColorMappings?.get(swimlane) ||
           SPECIFIC_COLOR_MAPPINGS[swimlane] ||
           '#6c757d'; // Gray fallback
  };

  private getEventTextColorFromMapping = (swimlane: string, status: string): string => {
    // Check if we should use dark text for this event
    const optionValue = status === 'Tentative' ? 'Tentative' : swimlane;

    // Find the color mapping to check useDarkText preference
    if (this.props.colorPaletteMappings) {
      for (let i = 0; i < this.props.colorPaletteMappings.length; i++) {
        const mapping = this.props.colorPaletteMappings[i];
        if (mapping.optionValue === optionValue && mapping.isActive) {
          return mapping.useDarkText ? '#000000' : '#ffffff';
        }
      }
    }

    // Default to white text
    return '#ffffff';
  };

  public render(): React.ReactElement {
    const {
      isExcelExportOpen,
      isPrintDialogOpen,
      onDismissExcelExport,
      onDismissPrintDialog,
      events,
      currentDate,
      currentView
    } = this.props;

    return (
      <>
        {/* Excel Export Modal */}
        <ExcelExport
          isOpen={isExcelExportOpen}
          onDismiss={onDismissExcelExport}
          events={events}
          currentDate={currentDate}
          onImportEvents={this.handleImportEvents}
          onImportError={this.props.onImportError}
        />

        {/* Print Dialog Modal */}
        <PrintDialog
          isOpen={isPrintDialogOpen}
          onDismiss={onDismissPrintDialog}
          events={events}
          currentDate={currentDate}
          currentView={currentView}
          colorPalette="DISA Standard"
          eventStyleGetter={this.eventStyleGetter}
        />
      </>
    );
  }
}
