# Vis.js Timeline Implementation Guide
## Event Title Text to the Right of Event Icons

This guide provides complete instructions for implementing a vis.js timeline where event title text displays to the right of event icons, based on the ProgramTracker project implementation.

## 1. Timeline Configuration (JavaScript/TypeScript)

### Key Timeline Options
```typescript
const options = {
  // Height and layout
  height: '770px',
  autoResize: true,
  
  // Enable stacking to prevent overlapping
  stack: true,
  stackSubgroups: true,
  
  // Control item stacking order
  order: function(a, b) {
    return a.start - b.start; // Stack by date (earlier dates at the top)
  },
  
  // Critical spacing settings for text positioning
  margin: {
    item: {
      horizontal: 10,  // Space between items horizontally
      vertical: 15     // Space between items vertically
    },
    axis: 5
  },
  
  // Disable clustering to maintain individual items
  cluster: false,
  
  // Position date labels above timeline
  orientation: {
    axis: 'top',    // Time axis at the top
    item: 'bottom'  // Items at the bottom
  },
  
  // Enable grid and current time
  showMajorLabels: true,
  showMinorLabels: true,
  showCurrentTime: true,
  
  // Interaction settings
  zoomable: true,
  zoomKey: 'ctrlKey',
  moveable: true,
  selectable: true,
  
  // Scrolling behavior
  verticalScroll: true,
  horizontalScroll: true
};
```

## 2. Timeline Item Structure

### Item Configuration
```typescript
interface TimelineItem {
  id: number;
  content: string;  // This is the text that appears to the right of the icon
  start: Date;
  group?: string;   // For grouping items
  className: string; // For custom styling
  type: 'point'     // Use 'point' type for icon + text layout
}

// Example item creation:
const timelineItem = {
  id: event.ID,
  content: `${programName}: ${event.EventTitle}`, // Text to the right of icon
  start: eventDate,
  group: organizationGroup,
  className: 'status-green', // Custom CSS class
  type: 'point' // This is crucial for icon + text layout
};
```

## 3. Critical CSS Styling

### Essential SCSS/CSS for text positioning
```scss
:global {
  // Replace vis-dot with custom icon (rectangle/status indicator)
  .vis-item .vis-dot {
    border-radius: 2.5px !important;
    width: 4px !important;
    height: 32px !important;
    border-width: 0 !important;
  }
  
  // Status-specific dot colors (customize as needed)
  .vis-item.status-green .vis-dot {
    background: linear-gradient(to bottom, #4caf50, #2e7d32 50%, #4caf50) !important;
    border: 1px solid #1b5e20 !important;
  }
  
  .vis-item.status-amber .vis-dot {
    background: linear-gradient(to bottom, #ffeb3b, #ffd700) !important;
    border: 1px solid #ffc107 !important;
  }
  
  .vis-item.status-red .vis-dot {
    background: linear-gradient(to bottom, #ff4d4d, #cc0000) !important;
    border: 1px solid #990000 !important;
  }
  
  // Style the text content (appears to the right of the dot)
  .vis-item .vis-item-content {
    font-weight: 600 !important;
    font-size: 14px !important;
  }
  
  // Add cursor pointer and hover effects
  .vis-item {
    cursor: pointer !important;
  }
  
  .vis-item:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3) !important;
    z-index: 10 !important;
  }
  
  // Group labels styling
  .vis-labelset .vis-label {
    font-weight: 600 !important;
    font-size: 16px !important;
  }
  
  // Date labels styling
  .vis-time-axis .vis-text {
    font-weight: 600 !important;
    font-size: 16px !important;
  }
}
```

## 4. Timeline Initialization

### Complete initialization code
```typescript
import { Timeline, DataSet } from 'vis-timeline/standalone';

// Create groups (optional, for organizing items)
const groups = new DataSet([
  { id: 'group1', content: 'Organization 1' },
  { id: 'group2', content: 'Organization 2' }
]);

// Create items with content that appears to the right of icons
const items = new DataSet([
  {
    id: 1,
    content: 'Project Alpha: Milestone 1', // This text appears to the right
    start: new Date('2024-01-15'),
    group: 'group1',
    className: 'status-green',
    type: 'point'
  },
  {
    id: 2,
    content: 'Project Beta: Review Meeting',
    start: new Date('2024-01-20'),
    group: 'group2',
    className: 'status-amber',
    type: 'point'
  }
]);

// Initialize timeline
const timeline = new Timeline(
  document.getElementById('timeline-container'),
  items,
  groups,
  options
);
```

## 5. TypeScript Declarations

### vis-timeline type definitions
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

## 6. Key Points for Success

1. **Use `type: 'point'`** - This is crucial for the icon + text layout
2. **Set proper margins** - The `margin.item.horizontal` and `margin.item.vertical` control spacing
3. **Disable clustering** - Set `cluster: false` to maintain individual items
4. **Custom dot styling** - Use CSS to style `.vis-dot` for your icon appearance
5. **Content property** - The `content` field is what appears as text to the right of the icon
6. **Stacking enabled** - Use `stack: true` to prevent overlapping when items are close together

## 7. Common Issues and Solutions

- **Text not appearing**: Ensure `type: 'point'` is set on timeline items
- **Text overlapping**: Adjust `margin.item.horizontal` value
- **Icons not styled**: Make sure CSS targets `.vis-item .vis-dot` with `!important`
- **Poor spacing**: Increase `margin.item.vertical` for better vertical separation
- **Items clustering**: Set `cluster: false` in timeline options
- **Wrong orientation**: Use `orientation: { axis: 'top', item: 'bottom' }`

## 8. Additional Features

### Event Handlers
```typescript
// Add click event handler
timeline.on('select', (properties) => {
  console.log('Selected item:', properties.items);
});

// Add hover event handlers
timeline.on('itemover', (properties) => {
  console.log('Mouse over item:', properties.item);
});

timeline.on('itemout', (properties) => {
  console.log('Mouse out of item:', properties.item);
});
```

### Dynamic Updates
```typescript
// Update timeline data
const newItems = new DataSet(updatedItemsArray);
timeline.setItems(newItems);

// Redraw timeline
timeline.redraw();
```

This configuration will give you a timeline where each event shows as a colored status indicator (icon) with the event title text displayed to the right of it, exactly like in the ProgramTracker project.
