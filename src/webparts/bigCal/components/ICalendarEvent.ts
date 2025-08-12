// Type definitions for SharePoint choice fields
export type SwimlaneType = 'Away w/RON' | 'Day Trip - NCR' | 'Exercise' | 'FYSA' | 'Out of Office' | 'Training Holiday' | 'VIP/High Priority';
export type StatusType = 'Confirmed' | 'Tentative' | 'Canceled';

export interface ICalendarEvent {
  id: number | string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  resource?: unknown;
  swimlane?: SwimlaneType;
  status?: StatusType;
  isHoliday?: boolean;
  isObserved?: boolean;
}

// Helper function to convert SharePoint event to calendar event
export const convertSharePointEventToCalendarEvent = (spEvent: {Id: number; Title: string; Start: string; End: string; Swimlane: string; Status: string}): ICalendarEvent => {
  return {
    id: spEvent.Id,
    title: spEvent.Title,
    start: new Date(spEvent.Start),
    end: new Date(spEvent.End),
    allDay: false,
    swimlane: spEvent.Swimlane as SwimlaneType,
    status: spEvent.Status as StatusType,
    isHoliday: false
  };
};
