# BigCal Dynamic Range Handoff

## Context

On 2026-06-29, we reviewed the **BigCal** SPFx web part to determine the best course of action for making its original fixed 18-month calendar window more flexible.

Original intent described by the user:
- BigCal was initially designed to track **18 months of events starting in Aug 2025**.
- That fixed window therefore ends in **Jan 2027**.
- The goal is to make the calendar more flexible going forward.

## User's Candidate Approaches

The user proposed two main ideas:

1. **Dynamic relative window**
   - Example: show a certain number of months prior (such as 6)
   - and show 12 months future
   - In other words, convert from a static fixed window to a dynamic rolling window.

2. **Explicit web part properties for start/end**
   - Add configurable web part properties that let an admin set the calendar start and end.

## UnityFX Pattern Context

Relevant UnityFX guidance reviewed before analyzing BigCal:

- `unityfx/.augment-guidelines`
- `unityfx/docs/UnityFX-Standing-Orders.md`
- `unityfx/docs/AI-Collaboration-Protocols.md`
- `unityfx/docs/PatternLibrary.md`
- `unityfx/unityfx-manifest.json`

Most relevant pattern match:

- `unityfx/patterns/core/Performance.ConfigurableLazyLoading.md`
- supporting implementation family:
  - `unityfx/patterns/ui-components/UiComponent.VisTimelineConfigurableLazyLoading.md`

Why it matters:
- UnityFX already has a pattern for **user-configurable date ranges via property pane controls**.
- The pattern is designed for **time-based visualizations** and aligns strongly with BigCal's need.

## Code Findings

### 1. BigCal already has dynamic month-range properties for data loading

File:
- `src/webparts/bigCal/BigCalWebPart.ts`

Relevant properties already exist:
- `enableLazyLoading`
- `lazyLoadMonthsPast`
- `lazyLoadMonthsFuture`
- `enablePerformanceLogging`

These properties are passed into the React component via `BigCal` props.

Supporting interface:
- `src/webparts/bigCal/components/IBigCalProps.ts`

### 2. BigCal already uses those properties for initial event loading

File:
- `src/webparts/bigCal/components/BigCal.tsx`

Relevant methods:
- `calculateInitialDateRange()`
- `loadInitialEvents()`
- `loadEvents()`

Observed behavior:
- The initial event query window is already calculated dynamically from:
  - `lazyLoadMonthsPast`
  - `lazyLoadMonthsFuture`
- This means the **data-loading side is already dynamic**.

### 3. The UI/display side is still hard-coded to the original 18-month concept

#### In `BigCal.tsx`

We found a hard-coded display month list using:

- `const startDate = new Date(2025, 7, 1);`
- `for (let i = 0; i < 18; i++)`

This indicates the month navigator / displayed month collection still assumes:
- fixed start = **August 2025**
- fixed length = **18 months**

#### In `GridView.tsx`

File:
- `src/webparts/bigCal/components/GridView.tsx`

We found:
- `get18MonthRange()`
- fixed start date `new Date(2025, 7, 1)`
- fixed loop `for (let i = 0; i < 18; i++)`
- header text: **"18-Month Overview"**

This is a second hard-coded UI implementation of the original window.

### 4. Timeline has separate initial-range logic

File:
- `src/webparts/bigCal/components/TimelineView.tsx`

Observed behavior:
- Timeline initializes a short default visible range:
  - roughly `today - 5 days`
  - roughly `today + 20 days`

This appears to be a **timeline viewport concern**, not necessarily the same problem as the fixed 18-month calendar window.

## Architectural Conclusion

BigCal is currently in a **split-brain state**:

- **Data loading range** -> already dynamic and property-driven
- **Display range** -> still hard-coded to Aug 2025 through Jan 2027 assumptions

That mismatch is the real issue.

## Recommended Course of Action

### Primary recommendation

Use a **dynamic relative month range** as the primary model.

Recommended shape:
- drive the calendar from a rolling window relative to today/current operational date
- use shared configuration such as:
  - `monthsPast`
  - `monthsFuture`

Example target behavior:
- **6 months prior**
- **12 months future**

### Why this was recommended

1. It matches the existing BigCal architecture better than introducing a brand-new absolute date model.
2. It aligns with the UnityFX **Configurable Lazy Loading** pattern.
3. It avoids the app going stale again.
4. It keeps the experience evergreen for planning.
5. It minimizes new complexity because the web part already has property-pane month values.

## Alternative COAs Considered

### COA 2: absolute start/end web part properties

Example:
- `calendarStartMonth`
- `calendarEndMonth`

Pros:
- exact admin control
- useful if a calendar truly represents a fixed campaign window

Cons:
- more admin maintenance
- easier to become stale again
- requires more validation and edge-case handling
- less aligned with the existing dynamic lazy-load model

### COA 3: hybrid model

Example:
- relative range by default
- optional absolute override later

Pros:
- maximum flexibility

Cons:
- more property complexity
- more validation complexity
- probably unnecessary as a first move

## Recommended Implementation Direction

If/when work resumes, the recommended first implementation pass is:

1. **Extract a shared helper**
   - e.g. `getDisplayMonthRange(referenceDate, monthsPast, monthsFuture)`
   - should return:
     - `start`
     - `end`
     - `months[]`

2. **Use that helper in `BigCal.tsx`**
   - replace the hard-coded Aug 2025 + 18-month display logic

3. **Use that helper in `GridView.tsx`**
   - replace `get18MonthRange()`
   - rename UI text from **"18-Month Overview"** to something generic like **"Calendar Overview"**

4. **Keep display range aligned with initial lazy-load range**
   - avoid displaying months that the initial lazy load does not support
   - ideally one shared configuration should drive both visible months and initial load window

5. **Consider adjusting defaults**
   - current defaults observed in `BigCalWebPart.ts`:
     - `lazyLoadMonthsPast = 1`
     - `lazyLoadMonthsFuture = 4`
   - possible better planning defaults:
     - `6` past
     - `12` future

## Important Resume Notes

If returning to this work later, the next discussion should probably confirm:

1. Should BigCal be **evergreen** by default?
   - i.e. always roll with time

2. Do you want the visible calendar horizon to match the lazy-loaded horizon exactly?

3. Do you want to keep the current property names:
   - `lazyLoadMonthsPast`
   - `lazyLoadMonthsFuture`

   or rename/add separate display-specific properties later?

## Short Resume Summary

**Current recommendation:**

> Refactor BigCal to use a shared, dynamic, relative month-range model first, driven by month-based web part properties, and only add absolute start/end overrides later if a real fixed-window use case appears.
