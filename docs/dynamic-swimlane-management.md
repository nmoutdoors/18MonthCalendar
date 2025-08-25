# Dynamic Swimlane Management System

## Overview

The Dynamic Swimlane Management System allows BigCal to automatically discover new swimlanes (Event Categories) from the SharePoint Events list and manage their color/icon configurations through the Legend Studio interface. This eliminates the need for hardcoded swimlane lists and provides a seamless user experience for adding new event categories.

## User Experience Flow

### 1. Adding a New Swimlane
1. **SharePoint Admin** adds new choice to Events list Swimlane field (e.g., "Testing")
2. **User** opens Legend Studio from BigCal toolbar
3. **System** detects missing swimlane and shows refresh modal:
   ```
   Swimlanes Need Refresh
   Legend Studio detected 1 swimlane that is not configured in BigCalConfig.
   Would you like to automatically refresh the swimlanes configuration?
   ```
4. **User** clicks "Refresh Swimlanes"
5. **System** adds new swimlane to BigCalConfig with default color/icon
6. **Legend Studio** automatically reopens with new swimlane highlighted as "NEW"
7. **User** can immediately assign custom colors/icons to the new swimlane

### 2. Using New Swimlanes
1. **Event Creation/Edit**: New swimlane appears in Event Category dropdown
2. **Event Filtering**: New swimlane appears in Event Category filter dropdown
3. **Visual Display**: Events display with assigned colors/icons from Legend Studio

## Technical Architecture

### Core Components

#### 1. ColorMappingService (`src/services/ColorMappingService.ts`)
**Purpose**: Handles discovery, caching, and management of field options and color mappings

**Key Methods**:
- `discoverFieldOptions(listName)`: Discovers all Swimlane and Status choices from SharePoint list
- `getColorMappings(forceRefresh)`: Retrieves color mappings from BigCalConfig with caching
- `cleanupOrphanedSwimlanes(listName)`: Removes BigCalConfig entries for deleted swimlanes
- `generateDefaultMappings(options)`: Creates default color/icon assignments for new swimlanes
- `saveBulkColorMappings(mappings)`: Saves multiple color mappings to BigCalConfig

**Discovery Logic**:
```typescript
// Get field choices from SharePoint
const swimlaneField = await this.sp.web.lists.getByTitle(eventsListName)
  .fields.getByInternalNameOrTitle('Swimlane')();

// Compare with existing BigCalConfig entries
const existingMappings = await this.getColorMappings();
const isNewlyDiscovered = !existingMapping;
```

#### 2. BigCal Component (`src/components/BigCal.tsx`)
**Purpose**: Main component that orchestrates swimlane discovery and UI updates

**Key Methods**:
- `loadAvailableSwimlanes()`: Loads dynamic swimlanes and updates filter selections
- `openColorPaletteStudio()`: Opens Legend Studio with missing swimlane detection
- `openColorPaletteStudioWithCacheRefresh()`: Opens Legend Studio with forced cache refresh
- `getEventCategoryDropdownOptions()`: Generates filter dropdown options from dynamic swimlanes
- `handleSwimlanesRefreshComplete()`: Handles post-refresh operations

**Detection Logic**:
```typescript
// Check for missing swimlanes (no BigCalConfig entry)
const missingSwimlanesCount = discoveredOptions.filter(option =>
  option.fieldName === 'Swimlanes' &&
  !option.hasColorMapping && // Key: Check for BigCalConfig entry, not discovery status
  option.optionValue !== 'Private Events'
).length;
```

#### 3. SwimlanesRefreshModal (`src/components/SwimlanesRefreshModal.tsx`)
**Purpose**: Handles the refresh operation with user feedback

**Refresh Process**:
1. Clean up orphaned swimlanes
2. Discover new field options
3. Generate default mappings for new swimlanes
4. Save mappings to BigCalConfig
5. Provide user feedback
6. Auto-close and trigger Legend Studio reopening

#### 4. Legend Studio Integration
**Purpose**: Provides visual interface for color/icon management

**Features**:
- Highlights newly added swimlanes with "NEW" badge
- Allows immediate color/icon customization
- Integrates with refresh modal for seamless workflow

## Data Flow

### 1. Initial Load
```
BigCal.componentDidMount()
├── loadAvailableSwimlanes()
│   ├── ColorMappingService.discoverFieldOptions()
│   ├── Update state.availableSwimlanes
│   └── Auto-select new swimlanes in filters
├── loadColorPaletteMappings()
└── loadEvents()
```

### 2. Legend Studio Opening
```
BigCal.openColorPaletteStudio()
├── ColorMappingService.discoverFieldOptions()
├── ColorMappingService.getColorMappings()
├── Check for missing swimlanes (!hasColorMapping)
├── If missing: Show SwimlanesRefreshModal
└── Else: Show Legend Studio
```

### 3. Refresh Operation
```
SwimlanesRefreshModal.handleRefresh()
├── ColorMappingService.cleanupOrphanedSwimlanes()
├── ColorMappingService.discoverFieldOptions()
├── ColorMappingService.generateDefaultMappings()
├── ColorMappingService.saveBulkColorMappings()
├── Show success message
├── Auto-close modal
└── BigCal.handleSwimlanesRefreshComplete()
    ├── loadAvailableSwimlanes() (with delay)
    └── openColorPaletteStudioWithCacheRefresh()
```

## Key Technical Decisions

### 1. Detection Logic: `!hasColorMapping` vs `isNewlyDiscovered`
**Problem**: Original logic used `isNewlyDiscovered` which included recently added items
**Solution**: Changed to `!hasColorMapping` to only detect truly missing BigCalConfig entries

### 2. Cache Management
**Problem**: Race conditions between refresh operations and cache updates
**Solution**: Added `openColorPaletteStudioWithCacheRefresh()` with forced cache refresh and timing delays

### 3. Dynamic vs Hardcoded Dropdowns
**Problem**: Event Category filter dropdown used hardcoded swimlane arrays
**Solution**: Updated to use `state.availableSwimlanes` with fallback to hardcoded arrays

### 4. Auto-Selection of New Swimlanes
**Decision**: Automatically add new swimlanes to filter selection
**Rationale**: Ensures users immediately see events from new categories

## Configuration

### BigCalConfig List Structure
Each swimlane mapping requires these fields:
- `ConfigType`: "ColorMapping"
- `FieldName`: "Swimlanes"
- `OptionValue`: The swimlane name (e.g., "Testing")
- `ColorHex`: Hex color code (e.g., "#17a2b8")
- `IconName`: Icon identifier (e.g., "TestBeaker")
- `IconSet`: Icon set name (e.g., "FluentUI")
- `UseDarkText`: Boolean for text contrast
- `SortOrder`: Display order

### Default Color Assignment
New swimlanes receive colors from a predefined palette:
```typescript
const defaultColors = [
  '#28a745', '#17a2b8', '#ffc107', '#dc3545', 
  '#6f42c1', '#fd7e14', '#20c997', '#6c757d'
];
```

## Error Handling

### Network Timeouts
All SharePoint operations use timeout wrappers:
```typescript
await withTimeout(
  sharePointOperation,
  NETWORK_TIMEOUTS.STANDARD,
  'Operation description'
);
```

### Fallback Mechanisms
- **Discovery Failure**: Falls back to hardcoded swimlane list
- **Cache Issues**: Provides fallback color mappings
- **Refresh Errors**: Shows error messages with retry options

## Performance Considerations

### Caching Strategy
- **Color Mappings**: Cached for 5 minutes with force refresh option
- **Field Discovery**: No caching (always fresh from SharePoint)
- **Recently Created Detection**: 5-minute window for highlighting

### Lazy Loading
- Legend Studio loads on-demand
- Color mappings loaded during component initialization
- Field discovery only when needed

## Future Enhancements

### Potential Improvements
1. **Bulk Import**: Support for importing multiple swimlanes from CSV/Excel
2. **Templates**: Predefined color/icon templates for common swimlane types
3. **Validation**: Prevent duplicate swimlane names
4. **History**: Track changes to swimlane configurations
5. **Permissions**: Role-based access to swimlane management

### Migration Considerations
- Existing hardcoded swimlanes automatically migrated to BigCalConfig
- Backward compatibility maintained through fallback mechanisms
- Gradual rollout possible through feature flags

## Troubleshooting

### Common Issues

#### 1. Refresh Modal Keeps Appearing
**Symptoms**: Modal shows even after successful refresh
**Cause**: Detection logic using wrong criteria
**Solution**: Ensure detection uses `!hasColorMapping` not `isNewlyDiscovered`

#### 2. New Swimlanes Not in Filter Dropdown
**Symptoms**: New swimlanes missing from Event Category filter
**Cause**: Dropdown using hardcoded arrays instead of dynamic data
**Solution**: Update dropdown to use `state.availableSwimlanes`

#### 3. Cache Issues After Refresh
**Symptoms**: Legend Studio shows stale data after refresh
**Cause**: Cache not invalidated properly
**Solution**: Use `openColorPaletteStudioWithCacheRefresh()` with forced refresh

#### 4. Timing Issues
**Symptoms**: Inconsistent behavior, race conditions
**Cause**: SharePoint consistency delays
**Solution**: Add 500ms delay in `handleSwimlanesRefreshComplete()`

### Debug Information
Enable debug logging to trace swimlane operations:
```typescript
Logger.debug('Loaded available swimlanes', {
  count: swimlanes.length,
  swimlanes
});
```

## Implementation Checklist

### Phase 1: Core Infrastructure
- [ ] ColorMappingService with discovery methods
- [ ] BigCalConfig list structure
- [ ] Basic caching mechanism
- [ ] Error handling and timeouts

### Phase 2: UI Integration
- [ ] SwimlanesRefreshModal component
- [ ] Legend Studio integration
- [ ] Dynamic dropdown updates
- [ ] User feedback mechanisms

### Phase 3: Polish & Optimization
- [ ] Cache invalidation strategies
- [ ] Performance optimizations
- [ ] Comprehensive error handling
- [ ] Documentation and testing

### Phase 4: Advanced Features
- [ ] Bulk operations
- [ ] Import/export capabilities
- [ ] Advanced validation
- [ ] Audit trail

## Code Examples

### Adding a New Swimlane Programmatically
```typescript
const colorMappingService = new ColorMappingService(context);

// Discover current options
const options = await colorMappingService.discoverFieldOptions('Events');

// Create new mapping
const newMapping: IColorMapping = {
  configType: 'ColorMapping',
  fieldName: 'Swimlanes',
  optionValue: 'New Category',
  colorHex: '#28a745',
  iconName: 'Add',
  iconSet: 'FluentUI',
  useDarkText: false,
  sortOrder: 100
};

// Save to BigCalConfig
await colorMappingService.saveBulkColorMappings([newMapping]);
```

### Custom Detection Logic
```typescript
// Check for specific swimlane
const hasTestingSwimLane = discoveredOptions.some(option =>
  option.fieldName === 'Swimlanes' &&
  option.optionValue === 'Testing' &&
  option.hasColorMapping
);
```

### Manual Cache Refresh
```typescript
// Force refresh color mappings cache
const freshMappings = await colorMappingService.getColorMappings(true);
```

This comprehensive system provides a robust, user-friendly way to manage dynamic swimlanes in BigCal while maintaining performance and reliability.
