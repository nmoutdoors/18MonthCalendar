import * as moment from 'moment';

// Type definitions for SharePoint choice fields
export type SwimlaneType = 'DCDC' | 'DISA' | 'DOD CIO / NSA / USCC' | 'Exec Time' | 'Exercises' | 'FYSA' | 'Joint DISA & DCDC' | 'Mission Partner' | 'Out of Office' | 'Speaking Event' | 'TDY Meetings/Congressional' | 'Transit';
export type StatusType = 'Confirmed' | 'Tentative' | 'Not Set' | ''; // Include empty string for blank status

export interface ICalendarEvent {
  id: number | string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  resource?: unknown;
  swimlane?: SwimlaneType;
  status?: StatusType;
  description?: string;
  isHoliday?: boolean;
  isObserved?: boolean;
  isPrivate?: boolean;
  privateEventId?: string; // GUID linking to PrivateEvents list
}

/**
 * Parse SharePoint date string to JavaScript Date
 * Handle timezone-safe parsing for local time preservation
 */
const parseSharePointDate = (dateString: string): Date => {
  // If the string has no timezone info (no 'Z' or offset), treat as local time
  if (dateString && dateString.indexOf('Z') === -1 && !dateString.match(/[+-]\d{2}:\d{2}$/)) {
    // Parse as local time using moment without timezone conversion
    return moment(dateString).toDate();
  }

  // If it has timezone info, use standard parsing
  const date = new Date(dateString);

  // Check if we got a valid date
  if (isNaN(date.getTime())) {
    console.warn('Invalid date string:', dateString);
    return new Date(); // Fallback to current date
  }

  return date;
};

// Helper function to convert SharePoint event to calendar event
export const convertSharePointEventToCalendarEvent = (spEvent: {Id: number; Title: string; EventDate: string; EndDate: string; Swimlane: string; Status: string; Description: string}): ICalendarEvent => {
  return {
    id: spEvent.Id,
    title: spEvent.Title,
    start: parseSharePointDate(spEvent.EventDate),
    end: parseSharePointDate(spEvent.EndDate),
    allDay: false,
    swimlane: spEvent.Swimlane as SwimlaneType,
    status: spEvent.Status as StatusType,
    description: spEvent.Description || '',
    isHoliday: false
  };
};
