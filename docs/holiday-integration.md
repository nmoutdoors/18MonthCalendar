# 🏛️ National Holiday Integration

BigCal includes built-in support for US Federal Holidays displayed as special calendar events across all views.

## ✨ **Features**

### 📅 **Holiday Coverage**
- **18-Month Range**: Covers all holidays from September 2025 through December 2026
- **Federal Holidays**: All major US federal holidays included
- **Observed Dates**: Handles holidays that are observed on different dates (e.g., July 4th observed on July 3rd, 2026)

### 🎨 **Visual Display**
- **Holiday Events**: Holidays appear as special calendar events with distinctive blue styling
- **Government Building Icon**: Holiday events display with a 🏛️ icon for easy identification
- **Non-Editable**: Holiday events cannot be edited or deleted like regular events
- **Consistent Display**: Holiday events appear in all calendar views (Month, Week, Day, Agenda, Grid, Timeline, Mini Calendars)
- **Observed Styling**: Observed holidays display with italic text and "(observed)" suffix
- **Excel Export**: Holiday events are included in Excel exports with 🏛️ icon in the Agenda tab

## 📋 **Included Holidays**

### 2025 Holidays
- **September 1, 2025** - Labor Day
- **October 13, 2025** - Columbus Day
- **November 11, 2025** - Veterans Day
- **November 27, 2025** - Thanksgiving Day
- **December 25, 2025** - Christmas Day

### 2026 Holidays
- **January 1, 2026** - New Year's Day
- **January 19, 2026** - Martin Luther King Jr. Day
- **February 16, 2026** - Washington's Birthday (Presidents' Day)
- **May 25, 2026** - Memorial Day
- **June 19, 2026** - Juneteenth National Independence Day
- **July 3, 2026** - Independence Day (observed) *
- **September 7, 2026** - Labor Day
- **October 12, 2026** - Columbus Day
- **November 11, 2026** - Veterans Day
- **November 26, 2026** - Thanksgiving Day
- **December 25, 2026** - Christmas Day

*\* Observed holidays are displayed with italic styling*

## 🔧 **Technical Implementation**

### HolidayService
The `HolidayService` class manages all holiday data and provides utility methods:

```typescript
// Check if a date is a holiday
const holiday = HolidayService.isHoliday(new Date(2025, 8, 1)); // Labor Day 2025

// Get holidays for a specific month
const holidays = HolidayService.getHolidaysForMonth(2025, 10); // November 2025

// Get holidays in a date range
const rangeHolidays = HolidayService.getHolidaysInRange(startDate, endDate);

// Get holidays as calendar events
const holidayEvents = HolidayService.getHolidayEvents();
```

### Calendar Integration
Holidays are implemented as special calendar events that are merged with regular events:

```typescript
private getAllEventsWithHolidays = (): ICalendarEvent[] => {
  const holidayEvents = HolidayService.getHolidayEvents().map(holiday => ({
    ...holiday,
    swimlane: undefined,
    status: undefined,
    isHoliday: true,
    isObserved: holiday.isObserved
  } as ICalendarEvent));

  return [...this.state.events, ...holidayEvents];
};
```

### Event Styling
Holiday events receive special styling to distinguish them from regular events:

```scss
.rbc-event.holiday-event {
  background-color: #d4e6f1 !important;
  color: #1f4e79 !important;
  border: 2px solid #5b9bd5 !important;
  font-weight: 600;
}

.rbc-event.holiday-event.holiday-observed {
  font-style: italic;
  font-weight: normal;
}
```
```

### CSS Styling
Holiday styling is defined in `BigCal.module.scss`:

```scss
:global {
  .rbc-date-cell.holiday-cell {
    background-color: #e6e6e6 !important;
    position: relative;
  }

  .holiday-label {
    position: absolute;
    bottom: 2px;
    left: 2px;
    right: 2px;
    font-size: 10px;
    color: #605e5c;
    text-align: center;
    line-height: 1.1;
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    pointer-events: none;
  }

  .holiday-observed .holiday-label {
    font-style: italic;
  }
}
```

## 🎯 **Benefits**

### **For Users**
- **Planning Awareness**: Instantly see federal holidays when planning events
- **Professional Appearance**: Clean, consistent holiday indicators
- **Complete Coverage**: No need to manually track holiday dates

### **For Organizations**
- **Compliance**: Ensures awareness of federal holidays for scheduling
- **Efficiency**: Reduces scheduling conflicts with federal holidays
- **Consistency**: Standardized holiday recognition across teams

## 🔄 **Future Enhancements**

The holiday system is designed for easy extension:

- **Custom Holidays**: Add organization-specific holidays
- **International Holidays**: Support for other country's holiday calendars
- **Holiday Categories**: Different styling for different types of holidays
- **Configuration**: Admin settings to enable/disable specific holidays
