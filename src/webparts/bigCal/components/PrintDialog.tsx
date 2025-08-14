import * as React from 'react';
import { PrimaryButton, DefaultButton } from '@fluentui/react/lib/Button';
import { DatePicker } from '@fluentui/react/lib/DatePicker';
import { Dialog, DialogType, DialogFooter } from '@fluentui/react/lib/Dialog';
import { Stack } from '@fluentui/react/lib/Stack';
import { Text } from '@fluentui/react/lib/Text';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';

import { ChoiceGroup, IChoiceGroupOption } from '@fluentui/react/lib/ChoiceGroup';
import { Calendar, momentLocalizer, View } from 'react-big-calendar';
import * as moment from 'moment';
import { ICalendarEvent } from './ICalendarEvent';
import { Logger } from '../services/LoggingService';
import styles from './PrintDialog.module.scss';

// Setup the localizer for react-big-calendar
const localizer = momentLocalizer(moment);

export interface IPrintDialogProps {
  events: ICalendarEvent[];
  isOpen: boolean;
  onDismiss: () => void;
  currentDate?: Date;
  currentView?: View;
  colorPalette: string;
  eventStyleGetter: (event: ICalendarEvent) => { style: React.CSSProperties };
}

export interface IPrintDialogState {
  startDate: Date;
  endDate: Date;
  isPrinting: boolean;
  printMessage: string;
  printMessageType: MessageBarType;
  printType: 'month' | 'agenda';
  showPreview: boolean;
}

export class PrintDialog extends React.Component<IPrintDialogProps, IPrintDialogState> {
  private printWindowRef: Window | null = null;

  constructor(props: IPrintDialogProps) {
    super(props);

    const defaultState = this.getDefaultStateForDate(props.currentDate);
    this.state = defaultState;
  }

  public componentDidUpdate(prevProps: IPrintDialogProps): void {
    // If the modal was closed and is now opening, update default dates
    if (this.props.isOpen && !prevProps.isOpen) {
      const defaultState = this.getDefaultStateForDate(this.props.currentDate);
      this.setState({
        startDate: defaultState.startDate,
        endDate: defaultState.endDate,
        printType: this.props.currentView === 'agenda' ? 'agenda' : 'month',
        printMessage: '',
        showPreview: false
      });
    }
  }

  private getDefaultStateForDate = (currentDate?: Date): IPrintDialogState => {
    // Use current calendar date or today as reference
    const referenceDate = currentDate || new Date();

    // Get first day of the month
    const firstDayOfMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);

    // Get last day of the month
    const lastDayOfMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0);

    return {
      startDate: firstDayOfMonth,
      endDate: lastDayOfMonth,
      isPrinting: false,
      printMessage: '',
      printMessageType: MessageBarType.info,
      printType: 'month',
      showPreview: false
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

  private onPrintTypeChange = (ev?: React.FormEvent<HTMLElement | HTMLInputElement>, option?: IChoiceGroupOption): void => {
    if (option) {
      this.setState({ printType: option.key as 'month' | 'agenda' });
    }
  };

  private getFilteredEvents = (): ICalendarEvent[] => {
    const { events } = this.props;
    const { startDate, endDate } = this.state;

    return events.filter(event => {
      const eventStart = event.start;
      const eventEnd = event.end;

      // Include events that start, end, or span within the date range
      return (eventStart >= startDate && eventStart <= endDate) ||
             (eventEnd >= startDate && eventEnd <= endDate) ||
             (eventStart <= startDate && eventEnd >= endDate);
    });
  };

  private showPreview = (): void => {
    this.setState({ showPreview: true });
  };

  private hidePreview = (): void => {
    this.setState({ showPreview: false });
  };

  private printCalendar = (): void => {
    this.setState({ isPrinting: true, printMessage: '' });

    try {
      const filteredEvents = this.getFilteredEvents();
      const { printType, startDate, endDate } = this.state;

      // Create print content
      const printContent = this.generatePrintContent(filteredEvents, printType, startDate, endDate);

      // Open print window
      this.printWindowRef = window.open('', '_blank', 'width=800,height=600');
      
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

        this.setState({
          printMessage: `Print dialog opened for ${printType} view`,
          printMessageType: MessageBarType.success,
          isPrinting: false
        });
      } else {
        throw new Error('Unable to open print window. Please check your browser settings.');
      }

    } catch (error) {
      Logger.error('Print error', error);
      this.setState({
        printMessage: 'An error occurred while preparing the print. Please try again.',
        printMessageType: MessageBarType.error,
        isPrinting: false
      });
    }
  };

  private generatePrintContent = (events: ICalendarEvent[], printType: 'month' | 'agenda', startDate: Date, endDate: Date): string => {
    const title = printType === 'month' 
      ? `Calendar - ${startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
      : `Calendar Agenda - ${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} to ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

    if (printType === 'month') {
      return this.generateMonthPrintContent(events, startDate, title);
    } else {
      return this.generateAgendaPrintContent(events, startDate, endDate, title);
    }
  };

  private generateMonthPrintContent = (events: ICalendarEvent[], monthDate: Date, title: string): string => {
    // Generate calendar grid for the month
    const calendarHtml = this.generateMonthCalendarGrid(events, monthDate);

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <style>
            @media print {
              body {
                margin: 0;
                padding: 20px;
                font-family: Arial, sans-serif;
                -webkit-print-color-adjust: exact;
                color-adjust: exact;
              }
              .print-header {
                text-align: center;
                margin-bottom: 30px;
                border-bottom: 2px solid #333;
                padding-bottom: 15px;
              }
              .print-header h1 {
                margin: 0;
                font-size: 28px;
                color: #333;
                font-weight: 600;
              }
              .calendar-month {
                width: 100%;
                border-collapse: collapse;
                margin-top: 20px;
              }
              .calendar-month th, .calendar-month td {
                border: 1px solid #ccc;
                padding: 8px;
                vertical-align: top;
              }
              .calendar-month th {
                background-color: #f5f5f5;
                text-align: center;
                font-weight: 600;
                font-size: 14px;
                color: #333;
                height: 30px;
              }
              .calendar-month td {
                height: 120px;
                width: 14.28%;
                position: relative;
              }
              .day-number {
                font-weight: 600;
                font-size: 14px;
                color: #333;
                margin-bottom: 4px;
              }
              .event-item {
                font-size: 10px;
                margin: 2px 0;
                padding: 2px 4px;
                border-radius: 2px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                line-height: 1.2;
              }
              .other-month {
                background-color: #fafafa;
                color: #ccc;
              }
              .today {
                background-color: #fff3e0;
              }
              .today .day-number {
                color: #ff9800;
                font-weight: 700;
              }
              @page { margin: 0.75in; }
            }
          </style>
        </head>
        <body>
          <div class="print-header">
            <h1>${title}</h1>
            <p class="print-date">${events.length} events</p>
          </div>
          <div id="calendar-content">
            ${calendarHtml}
          </div>
        </body>
      </html>
    `;
  };

  private generateMonthCalendarGrid = (events: ICalendarEvent[], monthDate: Date): string => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();

    // Get first day of month and calculate starting date for calendar grid
    const firstDay = new Date(year, month, 1);
    const startDateForGrid = new Date(firstDay.getTime());
    startDateForGrid.setTime(startDateForGrid.getTime() - (firstDay.getDay() * 24 * 60 * 60 * 1000)); // Go back to Sunday

    // Generate 6 weeks of calendar
    const weeks = [];
    const currentDate = new Date(startDateForGrid.getTime());

    for (let week = 0; week < 6; week++) {
      const weekDays = [];
      for (let day = 0; day < 7; day++) {
        const dayEvents = events.filter(event => {
          const eventDate = event.start;
          return eventDate.toDateString() === currentDate.toDateString();
        });

        weekDays.push({
          date: new Date(currentDate.getTime()),
          events: dayEvents,
          isCurrentMonth: currentDate.getMonth() === month,
          isToday: currentDate.toDateString() === new Date().toDateString()
        });

        currentDate.setTime(currentDate.getTime() + 24 * 60 * 60 * 1000); // Add one day
      }
      weeks.push(weekDays);
    }

    // Generate HTML
    let html = '<table class="calendar-month">';

    // Header row
    html += '<thead><tr>';
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    dayNames.forEach(dayName => {
      html += `<th>${dayName}</th>`;
    });
    html += '</tr></thead>';

    // Calendar body
    html += '<tbody>';
    weeks.forEach(week => {
      html += '<tr>';
      week.forEach(day => {
        const cellClass = [];
        if (!day.isCurrentMonth) cellClass.push('other-month');
        if (day.isToday) cellClass.push('today');

        html += `<td class="${cellClass.join(' ')}">`;
        html += `<div class="day-number">${day.date.getDate()}</div>`;

        if (day.events.length > 0) {
          html += '<div class="day-events">';
          day.events.forEach(event => {
            const eventStyle = this.props.eventStyleGetter(event);
            const backgroundColor = eventStyle.style.backgroundColor || '#0078d4';
            html += `<div class="event-item" style="background-color: ${backgroundColor}; border-left: 3px solid ${backgroundColor};">${event.title}</div>`;
          });
          html += '</div>';
        }

        html += '</td>';
      });
      html += '</tr>';
    });
    html += '</tbody></table>';

    return html;
  };

  private generateAgendaPrintContent = (events: ICalendarEvent[], startDate: Date, endDate: Date, title: string): string => {
    // Sort events by date and time
    const sortedEvents = events.sort((a, b) => {
      const dateCompare = a.start.getTime() - b.start.getTime();
      if (dateCompare !== 0) return dateCompare;
      return a.start.getTime() - b.start.getTime();
    });

    let agendaHtml = '';
    let currentDate = '';

    sortedEvents.forEach(event => {
      const eventDate = event.start.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });

      // Add date header if this is a new date
      if (eventDate !== currentDate) {
        currentDate = eventDate;
        agendaHtml += `<div class="date-header">${eventDate}</div>`;
      }

      // Format time
      const timeStr = event.allDay 
        ? 'All Day' 
        : `${event.start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} - ${event.end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;

      // Get event style
      const eventStyle = this.props.eventStyleGetter(event);
      const backgroundColor = eventStyle.style.backgroundColor || '#0078d4';

      agendaHtml += `
        <div class="event-row">
          <div class="event-time">${timeStr}</div>
          <div class="event-details">
            <div class="event-title" style="border-left: 4px solid ${backgroundColor};">${event.title}</div>
            ${event.description ? `<div class="event-description">${event.description}</div>` : ''}
            ${event.swimlane ? `<div class="event-category">Category: ${event.swimlane}</div>` : ''}
            ${event.status ? `<div class="event-status">Status: ${event.status}</div>` : ''}
          </div>
        </div>
      `;
    });

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <style>
            @media print {
              body { margin: 0; padding: 20px; font-family: Arial, sans-serif; font-size: 12px; }
              .print-header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 10px; }
              .print-header h1 { margin: 0; font-size: 24px; color: #333; }
              .date-header { font-weight: bold; font-size: 16px; margin: 20px 0 10px 0; color: #0078d4; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
              .event-row { display: flex; margin-bottom: 12px; page-break-inside: avoid; }
              .event-time { width: 120px; font-weight: bold; color: #666; flex-shrink: 0; }
              .event-details { flex: 1; }
              .event-title { font-weight: bold; padding-left: 8px; margin-bottom: 4px; }
              .event-description { color: #666; font-style: italic; margin-bottom: 4px; }
              .event-category, .event-status { font-size: 10px; color: #888; }
              @page { margin: 1in; }
            }
          </style>
        </head>
        <body>
          <div class="print-header">
            <h1>${title}</h1>
            <p>${events.length} events</p>
          </div>
          <div class="agenda-content">
            ${agendaHtml || '<p>No events found in the selected date range.</p>'}
          </div>
        </body>
      </html>
    `;
  };

  private renderPreview = (): React.ReactElement => {
    const filteredEvents = this.getFilteredEvents();
    const { printType, startDate, endDate } = this.state;

    if (printType === 'month') {
      return (
        <div className={styles.printPreview}>
          <div className={styles.previewHeader}>
            <h3>Month View Preview</h3>
            <p>{startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} - {filteredEvents.length} events</p>
            <small>This preview shows how your calendar will appear when printed</small>
          </div>
          <div className={styles.previewCalendar}>
            <div className={styles.printSimulation}>
              <div className={styles.printTitle}>
                Calendar - {startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </div>
              <Calendar
                localizer={localizer}
                events={filteredEvents}
                startAccessor="start"
                endAccessor="end"
                style={{ height: '500px' }}
                views={['month']}
                view="month"
                date={startDate}
                toolbar={false}
                eventPropGetter={this.props.eventStyleGetter}
                components={{
                  event: ({ event }) => (
                    <div
                      className={styles.previewEvent}
                      style={{
                        backgroundColor: this.props.eventStyleGetter(event).style.backgroundColor,
                        color: 'white',
                        fontSize: '10px',
                        padding: '1px 3px',
                        borderRadius: '2px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {event.title}
                    </div>
                  )
                }}
              />
            </div>
          </div>
        </div>
      );
    } else {
      // Enhanced Agenda preview with better WYSIWYG representation
      const sortedEvents = filteredEvents.sort((a, b) => a.start.getTime() - b.start.getTime());

      // Group events by date for better preview
      const eventsByDate = new Map<string, ICalendarEvent[]>();
      sortedEvents.forEach(event => {
        const dateKey = event.start.toDateString();
        if (!eventsByDate.has(dateKey)) {
          eventsByDate.set(dateKey, []);
        }
        eventsByDate.get(dateKey)!.push(event);
      });

      return (
        <div className={styles.printPreview}>
          <div className={styles.previewHeader}>
            <h3>Agenda View Preview</h3>
            <p>Calendar Agenda - {startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} to {endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
            <p>{filteredEvents.length} events</p>
            <small>This preview shows how your agenda will appear when printed</small>
          </div>
          <div className={styles.agendaPreview}>
            <div className={styles.printSimulation}>
              <div className={styles.printTitle}>
                Calendar Agenda - {startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} to {endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
              <div className={styles.printSubtitle}>{filteredEvents.length} events</div>

              {eventsByDate.size === 0 ? (
                <div className={styles.noEvents}>No events found in the selected date range.</div>
              ) : (
                (() => {
                  const entries: Array<[string, ICalendarEvent[]]> = [];
                  eventsByDate.forEach((value, key) => entries.push([key, value]));
                  return entries;
                })().map(([dateKey, dayEvents]: [string, ICalendarEvent[]]) => (
                  <div key={dateKey} className={styles.dateGroup}>
                    <div className={styles.dateHeader}>
                      {new Date(dateKey).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                    {dayEvents.map((event: ICalendarEvent, index: number) => {
                      const eventStyle = this.props.eventStyleGetter(event);
                      const timeStr = event.allDay
                        ? 'All Day'
                        : `${event.start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} - ${event.end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;

                      return (
                        <div key={index} className={styles.previewEventRow}>
                          <div className={styles.previewEventTime}>{timeStr}</div>
                          <div className={styles.previewEventDetails}>
                            <div
                              className={styles.previewEventTitle}
                              style={{ borderLeft: `4px solid ${eventStyle.style.backgroundColor || '#0078d4'}` }}
                            >
                              {event.title}
                            </div>
                            {event.description && (
                              <div className={styles.previewEventDescription}>{event.description}</div>
                            )}
                            {event.swimlane && (
                              <div className={styles.previewEventCategory}>Category: {event.swimlane}</div>
                            )}
                            {event.status && (
                              <div className={styles.previewEventStatus}>Status: {event.status}</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      );
    }
  };

  public render(): React.ReactElement<IPrintDialogProps> {
    const dialogContentProps = {
      type: DialogType.normal,
      title: 'Print Calendar',
      subText: 'Print your calendar in Month view or Agenda format.'
    };

    const printTypeOptions: IChoiceGroupOption[] = [
      { key: 'month', text: 'Month View', iconProps: { iconName: 'Calendar' } },
      { key: 'agenda', text: 'Agenda List', iconProps: { iconName: 'BulletedList' } }
    ];

    const filteredEvents = this.getFilteredEvents();

    return (
      <Dialog
        hidden={!this.props.isOpen}
        onDismiss={this.props.onDismiss}
        dialogContentProps={dialogContentProps}
        modalProps={{
          isBlocking: false,
          isDarkOverlay: true
        }}
        minWidth={this.state.showPreview ? 800 : 500}
        maxWidth={this.state.showPreview ? 1000 : 600}
      >
        <div className={styles.printDialog}>
          <Stack tokens={{ childrenGap: 15 }} styles={{ root: { paddingTop: 20 } }}>
            {this.state.printMessage && (
              <MessageBar messageBarType={this.state.printMessageType}>
                {this.state.printMessage}
              </MessageBar>
            )}

            <ChoiceGroup
              label="Print Format"
              options={printTypeOptions}
              selectedKey={this.state.printType}
              onChange={this.onPrintTypeChange}
            />

            <Stack horizontal tokens={{ childrenGap: 20 }}>
              <Stack.Item grow>
                <DatePicker
                  label="Start Date"
                  value={this.state.startDate}
                  onSelectDate={this.onStartDateChange}
                  formatDate={(date) => date ? date.toLocaleDateString() : ''}
                />
              </Stack.Item>
              <Stack.Item grow>
                <DatePicker
                  label="End Date"
                  value={this.state.endDate}
                  onSelectDate={this.onEndDateChange}
                  formatDate={(date) => date ? date.toLocaleDateString() : ''}
                />
              </Stack.Item>
            </Stack>

            <Text variant="medium">
              <strong>{filteredEvents.length}</strong> events will be included in the print
            </Text>

            {this.state.showPreview && this.renderPreview()}
          </Stack>
        </div>
        
        <DialogFooter>
          <PrimaryButton
            onClick={this.printCalendar}
            text="Print"
            disabled={this.state.isPrinting}
            iconProps={{ iconName: 'Print' }}
          />
          <DefaultButton
            onClick={this.state.showPreview ? this.hidePreview : this.showPreview}
            text={this.state.showPreview ? 'Hide Preview' : 'Show Preview'}
            iconProps={{ iconName: this.state.showPreview ? 'Hide' : 'View' }}
          />
          <DefaultButton
            onClick={this.props.onDismiss}
            text="Close"
            disabled={this.state.isPrinting}
          />
        </DialogFooter>
      </Dialog>
    );
  }
}
