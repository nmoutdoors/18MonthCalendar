# vis.js Timeline Popover - Quick Implementation Guide

## 🎯 Core Concept
Bridge vis.js native events with React state to display popovers on timeline item hover.

**Flow**: `vis.js itemover` → `React setState` → `FluentUI Callout` → `vis.js itemout` → `hide popover`

## 📋 Implementation Checklist

### 1. Add State Properties
```typescript
interface ITimelineState {
  hoveredEvent: IEventItem | undefined;      // Event data for popover
  hoveredElement: HTMLElement | undefined;   // DOM target for positioning
  // ... other state
}

// Initialize in constructor
this.state = {
  hoveredEvent: undefined,
  hoveredElement: undefined,
  // ... other state
};
```

### 2. Register vis.js Event Handlers
```typescript
// In timeline initialization
this.timeline.on('itemover', (properties: { item: number, event: Event }) => {
  const element = properties.event.target as HTMLElement;
  this.handleItemMouseOver(properties.item, element);
});

this.timeline.on('itemout', () => {
  this.handleItemMouseOut();
});
```

### 3. Implement Event Handlers
```typescript
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

### 4. Add Popover Component to Render
```typescript
public render(): React.ReactElement {
  const { hoveredEvent, hoveredElement } = this.state;
  
  return (
    <div>
      <div ref={this.timelineContainer} />
      
      <TimelineEventPopover
        event={hoveredEvent}
        target={hoveredElement}
        isVisible={!!hoveredEvent && !!hoveredElement}
        onDismiss={this.handleItemMouseOut}
        context={this.props.context}
      />
    </div>
  );
}
```

### 5. Create Popover Component
```typescript
interface ITimelineEventPopoverProps {
  event: IEventItem;
  target: HTMLElement | null;
  isVisible: boolean;
  onDismiss: () => void;
  context?: WebPartContext;
}

export const TimelineEventPopover: React.FC<ITimelineEventPopoverProps> = (props) => {
  const { event, target, isVisible, onDismiss } = props;
  
  return (
    <Callout
      target={target}
      onDismiss={onDismiss}
      directionalHint={DirectionalHint.bottomCenter}
      isBeakVisible={true}
      beakWidth={10}
      calloutMaxWidth={580}
      preventDismissOnScroll={true}
      styles={{
        root: {
          backgroundColor: '#444',
          color: 'white',
          padding: '25px',
          borderRadius: '4px',
          boxShadow: '0 6px 12px rgba(0, 0, 0, 0.6)',
          zIndex: 1000,
          border: '1px solid #555'
        }
      }}
    >
      {/* Your popover content here */}
      <div>
        <h3>{event?.EventTitle}</h3>
        <p>{event?.Description}</p>
        {/* Add more content as needed */}
      </div>
    </Callout>
  );
};
```

## 🔑 Critical Implementation Details

### ID Mapping
- **vis.js timeline item**: `id` property (number)
- **Your event data**: `ID` property (number)
- **Lookup**: `this.props.events.find(e => e.ID === itemId)`

### Element Reference
- **Source**: `properties.event.target as HTMLElement`
- **Usage**: FluentUI Callout positioning target
- **Storage**: React state for re-renders

### Visibility Logic
```typescript
isVisible={!!hoveredEvent && !!hoveredElement}
```
Both event data AND DOM element must exist.

### Performance Pattern
- ✅ **Always render popover** (no conditional mounting)
- ✅ **Control visibility with props** (not conditional rendering)
- ✅ **No manual cleanup needed** (vis.js handles event listeners)

## 🚨 Common Pitfalls

### ❌ Wrong ID Mapping
```typescript
// DON'T: Assume ID formats match
const event = this.props.events.find(e => e.id === itemId);

// DO: Use correct property names
const event = this.props.events.find(e => e.ID === itemId);
```

### ❌ Missing Element Check
```typescript
// DON'T: Skip validation
this.setState({ hoveredEvent: event, hoveredElement: element });

// DO: Validate both exist
if (event && element) {
  this.setState({ hoveredEvent: event, hoveredElement: element });
}
```

### ❌ Conditional Popover Rendering
```typescript
// DON'T: Conditionally mount/unmount
{hoveredEvent && <TimelineEventPopover ... />}

// DO: Always render, control visibility
<TimelineEventPopover isVisible={!!hoveredEvent && !!hoveredElement} ... />
```

## 📦 Required Dependencies

```json
{
  "@fluentui/react": "^8.x.x",
  "vis-timeline": "^7.7.3"
}
```

## 🔧 TypeScript Declarations

```typescript
// Add to your types file
declare module 'vis-timeline/standalone' {
  export class Timeline {
    on(event: string, callback: (properties: any) => void): void;
    // ... other methods
  }
}
```

## 🎨 Styling Tips

### Popover Z-Index
```typescript
styles={{
  root: {
    zIndex: 1000,  // Above timeline but below SharePoint chrome
  }
}}
```

### Responsive Width
```typescript
calloutMaxWidth={580}
calloutMinWidth={453}
```

### Dark Theme Support
```typescript
styles={{
  root: {
    backgroundColor: isDarkMode ? '#444' : '#fff',
    color: isDarkMode ? 'white' : 'black',
  }
}}
```

## 🧪 Testing Checklist

- [ ] Popover appears on timeline item hover
- [ ] Popover disappears on mouse out
- [ ] Popover shows correct event data
- [ ] Popover positions correctly (not cut off)
- [ ] Multiple rapid hovers don't break state
- [ ] Popover works after timeline data updates
- [ ] No console errors on hover/unhover
- [ ] Popover dismisses on scroll (if desired)

## 🚀 Quick Start Template

```typescript
// 1. Add to state interface
hoveredEvent: IEventItem | undefined;
hoveredElement: HTMLElement | undefined;

// 2. Add to timeline initialization
this.timeline.on('itemover', (props: { item: number, event: Event }) => {
  const element = props.event.target as HTMLElement;
  const event = this.props.events.find(e => e.ID === props.item);
  if (event) this.setState({ hoveredEvent: event, hoveredElement: element });
});

this.timeline.on('itemout', () => {
  this.setState({ hoveredEvent: undefined, hoveredElement: undefined });
});

// 3. Add to render method
<Callout
  target={this.state.hoveredElement}
  isBeakVisible={true}
  directionalHint={DirectionalHint.bottomCenter}
  onDismiss={() => this.setState({ hoveredEvent: undefined, hoveredElement: undefined })}
>
  <div style={{ padding: '20px', backgroundColor: '#444', color: 'white' }}>
    <h3>{this.state.hoveredEvent?.EventTitle}</h3>
    <p>{this.state.hoveredEvent?.Description}</p>
  </div>
</Callout>
```

## 📚 Related Patterns

- **Card Popovers**: Similar pattern for card hover states
- **Timeline Selection**: Use `select` event for click actions
- **Multi-Timeline**: Same pattern works across multiple timeline instances
- **Custom Positioning**: Override `directionalHint` for different positions

This implementation provides rich contextual information without disrupting the timeline user experience.
