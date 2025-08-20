import * as React from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import * as moment from 'moment';
import { ICalendarEvent } from './ICalendarEvent';
import styles from './BigCal.module.scss';

const localizer = momentLocalizer(moment);

export interface IMiniCalendarPanelProps {
  currentDate: Date;
  allFilteredEvents: ICalendarEvent[];
  eventStyleGetter: (event: ICalendarEvent) => { className: string; style: React.CSSProperties };
  onMonthNavigate: (month: Date) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  MiniCalendarEvent: React.ComponentType<any>;
}

export class MiniCalendarPanel extends React.Component<IMiniCalendarPanelProps> {

  private get18MonthRange = (): Date[] => {
    const months: Date[] = [];
    const current = new Date();

    for (let i = 0; i < 18; i++) {
      const month = new Date(current.getFullYear(), current.getMonth() + i, 1);
      months.push(month);
    }
    return months;
  };

  private getEventsForMonth = (month: Date): number => {
    const { allFilteredEvents } = this.props;
    return allFilteredEvents.filter(event => {
      return event.start.getFullYear() === month.getFullYear() &&
             event.start.getMonth() === month.getMonth();
    }).length;
  };

  private formatMonthYear = (date: Date): string => {
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  public render(): React.ReactElement {
    const { currentDate, allFilteredEvents, eventStyleGetter, onMonthNavigate, MiniCalendarEvent } = this.props;

    return (
      <div className={styles.miniCalendarContainer}>
        <div className={styles.miniCalendarScrollArea}>
          {this.get18MonthRange().map((month, index) => {
            const monthEvents = this.getEventsForMonth(month);
            const isCurrentMonth = month.getFullYear() === currentDate.getFullYear() &&
                                 month.getMonth() === currentDate.getMonth();
            return (
              <div key={index} className={styles.miniCalendarWrapper}>
                <div
                  className={`${styles.miniCalendarCard} ${isCurrentMonth ? styles.currentMonth : ''}`}
                  onClick={() => onMonthNavigate(month)}
                >
                  <div className={styles.miniCalendarCard}>
                    <h4>{this.formatMonthYear(month)}</h4>
                    <span className={styles.miniCalendarContent}>({monthEvents})</span>
                  </div>
                  <div className={styles.miniCalendarContent}>
                    {/* Mini calendar will be rendered here */}
                    <Calendar
                      localizer={localizer}
                      events={allFilteredEvents.filter(event =>
                        event.start.getFullYear() === month.getFullYear() &&
                        event.start.getMonth() === month.getMonth()
                      )}
                      startAccessor="start"
                      endAccessor="end"
                      style={{ height: '200px' }}
                      views={['month']}
                      view="month"
                      date={month}
                      toolbar={false}
                      eventPropGetter={eventStyleGetter}
                      components={{
                        event: MiniCalendarEvent
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
}
