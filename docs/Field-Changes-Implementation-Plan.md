# Field Changes Implementation Plan

## Requirements
1. **Make Description a required field**
2. **Add a new multi-line text field named "Notes"**
3. **Add new options to various choice fields** (get list from meeting)

## Good News
- ✅ Excel Import/Export already exists and works
- ✅ Installer already exists - just update REQUIRED_FIELDS array
- ✅ All patterns are established - just follow existing code

## Required Changes

### 1. Make Description Required

#### Files to Modify:
**A. SharePointService.ts** (Line 95-99)
```typescript
{
  internalName: 'Description',
  displayName: 'Description',
  fieldType: 'Note',
  required: true  // ← Change from false to true
}
```

**B. EventModal.tsx** (Line 724-731)
```typescript
<TextField
  label="Description"
  value={description}
  onChange={(_, newValue) => this.setState({ description: newValue || '' })}
  multiline
  rows={2}
  required  // ← Add this
  placeholder="Enter event description"  // ← Remove "(optional)"
/>
```

**C. EventModal.tsx** - Save Validation (Line 897)
```typescript
disabled={isSaving || isDeleting || !title.trim() || !description.trim()}  // ← Add description check
```

**D. ICalendarEvent.ts** (Line 20)
```typescript
description: string;  // ← Remove the ? to make it required
```

### 2. Add Notes Field

#### Files to Modify:
**A. ICalendarEvent.ts**
```typescript
export interface ICalendarEvent {
  // ... existing fields
  description: string;  // Now required
  notes?: string;  // New multi-line text field
  // ... rest of fields
}
```

**B. SharePointService.ts** - Add to REQUIRED_FIELDS array (after Description)
```typescript
{
  internalName: 'Notes',
  displayName: 'Notes',
  fieldType: 'Note',
  required: false
}
```

**C. ISharePointEvent interface**
```typescript
export interface ISharePointEvent {
  // ... existing fields
  Description: string;
  Notes?: string;  // Add this
  // ... rest of fields
}
```

**D. SharePointService.ts** - Update getEvents() select fields (Line 330)
```typescript
let selectFields = 'Id,Title,EventDate,EndDate,Swimlane,Status,IMO,OPR,Description,Notes,Modified,Editor/Title';
```

**E. SharePointService.ts** - Update getEventsByDateRange() select fields (Line 443)
```typescript
let selectFields = 'Id,Title,EventDate,EndDate,Swimlane,Status,IMO,OPR,Description,Notes,Modified,Editor/Title';
```

**F. SharePointService.ts** - Update mapping in both methods
```typescript
const mappedEvent = {
  // ... existing fields
  Description: item.Description || '',
  Notes: item.Notes,  // Add this
  // ... rest of fields
};
```

**G. SharePointService.ts** - Update createEvent() method (Line 661)
```typescript
const itemData: Record<string, unknown> = {
  Title: title,
  EventDate: this.toSharePointDateString(start),
  EndDate: this.toSharePointDateString(end),
  Swimlane: swimlane,
  Description: description,
  Notes: notes || ''  // Add this parameter
};
```

**H. SharePointService.ts** - Update updateEvent() method signature and implementation
```typescript
public async updateEvent(
  id: number,
  title: string,
  start: Date,
  end: Date,
  swimlane?: string,
  status?: string,
  imo?: string,
  opr?: string,
  description?: string,
  notes?: string,  // Add this parameter
  isPrivate?: boolean,
  privateEventId?: string
): Promise<void>
```

**I. HybridEventsService.ts** - Update sharePointEventToCalendarEvent()
```typescript
private sharePointEventToCalendarEvent(event: ISharePointEvent): ICalendarEvent {
  return {
    // ... existing fields
    description: event.Description,
    notes: event.Notes,  // Add this
    // ... rest of fields
  };
}
```

**J. HybridEventsService.ts** - Update privateEventToCalendarEvent()
```typescript
private privateEventToCalendarEvent(privateEvent: IPrivateEventData, placeholder: ISharePointEvent): ICalendarEvent {
  return {
    // ... existing fields
    description: privateEvent.Description,
    notes: privateEvent.Notes,  // Add this
    // ... rest of fields
  };
}
```

**K. EventModal.tsx** - Add Notes field to state interface (Line 39)
```typescript
interface IEventModalState {
  title: string;
  description: string;
  notes: string;  // Add this
  // ... rest of state
}
```

**L. EventModal.tsx** - Initialize notes in constructor (Line 133)
```typescript
this.state = {
  title: props.event?.title || '',
  description: props.event?.description || '',
  notes: props.event?.notes || '',  // Add this
  // ... rest of state
};
```

**M. EventModal.tsx** - Update componentDidUpdate (Line 215)
```typescript
this.setState({
  title: this.props.event.title,
  description: this.props.event.description || '',
  notes: this.props.event.notes || '',  // Add this
  // ... rest of state
});
```

**N. EventModal.tsx** - Add Notes field to UI (after Description field, around Line 732)
```typescript
<TextField
  label="Notes"
  value={notes}
  onChange={(_, newValue) => this.setState({ notes: newValue || '' })}
  multiline
  rows={3}
  placeholder="Enter additional notes (optional)"
/>
```

**O. EventModal.tsx** - Update handleSave to include notes (Line 437)
```typescript
const eventData: Partial<ICalendarEvent> = {
  id: this.props.event?.id,
  title: title.trim(),
  description: this.state.description.trim(),
  notes: this.state.notes.trim(),  // Add this
  // ... rest of fields
};
```

**P. BigCal.tsx** - Update handleSaveEvent to pass notes
```typescript
await this.hybridEventsService.updateEvent(
  eventData.id as number,
  eventData.title!,
  eventData.start!,
  eventData.end!,
  eventData.swimlane!,
  eventData.status!,
  eventData.imo || '',
  eventData.opr || '',
  eventData.description || '',
  eventData.notes || '',  // Add this
  eventData.isPrivate || false,
  eventData.privateEventId
);
```

### 3. Add New Choice Field Options

#### Process for Adding Options:
When you get the final requirements, you'll need to update the `REQUIRED_FIELDS` array in `SharePointService.ts` for each choice field.

**Example - Adding to Swimlane:**
```typescript
{
  internalName: 'Swimlane',
  displayName: 'Event Category',
  fieldType: 'Choice',
  required: false,
  choices: [
    'DCDC',
    'DISA',
    'DOD CIO / NSA / USCC',
    'Exec Time',
    'Exercises',
    'FYSA',
    'Joint DISA & DCDC',
    'Mission Partner',
    'Out of Office',
    'Seniors',
    'Speaking Event',
    'TDY Meetings/Congressional',
    'Transit',
    'NEW OPTION 1',  // ← Add new options here
    'NEW OPTION 2'
  ]
}
```

**Files to Update for Each Choice Field:**

**A. SharePointService.ts** - Update choices array in REQUIRED_FIELDS
**B. ICalendarEvent.ts** - Update type definition
```typescript
export type SwimlaneType = 'DCDC' | 'DISA' | ... | 'NEW OPTION 1' | 'NEW OPTION 2';
```
**C. EventModal.tsx** - Update fallback options (if applicable)
```typescript
const getFallbackSwimlaneOptions = (): IDropdownOption[] => [
  { key: 'DCDC', text: 'DCDC' },
  // ... existing options
  { key: 'NEW OPTION 1', text: 'NEW OPTION 1' },
  { key: 'NEW OPTION 2', text: 'NEW OPTION 2' }
];
```

**D. For Existing Deployments** - Run field update utility:
```typescript
// In BigCalWebPart.ts or via admin panel
await this._sharePointService.updateAllFieldChoices(this.properties.listName);
```

### 4. Excel Import/Export Updates

#### Files to Modify:

**A. ExcelExport.tsx** - Update createRawData() method (around Line 850)
```typescript
private createRawData = (events: ICalendarEvent[]): string[][] => {
  const data: string[][] = [];

  // Header row
  data.push([
    'Title',
    'Description',
    'Notes',  // ← Add this
    'Start',
    'End',
    'Event Category',
    'Status',
    'IMO',
    'OPR',
    'Private'
  ]);

  // Data rows
  events.forEach(event => {
    data.push([
      event.title,
      event.description || '',
      event.notes || '',  // ← Add this
      this.formatDateForExcel(event.start),
      this.formatDateForExcel(event.end),
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

**B. ExcelExport.tsx** - Update column widths (around Line 765)
```typescript
dataWorksheet['!cols'] = [
  { width: 30 }, // Title
  { width: 40 }, // Description
  { width: 40 }, // Notes ← Add this
  { width: 20 }, // Start
  { width: 20 }, // End
  { width: 15 }, // Event Category
  { width: 15 }, // Status
  { width: 12 }, // IMO
  { width: 25 }, // OPR
  { width: 10 }  // Private
];
```

**C. ExcelExport.tsx** - Update parseImportedData() method (around Line 370)
```typescript
private parseImportedData = (rawData: string[][]): ICalendarEvent[] => {
  const events: ICalendarEvent[] = [];
  const headers = rawData[0];

  // Find column indices
  let titleIndex = -1;
  let descriptionIndex = -1;
  let notesIndex = -1;  // ← Add this
  let startIndex = -1;
  // ... rest of indices

  // Map headers to indices
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i]?.toString().toLowerCase().trim();
    if (header === 'title') titleIndex = i;
    else if (header === 'description') descriptionIndex = i;
    else if (header === 'notes') notesIndex = i;  // ← Add this
    // ... rest of mappings
  }

  // Process rows
  for (let i = 1; i < rawData.length; i++) {
    const row = rawData[i];
    // ... existing parsing logic

    const event: ICalendarEvent = {
      id: Date.now() + i,
      title: title,
      description: (descriptionIndex !== -1 && row[descriptionIndex] ?
        row[descriptionIndex].toString().trim() : ''),
      notes: (notesIndex !== -1 && row[notesIndex] ?  // ← Add this
        row[notesIndex].toString().trim() : ''),
      // ... rest of fields
    };

    events.push(event);
  }

  return events;
};
```

**D. ExportManager.tsx** - Update event creation calls (Line 84, 97)
```typescript
// For private events
return await this.hybridEventsService.createEvent(
  event.title,
  event.start,
  event.end,
  event.swimlane || 'FYSA',
  event.status || '',
  event.imo || '',
  event.opr || '',
  event.description || '',
  event.notes || '',  // ← Add this
  true
);

// For public events
return await this.sharePointService.createEvent(
  event.title,
  event.start,
  event.end,
  event.swimlane || 'FYSA',
  event.status || '',
  event.imo || '',
  event.opr || '',
  event.description || '',
  event.notes || '',  // ← Add this
  false
);
```

### 5. Installer/Provisioning Updates

#### Automatic Updates:
The installer is **already built** and will automatically handle the new fields! Here's how:

**A. New Deployments:**
- When `createList()` is called, it reads from `REQUIRED_FIELDS` array
- Once you update `REQUIRED_FIELDS` with Notes field and new choices, new lists will include them automatically
- No additional installer code needed!

**B. Existing Deployments:**
- Use the built-in `updateAllFieldChoices()` method to add new options to existing choice fields
- For the Notes field, you'll need to add it manually or provide an update script

**C. Update Script for Existing Lists:**
```typescript
// Add this method to SharePointService.ts
public async addNotesField(listName?: string): Promise<void> {
  const targetListName = listName || this.listName;

  try {
    const list = this.sp.web.lists.getByTitle(targetListName);

    // Check if Notes field already exists
    const fields = await list.fields.select('InternalName')();
    const hasNotes = fields.some(f => f.InternalName === 'Notes');

    if (!hasNotes) {
      await list.fields.addMultilineText('Notes', {
        RichText: false,
        NumberOfLines: 6,
        Required: false
      });
      Logger.info('Notes field added successfully');
    } else {
      Logger.info('Notes field already exists');
    }
  } catch (error) {
    Logger.error('Error adding Notes field', error);
    throw error;
  }
}
```

**D. Property Pane Button for Updates:**
Add a button in `BigCalWebPart.ts` property pane:
```typescript
PropertyPaneButton('updateFields', {
  text: 'Update List Fields',
  buttonType: PropertyPaneButtonType.Primary,
  onClick: async () => {
    try {
      // Add Notes field
      await this._sharePointService.addNotesField();

      // Update choice field options
      await this._sharePointService.updateAllFieldChoices(this.properties.listName);

      alert('Fields updated successfully!');
    } catch (error) {
      alert('Error updating fields: ' + error.message);
    }
  }
})
```

## Implementation Checklist

### Phase 1: Core Field Changes
- [ ] Update `ICalendarEvent` interface (description required, add notes)
- [ ] Update `ISharePointEvent` interface (add Notes)
- [ ] Update `REQUIRED_FIELDS` array in SharePointService
  - [ ] Set Description.required = true
  - [ ] Add Notes field definition
- [ ] Update SharePointService methods:
  - [ ] getEvents() - add Notes to select
  - [ ] getEventsByDateRange() - add Notes to select
  - [ ] createEvent() - add notes parameter
  - [ ] updateEvent() - add notes parameter
  - [ ] Mapping logic in both get methods
- [ ] Update HybridEventsService conversion methods
  - [ ] sharePointEventToCalendarEvent()
  - [ ] privateEventToCalendarEvent()

### Phase 2: UI Updates
- [ ] Update EventModal state interface
- [ ] Update EventModal constructor
- [ ] Update EventModal componentDidUpdate
- [ ] Add Notes TextField to EventModal UI
- [ ] Make Description field required in UI
- [ ] Update save button validation
- [ ] Update handleSave to include notes
- [ ] Update BigCal.tsx handleSaveEvent

### Phase 3: Choice Field Options
- [ ] Get final requirements from stakeholders
- [ ] Update type definitions for each choice field
- [ ] Update REQUIRED_FIELDS choices arrays
- [ ] Update fallback options in EventModal
- [ ] Test dropdown population

### Phase 4: Excel Import/Export
- [ ] Update createRawData() header and data rows
- [ ] Update column widths array
- [ ] Update parseImportedData() to handle Notes
- [ ] Update ExportManager event creation calls
- [ ] Test import with Notes field
- [ ] Test export with Notes field

### Phase 5: Installer/Provisioning
- [ ] Add addNotesField() method to SharePointService
- [ ] Add update button to property pane
- [ ] Test new list creation
- [ ] Test field updates on existing lists
- [ ] Document update process for admins

### Phase 6: Testing
- [ ] Test creating new events with required description
- [ ] Test creating events with notes
- [ ] Test editing events with notes
- [ ] Test Excel export includes notes
- [ ] Test Excel import with notes
- [ ] Test new choice field options appear in dropdowns
- [ ] Test validation prevents saving without description
- [ ] Test installer creates all fields correctly
- [ ] Test field update utility on existing lists

## Estimated Effort

| Phase | Files | Estimated Time |
|-------|-------|----------------|
| Phase 1: Core Field Changes | 3 files, ~15 locations | 1-2 hours |
| Phase 2: UI Updates | 2 files, ~10 locations | 1 hour |
| Phase 3: Choice Field Options | 3 files, varies by # of options | 30 min - 1 hour |
| Phase 4: Excel Import/Export | 2 files, ~6 locations | 1 hour |
| Phase 5: Installer/Provisioning | 1 file, ~2 methods | 30 min |
| Phase 6: Testing | All components | 2-3 hours |
| **Total** | **~10 files** | **6-9 hours** |

## Risk Assessment

### Low Risk ✅
- Adding Notes field (new field, no breaking changes)
- Adding new choice options (additive only)
- Excel import/export updates (well-tested pattern)

### Medium Risk ⚠️
- Making Description required (could break existing workflows)
  - **Mitigation**: Add migration script to populate empty descriptions
  - **Mitigation**: Clear error messages for users

### High Risk 🔴
- None identified

## Recommendations

1. **Start with Phase 1-2** to get the core fields working
2. **Wait for stakeholder input** before implementing Phase 3 (choice options)
3. **Test thoroughly** with Excel import/export (Phase 4) as this is heavily used
4. **Provide migration path** for existing events with empty descriptions
5. **Document the update process** for admins with existing deployments
6. **Consider a "bulk update"** utility to set default descriptions for existing events

## Notes for Your Meeting

### Questions to Ask Stakeholders:
1. **Choice Field Options**: What new options need to be added to:
   - Swimlane (Event Category)?
   - Status?
   - IMO?
   - OPR?

2. **Description Field**:
   - Should we provide a default value for existing events with empty descriptions?
   - What should the placeholder text say?

3. **Notes Field**:
   - How many rows should the Notes field display (currently planning 3)?
   - Should Notes be searchable/filterable?

4. **Deployment**:
   - Do you want an automated update script for existing lists?
   - Should we provide a migration guide for admins?

### Key Points to Communicate:
- ✅ **Excel Import/Export already exists** and works great
- ✅ **Installer already exists** and will auto-include new fields
- ✅ **Field updates can be automated** for existing deployments
- ⚠️ **Making Description required** may need a migration plan
- 📋 **Need final list of new choice options** to complete implementation

## Summary

This is a **well-scoped, low-risk enhancement** that leverages existing patterns in the codebase:
- The installer/provisioning system is already robust
- Excel import/export is fully functional
- Field management patterns are well-established
- Most changes are additive (low risk)

The main work is **systematic updates across ~10 files** following established patterns. With the final choice field options from your meeting, this can be implemented efficiently in about 6-9 hours of focused development time.


