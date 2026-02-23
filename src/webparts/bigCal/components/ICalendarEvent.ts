import * as moment from 'moment';

// Type definitions for SharePoint choice fields
export type SwimlaneType = 'DCDC' | 'DISA' | 'DOD CIO / NSA / USCC' | 'Exec Time' | 'Exercises' | 'FYSA' | 'Joint DISA & DCDC' | 'Mission Partner' | 'Out of Office' | 'Seniors' | 'Speaking Event' | 'TDY Meetings/Congressional' | 'Transit';
export type StatusType = 'Confirmed' | 'Tentative' | 'Not Set' | ''; // Include empty string for blank status
export type IMOType = 'IMO 1' | 'IMO 2' | 'IMO 3' | 'IMO 4' | 'IMO 5' | 'IMO 6' | 'IMO 7' | 'IMO 8' | 'Not Set' | ''; // Include empty string and "Not Set" for blank IMO
export type OPRType = 'J-0' | 'J-3/5/7' | 'Industry - EM' | 'DAFA - SPIO' | 'MILDEPs - SPIO' | 'International Engagements' | 'Speaking Engagements - PAO' | 'Media Engagements/Queries - PAO' | 'Conferences and Exhibits - PAO' | 'J9' | 'Internal Engagements' | 'OSD/Congress' | 'Not Set' | ''; // Include empty string and "Not Set" for blank OPR

export interface ICalendarEvent {
  id: number | string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  resource?: unknown;
  swimlane?: SwimlaneType;
  status?: StatusType;
  imo?: IMOType;
  opr?: OPRType;
  description: string; // Now required
  notes?: string; // Multi-line text field for additional notes
  isHoliday?: boolean;
  isObserved?: boolean;
  isPrivate?: boolean;
  privateEventId?: string; // GUID linking to PrivateEvents list
  attachmentCount?: number; // Number of attachments for this event
  modified?: Date; // Last modified date
  modifiedBy?: string; // Last modified by user display name
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
    return new Date(); // Fallback to current date
  }

  return date;
};

// Helper function to convert SharePoint event to calendar event
export const convertSharePointEventToCalendarEvent = (spEvent: {Id: number; Title: string; EventDate: string; EndDate: string; Swimlane: string; Status: string; IMO: string; OPR: string; Description: string}): ICalendarEvent => {
  return {
    id: spEvent.Id,
    title: spEvent.Title,
    start: parseSharePointDate(spEvent.EventDate),
    end: parseSharePointDate(spEvent.EndDate),
    allDay: false,
    swimlane: spEvent.Swimlane as SwimlaneType,
    status: spEvent.Status as StatusType,
    imo: (spEvent.IMO === 'null' || spEvent.IMO === null || spEvent.IMO === undefined || spEvent.IMO === '') ? '' : spEvent.IMO as IMOType,
    opr: (spEvent.OPR === 'null' || spEvent.OPR === null || spEvent.OPR === undefined || spEvent.OPR === '') ? '' : spEvent.OPR as OPRType,
    description: spEvent.Description || '',
    isHoliday: false
  };
};
