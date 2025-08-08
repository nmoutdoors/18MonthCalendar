# Vis.js Timeline Zoom, Scroll & Mouse Interactions Guide
## Complete Configuration for Optimal User Experience

This guide provides the exact zoom, scroll, and mouse interaction settings from the ProgramTracker project that were fine-tuned for optimal user experience.

## 1. Core Timeline Interaction Options

### Essential Timeline Configuration
```typescript
const options = {
  // Height and layout
  height: '770px',
  autoResize: true,
  
  // Critical interaction settings
  zoomable: true,              // Enable zoom functionality
  zoomKey: 'ctrlKey',         // Require Ctrl key for zoom (prevents accidental zoom)
  moveable: true,             // Enable horizontal panning/scrolling
  selectable: true,           // Enable item selection
  
  // Scrolling behavior - these are crucial
  verticalScroll: true,       // Enable vertical scrolling within timeline
  horizontalScroll: true,     // Enable horizontal scrolling
  
  // Prevent overlapping and improve interaction
  stack: true,                // Stack overlapping items
  stackSubgroups: true,       // Stack within subgroups
  cluster: false,             // Disable clustering for better interaction
  
  // Initial view window
  start: startDate,           // Initial start date
  end: endDate,               // Initial end date
  
  // Grid and labels for better navigation
  showMajorLabels: true,      // Show major time labels
  showMinorLabels: true,      // Show minor time labels
  showCurrentTime: true,      // Show current time indicator
  
  // Spacing for better mouse targeting
  margin: {
    item: {
      horizontal: 10,         // Space between items horizontally
      vertical: 15           // Space between items vertically
    },
    axis: 5                  // Space around time axis
  },
  
  // Orientation for better interaction
  orientation: {
    axis: 'top',             // Time axis at top
    item: 'bottom'           // Items at bottom
  }
};
```

## 2. Custom Mouse Wheel Handler

### Advanced Mouse Wheel Control
```typescript
// Custom mouse wheel handler for better scroll behavior
private handleMouseWheel = (event: WheelEvent): void => {
  // If Ctrl key is pressed, allow default behavior (zoom)
  if (event.ctrlKey) {
    return; // Let vis.js handle zoom
  }
  
  // Otherwise, prevent default zoom and handle horizontal scrolling
  event.preventDefault();
  
  if (this.timeline) {
    const timeline = this.timeline as Timeline & { 
      getWindow: () => { start: Date; end: Date }; 
      setWindow: (start: Date, end: Date, options?: { animation: boolean }) => void;
    };
    
    const current = timeline.getWindow();
    const delta = event.deltaY * 0.05; // Adjust scrolling speed (fine-tuned value)
    
    // Calculate new time window
    const newStart = new Date(current.start.valueOf() + delta);
    const newEnd = new Date(current.end.valueOf() + delta);
    
    // Apply new window without animation for smooth scrolling
    timeline.setWindow(newStart, newEnd, { animation: false });
  }
};

// Add event listener in componentDidMount
public componentDidMount(): void {
  // ... other initialization code ...
  
  // Add custom mouse wheel handling
  if (this.timelineContainer.current) {
    this.timelineContainer.current.addEventListener('wheel', this.handleMouseWheel, { passive: false });
  }
}

// Remove event listener in componentWillUnmount
public componentWillUnmount(): void {
  // Remove custom mouse wheel event handling
  if (this.timelineContainer.current) {
    this.timelineContainer.current.removeEventListener('wheel', this.handleMouseWheel);
  }
}
```

## 3. Critical CSS for Scroll Behavior

### Container and Overflow Settings
```scss
:global {
  // Remove default vis.js scrollbars for custom control
  .vis-panel.vis-center,
  .vis-panel.vis-left,
  .vis-panel.vis-right {
    overflow: hidden !important;
  }

  .vis-panel.vis-center,
  .vis-panel {
    overflow: hidden !important;
  }
  
  // Enable scrolling on the main page (important for SharePoint)
  body, html {
    overflow-y: auto !important;
  }
  
  // Make sure SharePoint containers allow scrolling
  #workbenchPageContent,
  .SPCanvas,
  .CanvasZone,
  .ControlZone {
    overflow-y: auto !important;
    max-height: none !important;
  }
}

// Timeline container styling
.visSpfx {
  overflow-x: hidden;           // Remove horizontal scrolling from container
  overflow-y: hidden;           // Remove vertical scrolling from container
  padding: 0;
  width: 80%;                   // Responsive width
  margin: 0 auto;               // Center the timeline
  height: auto;
  min-height: 400px;
  max-height: 800px;
  position: relative;
}

.timelineContainer {
  width: 100%;
  height: calc(100% - 50px);    // Account for legend height
  margin: 0 auto;
  overflow: hidden;             // Let vis.js handle internal scrolling
}
```

## 4. Event Handlers for Enhanced Interaction

### Mouse and Selection Event Handlers
```typescript
// Initialize timeline with event handlers
this.timeline = new Timeline(container, items, groups, options);

// Click/selection handler
this.timeline.on('select', (properties: { items?: number[], event?: Event }) => {
  if (properties.items && properties.items.length) {
    const selectedId = properties.items[0];
    const selectedEvent = this.props.events.find(event => event.ID === selectedId);
    
    if (selectedEvent && this.props.onEventSelect) {
      this.props.onEventSelect(selectedEvent);
      
      // Deselect item to allow re-selection
      this.timeline.setSelection([]);
    }
  }
});

// Hover handlers for better user feedback
this.timeline.on('itemover', (properties: { item: number, event: Event }) => {
  const element = properties.event.target as HTMLElement;
  this.handleItemMouseOver(properties.item, element);
});

this.timeline.on('itemout', () => {
  this.handleItemMouseOut();
});

// Mouse over handler implementation
private handleItemMouseOver = (itemId: number, element: HTMLElement): void => {
  const event = this.props.events.find(e => e.ID === itemId);
  if (event) {
    this.setState({
      hoveredEvent: event,
      hoveredElement: element
    });
  }
}

private handleItemMouseOut = (): void => {
  this.setState({
    hoveredEvent: undefined,
    hoveredElement: undefined
  });
}
```

## 5. Dynamic Range Loading (Performance Optimization)

### Load Events Based on Visible Timeline Range
```typescript
// Listen for timeline range changes
window.addEventListener('timelineRangeChanged', this.handleTimelineRangeChange);

private handleTimelineRangeChange = (event: Event): void => {
  const customEvent = event as CustomEvent;
  if (customEvent.detail && customEvent.detail.start && customEvent.detail.end) {
    // Format dates for API
    const startDateStr = new Date(customEvent.detail.start).toISOString();
    const endDateStr = new Date(customEvent.detail.end).toISOString();
    
    // Request events for visible range only
    const loadEventsEvent = new CustomEvent('loadTimelineEvents', {
      detail: {
        dateRangeStart: startDateStr,
        dateRangeEnd: endDateStr
      }
    });
    
    window.dispatchEvent(loadEventsEvent);
  }
}
```

## 6. Key Interaction Behaviors

### What These Settings Achieve:

1. **Ctrl+Scroll = Zoom**: Users must hold Ctrl to zoom, preventing accidental zooming
2. **Regular Scroll = Horizontal Pan**: Mouse wheel scrolls horizontally through time
3. **Smooth Scrolling**: Custom delta calculation (0.05) provides smooth movement
4. **No Animation**: `animation: false` prevents laggy scroll behavior
5. **Vertical Scrolling**: Timeline can scroll vertically when items are stacked
6. **Click to Select**: Items are selectable and deselect automatically for re-selection
7. **Hover Effects**: Items show hover feedback and can trigger popovers

### Fine-tuned Values:
- **Scroll Speed**: `event.deltaY * 0.05` - tested for optimal feel
- **Margins**: `horizontal: 10, vertical: 15` - perfect for mouse targeting
- **Height**: `770px` - optimal for most screen sizes
- **Width**: `80%` - responsive and centered

## 7. TypeScript Declarations

### Extended Timeline Interface
```typescript
declare module 'vis-timeline/standalone' {
  export class Timeline {
    constructor(container: HTMLElement, items: any, options?: any);
    constructor(container: HTMLElement, items: any, groups: any, options?: any);
    on(event: string, callback: (properties: any) => void): void;
    setItems(items: any): void;
    setGroups(groups: any): void;
    setOptions(options: any): void;
    setSelection(ids: (string | number)[]): void;
    fit(): void;
    destroy(): void;
    redraw(): void;
    getWindow(): { start: Date; end: Date };
    setWindow(start: Date, end: Date, options?: { animation: boolean }): void;
  }
  
  export class DataSet {
    constructor(data?: any[]);
    add(data: any): void;
    update(data: any): void;
    remove(id: any): void;
    clear(): void;
  }
}
```

## 8. Common Issues and Solutions

### Interaction Problems:
- **Accidental zooming**: Set `zoomKey: 'ctrlKey'` to require Ctrl for zoom
- **Jerky scrolling**: Use `animation: false` in setWindow calls
- **Can't scroll horizontally**: Implement custom mouse wheel handler
- **Items not selectable**: Ensure `selectable: true` and proper event handlers
- **Scroll conflicts**: Set container `overflow: hidden` and let vis.js handle scrolling
- **Poor performance**: Implement range-based loading for large datasets

### SharePoint-specific Issues:
- **Page scroll conflicts**: Set body/html `overflow-y: auto !important`
- **Container height issues**: Use `calc(100% - 50px)` for timeline container
- **Z-index problems**: Set proper z-index values for overlays

This configuration provides the exact smooth, intuitive interaction experience from the ProgramTracker timeline.
