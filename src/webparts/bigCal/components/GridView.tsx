import * as React from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import * as moment from 'moment';
import { ICalendarEvent } from './ICalendarEvent';
import styles from './BigCal.module.scss';

const localizer = momentLocalizer(moment);

export interface IGridViewProps {
  currentDate: Date;
  allFilteredEvents: ICalendarEvent[];
  eventStyleGetter: (event: ICalendarEvent) => { className: string; style: React.CSSProperties };
  onMonthNavigate: (month: Date) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  MiniCalendarEvent: React.ComponentType<any>;
}

export class GridView extends React.Component<IGridViewProps> {

  private get18MonthRange = (): Date[] => {
    const months: Date[] = [];
    const current = new Date();

    for (let i = 0; i < 18; i++) {
      const month = new Date(current.getFullYear(), current.getMonth() + i, 1);
      months.push(month);
    }
    return months;
  };

  private formatMonthYear = (date: Date): string => {
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  public render(): React.ReactElement {
    const { currentDate, allFilteredEvents, eventStyleGetter, onMonthNavigate, MiniCalendarEvent } = this.props;

    return (
      <div className={styles.gridViewContainer}>
        <div className={styles.gridViewHeader}>
          <h2>18-Month Overview</h2>
        </div>
        <div className={styles.gridViewContent}>
          {this.get18MonthRange().map((month, index) => {
            const monthEvents = allFilteredEvents.filter(event =>
              event.start.getFullYear() === month.getFullYear() &&
              event.start.getMonth() === month.getMonth()
            );
            const isCurrentMonth = month.getFullYear() === currentDate.getFullYear() &&
                                 month.getMonth() === currentDate.getMonth();

            return (
              <div
                key={index}
                className={`${styles.gridCard} ${isCurrentMonth ? styles.currentGridCard : ''}`}
                onClick={() => onMonthNavigate(month)}
              >
                <div className={styles.gridCardHeader}>
                  <h3>{this.formatMonthYear(month)}</h3>
                  <span className={styles.gridCardCount}>({monthEvents.length})</span>
                </div>
                <div style={{ marginTop: '8px' }}>
                  <Calendar
                    localizer={localizer}
                    events={monthEvents}
                    startAccessor="start"
                    endAccessor="end"
                    style={{ height: '400px' }}
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
            );
          })}
        </div>
      </div>
    );
  }
}
