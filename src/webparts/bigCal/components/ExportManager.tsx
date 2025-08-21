import * as React from 'react';
import { WebPartContext } from '@microsoft/sp-webpart-base';
import { View } from 'react-big-calendar';
import { ICalendarEvent } from './ICalendarEvent';
import { ExcelExport } from './ExcelExport';
import { PrintDialog } from './PrintDialog';
import { SharePointService } from '../services/SharePointService';
import { HybridEventsService } from '../services/HybridEventsService';
import { Logger } from '../services/LoggingService';

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
            event.description || '',
            true // isPrivate
          );
        } else {
          // Use SharePointService for regular events
          return await this.sharePointService.createEvent(
            event.title,
            event.start,
            event.end,
            event.swimlane || 'FYSA',
            event.status || '',
            event.description || '',
            false // isPrivate
          );
        }
      });

      // Execute all creations in parallel
      await Promise.all(creationPromises);

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
          eventStyleGetter={() => ({ style: {} })}
        />
      </>
    );
  }
}
