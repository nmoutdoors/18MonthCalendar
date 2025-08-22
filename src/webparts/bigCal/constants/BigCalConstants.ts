/**
 * BigCal application constants
 * Centralized location for all hardcoded values, magic numbers, and configuration
 */

/**
 * SharePoint list template IDs
 * Reference: https://docs.microsoft.com/en-us/previous-versions/office/developer/sharepoint-2010/ms415071(v=office.14)
 */
export const SHAREPOINT_LIST_TEMPLATES = {
  /** Custom List template - used for BigCalConfig */
  CUSTOM_LIST: 100,
  /** Events List template - enables Outlook sync capability */
  EVENTS_LIST: 106
} as const;

/**
 * SharePoint list experience options
 */
export const LIST_EXPERIENCE_OPTIONS = {
  /** Auto-detect (Modern by default) */
  AUTO: 0,
  /** Classic experience */
  CLASSIC: 1,
  /** Modern experience */
  MODERN: 2
} as const;

/**
 * Default list names used by BigCal
 */
export const DEFAULT_LIST_NAMES = {
  /** Main events list name */
  EVENTS: 'Events',
  /** Private events list name */
  PRIVATE_EVENTS: 'PrivateEvents',
  /** Configuration list name */
  CONFIG: 'BigCalConfig'
} as const;

/**
 * Cache configuration
 */
export const CACHE_CONFIG = {
  /** Color mapping cache expiry in minutes */
  COLOR_MAPPING_EXPIRY_MINUTES: 5,
  /** Message timeout durations in milliseconds */
  MESSAGE_TIMEOUTS: {
    SUCCESS: 3000,  // 3 seconds
    ERROR: 5000     // 5 seconds
  }
} as const;

/**
 * UI Configuration
 */
export const UI_CONFIG = {
  /** Default webpart properties */
  DEFAULTS: {
    START_IN_FULLSCREEN: true,
    SHOW_IMPERSONATE_BUTTON: false,
    SHOW_ICON_SELECTOR: false
  }
} as const;

/**
 * Development configuration
 */
export const DEV_CONFIG = {
  /** Whether to enable debug features in development */
  ENABLE_DEBUG_FEATURES: process.env.NODE_ENV === 'development'
} as const;
