/* eslint-disable max-lines */
import * as React from 'react';
import { IconButton, PrimaryButton, Stack, DatePicker, ChoiceGroup, IChoiceGroupOption, Toggle } from '@fluentui/react';
import { Calendar, momentLocalizer, View } from 'react-big-calendar';
import * as moment from 'moment';
import html2canvas from 'html2canvas';
import { ICalendarEvent } from './ICalendarEvent';
import { Logger } from '../services/LoggingService';
import styles from './LegendaryPrintPreview.module.scss';
import bigCalStyles from './BigCal.module.scss';

// Setup the localizer for react-big-calendar
const localizer = momentLocalizer(moment);

interface IEventSpanInfo {
  event?: ICalendarEvent;
  colspan?: number;
  skip?: boolean;
}

type EventRowCell = IEventSpanInfo | undefined;

export interface ILegendaryPrintPreviewProps {
  events: ICalendarEvent[];
  isOpen: boolean;
  onClose: () => void;
  currentDate?: Date;
  currentView?: View;
  eventStyleGetter: (event: ICalendarEvent) => { style: React.CSSProperties };
  dynamicIconMappings: Map<string, string>;
  gridLineOpacity: number;
}

export interface ILegendaryPrintPreviewState {
  selectedDate: Date;
  printView: 'month' | 'week' | 'day' | 'agenda';
  isGeneratingPrint: boolean;
  forceSinglePage: boolean;
  agendaStartDate: Date;
  agendaEndDate: Date;
  capturedImageUrl?: string; // 🏆 LEGENDARY: Captured calendar image
  isCapturingImage: boolean;
}

export class LegendaryPrintPreview extends React.Component<ILegendaryPrintPreviewProps, ILegendaryPrintPreviewState> {
  private printWindowRef: Window | null = null;

  constructor(props: ILegendaryPrintPreviewProps) {
    super(props);

    // Default agenda range: current month
    const currentDate = props.currentDate || new Date();
    const startOfMonth = moment(currentDate).startOf('month').toDate();
    const endOfMonth = moment(currentDate).endOf('month').toDate();

    this.state = {
      selectedDate: currentDate,
      printView: 'month', // Start with month view - the most requested
      isGeneratingPrint: false,
      forceSinglePage: false,
      agendaStartDate: startOfMonth,
      agendaEndDate: endOfMonth,
      capturedImageUrl: undefined,
      isCapturingImage: false
    };
  }

  public componentDidMount(): void {
    // Add ESC key listener for closing
    document.addEventListener('keydown', this.handleKeyDown);
  }

  public componentDidUpdate(prevProps: ILegendaryPrintPreviewProps): void {
    // If the modal was closed and is now opening, update to current calendar date
    if (this.props.isOpen && !prevProps.isOpen && this.props.currentDate) {
      const currentDate = this.props.currentDate;
      const startOfMonth = moment(currentDate).startOf('month').toDate();
      const endOfMonth = moment(currentDate).endOf('month').toDate();

      this.setState({
        selectedDate: currentDate,
        agendaStartDate: startOfMonth,
        agendaEndDate: endOfMonth
      });
    }
  }

  public componentWillUnmount(): void {
    document.removeEventListener('keydown', this.handleKeyDown);
    if (this.printWindowRef) {
      this.printWindowRef.close();
    }
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && this.props.isOpen) {
      this.props.onClose();
    }
  };

  private onDateChange = (date: Date | null | undefined): void => {
    if (date) {
      // Update agenda date range to match the new month
      const newMonth = moment(date);
      const agendaStartDate = newMonth.clone().startOf('month').toDate();
      const agendaEndDate = newMonth.clone().endOf('month').toDate();

      this.setState({
        selectedDate: date,
        agendaStartDate,
        agendaEndDate
      });
    }
  };

  // 🔄 NAVIGATION SYNC - Handle navigation from react-big-calendar views
  private onCalendarNavigate = (date: Date): void => {
    // Update both selectedDate and agenda date range in a single setState call
    const newMonth = moment(date);
    const agendaStartDate = newMonth.clone().startOf('month').toDate();
    const agendaEndDate = newMonth.clone().endOf('month').toDate();

    this.setState({
      selectedDate: date,
      agendaStartDate,
      agendaEndDate
    });
  };

  private onAgendaStartDateChange = (date: Date | null | undefined): void => {
    if (date) {
      this.setState({ agendaStartDate: date });
    }
  };

  private onAgendaEndDateChange = (date: Date | null | undefined): void => {
    if (date) {
      this.setState({ agendaEndDate: date });
    }
  };

  private onPrintViewChange = (ev?: React.FormEvent<HTMLElement | HTMLInputElement>, option?: IChoiceGroupOption): void => {
    if (option) {
      this.setState({ printView: option.key as 'month' | 'week' | 'day' | 'agenda' });
    }
  };

  private navigateMonth = (direction: 'prev' | 'next'): void => {
    const { selectedDate } = this.state;
    const newDate = new Date(selectedDate.getTime());

    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }

    // Update agenda date range to match the new month
    const newMonth = moment(newDate);
    const agendaStartDate = newMonth.clone().startOf('month').toDate();
    const agendaEndDate = newMonth.clone().endOf('month').toDate();

    this.setState({
      selectedDate: newDate,
      agendaStartDate,
      agendaEndDate
    });
  };

  private navigateWeek = (direction: 'prev' | 'next'): void => {
    const { selectedDate } = this.state;
    const newDate = moment(selectedDate);

    if (direction === 'prev') {
      newDate.subtract(1, 'week');
    } else {
      newDate.add(1, 'week');
    }

    // Update agenda date range to match the new month
    const newMonth = newDate.clone();
    const agendaStartDate = newMonth.clone().startOf('month').toDate();
    const agendaEndDate = newMonth.clone().endOf('month').toDate();

    this.setState({
      selectedDate: newDate.toDate(),
      agendaStartDate,
      agendaEndDate
    });
  };

  private navigateDay = (direction: 'prev' | 'next'): void => {
    const { selectedDate } = this.state;
    const newDate = moment(selectedDate);

    if (direction === 'prev') {
      newDate.subtract(1, 'day');
    } else {
      newDate.add(1, 'day');
    }

    // Update agenda date range to match the new month
    const newMonth = newDate.clone();
    const agendaStartDate = newMonth.clone().startOf('month').toDate();
    const agendaEndDate = newMonth.clone().endOf('month').toDate();

    this.setState({
      selectedDate: newDate.toDate(),
      agendaStartDate,
      agendaEndDate
    });
  };

  private getFilteredEvents = (): ICalendarEvent[] => {
    const { events } = this.props;
    const { selectedDate, printView } = this.state;

    Logger.info(`Filtering events for ${printView} view, selected date: ${selectedDate.toISOString()}`);
    Logger.info(`Total events available: ${events.length}`);

    if (printView === 'month') {
      // Get events for the entire month - use proper timezone handling
      const startOfCalendar = moment(selectedDate).startOf('month').startOf('week').startOf('day').toDate();
      const endOfCalendar = moment(selectedDate).endOf('month').endOf('week').endOf('day').toDate();

      Logger.debug(`Calendar range: ${startOfCalendar.toISOString()} to ${endOfCalendar.toISOString()}`);

      const filteredEvents = events.filter(event => {
        // Use moment.js for ALL date operations - no mixing with Date objects!
        const eventStartMoment = moment(event.start);
        const eventEndMoment = moment(event.end);
        const selectedMoment = moment(selectedDate);

        // 🔧 FIX: Only include events that are actually in the selected month
        // This prevents September events from being included in August calendar
        const isInSameMonth = eventStartMoment.isSame(selectedMoment, 'month') &&
                             eventStartMoment.isSame(selectedMoment, 'year');

        // 🔧 FIX: Also include multi-day events that span into this month
        const eventEndsInMonth = eventEndMoment.isSame(selectedMoment, 'month') &&
                                eventEndMoment.isSame(selectedMoment, 'year');

        // 🔧 FIX: Include events that span across the entire month
        const eventSpansMonth = eventStartMoment.isBefore(selectedMoment.clone().startOf('month')) &&
                               eventEndMoment.isAfter(selectedMoment.clone().endOf('month'));

        const isInRange = isInSameMonth || eventEndsInMonth || eventSpansMonth;

        if (isInRange) {
          Logger.debug(`Including event: ${event.title} (${eventStartMoment.format('YYYY-MM-DD')})`);
        }

        return isInRange;
      });

      Logger.info(`Filtered events count: ${filteredEvents.length}`);
      return filteredEvents;
    }

    if (printView === 'week') {
      const filteredEvents = events.filter(event => {
        // Use moment.js for ALL date operations
        const eventStartMoment = moment(event.start);
        const eventEndMoment = moment(event.end);
        const selectedMoment = moment(selectedDate);

        // Get the week range (Sunday to Saturday)
        const startOfWeek = selectedMoment.clone().startOf('week');
        const endOfWeek = selectedMoment.clone().endOf('week');

        // Include events that start in this week, end in this week, or span across this week
        const eventStartsInWeek = eventStartMoment.isBetween(startOfWeek, endOfWeek, 'day', '[]');
        const eventEndsInWeek = eventEndMoment.isBetween(startOfWeek, endOfWeek, 'day', '[]');
        const eventSpansWeek = eventStartMoment.isBefore(startOfWeek) && eventEndMoment.isAfter(endOfWeek);

        const isInRange = eventStartsInWeek || eventEndsInWeek || eventSpansWeek;

        if (isInRange) {
          Logger.debug(`Including week event: ${event.title} (${eventStartMoment.format('YYYY-MM-DD')})`);
        }

        return isInRange;
      });

      Logger.info(`Filtered week events count: ${filteredEvents.length}`);
      return filteredEvents;
    }

    if (printView === 'day') {
      const filteredEvents = events.filter(event => {
        // Use moment.js for ALL date operations
        const eventStartMoment = moment(event.start);
        const eventEndMoment = moment(event.end);
        const selectedMoment = moment(selectedDate);

        // Include events that start on this day, end on this day, or span across this day
        const eventStartsOnDay = eventStartMoment.isSame(selectedMoment, 'day');
        const eventEndsOnDay = eventEndMoment.isSame(selectedMoment, 'day');
        const eventSpansDay = eventStartMoment.isBefore(selectedMoment, 'day') && eventEndMoment.isAfter(selectedMoment, 'day');

        const isInRange = eventStartsOnDay || eventEndsOnDay || eventSpansDay;

        if (isInRange) {
          Logger.debug(`Including day event: ${event.title} (${eventStartMoment.format('YYYY-MM-DD')})`);
        }

        return isInRange;
      });

      Logger.info(`Filtered day events count: ${filteredEvents.length}`);
      return filteredEvents;
    }

    if (printView === 'agenda') {
      const { agendaStartDate, agendaEndDate } = this.state;
      const filteredEvents = events.filter(event => {
        // Use moment.js for ALL date operations
        const eventStartMoment = moment(event.start);
        const eventEndMoment = moment(event.end);
        const startRangeMoment = moment(agendaStartDate);
        const endRangeMoment = moment(agendaEndDate);

        // Include events that start in range, end in range, or span across the range
        const eventStartsInRange = eventStartMoment.isBetween(startRangeMoment, endRangeMoment, 'day', '[]');
        const eventEndsInRange = eventEndMoment.isBetween(startRangeMoment, endRangeMoment, 'day', '[]');
        const eventSpansRange = eventStartMoment.isBefore(startRangeMoment, 'day') && eventEndMoment.isAfter(endRangeMoment, 'day');

        const isInRange = eventStartsInRange || eventEndsInRange || eventSpansRange;

        if (isInRange) {
          Logger.debug(`Including agenda event: ${event.title} (${eventStartMoment.format('YYYY-MM-DD')})`);
        }

        return isInRange;
      });

      // Sort events chronologically for agenda view
      const sortedEvents = filteredEvents.sort((a, b) => moment(a.start).valueOf() - moment(b.start).valueOf());

      Logger.info(`Filtered agenda events count: ${sortedEvents.length}`);
      return sortedEvents;
    }

    // For other views, we'll implement later
    return events;
  };

  private generateLegendaryPrint = async (): Promise<void> => {
    this.setState({ isGeneratingPrint: true });

    try {
      const { printView, selectedDate } = this.state;

      // 🏆 LEGENDARY: Capture the calendar as high-res image
      Logger.info('🎨 LEGENDARY: Starting calendar capture for perfect print fidelity...');
      const capturedImageUrl = await this.captureCalendarImage();

      if (!capturedImageUrl) {
        Logger.error('❌ LEGENDARY: Calendar capture failed, falling back to HTML table');
        // Fallback to original HTML table approach
        const filteredEvents = this.getFilteredEvents();
        const printContent = this.generatePrintHTML(filteredEvents, printView, selectedDate, false);
        this.openPrintWindow(printContent);
        return;
      }

      // Generate title for the captured image
      let title: string;
      if (printView === 'day') {
        title = `BigCal Day View - ${moment(selectedDate).format('dddd, MMMM D, YYYY')}`;
      } else {
        title = `BigCal ${printView.charAt(0).toUpperCase() + printView.slice(1)} View - ${moment(selectedDate).format('MMMM YYYY')}`;
      }

      // 🏆 LEGENDARY: Generate print HTML with captured image
      const printContent = this.generateLegendaryImagePrintHTML(capturedImageUrl, title);
      this.openPrintWindow(printContent);

      Logger.info('🏆 LEGENDARY: Image-based print generated successfully!');
    } catch (error) {
      Logger.error('❌ LEGENDARY Print generation failed', error);
      alert('Unable to generate print. Please try again.');
    } finally {
      this.setState({ isGeneratingPrint: false });
    }
  };

  // Helper method to open print window
  private openPrintWindow = (printContent: string): void => {
    this.printWindowRef = window.open('', '_blank', 'width=1200,height=800');

    if (this.printWindowRef) {
      this.printWindowRef.document.write(printContent);
      this.printWindowRef.document.close();

      // Wait for content to load, then print
      this.printWindowRef.onload = () => {
        if (this.printWindowRef) {
          this.printWindowRef.focus();
          this.printWindowRef.print();

          // Close the print window after printing
          this.printWindowRef.onafterprint = () => {
            if (this.printWindowRef) {
              this.printWindowRef.close();
              this.printWindowRef = null;
            }
          };
        }
      };

      Logger.info('🏆 LEGENDARY Print window opened successfully');
    } else {
      Logger.error('❌ Failed to open print window - popup blocked?');
    }
  };

  private generatePrintHTML = (events: ICalendarEvent[], printView: string, selectedDate: Date, forceSinglePage: boolean = false): string => {
    let title: string;

    if (printView === 'day') {
      title = `BigCal Day View - ${moment(selectedDate).format('dddd, MMMM D, YYYY')}`;
    } else {
      title = `BigCal ${printView.charAt(0).toUpperCase() + printView.slice(1)} View - ${moment(selectedDate).format('MMMM YYYY')}`;
    }

    if (printView === 'month') {
      return this.generateMonthPrintHTML(events, selectedDate, title);
    }

    if (printView === 'week') {
      return this.generateWeekPrintHTML(events, selectedDate, title, forceSinglePage);
    }

    if (printView === 'day') {
      return this.generateDayPrintHTML(events, selectedDate, title);
    }

    if (printView === 'agenda') {
      return this.generateAgendaPrintHTML(events, selectedDate, title);
    }

    return `<html><body><h1>Print view ${printView} coming soon!</h1></body></html>`;
  };

  // 🏆 LEGENDARY: Capture calendar as high-res image for perfect print fidelity
  private captureCalendarImage = async (): Promise<string | null> => {
    try {
      this.setState({ isCapturingImage: true });
      Logger.debug('🎨 LEGENDARY: Starting calendar capture...');

      // Find the hidden capture calendar element (optimally sized for print)
      const captureElement = document.querySelector('.legendary-capture-calendar') as HTMLElement;
      if (!captureElement) {
        Logger.error('❌ Hidden capture calendar not found, falling back to main calendar');
        // Fallback to main calendar
        const calendarElement = document.querySelector('.rbc-calendar') as HTMLElement;
        if (!calendarElement) {
          Logger.error('❌ No calendar element found for capture');
          return null;
        }
        return this.captureElement(calendarElement);
      }

      return this.captureElement(captureElement);
    } catch (error) {
      Logger.error('❌ LEGENDARY: Calendar capture failed', error);
      return null;
    } finally {
      this.setState({ isCapturingImage: false });
    }
  };

  // Helper method to capture any calendar element
  private captureElement = async (element: HTMLElement): Promise<string | null> => {
    try {
      // Configure html2canvas for high-quality capture optimized for print
      const canvas = await html2canvas(element, {
        scale: 2, // High DPI for crisp print
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: 1100, // Optimal width for landscape print
        height: 800, // Optimal height for landscape print
        scrollX: 0,
        scrollY: 0
      });

      // Convert to data URL
      const imageUrl = canvas.toDataURL('image/png', 1.0);
      Logger.debug('🎯 LEGENDARY: Calendar captured successfully!');

      return imageUrl;
    } catch (error) {
      Logger.error('❌ LEGENDARY: Element capture failed', error);
      return null;
    }
  };

  // 🏆 LEGENDARY: Generate print HTML with captured image
  private generateLegendaryImagePrintHTML = (imageUrl: string, title: string): string => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <style>
            @page {
              size: landscape;
              margin: 0.5in;
            }
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              margin: 0;
              padding: 10px;
              -webkit-print-color-adjust: exact;
              color-adjust: exact;
            }
            .print-header {
              text-align: center;
              margin-bottom: 10px;
              border-bottom: 2px solid #0078d4;
              padding-bottom: 5px;
            }
            .print-header h1 {
              margin: 0;
              color: #0078d4;
              font-size: 18px;
              font-weight: 600;
            }
            .calendar-image {
              width: 100%;
              height: auto;
              max-height: 90vh;
              object-fit: contain;
              border: 1px solid #ddd;
              border-radius: 4px;
            }
          </style>
        </head>
        <body>
          <div class="print-header">
            <h1>🏆 ${title}</h1>
          </div>
          <img src="${imageUrl}" alt="Calendar" class="calendar-image" />
        </body>
      </html>
    `;
  };

  private generateMonthPrintHTML = (events: ICalendarEvent[], selectedDate: Date, title: string): string => {
    // This will be our legendary month print HTML
    // For now, basic structure - we'll enhance this
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <style>
            @page { 
              size: landscape;
              margin: 0.5in;
            }
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              margin: 0;
              padding: 20px;
              -webkit-print-color-adjust: exact;
              color-adjust: exact;
            }
            .print-header {
              text-align: center;
              margin-bottom: 12px; /* Reduced from 20px */
              border-bottom: 2px solid #0078d4;
              padding-bottom: 6px; /* Reduced from 10px */
            }
            .print-header h1 {
              margin: 0;
              color: #0078d4;
              font-size: 20px; /* Reduced from 24px */
              font-weight: 600;
            }
            .calendar-grid {
              width: 100%;
              border-collapse: collapse;
              height: 680px; /* Increased from 600px to fit full month */
            }
            .calendar-grid th,
            .calendar-grid td {
              border: 1px solid #ccc;
              vertical-align: top;
            }
            .calendar-grid th {
              background-color: #0078d4;
              color: white;
              text-align: center;
              font-weight: 600;
              height: 30px;
              padding: 8px 4px;
            }

            /* 🏆 LEGENDARY Hybrid Layout */

            /* Day Cells - contain day numbers and single-day events */
            .day-cell {
              width: 14.28%;
              height: 95px; /* Increased from 85px for better fit */
              padding: 4px;
              vertical-align: top;
            }
            .day-number {
              font-weight: 600;
              font-size: 14px;
              margin-bottom: 4px;
            }

            /* Single-day events within day cells */
            .single-day-event {
              font-size: 9px;
              margin: 1px 0;
              padding: 1px 3px;
              border-radius: 2px;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
              line-height: 1.1;
            }

            /* Spanning Event Rows - for multi-day events only */
            .spanning-event-row {
              height: 14px; /* Match single-day event height */
            }
            .spanning-cell {
              height: 14px;
              padding: 0;
              border: none !important; /* Completely hide all borders */
              background: transparent;
            }

            /* Multi-day spanning events */
            .multi-day-spanning-event {
              font-size: 9px; /* Match single-day events */
              margin: 1px 0;
              padding: 1px 3px;
              border-radius: 2px;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
              line-height: 1.1;
              box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
              width: 100%;
              height: 12px; /* Match single-day event height */
            }
          </style>
        </head>
        <body>
          <div class="print-header">
            <h1>${title}</h1>
          </div>
          <div class="calendar-content">
            ${this.generateMonthGrid(events, selectedDate)}
          </div>
        </body>
      </html>
    `;
  };

  // 🎯 EXACT COPY of BigCal's MonthEvent - adapted for print with TRUNCATION for WYSIWYG
  private PrintMonthEvent = ({ event }: { event: ICalendarEvent }): React.ReactElement => {
    // Truncate event titles for consistent print layout - similar to MiniCalendarEvent logic
    const truncateTitle = (title: string, maxLength: number): string => {
      return title.length > maxLength ? `${title.substring(0, maxLength)}...` : title;
    };

    // Holiday events get special display
    if (event.isHoliday) {
      const displayTitle = truncateTitle(event.title, 20); // Slightly longer for holidays
      return (
        <div className={`${bigCalStyles.customEvent} ${bigCalStyles.monthEventItem}`}>
          <span
            className={bigCalStyles.eventIcon}
            style={{ fontSize: '14px', marginRight: '4px' }}
          >
            🏛️
          </span>
          <span className={bigCalStyles.eventTitle}>
            {displayTitle}
            {event.isObserved && ' (obs)'}
          </span>
        </div>
      );
    }

    // Private events get locked icon, regular events get dynamic category icon
    const iconEmoji = event.isPrivate ? '🔒' : this.getEventIconFromMapping(event.swimlane!, event.status || '');

    // Truncate regular event titles to maintain consistent cell widths
    const displayTitle = truncateTitle(event.title, 18); // Optimal length for print month view

    return (
      <div className={`${bigCalStyles.customEvent} ${bigCalStyles.monthEventItem}`}>
        <span
          className={bigCalStyles.eventIcon}
          style={{ fontSize: '14px', marginRight: '4px' }}
        >
          {iconEmoji}
        </span>
        <span className={bigCalStyles.eventTitle}>{displayTitle}</span>
      </div>
    );
  };

  // 🎯 EXACT COPY of BigCal's EventComponent - adapted for print (no mouse events)
  private PrintWeekEvent = ({ event }: { event: ICalendarEvent }): React.ReactElement => {
    // Truncate event titles for consistent print layout
    const truncateTitle = (title: string, maxLength: number): string => {
      return title.length > maxLength ? `${title.substring(0, maxLength)}...` : title;
    };

    // Holiday events get special display
    if (event.isHoliday) {
      const displayTitle = truncateTitle(event.title, 25); // Longer for week view
      return (
        <div className={bigCalStyles.customEvent}>
          <span
            className={bigCalStyles.eventIcon}
            style={{ fontSize: '16px', marginRight: '6px' }}
          >
            🏛️
          </span>
          <span className={bigCalStyles.eventTitle}>
            {displayTitle}
            {event.isObserved && ' (observed)'}
          </span>
        </div>
      );
    }

    // Private events get locked icon, regular events get dynamic category icon
    const iconEmoji = event.isPrivate ? '🔒' : this.getEventIconFromMapping(event.swimlane!, event.status || '');
    const displayTitle = truncateTitle(event.title, 22); // Optimal for week view

    return (
      <div className={bigCalStyles.customEvent}>
        <span
          className={bigCalStyles.eventIcon}
          style={{ fontSize: '16px', marginRight: '6px' }}
        >
          {iconEmoji}
        </span>
        <span className={bigCalStyles.eventTitle}>{displayTitle}</span>
      </div>
    );
  };

  // 🎯 EXACT COPY of BigCal's EventComponent - adapted for Day print view
  private PrintDayEvent = ({ event }: { event: ICalendarEvent }): React.ReactElement => {
    // Day view shows FULL titles - users expect complete information in detail view

    // Holiday events get special display
    if (event.isHoliday) {
      return (
        <div className={bigCalStyles.customEvent}>
          <span
            className={bigCalStyles.eventIcon}
            style={{ fontSize: '14px', marginRight: '6px' }}
          >
            🎉
          </span>
          <span className={bigCalStyles.eventTitle}>{event.title}</span>
        </div>
      );
    }

    // Get the icon for this event
    const iconEmoji = this.getEventIconFromMapping(event.swimlane || '', event.status || '');

    return (
      <div className={bigCalStyles.customEvent}>
        <span
          className={bigCalStyles.eventIcon}
          style={{ fontSize: '14px', marginRight: '6px' }}
        >
          {iconEmoji}
        </span>
        <span className={bigCalStyles.eventTitle}>{event.title}</span>
      </div>
    );
  };

  // 🎯 EXACT COPY of BigCal's EventComponent - adapted for Agenda print view
  private PrintAgendaEvent = ({ event }: { event: ICalendarEvent }): React.ReactElement => {
    // Agenda view shows FULL titles - this is the detail view where users want complete information

    // Holiday events get special display
    if (event.isHoliday) {
      return (
        <div className={bigCalStyles.customEvent}>
          <span
            className={bigCalStyles.eventIcon}
            style={{ fontSize: '14px', marginRight: '6px' }}
          >
            🎉
          </span>
          <span className={bigCalStyles.eventTitle}>{event.title}</span>
        </div>
      );
    }

    // Get the icon for this event
    const iconEmoji = this.getEventIconFromMapping(event.swimlane || '', event.status || '');

    return (
      <div className={bigCalStyles.customEvent}>
        <span
          className={bigCalStyles.eventIcon}
          style={{ fontSize: '14px', marginRight: '6px' }}
        >
          {iconEmoji}
        </span>
        <span className={bigCalStyles.eventTitle}>{event.title}</span>
      </div>
    );
  };

  // 🎨 VIEW-SPECIFIC EVENT STYLE GETTERS
  private monthEventStyleGetter = (event: ICalendarEvent): { style: React.CSSProperties } => {
    return this.props.eventStyleGetter(event);
  };

  private weekEventStyleGetter = (event: ICalendarEvent): { style: React.CSSProperties } => {
    return this.props.eventStyleGetter(event);
  };

  private dayEventStyleGetter = (event: ICalendarEvent): { style: React.CSSProperties } => {
    return this.props.eventStyleGetter(event);
  };

  private agendaEventStyleGetter = (event: ICalendarEvent): { style: React.CSSProperties } => {
    // For agenda view - only colors for private events and holidays
    if (event.isHoliday) {
      return {
        style: {
          backgroundColor: '#ff9800',
          borderColor: '#ff9800',
          color: 'white',
          border: '1px solid #ff9800',
          borderRadius: '4px',
          fontSize: '12px',
          padding: '2px 6px'
        }
      };
    }

    if (event.isPrivate) {
      return {
        style: {
          backgroundColor: '#8a8886',
          borderColor: '#8a8886',
          color: 'white',
          border: '1px solid #8a8886',
          borderRadius: '4px',
          fontSize: '12px',
          padding: '2px 6px'
        }
      };
    }

    // All other events get neutral styling for agenda
    return {
      style: {
        backgroundColor: '#f8f9fa',
        borderColor: '#dee2e6',
        color: '#333333',
        border: '1px solid #dee2e6',
        borderRadius: '4px',
        fontSize: '12px',
        padding: '2px 6px'
      }
    };
  };

  // 🎯 EXACT COPY of BigCal's getEventIconFromMapping method
  private getEventIconFromMapping = (swimlane: string, status: string): string => {
    // Check for dynamic icon mappings first
    // Priority: Status icon (if Tentative) > Swimlane icon > Static fallback
    if (status === 'Tentative') {
      const tentativeIcon = this.props.dynamicIconMappings.get('Tentative');
      if (tentativeIcon) {
        return tentativeIcon;
      }
    }

    // Check for swimlane icon
    const swimlaneIcon = this.props.dynamicIconMappings.get(swimlane);
    if (swimlaneIcon) {
      return swimlaneIcon;
    }

    // No fallback - only use Color Palette Studio icons
    return '';
  };

  private generateMonthGrid = (events: ICalendarEvent[], selectedDate: Date): string => {
    // Generate LEGENDARY month grid HTML with proper multi-day event spanning
    Logger.debug(`Print grid generation - Events received: ${events.length}`);

    const startOfMonth = moment(selectedDate).startOf('month');
    const endOfMonth = moment(selectedDate).endOf('month');
    const startOfCalendar = moment(startOfMonth).startOf('week');
    const endOfCalendar = moment(endOfMonth).endOf('week');

    let html = '<table class="calendar-grid">';

    // Header row
    html += '<thead><tr>';
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayNames.forEach(day => {
      html += `<th>${day}</th>`;
    });
    html += '</tr></thead>';

    // 🏆 LEGENDARY CALENDAR BODY - True multi-day spanning with colspan magic!
    html += '<tbody>';
    const current = moment(startOfCalendar);

    while (current.isSameOrBefore(endOfCalendar)) {
      // Build the week row with LEGENDARY multi-day spanning
      const weekDays: moment.Moment[] = [];

      // Collect all 7 days of this week
      for (let i = 0; i < 7; i++) {
        weekDays.push(current.clone());
        current.add(1, 'day');
      }

      // This will be handled in the hybrid layout below

      // 🏆 HYBRID LAYOUT: Day cells with single-day events + spanning rows for multi-day

      // Generate the main row with day numbers AND single-day events
      html += '<tr class="day-row">';
      weekDays.forEach(day => {
        const dayStr = day.format('YYYY-MM-DD');

        // Get single-day events for this day
        const singleDayEvents = events.filter(event => {
          const eventStart = moment(event.start);
          const eventEnd = moment(event.end);
          const eventStartStr = eventStart.format('YYYY-MM-DD');
          const eventEndStr = eventEnd.format('YYYY-MM-DD');

          // Single day event that occurs on this day
          return eventStartStr === eventEndStr && eventStartStr === dayStr;
        });

        html += `<td class="day-cell">`;
        html += `<div class="day-number">${day.date()}</div>`;

        // Add single-day events directly in the day cell
        singleDayEvents.forEach(event => {
          const eventStyle = this.props.eventStyleGetter(event);
          const backgroundColor = eventStyle.style.backgroundColor || '#0078d4';
          const displayTitle = event.title.length > 18 ?
            `${event.title.substring(0, 18)}...` : event.title;

          html += `<div class="event-item single-day-event" style="background-color: ${backgroundColor};">`;
          html += displayTitle;
          html += `</div>`;
        });

        html += `</td>`;
      });
      html += '</tr>';

      // Generate spanning event rows (only for multi-day events)
      const multiDayEventRows = this.processMultiDayEventsForSpanning(events, weekDays);
      multiDayEventRows.forEach((eventRow, rowIndex) => {
        html += `<tr class="spanning-event-row">`;

        let dayIndex = 0;
        while (dayIndex < 7) {
          const eventInfo = eventRow[dayIndex];

          if (eventInfo === undefined) {
            // Empty cell
            html += '<td class="spanning-cell"></td>';
            dayIndex++;
          } else if (eventInfo.skip) {
            // Skip this cell (part of a spanning event)
            dayIndex++;
          } else if (eventInfo.event && eventInfo.colspan) {
            // Render multi-day event with proper colspan
            const eventStyle = this.props.eventStyleGetter(eventInfo.event);
            const backgroundColor = eventStyle.style.backgroundColor || '#0078d4';
            const displayTitle = eventInfo.event.title.length > 18 ?
              `${eventInfo.event.title.substring(0, 18)}...` : eventInfo.event.title;

            html += `<td class="spanning-cell" colspan="${eventInfo.colspan}">`;
            html += `<div class="event-item multi-day-spanning-event" style="background-color: ${backgroundColor};">`;
            html += displayTitle;
            html += `</div></td>`;

            dayIndex += eventInfo.colspan;
          } else {
            // Fallback for malformed event info
            html += '<td class="spanning-cell"></td>';
            dayIndex++;
          }
        }

        html += '</tr>';
      });
    }
    
    html += '</tbody></table>';
    return html;
  };



  // 🏆 LEGENDARY HELPER: Process ONLY multi-day events for spanning
  private processMultiDayEventsForSpanning = (events: ICalendarEvent[], weekDays: moment.Moment[]): EventRowCell[][] => {
    const eventRows: EventRowCell[][] = [];
    const processedEvents = new Set<string>();

    // Get only multi-day events that occur during this week
    const multiDayEvents = events.filter(event => {
      const eventStart = moment(event.start);
      const eventEnd = moment(event.end);
      const weekStart = weekDays[0];
      const weekEnd = weekDays[6];

      // Must be multi-day AND overlap with this week
      const isMultiDay = !eventStart.isSame(eventEnd, 'day');
      const overlapsWeek = eventStart.isSameOrBefore(weekEnd, 'day') && eventEnd.isSameOrAfter(weekStart, 'day');

      return isMultiDay && overlapsWeek;
    });

    // Sort events by start date, then by duration (longer events first)
    multiDayEvents.sort((a, b) => {
      const aStart = moment(a.start);
      const bStart = moment(b.start);
      if (!aStart.isSame(bStart, 'day')) {
        return aStart.diff(bStart);
      }
      // Same start date - longer events first
      const aDuration = moment(a.end).diff(moment(a.start), 'days');
      const bDuration = moment(b.end).diff(moment(b.start), 'days');
      return bDuration - aDuration;
    });

    // Place events in rows without overlapping
    multiDayEvents.forEach(event => {
      const eventKey = `${event.title}-${moment(event.start).format('YYYY-MM-DD')}`;
      if (processedEvents.has(eventKey)) return;

      const eventStart = moment(event.start);
      const eventEnd = moment(event.end);

      // Calculate which days this event spans within this week
      let startDayIndex = -1;
      let endDayIndex = -1;

      for (let i = 0; i < weekDays.length; i++) {
        if (startDayIndex === -1 && weekDays[i].isSameOrAfter(eventStart, 'day')) {
          startDayIndex = i;
        }
        if (weekDays[i].isSameOrAfter(eventEnd, 'day')) {
          endDayIndex = i;
          break;
        }
      }

      startDayIndex = Math.max(0, startDayIndex === -1 ? 0 : startDayIndex);
      const actualEndIndex = endDayIndex === -1 ? 6 : Math.min(6, endDayIndex);

      const colspan = actualEndIndex - startDayIndex + 1;

      if (colspan > 0) {
        // Find a row where this event can fit
        let targetRowIndex = -1;
        for (let rowIndex = 0; rowIndex < eventRows.length; rowIndex++) {
          let canFit = true;
          for (let dayIndex = startDayIndex; dayIndex <= actualEndIndex; dayIndex++) {
            if (eventRows[rowIndex][dayIndex] !== undefined) {
              canFit = false;
              break;
            }
          }
          if (canFit) {
            targetRowIndex = rowIndex;
            break;
          }
        }

        // Create new row if needed
        if (targetRowIndex === -1) {
          targetRowIndex = eventRows.length;
          const newRow: EventRowCell[] = [];
          for (let i = 0; i < 7; i++) {
            newRow.push(undefined);
          }
          eventRows.push(newRow);
        }

        // Place the event
        eventRows[targetRowIndex][startDayIndex] = {
          event: event,
          colspan: colspan,
          skip: false
        };

        // Mark subsequent cells as skip
        for (let dayIndex = startDayIndex + 1; dayIndex <= actualEndIndex; dayIndex++) {
          eventRows[targetRowIndex][dayIndex] = { skip: true };
        }

        processedEvents.add(eventKey);
      }
    });

    return eventRows;
  };

  private generateWeekPrintHTML = (events: ICalendarEvent[], selectedDate: Date, title: string, forceSinglePage: boolean = false): string => {
    // Generate legendary week view HTML optimized for landscape printing
    const weekStart = moment(selectedDate).startOf('week');
    const weekEnd = moment(selectedDate).endOf('week');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <style>
            @page {
              size: landscape;
              margin: 0.5in;
            }
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              margin: 0;
              padding: 0;
              -webkit-print-color-adjust: exact;
              color-adjust: exact;
            }
            .print-header {
              text-align: center;
              margin-bottom: 8px;
              padding: 4px 0;
            }
            .print-header p {
              margin: 0;
              color: #333;
              font-size: 14px;
              font-weight: 500;
            }
            .week-grid {
              width: 100%;
              border-collapse: collapse;
              height: ${forceSinglePage ? '680px' : '750px'};
            }
            .week-grid th,
            .week-grid td {
              border: 1px solid #ccc;
              padding: ${forceSinglePage ? '2px' : '4px'};
              vertical-align: top;
            }
            .week-grid th {
              background-color: #0078d4;
              color: white;
              text-align: center;
              font-weight: 600;
              height: ${forceSinglePage ? '30px' : '40px'};
              width: 14.28%;
              font-size: ${forceSinglePage ? '11px' : '14px'};
            }
            .week-grid .time-slot {
              background-color: #f8f9fa;
              font-size: 11px;
              text-align: center;
              width: 60px;
              font-weight: 600;
            }
            .week-event {
              background-color: #0078d4;
              color: white;
              padding: ${forceSinglePage ? '1px 2px' : '2px 4px'};
              margin: ${forceSinglePage ? '0.5px 0' : '1px 0'};
              border-radius: 3px;
              font-size: ${forceSinglePage ? '8px' : '10px'};
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
              line-height: ${forceSinglePage ? '1.1' : '1.2'};
            }
          </style>
        </head>
        <body>
          <div class="print-header">
            <p>Week of ${weekStart.format('MMMM D')} - ${weekEnd.format('MMMM D, YYYY')}</p>
          </div>
          ${this.generateWeekGrid(events, selectedDate)}
        </body>
      </html>
    `;
  };

  private generateWeekGrid = (events: ICalendarEvent[], selectedDate: Date): string => {
    // Generate a simplified week grid for printing
    const weekStart = moment(selectedDate).startOf('week');
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    let html = '<table class="week-grid">';

    // Header row with days
    html += '<thead><tr><th>Time</th>';
    for (let i = 0; i < 7; i++) {
      const day = weekStart.clone().add(i, 'days');
      html += `<th>${dayNames[i]}<br/>${day.format('MMM D')}</th>`;
    }
    html += '</tr></thead>';

    // Time slots from 7 AM to 6 PM (business hours focus)
    html += '<tbody>';
    for (let hour = 7; hour <= 18; hour++) {
      html += '<tr>';
      html += `<td class="time-slot">${hour === 12 ? '12:00 PM' : hour > 12 ? `${hour - 12}:00 PM` : `${hour}:00 AM`}</td>`;

      // For each day of the week
      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const currentDay = weekStart.clone().add(dayOffset, 'days');
        const dayEvents = events.filter(event => {
          const eventStart = moment(event.start);
          const eventHour = eventStart.hour();
          return eventStart.isSame(currentDay, 'day') && eventHour === hour;
        });

        html += '<td>';
        dayEvents.forEach(event => {
          const eventStyle = this.props.eventStyleGetter(event);
          const backgroundColor = eventStyle.style.backgroundColor || '#0078d4';
          const iconEmoji = event.isPrivate ? '🔒' : this.getEventIconFromMapping(event.swimlane!, event.status || '');

          // Truncate event titles for consistent print layout
          const displayTitle = event.title.length > 22 ? `${event.title.substring(0, 22)}...` : event.title;
          html += `<div class="week-event" style="background-color: ${backgroundColor};">`;
          html += `${iconEmoji} ${displayTitle}`;
          html += '</div>';
        });
        html += '</td>';
      }

      html += '</tr>';
    }
    html += '</tbody></table>';

    return html;
  };

  private generateDayPrintHTML = (events: ICalendarEvent[], selectedDate: Date, title: string): string => {
    // Generate legendary day view HTML optimized for portrait printing
    const dayMoment = moment(selectedDate);
    const dayEvents = events.sort((a, b) => moment(a.start).valueOf() - moment(b.start).valueOf());

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <style>
            @page {
              size: portrait;
              margin: 0.75in;
            }
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              margin: 0;
              padding: 20px;
              -webkit-print-color-adjust: exact;
              color-adjust: exact;
              line-height: 1.4;
            }
            .print-header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 3px solid #0078d4;
              padding-bottom: 15px;
            }
            .print-header h1 {
              margin: 0;
              color: #0078d4;
              font-size: 28px;
              font-weight: 600;
            }
            .print-header .date {
              margin: 5px 0 0 0;
              color: #666;
              font-size: 16px;
            }
            .day-schedule {
              margin-top: 20px;
            }
            .time-block {
              display: flex;
              margin-bottom: 15px;
              min-height: 40px;
              border-left: 4px solid #e1e1e1;
              padding-left: 15px;
            }
            .time-block.has-events {
              border-left-color: #0078d4;
              background-color: #f8f9fa;
              padding: 10px 15px;
              border-radius: 0 8px 8px 0;
            }
            .time-label {
              font-weight: 600;
              color: #0078d4;
              min-width: 80px;
              font-size: 14px;
              margin-right: 20px;
            }
            .events-column {
              flex: 1;
            }
            .day-event {
              background-color: #0078d4;
              color: white;
              padding: 8px 12px;
              margin-bottom: 8px;
              border-radius: 6px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .event-title {
              font-weight: 600;
              font-size: 14px;
              margin-bottom: 4px;
            }
            .event-time {
              font-size: 12px;
              opacity: 0.9;
            }
            .event-description {
              font-size: 11px;
              margin-top: 4px;
              opacity: 0.8;
            }
            .no-events {
              color: #666;
              font-style: italic;
              text-align: center;
              padding: 40px 20px;
              background-color: #f8f9fa;
              border-radius: 8px;
              margin-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="print-header">
            <h1>📅 ${title}</h1>
            <div class="date">${dayMoment.format('dddd, MMMM D, YYYY')}</div>
          </div>
          ${this.generateDaySchedule(dayEvents, selectedDate)}
        </body>
      </html>
    `;
  };

  private generateDaySchedule = (events: ICalendarEvent[], selectedDate: Date): string => {
    if (events.length === 0) {
      return `
        <div class="no-events">
          <h3>🌟 No events scheduled for this day</h3>
          <p>Enjoy your free time!</p>
        </div>
      `;
    }

    // Group events by hour for better organization
    const eventsByHour = new Map<number, ICalendarEvent[]>();

    events.forEach(event => {
      const eventHour = moment(event.start).hour();
      if (!eventsByHour.has(eventHour)) {
        eventsByHour.set(eventHour, []);
      }
      eventsByHour.get(eventHour)!.push(event);
    });

    let html = '<div class="day-schedule">';

    // Generate time blocks for business hours (7 AM to 7 PM)
    for (let hour = 7; hour <= 19; hour++) {
      const hourEvents = eventsByHour.get(hour) || [];
      const hasEvents = hourEvents.length > 0;
      const timeLabel = moment().hour(hour).minute(0).format('h:00 A');

      html += `<div class="time-block ${hasEvents ? 'has-events' : ''}">`;
      html += `<div class="time-label">${timeLabel}</div>`;
      html += '<div class="events-column">';

      if (hasEvents) {
        hourEvents.forEach(event => {
          const startTime = moment(event.start).format('h:mm A');
          const endTime = moment(event.end).format('h:mm A');

          html += '<div class="day-event">';
          html += `<div class="event-title">${event.title}</div>`;
          html += `<div class="event-time">${startTime} - ${endTime}</div>`;
          if (event.description) {
            html += `<div class="event-description">${event.description}</div>`;
          }
          html += '</div>';
        });
      }

      html += '</div></div>';
    }

    // Add any events outside business hours
    const afterHoursEvents = events.filter(event => {
      const hour = moment(event.start).hour();
      return hour < 7 || hour > 19;
    });

    if (afterHoursEvents.length > 0) {
      html += '<div class="time-block has-events">';
      html += '<div class="time-label">Other</div>';
      html += '<div class="events-column">';

      afterHoursEvents.forEach(event => {
        const startTime = moment(event.start).format('h:mm A');
        const endTime = moment(event.end).format('h:mm A');

        html += '<div class="day-event">';
        html += `<div class="event-title">${event.title}</div>`;
        html += `<div class="event-time">${startTime} - ${endTime}</div>`;
        if (event.description) {
          html += `<div class="event-description">${event.description}</div>`;
        }
        html += '</div>';
      });

      html += '</div></div>';
    }

    html += '</div>';
    return html;
  };

  private generateAgendaPrintHTML = (events: ICalendarEvent[], selectedDate: Date, title: string): string => {
    // Generate legendary agenda view HTML matching react-big-calendar table format
    const { agendaStartDate, agendaEndDate } = this.state;
    const startMoment = moment(agendaStartDate);
    const endMoment = moment(agendaEndDate);

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <style>
            @page {
              size: portrait;
              margin: 0.75in;
            }
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              margin: 0;
              padding: 20px;
              -webkit-print-color-adjust: exact;
              color-adjust: exact;
              line-height: 1.4;
            }
            .print-header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 3px solid #0078d4;
              padding-bottom: 15px;
            }
            .print-header h1 {
              margin: 0;
              color: #0078d4;
              font-size: 28px;
              font-weight: 600;
            }
            .print-header .date-range {
              margin: 5px 0 0 0;
              color: #666;
              font-size: 16px;
            }
            .agenda-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            .agenda-table th {
              background-color: #0078d4;
              color: white;
              padding: 12px 15px;
              text-align: left;
              font-weight: 600;
              font-size: 16px;
              border: 1px solid #0078d4;
            }
            .agenda-table td {
              padding: 12px 15px;
              border: 1px solid #dee2e6;
              vertical-align: top;
            }
            .agenda-table tr:nth-child(even) {
              background-color: #f8f9fa;
            }
            .agenda-table tr:hover {
              background-color: #e3f2fd;
            }
            .event-icon {
              font-size: 16px;
              margin-right: 8px;
            }
            .event-title {
              font-weight: 500;
            }
            .event-details {
              color: #666;
              font-size: 14px;
              margin-top: 4px;
            }
              margin-bottom: 8px;
              border-radius: 0 6px 6px 0;
              box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }
            .event-header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 6px;
            }
            .event-title {
              font-weight: 600;
              font-size: 14px;
              color: #0078d4;
              flex: 1;
              margin-right: 15px;
            }
            .event-time {
              font-size: 12px;
              color: #666;
              white-space: nowrap;
              font-weight: 500;
            }
            .event-details {
              font-size: 12px;
              color: #666;
              margin-top: 4px;
            }
            .event-swimlane {
              display: inline-block;
              background-color: #e1e1e1;
              color: #333;
              padding: 2px 8px;
              border-radius: 12px;
              font-size: 10px;
              margin-right: 8px;
            }
            .event-status {
              display: inline-block;
              background-color: #ffd700;
              color: #333;
              padding: 2px 8px;
              border-radius: 12px;
              font-size: 10px;
            }
            .no-events {
              color: #666;
              font-style: italic;
              text-align: center;
              padding: 40px 20px;
              background-color: #f8f9fa;
              border-radius: 8px;
              margin-top: 20px;
            }
            .no-events {
              color: #666;
              font-style: italic;
              text-align: center;
              padding: 40px 20px;
              background-color: #f8f9fa;
              border-radius: 8px;
              margin-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="print-header">
            <h1>📋 ${title}</h1>
            <div class="date-range">${startMoment.format('MMMM D, YYYY')} - ${endMoment.format('MMMM D, YYYY')}</div>
          </div>
          ${this.generateAgendaTableContent(events)}
        </body>
      </html>
    `;
  };

  private generateAgendaTableContent = (events: ICalendarEvent[]): string => {
    if (events.length === 0) {
      return `
        <div class="no-events">
          There are no events in this range.
        </div>
      `;
    }

    // Sort events by date and time
    const sortedEvents = events.sort((a, b) => {
      const dateCompare = moment(a.start).diff(moment(b.start));
      if (dateCompare !== 0) return dateCompare;
      return moment(a.start).diff(moment(b.start), 'minutes');
    });

    let html = `
      <table class="agenda-table">
        <thead>
          <tr>
            <th style="width: 15%;">Date</th>
            <th style="width: 15%;">Time</th>
            <th style="width: 70%;">Event</th>
          </tr>
        </thead>
        <tbody>
    `;

    sortedEvents.forEach(event => {
      const eventDate = moment(event.start).format('ddd MMM DD');
      const startTime = moment(event.start).format('h:mm A');
      const endTime = moment(event.end).format('h:mm A');
      const timeRange = `${startTime} – ${endTime}`;

      // Get icon for the event
      const iconEmoji = event.isPrivate ? '🔒' : this.getEventIconFromMapping(event.swimlane!, event.status || '');

      html += `
        <tr>
          <td>${eventDate}</td>
          <td>${timeRange}</td>
          <td>
            <span class="event-icon">${iconEmoji}</span>
            <span class="event-title">${event.title}</span>
            ${event.swimlane ? `<div class="event-details">${event.swimlane}${event.status && event.status !== 'Not Set' ? ` • ${event.status}` : ''}</div>` : ''}
          </td>
        </tr>
      `;
    });

    html += `
        </tbody>
      </table>
    `;

    return html;
  };



  public render(): React.ReactElement<ILegendaryPrintPreviewProps> {
    if (!this.props.isOpen) {
      return <div />;
    }

    const { selectedDate, printView, isGeneratingPrint, isCapturingImage } = this.state;
    const filteredEvents = this.getFilteredEvents();

    Logger.info(`Rendering Legendary Print Preview for ${moment(selectedDate).format('MMMM YYYY')}`);
    Logger.info(`Rendering Legendary Print Preview for ${moment(selectedDate).format('MMMM YYYY')}`);
    Logger.info(`Total props events: ${this.props.events.length}, Filtered events: ${filteredEvents.length}`);

    const printViewOptions: IChoiceGroupOption[] = [
      { key: 'month', text: 'Month', iconProps: { iconName: 'Calendar' } },
      { key: 'week', text: 'Week', iconProps: { iconName: 'CalendarWeek' } },
      { key: 'day', text: 'Day', iconProps: { iconName: 'CalendarDay' } },
      { key: 'agenda', text: 'Agenda', iconProps: { iconName: 'BulletedList' } }
    ];

    // Create dynamic CSS custom properties for grid line opacity
    const dynamicGridStyles: React.CSSProperties = {
      '--grid-line-opacity': this.props.gridLineOpacity.toString(),
      '--grid-border-color': `rgba(153, 153, 153, ${this.props.gridLineOpacity})`, // #999 with dynamic opacity
    } as React.CSSProperties;

    return (
      <div className={styles.legendaryPrintContainer} style={dynamicGridStyles}>
        {/* Compact Header - Minimized but functional */}
        <div className={styles.printHeader}>
          <div className={styles.headerLeft}>
            <IconButton
              iconProps={{ iconName: 'ChromeClose' }}
              title="Close Print Preview"
              onClick={this.props.onClose}
              className={styles.closeButton}
            />
            <h2 className={styles.headerTitle}>⚔️ Legendary Print 🖨️</h2>
          </div>

          <div className={styles.headerCenter}>
            {printView === 'agenda' ? (
              <Stack horizontal tokens={{ childrenGap: 15 }} verticalAlign="center">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '600' }}>From:</span>
                  <DatePicker
                    value={this.state.agendaStartDate}
                    onSelectDate={this.onAgendaStartDateChange}
                    formatDate={(date) => moment(date).format('MMM D, YYYY')}
                    className={styles.datePicker}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '600' }}>To:</span>
                  <DatePicker
                    value={this.state.agendaEndDate}
                    onSelectDate={this.onAgendaEndDateChange}
                    formatDate={(date) => moment(date).format('MMM D, YYYY')}
                    className={styles.datePicker}
                  />
                </div>
              </Stack>
            ) : (
              <Stack horizontal tokens={{ childrenGap: 15 }} verticalAlign="center">
                <IconButton
                  iconProps={{ iconName: 'ChevronLeft' }}
                  title={printView === 'day' ? 'Previous Day' : printView === 'week' ? 'Previous Week' : 'Previous Month'}
                  onClick={() => {
                    if (printView === 'day') this.navigateDay('prev');
                    else if (printView === 'week') this.navigateWeek('prev');
                    else this.navigateMonth('prev');
                  }}
                  className={styles.navButton}
                />

                <DatePicker
                  value={selectedDate}
                  onSelectDate={this.onDateChange}
                  formatDate={(date) => {
                    if (printView === 'day') {
                      return moment(date).format('dddd, MMMM D, YYYY');
                    } else if (printView === 'week') {
                      const weekStart = moment(date).startOf('week');
                      const weekEnd = moment(date).endOf('week');
                      return `${weekStart.format('MMM D')} - ${weekEnd.format('MMM D, YYYY')}`;
                    }
                    return moment(date).format('MMMM YYYY');
                  }}
                  className={styles.datePicker}
                />

                <IconButton
                  iconProps={{ iconName: 'ChevronRight' }}
                  title={printView === 'day' ? 'Next Day' : printView === 'week' ? 'Next Week' : 'Next Month'}
                  onClick={() => {
                    if (printView === 'day') this.navigateDay('next');
                    else if (printView === 'week') this.navigateWeek('next');
                    else this.navigateMonth('next');
                  }}
                  className={styles.navButton}
                />
              </Stack>
            )}
          </div>

          <div className={styles.headerRight}>
            <ChoiceGroup
              options={printViewOptions}
              selectedKey={printView}
              onChange={this.onPrintViewChange}
              className={styles.viewSelector}
            />

            <Toggle
              label="Force Single Page"
              checked={this.state.forceSinglePage}
              onChange={(ev, checked) => this.setState({ forceSinglePage: !!checked })}
              inlineLabel
              className={styles.singlePageToggle}
            />

            <PrimaryButton
              text={isCapturingImage ? "🎨 Capturing..." : isGeneratingPrint ? "🖨️ Printing..." : "🏆 Legendary Print"}
              onClick={this.generateLegendaryPrint}
              disabled={isGeneratingPrint || isCapturingImage}
              className={styles.printButton}
            />
          </div>
        </div>

        {/* LEGENDARY Preview Area - Maximum Real Estate */}
        <div className={styles.previewArea}>
          <div className={styles.previewContainer}>
            <div className={styles.printSimulation}>
              <div className={styles.printTitle}>
                {printView === 'day'
                  ? `BigCal Day View - ${moment(selectedDate).format('dddd, MMMM D, YYYY')}`
                  : `BigCal ${printView.charAt(0).toUpperCase() + printView.slice(1)} View - ${moment(selectedDate).format('MMMM YYYY')}`
                }
              </div>
              
              {printView === 'month' && (
                <Calendar
                  localizer={localizer}
                  events={filteredEvents}
                  startAccessor="start"
                  endAccessor="end"
                  style={{ height: 'calc(100vh - 200px)' }}
                  views={['month']}
                  view="month"
                  date={selectedDate}
                  toolbar={false}
                  eventPropGetter={this.monthEventStyleGetter}
                  components={{
                    event: this.PrintMonthEvent
                  }}
                  popup={false} // 🏆 LEGENDARY: Disable popup to show all events
                  showAllEvents={true} // 🏆 LEGENDARY: Show all weeks of the month
                  onSelectEvent={() => {}} // Disable event selection for print
                  onSelectSlot={() => {}} // Disable slot selection for print
                  onNavigate={this.onCalendarNavigate}
                  onView={() => {}} // Prevent view changes
                />
              )}

              {printView === 'week' && (
                <Calendar
                  localizer={localizer}
                  events={filteredEvents}
                  startAccessor="start"
                  endAccessor="end"
                  style={{ height: 'calc(100vh - 200px)', width: '100%' }}
                  views={['week']}
                  view="week"
                  date={selectedDate}
                  toolbar={false}
                  min={new Date(2000, 0, 1, 7, 0, 0)} // Start at 7:00 AM - LEGENDARY business hours!
                  eventPropGetter={this.weekEventStyleGetter}
                  components={{
                    event: this.PrintWeekEvent
                  }}
                  popup
                  onSelectEvent={() => {}} // Disable event selection for print
                  onSelectSlot={() => {}} // Disable slot selection for print
                  onNavigate={this.onCalendarNavigate}
                  onView={() => {}} // Prevent view changes
                />
              )}

              {printView === 'day' && (
                <Calendar
                  localizer={localizer}
                  events={filteredEvents}
                  startAccessor="start"
                  endAccessor="end"
                  style={{ height: 'calc(100vh - 200px)', width: '100%' }}
                  views={['day']}
                  view="day"
                  date={selectedDate}
                  toolbar={false}
                  min={new Date(2000, 0, 1, 7, 0, 0)} // Start at 7:00 AM - LEGENDARY business hours!
                  eventPropGetter={this.dayEventStyleGetter}
                  components={{
                    event: this.PrintDayEvent
                  }}
                  popup
                  onSelectEvent={() => {}} // Disable event selection for print
                  onSelectSlot={() => {}} // Disable slot selection for print
                  onNavigate={this.onCalendarNavigate}
                  onView={() => {}} // Prevent view changes
                />
              )}

              {printView === 'agenda' && (
                <Calendar
                  localizer={localizer}
                  events={filteredEvents}
                  startAccessor="start"
                  endAccessor="end"
                  style={{ height: 'calc(100vh - 200px)', width: '100%' }}
                  views={['agenda']}
                  view="agenda"
                  date={selectedDate}
                  toolbar={false}
                  eventPropGetter={this.agendaEventStyleGetter}
                  components={{
                    event: this.PrintAgendaEvent
                  }}
                  popup
                  onSelectEvent={() => {}} // Disable event selection for print
                  onSelectSlot={() => {}} // Disable slot selection for print
                  onNavigate={this.onCalendarNavigate}
                  onView={() => {}} // Prevent view changes
                />
              )}
            </div>
          </div>
        </div>

        {/* 🏆 LEGENDARY: Hidden capture calendar optimized for print */}
        <div
          className="legendary-capture-calendar"
          style={{
            position: 'absolute',
            left: '-9999px',
            top: '-9999px',
            width: '1100px',
            height: '800px',
            backgroundColor: '#ffffff',
            overflow: 'hidden'
          }}
        >
          {printView === 'month' && (
            <Calendar
              localizer={localizer}
              events={filteredEvents}
              startAccessor="start"
              endAccessor="end"
              style={{ height: '800px', width: '1100px' }}
              views={['month']}
              view="month"
              date={selectedDate}
              toolbar={false}
              eventPropGetter={this.monthEventStyleGetter}
              components={{
                event: this.PrintMonthEvent
              }}
              popup={false}
              onSelectEvent={() => {}} // Disable event selection for print
              onSelectSlot={() => {}} // Disable slot selection for print
              onNavigate={this.onCalendarNavigate}
              showAllEvents={true}
            />
          )}

          {printView === 'week' && (
            <Calendar
              localizer={localizer}
              events={filteredEvents}
              startAccessor="start"
              endAccessor="end"
              style={{ height: '800px', width: '1100px' }}
              views={['week']}
              view="week"
              date={selectedDate}
              toolbar={false}
              eventPropGetter={this.weekEventStyleGetter}
              components={{
                event: this.PrintWeekEvent
              }}
              popup={false}
              onSelectEvent={() => {}} // Disable event selection for print
              onSelectSlot={() => {}} // Disable slot selection for print
              onNavigate={this.onCalendarNavigate}
            />
          )}

          {printView === 'day' && (
            <Calendar
              localizer={localizer}
              events={filteredEvents}
              startAccessor="start"
              endAccessor="end"
              style={{ height: '800px', width: '1100px' }}
              views={['day']}
              view="day"
              date={selectedDate}
              toolbar={false}
              eventPropGetter={this.dayEventStyleGetter}
              components={{
                event: this.PrintDayEvent
              }}
              popup={false}
              onSelectEvent={() => {}} // Disable event selection for print
              onSelectSlot={() => {}} // Disable slot selection for print
              onNavigate={this.onCalendarNavigate}
            />
          )}

          {printView === 'agenda' && (
            <Calendar
              localizer={localizer}
              events={filteredEvents}
              startAccessor="start"
              endAccessor="end"
              style={{ height: '800px', width: '1100px' }}
              views={['agenda']}
              view="agenda"
              date={selectedDate}
              toolbar={false}
              eventPropGetter={this.agendaEventStyleGetter}
              components={{
                event: this.PrintAgendaEvent
              }}
              popup
              onSelectEvent={() => {}} // Disable event selection for print
              onSelectSlot={() => {}} // Disable slot selection for print
              onNavigate={this.onCalendarNavigate}
            />
          )}
        </div>
      </div>
    );
  }
}
