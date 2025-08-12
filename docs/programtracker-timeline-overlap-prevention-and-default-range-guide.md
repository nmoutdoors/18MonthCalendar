# ProgramTracker Timeline: Event Overlap Prevention & Default View Range

## Overview

This guide documents how ProgramTracker prevents timeline event overlap and sets the default view range. The implementation ensures clean visual presentation and optimal user experience by automatically organizing events and setting an appropriate initial time window.

## 1. Event Overlap Prevention Strategy

### Core Stacking Configuration
The primary mechanism for preventing overlap is **stacking**, which automatically arranges overlapping events vertically:

```typescript
const options = {
  // Enable stacking to prevent overlapping
  stack: true,                    // Stack overlapping items vertically
  stackSubgroups: true,          // Stack within subgroups as well
  
  // Control item stacking order
  order: function(a, b) {
    // Stack by date (earlier dates at the top)
    return a.start - b.start;
  },
  
  // DISABLE clustering - use false instead of null
  cluster: false,                // Keep individual items separate
  
  // Critical spacing settings
  margin: {
    item: {
      horizontal: 10,            // Space between items horizontally
      vertical: 15               // Space between items vertically (key for stacking)
    },
    axis: 5                      // Space around time axis
  }
};
```

### Why This Configuration Works

#### **1. Stack = true**
- **Purpose**: Automatically moves overlapping events to different vertical levels
- **Behavior**: When multiple events occur on the same date, they stack vertically instead of overlapping
- **Visual Result**: Clean, readable timeline with no hidden events

#### **2. stackSubgroups = true**
- **Purpose**: Applies stacking within each group (CenterOrg)
- **Behavior**: Events within the same organization stack properly
- **Benefit**: Maintains group organization while preventing overlap

#### **3. cluster = false**
- **Purpose**: Prevents vis-timeline from clustering nearby events into groups
- **Reason**: Clustering can hide individual events and create confusion
- **Alternative**: Individual events remain visible and selectable

#### **4. order function**
- **Purpose**: Controls the vertical stacking order
- **Logic**: `return a.start - b.start` (earlier dates stack higher)
- **Benefit**: Chronological visual order from top to bottom

#### **5. margin.item.vertical = 15**
- **Purpose**: Provides adequate spacing between stacked items
- **Value**: 15px tested for optimal readability
- **Impact**: Prevents visual crowding when events stack

## 2. Default View Range Configuration

### Initial Date Range Setup
```typescript
private initializeTimeline(): void {
  // Set initial start and end dates
  const today = new Date();
  const startDate = new Date();
  startDate.setDate(today.getDate() - 5);  // 5 days before today
  const endDate = new Date();
  endDate.setDate(today.getDate() + 20);   // 20 days after today
  
  const options = {
    // ... other options
    start: startDate,    // Initial start date
    end: endDate        // Initial end date
  };
}
```

### Date Range Breakdown

#### **Start Date: Today - 5 days**
- **Purpose**: Shows recent past events for context
- **Benefit**: Users can see what just happened
- **Comment**: "Changed from -7 to -5 days" (optimized based on usage)

#### **End Date: Today + 20 days**
- **Purpose**: Shows upcoming events in near future
- **Benefit**: Focuses on actionable timeframe
- **Range**: 25-day total window (5 past + 20 future)

### Why This Range Works

1. **Contextual Past**: 5 days back provides recent context without clutter
2. **Actionable Future**: 20 days forward covers typical planning horizon
3. **Manageable Scope**: 25-day window prevents information overload
4. **Performance**: Smaller range loads faster and renders smoother

## 3. Event Data Structure for Overlap Prevention

### Timeline Item Configuration
```typescript
interface TimelineItem {
  id: number;
  content: string;        // Event title and program name
  start: Date;           // Event date (no time component)
  group?: string;        // CenterOrg for grouping
  className: string;     // CSS classes for styling
  type: 'point'         // Point type for consistent rendering
}
```

### Event Mapping Implementation
```typescript
private mapEventsToTimelineItems(): TimelineItem[] {
  return this.getFilteredEvents()
    .map(event => {
      // Use date with no time component for consistent positioning
      const dateOnly = new Date(event.EventDate);
      dateOnly.setHours(0, 0, 0, 0);
      
      return {
        id: event.ID || 0,
        content: `${programName}: ${event.EventTitle || 'Unnamed Event'}`,
        start: dateOnly,              // Consistent date format
        group: group || 'Unassigned', // Group by organization
        className: statusClass,       // Status-based styling
        type: 'point'                // Point type for all events
      };
    })
    .filter(item => item !== null) as TimelineItem[];
}
```

### Key Points for Overlap Prevention

#### **1. Consistent Date Format**
```typescript
const dateOnly = new Date(event.EventDate);
dateOnly.setHours(0, 0, 0, 0);  // Remove time component
```
- **Purpose**: Ensures events on same day are treated as overlapping
- **Benefit**: Triggers stacking behavior correctly

#### **2. Point Type Usage**
```typescript
type: 'point'  // Use point type for all events
```
- **Purpose**: Consistent rendering behavior
- **Benefit**: Predictable stacking and spacing

#### **3. Group-Based Organization**
```typescript
group: group || 'Unassigned'  // Group by CenterOrg
```
- **Purpose**: Organizes events by organization
- **Benefit**: Stacking occurs within logical groups

## 4. Visual Spacing and Layout

### Height Configuration
```typescript
const options = {
  height: '770px',              // Fixed height for consistent layout
  autoResize: true,             // Adjust to container changes
  
  // Orientation for better stacking
  orientation: {
    axis: 'top',                // Time axis at top
    item: 'bottom'              // Items at bottom
  }
};
```

### CSS Enhancements for Stacking
```scss
:global {
  // Make timeline items more visually distinct when stacked
  .vis-item {
    cursor: pointer !important;
  }
  
  // Enhance hover effect for stacked items
  .vis-item:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3) !important;
    z-index: 10 !important;  // Ensure hovered items appear above others
  }
  
  // Style the dots for better visual separation
  .vis-item .vis-dot {
    border-radius: 2.5px !important;
    width: 4px !important;
    height: 32px !important;
    border-width: 0 !important;
  }
}
```

## 5. Dynamic Range Loading (Performance Optimization)

### Extended Range Loading
```typescript
private loadEventsForVisibleTimeRange = (): void => {
  // Get visible date range (broader than display range)
  const today = new Date();
  const startDate = new Date(today);
  startDate.setMonth(today.getMonth() - 1);  // 1 month back
  startDate.setHours(0, 0, 0, 0);
  
  const endDate = new Date(today);
  endDate.setMonth(today.getMonth() + 2);    // 2 months forward
  endDate.setHours(23, 59, 59, 999);
  
  // Load events for this broader range
  const loadEventsEvent = new CustomEvent('loadTimelineEvents', {
    detail: {
      dateRangeStart: startDate.toISOString(),
      dateRangeEnd: endDate.toISOString()
    }
  });
  
  window.dispatchEvent(loadEventsEvent);
};
```

### Two-Tier Range Strategy

#### **Display Range**: Today -5 to +20 days
- **Purpose**: Initial view window
- **Benefit**: Focused, manageable view

#### **Data Range**: Today -1 month to +2 months  
- **Purpose**: Pre-loaded data for smooth scrolling
- **Benefit**: No loading delays when user pans timeline

## 6. Implementation Checklist

### Overlap Prevention
- [ ] Set `stack: true` in timeline options
- [ ] Set `stackSubgroups: true` for group-level stacking
- [ ] Set `cluster: false` to prevent event clustering
- [ ] Configure `margin.item.vertical: 15` for adequate spacing
- [ ] Implement `order` function for chronological stacking
- [ ] Use consistent date format (no time component)
- [ ] Use `type: 'point'` for all timeline items

### Default Range
- [ ] Set start date to `today.getDate() - 5`
- [ ] Set end date to `today.getDate() + 20`
- [ ] Configure broader data loading range (±1-2 months)
- [ ] Test range with typical data volumes
- [ ] Verify performance with large datasets

### Visual Enhancements
- [ ] Set fixed height (`770px`) for consistent layout
- [ ] Configure proper orientation (axis: 'top', item: 'bottom')
- [ ] Add hover effects for stacked items
- [ ] Style dots for visual distinction
- [ ] Test stacking behavior with multiple overlapping events

## 7. Common Issues and Solutions

### Issue: Events still overlapping
**Solution**: Verify `stack: true` and `margin.item.vertical` settings
```typescript
stack: true,
margin: { item: { vertical: 15 } }
```

### Issue: Events clustering together
**Solution**: Ensure `cluster: false`
```typescript
cluster: false  // Not null, not undefined - explicitly false
```

### Issue: Poor stacking order
**Solution**: Implement proper order function
```typescript
order: function(a, b) {
  return a.start - b.start;  // Earlier dates stack higher
}
```

### Issue: Timeline too crowded
**Solution**: Adjust date range or increase vertical spacing
```typescript
startDate.setDate(today.getDate() - 3);  // Reduce past range
margin: { item: { vertical: 20 } }        // Increase spacing
```

This configuration provides clean, organized timeline display with optimal default viewing range for typical use cases.
