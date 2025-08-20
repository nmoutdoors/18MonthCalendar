import * as React from 'react';
import { WebPartContext } from '@microsoft/sp-webpart-base';
import { View } from 'react-big-calendar';
import { ICalendarEvent } from './ICalendarEvent';
import { ExcelExport } from './ExcelExport';
import { PrintDialog } from './PrintDialog';
import { SharePointService } from '../services/SharePointService';
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

  constructor(props: IExportManagerProps) {
    super(props);

    this.state = {
      isExporting: false,
      isPrinting: false,
      exportError: undefined,
      printError: undefined
    };

    this.sharePointService = new SharePointService(props.context, props.listName);
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

      // Convert ICalendarEvent to the format expected by SharePointService
      const eventsToCreate = importedEvents.map(event => ({
        title: event.title,
        start: event.start,
        end: event.end,
        swimlane: event.swimlane || 'FYSA',
        status: event.status, // Don't apply default - let SharePoint handle it
        description: event.description || '',
        isPrivate: event.isPrivate || false,
        privateEventId: event.privateEventId
      }));

      // Use batch creation for better performance (background operation)
      await this.sharePointService.createEventsBatch(eventsToCreate);

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
