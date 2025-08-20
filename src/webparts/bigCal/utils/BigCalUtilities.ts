/**
 * Pure utility functions for BigCal component
 * These functions have no dependencies on component state or props
 */

/**
 * Format a date as "MMM YYYY" (e.g., "Aug 2025")
 */
export const formatMonthYear = (date: Date): string => {
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};

/**
 * Get contrast color (black or white) for a given background color
 */
export const getContrastColor = (hexColor: string): string => {
  // Convert hex to RGB
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);

  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Return black for light backgrounds, white for dark backgrounds
  return luminance > 0.5 ? '#000000' : '#ffffff';
};

/**
 * Get emoji icon for event category/swimlane
 */
export const getEventCategoryIcon = (eventCategory: string): string => {
  // Return Unicode emoji symbols for consistent display across all views
  switch (eventCategory) {
    case 'DCDC':
      return '🏢'; // Office building
    case 'DISA':
      return '🔒'; // Lock (security)
    case 'DOD CIO / NSA / USCC':
      return '🛡️'; // Shield
    case 'Exec Time':
      return '👔'; // Necktie (executive)
    case 'Exercises':
      return '🎯'; // Direct hit (training)
    case 'FYSA':
      return '📋'; // Clipboard
    case 'Joint DISA & DCDC':
      return '🤝'; // Handshake
    case 'Mission Partner':
      return '🌐'; // Globe with meridians
    case 'Out of Office':
      return '🏠'; // House
    case 'Speaking Event':
      return '🎤'; // Microphone
    case 'TDY Meetings/Congressional':
      return '🏛️'; // Classical building
    case 'Transit':
      return '🚌'; // Bus
    default:
      return '📅'; // Calendar (default)
  }
};
