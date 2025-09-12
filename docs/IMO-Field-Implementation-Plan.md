# IMO Field Implementation Plan

## Overview
Add a new "IMO" (Information Management Office) choice field to BigCal with 8 options (IMO 1-8). This field will be optional and used for organizational categorization without color coding or icons.

## ⚠️ CRITICAL IMPLEMENTATION NOTE
**IMPLEMENT ONE PHASE AT A TIME WITH TESTING BETWEEN EACH PHASE**

Based on user feedback: "25 years of writing code has taught me that implementing more than one feature at a time is always a mistake and leads to hidden bugs that get found in production by users and make us look like clowns."

## Requirements
- **Field Type**: Choice field (dropdown)
- **Options**: IMO 1, IMO 2, IMO 3, IMO 4, IMO 5, IMO 6, IMO 7, IMO 8
- **Required**: No (optional field)
- **Colors/Icons**: None (skip color/icon system)
- **Filtering**: Multi-select dropdown with counts (like Swimlanes/Status)
- **UI Position**: Right of Status dropdown in filter bar
- **Width Optimization**: Reduce Status dropdown from 170px to 140px, set IMO to 140px

## Implementation Phases

### Phase 1: SharePoint List & Type Definitions
**Goal**: Establish foundation for IMO field
- [ ] Add IMO field to `SharePointService.REQUIRED_FIELDS`
- [ ] Create `IMOType` union type in `ICalendarEvent.ts`
- [ ] Add `imo?: IMOType` property to `ICalendarEvent` interface
- [ ] Update webpart property validation to check for IMO field
- [ ] **TEST**: Verify "Create Events List" includes IMO field
- [ ] **TEST**: Verify webpart validation checks existing lists for IMO field

### Phase 2: Data Layer Integration
**Goal**: Handle IMO field in all CRUD operations
- [ ] Update `SharePointService` CRUD methods (create, update, get, batch)
- [ ] Update `HybridEventsService` method signatures
- [ ] Update `PrivateEventsService` for IMO field
- [ ] Update event data transformation (SharePoint ↔ ICalendarEvent)
- [ ] **TEST**: Create/edit events with IMO field
- [ ] **TEST**: Verify data persistence and retrieval

### Phase 3: Event Creation/Editing UI
**Goal**: Add IMO dropdown to event forms
- [ ] Add IMO dropdown to `EventModal.tsx` (3-column layout)
- [ ] Add IMO column to `DataSheetView.tsx` grid
- [ ] Add fallback IMO options functions
- [ ] Update form state management
- [ ] **TEST**: Create/edit events via modal
- [ ] **TEST**: Edit events via DataSheet view

### Phase 4: Main UI Filtering
**Goal**: Add IMO filter dropdown to main calendar
- [ ] Add IMO dropdown to `BigCal.tsx` filter bar
- [ ] Reduce Status dropdown width (170px → 140px)
- [ ] Set IMO dropdown width to 140px
- [ ] Add IMO filtering logic to `applyFiltersToEvents()`
- [ ] Add IMO state management (selectedIMOs)
- [ ] **TEST**: Filter events by IMO selection
- [ ] **TEST**: Verify event counts in dropdown
- [ ] **TEST**: Verify "Select All/Unselect All" functionality

### Phase 5: Additional UI Integration
**Goal**: Add IMO to other views and components
- [ ] Add IMO to event popover display
- [ ] Add IMO to agenda view (between Time and Event columns)
- [ ] Update any other views that display event details
- [ ] **TEST**: Verify IMO displays in all relevant views

### Phase 6: Field Discovery & Fallback Systems
**Goal**: Integrate IMO with dynamic field discovery
- [ ] Update `ColorMappingService.discoverFieldOptions()` for IMO
- [ ] Add IMO to fallback field options across components
- [ ] Update TypeScript interfaces (`IColorMapping`, `IFieldOption`)
- [ ] **TEST**: Verify field discovery includes IMO
- [ ] **TEST**: Verify fallback systems work when discovery fails

## Technical Details

### IMO Options
```typescript
export type IMOType = 'IMO 1' | 'IMO 2' | 'IMO 3' | 'IMO 4' | 'IMO 5' | 'IMO 6' | 'IMO 7' | 'IMO 8' | 'Not Set' | '';
```

### SharePoint Field Definition
```typescript
{
  internalName: 'IMO',
  displayName: 'IMO',
  fieldType: 'Choice',
  required: false,
  choices: ['IMO 1', 'IMO 2', 'IMO 3', 'IMO 4', 'IMO 5', 'IMO 6', 'IMO 7', 'IMO 8'],
  defaultValue: ''
}
```

### UI Layout Changes
- **Filter Bar**: Search | Swimlane | Status (140px) | IMO (140px)
- **EventModal**: 3-column layout (Swimlane | Status | IMO)
- **DataSheet**: Add IMO column after Status column
- **Agenda**: Time | IMO | Event | Category | Status

## Key Files to Modify
- `src/webparts/bigCal/services/SharePointService.ts`
- `src/webparts/bigCal/components/ICalendarEvent.ts`
- `src/webparts/bigCal/services/HybridEventsService.ts`
- `src/webparts/bigCal/components/EventModal.tsx`
- `src/webparts/bigCal/components/DataSheetView.tsx`
- `src/webparts/bigCal/components/BigCal.tsx`
- `src/webparts/bigCal/services/ColorMappingService.ts`
- `src/webparts/bigCal/interfaces/IColorMapping.ts`

## Testing Strategy
- **After each phase**: Build must pass with zero errors
- **After each phase**: Manual testing of implemented functionality
- **No proceeding to next phase** until current phase is confirmed working
- **Focus on one feature at a time** to avoid hidden bugs

## Notes
- IMO field does NOT use color/icon system (skip Color Palette Studio integration)
- IMO filtering should work like Swimlanes (multi-select, all selected by default)
- Events with no IMO should only appear when "Not Set" is selected in filter
- Maintain consistent dropdown styling and behavior with existing fields
