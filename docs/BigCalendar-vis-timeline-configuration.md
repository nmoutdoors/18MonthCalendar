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
  .vis-item.status-ontrack .vis-dot { background-color: #0078d4 !important; }
  .vis-item.status-atrisk .vis-dot { background-color: #ff8c00 !important; }
  .vis-item.status-offtrack .vis-dot { background-color: #d13438 !important; }
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
    group: event.swimlane,
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
