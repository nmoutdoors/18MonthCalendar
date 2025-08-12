# BigCalendar vis-timeline Configuration Analysis

## Project Overview
- **Project**: BigCalendar (SPFx 1.20.0)
- **Issue**: Works perfectly in workbench and web part pages, but fails on site pages
- **Error**: "You're running a development build" warning persists even with --ship builds
- **Status**: Site pages show QuotaExceededError and missing admin buttons

## Package Dependencies

```json
"dependencies": {
  "vis-data": "^8.0.1",
  "vis-timeline": "^8.2.1"
}
```

## Import Configuration

### Component Import (TimelineView.tsx)
```typescript
import * as React from 'react';
import { Timeline, DataSet } from 'vis-timeline/standalone';
import 'vis-timeline/styles/vis-timeline-graph2d.css';
```

### Usage Pattern
- **Component Type**: React Class Component
- **Lifecycle**: componentDidMount for initialization
- **Container**: React.createRef<HTMLDivElement>()
- **DataSets**: Initialized in constructor

## Timeline Options Configuration

```typescript
const options = {
  height: '770px',
  autoResize: true,
  groupOrder: 'id',
  editable: false,
  selectable: true,
  stack: true,
  stackSubgroups: true,
  showCurrentTime: true,

  // Critical interaction settings
  zoomable: true,
  zoomKey: 'ctrlKey' as const,
  moveable: true,

  // Scrolling behavior
  verticalScroll: true,
  horizontalScroll: true,

  // Grid and labels
  showMajorLabels: true,
  showMinorLabels: true,

  zoomMin: 1000 * 60 * 60 * 24, // 1 day
  zoomMax: 1000 * 60 * 60 * 24 * 365 * 2, // 2 years
  
  orientation: {
    axis: 'top',
    item: 'bottom'
  },
  
  margin: {
    item: {
      horizontal: 10,
      vertical: 15
    },
    axis: 5
  },

  format: {
    minorLabels: {
      millisecond: 'SSS',
      second: 's',
      minute: 'HH:mm',
      hour: 'HH:mm',
      weekday: 'ddd D',
      day: 'D',
      week: 'w',
      month: 'MMM',
      year: 'YYYY'
    },
    majorLabels: {
      millisecond: 'HH:mm:ss',
      second: 'D MMMM HH:mm',
      minute: 'ddd D MMMM',
      hour: 'ddd D MMMM',
      weekday: 'MMMM YYYY',
      day: 'MMMM YYYY',
      week: 'MMMM YYYY',
      month: 'YYYY',
      year: ''
    }
  }
};
```

## Groups Configuration

```typescript
const groups = [
  { id: 'Category 1', content: 'Category 1', className: 'swimlane-category1' },
  { id: 'Category 2', content: 'Category 2', className: 'swimlane-category2' },
  { id: 'Category 3', content: 'Category 3', className: 'swimlane-category3' }
];
```

## Event Handling

```typescript
// Selection events
timeline.on('select', (properties: { items: number[] }) => {
  // Handle item selection
});

timeline.on('doubleClick', (properties: { item: number }) => {
  // Handle double-click
});

// Loading state management
timeline.on('changed', hideLoadingSpinner);
timeline.on('rangechanged', hideLoadingSpinner);
timeline.on('redraw', hideLoadingSpinner); // Try-catch wrapped
```

## Custom Event Handling

```typescript
// Custom mouse wheel handling
this.timelineRef.current.addEventListener('wheel', this.handleMouseWheel, { passive: false });

private handleMouseWheel = (event: WheelEvent): void => {
  if (event.ctrlKey) {
    // Allow zoom when Ctrl is pressed
    return;
  }
  
  // Prevent default zoom, allow horizontal scroll
  event.preventDefault();
  
  if (this.state.timeline) {
    const range = this.state.timeline.getWindow();
    const interval = range.end.getTime() - range.start.getTime();
    const step = interval * 0.1;
    
    if (event.deltaY < 0) {
      // Scroll up - move timeline left
      const newStart = new Date(range.start.getTime() - step);
      const newEnd = new Date(range.end.getTime() - step);
      this.state.timeline.setWindow(newStart, newEnd, { animation: false });
    } else {
      // Scroll down - move timeline right
      const newStart = new Date(range.start.getTime() + step);
      const newEnd = new Date(range.end.getTime() + step);
      this.state.timeline.setWindow(newStart, newEnd, { animation: false });
    }
  }
};
```

## CSS Styling Approach

### Container Styles (TimelineView.module.scss)
```scss
.timelineContainer {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  position: relative;
  overflow: hidden; // Let vis.js handle internal scrolling
}

.timeline {
  flex: 1;
  width: 100%;
  height: 100%;
  min-height: 500px;
  border: 1px solid $ms-color-neutralLight;
  background-color: $ms-color-white;
  transition: opacity 0.3s ease-in-out;
}
```

### Global vis-timeline Overrides
```scss
:global {
  .vis-timeline {
    font-family: $ms-font-family-fallbacks;
    font-size: 14px;
  }

  // Remove default vis.js scrollbars
  .vis-panel.vis-center,
  .vis-panel.vis-left,
  .vis-panel.vis-right {
    overflow: hidden !important;
  }

  // Custom status indicators
  .vis-item .vis-dot {
    border-radius: 2.5px !important;
    width: 4px !important;
    height: 32px !important;
    border-width: 0 !important;
  }

  // Status-based coloring
  .vis-item.status-confirmed .vis-dot { background-color: #107C10 !important; }
  .vis-item.status-tentative .vis-dot { background-color: #FBC02D !important; }
  .vis-item.status-canceled .vis-dot { background-color: #D32F2F !important; }
}
```

## Data Management

### DataSet Initialization
```typescript
constructor(props: ITimelineViewProps) {
  super(props);
  this.items = new DataSet([]);
  this.groups = new DataSet([]);
}
```

### Data Updates
```typescript
private updateTimelineData = (): void => {
  const timelineItems = this.props.events.map(event => ({
    id: event.id,
    content: event.title,
    start: event.start,
    end: event.end,
    group: event.swimlane, // Event Category
    className: `status-${event.status.toLowerCase().replace(/\s+/g, '')}`
  }));

  this.items.clear();
  this.items.add(timelineItems);

  // Auto-fit window
  if (timelineItems.length > 0) {
    const startDates = timelineItems.map(item => item.start);
    const minDate = new Date(Math.min(...startDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...startDates.map(d => d.getTime())));
    
    const padding = 7 * 24 * 60 * 60 * 1000; // 7 days
    const windowStart = new Date(minDate.getTime() - padding);
    const windowEnd = new Date(maxDate.getTime() + padding);
    
    this.state.timeline.setWindow(windowStart, windowEnd, { animation: false });
  }
};
```

## Component Lifecycle

```typescript
componentDidMount(): void {
  this.initializeTimeline();
  if (this.timelineRef.current) {
    this.timelineRef.current.addEventListener('wheel', this.handleMouseWheel, { passive: false });
  }
}

componentDidUpdate(prevProps: ITimelineViewProps): void {
  if (prevProps.events !== this.props.events) {
    this.setState({ isLoading: true }, () => {
      this.updateTimelineData();
    });
  }
}

componentWillUnmount(): void {
  if (this.timelineRef.current) {
    this.timelineRef.current.removeEventListener('wheel', this.handleMouseWheel);
  }
  if (this.state.timeline) {
    this.state.timeline.destroy();
  }
}
```

## Known Issues

1. **Site Page Problems**: Works in workbench/web part pages, fails on site pages
2. **Development Build Warning**: Persists even with --ship builds
3. **Storage Quota Errors**: QuotaExceededError on site pages
4. **Missing Admin Buttons**: Permission issues on site pages
5. **CSS Conflicts**: Heavy global overrides may conflict with site page styles

## Questions for Comparison

When analyzing other working projects, compare:
1. **Package versions** - Different vis-timeline/vis-data versions?
2. **Import method** - Using different import paths?
3. **CSS handling** - How are vis-timeline styles managed?
4. **Container setup** - Different DOM container approach?
5. **Event handling** - Different event listener patterns?
6. **SharePoint integration** - Special site page considerations?
7. **Build configuration** - Different webpack/build settings?

## Timeline Features

### Event Display
- Events appear as points on the timeline with status-based colors and event category icons
- Event titles display to the right of the status indicator with FluentUI icons and category abbreviations
- Hover tooltips show full event details
- Click events to open the event modal

### Dynamic Group Management
- Timeline groups (rows) are dynamically shown/hidden based on Event Category filter selections
- When an event category is unchecked, the entire row disappears from the timeline
- **Dynamic Height Adjustment**: Timeline automatically resizes to fit visible groups, eliminating white space
- **Smart Height Recalculation**: Height adjusts when zooming/panning to optimize space usage
- This provides a cleaner view compared to showing empty rows
- Groups are managed using vis-timeline's built-in DataSet functionality
- Smooth transitions when groups are added/removed (0.3s ease-in-out)
- Prevents wasted white space at bottom when content changes due to zoom/pan operations

### Event Content Structure
Events now display with Unicode emoji icons as the primary visual indicator (no abbreviation tags):

```html
<span class="timeline-event-content" style="display: inline-flex; align-items: center; font-family: 'Segoe UI', system-ui, sans-serif;">
  <span style="margin-right: 8px; font-size: 16px; flex-shrink: 0; display: inline-block; width: 18px; text-align: center;">✈️</span>
  <span style="font-size: 13px; line-height: 1.2; font-weight: 500;">Event Title</span>
</span>
```

**Icon Mapping:**
- Away w/RON → ✈️ Airplane
- Day Trip - NCR → 📍 Map Pin
- Exercise → 🏃 Running Person
- FYSA → ℹ️ Information
- Out of Office → 🚪 Door (Leave)
- Training Holiday → 🎓 Graduation Cap (Education)
- VIP/High Priority → ⚠️ Warning (Important)

**Enhanced Tooltips:**
Event tooltips now prominently display the Event Category name along with status and dates, providing clear context without visual clutter.

**Why Unicode Symbols:**
Unicode emoji symbols are used consistently across all views (Timeline, Calendar, Dropdowns, and Event Modal) to ensure reliable cross-browser display and a cohesive visual experience. These symbols display consistently without requiring additional font loading and are universally recognizable.

### Group Visibility Implementation
```typescript
private updateGroupsVisibility = (): void => {
  if (!this.state.timeline) return;

  // Create groups array with only selected categories
  const visibleGroups = allEventCategories
    .filter(category => this.props.selectedEventCategories.has(category))
    .map(category => ({
      id: category,
      content: category,
      className: `eventcategory-${category.toLowerCase().replace(/[^a-z0-9]/g, '')}`
    }));

  // Update the groups dataset
  this.groups.clear();
  this.groups.add(visibleGroups);

  // Calculate dynamic height based on number of visible groups
  this.updateTimelineHeight(visibleGroups.length);

  // Force timeline redraw to reflect group changes
  this.state.timeline.redraw();
};

private updateTimelineHeight = (visibleGroupCount: number): void => {
  if (!this.state.timeline) return;

  // Calculate height: Base (120px) + Per group (80px)
  // Min: 200px, Max: 770px
  const baseHeight = 120;
  const heightPerGroup = 80;
  const calculatedHeight = Math.max(200,
    Math.min(770, baseHeight + (visibleGroupCount * heightPerGroup)));

  this.state.timeline.setOptions({ height: `${calculatedHeight}px` });
};

// Smart height recalculation for zoom/pan operations
private recalculateTimelineHeight = (): void => {
  setTimeout(() => {
    const visItemsContainer = this.timelineRef.current?.querySelector('.vis-itemset');
    if (visItemsContainer) {
      const contentHeight = (visItemsContainer as HTMLElement).scrollHeight;
      const optimalHeight = Math.max(200,
        Math.min(770, contentHeight + 120)); // 120px for controls/padding

      if (Math.abs(optimalHeight - this.state.currentHeight) > 20) {
        this.state.timeline?.setOptions({ height: `${optimalHeight}px` });
        this.setState({ currentHeight: optimalHeight });
      }
    }
  }, 100);
};
```
