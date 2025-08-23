import * as React from 'react';
import { IconButton, PrimaryButton, Stack, DatePicker, ChoiceGroup, IChoiceGroupOption, Toggle } from '@fluentui/react';
import { Calendar, momentLocalizer, View } from 'react-big-calendar';
import * as moment from 'moment';
import { ICalendarEvent } from './ICalendarEvent';
import { Logger } from '../services/LoggingService';
import styles from './LegendaryPrintPreview.module.scss';
import bigCalStyles from './BigCal.module.scss';

// Setup the localizer for react-big-calendar
const localizer = momentLocalizer(moment);

export interface ILegendaryPrintPreviewProps {
  events: ICalendarEvent[];
  isOpen: boolean;
  onClose: () => void;
  currentDate?: Date;
  currentView?: View;
  eventStyleGetter: (event: ICalendarEvent) => { style: React.CSSProperties };
  dynamicIconMappings: Map<string, string>;
}

export interface ILegendaryPrintPreviewState {
  selectedDate: Date;
  printView: 'month' | 'week' | 'day' | 'agenda';
  isGeneratingPrint: boolean;
  forceSinglePage: boolean;
}

export class LegendaryPrintPreview extends React.Component<ILegendaryPrintPreviewProps, ILegendaryPrintPreviewState> {
  private printWindowRef: Window | null = null;

  constructor(props: ILegendaryPrintPreviewProps) {
    super(props);

    this.state = {
      selectedDate: props.currentDate || new Date(),
      printView: 'month', // Start with month view - the most requested
      isGeneratingPrint: false,
      forceSinglePage: false
    };
  }

  public componentDidMount(): void {
    // Add ESC key listener for closing
    document.addEventListener('keydown', this.handleKeyDown);
  }

  public componentDidUpdate(prevProps: ILegendaryPrintPreviewProps): void {
    // If the modal was closed and is now opening, update to current calendar date
    if (this.props.isOpen && !prevProps.isOpen && this.props.currentDate) {
      this.setState({ selectedDate: this.props.currentDate });
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
      this.setState({ selectedDate: date });
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

    this.setState({ selectedDate: newDate });
  };

  private navigateWeek = (direction: 'prev' | 'next'): void => {
    const { selectedDate } = this.state;
    const newDate = moment(selectedDate);

    if (direction === 'prev') {
      newDate.subtract(1, 'week');
    } else {
      newDate.add(1, 'week');
    }

    this.setState({ selectedDate: newDate.toDate() });
  };

  private navigateDay = (direction: 'prev' | 'next'): void => {
    const { selectedDate } = this.state;
    const newDate = moment(selectedDate);

    if (direction === 'prev') {
      newDate.subtract(1, 'day');
    } else {
      newDate.add(1, 'day');
    }

    this.setState({ selectedDate: newDate.toDate() });
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

    // For other views, we'll implement later
    return events;
  };

  private generateLegendaryPrint = async (): Promise<void> => {
    this.setState({ isGeneratingPrint: true });

    try {
      const filteredEvents = this.getFilteredEvents();
      const { printView, selectedDate, forceSinglePage } = this.state;

      // Generate the legendary print content
      const printContent = this.generatePrintHTML(filteredEvents, printView, selectedDate, forceSinglePage);

      // Open print window with legendary styling
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

        Logger.info(`Legendary print generated for ${printView} view`);
      } else {
        throw new Error('Unable to open print window. Please check your browser settings.');
      }

    } catch (error) {
      Logger.error('Error generating legendary print', error);
      alert('Unable to generate print. Please try again.');
    } finally {
      this.setState({ isGeneratingPrint: false });
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

    return `<html><body><h1>Print view ${printView} coming soon!</h1></body></html>`;
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
              margin-bottom: 20px;
              border-bottom: 2px solid #0078d4;
              padding-bottom: 10px;
            }
            .print-header h1 {
              margin: 0;
              color: #0078d4;
              font-size: 24px;
              font-weight: 600;
            }
            .calendar-grid {
              width: 100%;
              border-collapse: collapse;
              height: 600px;
            }
            .calendar-grid th,
            .calendar-grid td {
              border: 1px solid #ccc;
              padding: 4px;
              vertical-align: top;
            }
            .calendar-grid th {
              background-color: #0078d4;
              color: white;
              text-align: center;
              font-weight: 600;
              height: 30px;
            }
            .calendar-grid td {
              height: 85px;
              width: 14.28%;
            }
            .day-number {
              font-weight: 600;
              font-size: 14px;
              margin-bottom: 4px;
            }
            .event-item {
              font-size: 9px;
              margin: 1px 0;
              padding: 1px 3px;
              border-radius: 2px;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
              line-height: 1.1;
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

  // 🎯 EXACT COPY of BigCal's MonthEvent - adapted for print (no mouse events)
  private PrintMonthEvent = ({ event }: { event: ICalendarEvent }): React.ReactElement => {
    // Holiday events get special display
    if (event.isHoliday) {
      return (
        <div className={`${bigCalStyles.customEvent} ${bigCalStyles.monthEventItem}`}>
          <span
            className={bigCalStyles.eventIcon}
            style={{ fontSize: '14px', marginRight: '4px' }}
          >
            🏛️
          </span>
          <span className={bigCalStyles.eventTitle}>
            {event.title}
            {event.isObserved && ' (obs)'}
          </span>
        </div>
      );
    }

    // Private events get locked icon, regular events get dynamic category icon
    const iconEmoji = event.isPrivate ? '🔒' : this.getEventIconFromMapping(event.swimlane!, event.status || '');

    return (
      <div className={`${bigCalStyles.customEvent} ${bigCalStyles.monthEventItem}`}>
        <span
          className={bigCalStyles.eventIcon}
          style={{ fontSize: '14px', marginRight: '4px' }}
        >
          {iconEmoji}
        </span>
        <span className={bigCalStyles.eventTitle}>{event.title}</span>
      </div>
    );
  };

  // 🎯 EXACT COPY of BigCal's EventComponent - adapted for print (no mouse events)
  private PrintWeekEvent = ({ event }: { event: ICalendarEvent }): React.ReactElement => {
    // Holiday events get special display
    if (event.isHoliday) {
      return (
        <div className={bigCalStyles.customEvent}>
          <span
            className={bigCalStyles.eventIcon}
            style={{ fontSize: '16px', marginRight: '6px' }}
          >
            🏛️
          </span>
          <span className={bigCalStyles.eventTitle}>
            {event.title}
            {event.isObserved && ' (observed)'}
          </span>
        </div>
      );
    }

    // Private events get locked icon, regular events get dynamic category icon
    const iconEmoji = event.isPrivate ? '🔒' : this.getEventIconFromMapping(event.swimlane!, event.status || '');

    return (
      <div className={bigCalStyles.customEvent}>
        <span
          className={bigCalStyles.eventIcon}
          style={{ fontSize: '16px', marginRight: '6px' }}
        >
          {iconEmoji}
        </span>
        <span className={bigCalStyles.eventTitle}>{event.title}</span>
      </div>
    );
  };

  // 🎯 EXACT COPY of BigCal's EventComponent - adapted for Day print view
  private PrintDayEvent = ({ event }: { event: ICalendarEvent }): React.ReactElement => {
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
    // Generate the month grid HTML - basic version for now
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

    // Calendar body
    html += '<tbody>';
    const current = moment(startOfCalendar);
    
    while (current.isSameOrBefore(endOfCalendar)) {
      html += '<tr>';
      for (let i = 0; i < 7; i++) {
        const currentDateStr = current.format('YYYY-MM-DD');
        const dayEvents = events.filter(event => {
          // Use moment.js consistently for date comparison
          const eventStartMoment = moment(event.start);
          const eventDateStr = eventStartMoment.format('YYYY-MM-DD');
          return eventDateStr === currentDateStr;
        });

        // Debug logging for days with events
        if (dayEvents.length > 0) {
          Logger.debug(`Print grid - Day ${currentDateStr} has ${dayEvents.length} events`);
        }

        html += `<td>`;
        html += `<div class="day-number">${current.date()}</div>`;

        dayEvents.forEach(event => {
          const eventStyle = this.props.eventStyleGetter(event);
          const backgroundColor = eventStyle.style.backgroundColor || '#0078d4';
          html += `<div class="event-item" style="background-color: ${backgroundColor};">${event.title}</div>`;
        });

        html += `</td>`;
        current.add(1, 'day');
      }
      html += '</tr>';
    }
    
    html += '</tbody></table>';
    return html;
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

          html += `<div class="week-event" style="background-color: ${backgroundColor};">`;
          html += `${iconEmoji} ${event.title}`;
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

  public render(): React.ReactElement<ILegendaryPrintPreviewProps> {
    if (!this.props.isOpen) {
      return <div />;
    }

    const { selectedDate, printView, isGeneratingPrint } = this.state;
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

    return (
      <div className={styles.legendaryPrintContainer}>
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
              text="Legendary Print"
              onClick={this.generateLegendaryPrint}
              disabled={isGeneratingPrint}
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
                  eventPropGetter={this.props.eventStyleGetter}
                  components={{
                    event: this.PrintMonthEvent
                  }}
                  popup
                  onSelectEvent={() => {}} // Disable event selection for print
                  onSelectSlot={() => {}} // Disable slot selection for print
                  onNavigate={() => {}} // Prevent navigation
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
                  eventPropGetter={this.props.eventStyleGetter}
                  components={{
                    event: this.PrintWeekEvent
                  }}
                  popup
                  onSelectEvent={() => {}} // Disable event selection for print
                  onSelectSlot={() => {}} // Disable slot selection for print
                  onNavigate={() => {}} // Prevent navigation
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
                  eventPropGetter={this.props.eventStyleGetter}
                  components={{
                    event: this.PrintDayEvent
                  }}
                  popup
                  onSelectEvent={() => {}} // Disable event selection for print
                  onSelectSlot={() => {}} // Disable slot selection for print
                  onNavigate={() => {}} // Prevent navigation
                  onView={() => {}} // Prevent view changes
                />
              )}

              {printView === 'agenda' && (
                <div className={styles.comingSoon}>
                  <h3>🚧 Agenda View Coming Soon!</h3>
                  <p>We&apos;re building legendary agenda print support. Month, Week, and Day views are ready to rock! 🎸</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
}
