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
 * Timeout wrapper for network operations to prevent hanging on slow networks
 * @param promise The promise to wrap with timeout
 * @param timeoutMs Timeout in milliseconds
 * @param operation Description of the operation for error messages
 * @returns Promise that resolves with the original result or rejects with timeout error
 */
export const withTimeout = <T>(
  promise: Promise<T>,
  timeoutMs: number,
  operation: string
): Promise<T> => {
  return new Promise<T>((resolve, reject) => {
    // Create timeout promise that rejects
    const timeoutPromise = new Promise<never>((_resolve, _reject) => {
      setTimeout(() => {
        _reject(new Error(`Operation '${operation}' timed out after ${timeoutMs}ms. This may be due to slow network conditions.`));
      }, timeoutMs);
    });

    // Race the original promise against the timeout
    Promise.race([promise, timeoutPromise])
      .then(resolve)
      .catch(reject);
  });
};

/**
 * Network timeout constants for different types of operations
 */
export const NETWORK_TIMEOUTS = {
  /** Fast operations like field discovery */
  FAST: 10000,      // 10 seconds
  /** Standard operations like getting events or color mappings */
  STANDARD: 15000,  // 15 seconds
  /** Slow operations like list creation or bulk saves */
  SLOW: 30000,      // 30 seconds
  /** Very slow operations like large data imports */
  VERY_SLOW: 60000  // 60 seconds
} as const;

/**
 * Decode HTML entities from SharePoint text fields
 * SharePoint automatically encodes special characters in Note fields (e.g., &#58; for :)
 * This function decodes them back to their original characters
 * @param text The text containing HTML entities
 * @returns Decoded text with special characters restored
 */
export const decodeHtmlEntities = (text: string): string => {
  if (!text) return '';

  // Create a temporary DOM element to leverage browser's HTML entity decoding
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = text;
  return tempDiv.textContent || tempDiv.innerText || '';
};

// Legacy getEventCategoryIcon function removed - all icons now come from Color Palette Studio
