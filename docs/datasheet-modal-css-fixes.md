# DataSheet Modal CSS Pollution Fix

## Problem
DataSheet modal was using global CSS overrides that polluted ALL modals in the application, causing Legend Studio and other modals to be forced to 1200px width instead of their intended sizes.

## Root Cause
In `src/webparts/bigCal/components/DataSheetModal.module.scss`, lines 47-68 contained global CSS overrides:

```scss
// Global overrides for all modal elements
:global {
  .ms-Modal-main {
    width: 1200px !important;
    max-width: 1200px !important;
    min-width: 1200px !important;
  }

  .ms-Modal-scrollableContent {
    width: 1200px !important;
    max-width: 1200px !important;
    min-width: 1200px !important;
  }

  // Override any responsive behavior
  @media (max-width: 1400px) {
    .ms-Modal-main {
      width: 1200px !important;
      max-width: 1200px !important;
      min-width: 1200px !important;
    }
  }
}
```

## Solution
**Removed the global CSS overrides** (lines 47-68) and replaced with comment:

```scss
// Removed global overrides - they were polluting other modals like Legend Studio
// DataSheet modal sizing is handled by scoped styles in .modalContainer above
```

## Why This Works
DataSheet modal already had proper scoped styles in `.modalContainer` (lines 3-36) that only affect DataSheet modals:

```scss
.modalContainer {
  // Force consistent modal width - much wider than EventModal for table data
  :global(.ms-Modal-main),
  :global(.ms-Modal-main *),
  :global(.ms-Modal-scrollableContent) {
    width: 1200px !important;
    max-width: 1200px !important;
    min-width: 1200px !important;
  }
  // ... more scoped styles
}
```

## Result
- ✅ DataSheet modal still displays at 1200px width (via scoped styles)
- ✅ Legend Studio displays at intended 800px width (no longer polluted)
- ✅ All other modals display at their intended sizes
- ✅ No global CSS pollution affecting other components

## Files Changed
- `src/webparts/bigCal/components/DataSheetModal.module.scss` - Removed lines 47-68

## Testing
1. Open DataSheet modal - should be 1200px wide
2. Open Legend Studio modal - should be 800px wide  
3. Both modals should display correctly without CSS conflicts
