import * as React from 'react';
import { PrimaryButton, DefaultButton } from '@fluentui/react/lib/Button';
import { DatePicker } from '@fluentui/react/lib/DatePicker';
import { Dialog, DialogType, DialogFooter } from '@fluentui/react/lib/Dialog';
import { Stack } from '@fluentui/react/lib/Stack';
import { Text } from '@fluentui/react/lib/Text';
import { TextField } from '@fluentui/react/lib/TextField';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { Pivot, PivotItem } from '@fluentui/react/lib/Pivot';
import { Icon } from '@fluentui/react/lib/Icon';
import * as XLSX from 'xlsx';
import { ICalendarEvent, SwimlaneType, StatusType } from './ICalendarEvent';
import { Logger } from '../services/LoggingService';
import styles from './ExcelExport.module.scss';

export interface IExcelExportProps {
  events: ICalendarEvent[];
  isOpen: boolean;
  onDismiss: () => void;
  currentDate?: Date;
  onImportEvents?: (events: ICalendarEvent[]) => Promise<void>;
  onImportError?: (error: string) => void;
}

export interface IExcelExportState {
  startDate: Date;
  endDate: Date;
  isExporting: boolean;
  exportMessage: string;
  exportMessageType: MessageBarType;
  fileName: string;
  selectedTab: string;
  isImporting: boolean;
  importMessage: string;
  importMessageType: MessageBarType;
  dragActive: boolean;
  backgroundImportInProgress: boolean;
  isComponentReady: boolean;
}

export class ExcelExport extends React.Component<IExcelExportProps, IExcelExportState> {
  constructor(props: IExcelExportProps) {
    super(props);

    const defaultState = this.getDefaultStateForDate(props.currentDate);
    this.state = defaultState;
  }

  public componentDidMount(): void {
    // Add small delay to ensure all components are ready for slow networks
    setTimeout(() => {
      this.setState({ isComponentReady: true });
    }, 100);
  }

  public componentDidUpdate(prevProps: IExcelExportProps): void {
    // If the modal was closed and is now opening, or if currentDate changed, update default dates
    if (this.props.isOpen && !prevProps.isOpen) {
      // Modal just opened - reset to default dates for current month
      const defaultState = this.getDefaultStateForDate(this.props.currentDate);
      this.setState({
        startDate: defaultState.startDate,
        endDate: defaultState.endDate,
        fileName: defaultState.fileName,
        exportMessage: '',
        importMessage: '',
        selectedTab: 'export',
        isComponentReady: false
      });

      // Re-enable component after brief delay for slow networks
      setTimeout(() => {
        this.setState({ isComponentReady: true });
      }, 100);
    }
  }

  private getDefaultStateForDate = (currentDate?: Date): IExcelExportState => {
    // Use current calendar date or today as reference
    const referenceDate = currentDate || new Date();

    // Get first day of the month
    const firstDayOfMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);

    // Get last day of the month
    const lastDayOfMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0);

    // Create default filename with month/year
    const monthYear = referenceDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    const defaultFileName = `Calendar_Agenda_${monthYear.replace(' ', '_')}`;

    return {
      startDate: firstDayOfMonth,
      endDate: lastDayOfMonth,
      isExporting: false,
      exportMessage: '',
      exportMessageType: MessageBarType.info,
      fileName: defaultFileName,
      selectedTab: 'export',
      isImporting: false,
      importMessage: '',
      importMessageType: MessageBarType.info,
      dragActive: false,
      backgroundImportInProgress: false,
      isComponentReady: false
    };
  };

  private onStartDateChange = (date: Date | null | undefined): void => {
    if (date) {
      this.setState({ startDate: date });
    }
  };

  private onEndDateChange = (date: Date | null | undefined): void => {
    if (date) {
      this.setState({ endDate: date });
    }
  };

  private onFileNameChange = (event: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string): void => {
    if (newValue !== undefined) {
      this.setState({ fileName: newValue });
    }
  };

  private onTabChange = (item?: PivotItem): void => {
    if (item && item.props.itemKey) {
      this.setState({
        selectedTab: item.props.itemKey,
        exportMessage: '',
        importMessage: ''
      });
    }
  };

  private onDragEnter = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    e.stopPropagation();
    this.setState({ dragActive: true });
  };

  private onDragLeave = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    e.stopPropagation();
    this.setState({ dragActive: false });
  };

  private onDragOver = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    e.stopPropagation();
  };

  private onDrop = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    e.stopPropagation();
    this.setState({ dragActive: false });

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      this.handleFileImport(files[0]).catch(console.error);
    }
  };



  private handleFileImport = async (file: File): Promise<void> => {
    if (file.name.toLowerCase().indexOf('.xlsx') === -1 && file.name.toLowerCase().indexOf('.xls') === -1) {
      this.setState({
        importMessage: 'Please select an Excel file (.xlsx or .xls)',
        importMessageType: MessageBarType.error
      });
      return;
    }

    this.setState({
      isImporting: true,
      importMessage: 'Processing Excel file...',
      importMessageType: MessageBarType.info
    });

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });

      // Look for the "Data" worksheet
      if (workbook.SheetNames.indexOf('Data') === -1) {
        this.setState({
          importMessage: 'Excel file must contain a "Data" tab with calendar events',
          importMessageType: MessageBarType.error,
          isImporting: false
        });
        return;
      }

      const dataSheet = workbook.Sheets.Data;
      const rawData = XLSX.utils.sheet_to_json(dataSheet, { header: 1 }) as string[][];

      if (rawData.length < 2) {
        this.setState({
          importMessage: 'Data tab appears to be empty',
          importMessageType: MessageBarType.error,
          isImporting: false
        });
        return;
      }

      // Parse the data and convert to events
      const events = this.parseImportedData(rawData);

      if (events.length === 0) {
        this.setState({
          importMessage: 'No valid events found in the Data tab',
          importMessageType: MessageBarType.warning,
          isImporting: false
        });
        return;
      }

      // Show immediate success message and allow user to close modal
      this.setState({
        importMessage: `${events.length} events added to calendar. Saving to SharePoint in background...`,
        importMessageType: MessageBarType.success,
        isImporting: false,
        backgroundImportInProgress: true
      });

      // Start background save (non-blocking)
      if (this.props.onImportEvents) {
        this.props.onImportEvents(events).then(() => {
          // Silent success - no notification needed
          this.setState({ backgroundImportInProgress: false });
          Logger.info(`Successfully saved ${events.length} events to SharePoint`);
        }).catch((error) => {
          // Only notify on error
          this.setState({ backgroundImportInProgress: false });
          const errorMessage = `Failed to save events to SharePoint: ${error.message || 'Unknown error'}`;
          Logger.error('Background import failed', error);

          // Notify parent of error if callback provided
          if (this.props.onImportError) {
            this.props.onImportError(errorMessage);
          }
        });
      }

    } catch (error) {
      Logger.error('Error importing Excel file', error);
      this.setState({
        importMessage: 'Error reading Excel file. Please ensure it\'s a valid Excel file.',
        importMessageType: MessageBarType.error,
        isImporting: false
      });
    }
  };

  private parseImportedData = (rawData: string[][]): ICalendarEvent[] => {
    const events: ICalendarEvent[] = [];
    const headers = rawData[0];

    // Find column indices
    let titleIndex = -1;
    let descriptionIndex = -1;
    let startIndex = -1;
    let endIndex = -1;
    let swimlaneIndex = -1;
    let statusIndex = -1;
    let privateIndex = -1;

    for (let i = 0; i < headers.length; i++) {
      const header = headers[i];
      if (header && header.toLowerCase().indexOf('title') !== -1) titleIndex = i;
      if (header && header.toLowerCase().indexOf('description') !== -1) descriptionIndex = i;
      if (header && header.toLowerCase().indexOf('start') !== -1) startIndex = i;
      if (header && header.toLowerCase().indexOf('end') !== -1) endIndex = i;
      // Support both "Swimlane" and "Event Category" column names
      if (header && (header.toLowerCase().indexOf('swimlane') !== -1 ||
                    header.toLowerCase().indexOf('event category') !== -1 ||
                    header.toLowerCase().indexOf('category') !== -1)) swimlaneIndex = i;
      if (header && header.toLowerCase().indexOf('status') !== -1) statusIndex = i;
      if (header && header.toLowerCase().indexOf('private') !== -1) privateIndex = i;
    }

    // Debug logging for header detection
    Logger.debug('Excel Import header detection', {
      headers: headers,
      headerCount: headers.length,
      titleIndex,
      descriptionIndex,
      startIndex,
      endIndex,
      swimlaneIndex,
      statusIndex,
      privateIndex,
      totalRows: rawData.length
    });

    if (titleIndex === -1 || startIndex === -1) {
      console.warn('Missing required columns. Title index:', titleIndex, 'Start index:', startIndex);
      return events; // Need at least title and start date
    }

    // Process each row (skip header)
    for (let i = 1; i < rawData.length; i++) {
      const row = rawData[i];
      if (!row || row.length === 0 || !row[titleIndex]) continue;

      try {
        const title = row[titleIndex]?.toString().trim();
        if (!title) continue;

        // Parse start date
        const startRaw = row[startIndex]?.toString();
        const startDate = this.parseExcelDate(startRaw);

        if (!startDate) {
          Logger.debug(`Row ${i}: Failed to parse start date "${startRaw}"`);
          continue;
        }

        // Parse end date (use start date if not provided)
        const endRaw = endIndex !== -1 && row[endIndex] ? row[endIndex]?.toString() : null;
        const endDate = endRaw ? this.parseExcelDate(endRaw) : startDate;

        // Parse status
        const statusRaw = statusIndex !== -1 && row[statusIndex] ? row[statusIndex].toString().trim() : '';
        const status = statusRaw ? statusRaw as StatusType : undefined;

        // Parse private field
        const privateRaw = privateIndex !== -1 && row[privateIndex] ? row[privateIndex].toString().trim().toLowerCase() : '';
        const isPrivate = privateRaw === 'true' || privateRaw === '1' || privateRaw === 'yes';

        // Create event
        const event: ICalendarEvent = {
          id: Date.now() + i, // Generate a numeric ID
          title: title,
          description: (descriptionIndex !== -1 && row[descriptionIndex] ?
            row[descriptionIndex].toString().trim() : ''),
          start: startDate,
          end: endDate || startDate,
          swimlane: (swimlaneIndex !== -1 && row[swimlaneIndex] ?
            row[swimlaneIndex].toString().trim() : 'FYSA') as SwimlaneType,
          status: status,
          isPrivate: isPrivate
        };

        events.push(event);
      } catch (error) {
        Logger.debug(`Error parsing row ${i}`, error);
        // Continue with next row
      }
    }

    return events;
  };

  private parseExcelDate = (dateStr: string): Date | null => {
    if (!dateStr) return null;

    try {
      const cleanStr = dateStr.trim();

      // Handle Excel serial date numbers (e.g., 45911.395833333336)
      if (cleanStr.match(/^\d+(\.\d+)?$/) && !cleanStr.match(/^\d{4}$/)) {
        const serialNumber = parseFloat(cleanStr);
        if (!isNaN(serialNumber) && serialNumber > 1) {
          // Excel serial date: January 1, 1900 = 1
          // JavaScript Date: January 1, 1970 = 0
          // Excel has a leap year bug for 1900, so we need to account for that
          const excelEpoch = new Date(1899, 11, 30); // December 30, 1899 (Excel's day 0)
          const millisecondsPerDay = 24 * 60 * 60 * 1000;
          const jsDate = new Date(excelEpoch.getTime() + (serialNumber * millisecondsPerDay));

          if (!isNaN(jsDate.getTime())) {
            // If it's a whole number (no decimal), it's date-only, set to midnight
            if (serialNumber % 1 === 0) {
              jsDate.setHours(0, 0, 0, 0);
            }
            return jsDate;
          }
        }
      }

      // First try to parse as ISO 8601 (legacy format support)
      if (cleanStr.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
        const isoDate = new Date(cleanStr);
        if (!isNaN(isoDate.getTime())) {
          return isoDate;
        }
      }

      // Handle MM/DD/YYYY HH:MM:SS AM/PM format (with seconds)
      if (cleanStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2}:\d{2}\s+(AM|PM)$/i)) {
        const parsedDate = new Date(cleanStr);
        if (!isNaN(parsedDate.getTime())) {
          return parsedDate;
        }
      }

      // Handle MM/DD/YYYY HH:MM AM/PM format (without seconds)
      if (cleanStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2}\s+(AM|PM)$/i)) {
        const parsedDate = new Date(cleanStr);
        if (!isNaN(parsedDate.getTime())) {
          return parsedDate;
        }
      }

      // Handle MM/DD/YYYY format (date only) - set to midnight like SharePoint
      if (cleanStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
        const parsedDate = new Date(cleanStr);
        if (!isNaN(parsedDate.getTime())) {
          // Ensure date-only entries are set to midnight (like SharePoint default)
          parsedDate.setHours(0, 0, 0, 0);
          return parsedDate;
        }
      }

      // Handle YYYY-MM-DD format (ISO date only) - set to midnight
      if (cleanStr.match(/^\d{4}-\d{1,2}-\d{1,2}$/)) {
        const parsedDate = new Date(cleanStr);
        if (!isNaN(parsedDate.getTime())) {
          parsedDate.setHours(0, 0, 0, 0);
          return parsedDate;
        }
      }

      // Handle DD/MM/YYYY format (European date only) - set to midnight
      if (cleanStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/) && !cleanStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}\s/)) {
        // Try European format DD/MM/YYYY if US format MM/DD/YYYY failed above
        const parts = cleanStr.split('/');
        if (parts.length === 3) {
          const day = parseInt(parts[0]);
          const month = parseInt(parts[1]);
          const year = parseInt(parts[2]);

          // If day > 12, it's likely DD/MM/YYYY format
          if (day > 12 && month <= 12) {
            const europeanDate = new Date(year, month - 1, day, 0, 0, 0, 0);
            if (!isNaN(europeanDate.getTime())) {
              return europeanDate;
            }
          }
        }
      }

      // Handle legacy relative date formats (for backward compatibility)
      if (cleanStr.toLowerCase().indexOf('today') !== -1) {
        const today = new Date();
        if (cleanStr.indexOf('at') !== -1) {
          const timePart = cleanStr.split('at')[1]?.trim();
          if (timePart) {
            const timeDate = new Date(`${today.toDateString()} ${timePart}`);
            return isNaN(timeDate.getTime()) ? today : timeDate;
          }
        }
        return today;
      }

      if (cleanStr.toLowerCase().indexOf('tomorrow') !== -1) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        if (cleanStr.indexOf('at') !== -1) {
          const timePart = cleanStr.split('at')[1]?.trim();
          if (timePart) {
            const timeDate = new Date(`${tomorrow.toDateString()} ${timePart}`);
            return isNaN(timeDate.getTime()) ? tomorrow : timeDate;
          }
        }
        return tomorrow;
      }

      if (cleanStr.indexOf('days from now') !== -1) {
        const daysMatch = cleanStr.match(/(\d+)\s+days from now/);
        if (daysMatch) {
          const days = parseInt(daysMatch[1]);
          const futureDate = new Date();
          futureDate.setDate(futureDate.getDate() + days);
          return futureDate;
        }
      }

      // Handle additional common formats
      // YYYY-MM-DD HH:MM:SS format
      if (cleanStr.match(/^\d{4}-\d{1,2}-\d{1,2}\s+\d{1,2}:\d{2}:\d{2}$/)) {
        const parsedDate = new Date(cleanStr);
        if (!isNaN(parsedDate.getTime())) {
          return parsedDate;
        }
      }

      // Handle DD/MM/YYYY formats (European style)
      if (cleanStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}/)) {
        // Try parsing as-is first (US format MM/DD/YYYY)
        let parsedDate = new Date(cleanStr);
        if (!isNaN(parsedDate.getTime())) {
          return parsedDate;
        }

        // If that fails, try European format DD/MM/YYYY
        const parts = cleanStr.split(/[\s/]/);
        if (parts.length >= 3) {
          const day = parts[0];
          const month = parts[1];
          const year = parts[2];
          const timePart = parts.slice(3).join(' ');
          const reformatted = `${month}/${day}/${year}${timePart ? ' ' + timePart : ''}`;
          parsedDate = new Date(reformatted);
          if (!isNaN(parsedDate.getTime())) {
            return parsedDate;
          }
        }
      }

      // Handle common text-based date formats
      // "January 15, 2025" or "Jan 15, 2025"
      if (cleanStr.match(/^[A-Za-z]{3,9}\s+\d{1,2},\s+\d{4}$/)) {
        const parsedDate = new Date(cleanStr);
        if (!isNaN(parsedDate.getTime())) {
          parsedDate.setHours(0, 0, 0, 0); // Date only, set to midnight
          return parsedDate;
        }
      }

      // Handle "15-Jan-2025" or "15-January-2025" format
      if (cleanStr.match(/^\d{1,2}-[A-Za-z]{3,9}-\d{4}$/)) {
        const parsedDate = new Date(cleanStr);
        if (!isNaN(parsedDate.getTime())) {
          parsedDate.setHours(0, 0, 0, 0);
          return parsedDate;
        }
      }

      // Handle timestamps with different separators: "2025-01-15 14:30:00"
      if (cleanStr.match(/^\d{4}-\d{1,2}-\d{1,2}\s+\d{1,2}:\d{2}(:\d{2})?$/)) {
        const parsedDate = new Date(cleanStr);
        if (!isNaN(parsedDate.getTime())) {
          return parsedDate;
        }
      }

      // Handle 24-hour time format: "15/01/2025 14:30"
      if (cleanStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2}$/)) {
        const parsedDate = new Date(cleanStr);
        if (!isNaN(parsedDate.getTime())) {
          return parsedDate;
        }
      }

      // Handle Unix timestamps (seconds since epoch)
      if (cleanStr.match(/^\d{10}$/) || cleanStr.match(/^\d{13}$/)) {
        const timestamp = parseInt(cleanStr);
        // If it's 10 digits, it's seconds; if 13 digits, it's milliseconds
        const jsTimestamp = cleanStr.length === 10 ? timestamp * 1000 : timestamp;
        const parsedDate = new Date(jsTimestamp);
        if (!isNaN(parsedDate.getTime()) && parsedDate.getFullYear() > 1990 && parsedDate.getFullYear() < 2100) {
          return parsedDate;
        }
      }

      // Fallback: try standard Date parsing
      const parsedDate = new Date(cleanStr);
      if (!isNaN(parsedDate.getTime())) {
        // If the original string had no time component, set to midnight
        if (!cleanStr.match(/\d{1,2}:\d{2}/) && !cleanStr.match(/AM|PM/i)) {
          parsedDate.setHours(0, 0, 0, 0);
        }
        return parsedDate;
      }

      return null;

    } catch (error) {
      Logger.debug('Error parsing date', { dateStr, error });
      return null;
    }
  };

  private exportToExcel = async (): Promise<void> => {
    this.setState({ isExporting: true, exportMessage: '', exportMessageType: MessageBarType.info });

    try {
      // Filter events by date range
      const filteredEvents = this.props.events.filter(event => {
        const eventDate = new Date(event.start.getTime());
        const startDate = new Date(this.state.startDate.getTime());
        const endDate = new Date(this.state.endDate.getTime());
        
        // Set time to start of day for comparison
        eventDate.setHours(0, 0, 0, 0);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        
        return eventDate >= startDate && eventDate <= endDate;
      });

      if (filteredEvents.length === 0) {
        this.setState({
          exportMessage: 'No events found in the selected date range.',
          exportMessageType: MessageBarType.warning,
          isExporting: false
        });
        return;
      }

      // Sort events by date and time
      const sortedEvents = filteredEvents.sort((a, b) => {
        const dateCompare = a.start.getTime() - b.start.getTime();
        if (dateCompare !== 0) return dateCompare;
        return a.start.getTime() - b.start.getTime();
      });

      // Create agenda-style data
      const agendaData = this.createAgendaData(sortedEvents);

      // Create raw data for SharePoint list structure
      const rawData = this.createRawData(sortedEvents);

      // Create workbook and worksheets
      const workbook = XLSX.utils.book_new();

      // Create Agenda worksheet
      const agendaWorksheet = XLSX.utils.aoa_to_sheet(agendaData);
      agendaWorksheet['!cols'] = [
        { width: 15 }, // Date column
        { width: 20 }, // Time column
        { width: 50 }  // Event column
      ];
      XLSX.utils.book_append_sheet(workbook, agendaWorksheet, 'Agenda');

      // Create Data worksheet
      const dataWorksheet = XLSX.utils.aoa_to_sheet(rawData);
      dataWorksheet['!cols'] = [
        { width: 30 }, // Title column
        { width: 40 }, // Description column
        { width: 20 }, // Start column
        { width: 20 }, // End column
        { width: 15 }, // Event Category column
        { width: 15 }, // Status column
        { width: 10 }  // Private column
      ];
      XLSX.utils.book_append_sheet(workbook, dataWorksheet, 'Data');

      // Generate filename - ensure it has .xlsx extension
      let filename = this.state.fileName.trim();
      if (filename.toLowerCase().indexOf('.xlsx') !== filename.length - 5) {
        filename += '.xlsx';
      }

      // Save file
      XLSX.writeFile(workbook, filename);

      this.setState({
        exportMessage: `Successfully exported ${filteredEvents.length} events to ${filename} with Agenda and Data tabs. File saved to your Downloads folder.`,
        exportMessageType: MessageBarType.success,
        isExporting: false
      });

    } catch (error) {
      Logger.error('Export error', error);
      this.setState({
        exportMessage: 'An error occurred while exporting. Please try again.',
        exportMessageType: MessageBarType.error,
        isExporting: false
      });
    }
  };

  private createAgendaData = (events: ICalendarEvent[]): string[][] => {
    const data: string[][] = [];
    
    // Add header row
    data.push(['Date', 'Time', 'Event']);
    
    let currentDate = '';
    
    events.forEach(event => {
      // Use consistent MM/DD/YYYY format for agenda view
      const eventDate = event.start.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
      });
      
      // Format time
      let timeStr = '';
      if (this.isAllDayEvent(event)) {
        timeStr = '« all day »';
      } else {
        const startTime = event.start.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        });
        
        if (event.end && !this.isSameDay(event.start, event.end)) {
          // Multi-day event
          const endTime = event.end.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
          });
          timeStr = `${startTime} – ${endTime}`;
        } else if (event.end) {
          // Same day event with end time
          const endTime = event.end.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
          });
          timeStr = `${startTime} – ${endTime}`;
        } else {
          // Event with only start time
          timeStr = startTime;
        }
      }
      
      // Only show date if it's different from the previous event
      const dateToShow = currentDate === eventDate ? '' : eventDate;
      if (currentDate !== eventDate) {
        currentDate = eventDate;
      }
      
      // Add special indicator for holiday events
      const eventTitle = (event as ICalendarEvent & { isHoliday?: boolean }).isHoliday ? `🏛️ ${event.title}` : event.title;
      data.push([dateToShow, timeStr, eventTitle]);
    });
    
    return data;
  };

  private createRawData = (events: ICalendarEvent[]): string[][] => {
    const data: string[][] = [];

    // Add header row matching SharePoint list structure
    data.push(['Title', 'Description', 'Start', 'End', 'Event Category', 'Status', 'Private']);

    events.forEach(event => {
      // Use MM/DD/YYYY HH:MM AM/PM format for better readability while maintaining precision
      const formatDateTime = (date: Date): string => {
        if (this.isAllDayEvent(event)) {
          // For all-day events, just show the date
          return date.toLocaleDateString('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric'
          });
        } else {
          // For timed events, show date and time
          const dateStr = date.toLocaleDateString('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric'
          });
          const timeStr = date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          });
          return `${dateStr} ${timeStr}`;
        }
      };

      const startFormatted = formatDateTime(event.start);
      const endFormatted = event.end ? formatDateTime(event.end) : startFormatted;

      data.push([
        event.title,
        event.description || '',
        startFormatted,
        endFormatted,
        event.swimlane || '',
        event.status || '',
        event.isPrivate ? 'TRUE' : 'FALSE'
      ]);
    });

    return data;
  };

  private isAllDayEvent = (event: ICalendarEvent): boolean => {
    // Check if event spans entire day(s)
    const start = new Date(event.start.getTime());
    const end = event.end ? new Date(event.end.getTime()) : new Date(event.start.getTime());
    
    return start.getHours() === 0 && start.getMinutes() === 0 && 
           end.getHours() === 23 && end.getMinutes() === 59;
  };

  private isSameDay = (date1: Date, date2: Date): boolean => {
    return date1.toDateString() === date2.toDateString();
  };

  public render(): React.ReactElement<IExcelExportProps> {
    const dialogContentProps = {
      type: DialogType.normal,
      title: 'Calendar Data Management',
      subText: 'Export calendar data or import events from another BigCal instance.'
    };

    return (
      <Dialog
        hidden={!this.props.isOpen}
        onDismiss={this.props.onDismiss}
        dialogContentProps={dialogContentProps}
        modalProps={{
          isBlocking: false,
          isDarkOverlay: true
        }}
        minWidth={600}
        maxWidth={700}
      >
        <div className={styles.exportDialog}>
          <Pivot
            selectedKey={this.state.selectedTab}
            onLinkClick={this.onTabChange}
          >
            <PivotItem headerText="Export" itemKey="export" itemIcon="Download">
              <Stack tokens={{ childrenGap: 15 }} styles={{ root: { paddingTop: 20 } }}>
                {this.state.exportMessage && (
                  <MessageBar messageBarType={this.state.exportMessageType}>
                    {this.state.exportMessage}
                  </MessageBar>
                )}

                <Stack horizontal tokens={{ childrenGap: 20 }}>
                  <Stack.Item grow>
                    <Text variant="medium" block>Start Date:</Text>
                    <DatePicker
                      value={this.state.startDate}
                      onSelectDate={this.onStartDateChange}
                      placeholder="Select start date"
                      ariaLabel="Select start date"
                    />
                  </Stack.Item>

                  <Stack.Item grow>
                    <Text variant="medium" block>End Date:</Text>
                    <DatePicker
                      value={this.state.endDate}
                      onSelectDate={this.onEndDateChange}
                      placeholder="Select end date"
                      ariaLabel="Select end date"
                    />
                  </Stack.Item>
                </Stack>

                <Stack>
                  <Text variant="medium" block>File Name:</Text>
                  <TextField
                    value={this.state.fileName}
                    onChange={this.onFileNameChange}
                    placeholder="Enter filename (without .xlsx extension)"
                    ariaLabel="Enter filename"
                    suffix=".xlsx"
                  />
                </Stack>

                <Text variant="small" styles={{ root: { color: '#666' } }}>
                  The exported Excel file will contain two tabs: &quot;Agenda&quot; with formatted dates and times for readability,
                  and &quot;Data&quot; with MM/DD/YYYY HH:MM AM/PM format for reliable data migration.
                  The file will be saved to your browser&apos;s default Downloads folder.
                </Text>
              </Stack>
            </PivotItem>

            <PivotItem headerText="Import" itemKey="import" itemIcon="Upload">
              <Stack tokens={{ childrenGap: 15 }} styles={{ root: { paddingTop: 20 } }}>
                {this.state.importMessage && (
                  <MessageBar messageBarType={this.state.importMessageType}>
                    {this.state.importMessage}
                  </MessageBar>
                )}

                <div
                  className={`${styles.dropZone} ${this.state.dragActive ? styles.dragActive : ''} ${this.state.isImporting ? styles.importing : ''}`}
                  onDragEnter={this.onDragEnter}
                  onDragLeave={this.onDragLeave}
                  onDragOver={this.onDragOver}
                  onDrop={this.onDrop}
                >
                  {this.state.isImporting ? (
                    <>
                      <Icon iconName="Sync" styles={{ root: { fontSize: 48, color: '#0078d4', marginBottom: 16, animation: 'spin 1s linear infinite' } }} />
                      <Text variant="large" block styles={{ root: { marginBottom: 8 } }}>
                        Processing Excel file...
                      </Text>
                      <Text variant="medium" block styles={{ root: { color: '#666' } }}>
                        Please wait while we import your events
                      </Text>
                    </>
                  ) : (
                    <>
                      <Icon iconName="CloudUpload" styles={{ root: { fontSize: 48, color: this.state.dragActive ? '#005a9e' : '#0078d4', marginBottom: 16 } }} />
                      <Text variant="large" block styles={{ root: { marginBottom: 8, fontWeight: 600 } }}>
                        {this.state.dragActive ? 'Drop your Excel file now!' : 'Drag & Drop Excel File'}
                      </Text>
                      <Text variant="medium" block styles={{ root: { color: '#666', marginBottom: 16 } }}>
                        or click to browse
                      </Text>
                      <PrimaryButton
                        text="Browse Files"
                        disabled={this.state.isImporting}
                        onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = '.xlsx,.xls';
                          input.onchange = (e: Event) => {
                            const target = e.target as HTMLInputElement;
                            if (target.files && target.files.length > 0) {
                              this.handleFileImport(target.files[0]).catch(console.error);
                            }
                          };
                          input.click();
                        }}
                      />
                    </>
                  )}
                </div>

                <Stack tokens={{ childrenGap: 10 }}>
                  <Text variant="small" styles={{ root: { color: '#666', lineHeight: '1.4' } }}>
                    <strong>Supported formats:</strong> Excel files (.xlsx, .xls) exported from BigCal
                  </Text>
                  <Text variant="small" styles={{ root: { color: '#666', lineHeight: '1.4' } }}>
                    <strong>Requirements:</strong> File must contain a &quot;Data&quot; tab with Title, Start, End, Swimlane, and Status columns (MM/DD/YYYY HH:MM AM/PM format)
                  </Text>
                  <Text variant="small" styles={{ root: { color: '#666', lineHeight: '1.4' } }}>
                    <strong>Result:</strong> Events will be added to your current calendar (existing events are preserved)
                  </Text>
                </Stack>
              </Stack>
            </PivotItem>
          </Pivot>
        </div>
        
        <DialogFooter>
          {this.state.selectedTab === 'export' && (
            <PrimaryButton
              onClick={this.exportToExcel}
              text="Export to Excel"
              disabled={this.state.isExporting}
            />
          )}
          <DefaultButton
            onClick={this.props.onDismiss}
            text="Close"
            disabled={this.state.isExporting || this.state.isImporting}
          />
        </DialogFooter>
      </Dialog>
    );
  }
}
