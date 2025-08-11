# ProgramTracker Full-Screen Implementation Guide

## Overview

This guide documents how ProgramTracker implements full-screen functionality in SharePoint Framework (SPFx) web parts. The implementation provides seamless toggling between normal and full-screen modes while maintaining SharePoint compatibility.

## 1. Architecture Overview

### Key Components
1. **WebPart Property**: `startInFullScreen` boolean property
2. **Component State**: `isFullScreen` state management
3. **CSS Classes**: `.fullScreenMode` for styling
4. **Service Layer**: `WebPartPropertyService` for DOM manipulation
5. **UI Controls**: Toggle button and property pane checkbox

### Flow Diagram
```
WebPart Property → Component State → CSS Classes → DOM Manipulation → Full-Screen Display
```

## 2. WebPart Property Configuration

### Property Interface
```typescript
export interface IProgramTrackerWebPartProps {
  description: string;
  startInFullScreen: boolean;  // Full-screen property
  biWeeklyScheduleUrl: string;
  metricsUrl: string;
  timelineDisplayMode: string;
  enableDetailedLogging: boolean;
}
```

### Property Pane Configuration
```typescript
protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration {
  return {
    pages: [{
      groups: [{
        groupName: strings.BasicGroupName,
        groupFields: [
          PropertyPaneCheckbox('startInFullScreen', {
            text: 'Start in full-screen mode',
            checked: true  // Default to full-screen
          }),
          // ... other fields
        ]
      }]
    }]
  };
}
```

### Default Value Initialization
```typescript
protected async onInit(): Promise<void> {
  // Set default value for startInFullScreen if not already set
  if (this.properties.startInFullScreen === undefined) {
    this.properties.startInFullScreen = true;
  }
  
  return this._getEnvironmentMessage().then(message => {
    this._environmentMessage = message;
  });
}
```

## 3. Component State Management

### State Interface
```typescript
interface IProgramTrackerState {
  isFullScreen: boolean;  // Full-screen state
  // ... other state properties
}
```

### State Initialization
```typescript
constructor(props: IProgramTrackerProps) {
  super(props);
  
  this.state = {
    isFullScreen: props.startInFullScreen || false,
    // ... other state initialization
  };
}
```

### Property Change Handling
```typescript
public componentDidUpdate(prevProps: IProgramTrackerProps, prevState: IProgramTrackerState): void {
  // Check if startInFullScreen prop has changed
  if (prevProps.startInFullScreen !== this.props.startInFullScreen) {
    // Update isFullScreen state and apply styles
    this.setState({ isFullScreen: this.props.startInFullScreen }, () => {
      this.propertyService.applyFullScreenStyles(this.props.startInFullScreen, `.${styles.programTracker}`);
    });
  }
}
```

## 4. CSS Implementation

### Base Container Class
```scss
.programTracker { 
  position: relative;
  display: flex;
  flex-direction: row;
  height: 100%;
  min-height: 600px;
  overflow-x: hidden;
  overflow-y: auto;
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  margin-top: 30px;  // Normal mode margin
}
```

### Full-Screen Mode Class
```scss
.fullScreenMode {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 100;           // Lower than SharePoint's toolbar (z-index: 1000+)
  margin-top: 0;          // Remove the top margin in fullscreen
  
  .leftColumn {
    position: fixed;
    z-index: 101;         // Ensure left column stays on top
  }
  
  .rightColumn {
    margin-left: 250px;   // Account for fixed left column
    
    @media (max-width: 768px) {
      margin-left: 200px;
    }
    
    @media (max-width: 480px) {
      margin-left: 180px;
    }
  }
}
```

### Dynamic Class Application
```typescript
public render(): React.ReactElement<IProgramTrackerProps> {
  const { isFullScreen } = this.state;
  
  // Apply fullscreen class conditionally
  const containerClassName = isFullScreen 
    ? `${styles.programTracker} ${styles.fullScreenMode}`
    : styles.programTracker;

  return (
    <div className={containerClassName}>
      {/* Component content */}
    </div>
  );
}
```

## 5. DOM Manipulation Service

### WebPartPropertyService Implementation
```typescript
export class WebPartPropertyService {
  /**
   * Applies fullscreen styles to the webpart
   * @param isFullScreen Whether to apply fullscreen styles
   * @param containerSelector CSS selector for the webpart container
   */
  public applyFullScreenStyles(isFullScreen: boolean, containerSelector: string): void {
    try {
      // Get our component element
      const programTracker = document.querySelector(containerSelector);
      if (!programTracker) return;
      
      // Get the webpart container (SharePoint-specific selectors)
      const webpartContainer = document.querySelector('[data-sp-feature-tag="ProgramTrackerWebPart"]') || 
                              document.querySelector('.ControlZone') ||
                              programTracker.closest('.ControlZone');
      
      if (webpartContainer) {
        if (isFullScreen) {
          // Apply full-screen styles to SharePoint container
          (webpartContainer as HTMLElement).style.position = 'fixed';
          (webpartContainer as HTMLElement).style.top = '0';
          (webpartContainer as HTMLElement).style.left = '0';
          (webpartContainer as HTMLElement).style.right = '0';
          (webpartContainer as HTMLElement).style.bottom = '0';
          (webpartContainer as HTMLElement).style.zIndex = '100';
          (webpartContainer as HTMLElement).style.height = '100vh';
          (webpartContainer as HTMLElement).style.width = '100vw';
          (webpartContainer as HTMLElement).style.maxWidth = '100vw';
          (webpartContainer as HTMLElement).style.padding = '0';
          (webpartContainer as HTMLElement).style.margin = '0';
        } else {
          // Reset to normal mode
          (webpartContainer as HTMLElement).style.position = '';
          (webpartContainer as HTMLElement).style.top = '';
          (webpartContainer as HTMLElement).style.left = '';
          (webpartContainer as HTMLElement).style.right = '';
          (webpartContainer as HTMLElement).style.bottom = '';
          (webpartContainer as HTMLElement).style.zIndex = '';
          (webpartContainer as HTMLElement).style.height = '';
          (webpartContainer as HTMLElement).style.width = '';
          (webpartContainer as HTMLElement).style.maxWidth = '';
          (webpartContainer as HTMLElement).style.padding = '';
          (webpartContainer as HTMLElement).style.margin = '';
          
          // Set minimum height for normal mode
          (programTracker as HTMLElement).style.minHeight = '600px';
        }
        
        // Force layout recalculation
        window.dispatchEvent(new Event('resize'));
      }
    } catch (error) {
      console.error('Error applying fullscreen styles:', error);
    }
  }
}
```

## 6. User Interface Controls

### Toggle Button Implementation
```typescript
// Full-screen toggle button in toolbar
<IconButton
  iconProps={{ iconName: this.state.isFullScreen ? 'BackToWindow' : 'FullScreen' }}
  title={this.state.isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
  onClick={this.toggleFullScreen}
  styles={{ root: { color: 'white' } }}
/>
```

### Toggle Function
```typescript
private toggleFullScreen = (): void => {
  this.setState(prevState => {
    const newIsFullScreen = !prevState.isFullScreen;
    // Apply styles immediately when state changes
    this.propertyService.applyFullScreenStyles(newIsFullScreen, `.${styles.programTracker}`);
    return { isFullScreen: newIsFullScreen };
  });
}
```

### Conditional UI Elements
```typescript
{/* WebPart Settings button - only show when NOT in fullscreen */}
{!isFullScreen && (
  <div style={{
    padding: '10px',
    display: 'flex',
    justifyContent: 'flex-end',
    backgroundColor: 'white',
    borderBottom: '1px solid #e0e0e0'
  }}>
    <DefaultButton
      text="WebPart Settings"
      onClick={this.openWebPartPropertyPane}
      styles={{
        root: {
          backgroundColor: darklyColors.secondary,
          color: 'white',
          padding: '6px 10px',
          height: 'auto'
        }
      }}
    />
  </div>
)}
```

## 7. Lifecycle Management

### Component Cleanup
```typescript
public componentWillUnmount(): void {
  // Remove full screen styles if needed
  if (this.state.isFullScreen) {
    this.propertyService.applyFullScreenStyles(false, `.${styles.programTracker}`);
  }

  // ... other cleanup
}
```

### Property Change Handling
```typescript
protected onPropertyPaneFieldChanged(propertyPath: string, oldValue: unknown, newValue: unknown): void {
  super.onPropertyPaneFieldChanged(propertyPath, oldValue, newValue);

  // Force a re-render when startInFullScreen changes
  if (propertyPath === 'startInFullScreen') {
    this.render();
  }
}
```

## 8. SharePoint Integration Considerations

### Z-Index Management
- **Full-screen mode**: `z-index: 100` (below SharePoint toolbar)
- **Left column**: `z-index: 101` (above main container)
- **SharePoint toolbar**: `z-index: 1000+` (always on top)

### Container Selectors
The service targets multiple SharePoint container types:
```typescript
const webpartContainer =
  document.querySelector('[data-sp-feature-tag="ProgramTrackerWebPart"]') ||
  document.querySelector('.ControlZone') ||
  programTracker.closest('.ControlZone');
```

### Layout Recalculation
```typescript
// Force SharePoint to recalculate layouts
window.dispatchEvent(new Event('resize'));
```

## 9. Responsive Design

### Media Queries in Full-Screen Mode
```scss
.fullScreenMode {
  .rightColumn {
    margin-left: 250px;   // Desktop

    @media (max-width: 768px) {
      margin-left: 200px; // Tablet
    }

    @media (max-width: 480px) {
      margin-left: 180px; // Mobile
    }
  }
}
```

## 10. Best Practices

### 1. State Synchronization
- Always sync WebPart property with component state
- Handle property changes in `componentDidUpdate`
- Apply DOM styles immediately after state changes

### 2. CSS Strategy
- Use CSS classes for styling, not inline styles
- Leverage CSS specificity with nested selectors
- Maintain responsive design in full-screen mode

### 3. SharePoint Compatibility
- Target SharePoint-specific container elements
- Respect SharePoint's z-index hierarchy
- Force layout recalculation after DOM changes

### 4. User Experience
- Provide clear visual indicators (icons)
- Hide irrelevant UI elements in full-screen mode
- Maintain functionality across both modes

### 5. Performance
- Use efficient DOM queries with fallbacks
- Minimize DOM manipulations
- Clean up styles on component unmount

## 11. Common Issues and Solutions

### Issue: Full-screen not working on site pages
**Solution**: Ensure proper SharePoint container targeting
```typescript
const webpartContainer = document.querySelector('.ControlZone') ||
                        programTracker.closest('.ControlZone');
```

### Issue: Content cut off in full-screen
**Solution**: Use viewport units and proper positioning
```scss
.fullScreenMode {
  height: 100vh;
  width: 100vw;
}
```

### Issue: SharePoint toolbar hidden
**Solution**: Use lower z-index than SharePoint's toolbar
```scss
.fullScreenMode {
  z-index: 100; /* Lower than SharePoint's 1000+ */
}
```

### Issue: Layout not updating
**Solution**: Force resize event after DOM changes
```typescript
window.dispatchEvent(new Event('resize'));
```

## 12. Implementation Checklist

- [ ] Add `startInFullScreen` property to WebPart interface
- [ ] Configure property pane checkbox
- [ ] Add `isFullScreen` to component state
- [ ] Create `.fullScreenMode` CSS class
- [ ] Implement `WebPartPropertyService.applyFullScreenStyles()`
- [ ] Add toggle button to UI
- [ ] Handle property changes in `componentDidUpdate`
- [ ] Clean up styles in `componentWillUnmount`
- [ ] Test on both web part pages and site pages
- [ ] Verify responsive behavior
- [ ] Ensure SharePoint toolbar remains accessible

This implementation provides a robust, SharePoint-compatible full-screen solution that works across different page types and screen sizes.
```
