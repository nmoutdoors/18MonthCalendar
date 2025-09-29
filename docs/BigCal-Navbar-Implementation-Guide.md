# BigCal Navbar Implementation Guide

This document outlines the navbar design patterns and implementation approach used in BigCal for consistent look and feel across projects.

## Overview

The BigCal navbar is a responsive, professional navigation bar that adapts gracefully across different screen sizes while maintaining functionality and visual appeal. It uses a three-section layout (left, center, right) with intelligent responsive behavior.

## Core Design Principles

### 1. **Three-Section Layout**
- **Left Section**: Primary actions and filters
- **Center Section**: Optional special features (icon selector, etc.)
- **Right Section**: View controls and secondary actions

### 2. **Responsive Philosophy**
- Graceful degradation from desktop to mobile
- Progressive space optimization through padding reduction
- Icon-only mode for space-constrained screens
- Intelligent wrapping on very small screens

### 3. **Visual Consistency**
- SharePoint theme integration (`var(--themePrimary, #0078d4)`)
- Consistent button sizing and hover states
- Professional shadow and spacing

## CSS Architecture

### Base Navbar Structure

```scss
.navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 8px 8px 8px;
  background-color: var(--themePrimary, #0078d4);
  color: white;
  height: 36px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  z-index: 1001;
  flex-wrap: wrap; // Allow wrapping on very small screens
  min-height: 36px; // Minimum height, can grow if wrapped
}
```

### Responsive Breakpoints Strategy

**Desktop (>1300px)**: Full spacing and padding
**Laptop (1100px-1300px)**: Reduced padding, maintained functionality
**Small Laptop (900px-1100px)**: Compact spacing, icon-only mode for some elements
**Tablet (768px-900px)**: Further compression
**Mobile (<768px)**: Wrapping layout, reorganized sections

### Section Layouts

#### Left Section
```scss
.navbarLeft {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0; // Allow shrinking
  gap: 6px; // Progressive reduction via media queries
}
```

#### Center Section
```scss
.navbarCenter {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin: 0 8px; // Progressive reduction via media queries
}
```

#### Right Section
```scss
.navbarRight {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0; // Don't shrink the buttons
}
```

## Button Design System

### Standard Navbar Button
```scss
.navbarButton {
  color: white !important;
  min-width: 32px;
  height: 32px;
  flex-shrink: 0; // Don't shrink buttons

  &:hover {
    background-color: rgba(255, 255, 255, 0.1) !important;
    color: white !important;
  }

  &:active {
    background-color: rgba(255, 255, 255, 0.2) !important;
    color: white !important;
  }

  &:focus {
    outline: 1px solid rgba(255, 255, 255, 0.6);
    outline-offset: 2px;
  }
}
```

### Active State
```scss
.activeButton {
  background-color: rgba(255, 255, 255, 0.2) !important;

  &:hover {
    background-color: rgba(255, 255, 255, 0.3) !important;
  }
}
```

### Responsive Button Sizing
Progressive size reduction maintains usability while optimizing space:

- **Desktop**: 32px × 32px
- **Small Laptop**: 30px × 30px  
- **Tablet**: 28px × 28px
- **Mobile**: 26px × 26px
- **Small Mobile**: 24px × 24px

## Advanced Responsive Patterns

### Icon-Only Mode
For space-constrained screens, text labels are hidden while maintaining icons:

```scss
@media (max-width: 1100px) {
  .ms-Pivot-text {
    display: none; // Hide text, show only icons
  }
}
```

### Mobile Layout Reorganization
On mobile, sections reorganize for optimal touch interaction:

```scss
@media (max-width: 768px) {
  .navbarCenter {
    width: 100%;
    margin: 4px 0;
    order: 3; // Place after left and right sections
  }
  
  .navbarRight {
    width: 100%;
    justify-content: space-between;
  }
}
```

## Dual Mode Support

### Configuration Mode (Non-Fullscreen)
```scss
.configNavbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background-color: #f3f2f1; // Light gray background
  border-bottom: 1px solid #edebe9;
  height: 44px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}
```

### Full Application Mode
Uses the primary theme color navbar with full functionality.

## Implementation Tips

### 1. **Theme Integration**
Always use CSS custom properties for theme colors:
```scss
background-color: var(--themePrimary, #0078d4);
```

### 2. **Z-Index Management**
Ensure navbar stays above content:
```scss
z-index: 1001; // Above most content
```

### 3. **Accessibility**
- Maintain focus outlines
- Use semantic button elements
- Provide meaningful titles/tooltips
- Ensure sufficient color contrast

### 4. **Performance Considerations**
- Use `flex-shrink: 0` on critical elements
- Minimize reflows with fixed heights where possible
- Use `transform` for animations instead of layout properties

## React/TypeScript Integration

### Button Pattern
```tsx
<IconButton
  iconProps={{ iconName: 'Search' }}
  title="Search events..."
  onClick={this.handleSearch}
  className={styles.navbarButton}
/>
```

### Conditional Rendering
```tsx
{!isFullscreen ? (
  <div className={styles.configNavbar}>
    {/* Configuration mode content */}
  </div>
) : (
  <div className={styles.navbar}>
    {/* Full application navbar */}
  </div>
)}
```

## Key Success Factors

1. **Progressive Enhancement**: Start with mobile-first approach
2. **Consistent Spacing**: Use systematic gap reduction across breakpoints
3. **Flexible Layout**: Allow wrapping and reorganization on small screens
4. **Theme Compliance**: Integrate with existing design systems
5. **Performance**: Minimize layout shifts and reflows
6. **Accessibility**: Maintain usability across all screen sizes

This implementation provides a professional, responsive navbar that maintains functionality and visual appeal across all device sizes while integrating seamlessly with SharePoint themes and design patterns.
