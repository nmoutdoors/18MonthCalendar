# 📊 DataSheet View Pattern

## Overview

The **DataSheet View Pattern** is a proven approach for implementing tabular data editing interfaces in modal dialogs. This pattern provides a full-width, spreadsheet-like editing experience with explicit save operations, unsaved changes tracking, visual change indicators, and batch update capabilities. It's been successfully implemented in BigCal's DataSheet View for bulk event editing.

## What Makes This Pattern Valuable

### User Benefits
- **Familiar Interface**: Spreadsheet-like grid that users already understand
- **Bulk Editing**: Edit multiple records efficiently in one view
- **Explicit Control**: Users decide when to save all changes
- **Visual Feedback**: See which fields have pending changes
- **Undo Protection**: Can cancel without saving changes
- **Combined Columns**: Date+Time in single columns to maximize space

### Developer Benefits
- **Reusable Structure**: Same pattern works for any tabular data
- **State Management**: Clear tracking of pending vs saved changes
- **Type Safety**: Strong TypeScript interfaces throughout
- **Fluent UI Integration**: Uses DetailsList for consistent UX
- **Batch Operations**: Efficient bulk save operations

## Core Problem

Applications need data editing interfaces that:
- **Display** large datasets in tabular format
- **Allow** inline editing of multiple records
- **Track** pending changes per row and field
- **Prevent** accidental data loss from unsaved changes
- **Provide** clear visual indicators of modified fields
- **Support** both simple and complex field types (text, dropdown, checkbox, date/time)
- **Maximize** horizontal space to avoid scrollbars
- **Handle** errors gracefully during batch saves

## Solution Architecture

### The Pattern

```
┌─────────────────────────────────────────────────────────────┐
│                  DataSheet Modal Component                   │
├─────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Header: Title + Close Button                          │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Body: DetailsList Grid                                 │ │
│  │  ┌──────┬──────┬──────┬──────┬──────┬──────┬────────┐  │ │
│  │  │Title │Start │ End  │Status│ IMO  │ OPR  │Private │  │ │
│  │  ├──────┼──────┼──────┼──────┼──────┼──────┼────────┤  │ │
│  │  │Event1│ ...  │ ...  │ [▼]  │ [▼]  │ [▼]  │  [✓]   │  │ │
│  │  │Event2│ ...  │ ...  │ [▼]  │ [▼]  │ [▼]  │  [ ]   │  │ │
│  │  └──────┴──────┴──────┴──────┴──────┴──────┴────────┘  │ │
│  │  • Inline editing with dropdowns/checkboxes             │ │
│  │  • Visual indicators for pending changes                │ │
│  │  • Read-only columns for reference data                 │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Footer: Actions + Status                              │ │
│  │  • "You have unsaved changes" warning                   │ │
│  │  • Save Changes button (explicit)                       │ │
│  │  • Progress indicator during save                       │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

1. **Modal Container** - Full-width dialog (1400px) for maximum data visibility
2. **DetailsList Grid** - Fluent UI table component with inline editing
3. **Pending Changes Map** - Tracks unsaved changes per row
4. **Visual Change Indicators** - Blue borders and backgrounds for modified fields
5. **Batch Save Handler** - Processes all pending changes sequentially
6. **Unsaved Changes Warning** - Prevents accidental data loss
7. **Combined Date/Time Columns** - Space-efficient column design

## Component Structure

### Props Interface

```typescript
export interface IDataSheetViewProps {
  // Context and configuration
  context: WebPartContext;
  listName: string;
  
  // Data
  events: ICalendarEvent[];
  isLoading: boolean;
  
  // Callbacks
  onEventsUpdated?: () => void;
  
  // Modal control
  isModal?: boolean;
  onClose?: () => void;
}
```

### State Interface

```typescript
export interface IDataSheetViewState {
  // Update tracking
  isUpdating: boolean;
  updatingEventId?: number | string;
  
  // Pending changes tracking
  hasUnsavedChanges: boolean;
  pendingChanges: Map<number | string, Partial<ICalendarEvent>>;
  
  // Save state
  isSaving: boolean;
  
  // Error handling
  error?: string;
}
```

## Complete Implementation

### 1. Component Setup

```typescript
import * as React from 'react';
import { DetailsList, DetailsListLayoutMode, IColumn, SelectionMode } from '@fluentui/react/lib/DetailsList';
import { Dropdown, IDropdownOption } from '@fluentui/react/lib/Dropdown';
import { Checkbox } from '@fluentui/react/lib/Checkbox';
import { Modal, IconButton, PrimaryButton } from '@fluentui/react';
import { Text } from '@fluentui/react/lib/Text';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';

export class DataSheetView extends React.Component<IDataSheetViewProps, IDataSheetViewState> {
  private sharePointService: SharePointService;
  private hybridEventsService: HybridEventsService;

  constructor(props: IDataSheetViewProps) {
    super(props);

    this.state = {
      isUpdating: false,
      error: undefined,
      updatingEventId: undefined,
      hasUnsavedChanges: false,
      pendingChanges: new Map(),
      isSaving: false
    };

    this.sharePointService = new SharePointService(props.context, props.listName);
    this.hybridEventsService = new HybridEventsService(props.context, props.listName);
  }
}
```

### 2. Pending Changes Management

The core of this pattern is tracking changes locally before saving to SharePoint.

```typescript
/**
 * Update a field value and track as pending change
 */
private updateEventField = (
  eventId: number | string,
  field: string,
  value: string | boolean
): void => {
  const { pendingChanges } = this.state;

  // Get existing pending changes for this event or create new
  const existingChanges = pendingChanges.get(eventId) || {};
  const updatedChanges = { ...existingChanges, [field]: value };

  // Update pending changes map
  const newPendingChanges = new Map<number | string, Partial<ICalendarEvent>>();
  pendingChanges.forEach((value, key) => {
    newPendingChanges.set(key, value);
  });
  newPendingChanges.set(eventId, updatedChanges);

  this.setState({
    pendingChanges: newPendingChanges,
    hasUnsavedChanges: true
  });
};

/**
 * Field-specific change handlers
 */
private handleStatusChange = (eventId: number | string, newStatus: string): void => {
  this.updateEventField(eventId, 'status', newStatus);
};

private handleSwimlaneChange = (eventId: number | string, newSwimlane: string): void => {
  this.updateEventField(eventId, 'swimlane', newSwimlane);
};

private handleIMOChange = (eventId: number | string, newIMO: string): void => {
  this.updateEventField(eventId, 'imo', newIMO);
};

private handleOPRChange = (eventId: number | string, newOPR: string): void => {
  this.updateEventField(eventId, 'opr', newOPR);
};

private handlePrivateChange = (eventId: number | string, isPrivate: boolean): void => {
  this.updateEventField(eventId, 'isPrivate', isPrivate);
};

private handleDescriptionChange = (eventId: number | string, description: string): void => {
  this.updateEventField(eventId, 'description', description);
};
```

### 3. Batch Save Operation

Process all pending changes in a single operation with comprehensive error handling.

```typescript
private saveAllChanges = async (): Promise<void> => {
  const { pendingChanges } = this.state;

  if (pendingChanges.size === 0) {
    return;
  }

  this.setState({ isSaving: true, error: undefined });

  try {
    // Convert Map to array for iteration
    const pendingEntries: Array<[number | string, Partial<ICalendarEvent>]> = [];
    pendingChanges.forEach((value, key) => {
      pendingEntries.push([key, value]);
    });

    // Process each event with pending changes
    for (const [eventId, changes] of pendingEntries) {
      const event = this.props.events.filter((e: ICalendarEvent) => e.id === eventId)[0];
      if (!event) {
        throw new Error(`Event with ID ${eventId} not found`);
      }

      // Apply pending changes to event
      const updatedEvent = { ...event, ...changes };

      // Handle private/public conversion if needed
      if ('isPrivate' in changes) {
        await this.hybridEventsService.updateEvent(
          eventId as number,
          updatedEvent.title,
          updatedEvent.start,
          updatedEvent.end,
          updatedEvent.swimlane || '',
          updatedEvent.status || '',
          updatedEvent.imo || '',
          updatedEvent.opr || '',
          updatedEvent.description || '',
          updatedEvent.isPrivate || false
        );
      } else {
        // Regular field updates
        await this.sharePointService.updateEvent(
          eventId as number,
          updatedEvent.title,
          updatedEvent.start,
          updatedEvent.end,
          updatedEvent.swimlane || '',
          updatedEvent.status || '',
          updatedEvent.imo || '',
          updatedEvent.opr || '',
          updatedEvent.description || '',
          updatedEvent.isPrivate || false
        );
      }

      Logger.info(`Successfully saved changes for event ${eventId}`);
    }

    // Clear pending changes and refresh parent
    this.setState({
      pendingChanges: new Map<number | string, Partial<ICalendarEvent>>(),
      hasUnsavedChanges: false
    });

    if (this.props.onEventsUpdated) {
      this.props.onEventsUpdated();
    }

  } catch (error) {
    Logger.error('Failed to save changes', error);
    this.setState({
      error: 'Failed to save changes. Please try again.'
    });
  } finally {
    this.setState({ isSaving: false });
  }
};
```

### 4. Visual Change Indicators

Provide clear visual feedback for fields with pending changes.

```typescript
private renderStatusCell = (item: ICalendarEvent): JSX.Element => {
  const isUpdating = this.state.isUpdating && this.state.updatingEventId === item.id;
  const pendingChanges = this.state.pendingChanges.get(item.id);
  const currentValue = pendingChanges?.status !== undefined
    ? pendingChanges.status
    : (item.status || '');
  const hasChanges = pendingChanges?.status !== undefined;

  return (
    <div className={styles.editableCell}>
      {isUpdating ? (
        <Spinner size={SpinnerSize.xSmall} />
      ) : (
        <Dropdown
          options={this.getStatusOptions()}
          selectedKey={currentValue as string}
          onChange={(_, option) => {
            if (option) {
              this.handleStatusChange(item.id, option.key as string);
            }
          }}
          styles={{
            dropdown: { minWidth: 100 },
            title: {
              // Visual indicator for pending changes
              border: hasChanges ? '2px solid #0078d4' : 'none',
              backgroundColor: hasChanges ? '#f3f9ff' : 'transparent'
            }
          }}
        />
      )}
    </div>
  );
};

private renderPrivateCell = (item: ICalendarEvent): JSX.Element => {
  const isUpdating = this.state.isUpdating && this.state.updatingEventId === item.id;
  const pendingChanges = this.state.pendingChanges.get(item.id);
  const currentValue = pendingChanges?.isPrivate !== undefined
    ? pendingChanges.isPrivate
    : (item.isPrivate || false);
  const hasChanges = pendingChanges?.isPrivate !== undefined;

  return (
    <div className={styles.editableCell}>
      {isUpdating ? (
        <Spinner size={SpinnerSize.xSmall} />
      ) : (
        <Checkbox
          checked={currentValue as boolean}
          onChange={(_, checked) => {
            this.handlePrivateChange(item.id, checked || false);
          }}
          styles={{
            root: {
              backgroundColor: hasChanges ? '#f3f9ff' : 'transparent',
              padding: hasChanges ? '4px 8px' : '0',
              borderRadius: hasChanges ? '4px' : '0',
              border: hasChanges ? '2px solid #0078d4' : 'none'
            }
          }}
        />
      )}
    </div>
  );
};
```

### 5. Column Definitions with Combined Date/Time

Maximize horizontal space by combining date and time in single columns.

```typescript
private getColumns = (): IColumn[] => {
  return [
    {
      key: 'title',
      name: 'Title',
      fieldName: 'title',
      minWidth: 150,
      maxWidth: 200,
      isResizable: true,
      onRender: (item: ICalendarEvent) => (
        <Text variant="small" styles={{ root: { fontWeight: 500 } }}>
          {item.title}
        </Text>
      )
    },
    {
      key: 'start',
      name: 'Start',
      fieldName: 'start',
      minWidth: 140,
      maxWidth: 160,
      isResizable: true,
      onRender: (item: ICalendarEvent) => (
        <Text variant="small">
          {/* Combined Date + Time in single column */}
          {item.start.toLocaleDateString('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric'
          })} {item.start.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          })}
        </Text>
      )
    },
    {
      key: 'end',
      name: 'End',
      fieldName: 'end',
      minWidth: 140,
      maxWidth: 160,
      isResizable: true,
      onRender: (item: ICalendarEvent) => (
        <Text variant="small">
          {/* Combined Date + Time in single column */}
          {item.end ? `${item.end.toLocaleDateString('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric'
          })} ${item.end.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          })}` : '—'}
        </Text>
      )
    },
    {
      key: 'swimlane',
      name: '🎯 Event Category',
      fieldName: 'swimlane',
      minWidth: 140,
      maxWidth: 180,
      isResizable: true,
      onRender: this.renderSwimlaneCell
    },
    {
      key: 'status',
      name: '📊 Status',
      fieldName: 'status',
      minWidth: 100,
      maxWidth: 120,
      isResizable: true,
      onRender: this.renderStatusCell
    },
    {
      key: 'private',
      name: '🔒 Private',
      fieldName: 'private',
      minWidth: 70,
      maxWidth: 85,
      isResizable: true,
      onRender: this.renderPrivateCell
    }
  ];
};
```

### 6. Modal Rendering with Unsaved Changes Warning

```typescript
private handleModalClose = (): void => {
  // If there are unsaved changes, prompt user
  if (this.state.hasUnsavedChanges) {
    const shouldClose = window.confirm(
      'You have unsaved changes. Are you sure you want to close without saving?'
    );

    if (!shouldClose) {
      return; // Don't close the modal
    }
  }

  if (this.props.onClose) {
    this.props.onClose();
  }
};

public render(): React.ReactElement<IDataSheetViewProps> {
  const { isModal } = this.props;
  const closeIcon: IIconProps = { iconName: 'Cancel' };

  // Render the main content
  const mainContent = this.renderMainContent();

  // If modal mode, wrap in Modal component
  if (isModal) {
    return (
      <Modal
        isOpen={true}
        onDismiss={this.handleModalClose}
        isBlocking={false}
        containerClassName={modalStyles.modalContainer}
      >
        <div>
          <div className={modalStyles.modalHeader}>
            <Text variant="xLarge" as="h2">
              DataSheet View
            </Text>
            <IconButton
              iconProps={closeIcon}
              ariaLabel="Close modal"
              onClick={this.handleModalClose}
              className={modalStyles.closeButton}
            />
          </div>

          <div className={modalStyles.modalBody}>
            {mainContent}
          </div>

          <div className={modalStyles.modalFooter}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: '100%'
            }}>
              <Text className={modalStyles.footerText}>
                Use DataSheet view for bulk edits and Outlook imports.
                Make your changes and click Save.
              </Text>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                {/* Unsaved changes warning */}
                {this.state.hasUnsavedChanges && (
                  <Text
                    variant="small"
                    styles={{ root: { color: '#d83b01', fontStyle: 'italic' } }}
                  >
                    You have unsaved changes
                  </Text>
                )}
                <PrimaryButton
                  text={this.state.isSaving ? 'Saving...' : 'Save Changes'}
                  disabled={!this.state.hasUnsavedChanges || this.state.isSaving}
                  onClick={this.saveAllChanges}
                  iconProps={this.state.isSaving
                    ? { iconName: 'Sync' }
                    : { iconName: 'Save' }
                  }
                />
              </div>
            </div>
          </div>
        </div>
      </Modal>
    );
  }

  // Non-modal mode (legacy)
  return mainContent;
}

private renderMainContent(): React.ReactElement {
  const { isLoading } = this.props;
  const { error } = this.state;

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <Spinner size={SpinnerSize.large} label="Loading events..." />
      </div>
    );
  }

  return (
    <div className={this.props.isModal ? '' : styles.dataSheetView}>
      {error && (
        <MessageBar
          messageBarType={MessageBarType.error}
          onDismiss={() => this.setState({ error: undefined })}
          dismissButtonAriaLabel="Close"
        >
          {error}
        </MessageBar>
      )}

      <DetailsList
        items={this.props.events}
        columns={this.getColumns()}
        layoutMode={DetailsListLayoutMode.justified}
        selectionMode={SelectionMode.none}
        isHeaderVisible={true}
        compact={this.props.isModal ? true : false}
        className={this.props.isModal ? modalStyles.detailsList : styles.detailsList}
      />
    </div>
  );
}
```

## Styling

### Modal Container Styles (DataSheetModal.module.scss)

```scss
@import '~@fluentui/react/dist/sass/References.scss';

.modalContainer {
  // Full-width modal for maximum data visibility
  width: 1400px !important;
  max-width: 1400px !important;
  min-width: 1400px !important;

  // Apply styles to the modal content within this container
  .msModalMain {
    width: 1400px !important;
    max-width: 1400px !important;
    min-width: 1400px !important;
    border-radius: 0; // Remove rounded corners for clean square design
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2);
    background: white;
    border: 1px solid $ms-color-neutralLight;
    overflow: hidden;
  }

  .msModalScrollableContent {
    width: 1400px !important;
    max-width: 1400px !important;
    min-width: 1400px !important;
    border-radius: 0;
    overflow: hidden;
  }
}

.modalHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32px 40px 24px 40px;
  background: linear-gradient(90deg, $ms-color-themePrimary 0%, $ms-color-themeDark 100%);
  color: white;
  margin-bottom: 0;
  position: relative;
  border-radius: 0;

  h2 {
    margin: 0;
    font-weight: 600;
    font-size: 24px;
  }
}

.closeButton {
  color: white !important;

  &:hover {
    background-color: rgba(255, 255, 255, 0.1) !important;
    color: white !important;
  }
}

.modalBody {
  padding: 0;
  max-height: calc(100vh - 300px);
  overflow-y: auto;
  overflow-x: hidden;
}

.modalFooter {
  padding: 20px 40px;
  background-color: $ms-color-neutralLighter;
  border-top: 1px solid $ms-color-neutralLight;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.footerText {
  color: $ms-color-neutralSecondary;
  font-size: 13px;
  max-width: 60%;
}

.detailsList {
  // Compact styling for modal view
  :global(.ms-DetailsHeader) {
    background-color: $ms-color-neutralLighter;
    border-bottom: 1px solid $ms-color-neutralLight;

    :global(.ms-DetailsHeader-cell) {
      background-color: $ms-color-neutralLighter;
      border-right: 1px solid $ms-color-neutralLight;
      font-weight: 600;
      color: $ms-color-neutralPrimary;

      &:hover {
        background-color: $ms-color-neutralLight;
      }
    }
  }

  :global(.ms-DetailsRow) {
    border-bottom: 1px solid $ms-color-neutralLight;

    &:hover {
      background-color: $ms-color-neutralLighter;
    }

    :global(.ms-DetailsRow-cell) {
      border-right: 1px solid $ms-color-neutralLight;
      padding: 8px 12px;
      display: flex;
      align-items: center;
      min-height: 42px;
    }
  }
}
```

### Editable Cell Styles (DataSheetView.module.scss)

```scss
@import '~@fluentui/react/dist/sass/References.scss';

.dataSheetView {
  width: 100%;
  height: 100%;
  overflow: auto;
  background-color: $ms-color-white;

  .loadingContainer {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 200px;
    flex-direction: column;
  }
}

.editableCell {
  width: 100%;
  display: flex;
  align-items: center;

  // Remove default dropdown borders for inline editing look
  :global(.ms-Dropdown) {
    width: 100%;

    :global(.ms-Dropdown-title) {
      border: none !important;
      background-color: transparent !important;
      padding: 0 !important;
      height: auto !important;
      line-height: normal !important;

      &:hover {
        border: 1px solid #0078d4 !important;
        background-color: #f3f2f1 !important;
      }

      &:focus {
        border: 1px solid #0078d4 !important;
        background-color: #ffffff !important;
      }
    }

    :global(.ms-Dropdown-caretDown) {
      color: #605e5c;
      opacity: 0.7;

      &:hover {
        opacity: 1;
      }
    }
  }

  // Checkbox styling
  :global(.ms-Checkbox) {
    :global(.ms-Checkbox-checkbox) {
      border-radius: 2px;

      &:hover {
        border-color: #0078d4;
      }
    }
  }
}
```

## Best Practices

### 1. State Management

**DO:**
- Use `Map<number | string, Partial<T>>` for pending changes tracking
- Track changes per row and per field
- Provide visual indicators for all modified fields
- Clear pending changes after successful save

**DON'T:**
- Auto-save on every change (causes performance issues)
- Lose pending changes on component re-render
- Allow modal close without warning when changes exist

### 2. User Experience

**DO:**
- Show "You have unsaved changes" warning prominently
- Disable save button when no changes exist
- Show progress indicator during save operation
- Provide confirmation before closing with unsaved changes
- Use combined date/time columns to maximize space

**DON'T:**
- Hide the save button or make it unclear
- Allow users to lose work accidentally
- Block the UI during save (use async operations)

### 3. Performance

**DO:**
- Use `SelectionMode.none` to avoid selection overhead
- Implement compact mode for modal views
- Batch all saves in single operation
- Use efficient Map operations for change tracking

**DON'T:**
- Re-render entire grid on every field change
- Make individual API calls for each field change
- Load unnecessary data into the grid

### 4. Error Handling

**DO:**
- Show clear error messages in MessageBar
- Log errors for debugging
- Allow users to retry failed saves
- Preserve pending changes on save failure

**DON'T:**
- Silently fail save operations
- Clear pending changes on error
- Show technical error messages to users

## Common Pitfalls

### Pitfall 1: Losing Pending Changes on Re-render

**Problem:** Component re-renders and pending changes are lost.

**Solution:** Store pending changes in component state, not local variables.

```typescript
// ❌ BAD - Lost on re-render
let pendingChanges = {};

// ✅ GOOD - Persisted in state
this.state = {
  pendingChanges: new Map<number | string, Partial<ICalendarEvent>>()
};
```

### Pitfall 2: Not Showing Visual Indicators

**Problem:** Users can't tell which fields have been modified.

**Solution:** Apply distinct styling to modified fields.

```typescript
// ✅ GOOD - Clear visual feedback
styles={{
  title: {
    border: hasChanges ? '2px solid #0078d4' : 'none',
    backgroundColor: hasChanges ? '#f3f9ff' : 'transparent'
  }
}}
```

### Pitfall 3: Auto-saving Too Frequently

**Problem:** Making API calls on every keystroke causes performance issues.

**Solution:** Use explicit save button with batch operation.

```typescript
// ❌ BAD - Save on every change
onChange={(_, value) => {
  this.saveToSharePoint(value); // Too many API calls!
}}

// ✅ GOOD - Track changes, save on button click
onChange={(_, value) => {
  this.updateEventField(eventId, 'field', value); // Local state only
}}
```

### Pitfall 4: Not Handling Modal Close with Unsaved Changes

**Problem:** Users accidentally lose work by closing modal.

**Solution:** Prompt before closing when changes exist.

```typescript
// ✅ GOOD - Protect user's work
private handleModalClose = (): void => {
  if (this.state.hasUnsavedChanges) {
    const shouldClose = window.confirm(
      'You have unsaved changes. Are you sure you want to close without saving?'
    );
    if (!shouldClose) return;
  }
  this.props.onClose();
};
```

### Pitfall 5: Horizontal Scrollbars

**Problem:** Too many columns cause horizontal scrolling.

**Solution:** Combine related columns (date+time) and use full modal width.

```typescript
// ✅ GOOD - Combined columns
{
  key: 'start',
  name: 'Start',
  onRender: (item) => (
    <Text>
      {item.start.toLocaleDateString()} {item.start.toLocaleTimeString()}
    </Text>
  )
}
```

## Testing Scenarios

### Test 1: Basic Edit and Save

```typescript
describe('DataSheetView - Basic Edit', () => {
  it('should track pending changes and save successfully', async () => {
    const wrapper = mount(<DataSheetView {...mockProps} />);

    // Make a change
    const dropdown = wrapper.find('Dropdown').first();
    dropdown.simulate('change', null, { key: 'NewValue' });

    // Verify pending changes tracked
    expect(wrapper.state('hasUnsavedChanges')).toBe(true);
    expect(wrapper.state('pendingChanges').size).toBe(1);

    // Click save
    const saveButton = wrapper.find('PrimaryButton');
    await saveButton.simulate('click');

    // Verify changes cleared
    expect(wrapper.state('hasUnsavedChanges')).toBe(false);
    expect(wrapper.state('pendingChanges').size).toBe(0);
  });
});
```

### Test 2: Multiple Changes Across Rows

```typescript
describe('DataSheetView - Multiple Changes', () => {
  it('should track changes across multiple rows', () => {
    const wrapper = mount(<DataSheetView {...mockProps} />);

    // Change field in row 1
    wrapper.instance().updateEventField(1, 'status', 'Confirmed');

    // Change field in row 2
    wrapper.instance().updateEventField(2, 'swimlane', 'DISA');

    // Verify both tracked
    expect(wrapper.state('pendingChanges').size).toBe(2);
    expect(wrapper.state('pendingChanges').get(1)).toEqual({ status: 'Confirmed' });
    expect(wrapper.state('pendingChanges').get(2)).toEqual({ swimlane: 'DISA' });
  });
});
```

### Test 3: Unsaved Changes Warning

```typescript
describe('DataSheetView - Unsaved Changes Warning', () => {
  it('should prompt before closing with unsaved changes', () => {
    const mockOnClose = jest.fn();
    const wrapper = mount(<DataSheetView {...mockProps} onClose={mockOnClose} />);

    // Make a change
    wrapper.instance().updateEventField(1, 'status', 'Confirmed');

    // Mock window.confirm
    window.confirm = jest.fn(() => false);

    // Try to close
    wrapper.instance().handleModalClose();

    // Verify prompt shown and close prevented
    expect(window.confirm).toHaveBeenCalled();
    expect(mockOnClose).not.toHaveBeenCalled();
  });
});
```

### Test 4: Visual Change Indicators

```typescript
describe('DataSheetView - Visual Indicators', () => {
  it('should show visual indicators for modified fields', () => {
    const wrapper = mount(<DataSheetView {...mockProps} />);

    // Make a change
    wrapper.instance().updateEventField(1, 'status', 'Confirmed');
    wrapper.update();

    // Find the modified cell
    const statusCell = wrapper.find('[data-event-id="1"]').find('.editableCell').first();
    const dropdown = statusCell.find('Dropdown');

    // Verify visual indicator styles applied
    expect(dropdown.prop('styles').title.border).toBe('2px solid #0078d4');
    expect(dropdown.prop('styles').title.backgroundColor).toBe('#f3f9ff');
  });
});
```

### Test 5: Batch Save Error Handling

```typescript
describe('DataSheetView - Error Handling', () => {
  it('should handle save errors gracefully', async () => {
    const mockService = {
      updateEvent: jest.fn().mockRejectedValue(new Error('Network error'))
    };

    const wrapper = mount(<DataSheetView {...mockProps} />);
    wrapper.instance().sharePointService = mockService;

    // Make changes
    wrapper.instance().updateEventField(1, 'status', 'Confirmed');

    // Try to save
    await wrapper.instance().saveAllChanges();

    // Verify error shown and changes preserved
    expect(wrapper.state('error')).toBeTruthy();
    expect(wrapper.state('hasUnsavedChanges')).toBe(true);
    expect(wrapper.state('pendingChanges').size).toBe(1);
  });
});
```

## Real-World Examples

### Example 1: BigCal DataSheet View

**Use Case:** Bulk edit calendar events with multiple custom fields

**Implementation:**
- 1400px wide modal for maximum data visibility
- Combined Start Date+Time and End Date+Time columns
- Editable fields: Status, Event Category, IMO, OPR, Private, Description
- Read-only fields: Title, Start, End
- Visual indicators for all pending changes
- Batch save with progress indication

**Key Features:**
- Handles both Public and Private events
- HTML stripping for Outlook-imported descriptions
- Emoji icons in column headers for visual appeal
- Responsive column widths with min/max constraints

### Example 2: Inventory Management

**Use Case:** Bulk update product inventory levels

```typescript
interface IInventoryItem {
  id: number;
  sku: string;
  name: string;
  quantity: number;
  location: string;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
}

// Column definitions
private getColumns = (): IColumn[] => {
  return [
    {
      key: 'sku',
      name: 'SKU',
      fieldName: 'sku',
      minWidth: 100,
      maxWidth: 120,
      isResizable: true,
      onRender: (item: IInventoryItem) => <Text>{item.sku}</Text>
    },
    {
      key: 'quantity',
      name: 'Quantity',
      fieldName: 'quantity',
      minWidth: 80,
      maxWidth: 100,
      isResizable: true,
      onRender: this.renderQuantityCell // Editable TextField
    },
    {
      key: 'status',
      name: 'Status',
      fieldName: 'status',
      minWidth: 120,
      maxWidth: 150,
      isResizable: true,
      onRender: this.renderStatusCell // Editable Dropdown
    }
  ];
};
```

### Example 3: Task Management

**Use Case:** Bulk update task assignments and priorities

```typescript
interface ITask {
  id: number;
  title: string;
  assignedTo: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  dueDate: Date;
  completed: boolean;
}

// Pending changes tracking
private updateTaskField = (taskId: number, field: keyof ITask, value: unknown): void => {
  const { pendingChanges } = this.state;
  const existingChanges = pendingChanges.get(taskId) || {};
  const updatedChanges = { ...existingChanges, [field]: value };

  const newPendingChanges = new Map(pendingChanges);
  newPendingChanges.set(taskId, updatedChanges);

  this.setState({
    pendingChanges: newPendingChanges,
    hasUnsavedChanges: true
  });
};
```

## Performance Considerations

### 1. Large Datasets

**Challenge:** Rendering 1000+ rows causes performance issues.

**Solutions:**
```typescript
// Use virtualization for large datasets
import { ScrollablePane, Sticky, StickyPositionType } from '@fluentui/react';

<ScrollablePane>
  <DetailsList
    items={this.props.events}
    columns={this.getColumns()}
    onRenderDetailsHeader={(props, defaultRender) => (
      <Sticky stickyPosition={StickyPositionType.Header}>
        {defaultRender!(props)}
      </Sticky>
    )}
  />
</ScrollablePane>

// Or implement pagination
private getPaginatedItems = (): ICalendarEvent[] => {
  const { currentPage, itemsPerPage } = this.state;
  const startIndex = currentPage * itemsPerPage;
  return this.props.events.slice(startIndex, startIndex + itemsPerPage);
};
```

### 2. Batch Save Optimization

**Challenge:** Saving 100+ items takes too long.

**Solutions:**
```typescript
// Parallel saves with concurrency limit
private saveAllChanges = async (): Promise<void> => {
  const { pendingChanges } = this.state;
  const pendingEntries = Array.from(pendingChanges.entries());

  // Process in batches of 10
  const batchSize = 10;
  for (let i = 0; i < pendingEntries.length; i += batchSize) {
    const batch = pendingEntries.slice(i, i + batchSize);
    await Promise.all(
      batch.map(([eventId, changes]) => this.saveEvent(eventId, changes))
    );
  }
};
```

### 3. Re-render Optimization

**Challenge:** Grid re-renders on every state change.

**Solutions:**
```typescript
// Use React.memo for cell renderers
const StatusCell = React.memo<{ item: ICalendarEvent; onChange: (value: string) => void }>(
  ({ item, onChange }) => (
    <Dropdown
      selectedKey={item.status}
      options={statusOptions}
      onChange={(_, option) => onChange(option?.key as string)}
    />
  ),
  (prevProps, nextProps) => {
    // Only re-render if item status changed
    return prevProps.item.status === nextProps.item.status;
  }
);

// Use shouldComponentUpdate
shouldComponentUpdate(nextProps: IDataSheetViewProps, nextState: IDataSheetViewState): boolean {
  // Only update if events, pending changes, or save state changed
  return (
    nextProps.events !== this.props.events ||
    nextState.pendingChanges !== this.state.pendingChanges ||
    nextState.isSaving !== this.state.isSaving ||
    nextState.hasUnsavedChanges !== this.state.hasUnsavedChanges
  );
}
```

## Integration Patterns

### Pattern 1: Lazy Loading

Load DataSheet component only when needed to reduce initial bundle size.

```typescript
// BigCal.tsx
const LazyDataSheetView = React.lazy(() =>
  import('./DataSheetView').then(module => ({ default: module.DataSheetView }))
);

// Render with Suspense
{this.state.isDataSheetModalOpen && (
  <LazyComponentErrorBoundary componentName="DataSheetView">
    <Suspense fallback={
      <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
        <Spinner size={SpinnerSize.large} label="Loading DataSheet view..." />
      </div>
    }>
      <LazyDataSheetView
        context={this.props.context}
        listName={this.props.listName}
        events={this.state.events}
        isLoading={this.state.isLoading}
        onEventsUpdated={this.loadEvents}
        isModal={true}
        onClose={this.closeDataSheetModal}
      />
    </Suspense>
  </LazyComponentErrorBoundary>
)}
```

### Pattern 2: Error Boundary

Wrap DataSheet in error boundary to prevent crashes.

```typescript
class LazyComponentErrorBoundary extends React.Component<
  { componentName: string; children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { componentName: string; children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): { hasError: boolean; error: Error } {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    Logger.error(`${this.props.componentName} error`, error, errorInfo);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <MessageBar messageBarType={MessageBarType.error}>
          Failed to load {this.props.componentName}. Please refresh the page.
        </MessageBar>
      );
    }

    return this.props.children;
  }
}
```

### Pattern 3: Parent-Child Communication

```typescript
// Parent component
class BigCal extends React.Component {
  private openDataSheetModal = (): void => {
    this.setState({ isDataSheetModalOpen: true });
  };

  private closeDataSheetModal = (): void => {
    this.setState({ isDataSheetModalOpen: false });
  };

  private handleEventsUpdated = (): void => {
    // Reload events after DataSheet saves
    this.loadEvents();
  };

  render() {
    return (
      <>
        <PrimaryButton
          text="DataSheet View"
          onClick={this.openDataSheetModal}
        />

        {this.state.isDataSheetModalOpen && (
          <DataSheetView
            events={this.state.events}
            onEventsUpdated={this.handleEventsUpdated}
            onClose={this.closeDataSheetModal}
          />
        )}
      </>
    );
  }
}
```

## Accessibility Considerations

### Keyboard Navigation

```typescript
// Enable keyboard navigation in grid
<DetailsList
  items={this.props.events}
  columns={this.getColumns()}
  onItemInvoked={(item) => {
    // Handle Enter key on row
    this.editItem(item);
  }}
  ariaLabelForGrid="Event data grid"
  ariaLabelForSelectionColumn="Toggle selection"
/>
```

### Screen Reader Support

```typescript
// Add ARIA labels
<div role="region" aria-label="DataSheet editing interface">
  <div aria-live="polite" aria-atomic="true">
    {this.state.hasUnsavedChanges && (
      <span className="sr-only">You have unsaved changes</span>
    )}
  </div>

  <DetailsList
    items={this.props.events}
    columns={this.getColumns()}
    ariaLabelForGrid="Calendar events data grid"
  />
</div>
```

### Focus Management

```typescript
// Return focus to trigger button after modal closes
private handleModalClose = (): void => {
  if (this.state.hasUnsavedChanges) {
    const shouldClose = window.confirm(
      'You have unsaved changes. Are you sure you want to close without saving?'
    );
    if (!shouldClose) return;
  }

  // Store reference to trigger button
  const triggerButton = document.activeElement as HTMLElement;

  this.props.onClose();

  // Return focus after modal closes
  setTimeout(() => {
    if (triggerButton) {
      triggerButton.focus();
    }
  }, 100);
};
```

## Summary

The DataSheet View Pattern provides a robust, user-friendly solution for bulk data editing in modal dialogs. Key takeaways:

1. **Track pending changes** in Map structure for efficient updates
2. **Provide visual indicators** for all modified fields
3. **Use explicit save** with batch operations for performance
4. **Warn before closing** with unsaved changes
5. **Maximize horizontal space** with combined columns
6. **Handle errors gracefully** and preserve user work
7. **Lazy load** component to reduce initial bundle size
8. **Test thoroughly** including edge cases and error scenarios

This pattern has been proven in production with BigCal's DataSheet View, handling hundreds of events with multiple custom fields efficiently and reliably.

---

**Pattern Status:** ✅ Production-Proven
**Complexity:** Medium
**Reusability:** High
**Dependencies:** @fluentui/react, SharePoint services
**Recommended For:** Bulk editing, data management, administrative interfaces



