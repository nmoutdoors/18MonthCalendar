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
  private gridScrollAreaRef = React.createRef<HTMLDivElement>();
  private monthRefs = new Map<string, HTMLDivElement>();

  public componentDidMount(): void {
    // Auto-scroll to current month's row after component mounts
    setTimeout(() => {
      this.scrollToCurrentMonthRow();
    }, 100);
  }

  public componentDidUpdate(prevProps: IGridViewProps): void {
    // Auto-scroll when current date changes
    if (prevProps.currentDate.getTime() !== this.props.currentDate.getTime()) {
      setTimeout(() => {
        this.scrollToCurrentMonthRow();
      }, 50);
    }
  }

  private scrollToCurrentMonthRow = (): void => {
    const { currentDate } = this.props;
    const currentMonthKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}`;
    const currentMonthElement = this.monthRefs.get(currentMonthKey);

    if (currentMonthElement && this.gridScrollAreaRef.current) {
      console.log('🎯 Scrolling 18-month grid to current month:', currentDate.toDateString());

      // Calculate the row position (3 months per row)
      const months = this.get18MonthRange();
      let currentMonthIndex = -1;
      for (let i = 0; i < months.length; i++) {
        if (months[i].getFullYear() === currentDate.getFullYear() &&
            months[i].getMonth() === currentDate.getMonth()) {
          currentMonthIndex = i;
          break;
        }
      }

      if (currentMonthIndex >= 0) {
        const rowIndex = Math.floor(currentMonthIndex / 3);
        const firstMonthInRow = months[rowIndex * 3];
        const firstMonthKey = `${firstMonthInRow.getFullYear()}-${firstMonthInRow.getMonth()}`;
        const firstMonthElement = this.monthRefs.get(firstMonthKey);

        if (firstMonthElement) {
          firstMonthElement.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }
      }
    }
  };

  /*
  private get18MonthRange = (): Date[] => {
    const months: Date[] = [];
    const current = new Date();

    // Generate 18 months starting from current date (keep original logic)
    for (let i = 0; i < 18; i++) {
      const month = new Date(current.getFullYear(), current.getMonth() + i, 1);
      months.push(month);
    }
    return months;
  };
  */
  private get18MonthRange = (): Date[] => {
    const months: Date[] = [];
    const startDate = new Date(2025, 7, 1);

    for (let i = 0; i < 18; i++) {
      const month = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
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
        <div
          className={styles.gridViewScrollArea}
          ref={this.gridScrollAreaRef}
        >
          <div className={styles.gridViewContent}>
            {this.get18MonthRange().map((month, index) => {
              const monthEvents = allFilteredEvents.filter(event =>
                event.start.getFullYear() === month.getFullYear() &&
                event.start.getMonth() === month.getMonth()
              );
              const isCurrentMonth = month.getFullYear() === currentDate.getFullYear() &&
                                   month.getMonth() === currentDate.getMonth();
              const monthKey = `${month.getFullYear()}-${month.getMonth()}`;

              return (
                <div
                  key={index}
                  ref={(el) => {
                    if (el) {
                      this.monthRefs.set(monthKey, el);
                    }
                  }}
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
      </div>
    );
  }
}
