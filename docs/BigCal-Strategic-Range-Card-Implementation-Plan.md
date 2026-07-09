# BigCal Strategic Range Card Implementation Plan

## Scope

Build a new **interactive strategic range card / 180-day sector view** inside BigCal using **React + SVG**, with **D3 used for math/geometry only**.

This view is intended to:
- live inside the existing BigCal environment
- honor the existing BigCal dropdown filters automatically
- support hover popovers and click-to-edit interactions
- avoid recreating the PowerPoint-only extras such as the Index box, Military Down Days callouts, and bottom summary columns

## Assumptions

- The new visualization will be a **new BigCal view mode** alongside `Calendar`, `Briefing`, `18-Month`, and `Timeline`
- The new view will consume the already-filtered BigCal event set from `src/webparts/bigCal/components/BigCal.tsx`
- The visible window will be a **6-month / ~180-day span** anchored to BigCal's active date context
- Interaction target for V1:
  - hover -> BigCal-style popover
  - click -> existing BigCal edit item modal

---

### Stage 1: Create the new Sector view shell and geometry foundation

**Goal:**  
Add a new BigCal view mode and render a non-empty SVG sector/range-card shell that proves the view can exist cleanly in the BigCal UI.

**Visual Acceptance Test:**  
- [ ] Starting state / setup: Open BigCal in fullscreen with normal event data loaded
- [ ] User action: Click the new sector/range-card tab in the top navigation
- [ ] Expected visible result: BigCal switches to a new full-width view showing a clean SVG half-sector layout with 6 labeled month wedges based on the active BigCal date
- [ ] Important failure case or edge case if relevant: Switching back to `Calendar`, `Briefing`, `18-Month`, and `Timeline` still works normally with no layout breakage

**Status:**  
Not Started

**Tasks:**
- [ ] Run `npm install d3-scale d3-shape`
- [ ] Run `npm install --save-dev @types/d3-scale @types/d3-shape`
- [ ] Add a new view mode in `src/webparts/bigCal/components/BigCal.tsx` for the strategic range card view
- [ ] Add a new top-nav tab in `src/webparts/bigCal/components/BigCal.tsx` for the strategic range card view
- [ ] Create `src/webparts/bigCal/components/StrategicRangeCardView.tsx`
- [ ] Create `src/webparts/bigCal/components/StrategicRangeCardView.module.scss`
- [ ] In `src/webparts/bigCal/components/StrategicRangeCardView.tsx`, render an SVG half-sector shell with outer arc, month wedge dividers, and month labels
- [ ] Pass `currentDate` from `src/webparts/bigCal/components/BigCal.tsx` into `src/webparts/bigCal/components/StrategicRangeCardView.tsx`
- [ ] Keep the new view visually isolated so existing calendar/timeline rendering paths are not refactored unnecessarily
- [ ] Run `gulp build`

**Files Modified:**
- `package.json`
- `package-lock.json`
- `src/webparts/bigCal/components/BigCal.tsx`
- `src/webparts/bigCal/components/BigCal.module.scss`
- `src/webparts/bigCal/components/StrategicRangeCardView.tsx`
- `src/webparts/bigCal/components/StrategicRangeCardView.module.scss`

**Implementation Notes:**
- This stage must end in a **real clickable tab**, not just geometry helpers
- Use **React-rendered SVG** rather than giving D3 direct DOM ownership
- Use D3 only for scale and arc calculations
- Keep V1 shell intentionally boring: geometry first, no event plotting yet
- Dependency approval has already been granted

---

### Stage 2: Plot filtered BigCal events into the 180-day sector

**Goal:**  
Render actual BigCal events on the sector chart so the new view becomes useful and automatically honors the existing filter dropdowns.

**Visual Acceptance Test:**  
- [ ] Starting state / setup: Open the new sector/range-card view with events spanning multiple months
- [ ] User action: Change existing BigCal filters such as Event Category, Status, IMO, or OPR
- [ ] Expected visible result: Event markers and labels in the sector chart update immediately to reflect the same filtered dataset seen in other BigCal views
- [ ] Important failure case or edge case if relevant: Events outside the active 180-day window do not render into the sector chart

**Status:**  
Not Started

**Tasks:**
- [ ] Pass the already-filtered event array from `src/webparts/bigCal/components/BigCal.tsx` into `src/webparts/bigCal/components/StrategicRangeCardView.tsx`
- [ ] Define the 180-day window logic in `src/webparts/bigCal/components/StrategicRangeCardView.tsx` based on `currentDate`
- [ ] Convert event dates into angular positions within the visible sector range
- [ ] Render visible event markers in `src/webparts/bigCal/components/StrategicRangeCardView.tsx`
- [ ] Render first-pass event labels/callouts in `src/webparts/bigCal/components/StrategicRangeCardView.tsx`
- [ ] Reuse existing BigCal color inputs so event markers reflect current swimlane/status color logic
- [ ] Add a minimal label-collision strategy in `src/webparts/bigCal/components/StrategicRangeCardView.tsx` to keep the chart readable
- [ ] Re-render correctly when filters or `currentDate` change
- [ ] Run `gulp build`

**Files Modified:**
- `src/webparts/bigCal/components/BigCal.tsx`
- `src/webparts/bigCal/components/StrategicRangeCardView.tsx`
- `src/webparts/bigCal/components/StrategicRangeCardView.module.scss`

**Implementation Notes:**
- Reuse BigCal's existing filtered event set instead of duplicating filter logic in the new view
- Prefer readability over perfect label completeness in V1
- If density becomes a problem, marker-first rendering with reduced label volume is acceptable for this stage

---

### Stage 3: Add hover popovers and click-through editing

**Goal:**  
Make the sector chart meaningfully interactive by reusing BigCal's established popover and edit-modal behaviors.

**Visual Acceptance Test:**  
- [ ] Starting state / setup: Open the sector/range-card view with several visible events
- [ ] User action: Hover an event marker or event label
- [ ] Expected visible result: A BigCal-style event popover appears with event details
- [ ] User action: Click an event marker or event label
- [ ] Expected visible result: The existing BigCal edit item modal opens for that event
- [ ] Important failure case or edge case if relevant: Holiday items or protected event types follow the same edit restrictions used elsewhere in BigCal

**Status:**  
Not Started

**Tasks:**
- [ ] Add hover state management to `src/webparts/bigCal/components/StrategicRangeCardView.tsx`
- [ ] Add click handlers to event markers and labels in `src/webparts/bigCal/components/StrategicRangeCardView.tsx`
- [ ] Pass event-selection callbacks from `src/webparts/bigCal/components/BigCal.tsx` into `src/webparts/bigCal/components/StrategicRangeCardView.tsx`
- [ ] Reuse or adapt `src/webparts/bigCal/components/EventPopover.tsx` for sector-view hover behavior
- [ ] Update target typing in `src/webparts/bigCal/components/EventPopover.tsx` if SVG targets require broader DOM element support
- [ ] Ensure click actions open the same edit flow already used by Calendar and Timeline in `src/webparts/bigCal/components/BigCal.tsx`
- [ ] Respect existing holiday / non-editable item restrictions
- [ ] Run `gulp build`

**Files Modified:**
- `src/webparts/bigCal/components/BigCal.tsx`
- `src/webparts/bigCal/components/StrategicRangeCardView.tsx`
- `src/webparts/bigCal/components/StrategicRangeCardView.module.scss`
- `src/webparts/bigCal/components/EventPopover.tsx`

**Implementation Notes:**
- This is the stage that determines whether the feature is merely neat or actually a "home run"
- Keep interaction behavior aligned with existing BigCal expectations instead of inventing a second interaction model
- SVG hover targets may require small compatibility adjustments for Fluent UI Callout targeting

---

### Stage 4: Improve readability, density handling, and briefing polish

**Goal:**  
Polish the sector chart enough that it works as a real briefing visualization rather than just a technical prototype.

**Visual Acceptance Test:**  
- [ ] Starting state / setup: Open the sector/range-card view in fullscreen with a realistic filtered dataset
- [ ] User action: Change filters, navigate dates, and resize the browser/window
- [ ] Expected visible result: The chart remains readable, month labels stay coherent, markers do not collapse into unusable clutter, and the view feels briefing-ready
- [ ] Important failure case or edge case if relevant: Dense data does not turn the chart into an unreadable wall of labels; the fallback presentation remains usable

**Status:**  
Not Started

**Tasks:**
- [ ] Improve label placement behavior in `src/webparts/bigCal/components/StrategicRangeCardView.tsx`
- [ ] Tune spacing, typography, and visual hierarchy in `src/webparts/bigCal/components/StrategicRangeCardView.module.scss`
- [ ] Verify the new view behaves properly inside BigCal fullscreen layout via `src/webparts/bigCal/components/BigCal.module.scss`
- [ ] Add a graceful dense-data fallback in `src/webparts/bigCal/components/StrategicRangeCardView.tsx` such as reduced labels or marker-priority rendering
- [ ] Verify filter changes and date navigation do not cause broken redraws or stale interaction targets
- [ ] Run `gulp build`

**Files Modified:**
- `src/webparts/bigCal/components/StrategicRangeCardView.tsx`
- `src/webparts/bigCal/components/StrategicRangeCardView.module.scss`
- `src/webparts/bigCal/components/BigCal.module.scss`

**Implementation Notes:**
- The acceptance bar is **briefing-ready readability**, not pixel-perfect parity with the PowerPoint slide
- If density becomes too high, preserving interaction is more important than rendering every label at once
- If this stage reveals the visual is not viable for real-world data density, the bailout path remains a 180-day export workflow for PowerPoint builders
