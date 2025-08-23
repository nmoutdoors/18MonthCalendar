import * as React from 'react';
import { IconButton, PrimaryButton, Stack, DatePicker, ChoiceGroup, IChoiceGroupOption } from '@fluentui/react';
import { Calendar, momentLocalizer, View } from 'react-big-calendar';
import * as moment from 'moment';
import { ICalendarEvent } from './ICalendarEvent';
import { Logger } from '../services/LoggingService';
import styles from './LegendaryPrintPreview.module.scss';

// Setup the localizer for react-big-calendar
const localizer = momentLocalizer(moment);

export interface ILegendaryPrintPreviewProps {
  events: ICalendarEvent[];
  isOpen: boolean;
  onClose: () => void;
  currentDate?: Date;
  currentView?: View;
  eventStyleGetter: (event: ICalendarEvent) => { style: React.CSSProperties };
}

export interface ILegendaryPrintPreviewState {
  selectedDate: Date;
  printView: 'month' | 'week' | 'day' | 'agenda';
  isGeneratingPrint: boolean;
}

export class LegendaryPrintPreview extends React.Component<ILegendaryPrintPreviewProps, ILegendaryPrintPreviewState> {
  private printWindowRef: Window | null = null;

  constructor(props: ILegendaryPrintPreviewProps) {
    super(props);

    this.state = {
      selectedDate: props.currentDate || new Date(),
      printView: 'month', // Start with month view - the most requested
      isGeneratingPrint: false
    };
  }

  public componentDidMount(): void {
    // Add ESC key listener for closing
    document.addEventListener('keydown', this.handleKeyDown);
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

  private getFilteredEvents = (): ICalendarEvent[] => {
    const { events } = this.props;
    const { selectedDate, printView } = this.state;

    Logger.info(`Filtering events for ${printView} view, selected date: ${selectedDate.toISOString()}`);
    Logger.info(`Total events available: ${events.length}`);

    // 🔍 CRITICAL DEBUG: Check what events we're actually receiving
    console.log('🔍 PRINT PREVIEW DEBUG - Raw events received:', events.length);
    console.log('🔍 PRINT PREVIEW DEBUG - Sample events:', events.slice(0, 5).map(e => ({
      title: e.title,
      start: e.start,
      startType: typeof e.start,
      startIsDate: e.start instanceof Date,
      month: moment(e.start).format('MMMM YYYY')
    })));

    // Check for August 2025 events specifically
    const august2025Events = events.filter(e => moment(e.start).format('MMMM YYYY') === 'August 2025');
    console.log('🔍 PRINT PREVIEW DEBUG - August 2025 events found:', august2025Events.length);

    // Check for February 2026 events specifically
    const feb2026Events = events.filter(e => moment(e.start).format('MMMM YYYY') === 'February 2026');
    console.log('🔍 PRINT PREVIEW DEBUG - February 2026 events found:', feb2026Events.length);

    if (printView === 'month') {
      // Get events for the entire month - use proper timezone handling
      const startOfCalendar = moment(selectedDate).startOf('month').startOf('week').startOf('day').toDate();
      const endOfCalendar = moment(selectedDate).endOf('month').endOf('week').endOf('day').toDate();

      Logger.debug(`Calendar range: ${startOfCalendar.toISOString()} to ${endOfCalendar.toISOString()}`);

      console.log('🔍 FILTERING DEBUG - Selected month:', moment(selectedDate).format('MMMM YYYY'));

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

        // Debug specific months
        if (moment(selectedDate).format('MMMM YYYY') === 'August 2025') {
          console.log('🔧 FIXED FILTER - Event:', event.title, 'Start:', eventStartMoment.format('YYYY-MM-DD'), 'Month:', eventStartMoment.format('MMMM'), 'isInRange:', isInRange);
        }

        if (isInRange) {
          Logger.debug(`Including event: ${event.title} (${eventStartMoment.format('YYYY-MM-DD')})`);
        }

        return isInRange;
      });

      Logger.info(`Filtered events count: ${filteredEvents.length}`);
      return filteredEvents;
    }

    // For other views, we'll implement later
    return events;
  };

  private generateLegendaryPrint = async (): Promise<void> => {
    this.setState({ isGeneratingPrint: true });

    try {
      const filteredEvents = this.getFilteredEvents();
      const { printView, selectedDate } = this.state;

      // Generate the legendary print content
      const printContent = this.generatePrintHTML(filteredEvents, printView, selectedDate);

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

  private generatePrintHTML = (events: ICalendarEvent[], printView: string, selectedDate: Date): string => {
    const title = `BigCal ${printView.charAt(0).toUpperCase() + printView.slice(1)} View - ${moment(selectedDate).format('MMMM YYYY')}`;
    
    // For now, focus on month view - we'll add others later
    if (printView === 'month') {
      return this.generateMonthPrintHTML(events, selectedDate, title);
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

  // Print-specific month event component (similar to BigCal's MonthEvent)
  private PrintMonthEvent = ({ event }: { event: ICalendarEvent }): React.ReactElement => {
    // 🔍 DEBUG: Check if this component is being called
    console.log('🔍 PrintMonthEvent called for:', event.title, 'Date:', moment(event.start).format('YYYY-MM-DD'));

    // Holiday events get special display
    if (event.isHoliday) {
      return (
        <div style={{
          fontSize: '11px',
          padding: '1px 3px',
          backgroundColor: '#ff9800',
          color: 'white',
          border: '2px solid blue',  // 🔍 DEBUG: Make holidays super visible
          minHeight: '20px',         // 🔍 DEBUG: Ensure minimum height
          zIndex: 9999,              // 🔍 DEBUG: Bring to front
          position: 'relative'       // 🔍 DEBUG: Ensure positioning
        }}>
          🏛️ {event.title}{event.isObserved && ' (obs)'}
        </div>
      );
    }

    // Get proper event styling instead of hardcoded red
    const eventStyle = this.props.eventStyleGetter(event);
    const backgroundColor = eventStyle.style.backgroundColor || '#0078d4';

    // Private events get locked icon
    const iconEmoji = event.isPrivate ? '🔒' : '';

    return (
      <div style={{
        fontSize: '11px',
        padding: '1px 3px',
        backgroundColor,
        color: 'white',
        border: '2px solid red',  // 🔍 DEBUG: Make events super visible
        minHeight: '20px',        // 🔍 DEBUG: Ensure minimum height
        zIndex: 9999,             // 🔍 DEBUG: Bring to front
        position: 'relative'      // 🔍 DEBUG: Ensure positioning
      }}>
        {iconEmoji} {event.title}
      </div>
    );
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

  public render(): React.ReactElement<ILegendaryPrintPreviewProps> {
    if (!this.props.isOpen) {
      return <div />;
    }

    const { selectedDate, printView, isGeneratingPrint } = this.state;
    const filteredEvents = this.getFilteredEvents();

    Logger.info(`Rendering Legendary Print Preview for ${moment(selectedDate).format('MMMM YYYY')}`);
    Logger.info(`Rendering Legendary Print Preview for ${moment(selectedDate).format('MMMM YYYY')}`);
    Logger.info(`Total props events: ${this.props.events.length}, Filtered events: ${filteredEvents.length}`);

    // 🔍 CRITICAL DEBUG: Check what we're passing to react-big-calendar
    console.log('🔍 REACT-BIG-CALENDAR DEBUG - Events being passed:', filteredEvents.length);

    // 🔍 COMPARE: August 2025 vs February 2026 event data structure
    const currentMonth = moment(selectedDate).format('MMMM YYYY');
    console.log('🔍 MONTH COMPARISON - Current month:', currentMonth);

    if (currentMonth === 'August 2025' && filteredEvents.length > 0) {
      console.log('🔍 AUGUST EVENT STRUCTURE:', filteredEvents[0]);
    }

    if (currentMonth === 'February 2026' && filteredEvents.length > 0) {
      console.log('🔍 FEBRUARY EVENT STRUCTURE:', filteredEvents[0]);
    }

    console.log('🔍 REACT-BIG-CALENDAR DEBUG - First 3 events:', filteredEvents.slice(0, 3).map(e => ({
      title: e.title,
      start: e.start,
      end: e.end,
      startIsDate: e.start instanceof Date,
      endIsDate: e.end instanceof Date,
      startISO: e.start instanceof Date ? e.start.toISOString() : 'NOT A DATE',
      endISO: e.end instanceof Date ? e.end.toISOString() : 'NOT A DATE'
    })));

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
            <h2 className={styles.headerTitle}>🖨️ Legendary Print Preview</h2>
          </div>

          <div className={styles.headerCenter}>
            <Stack horizontal tokens={{ childrenGap: 15 }} verticalAlign="center">
              <IconButton
                iconProps={{ iconName: 'ChevronLeft' }}
                title="Previous Month"
                onClick={() => this.navigateMonth('prev')}
                className={styles.navButton}
              />
              
              <DatePicker
                value={selectedDate}
                onSelectDate={this.onDateChange}
                formatDate={(date) => moment(date).format('MMMM YYYY')}
                className={styles.datePicker}
              />
              
              <IconButton
                iconProps={{ iconName: 'ChevronRight' }}
                title="Next Month"
                onClick={() => this.navigateMonth('next')}
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
            
            <PrimaryButton
              text="🚀 Print"
              iconProps={{ iconName: 'Print' }}
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
                BigCal {printView.charAt(0).toUpperCase() + printView.slice(1)} View - {moment(selectedDate).format('MMMM YYYY')}
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
                  className={styles.legendaryCalendar}
                  onNavigate={() => {}} // Prevent navigation
                  onView={() => {}} // Prevent view changes
                  components={{
                    event: this.PrintMonthEvent,
                    month: {
                      dateHeader: ({ date, label }) => (
                        <div style={{ padding: '8px', fontWeight: 600, fontSize: '14px' }}>
                          {label}
                        </div>
                      )
                    }
                  }}
                />
              )}
              
              {printView !== 'month' && (
                <div className={styles.comingSoon}>
                  <h3>🚧 {printView.charAt(0).toUpperCase() + printView.slice(1)} View Coming Soon!</h3>
                  <p>We&apos;re building legendary print support for all views. Month view is ready to rock! 🎸</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
}
