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
 * Since we now store dates without timezone info, SharePoint returns them correctly
 */
const parseSharePointDate = (dateString: string): Date => {
  // SharePoint now returns dates in the correct local time since we store them without timezone info
  // We can parse them directly
  return new Date(dateString);
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
