# OPR Field Implementation Plan

## Overview
Add a new "OPR" (Office of Primary Responsibility) choice field to BigCal with 12 organizational options. This field will be optional and used for organizational categorization without color coding or icons.

## ⚠️ CRITICAL IMPLEMENTATION NOTE
**IMPLEMENT ONE PHASE AT A TIME WITH TESTING BETWEEN EACH PHASE**

Based on lessons learned from IMO implementation: "Focus on one feature at a time to avoid hidden bugs that get found in production."

## Requirements
- **Field Type**: Choice field (dropdown)
- **Options**: 12 organizational categories (see Technical Details)
- **Required**: Yes (mandatory field - updated per time constraints discussion)
- **Colors/Icons**: None (skip color/icon system)
- **Filtering**: Multi-select dropdown with counts (like Swimlanes/Status/IMO)
- **UI Position**: Right of IMO dropdown in filter bar
- **Width Optimization**: Set OPR dropdown to 160px (wider due to longer option names)

## 📱 **RESPONSIVE UI NOTE**
*For future sprint consideration: 4 dropdowns in filter bar may cause responsive issues on smaller screens. Explore collapsible/hamburger menu options if time allows.*

## 🚀 **ACCELERATED IMPLEMENTATION PHASES**
*Based on IMO field blueprint - should be much faster!*

### Phase 1: SharePoint List & Type Definitions
**Goal**: Establish foundation for OPR field
**Estimated Time**: 15 minutes
- [ ] Add OPR field to `SharePointService.REQUIRED_FIELDS`
- [ ] Create `OPRType` union type in `ICalendarEvent.ts`
- [ ] Add `opr?: OPRType` property to `ICalendarEvent` interface
- [ ] **TEST**: Build passes with zero errors

### Phase 2: Data Layer Integration
**Goal**: Handle OPR field in all CRUD operations
**Estimated Time**: 20 minutes
- [ ] Update `SharePointService.createEvent()` method (conditional logic like IMO)
- [ ] Update `SharePointService.updateEvent()` method
- [ ] Update `SharePointService.createEventsBatch()` method
- [ ] Update `HybridEventsService.createEvent()` method signature
- [ ] Update `PrivateEventsService.createEvent()` method
- [ ] Update `convertSharePointEventToCalendarEvent()` helper
- [ ] **TEST**: Create/edit events with OPR field via DataSheet

### Phase 3: Event Creation/Editing UI
**Goal**: Add OPR dropdown to event forms
**Estimated Time**: 25 minutes
- [ ] Add OPR dropdown to `EventModal.tsx` (4-column layout: Swimlane | Status | IMO | OPR)
- [ ] Add OPR column to `DataSheetView.tsx` grid (after IMO column)
- [ ] Add `getOPROptions()` fallback function
- [ ] Add `handleOPRChange()` method to DataSheetView
- [ ] Add `renderOPRCell()` method to DataSheetView
- [ ] **TEST**: Create/edit events via modal and DataSheet

### Phase 4: Main UI Filtering
**Goal**: Add OPR filter dropdown to main calendar
**Estimated Time**: 30 minutes
- [ ] Add OPR dropdown to `BigCal.tsx` filter bar (after IMO)
- [ ] Set OPR dropdown width to 160px
- [ ] Add OPR filtering logic to `applyFiltersToEvents()`
- [ ] Add OPR state management (`selectedOPRs`, `setSelectedOPRs`)
- [ ] Add OPR to filter reset functionality
- [ ] **TEST**: Filter events by OPR selection with counts

### Phase 5: Event Popover Integration
**Goal**: Add OPR to event popover display
**Estimated Time**: 10 minutes
- [ ] Add OPR field to `EventPopover.tsx` (after IMO, before description)
- [ ] Use same blue label styling as IMO
- [ ] **TEST**: Verify OPR displays in popover with proper styling

### Phase 6: Excel Import/Export Integration
**Goal**: Add OPR field support to Excel functionality
**Estimated Time**: 15 minutes
- [ ] Add OPR column detection to `ExcelExport.tsx` import parsing
- [ ] Add OPR to `parseImportedData()` method
- [ ] Add OPR to `createRawData()` export method
- [ ] Add OPR to `createAgendaData()` export method
- [ ] Update agenda worksheet column widths
- [ ] **TEST**: Import/export Excel with OPR column

## 🎯 **TOTAL ESTIMATED TIME: ~2 HOURS**
*Compared to IMO's longer timeline, this should be much faster using the established patterns.*

## Technical Details

### OPR Options
```typescript
export type OPRType = 
  | 'J-0'
  | 'J-3/5/7'
  | 'Industry – EM'
  | 'DAFA – SPIO'
  | 'MILDEPs – SPIO'
  | 'International Engagements'
  | 'Speaking Engagements – PAO'
  | 'Media Engagements/Queries – PAO'
  | 'Conferences and Exhibits – PAO'
  | 'J9'
  | 'Internal Engagements'
  | 'OSD/Congress'
  | 'Not Set' 
  | '';
```

### SharePoint Field Definition
```typescript
{
  internalName: 'OPR',
  displayName: 'OPR',
  fieldType: 'Choice',
  required: true,
  choices: [
    'J-0',
    'J-3/5/7',
    'Industry – EM',
    'DAFA – SPIO',
    'MILDEPs – SPIO',
    'International Engagements',
    'Speaking Engagements – PAO',
    'Media Engagements/Queries – PAO',
    'Conferences and Exhibits – PAO',
    'J9',
    'Internal Engagements',
    'OSD/Congress'
  ],
  defaultValue: 'J-0'
}
```

### UI Layout Changes
- **Filter Bar**: Search | Swimlane | Status (140px) | IMO (140px) | OPR (160px)
- **EventModal**: 4-column layout (Swimlane | Status | IMO | OPR)
- **DataSheet**: Add OPR column after IMO column
- **Popover**: Time | Category | IMO | OPR | Description
- **Excel Export**: Include OPR in both Data and Agenda tabs

## Key Files to Modify
*Same files as IMO implementation:*
- `src/webparts/bigCal/services/SharePointService.ts`
- `src/webparts/bigCal/components/ICalendarEvent.ts`
- `src/webparts/bigCal/services/HybridEventsService.ts`
- `src/webparts/bigCal/services/PrivateEventsService.ts`
- `src/webparts/bigCal/components/EventModal.tsx`
- `src/webparts/bigCal/components/DataSheetView.tsx`
- `src/webparts/bigCal/components/BigCal.tsx`
- `src/webparts/bigCal/components/EventPopover.tsx`
- `src/webparts/bigCal/components/ExcelExport.tsx`
- `src/webparts/bigCal/components/ExportManager.tsx`

## 🧪 **Testing Strategy**
- **After each phase**: `npm run build` must pass with zero errors/warnings
- **After each phase**: Manual testing of implemented functionality
- **Use IMO field as reference**: Copy patterns and replace IMO → OPR
- **Test with existing events**: Ensure backward compatibility

## 💡 **Lessons Learned from IMO Implementation**

### ✅ **What Worked Well:**
1. **Conditional field setting** in SharePoint services (only set if value provided)
2. **Blue label styling** in popover for visual consistency
3. **Multi-select filtering** with event counts
4. **Excel import/export** with proper column detection
5. **DataSheet integration** with dropdown and change tracking

### ⚠️ **Critical Gotchas to Avoid:**
1. **SharePoint conditional logic**: Always use `if (opr && opr.trim())` before setting field
2. **Excel parsing**: Set empty values to `''` not `undefined`
3. **TypeScript imports**: Remember to import `OPRType` in all files
4. **Column widths**: OPR needs 160px due to longer option names
5. **Filter bar spacing**: May need to adjust responsive behavior with 4 dropdowns

### 🚀 **Speed Optimizations:**
1. **Copy-paste approach**: Use IMO implementation as template, find/replace IMO → OPR
2. **Batch similar changes**: Update all service methods in one go
3. **Test incrementally**: Build after each file modification
4. **Use established patterns**: Don't reinvent, follow IMO blueprint exactly

## Notes
- OPR field does NOT use color/icon system (skip Color Palette Studio integration)
- OPR filtering works like Swimlanes/Status/IMO (multi-select, all selected by default)
- Events with no OPR only appear when "Not Set" is selected in filter
- Maintains consistent dropdown styling and behavior with existing fields
- Longer option names may require UI adjustments for mobile responsiveness

## Success Criteria
- [ ] All phases completed with zero build errors
- [ ] OPR field appears in all same locations as IMO field
- [ ] Excel import/export works with OPR column
- [ ] Filtering works with proper event counts
- [ ] Backward compatibility maintained for existing events
- [ ] UI remains responsive with 4 filter dropdowns

**Ready to implement using IMO field as the perfect blueprint!**
