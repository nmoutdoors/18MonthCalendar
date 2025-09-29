# BigCal Excel Import/Export Implementation Guide

This document provides comprehensive details about BigCal's Excel import/export functionality using SheetsJS, including drag-and-drop, background processing, data transformation, and user experience patterns.

## Overview

BigCal implements a sophisticated Excel import/export system that:
- **Exports** calendar data in two formats: human-readable Agenda and machine-readable Data
- **Imports** events from Excel files with robust date parsing and validation
- **Provides** drag-and-drop interface with visual feedback
- **Handles** background processing for optimal user experience
- **Supports** both public and private events with proper routing

## Core Dependencies

### SheetsJS Integration
```typescript
import * as XLSX from 'xlsx';

// Reading Excel files
const workbook = XLSX.read(arrayBuffer, { type: 'array' });
const dataSheet = workbook.Sheets.Data;
const rawData = XLSX.utils.sheet_to_json(dataSheet, { header: 1 }) as string[][];

// Creating Excel files
const workbook = XLSX.utils.book_new();
const worksheet = XLSX.utils.aoa_to_sheet(data);
XLSX.utils.book_append_sheet(workbook, worksheet, 'SheetName');
XLSX.writeFile(workbook, filename);
```

## Export System Architecture

### Dual-Worksheet Strategy

#### 1. **Agenda Worksheet** (Human-Readable)
```typescript
private createAgendaData = (events: ICalendarEvent[]): string[][] => {
  const data: string[][] = [];
  data.push(['Date', 'Time', 'IMO', 'OPR', 'Event']); // Headers
  
  let currentDate = '';
  events.forEach(event => {
    const eventDate = event.start.toLocaleDateString('en-US', {
      month: '2-digit', day: '2-digit', year: 'numeric'
    });
    
    // Only show date if different from previous event (grouped display)
    const dateToShow = currentDate === eventDate ? '' : eventDate;
    if (currentDate !== eventDate) currentDate = eventDate;
    
    // Format time with all-day detection
    let timeStr = '';
    if (this.isAllDayEvent(event)) {
      timeStr = '« all day »';
    } else {
      const startTime = event.start.toLocaleTimeString('en-US', { 
        hour: 'numeric', minute: '2-digit', hour12: true 
      });
      // Handle multi-day and same-day events differently
      timeStr = event.end ? `${startTime} – ${endTime}` : startTime;
    }
    
    data.push([dateToShow, timeStr, event.imo || '', event.opr || '', event.title]);
  });
  
  return data;
};
```

#### 2. **Data Worksheet** (Machine-Readable)
```typescript
private createRawData = (events: ICalendarEvent[]): string[][] => {
  const data: string[][] = [];
  
  // Headers matching SharePoint list structure
  data.push(['Title', 'Description', 'Start', 'End', 'Event Category', 'Status', 'IMO', 'OPR', 'Private']);
  
  events.forEach(event => {
    const formatDateTime = (date: Date): string => {
      if (this.isAllDayEvent(event)) {
        return date.toLocaleDateString('en-US', {
          month: '2-digit', day: '2-digit', year: 'numeric'
        });
      } else {
        const dateStr = date.toLocaleDateString('en-US', {
          month: '2-digit', day: '2-digit', year: 'numeric'
        });
        const timeStr = date.toLocaleTimeString('en-US', {
          hour: 'numeric', minute: '2-digit', hour12: true
        });
        return `${dateStr} ${timeStr}`;
      }
    };
    
    data.push([
      event.title,
      event.description || '',
      formatDateTime(event.start),
      event.end ? formatDateTime(event.end) : formatDateTime(event.start),
      event.swimlane || '',
      event.status || '',
      event.imo || '',
      event.opr || '',
      event.isPrivate ? 'TRUE' : 'FALSE'
    ]);
  });
  
  return data;
};
```

### Worksheet Formatting
```typescript
// Create workbook with formatted columns
const workbook = XLSX.utils.book_new();

// Agenda worksheet with optimized column widths
const agendaWorksheet = XLSX.utils.aoa_to_sheet(agendaData);
agendaWorksheet['!cols'] = [
  { width: 15 }, // Date column
  { width: 20 }, // Time column
  { width: 12 }, // IMO column
  { width: 25 }, // OPR column
  { width: 50 }  // Event column
];

// Data worksheet with SharePoint-compatible structure
const dataWorksheet = XLSX.utils.aoa_to_sheet(rawData);
dataWorksheet['!cols'] = [
  { width: 30 }, // Title column
  { width: 40 }, // Description column
  { width: 20 }, // Start column
  { width: 20 }, // End column
  { width: 15 }, // Event Category column
  { width: 15 }, // Status column
  { width: 12 }, // IMO column
  { width: 25 }, // OPR column
  { width: 10 }  // Private column
];
```

## Import System Architecture

### Drag-and-Drop Interface

#### Visual Feedback System
```scss
.dropZone {
  border: 3px dashed #c8c6c4;
  border-radius: 12px;
  padding: 60px 40px;
  text-align: center;
  background-color: #faf9f8;
  transition: all 0.3s ease;
  cursor: pointer;
  min-height: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  &:hover {
    border-color: #0078d4;
    background-color: #f3f9ff;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 120, 212, 0.15);
  }

  &.dragActive {
    border-color: #005a9e;
    background-color: #deecf9;
    border-style: solid;
    transform: scale(1.02);
    box-shadow: 0 6px 20px rgba(0, 120, 212, 0.25);
  }

  &.importing {
    border-color: #0078d4;
    background-color: #f3f9ff;
    cursor: not-allowed;
  }
}
```

#### Event Handlers
```typescript
private onDragEnter = (e: React.DragEvent<HTMLDivElement>): void => {
  e.preventDefault();
  e.stopPropagation();
  this.setState({ dragActive: true });
};

private onDragLeave = (e: React.DragEvent<HTMLDivElement>): void => {
  e.preventDefault();
  e.stopPropagation();
  this.setState({ dragActive: false });
};

private onDrop = (e: React.DragEvent<HTMLDivElement>): void => {
  e.preventDefault();
  e.stopPropagation();
  this.setState({ dragActive: false });
  
  const files = e.dataTransfer.files;
  if (files.length > 0) {
    this.handleFileImport(files[0]).catch(console.error);
  }
};
```

### Robust Date Parsing System

#### Multi-Format Date Parser
```typescript
private parseExcelDate = (dateStr: string | undefined): Date | null => {
  if (!dateStr) return null;
  
  const cleanStr = dateStr.toString().trim();
  if (!cleanStr) return null;

  // Handle Excel serial date numbers (e.g., 45911.395833333336)
  if (cleanStr.match(/^\d+(\.\d+)?$/) && !cleanStr.match(/^\d{4}$/)) {
    const serialNumber = parseFloat(cleanStr);
    if (!isNaN(serialNumber) && serialNumber > 1) {
      const excelEpoch = new Date(1899, 11, 30); // Excel's day 0
      const millisecondsPerDay = 24 * 60 * 60 * 1000;
      return new Date(excelEpoch.getTime() + (serialNumber * millisecondsPerDay));
    }
  }

  // Handle MM/DD/YYYY HH:MM AM/PM format
  if (cleanStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2}\s+(AM|PM)$/i)) {
    const parsedDate = new Date(cleanStr);
    if (!isNaN(parsedDate.getTime())) return parsedDate;
  }

  // Handle MM/DD/YYYY format (date only) - set to midnight
  if (cleanStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
    const parsedDate = new Date(cleanStr);
    if (!isNaN(parsedDate.getTime())) {
      parsedDate.setHours(0, 0, 0, 0);
      return parsedDate;
    }
  }

  // Handle European DD/MM/YYYY format
  if (cleanStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
    const parts = cleanStr.split('/');
    const day = parseInt(parts[0]);
    const month = parseInt(parts[1]);
    
    // If day > 12, likely DD/MM/YYYY format
    if (day > 12 && month <= 12) {
      const year = parseInt(parts[2]);
      return new Date(year, month - 1, day, 0, 0, 0, 0);
    }
  }

  // Handle ISO format YYYY-MM-DD
  if (cleanStr.match(/^\d{4}-\d{1,2}-\d{1,2}$/)) {
    const parsedDate = new Date(cleanStr);
    if (!isNaN(parsedDate.getTime())) {
      parsedDate.setHours(0, 0, 0, 0);
      return parsedDate;
    }
  }

  return null;
};
```

### Data Validation and Transformation

#### Header Detection System
```typescript
private parseImportedData = (rawData: string[][]): ICalendarEvent[] => {
  const events: ICalendarEvent[] = [];
  const headers = rawData[0];
  
  // Find column indices with flexible matching
  let titleIndex = -1, descriptionIndex = -1, startIndex = -1, endIndex = -1;
  let swimlaneIndex = -1, statusIndex = -1, imoIndex = -1, oprIndex = -1, privateIndex = -1;
  
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i]?.toString().toLowerCase() || '';
    if (header.includes('title') || header.includes('event')) titleIndex = i;
    if (header.includes('description') || header.includes('desc')) descriptionIndex = i;
    if (header.includes('start') || header.includes('begin')) startIndex = i;
    if (header.includes('end') || header.includes('finish')) endIndex = i;
    if (header.includes('category') || header.includes('swimlane')) swimlaneIndex = i;
    if (header.includes('status')) statusIndex = i;
    if (header.includes('imo')) imoIndex = i;
    if (header.includes('opr')) oprIndex = i;
    if (header.includes('private')) privateIndex = i;
  }
  
  // Require minimum fields
  if (titleIndex === -1 || startIndex === -1) {
    Logger.warn('Missing required columns', { titleIndex, startIndex });
    return events;
  }
  
  // Process each data row
  for (let i = 1; i < rawData.length; i++) {
    const row = rawData[i];
    if (!row || !row[titleIndex]) continue;
    
    const event: ICalendarEvent = {
      id: Date.now() + i,
      title: row[titleIndex].toString().trim(),
      description: descriptionIndex !== -1 ? row[descriptionIndex]?.toString().trim() || '' : '',
      start: this.parseExcelDate(row[startIndex]?.toString()) || new Date(),
      end: endIndex !== -1 ? this.parseExcelDate(row[endIndex]?.toString()) : null,
      swimlane: swimlaneIndex !== -1 ? row[swimlaneIndex]?.toString().trim() || 'FYSA' : 'FYSA',
      status: statusIndex !== -1 ? row[statusIndex]?.toString().trim() || '' : '',
      imo: imoIndex !== -1 ? row[imoIndex]?.toString().trim() || '' : '',
      opr: oprIndex !== -1 ? row[oprIndex]?.toString().trim() || '' : '',
      isPrivate: privateIndex !== -1 ? this.parseBoolean(row[privateIndex]?.toString()) : false
    };
    
    events.push(event);
  }
  
  return events;
};
```

## Background Processing System

### Non-Blocking Import Strategy
```typescript
private handleFileImport = async (file: File): Promise<void> => {
  this.setState({ isImporting: true, importMessage: '', importMessageType: MessageBarType.info });
  
  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    
    // Validate file structure
    if (!workbook.SheetNames.includes('Data')) {
      this.setState({
        importMessage: 'Excel file must contain a "Data" tab with calendar events',
        importMessageType: MessageBarType.error,
        isImporting: false
      });
      return;
    }
    
    const events = this.parseImportedData(rawData);
    
    // Show immediate success and start background save
    this.setState({
      importMessage: `${events.length} events added to calendar. Saving to SharePoint in background...`,
      importMessageType: MessageBarType.success,
      isImporting: false,
      backgroundImportInProgress: true
    });
    
    // Background save with timeout protection
    if (this.props.onImportEvents) {
      const importPromise = this.props.onImportEvents(events);
      withTimeout(importPromise, NETWORK_TIMEOUTS.VERY_SLOW, `Background save of ${events.length} events`)
        .then(() => {
          this.setState({ backgroundImportInProgress: false });
          Logger.info(`Successfully saved ${events.length} events`);
        })
        .catch((error) => {
          this.setState({ backgroundImportInProgress: false });
          if (this.props.onImportError) {
            this.props.onImportError(`Failed to save events: ${error.message}`);
          }
        });
    }
    
  } catch (error) {
    this.setState({
      importMessage: 'Error reading Excel file. Please ensure it\'s a valid Excel file.',
      importMessageType: MessageBarType.error,
      isImporting: false
    });
  }
};
```

### Private vs Public Event Routing
```typescript
// In ExportManager.tsx
private handleImportEvents = async (importedEvents: ICalendarEvent[]): Promise<void> => {
  try {
    // Process events individually to handle private events correctly
    const creationPromises = importedEvents.map(async (event) => {
      if (event.isPrivate) {
        // Use HybridEventsService for private events
        return await this.hybridEventsService.createEvent(
          event.title, event.start, event.end, event.swimlane || 'FYSA',
          event.status || '', event.imo || '', event.opr || '',
          event.description || '', true // isPrivate
        );
      } else {
        // Use SharePointService for regular events
        return await this.sharePointService.createEvent(
          event.title, event.start, event.end, event.swimlane || 'FYSA',
          event.status || '', event.imo || '', event.opr || '',
          event.description || '', false // isPrivate
        );
      }
    });
    
    // Execute all creations in parallel with timeout protection
    await withTimeout(
      Promise.all(creationPromises), 
      NETWORK_TIMEOUTS.VERY_SLOW, 
      `Import ${importedEvents.length} events to SharePoint`
    );
    
    // Refresh events from SharePoint to get proper IDs
    if (this.props.onEventsImported) {
      this.props.onEventsImported();
    }
    
  } catch (error) {
    Logger.error('Error importing events to SharePoint', error);
    throw error;
  }
};
```

## User Experience Patterns

### Modal Interface Design
```typescript
// Tabbed interface for Export/Import
<Pivot selectedKey={this.state.selectedTab} onLinkClick={this.handleTabChange}>
  <PivotItem headerText="Export" itemKey="export" itemIcon="Download">
    {/* Export controls: date range, filename, export button */}
  </PivotItem>
  
  <PivotItem headerText="Import" itemKey="import" itemIcon="Upload">
    {/* Drag-and-drop zone with file browser fallback */}
  </PivotItem>
</Pivot>
```

### Progressive Loading States
```typescript
// Component ready state management
public componentDidMount(): void {
  this.checkStylesAndRender();
}

private checkStylesAndRender = (): void => {
  const maxAttempts = 10;
  if (this.state.renderAttempts >= maxAttempts) {
    this.setState({ isComponentReady: true, isStylesLoaded: true });
    return;
  }
  
  // Check if styles are loaded by testing computed styles
  const testElement = document.createElement('div');
  testElement.className = styles.dropZone;
  document.body.appendChild(testElement);
  
  const computedStyle = window.getComputedStyle(testElement);
  const hasStyles = computedStyle.borderStyle === 'dashed';
  
  document.body.removeChild(testElement);
  
  if (hasStyles) {
    this.setState({ isComponentReady: true, isStylesLoaded: true });
  } else {
    this.setState({ renderAttempts: this.state.renderAttempts + 1 });
    this.styleCheckInterval = window.setTimeout(this.checkStylesAndRender, 100);
  }
};
```

## Key Implementation Benefits

### For Developers
- **SheetsJS Integration**: Robust Excel file handling with comprehensive format support
- **Type Safety**: Strong TypeScript interfaces for all data transformations
- **Error Handling**: Graceful handling of malformed files and network issues
- **Modular Design**: Separate components for export/import with clear interfaces

### For Users
- **Dual Export Formats**: Human-readable agenda + machine-readable data
- **Drag-and-Drop**: Intuitive file upload with visual feedback
- **Background Processing**: Non-blocking saves with progress indication
- **Format Flexibility**: Supports multiple date formats and Excel versions

### For System Integration
- **SharePoint Compatibility**: Data format matches SharePoint list structure
- **Private Event Support**: Proper routing for secure vs public events
- **Timeout Protection**: Network resilience with configurable timeouts
- **Comprehensive Logging**: Detailed logging for troubleshooting

This implementation provides a professional-grade Excel import/export system that handles real-world data complexity while maintaining excellent user experience.
