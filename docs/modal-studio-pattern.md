# 🎨 Modal Studio Pattern

## Overview

The **Modal Studio Pattern** is a proven approach for creating professional configuration and editing interfaces in modal dialogs. This pattern provides a full-width, immersive editing experience with explicit save operations, real-time preview, progress indicators, and comprehensive user feedback. It's been successfully implemented in Legend Studio (Color Palette Studio), DataSheet View, and other configuration interfaces.

## What Makes This Pattern Valuable

### User Benefits
- **Focused Experience**: Modal takes over screen for distraction-free editing
- **Explicit Control**: Users decide when to save changes
- **Real-Time Preview**: See changes immediately before committing
- **Clear Feedback**: Know exactly what's happening at all times
- **Undo Protection**: Can cancel without saving changes

### Developer Benefits
- **Reusable Structure**: Same pattern works for many use cases
- **State Management**: Clear separation of local vs saved state
- **Error Handling**: Built-in patterns for success/error feedback
- **Type Safety**: Strong TypeScript interfaces
- **Accessibility**: Keyboard navigation and screen reader support

## Core Problem

Applications need configuration interfaces that:
- **Provide** immersive editing experience without page navigation
- **Allow** users to make multiple changes before committing
- **Show** real-time preview of changes
- **Prevent** accidental data loss from unsaved changes
- **Give** clear feedback during save operations
- **Handle** errors gracefully with actionable messages
- **Support** both simple and complex editing scenarios

## Solution Architecture

### The Pattern

```
┌─────────────────────────────────────────────────────────────┐
│                    Modal Studio Component                    │
├─────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Header: Title + Close Button                          │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Body: Editing Interface                                │ │
│  │  • Local state (not yet saved)                          │ │
│  │  • Real-time preview                                    │ │
│  │  • Validation feedback                                  │ │
│  │  • Progress indicators                                  │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Footer: Actions + Status                              │ │
│  │  • Save button (explicit)                               │ │
│  │  • Cancel button                                        │ │
│  │  • Unsaved changes indicator                            │ │
│  │  • Success/Error messages                               │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

1. **Modal Container** - Full-width dialog with controlled width
2. **Header Section** - Title and close button
3. **Body Section** - Main editing interface with local state
4. **Footer Section** - Save/Cancel actions and status messages
5. **State Manager** - Tracks local changes vs saved state
6. **Feedback System** - Success/error messages with auto-dismiss
7. **Save Handler** - Async save with progress indication

## Component Structure

### Props Interface

```typescript
export interface IModalStudioProps {
  // Modal control
  isOpen: boolean;
  onDismiss: () => void;
  
  // Data
  items: IDataItem[];
  isLoading: boolean;
  error?: string;
  
  // Save callback
  onSave: (items: IDataItem[]) => Promise<void>;
  
  // Optional: Real-time preview callback
  onPreviewChange?: (items: IDataItem[]) => void;
}
```

### State Interface

```typescript
export interface IModalStudioState {
  // Local editing state (not yet saved)
  localItems: IDataItem[];
  
  // Save state
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  
  // Feedback messages
  successMessage?: string;
  errorMessage?: string;
  
  // UI state
  selectedItem?: IDataItem;
  showDetailEditor: boolean;
}
```

### Data Interface (Generic)

```typescript
export interface IDataItem {
  id: number | string;
  name: string;
  value: string;
  // ... additional fields specific to your use case
}
```

## Implementation Patterns

### 1. Modal Container with Controlled Width

```tsx
import { Modal, IconButton, PrimaryButton, DefaultButton } from '@fluentui/react';
import styles from './ModalStudio.module.scss';

export class ModalStudio extends React.Component<IModalStudioProps, IModalStudioState> {
  public render(): React.ReactElement {
    const { isOpen, onDismiss } = this.props;
    const { isSaving } = this.state;
    
    return (
      <Modal
        isOpen={isOpen}
        onDismiss={isSaving ? undefined : onDismiss} // Prevent close during save
        isBlocking={isSaving} // Block interaction during save
        containerClassName={styles.modalContainer}
      >
        <div className={styles.modalContent}>
          {this.renderHeader()}
          {this.renderBody()}
          {this.renderFooter()}
        </div>
      </Modal>
    );
  }
}
```

**SCSS for Full-Width Modal:**
```scss
.modalContainer {
  width: 1400px !important;
  max-width: 90vw !important;
  min-width: 800px !important;
  
  .msModalMain {
    width: 100%;
    max-height: 90vh;
    border-radius: 0;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2);
    overflow: hidden;
  }
}

.modalContent {
  display: flex;
  flex-direction: column;
  height: 100%;
}
```

### 2. Header with Title and Close Button

```tsx
private renderHeader = (): React.ReactElement => {
  const { isSaving } = this.state;
  
  return (
    <div className={styles.modalHeader}>
      <Text variant="xLarge" as="h2">
        🎨 Configuration Studio
      </Text>
      <IconButton
        iconProps={{ iconName: 'Cancel' }}
        ariaLabel="Close"
        onClick={this.props.onDismiss}
        disabled={isSaving}
        title={isSaving ? "Please wait while saving..." : "Close"}
        className={styles.closeButton}
      />
    </div>
  );
};
```

**SCSS for Header:**
```scss
.modalHeader {
  padding: 20px 24px;
  background: linear-gradient(135deg, #0078d4 0%, #106ebe 100%);
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 2px solid #005a9e;
  
  h2 {
    margin: 0;
    color: white;
    font-weight: 600;
  }
}

.closeButton {
  color: rgba(255, 255, 255, 0.9) !important;
  width: 40px;
  height: 40px;
  border-radius: 20px;
  transition: all 0.2s ease;
  
  &:hover {
    background-color: rgba(255, 255, 255, 0.2) !important;
    color: white !important;
    transform: scale(1.05);
  }
}
```

### 3. Body with Local State Editing

```tsx
private renderBody = (): React.ReactElement => {
  const { localItems, selectedItem, showDetailEditor } = this.state;

  return (
    <div className={styles.modalBody}>
      {this.renderFeedbackMessages()}

      <Stack tokens={{ childrenGap: 20 }}>
        {/* List of items */}
        <div className={styles.itemsList}>
          {localItems.map(item => (
            <div
              key={item.id}
              className={`${styles.itemCard} ${this.isItemModified(item) ? styles.modified : ''}`}
              onClick={() => this.handleItemSelect(item)}
            >
              <Stack horizontal horizontalAlign="space-between" verticalAlign="center">
                <Stack tokens={{ childrenGap: 8 }}>
                  <Text variant="medium" styles={{ root: { fontWeight: 600 } }}>
                    {item.name}
                  </Text>
                  <Text variant="small" styles={{ root: { color: '#605e5c' } }}>
                    {item.value}
                  </Text>
                </Stack>

                {this.isItemModified(item) && (
                  <Icon
                    iconName="Edit"
                    styles={{ root: { color: '#0078d4', fontSize: 16 } }}
                    title="Modified"
                  />
                )}
              </Stack>
            </div>
          ))}
        </div>

        {/* Detail editor (if item selected) */}
        {showDetailEditor && selectedItem && (
          <div className={styles.detailEditor}>
            {this.renderDetailEditor(selectedItem)}
          </div>
        )}
      </Stack>
    </div>
  );
};
```

**SCSS for Body:**
```scss
.modalBody {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
  background: white;
  max-height: 60vh;
}

.itemsList {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.itemCard {
  padding: 16px;
  border: 2px solid #edebe9;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: #0078d4;
    box-shadow: 0 4px 12px rgba(0, 120, 212, 0.15);
    transform: translateY(-2px);
  }

  &.modified {
    border-color: #0078d4;
    background: rgba(0, 120, 212, 0.05);
  }
}

.detailEditor {
  padding: 20px;
  background: #f3f2f1;
  border-radius: 8px;
  border: 1px solid #edebe9;
}
```

### 4. Footer with Save/Cancel and Status

```tsx
private renderFooter = (): React.ReactElement => {
  const { hasUnsavedChanges, isSaving } = this.state;

  return (
    <div className={styles.modalFooter}>
      <Stack horizontal horizontalAlign="space-between" verticalAlign="center">
        {/* Left side: Status text */}
        <Text variant="small" styles={{ root: { color: '#605e5c' } }}>
          {hasUnsavedChanges ? (
            <span style={{ color: '#d83b01', fontStyle: 'italic' }}>
              ⚠️ You have unsaved changes
            </span>
          ) : (
            'All changes saved'
          )}
        </Text>

        {/* Right side: Action buttons */}
        <Stack horizontal tokens={{ childrenGap: 12 }}>
          <DefaultButton
            text="Cancel"
            onClick={this.handleCancel}
            disabled={isSaving}
          />
          <PrimaryButton
            text={isSaving ? 'Saving...' : 'Save Changes'}
            onClick={this.handleSave}
            disabled={!hasUnsavedChanges || isSaving}
            iconProps={isSaving ? { iconName: 'Sync' } : { iconName: 'Save' }}
          />
        </Stack>
      </Stack>
    </div>
  );
};
```

**SCSS for Footer:**
```scss
.modalFooter {
  padding: 16px 24px;
  background: #f3f2f1;
  border-top: 1px solid #edebe9;

  // Ensure footer stays at bottom
  position: sticky;
  bottom: 0;
  z-index: 10;
}
```

### 5. Feedback Messages with Auto-Dismiss

```tsx
private renderFeedbackMessages = (): React.ReactElement | null => {
  const { successMessage, errorMessage } = this.state;

  if (!successMessage && !errorMessage) return null;

  return (
    <Stack tokens={{ childrenGap: 12 }}>
      {successMessage && (
        <MessageBar
          messageBarType={MessageBarType.success}
          onDismiss={() => this.setState({ successMessage: undefined })}
        >
          {successMessage}
        </MessageBar>
      )}

      {errorMessage && (
        <MessageBar
          messageBarType={MessageBarType.error}
          onDismiss={() => this.setState({ errorMessage: undefined })}
        >
          {errorMessage}
        </MessageBar>
      )}
    </Stack>
  );
};
```

### 6. State Management - Local vs Saved

```typescript
constructor(props: IModalStudioProps) {
  super(props);

  this.state = {
    // Initialize local state from props
    localItems: [...props.items],
    isSaving: false,
    hasUnsavedChanges: false,
    successMessage: undefined,
    errorMessage: undefined,
    selectedItem: undefined,
    showDetailEditor: false
  };
}

// Update local state when props change (e.g., after save)
public componentDidUpdate(prevProps: IModalStudioProps): void {
  if (this.props.items !== prevProps.items && !this.state.hasUnsavedChanges) {
    // Props updated and no unsaved changes - sync local state
    this.setState({
      localItems: [...this.props.items]
    });
  }
}

// Track if item has been modified
private isItemModified = (item: IDataItem): boolean => {
  const originalItem = this.props.items.find(i => i.id === item.id);
  if (!originalItem) return true; // New item

  // Compare relevant fields
  return (
    item.name !== originalItem.name ||
    item.value !== originalItem.value
  );
};

// Update local item (not saved yet)
private updateLocalItem = (itemId: number | string, updates: Partial<IDataItem>): void => {
  this.setState(prevState => {
    const localItems = prevState.localItems.map(item =>
      item.id === itemId ? { ...item, ...updates } : item
    );

    // Check if any items are modified
    const hasUnsavedChanges = localItems.some(item => this.isItemModified(item));

    return {
      localItems,
      hasUnsavedChanges
    };
  });

  // Optional: Trigger real-time preview
  if (this.props.onPreviewChange) {
    this.props.onPreviewChange(this.state.localItems);
  }
};
```

### 7. Save Handler with Progress and Feedback

```typescript
private handleSave = async (): Promise<void> => {
  this.setState({
    isSaving: true,
    errorMessage: undefined,
    successMessage: undefined
  });

  try {
    // Call parent save handler
    await this.props.onSave(this.state.localItems);

    // Success!
    this.setState({
      isSaving: false,
      hasUnsavedChanges: false,
      successMessage: '✅ Changes saved successfully!'
    });

    // Auto-dismiss success message after 3 seconds
    setTimeout(() => {
      this.setState({ successMessage: undefined });
    }, 3000);

  } catch (error) {
    // Error handling
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    this.setState({
      isSaving: false,
      errorMessage: `❌ Failed to save changes: ${errorMessage}`
    });

    // Auto-dismiss error message after 5 seconds
    setTimeout(() => {
      this.setState({ errorMessage: undefined });
    }, 5000);
  }
};
```

### 8. Cancel Handler with Unsaved Changes Warning

```typescript
private handleCancel = (): void => {
  const { hasUnsavedChanges } = this.state;

  if (hasUnsavedChanges) {
    // Warn user about unsaved changes
    const shouldCancel = window.confirm(
      'You have unsaved changes. Are you sure you want to cancel?'
    );

    if (!shouldCancel) {
      return; // Don't cancel
    }
  }

  // Reset local state to original
  this.setState({
    localItems: [...this.props.items],
    hasUnsavedChanges: false,
    selectedItem: undefined,
    showDetailEditor: false,
    successMessage: undefined,
    errorMessage: undefined
  });

  // Close modal
  this.props.onDismiss();
};
```

### 9. Prevent Close During Save

```tsx
<Modal
  isOpen={isOpen}
  onDismiss={isSaving ? undefined : this.handleCancel} // Disable dismiss during save
  isBlocking={isSaving} // Block all interaction during save
  containerClassName={styles.modalContainer}
>
```

**Why This Matters:**
- Prevents data loss from accidental close during save
- Provides clear visual feedback (modal is blocking)
- User can't interact with anything until save completes

## Visual Design Patterns

### 1. Gradient Header for Visual Impact

```scss
.modalHeader {
  background: linear-gradient(135deg, #0078d4 0%, #106ebe 100%);
  color: white;
  padding: 20px 24px;
  border-bottom: 2px solid #005a9e;
}
```

### 2. Modified Item Highlighting

```scss
.itemCard {
  &.modified {
    border-color: #0078d4;
    background: rgba(0, 120, 212, 0.05);

    // Add subtle pulse animation
    animation: pulse 2s ease-in-out infinite;
  }
}

@keyframes pulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(0, 120, 212, 0.4);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(0, 120, 212, 0);
  }
}
```

### 3. Smooth Transitions

```scss
.itemCard {
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 120, 212, 0.15);
  }
}

.closeButton {
  transition: all 0.2s ease;

  &:hover {
    transform: scale(1.05);
  }

  &:active {
    transform: scale(0.95);
  }
}
```

### 4. Loading States

```scss
.savingOverlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;

  .savingContent {
    text-align: center;

    .spinner {
      margin-bottom: 16px;
    }
  }
}
```

## Best Practices

### 1. State Management

**Always:**
- Keep local state separate from saved state
- Track `hasUnsavedChanges` flag
- Sync local state when props update (if no unsaved changes)
- Use immutable updates (`[...array]`, `{ ...object }`)
- Provide real-time preview callback (optional)

**Avoid:**
- Mutating props directly
- Auto-saving without user confirmation
- Losing local changes when props update
- Mutable state updates
- Silent state changes

### 2. Save Operations

**Always:**
- Show progress indicator during save
- Disable close button during save
- Block modal interaction during save (`isBlocking={true}`)
- Provide success feedback
- Handle errors gracefully
- Auto-dismiss success messages (3 seconds)
- Keep error messages visible longer (5 seconds)

**Avoid:**
- Silent saves without feedback
- Allowing modal close during save
- Generic error messages
- Permanent success messages
- Blocking UI indefinitely

### 3. User Experience

**Always:**
- Warn before discarding unsaved changes
- Highlight modified items visually
- Show unsaved changes indicator in footer
- Disable save button when no changes
- Provide cancel button
- Support ESC key to close (when not saving)
- Use clear, actionable button labels

**Avoid:**
- Losing changes without warning
- No visual indication of modifications
- Always-enabled save button
- No way to cancel
- Ignoring keyboard shortcuts
- Generic button labels ("OK", "Submit")

### 4. Visual Design

**Always:**
- Use gradient header for visual impact
- Provide smooth transitions (0.2s ease)
- Highlight modified items
- Use consistent spacing (16px, 20px, 24px)
- Ensure adequate contrast ratios
- Make interactive elements obvious

**Avoid:**
- Flat, boring headers
- Jarring instant changes
- No visual feedback for modifications
- Inconsistent spacing
- Poor contrast
- Unclear clickable areas

### 5. Error Handling

**Always:**
- Catch all async errors
- Provide specific error messages
- Log errors for debugging
- Allow retry after error
- Clear error state before retry
- Show error in MessageBar (dismissible)

**Avoid:**
- Unhandled promise rejections
- Generic "Error occurred" messages
- Silent failures
- No retry mechanism
- Persistent error state
- Alert() for errors

## Common Pitfalls and Solutions

### Pitfall 1: Props Update Overwrites Local Changes

**Problem:** User makes changes, then props update and local changes are lost

**Solution:**
```typescript
public componentDidUpdate(prevProps: IModalStudioProps): void {
  // Only sync if no unsaved changes
  if (this.props.items !== prevProps.items && !this.state.hasUnsavedChanges) {
    this.setState({ localItems: [...this.props.items] });
  }
}
```

### Pitfall 2: Modal Closes During Save

**Problem:** User clicks outside modal during save, losing progress

**Solution:**
```tsx
<Modal
  isOpen={isOpen}
  onDismiss={isSaving ? undefined : this.handleCancel}
  isBlocking={isSaving}
>
```

### Pitfall 3: No Feedback After Save

**Problem:** Save completes but user doesn't know if it worked

**Solution:**
```typescript
await this.props.onSave(items);
this.setState({ successMessage: '✅ Changes saved successfully!' });
setTimeout(() => this.setState({ successMessage: undefined }), 3000);
```

### Pitfall 4: Memory Leaks from Timeouts

**Problem:** Component unmounts but timeouts still fire

**Solution:**
```typescript
private messageTimeouts: number[] = [];

private setTrackedTimeout = (callback: () => void, delay: number): void => {
  const timeoutId = window.setTimeout(callback, delay);
  this.messageTimeouts.push(timeoutId);
};

public componentWillUnmount(): void {
  this.messageTimeouts.forEach(id => clearTimeout(id));
}
```

### Pitfall 5: Unsaved Changes Lost on Accidental Close

**Problem:** User clicks X button and loses all changes

**Solution:**
```typescript
private handleCancel = (): void => {
  if (this.state.hasUnsavedChanges) {
    const shouldCancel = window.confirm(
      'You have unsaved changes. Are you sure you want to cancel?'
    );
    if (!shouldCancel) return;
  }
  this.props.onDismiss();
};
```

## Real-World Examples

### Example 1: Legend Studio (Color Palette Studio)

**Use Case:** Configure colors and icons for calendar swimlanes and statuses

**Key Features:**
- Grid of color swatches
- Click to open color picker
- Real-time preview in main calendar
- Explicit save button
- "Restore Original Colors" action
- Auto-dismiss success messages

**Implementation Highlights:**
```typescript
// Real-time preview
private handleColorChange = async (option: IFieldOption, color: IColor): Promise<void> => {
  // Update local state
  const updatedMappings = this.updateColorMapping(option, color);
  this.setState({ localMappings: updatedMappings });

  // Trigger real-time preview
  this.props.onColorsChanged(updatedMappings);

  // Note: Not saved yet - user must click Save
};
```

### Example 2: DataSheet View

**Use Case:** Bulk edit calendar events in tabular format

**Key Features:**
- Full-width modal (1400px)
- Editable grid with inline editing
- Track pending changes per row
- Batch save all changes
- "You have unsaved changes" warning
- Explicit save button in footer

**Implementation Highlights:**
```typescript
// Track pending changes per item
interface IDataSheetViewState {
  pendingChanges: Map<number | string, Partial<ICalendarEvent>>;
  hasUnsavedChanges: boolean;
}

// Update single field
private updateEventField = (eventId: number | string, field: string, value: any): void => {
  this.setState(prevState => {
    const pendingChanges = new Map(prevState.pendingChanges);
    const existing = pendingChanges.get(eventId) || {};
    pendingChanges.set(eventId, { ...existing, [field]: value });

    return {
      pendingChanges,
      hasUnsavedChanges: pendingChanges.size > 0
    };
  });
};

// Save all changes
private saveAllChanges = async (): Promise<void> => {
  const { pendingChanges } = this.state;

  for (const [eventId, changes] of pendingChanges.entries()) {
    await this.saveEvent(eventId, changes);
  }

  this.setState({
    pendingChanges: new Map(),
    hasUnsavedChanges: false
  });
};
```

### Example 3: Icon Selector Modal

**Use Case:** Choose icon from multiple icon sets (Emoji, Unicode, Font Awesome, Fluent UI)

**Key Features:**
- Tabbed interface for icon sets
- Search/filter icons
- Preview selected icon
- Apply button (explicit save)
- Cancel to revert

**Implementation Highlights:**
```typescript
// Nested modal pattern
{showIconPicker && (
  <Modal
    isOpen={showIconPicker}
    onDismiss={() => this.setState({ showIconPicker: false })}
    containerClassName={styles.iconPickerModal}
  >
    <IconSelector
      selectedIcon={this.state.selectedIcon}
      onIconSelect={(icon) => this.setState({ selectedIcon: icon })}
      onApply={() => {
        this.applyIcon(this.state.selectedIcon);
        this.setState({ showIconPicker: false });
      }}
      onCancel={() => this.setState({ showIconPicker: false })}
    />
  </Modal>
)}
```

## Implementation Checklist

### Setup Phase
- [ ] Create props interface with `isOpen`, `onDismiss`, `onSave`
- [ ] Create state interface with local state and save tracking
- [ ] Create data interface for items being edited
- [ ] Set up SCSS module for modal styling

### Modal Structure
- [ ] Implement modal container with controlled width
- [ ] Add header with title and close button
- [ ] Add body with scrollable content area
- [ ] Add footer with save/cancel buttons
- [ ] Configure `isBlocking` during save

### State Management
- [ ] Initialize local state from props in constructor
- [ ] Implement `componentDidUpdate` to sync props (when no unsaved changes)
- [ ] Track `hasUnsavedChanges` flag
- [ ] Implement item modification detection
- [ ] Handle local state updates immutably

### Save/Cancel Logic
- [ ] Implement async save handler with try/catch
- [ ] Show progress indicator during save
- [ ] Disable close button during save
- [ ] Provide success feedback with auto-dismiss
- [ ] Handle errors with specific messages
- [ ] Implement cancel with unsaved changes warning
- [ ] Reset local state on cancel

### Feedback System
- [ ] Add success message state
- [ ] Add error message state
- [ ] Implement auto-dismiss timeouts
- [ ] Track timeouts to prevent memory leaks
- [ ] Clear timeouts on unmount
- [ ] Render MessageBar components

### Visual Design
- [ ] Style header with gradient background
- [ ] Add hover effects to interactive elements
- [ ] Highlight modified items
- [ ] Add smooth transitions (0.2s ease)
- [ ] Style close button with hover/active states
- [ ] Ensure responsive design

### Testing
- [ ] Test save with valid data
- [ ] Test save with invalid data (error handling)
- [ ] Test cancel with unsaved changes
- [ ] Test cancel without unsaved changes
- [ ] Test close button during save (should be disabled)
- [ ] Test ESC key to close
- [ ] Test props update with unsaved changes
- [ ] Test props update without unsaved changes
- [ ] Test success message auto-dismiss
- [ ] Test error message auto-dismiss

## Testing Scenarios

### Scenario 1: Normal Edit and Save
1. Open modal
2. Make changes to items
3. Verify "unsaved changes" indicator appears
4. Click Save
5. Verify progress indicator shows
6. Verify success message appears
7. Verify success message auto-dismisses after 3 seconds
8. Verify "unsaved changes" indicator disappears

### Scenario 2: Cancel with Unsaved Changes
1. Open modal
2. Make changes to items
3. Click Cancel
4. Verify warning dialog appears
5. Click "No" in warning
6. Verify modal stays open with changes intact
7. Click Cancel again
8. Click "Yes" in warning
9. Verify modal closes and changes are discarded

### Scenario 3: Save Error
1. Open modal
2. Make changes
3. Disconnect network (simulate error)
4. Click Save
5. Verify error message appears
6. Verify error message is specific
7. Verify error message auto-dismisses after 5 seconds
8. Verify can retry save

### Scenario 4: Close During Save
1. Open modal
2. Make changes
3. Click Save
4. Try to click close button (should be disabled)
5. Try to click outside modal (should be blocked)
6. Try to press ESC (should be blocked)
7. Wait for save to complete
8. Verify can now close modal

### Scenario 5: Props Update
1. Open modal
2. Make changes (don't save)
3. Parent component updates props
4. Verify local changes are NOT overwritten
5. Save changes
6. Parent component updates props again
7. Verify local state syncs with new props

## Performance Considerations

### Large Datasets

**For 1000+ Items:**
```typescript
// Use virtualization for item list
import { List } from 'react-virtualized';

<List
  width={800}
  height={600}
  rowCount={this.state.localItems.length}
  rowHeight={80}
  rowRenderer={this.renderItem}
/>
```

### Debounce Real-Time Preview

**For Expensive Preview Operations:**
```typescript
private previewDebounceTimeout: number | null = null;

private triggerPreview = (items: IDataItem[]): void => {
  if (this.previewDebounceTimeout) {
    clearTimeout(this.previewDebounceTimeout);
  }

  this.previewDebounceTimeout = window.setTimeout(() => {
    if (this.props.onPreviewChange) {
      this.props.onPreviewChange(items);
    }
  }, 300); // 300ms debounce
};
```

### Batch Updates

**For Multiple Rapid Changes:**
```typescript
private updateBatch = (updates: Array<{ id: number | string; changes: Partial<IDataItem> }>): void => {
  this.setState(prevState => {
    let localItems = [...prevState.localItems];

    updates.forEach(({ id, changes }) => {
      localItems = localItems.map(item =>
        item.id === id ? { ...item, ...changes } : item
      );
    });

    return { localItems, hasUnsavedChanges: true };
  });
};
```

## Accessibility Considerations

### Keyboard Navigation

```tsx
// ESC to close (when not saving)
public componentDidMount(): void {
  document.addEventListener('keydown', this.handleKeyDown);
}

public componentWillUnmount(): void {
  document.removeEventListener('keydown', this.handleKeyDown);
}

private handleKeyDown = (e: KeyboardEvent): void => {
  if (e.key === 'Escape' && !this.state.isSaving) {
    this.handleCancel();
  }
};
```

### Focus Management

```typescript
private modalRef = React.createRef<HTMLDivElement>();

public componentDidUpdate(prevProps: IModalStudioProps): void {
  if (this.props.isOpen && !prevProps.isOpen) {
    // Focus first interactive element when modal opens
    setTimeout(() => {
      const firstButton = this.modalRef.current?.querySelector('button');
      firstButton?.focus();
    }, 100);
  }
}
```

### Screen Reader Support

```tsx
<div
  role="dialog"
  aria-labelledby="modal-title"
  aria-describedby="modal-description"
  aria-modal="true"
>
  <h2 id="modal-title">Configuration Studio</h2>
  <div id="modal-description">
    Make changes and click Save to apply them.
  </div>
</div>
```

## Related Patterns

- [Excel Import/Export Pattern](excel-import-export-pattern.md) - For bulk data operations
- [DataSheet View Pattern](datasheet-view-pattern.md) - For tabular editing
- [Legendary Print Pattern](legendary-print-pattern.md) - For fullscreen preview modals
- [WebPart Configuration Access Pattern](webpart-configuration-access-pattern.md) - For settings UI

## Summary

The **Modal Studio Pattern** provides a professional, user-friendly approach to configuration and editing interfaces:

**Key Principles:**
1. **Local State** - Edit without affecting saved data
2. **Explicit Save** - User controls when changes are committed
3. **Clear Feedback** - Always know what's happening
4. **Unsaved Changes Protection** - Never lose work accidentally
5. **Progress Indication** - Show save operations clearly
6. **Error Resilience** - Handle failures gracefully

**The Secret Sauce:**
- Separate local state from saved state
- Block modal during save operations
- Warn before discarding unsaved changes
- Auto-dismiss success messages (3s)
- Keep error messages longer (5s)
- Real-time preview (optional)

**Benefits:**
- **Users** get clear, predictable editing experience
- **Developers** get reusable, proven pattern
- **Organizations** get professional, polished interfaces

This pattern has been proven in production across multiple features (Legend Studio, DataSheet View, Icon Selector). Use it to create configuration interfaces that users trust and enjoy. 🎨

---

**Document Version:** 1.0
**Last Updated:** 2024-11-23
**Pattern Status:** Production-Proven ✅

