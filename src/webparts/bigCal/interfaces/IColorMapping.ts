/**
 * Interface for dynamic color mapping configuration
 */
export interface IColorMapping {
  id?: number;
  configType: 'ColorMapping';
  fieldName: 'Swimlanes' | 'Status';
  optionValue: string;
  colorHex: string;
  isActive: boolean;
  sortOrder: number;
  created?: Date;
  modified?: Date;
}

/**
 * Interface for discovered SharePoint field options
 */
export interface IFieldOption {
  fieldName: 'Swimlanes' | 'Status';
  optionValue: string;
  isNewlyDiscovered: boolean;
  hasColorMapping: boolean;
  currentColor?: string;
}

/**
 * Interface for color palette configuration
 */
export interface IColorPaletteConfig {
  swimlaneColors: Map<string, string>;
  statusColors: Map<string, string>;
  lastUpdated: Date;
  version: number;
}

/**
 * Interface for the Color Palette Studio modal state
 */
export interface IColorPaletteStudioState {
  isOpen: boolean;
  discoveredOptions: IFieldOption[];
  colorMappings: IColorMapping[];
  isLoading: boolean;
  hasUnsavedChanges: boolean;
  conflictResolutionMode: boolean;
  previewMode: boolean;
}

/**
 * Interface for color assignment operations
 */
export interface IColorAssignment {
  fieldName: 'Swimlanes' | 'Status';
  optionValue: string;
  oldColor?: string;
  newColor: string;
  operation: 'create' | 'update' | 'delete';
}

/**
 * Interface for bulk color operations
 */
export interface IBulkColorOperation {
  operationType: 'applyTheme' | 'resetDefaults' | 'clearAll';
  themeType?: 'warm' | 'cool' | 'corporate' | 'vibrant' | 'pastel';
  targetFields?: ('Swimlanes' | 'Status')[];
  assignments: IColorAssignment[];
}

/**
 * Interface for color theme presets
 */
export interface IColorTheme {
  name: string;
  description: string;
  colors: string[];
  category: 'warm' | 'cool' | 'corporate' | 'vibrant' | 'pastel';
}

/**
 * Default color themes for bulk operations
 */
export const DEFAULT_COLOR_THEMES: IColorTheme[] = [
  {
    name: 'BigCal Status Colors',
    description: 'Official status colors from user requirements',
    colors: ['#28a745', '#fd7e14', '#e83e8c', '#6f42c1', '#17a2b8'], // Green, Orange, Pink, Purple, Blue
    category: 'corporate'
  },
  {
    name: 'BigCal Swimlane Colors',
    description: 'Official swimlane colors from user requirements',
    colors: [
      '#17a2b8', // DISA - Teal/Cyan
      '#28a745', // DCDC - Green
      '#20c997', // Joint DISA & DCDC - Teal Green
      '#ffc107', // Speaking Engagement - Yellow
      '#fd7e14', // DOD CIO / NSA / USCC - Orange
      '#e83e8c', // Mission Partner - Pink
      '#6c757d', // Transit - Gray
      '#17a2b8', // TDY Meetings/Congressional - Teal
      '#6f42c1', // Exec Time - Purple
      '#dc3545', // VIP/High Priority - Red
      '#198754', // Away w/RON - Dark Green
      '#fd7e14', // Day Trip - NCR - Orange
      '#9c27b0', // Exercise - Purple
      '#0d6efd', // Out of Office - Blue
      '#6c757d', // Training Holiday - Gray
      '#20c997'  // FYSA - Teal Green
    ],
    category: 'vibrant'
  },
  {
    name: 'Corporate Blue',
    description: 'Professional blue tones',
    colors: ['#0078d4', '#106ebe', '#005a9e', '#004578', '#003966', '#002d52', '#00213d'],
    category: 'corporate'
  },
  {
    name: 'Warm Sunset',
    description: 'Warm oranges and reds',
    colors: ['#ff6b35', '#f7931e', '#ffb347', '#ff7f50', '#ff4500', '#dc143c', '#b22222'],
    category: 'warm'
  },
  {
    name: 'Cool Ocean',
    description: 'Cool blues and greens',
    colors: ['#20b2aa', '#4682b4', '#5f9ea0', '#6495ed', '#00ced1', '#48d1cc', '#40e0d0'],
    category: 'cool'
  },
  {
    name: 'Vibrant Rainbow',
    description: 'Bright, energetic colors',
    colors: ['#ff1744', '#ff9100', '#ffea00', '#00e676', '#00b0ff', '#651fff', '#e91e63'],
    category: 'vibrant'
  },
  {
    name: 'Soft Pastels',
    description: 'Gentle, muted tones',
    colors: ['#ffb3ba', '#ffdfba', '#ffffba', '#baffc9', '#bae1ff', '#d4baff', '#ffb3ff'],
    category: 'pastel'
  }
];

/**
 * Original hard-coded color mappings - preserved for restore functionality
 * Updated with current swimlanes only and new color strategy
 * Status colors: Confirmed/blank use swimlane color, only Tentative has its own color
 */
export const ORIGINAL_COLOR_MAPPINGS: { [key: string]: string } = {
  // Status colors - Tentative only, others (Confirmed/blank) inherit from swimlane
  'Tentative': '#ff00ff',        // Magenta/Pink (user provided)

  // Current swimlane colors (user hex codes + image inspection)
  'DCDC': '#70ad47',                    // Green (from image)
  'DISA': '#5b9bd5',                    // Light blue (from image)
  'DOD CIO / NSA / USCC': '#f28e3c',    // Orange (user provided)
  'Exec Time': '#7f7f7f',               // Gray (from image)
  'Exercises': '#7030a0',               // Purple (user provided)
  'FYSA': '#00b050',                    // Green (user provided)
  'Joint DISA & DCDC': '#5b9bd5',       // Light blue (same as DISA)
  'Mission Partner': '#ff5050',          // Red/Pink (user provided)
  'Out of Office': '#2f5597',           // Blue (user provided)
  'Speaking Event': '#ffff00',          // Yellow (user provided)
  'TDY Meetings/Congressional': '#70ad47', // Green (same as DCDC from image)
  'Transit': '#17a2b8'                  // Teal/Cyan (from image)
};

/**
 * Specific color mappings for known options based on user requirements
 * Updated with current swimlanes only and new color strategy
 * Status colors: Confirmed/blank inherit swimlane color, only Tentative has its own color
 */
export const SPECIFIC_COLOR_MAPPINGS: { [key: string]: string } = {
  // Status colors - only Tentative gets its own color
  'Tentative': '#ff00ff',        // Magenta/Pink (user provided)

  // Current swimlane colors (user hex codes + image inspection)
  'DCDC': '#70ad47',                    // Green (from image)
  'DISA': '#5b9bd5',                    // Light blue (from image)
  'DOD CIO / NSA / USCC': '#f28e3c',    // Orange (user provided)
  'Exec Time': '#7f7f7f',               // Gray (from image)
  'Exercises': '#7030a0',               // Purple (user provided)
  'FYSA': '#00b050',                    // Green (user provided)
  'Joint DISA & DCDC': '#5b9bd5',       // Light blue (same as DISA)
  'Mission Partner': '#ff5050',          // Red/Pink (user provided)
  'Out of Office': '#2f5597',           // Blue (user provided)
  'Speaking Event': '#ffff00',          // Yellow (user provided)
  'TDY Meetings/Congressional': '#70ad47', // Green (same as DCDC)
  'Transit': '#17a2b8'                  // Teal/Cyan (from image)
};

/**
 * Utility function to generate default colors for discovered options
 * Now uses specific color mappings when available
 */
export function generateDefaultColors(optionCount: number, themeType: 'corporate' | 'vibrant' = 'corporate'): string[] {
  let theme = DEFAULT_COLOR_THEMES[0]; // Default fallback
  for (let i = 0; i < DEFAULT_COLOR_THEMES.length; i++) {
    if (DEFAULT_COLOR_THEMES[i].category === themeType) {
      theme = DEFAULT_COLOR_THEMES[i];
      break;
    }
  }

  const colors: string[] = [];
  for (let i = 0; i < optionCount; i++) {
    colors.push(theme.colors[i % theme.colors.length]);
  }

  return colors;
}

/**
 * Generate colors for specific field options using predefined mappings
 */
export function generateColorsForOptions(options: string[], fieldType: 'Swimlanes' | 'Status'): { [optionValue: string]: string } {
  const colorMap: { [optionValue: string]: string } = {};

  // First, try to use specific mappings
  options.forEach(option => {
    if (SPECIFIC_COLOR_MAPPINGS[option]) {
      colorMap[option] = SPECIFIC_COLOR_MAPPINGS[option];
    }
  });

  // For any unmapped options, use theme colors
  const unmappedOptions = options.filter(option => !SPECIFIC_COLOR_MAPPINGS[option]);
  if (unmappedOptions.length > 0) {
    const themeType = fieldType === 'Status' ? 'corporate' : 'vibrant';
    const fallbackColors = generateDefaultColors(unmappedOptions.length, themeType);

    unmappedOptions.forEach((option, index) => {
      colorMap[option] = fallbackColors[index];
    });
  }

  return colorMap;
}
