# BigCal Excel Import/Export Modal - Complete Implementation Guide

This document provides every technical detail needed to replicate the Excel import/export modal implementation from BigCal, including exact code, CSS, icons, and integration patterns.

## Complete Implementation Architecture

### 1. **Button That Opens the Modal**

#### Exact IconButton Implementation
```tsx
// In BigCal.tsx navbar section
<IconButton
  iconProps={{ iconName: 'ExcelDocument' }}
  title="Export to Excel"
  onClick={this.openExportDialog}
  className={styles.navbarButton}
/>
```

#### State Management for Modal
```tsx
// In BigCal.tsx interface
interface IBigCalState {
  isExportDialogOpen: boolean;
  // ... other state properties
}

// In constructor
this.state = {
  isExportDialogOpen: false,
  // ... other initial state
};

// Modal control methods
private openExportDialog = (): void => {
  this.setState({ isExportDialogOpen: true });
};

private closeExportDialog = (): void => {
  this.setState({ isExportDialogOpen: false });
};
```

### 2. **Complete Modal Integration Pattern**

#### ExportManager Component (Wrapper)
```tsx
// ExportManager.tsx - Complete file structure
import * as React from 'react';
import { WebPartContext } from '@microsoft/sp-webpart-base';
import { View } from 'react-big-calendar';
import { ICalendarEvent } from './ICalendarEvent';
import { ExcelExport } from './ExcelExport';
import { SharePointService } from '../services/SharePointService';
import { HybridEventsService } from '../services/HybridEventsService';

export interface IExportManagerProps {
  context: WebPartContext;
  events: ICalendarEvent[];
  filteredEvents: ICalendarEvent[];
  currentView: View;
  currentDate: Date;
  isExcelExportOpen: boolean;
  isPrintDialogOpen: boolean;
  onDismissExcelExport: () => void;
  onDismissPrintDialog: () => void;
  listName: string;
  onEventsImported?: () => void;
  onAddEventsToUI?: (events: ICalendarEvent[]) => void;
  onImportError?: (error: string) => void;
  dynamicColorMappings?: Map<string, string>;
  colorPaletteMappings?: IColorMapping[];
}

export class ExportManager extends React.Component<IExportManagerProps, IExportManagerState> {
  private sharePointService: SharePointService;
  private hybridEventsService: HybridEventsService;

  constructor(props: IExportManagerProps) {
    super(props);
    this.sharePointService = new SharePointService(props.context, props.listName);
    this.hybridEventsService = new HybridEventsService(props.context, props.listName);
  }

  public render(): React.ReactElement {
    return (
      <>
        {/* Excel Export Modal */}
        <ExcelExport
          isOpen={this.props.isExcelExportOpen}
          onDismiss={this.props.onDismissExcelExport}
          events={this.props.events}
          currentDate={this.props.currentDate}
          onImportEvents={this.handleImportEvents}
          onImportError={this.props.onImportError}
        />
      </>
    );
  }
}
```

#### Integration in Main Component
```tsx
// In BigCal.tsx render method
{/* Export Manager - Handles Excel Export and Print */}
<ExportManager
  context={this.props.context}
  events={events}
  filteredEvents={allFilteredEvents}
  currentView={currentView}
  currentDate={currentDate}
  isExcelExportOpen={isExportDialogOpen}
  isPrintDialogOpen={isPrintDialogOpen}
  onDismissExcelExport={this.closeExportDialog}
  onDismissPrintDialog={this.closePrintDialog}
  listName={this.props.listName}
  onEventsImported={this.loadEvents}
  onAddEventsToUI={this.handleAddEventsToUI}
  onImportError={this.handleImportError}
  dynamicColorMappings={this.state.dynamicColorMappings}
  colorPaletteMappings={this.state.colorPaletteMappings}
/>
```

### 3. **Complete ExcelExport Component Structure**

#### Required Imports
```tsx
import * as React from 'react';
import { PrimaryButton, DefaultButton } from '@fluentui/react/lib/Button';
import { DatePicker } from '@fluentui/react/lib/DatePicker';
import { Dialog, DialogType, DialogFooter } from '@fluentui/react/lib/Dialog';
import { Stack } from '@fluentui/react/lib/Stack';
import { Text } from '@fluentui/react/lib/Text';
import { TextField } from '@fluentui/react/lib/TextField';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { Pivot, PivotItem } from '@fluentui/react/lib/Pivot';
import { Icon } from '@fluentui/react/lib/Icon';
import * as XLSX from 'xlsx';
import { ICalendarEvent, SwimlaneType, StatusType, IMOType, OPRType } from './ICalendarEvent';
import { Logger } from '../services/LoggingService';
import { withTimeout, NETWORK_TIMEOUTS } from '../utils/BigCalUtilities';
import styles from './ExcelExport.module.scss';
```

#### Component Interface
```tsx
export interface IExcelExportProps {
  events: ICalendarEvent[];
  isOpen: boolean;
  onDismiss: () => void;
  currentDate?: Date;
  onImportEvents?: (events: ICalendarEvent[]) => Promise<void>;
  onImportError?: (error: string) => void;
}

export interface IExcelExportState {
  startDate: Date;
  endDate: Date;
  isExporting: boolean;
  exportMessage: string;
  exportMessageType: MessageBarType;
  fileName: string;
  selectedTab: string;
  isImporting: boolean;
  importMessage: string;
  importMessageType: MessageBarType;
  dragActive: boolean;
  backgroundImportInProgress: boolean;
  isComponentReady: boolean;
  isStylesLoaded: boolean;
  renderAttempts: number;
}
```

### 4. **Complete Dialog Implementation**

#### Main Dialog Structure
```tsx
public render(): React.ReactElement<IExcelExportProps> {
  const dialogContentProps = {
    type: DialogType.normal,
    title: 'Calendar Data Management',
    subText: 'Export calendar data or import events from another BigCal instance.'
  };

  // Loading state dialog
  if (!this.state.isComponentReady || !this.state.isStylesLoaded) {
    return (
      <Dialog
        hidden={!this.props.isOpen}
        onDismiss={this.props.onDismiss}
        dialogContentProps={{
          type: DialogType.normal,
          title: 'Calendar Data Management',
          subText: 'Loading...'
        }}
        modalProps={{
          isBlocking: false,
          isDarkOverlay: true
        }}
        minWidth={600}
        maxWidth={700}
      >
        <div style={{
          padding: '40px',
          textAlign: 'center',
          minHeight: '200px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Icon
            iconName="Sync"
            styles={{
              root: {
                fontSize: 32,
                color: '#0078d4',
                marginBottom: 16,
                animation: 'spin 1s linear infinite'
              }
            }}
          />
          <Text variant="medium" block styles={{ root: { marginBottom: 8 } }}>
            Preparing Calendar Data Management...
          </Text>
        </div>
      </Dialog>
    );
  }

  // Main dialog
  return (
    <Dialog
      hidden={!this.props.isOpen}
      onDismiss={this.props.onDismiss}
      dialogContentProps={dialogContentProps}
      modalProps={{
        isBlocking: false,
        isDarkOverlay: true
      }}
      minWidth={600}
      maxWidth={700}
    >
      <div ref={this.modalRef} className={styles.exportDialog}>
        <Pivot selectedKey={this.state.selectedTab} onLinkClick={this.onTabChange}>
          <PivotItem headerText="Export" itemKey="export" itemIcon="Download">
            {/* Export content */}
          </PivotItem>
          <PivotItem headerText="Import" itemKey="import" itemIcon="Upload">
            {/* Import content with drag-and-drop */}
          </PivotItem>
        </Pivot>
      </div>
      
      <DialogFooter>
        {this.state.selectedTab === 'export' && (
          <PrimaryButton
            onClick={this.exportToExcel}
            text="Export to Excel"
            disabled={this.state.isExporting}
          />
        )}
        <DefaultButton
          onClick={this.props.onDismiss}
          text="Close"
          disabled={this.state.isExporting || this.state.isImporting}
        />
      </DialogFooter>
    </Dialog>
  );
}
```

### 5. **Complete CSS Implementation**

#### ExcelExport.module.scss - Complete File
```scss
@import '~@fluentui/react/dist/sass/References.scss';

.exportDialog {
  padding: 20px 0;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  overflow-x: hidden !important;

  // Scoped dialog styling - only affects Excel Export dialog
  .msDialogMain {
    min-width: 600px;
    max-width: 700px;
    width: 90vw;
    max-height: 90vh;
    overflow: hidden !important;
    box-sizing: border-box;
  }

  .msDialogContent {
    padding: 24px;
    overflow-x: hidden !important;
    overflow-y: auto;
    max-height: calc(90vh - 120px); // Account for header and footer
    box-sizing: border-box;
    width: 100%;
  }

  // Ensure Stack components don't overflow
  :global(.ms-Stack) {
    max-width: 100%;
    overflow-x: hidden;
    box-sizing: border-box;
  }

  :global(.ms-Stack--horizontal) {
    flex-wrap: wrap;
    gap: 16px;
  }

  :global(.ms-StackItem) {
    max-width: 100%;
    box-sizing: border-box;
    overflow-x: hidden;
  }

  .datePickerContainer {
    display: flex;
    gap: 20px;
    margin: 20px 0;
    flex-wrap: wrap;
    max-width: 100%;

    .datePickerItem {
      flex: 1;
      min-width: 200px;
      max-width: 100%;

      .datePickerLabel {
        font-weight: 600;
        margin-bottom: 8px;
        display: block;
      }
    }
  }

  .helpText {
    color: #666;
    font-size: 14px;
    margin-top: 15px;
    line-height: 1.4;
    word-wrap: break-word;
    max-width: 100%;
  }

  .messageBar {
    margin-bottom: 20px;
    max-width: 100%;
  }

  .dropZone {
    border: 3px dashed #c8c6c4;
    border-radius: 12px;
    padding: 60px 40px;
    text-align: center;
    background-color: #faf9f8;
    transition: all 0.3s ease;
    cursor: pointer;
    margin: 20px 0;
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
}

// Spinning animation for import loading
:global {
  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
}
```

### 6. **Drag-and-Drop Implementation**

#### Complete Drag-and-Drop Zone
```tsx
<div
  className={`${styles.dropZone} ${this.state.dragActive ? styles.dragActive : ''} ${this.state.isImporting ? styles.importing : ''}`}
  onDragEnter={this.onDragEnter}
  onDragLeave={this.onDragLeave}
  onDragOver={this.onDragOver}
  onDrop={this.onDrop}
>
  {this.state.isImporting ? (
    <>
      <Icon iconName="Sync" styles={{ root: { fontSize: 48, color: '#0078d4', marginBottom: 16, animation: 'spin 1s linear infinite' } }} />
      <Text variant="large" block styles={{ root: { marginBottom: 8 } }}>
        Processing Excel file...
      </Text>
      <Text variant="medium" block styles={{ root: { color: '#666' } }}>
        Please wait while we import your events
      </Text>
    </>
  ) : (
    <>
      <Icon iconName="CloudUpload" styles={{ root: { fontSize: 48, color: this.state.dragActive ? '#005a9e' : '#0078d4', marginBottom: 16 } }} />
      <Text variant="large" block styles={{ root: { marginBottom: 8, fontWeight: 600 } }}>
        {this.state.dragActive ? 'Drop your Excel file now!' : 'Drag & Drop Excel File'}
      </Text>
      <Text variant="medium" block styles={{ root: { color: '#666', marginBottom: 16 } }}>
        or click to browse
      </Text>
      <PrimaryButton
        text="Browse Files"
        disabled={this.state.isImporting}
        onClick={() => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = '.xlsx,.xls';
          input.onchange = (e: Event) => {
            const target = e.target as HTMLInputElement;
            if (target.files && target.files.length > 0) {
              this.handleFileImport(target.files[0]).catch(console.error);
            }
          };
          input.click();
        }}
      />
    </>
  )}
</div>
```

#### Drag Event Handlers
```tsx
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

private onDragOver = (e: React.DragEvent<HTMLDivElement>): void => {
  e.preventDefault();
  e.stopPropagation();
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

### 7. **Critical Implementation Details**

#### Style Loading Check (Essential for Modal Rendering)
```tsx
private checkStylesAndRender = (): void => {
  const maxAttempts = 50;
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

#### Component Lifecycle Management
```tsx
public componentDidMount(): void {
  this.checkStylesAndRender();
}

public componentWillUnmount(): void {
  if (this.styleCheckInterval) {
    clearTimeout(this.styleCheckInterval);
  }
}

public componentDidUpdate(prevProps: IExcelExportProps): void {
  if (this.props.isOpen && !prevProps.isOpen) {
    // Modal just opened - reset state and check styles
    const defaultState = this.getDefaultStateForDate(this.props.currentDate);
    this.setState({
      ...defaultState,
      isComponentReady: false,
      isStylesLoaded: false,
      renderAttempts: 0
    });
    this.checkStylesAndRender();
  }
}
```

## Key Success Factors

1. **Exact Icon Name**: `'ExcelDocument'` for the button
2. **Modal Props**: `isBlocking: false, isDarkOverlay: true`
3. **Size Constraints**: `minWidth={600}, maxWidth={700}`
4. **Style Loading Check**: Essential for preventing layout issues
5. **Scoped CSS**: Prevents pollution of other SharePoint modals
6. **Progressive Loading**: Shows loading state while styles load
7. **Proper State Management**: Clear open/close handlers
8. **Component Hierarchy**: ExportManager → ExcelExport pattern

This complete implementation guide provides every technical detail needed to successfully replicate the BigCal Excel modal functionality.
