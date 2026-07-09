# BigCal Big Rocks Implementation Plan

This plan follows the structure defined in `docs/Implementation Plan Pattern.md`.

Relevant UnityFX patterns informing this plan:
- `form.modal-item-editor` → modal create/edit behavior
- `data.excel-integration` + `uicomponent.excel-import-export-modal` → Excel round-trip support
- `studio.legend-studio` → constraint reference; **Big Rocks is intentionally not part of Legend Studio in v1**
- `installer.field-choice-wizard` → informs field/schema update thinking, though BigCal will likely use its existing admin/configuration flows

---

### Stage 1: Add Big Rock as an event data field with visible modal editing

**Goal:**  
Make Big Rock a real persisted boolean property on events, expose it in the Edit Event modal beside Private Event, and ensure users can create/edit Big Rock events directly from the primary UI.

**Visual Acceptance Test:**  
- [x] Starting state / setup: Open BigCal and launch the **Edit Event** modal for an existing non-holiday event, or create a new event.
- [x] User action: In the checkbox row near **Private Event**, toggle **Big Rock** on and save the event.
- [x] Expected visible result: Reopening the same event shows **Big Rock** still checked; turning it off and saving causes it to reopen unchecked.
- [x] Important failure case or edge case if relevant: A **Private Event** can also be marked **Big Rock**; both checkboxes can be checked independently and persist correctly.

**Status:**  
Complete

**Tasks:**
- [x] Add `isBigRock?: boolean` to `src/webparts/bigCal/components/ICalendarEvent.ts`.
- [x] Expand the `SwimlaneType` fallback handling only if needed for compile safety, without incorrectly modeling Big Rock as a swimlane, in `src/webparts/bigCal/components/ICalendarEvent.ts`.
- [x] Add `isBigRock` to the local modal state interface in `src/webparts/bigCal/components/EventModal.tsx`.
- [x] Initialize `isBigRock` from `props.event?.isBigRock` in the constructor in `src/webparts/bigCal/components/EventModal.tsx`.
- [x] Reset `isBigRock` correctly for **create mode** in `componentDidUpdate` in `src/webparts/bigCal/components/EventModal.tsx`.
- [x] Reset `isBigRock` correctly for **edit mode** in `componentDidUpdate` in `src/webparts/bigCal/components/EventModal.tsx`.
- [x] Replace the single centered Private Event row with a two-column checkbox layout in `src/webparts/bigCal/components/EventModal.tsx`.
- [x] Add the **Big Rock** checkbox UI beside **Private Event** in `src/webparts/bigCal/components/EventModal.tsx`.
- [x] Include `isBigRock` in the event payload built by `handleSave` in `src/webparts/bigCal/components/EventModal.tsx`.
- [x] Add a new SharePoint boolean field definition for Big Rock in `src/webparts/bigCal/services/SharePointService.ts`.
- [x] Update list validation logic so Big Rock is recognized as part of the supported schema in `src/webparts/bigCal/services/SharePointService.ts`.
- [x] Update event read logic to fetch the Big Rock field from the main Events list in `src/webparts/bigCal/services/SharePointService.ts`.
- [x] Normalize the Big Rock boolean value when reading SharePoint items in `src/webparts/bigCal/services/SharePointService.ts`.
- [x] Update `createEvent` in `src/webparts/bigCal/services/SharePointService.ts` to persist Big Rock on the main Events list.
- [x] Update `updateEvent` in `src/webparts/bigCal/services/SharePointService.ts` to persist Big Rock on the main Events list.
- [x] Add Big Rock field support to private event reads in `src/webparts/bigCal/services/PrivateEventsService.ts`.
- [x] Add Big Rock field support to private event creates in `src/webparts/bigCal/services/PrivateEventsService.ts`.
- [x] Add Big Rock field support to private event updates in `src/webparts/bigCal/services/PrivateEventsService.ts`.
- [x] Update hybrid event creation flow to pass Big Rock through public and private create paths in `src/webparts/bigCal/services/HybridEventsService.ts`.
- [x] Update hybrid event update flow to pass Big Rock through public/private conversion and update paths in `src/webparts/bigCal/services/HybridEventsService.ts`.
- [x] Update conversion helpers so public↔private transitions preserve Big Rock in `src/webparts/bigCal/services/HybridEventsService.ts`.
- [x] Confirm existing BigCal property pane list validation and field-update flows surface missing Big Rock schema appropriately in `src/webparts/bigCal/BigCalWebPart.ts`.

**Files Modified:**
- `src/webparts/bigCal/components/ICalendarEvent.ts`
- `src/webparts/bigCal/components/EventModal.tsx`
- `src/webparts/bigCal/services/SharePointService.ts`
- `src/webparts/bigCal/services/PrivateEventsService.ts`
- `src/webparts/bigCal/services/HybridEventsService.ts`
- `src/webparts/bigCal/BigCalWebPart.ts`

**Implementation Notes:**
- Big Rock is a **boolean flag**, not a swimlane/category.
- This stage intentionally stops at **modal-based persistence**, because that is a visible and directly testable slice.
- Do **not** add Big Rock to Legend Studio in this stage.
- Big Rock should exist on both **Events** and **PrivateEvents** lists so hybrid private-event behavior stays symmetric.
- Reuse the existing boolean normalization approach already used for `Private`.

---

### Stage 2: Add Big Rocks as a special Event Category filter token with custom logic

**Goal:**  
Expose **Big Rocks** in the existing **Event Category** dropdown without treating it like a true swimlane, and implement the special filtering behavior that users requested.

**Visual Acceptance Test:**  
- [x] Starting state / setup: Calendar contains at least one regular `DISA` event, one `DISA + Big Rock` event, and one `FYSA + Big Rock` event.
- [x] User action: Open the **Event Category** dropdown and select only **Big Rocks**.
- [x] Expected visible result: All Big Rock events display, regardless of category.
- [x] Important failure case or edge case if relevant: If the user selects **DISA** and **Big Rocks**, only events where `swimlane === DISA` **and** `isBigRock === true` remain visible; selecting **DISA** without **Big Rocks** still shows all DISA events regardless of Big Rock state.

**Status:**  
Complete

**Tasks:**
- [x] Add `'Big Rocks'` to the initial selected category set only if we intentionally want it selected by default; otherwise explicitly leave it unselected in `src/webparts/bigCal/components/BigCal.tsx`.
- [x] Decide and implement default selection behavior for Big Rocks in constructor state in `src/webparts/bigCal/components/BigCal.tsx`.
- [x] Update category dropdown option generation in `src/webparts/bigCal/components/BigCal.tsx` to append a **Big Rocks** virtual option.
- [x] Add count logic for the **Big Rocks** dropdown entry in `src/webparts/bigCal/components/BigCal.tsx`.
- [x] Keep Big Rocks out of SharePoint-discovered swimlane/category lists in `src/webparts/bigCal/components/BigCal.tsx`.
- [x] Update Select All / Unselect All logic in `src/webparts/bigCal/components/BigCal.tsx` so Big Rocks is handled intentionally rather than accidentally like a real category.
- [x] Implement special filter semantics in `src/webparts/bigCal/components/BigCal.tsx`:
  - selected real categories only → normal OR behavior
  - Big Rocks only → all `isBigRock === true`
  - Big Rocks + one or more real categories → `(real category match) && (isBigRock === true)`
- [x] Ensure private-event filtering and Big Rock filtering coexist safely in `src/webparts/bigCal/components/BigCal.tsx`.
- [x] Ensure the filtered event set drives counts consistently after Big Rocks is introduced in `src/webparts/bigCal/components/BigCal.tsx`.
- [x] Update any event-category helper logic that currently special-cases only `Private Events` in `src/webparts/bigCal/components/BigCal.tsx`.
- [x] Review timeline group/category discovery behavior in `src/webparts/bigCal/components/TimelineView.tsx` and confirm Big Rocks remains a filter token rather than a rendered swimlane group.

**Files Modified:**
- `src/webparts/bigCal/components/BigCal.tsx`
- `src/webparts/bigCal/components/TimelineView.tsx` *(only if needed to keep behavior coherent)*

**Implementation Notes:**
- Big Rocks belongs **in the dropdown UI** but **not in the real swimlane model**.
- This is the most important logic stage because it defines the reporting behavior users actually want.
- I recommend **Big Rocks not be selected by default**. If it were selected by default, the combined logic could unexpectedly narrow results whenever users also choose categories.
- This stage should be considered incomplete unless the user can visibly test all three cases:
  - category only
  - Big Rocks only
  - category + Big Rocks

---

### Stage 3: Render Big Rock events with a second visible icon across calendar surfaces

**Goal:**  
Give Big Rock events a **static rock-style overlay icon** while preserving normal swimlane color and normal category icon behavior.

**Visual Acceptance Test:**  
- [x] Starting state / setup: At least one visible event is marked Big Rock and at least one comparable event is not.
- [x] User action: View the events in the main calendar and open the event popover.
- [x] Expected visible result: Big Rock events show **two visible icons** — the normal category/private icon behavior plus a distinct static Big Rock icon.
- [x] Important failure case or edge case if relevant: A **Private + Big Rock** event still shows a sensible two-icon treatment without losing the lock/private indicator.

**Status:**  
Complete

**Tasks:**
- [x] Choose a static Big Rock icon candidate and define it in a shared constant location, likely `src/webparts/bigCal/interfaces/IColorMapping.ts` or a new shared constants location if cleaner.
- [x] Prefer an emoji/icon that reads visually as a rock/boulder; document fallback if the preferred symbol renders poorly on Windows 11.
- [x] Update event icon rendering in the main calendar event display in `src/webparts/bigCal/components/BigCal.tsx`.
- [x] Update mini-calendar rendering to show the Big Rock marker where space allows in `src/webparts/bigCal/components/BigCal.tsx`.
- [x] Update popover rendering so Big Rock status is visible in `src/webparts/bigCal/components/EventPopover.tsx`.
- [x] Update print-preview event rendering so Big Rock status is visually preserved in `src/webparts/bigCal/components/LegendaryPrintPreview.tsx`.
- [x] Review timeline item rendering and add a visible Big Rock cue if timeline cards expose icons in `src/webparts/bigCal/components/TimelineView.tsx`.
- [x] Review grid/briefing rendering surfaces and add the second icon anywhere the event icon is already visible in `src/webparts/bigCal/components/GridView.tsx` or `src/webparts/bigCal/components/BigCal.tsx`.
- [x] Ensure the added icon does not accidentally inherit Big Rock-specific color treatment.
- [x] Ensure Big Rock does not override swimlane colors, status styling, or private-event grey treatment.

**Files Modified:**
- `src/webparts/bigCal/components/BigCal.tsx`
- `src/webparts/bigCal/components/EventPopover.tsx`
- `src/webparts/bigCal/components/LegendaryPrintPreview.tsx`
- `src/webparts/bigCal/components/TimelineView.tsx` *(if icon surfaces exist there)*
- `src/webparts/bigCal/components/GridView.tsx` *(if needed)*
- `src/webparts/bigCal/interfaces/IColorMapping.ts` *(or alternative shared constants file)*

**Implementation Notes:**
- **No Legend Studio integration in v1.**
- The Big Rock icon should be **static** in v1.
- The icon should be treated as an **overlay marker**, not as part of the configurable legend system.
- If the chosen “rock” emoji renders poorly in Segoe/Windows, we may need a fallback symbol or a Fluent/FontAwesome approximation.
- Implementation uses a shared `BIG_ROCK_ICON` constant (`🪨`) in `src/webparts/bigCal/interfaces/IColorMapping.ts`.
- Stage 3 is complete across live calendar renderers, mini-calendar, popover, timeline, and Legendary Print renderers / fallback print HTML, including the newer right-side Big Rock marker treatment in Legendary Print.

---

### Stage 4: Add Big Rock to Excel export/import for cross-network round-tripping

**Goal:**  
Allow Big Rock state to move between separate BigCal instances through Excel export/import.

**Visual Acceptance Test:**  
- [x] Starting state / setup: A calendar contains at least one Big Rock event and one non-Big Rock event.
- [x] User action: Export to Excel, verify the workbook contains a **Big Rock** column, then import that file back after toggling one row’s Big Rock value.
- [x] Expected visible result: Imported events preserve or update the Big Rock flag correctly, and reopening imported events in the modal shows the checkbox state matching the Excel file.
- [x] Important failure case or edge case if relevant: Accepted boolean-like values such as `TRUE`, `FALSE`, `Yes`, `No`, `1`, and `0` import predictably.

**Status:**  
Complete

**Tasks:**
- [x] Add `Big Rock` to the machine-readable export headers in `src/webparts/bigCal/components/ExcelExport.tsx`.
- [x] Add `Big Rock` to the human-readable export shape only if appropriate for the Agenda/Data workbook strategy in `src/webparts/bigCal/components/ExcelExport.tsx`.
- [x] Include each event’s Big Rock value in export row generation in `src/webparts/bigCal/components/ExcelExport.tsx`.
- [x] Extend import header detection in `src/webparts/bigCal/components/ExcelExport.tsx` to recognize `Big Rock`.
- [x] Parse imported Big Rock values robustly in `src/webparts/bigCal/components/ExcelExport.tsx`.
- [x] Add `isBigRock` to the imported event model returned from `src/webparts/bigCal/components/ExcelExport.tsx`.
- [x] Update import save/create flow in `src/webparts/bigCal/components/ExportManager.tsx` to pass `isBigRock` into hybrid event creation.
- [x] Update any background import save flow to preserve Big Rock for private and non-private events in `src/webparts/bigCal/components/ExportManager.tsx`.
- [x] Confirm the exported template remains round-trip safe when Big Rock column is present but blank.
- [x] Confirm import errors remain user-friendly when Big Rock contains an invalid value in `src/webparts/bigCal/components/ExcelExport.tsx`.

**Files Modified:**
- `src/webparts/bigCal/components/ExcelExport.tsx`
- `src/webparts/bigCal/components/ExportManager.tsx`

**Implementation Notes:**
- This stage follows the UnityFX **Data.ExcelIntegration** and **Excel Import/Export Modal** patterns.
- Preserve single-click export behavior.
- Keep the column name simple and human-editable: **Big Rock**.
- We do **not** need DataSheet View support in v1.
- Export/import support is implemented and the workbook includes Big Rock in both the machine-readable and human-readable sheets.

---

### Stage 5: Admin/list configuration validation and end-to-end coherence pass

**Goal:**  
Make sure BigCal’s admin/setup flows correctly recognize the new Big Rock field requirements and the feature behaves coherently across private/public events and reporting surfaces.

**Visual Acceptance Test:**  
- [ ] Starting state / setup: Use a site/list configuration where Big Rock field support is missing or partially configured.
- [ ] User action: Open the BigCal property pane and inspect list/configuration status, then use the existing admin remediation flow if applicable.
- [ ] Expected visible result: Admin-facing messaging clearly indicates whether Big Rock field support exists or needs to be added/updated.
- [ ] Important failure case or edge case if relevant: Regular users should not see broken behavior; the app should fail gracefully even if older lists do not yet have the Big Rock field.

**Status:**  
Not Started

**Tasks:**
- [ ] Update required-field or optional-field messaging for Big Rock in `src/webparts/bigCal/services/SharePointService.ts`.
- [ ] Update property pane/admin validation messaging in `src/webparts/bigCal/BigCalWebPart.ts` if Big Rock should appear in field status guidance.
- [ ] Ensure Events list creation/update routines add the Big Rock field in `src/webparts/bigCal/services/SharePointService.ts`.
- [ ] Ensure PrivateEvents list creation/update routines add the Big Rock field in `src/webparts/bigCal/services/SharePointService.ts`.
- [ ] Review fallback behavior when the Big Rock field is absent on an older deployment and make the read path default safely to `false` in `src/webparts/bigCal/services/SharePointService.ts`.
- [ ] Verify Big Rock remains intentionally absent from `src/webparts/bigCal/components/ColorPaletteStudio.tsx` and `src/webparts/bigCal/services/ColorMappingService.ts` in v1.
- [ ] Verify Big Rocks is intentionally absent from legend-remediation/orphan-cleanup logic except where comments or safeguards should document the decision in `src/webparts/bigCal/services/ColorMappingService.ts`.
- [ ] Perform an end-to-end coherence review across modal save, filter behavior, icon rendering, private-event conversion, and Excel round-trip.

**Files Modified:**
- `src/webparts/bigCal/services/SharePointService.ts`
- `src/webparts/bigCal/BigCalWebPart.ts`
- `src/webparts/bigCal/services/ColorMappingService.ts` *(possibly comments/guards only, or no change if not needed)*
- `src/webparts/bigCal/components/ColorPaletteStudio.tsx` *(likely no change; listed here only if we document/guard behavior in code)*

**Implementation Notes:**
- This is the hardening stage.
- The purpose is not to invent more UI, but to make sure older environments and admin flows don’t become confusing.
- If the existing property-pane remediation flow cannot easily expose Big Rock support cleanly, we can defer the polish portion while still ensuring the runtime behavior defaults safely.

---

## Recommended Implementation Order

1. **Stage 1** — establish the field and visible editing surface
2. **Stage 2** — deliver the filtering/reporting behavior
3. **Stage 3** — add the visible two-icon treatment
4. **Stage 4** — complete Excel round-trip support
5. **Stage 5** — admin/runtime hardening pass

## Naming Recommendation

- **`Big Rocks`** in dropdown/filter UI
- **`Big Rock`** as Excel column / field display name
- **`BigRock`** as the likely SharePoint/internal field name
