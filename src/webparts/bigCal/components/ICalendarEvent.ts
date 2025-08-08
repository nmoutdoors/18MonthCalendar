// Type definitions for SharePoint choice fields
export type SwimlaneType = 'Category 1' | 'Category 2' | 'Category 3';
export type StatusType = 'Red' | 'Green' | 'Amber';

export interface ICalendarEvent {
  id: number;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  resource?: unknown;
  swimlane: SwimlaneType;
  status: StatusType;
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
    status: spEvent.Status as StatusType
  };
};
