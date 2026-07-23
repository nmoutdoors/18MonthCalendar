# BigCal Dynamic Evergreen Range Implementation Plan

This plan follows the structure defined in `docs/Implementation Plan Pattern.md`.

Relevant UnityFX patterns informing this plan:
- `core.performance-configurable-lazy-loading` → month-based range configuration and chunked extension for time-based visualizations
- `dashboard.non-blocking-load` → preserve fast first render and avoid unnecessary loading regressions while changing the range model
- `uicomponent.vis-timeline-configurable-lazy-loading` → reference for constraint-aware loading behavior, even though Timeline is not the primary surface for this update

Key product decisions already confirmed:
- BigCal should be **evergreen by default**.
- Both the **Calendar view mini-calendar strip** and the **Grid / 18-Month view** should become **rolling 18-month surfaces**.
- The rolling window should use **full-month math**, not day-count math.
- The target default planning horizon is **6 months prior + current month + 11 months forward**.
- The current **initial landing / positioning / scroll feel** should be preserved even after the horizon becomes evergreen.
- Earlier history should be available **only by intentional user action**.
- The first intentional history action should be **Load 6 earlier months**.
- For the first pass, reuse the existing property names:
  - `lazyLoadMonthsPast`
  - `lazyLoadMonthsFuture`

---

### Stage 1: Replace hard-coded August 2025 display math with a shared evergreen month-range model

**Goal:**  
Eliminate the fixed August 2025 → January 2027 assumptions and drive both Calendar-view mini-calendars and Grid View from one shared rolling 18-month helper that uses month boundaries only.

**Visual Acceptance Test:**  
- [ ] Starting state / setup: Open BigCal in a non-August-2025 month such as July 2026, with the normal Calendar view loading first.
- [ ] User action: Let the page finish loading, inspect the mini-calendar strip, then switch to the **18-Month** tab.
- [ ] Expected visible result: Both the mini-calendar strip and the Grid / 18-Month view show the same rolling 18-month horizon relative to the current operational month rather than a fixed August 2025 start.
- [ ] Expected visible result: The current month still lands in a familiar position so the user immediately sees the main calendar month plus nearby future months without the UI feeling radically repositioned.
- [ ] Important failure case or edge case if relevant: Opening the page on the 1st, 15th, or last day of a month does **not** change the horizon length or produce off-by-one month errors, because the math is based on month boundaries rather than raw day subtraction/addition.

**Status:**  
Complete

**Tasks:**
- [x] Add a shared rolling-month helper to `src/webparts/bigCal/utils/BigCalDateRangeUtils.ts` that returns `start`, `end`, and `months[]` for a reference date plus month offsets.
- [x] Implement the helper in `src/webparts/bigCal/utils/BigCalDateRangeUtils.ts` so the start date is the first day of the start month at `00:00:00.000`.
- [x] Implement the helper in `src/webparts/bigCal/utils/BigCalDateRangeUtils.ts` so the end date is the last day of the end month at `23:59:59.999`.
- [x] Add unit-level inline documentation to `src/webparts/bigCal/utils/BigCalDateRangeUtils.ts` clarifying that this helper uses **full-month** math and must not be converted back to day-based calculations.
- [x] Replace the hard-coded `get18MonthRange()` implementation in `src/webparts/bigCal/components/BigCal.tsx` with the shared helper.
- [x] Replace the hard-coded `get18MonthRange()` implementation in `src/webparts/bigCal/components/GridView.tsx` with the shared helper or with a `months[]` prop supplied by `BigCal.tsx`.
- [x] Decide whether `GridView.tsx` should compute months locally or receive them from `BigCal.tsx`, then implement the chosen single-source approach in `src/webparts/bigCal/components/GridView.tsx` and `src/webparts/bigCal/components/BigCal.tsx`.
- [x] Update the mini-calendar rendering loop in `src/webparts/bigCal/components/BigCal.tsx` so it renders the rolling evergreen month list instead of the August 2025 fixed list.
- [x] Update the grid-card rendering loop in `src/webparts/bigCal/components/GridView.tsx` so it renders the same rolling evergreen month list.
- [x] Update the current-month auto-scroll logic in `src/webparts/bigCal/components/BigCal.tsx` so it still lands naturally on the current operational month after the month list becomes evergreen.
- [x] Update the grid auto-scroll logic in `src/webparts/bigCal/components/GridView.tsx` so the current month row remains the initial focal row inside the evergreen 18-month grid.
- [x] Review `getSmartNavigationDate()` in `src/webparts/bigCal/components/BigCal.tsx` and confirm it still preserves the current end-of-month “show next month” feel after the month list is made rolling.
- [x] Remove or replace any remaining inline comments in `src/webparts/bigCal/components/BigCal.tsx` and `src/webparts/bigCal/components/GridView.tsx` that still describe the UI as fixed to August 2025.

**Files Modified:**
- `src/webparts/bigCal/utils/BigCalDateRangeUtils.ts`
- `src/webparts/bigCal/components/BigCal.tsx`
- `src/webparts/bigCal/components/GridView.tsx`

**Implementation Notes:**
- Keep the **18-Month** naming in the UI for now, because the product concept is still an 18-month planning horizon; the change is that the horizon becomes rolling instead of fixed.
- The main requirement in this stage is not merely “generate 18 months,” but “generate the **same** 18 months everywhere.”
- This stage is incomplete if Calendar view and Grid view produce different month collections.
- Preserve the current “familiar landing” behavior through **scroll target / positioning logic**, not by shrinking the range back down.

---

### Stage 2: Align initial event loading with the evergreen 18-month horizon without regressing first-load feel

**Goal:**  
Make the initial event data range match the new evergreen 18-month display horizon so visible months are supported by loaded data, while still preserving the current perception that the user lands in the current month with nearby months immediately available.

**Visual Acceptance Test:**  
- [ ] Starting state / setup: Open BigCal on a page load where lazy loading is enabled and the current month is not near the old August 2025 baseline.
- [ ] User action: Wait for the first render, inspect the current month in the main calendar, then inspect the mini-calendar strip and switch to the **18-Month** view.
- [ ] Expected visible result: Events appear for months across the rolling 18-month horizon instead of silently going blank outside the old 1-past / 4-future load window.
- [ ] Expected visible result: The initial user experience still feels like the current design — the user lands around the current month rather than at the absolute beginning of the 18-month strip.
- [ ] Important failure case or edge case if relevant: An event in the earliest visible month of the 18-month horizon and an event in the latest visible month of the 18-month horizon both appear without requiring a second background load or a manual recovery action.

**Status:**  
Complete

**Tasks:**
- [x] Refactor `calculateInitialDateRange()` in `src/webparts/bigCal/components/BigCal.tsx` to use the shared helper from `src/webparts/bigCal/utils/BigCalDateRangeUtils.ts`.
- [x] Ensure `calculateInitialDateRange()` in `src/webparts/bigCal/components/BigCal.tsx` returns the same `start` and `end` used by the Calendar mini-calendar strip and Grid view.
- [x] Update `loadInitialEvents()` in `src/webparts/bigCal/components/BigCal.tsx` so performance logging reflects the evergreen 18-month model rather than the old fixed-window assumptions.
- [x] Review `loadedDateRange` state writes in `src/webparts/bigCal/components/BigCal.tsx` and confirm they store the actual evergreen visible range boundaries.
- [x] Update any date-range-dependent comments in `src/webparts/bigCal/components/BigCal.tsx` that still describe the initial range as a small fixed historical window.
- [x] Review `src/webparts/bigCal/services/SharePointService.ts`, `src/webparts/bigCal/services/PrivateEventsService.ts`, and `src/webparts/bigCal/services/HybridEventsService.ts` to confirm no service-side assumptions depend on the old fixed August 2025 horizon.
- [x] Confirm `src/webparts/bigCal/components/GridView.tsx` no longer forces a full dataset load simply because the user opened the 18-Month view, since the visible 18-month horizon should already be supported.
- [x] Update `handleViewModeChange()` in `src/webparts/bigCal/components/BigCal.tsx` to remove or revise the unconditional grid-triggered `loadAllEvents()` path.
- [x] Verify the current-month landing / auto-scroll behavior after the expanded initial range is loaded, and adjust the scroll timing in `src/webparts/bigCal/components/BigCal.tsx` if the larger month collection changes DOM timing.

**Files Modified:**
- `src/webparts/bigCal/components/BigCal.tsx`
- `src/webparts/bigCal/components/GridView.tsx`
- `src/webparts/bigCal/services/SharePointService.ts` *(review and modify only if a hidden range assumption exists)*
- `src/webparts/bigCal/services/PrivateEventsService.ts` *(review and modify only if a hidden range assumption exists)*
- `src/webparts/bigCal/services/HybridEventsService.ts` *(review and modify only if a hidden range assumption exists)*

**Implementation Notes:**
- The important nuance in this stage is: **larger loaded range, same landing feel**.
- Do not “preserve first-load feel” by keeping the old narrow data range if the UI now renders a broader visible horizon.
- If larger first-load queries meaningfully slow the app in practice, measure that in-browser before adding more complexity.
- This stage should not yet introduce the new history button; that comes in the next stage so the visible test for this stage stays focused.

---

### Stage 3: Replace incidental full-load behavior with an intentional “Load 6 earlier months” history action

**Goal:**  
Stop loading the entire dataset merely because the user scrolls or navigates outside the current partial range, and instead provide a visible, intentional way to extend earlier history in 6-month chunks.

**Visual Acceptance Test:**  
- [ ] Starting state / setup: Open BigCal with lazy loading enabled, verify the initial evergreen 18-month window is present, and ensure there is known data older than the earliest currently visible month.
- [ ] User action: Click a visible **Load 6 earlier months** action from the Calendar view and then inspect the mini-calendar strip and the 18-Month view.
- [ ] Expected visible result: Six earlier months are added ahead of the existing range, their event counts populate, and the user remains oriented near their current place instead of being snapped to an unexpected location.
- [ ] Expected visible result: The same newly added earlier months appear consistently in both the mini-calendar strip and the 18-Month view.
- [ ] Important failure case or edge case if relevant: If there are no additional earlier events to load, the button either disables, hides, or shows a clear no-more-history message instead of endlessly reloading the same empty range.

**Status:**  
Complete

**Tasks:**
- [x] Add state to `src/webparts/bigCal/components/BigCal.tsx` to track whether earlier-history expansion is in progress.
- [x] Add state to `src/webparts/bigCal/components/BigCal.tsx` to track the currently extended month-range boundaries after one or more earlier-history loads.
- [x] Decide the exact visible placement for the **Load 6 earlier months** action in `src/webparts/bigCal/components/BigCal.tsx` so users can discover it without confusing it for a general refresh action.
- [x] Render the **Load 6 earlier months** action in `src/webparts/bigCal/components/BigCal.tsx` only when lazy loading / partial loading is still active.
- [x] Add a dedicated `loadEarlierMonths()` workflow in `src/webparts/bigCal/components/BigCal.tsx` that requests the previous 6-month block relative to the current earliest loaded month.
- [x] Use `src/webparts/bigCal/services/HybridEventsService.ts` range-based loading to fetch the new earlier block rather than calling the full-dataset path.
- [x] Merge newly fetched earlier events into `events` state in `src/webparts/bigCal/components/BigCal.tsx` without duplicating items already loaded.
- [x] Expand the rendered evergreen month list in `src/webparts/bigCal/components/BigCal.tsx` after a successful earlier-history load so the earlier months become visible in the mini-calendar strip.
- [x] Ensure `src/webparts/bigCal/components/GridView.tsx` receives or derives the expanded earlier month list so the 18-Month view reflects the same history extension.
- [x] Replace the current `handleMiniCalendarScroll()` auto-`loadAllEvents()` behavior in `src/webparts/bigCal/components/BigCal.tsx` with non-destructive behavior that preserves scroll position without silently fetching the full dataset.
- [x] Replace the current `checkAndLoadAllIfNeeded()` full-load trigger in `src/webparts/bigCal/components/BigCal.tsx` with logic that either does nothing, shows the history action, or routes users into the intentional earlier-history workflow.
- [x] Review `handleMonthNavigate()` in `src/webparts/bigCal/components/BigCal.tsx` so navigating to an already rendered month does not unexpectedly escalate into a full-dataset fetch.
- [x] Add visible loading feedback for the history-extension action in `src/webparts/bigCal/components/BigCal.tsx` so users can tell the app is intentionally fetching older data.
- [x] Add a visible empty-history or completion state in `src/webparts/bigCal/components/BigCal.tsx` so repeated clicks do not feel broken when there is no older data left.

**Files Modified:**
- `src/webparts/bigCal/components/BigCal.tsx`
- `src/webparts/bigCal/components/GridView.tsx`
- `src/webparts/bigCal/services/HybridEventsService.ts`

**Implementation Notes:**
- This stage intentionally prioritizes **earlier** history only, because that is the explicit user request.
- Do not reintroduce “load everything” as the default fallback for casual scrolling.
- A 6-month history increment is intentional product behavior in this stage, not a generic technical constant.
- If later needed, a future stage can add **Load 6 more future months**, but that is out of scope for this first implementation plan.
- Final Stage 3 UX decision: the **Load 6 earlier months** action lives as the first item in the Calendar mini-calendar sidebar so it remains intentionally discoverable only when the user scrolls to the beginning of history.

---

### Stage 4: Coherence pass across navigation, refresh paths, and admin-facing lazy-load configuration

**Goal:**  
Make the new evergreen month model and intentional history-loading behavior coherent across common view switches, refresh paths, and property-pane configuration so the feature behaves predictably after the main work is complete.

**Visual Acceptance Test:**  
- [ ] Starting state / setup: Load BigCal, extend earlier history once with **Load 6 earlier months**, and then switch between **Calendar** and **18-Month** views.
- [ ] User action: Open the property pane, inspect the existing lazy-load configuration, return to the canvas, and perform a common refresh path such as editing an event or reloading the page.
- [ ] Expected visible result: The app still presents the evergreen month model coherently, the view labels/settings make sense to an admin, and common refreshes do not collapse the UI back to the old August 2025 assumptions.
- [ ] Important failure case or edge case if relevant: Timeline and DataSheet behavior may still choose to full-load for their own reasons, but they must not break Calendar-view or Grid-view range consistency when the user returns.

**Status:**  
Not Started

**Tasks:**
- [ ] Review the property pane labels and explanatory text in `src/webparts/bigCal/BigCalWebPart.ts` so `lazyLoadMonthsPast` and `lazyLoadMonthsFuture` clearly read as rolling month-horizon settings rather than obscure internal tuning knobs.
- [ ] Decide whether the default values in `src/webparts/bigCal/BigCalWebPart.ts` should be updated during this work or whether existing persisted web part instances should keep their saved values until a later migration decision.
- [ ] If defaults change, update the default-value assignments in `src/webparts/bigCal/BigCalWebPart.ts` and document the impact on new versus already-configured web part instances.
- [ ] Review `handleViewModeChange()` in `src/webparts/bigCal/components/BigCal.tsx` for Timeline- and Grid-specific data-loading side effects that may now be outdated.
- [ ] Review `openDataSheetModal()` in `src/webparts/bigCal/components/BigCal.tsx` and confirm whether its full-load behavior should remain unchanged for editing scenarios.
- [ ] Review event create / update / delete refresh flows in `src/webparts/bigCal/components/BigCal.tsx` to ensure the evergreen month range and any user-added earlier-history months remain coherent after refresh.
- [ ] Review import / export or other full-refresh entry points in `src/webparts/bigCal/components/BigCal.tsx` and related components to ensure they do not accidentally reset the month model back to a hard-coded window.
- [ ] Add or update documentation in `docs/BigCal-Dynamic-Range-Handoff.md` to record the final implementation direction once the code plan is executed.

**Files Modified:**
- `src/webparts/bigCal/BigCalWebPart.ts`
- `src/webparts/bigCal/components/BigCal.tsx`
- `docs/BigCal-Dynamic-Range-Handoff.md`

**Implementation Notes:**
- This is the hardening stage; it should not introduce a second range model.
- The most important question here is not “can the admin still tune months,” but “does the tuning language still make sense now that the UI itself is evergreen?”
- If view-specific full-load behavior remains necessary for Timeline or DataSheet, document it explicitly rather than leaving it as an accidental side effect.

---

## Recommended Implementation Order

1. **Stage 1** — unify month math and remove the fixed August 2025 display window
2. **Stage 2** — align visible months with loaded data while preserving landing feel
3. **Stage 3** — add intentional earlier-history expansion and remove incidental full-load behavior
4. **Stage 4** — harden property-pane language, refresh flows, and cross-view coherence

## Scope Notes

- **In scope:** Calendar view mini-calendar strip, Grid / 18-Month view, initial range math, earlier-history extension behavior, and related lazy-load flows.
- **Out of scope for this plan:** A general future-history button, Timeline viewport redesign, absolute start/end campaign windows, and broad refactors unrelated to range behavior.
- **Important constraint:** The implementation should preserve the current visual feeling of landing around the current month, even though the underlying month collection becomes a rolling evergreen 18-month horizon.