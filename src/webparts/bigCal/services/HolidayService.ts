export interface IHoliday {
  date: Date;
  name: string;
  isObserved?: boolean; // For holidays like July 4th observed on July 3rd
}

export interface IHolidayEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  isHoliday: true;
  isObserved?: boolean;
  allDay: true;
}

export class HolidayService {
  private static holidays: IHoliday[] = [
    // 2025 Holidays
    { date: new Date(2025, 8, 1), name: 'Labor Day' }, // September 1, 2025
    { date: new Date(2025, 9, 13), name: 'Columbus Day' }, // October 13, 2025
    { date: new Date(2025, 10, 11), name: 'Veterans Day' }, // November 11, 2025
    { date: new Date(2025, 10, 27), name: 'Thanksgiving Day' }, // November 27, 2025
    { date: new Date(2025, 11, 25), name: 'Christmas Day' }, // December 25, 2025

    // 2026 Holidays
    { date: new Date(2026, 0, 1), name: 'New Year\'s Day' }, // January 1, 2026
    { date: new Date(2026, 0, 19), name: 'Martin Luther King Jr. Day' }, // January 19, 2026
    { date: new Date(2026, 1, 16), name: 'Washington\'s Birthday (Presidents\' Day)' }, // February 16, 2026
    { date: new Date(2026, 4, 25), name: 'Memorial Day' }, // May 25, 2026
    { date: new Date(2026, 5, 19), name: 'Juneteenth National Independence Day' }, // June 19, 2026
    { date: new Date(2026, 6, 3), name: 'Independence Day (observed)', isObserved: true }, // July 3, 2026
    { date: new Date(2026, 8, 7), name: 'Labor Day' }, // September 7, 2026
    { date: new Date(2026, 9, 12), name: 'Columbus Day' }, // October 12, 2026
    { date: new Date(2026, 10, 11), name: 'Veterans Day' }, // November 11, 2026
    { date: new Date(2026, 10, 26), name: 'Thanksgiving Day' }, // November 26, 2026
    { date: new Date(2026, 11, 25), name: 'Christmas Day' } // December 25, 2026
  ];

  /**
   * Get all holidays
   */
  public static getAllHolidays(): IHoliday[] {
    return this.holidays;
  }

  /**
   * Get holidays for a specific month and year
   */
  public static getHolidaysForMonth(year: number, month: number): IHoliday[] {
    const result: IHoliday[] = [];
    for (let i = 0; i < this.holidays.length; i++) {
      const holiday = this.holidays[i];
      if (holiday.date.getFullYear() === year && holiday.date.getMonth() === month) {
        result.push(holiday);
      }
    }
    return result;
  }

  /**
   * Check if a specific date is a holiday
   */
  public static isHoliday(date: Date): IHoliday | undefined {
    for (let i = 0; i < this.holidays.length; i++) {
      const holiday = this.holidays[i];
      if (holiday.date.getFullYear() === date.getFullYear() &&
          holiday.date.getMonth() === date.getMonth() &&
          holiday.date.getDate() === date.getDate()) {
        return holiday;
      }
    }
    return undefined;
  }

  /**
   * Get holidays within a date range
   */
  public static getHolidaysInRange(startDate: Date, endDate: Date): IHoliday[] {
    const result: IHoliday[] = [];
    for (let i = 0; i < this.holidays.length; i++) {
      const holiday = this.holidays[i];
      if (holiday.date >= startDate && holiday.date <= endDate) {
        result.push(holiday);
      }
    }
    return result;
  }

  /**
   * Format holiday name for display (handles observed holidays)
   */
  public static formatHolidayName(holiday: IHoliday): string {
    return holiday.name;
  }

  /**
   * Get holiday display class for CSS styling
   */
  public static getHolidayClass(holiday: IHoliday): string {
    return holiday.isObserved ? 'holiday-observed' : 'holiday-standard';
  }

  /**
   * Convert holidays to calendar events
   */
  public static getHolidayEvents(): IHolidayEvent[] {
    return this.holidays.map((holiday, index) => ({
      id: `holiday-${index}`,
      title: holiday.name,
      start: new Date(holiday.date.getFullYear(), holiday.date.getMonth(), holiday.date.getDate(), 0, 0, 0),
      end: new Date(holiday.date.getFullYear(), holiday.date.getMonth(), holiday.date.getDate(), 23, 59, 59),
      isHoliday: true as const,
      isObserved: holiday.isObserved,
      allDay: true as const
    }));
  }

  /**
   * Get holiday events within a date range
   */
  public static getHolidayEventsInRange(startDate: Date, endDate: Date): IHolidayEvent[] {
    const allHolidayEvents = this.getHolidayEvents();
    return allHolidayEvents.filter(event =>
      event.start >= startDate && event.start <= endDate
    );
  }
}
