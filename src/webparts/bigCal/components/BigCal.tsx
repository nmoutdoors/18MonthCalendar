/* eslint-disable max-lines */
// NOTE: This file is intentionally large due to the complexity of the calendar component.
// New features should be added as separate components rather than expanding this file further.
// See docs/component-refactoring-summary.md for refactoring guidelines.

import * as React from 'react';
import { Calendar, momentLocalizer, View } from 'react-big-calendar';
import * as moment from 'moment';
import { IconButton, IIconProps, Spinner, SpinnerSize, MessageBar, MessageBarType, Icon, SearchBox, Dropdown, IDropdownOption, Pivot, PivotItem } from '@fluentui/react';
import scrollIntoView from 'scroll-into-view-if-needed';
import styles from './BigCal.module.scss';
import type { IBigCalProps } from './IBigCalProps';
import type { ICalendarEvent } from './ICalendarEvent';

import { SharePointService } from '../services/SharePointService';
import { HybridEventsService } from '../services/HybridEventsService';
import { SPECIFIC_COLOR_MAPPINGS, DEFAULT_ICON_MAPPINGS, IColorMapping, IFieldOption, ORIGINAL_COLOR_MAPPINGS } from '../interfaces/IColorMapping';
import { ColorMappingService } from '../services/ColorMappingService';

import { HolidayService } from '../services/HolidayService';
import { Logger } from '../services/LoggingService';
import { EventModal } from './EventModal';
import { EventPopover } from './EventPopover';
// Lazy load TimelineView for performance optimization
const LazyTimelineView = React.lazy(() => import(/* webpackChunkName: 'timeline-view' */ './TimelineView').then(module => ({ default: module.TimelineView })));
import { ExportManager } from './ExportManager';
import { LazyComponentErrorBoundary } from './LazyComponentErrorBoundary';
import { IconSelector } from './IconSelector';
import { Suspense } from 'react';
import { ColorPaletteStudio } from './ColorPaletteStudio';
import { LegendaryPrintPreview } from './LegendaryPrintPreview';
import { GridView } from './GridView';
import { SwimlanesRefreshModal } from './SwimlanesRefreshModal';
import { formatMonthYear, withTimeout, NETWORK_TIMEOUTS } from '../utils/BigCalUtilities';
import 'react-big-calendar/lib/css/react-big-calendar.css';

// Setup the localizer for react-big-calendar
const localizer = momentLocalizer(moment);

// Lazy load DataSheetView component
const LazyDataSheetView = React.lazy(() => import(/* webpackChunkName: 'datasheet-view' */ './DataSheetView').then(module => ({ default: module.DataSheetView })));

interface IBigCalState {
  isFullscreen: boolean;
  showProperties: boolean;
  events: ICalendarEvent[];
  filteredEvents: ICalendarEvent[];
  isLoading: boolean;
  error: string | undefined;
  currentView: View;
  currentDate: Date;
  isModalOpen: boolean;
  selectedEvent?: ICalendarEvent;
  selectedDate?: Date;
  searchText: string;
  isSearchModalOpen: boolean;
  selectedEventCategories: Set<string>;
  selectedStatuses: Set<string>;
  selectedIMOs: Set<string>;
  selectedOPRs: Set<string>;
  monthNavigatorExpanded: boolean;
  viewMode: 'calendar' | 'briefing' | 'grid' | 'timeline';
  isExportDialogOpen: boolean;
  isPrintDialogOpen: boolean;
  isLegendaryPrintOpen: boolean;
  isDataSheetModalOpen: boolean;
  // Popover state
  popoverEvent?: ICalendarEvent;
  popoverTarget?: HTMLElement;
  isPopoverVisible: boolean;
  // Testing toggle for emulating non-privileged user
  emulateNonPrivilegedUser: boolean;
  // Icon selector modal state
  isIconSelectorOpen: boolean;
  // Color Palette Studio state
  isColorPaletteStudioOpen: boolean;
  colorPaletteDiscoveredOptions: IFieldOption[];
  colorPaletteMappings: IColorMapping[];
  isColorPaletteLoading: boolean;
  // Swimlanes Refresh Modal state
  isSwimlanesRefreshModalOpen: boolean;
  missingSwimlanesCount: number;
  // List configuration status
  colorMappingsAvailable: boolean;
  publicEventsListAvailable: boolean;
  privateEventsListAvailable: boolean;
  listConfigurationIssues: string[];
  // Dynamic color mappings from Color Palette Studio
  dynamicColorMappings: Map<string, string>;
  // Dynamic icon mappings from Color Palette Studio
  dynamicIconMappings: Map<string, string>;
  // Available swimlanes from SharePoint list
  availableSwimlanes: string[];
  // Lazy loading state
  isPartialLoad: boolean;
  loadedDateRange: { start: Date; end: Date } | undefined;
  isLoadingFullDataset: boolean;
  preserveScrollPosition: boolean; // Don't auto-scroll to current month when user is actively scrolling
}

export default class BigCal extends React.Component<IBigCalProps, IBigCalState> {
  private webPartElement: HTMLElement | null = null;
  private sharePointService: SharePointService;
  private hybridEventsService: HybridEventsService;
  private popoverTimeout: number | null = null;
  private isProgrammaticMiniCalendarScroll: boolean = false;

  // Refs for mini calendar auto-scroll functionality
  private miniCalendarScrollAreaRef = React.createRef<HTMLDivElement>();
  private miniCalendarRefs = new Map<string, HTMLDivElement>();
  private scrollCheckTimeout: number | null = null;

  constructor(props: IBigCalProps) {
    super(props);
    this.state = {
      isFullscreen: props.startInFullscreen,
      showProperties: false,
      events: [],
      filteredEvents: [],
      isLoading: true,
      error: undefined,
      currentView: 'month',
      currentDate: this.getSmartNavigationDate(new Date()), // Smart navigation based on current date
      isModalOpen: false,
      selectedEvent: undefined,
      selectedDate: undefined,
      searchText: '',
      isSearchModalOpen: false,
      selectedEventCategories: new Set([
        'DCDC',
        'DISA',
        'DOD CIO / NSA / USCC',
        'Exec Time',
        'Exercises',
        'FYSA',
        'Joint DISA & DCDC',
        'Mission Partner',
        'Out of Office',
        'Seniors',
        'Speaking Event',
        'TDY Meetings/Congressional',
        'Transit',
        'Private Events'
      ]), // All current swimlanes selected by default
      selectedStatuses: new Set(['Confirmed', 'Tentative', 'Not Set']), // All selected by default (Not Set = null/empty status)
      selectedIMOs: new Set(['IMO 1', 'IMO 2', 'IMO 3', 'IMO 4', 'IMO 5', 'IMO 6', 'IMO 7', 'IMO 8', 'Not Set']), // All selected by default
      selectedOPRs: new Set(['J-0', 'J-3/5/7', 'Industry - EM', 'DAFA - SPIO', 'MILDEPs - SPIO', 'International Engagements', 'Speaking Engagements - PAO', 'Media Engagements/Queries - PAO', 'Conferences and Exhibits - PAO', 'J9', 'Internal Engagements', 'OSD/Congress', 'Not Set']), // All selected by default
      monthNavigatorExpanded: true,
      viewMode: 'calendar',
      isExportDialogOpen: false,
      isPrintDialogOpen: false,
      isLegendaryPrintOpen: false,
      isDataSheetModalOpen: false,
      // Popover state
      popoverEvent: undefined,
      popoverTarget: undefined,
      // Testing toggle for emulating non-privileged user
      emulateNonPrivilegedUser: false,
      isPopoverVisible: false,
      // Icon selector modal state
      isIconSelectorOpen: false,
      // Color Palette Studio state
      isColorPaletteStudioOpen: false,
      colorPaletteDiscoveredOptions: [],
      colorPaletteMappings: [],
      isColorPaletteLoading: false,
      // Swimlanes Refresh Modal state
      isSwimlanesRefreshModalOpen: false,
      missingSwimlanesCount: 0,
      // List configuration status
      colorMappingsAvailable: true, // Will be checked on load
      publicEventsListAvailable: true, // Will be checked on load
      privateEventsListAvailable: true, // Will be checked on load
      listConfigurationIssues: [], // Will be populated on load
      // Dynamic color mappings from Color Palette Studio
      dynamicColorMappings: new Map(),
      // Dynamic icon mappings from Color Palette Studio
      dynamicIconMappings: new Map(),
      // Available swimlanes from SharePoint list
      availableSwimlanes: [],
      // Lazy loading state
      isPartialLoad: props.enableLazyLoading, // Start with partial load if enabled
      loadedDateRange: undefined, // Will be set when events are loaded
      isLoadingFullDataset: false,
      preserveScrollPosition: false // Allow auto-scroll on initial load
    };

    this.sharePointService = new SharePointService(props.context, props.listName);
    this.hybridEventsService = new HybridEventsService(props.context, props.listName);

    // Load Font Awesome CSS for icon support
    this.loadFontAwesome();
  }

  /**
   * Load Font Awesome 4.7 CSS if not already loaded
   */
  private loadFontAwesome = (): void => {
    const existingLink = document.querySelector('link[href*="font-awesome"]');
    if (!existingLink) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css';
      link.integrity = 'sha512-SfTiTlX6kk+qitfevl/7LibUOeJWlt9rbyDn92a1DqWOw9vWG2MFoays0sgObmWazO5BQPiFucnnEAjpAB+/Sw==';
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    }
  };

  /**
   * Render an icon - handles Font Awesome icons, emoji, and unicode symbols
   */
  private renderIcon = (iconName: string, fontSize: string = '16px'): React.ReactElement => {
    // Check if it's a Font Awesome icon (starts with 'fa-')
    if (iconName && iconName.indexOf('fa-') === 0) {
      return (
        <i
          className={`fa ${iconName}`}
          style={{ fontSize, display: 'inline-block' }}
          aria-hidden="true"
        />
      );
    }

    // Otherwise render as emoji/unicode text
    return (
      <span style={{ fontSize, display: 'inline-block' }}>
        {iconName}
      </span>
    );
  };

  public async componentDidMount(): Promise<void> {
    // Hide SharePoint navigation bar (z-index 9999 fix)
    const suiteNav = document.getElementById('SuiteNavWrapper');
    if (suiteNav) {
      suiteNav.style.display = 'none';
    }

    // Add debug reference for console debugging (development only)
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).bigCalInstance = this;
    }

    // Find the web part container element - try multiple selectors
    this.webPartElement = document.querySelector('[data-sp-web-part-id]') as HTMLElement ||
                         document.querySelector('.CanvasComponent') as HTMLElement ||
                         document.querySelector('[data-automation-id="CanvasComponent"]') as HTMLElement;

    // FLICKER FIX: No delay needed - fullscreen CSS is already applied by WebPart.onInit()
    // The CSS bootstrap in BigCalWebPart.applyFullscreenBootstrap() ensures fullscreen
    // is established BEFORE React mounts, preventing flicker
    if (this.webPartElement && this.state.isFullscreen) {
      this.enterFullscreen();
    }

    // If timeline view is disabled but currently selected, switch to calendar view
    if (!this.props.showTimelineView && this.state.viewMode === 'timeline') {
      this.setState({ viewMode: 'calendar' });
    }

    // Check all list configurations and load color mappings
    await Promise.all([
      this.checkListConfigurations(),
      this.loadDynamicColorMappings(),
      this.loadColorPaletteMappings(),
      this.loadAvailableSwimlanes()
    ]);

    // Inject dynamic color styles
    this.injectDynamicStyles();

    // Load events from SharePoint
    await this.loadEvents();

    // Auto-scroll to current month after initial render
    // Use longer timeout to ensure DOM is fully rendered
    setTimeout(() => {
      this.scrollToCurrentMonth();
    }, 500);
  }

  /**
   * Handle property changes and state updates - ProgramTracker pattern
   */
  public componentDidUpdate(prevProps: IBigCalProps, prevState: IBigCalState): void {
    // Check if startInFullscreen prop has changed
    if (prevProps.startInFullscreen !== this.props.startInFullscreen) {
      // Update isFullscreen state and apply styles
      this.setState({ isFullscreen: this.props.startInFullscreen }, () => {
        if (this.props.startInFullscreen) {
          this.enterFullscreen();
        } else {
          this.exitFullscreen();
        }
      });
    }

    // Auto-scroll to current month when date changes (navigation)
    if (prevState.currentDate.getTime() !== this.state.currentDate.getTime()) {
      // Use setTimeout to ensure DOM updates are complete
      setTimeout(() => {
        this.scrollToCurrentMonth();
      }, 50);
    }

    // Dynamic styles are handled by Color Palette Studio changes
  }

  /**
   * Cleanup fullscreen styles and timers on unmount - ProgramTracker pattern
   */
  public componentWillUnmount(): void {
    // Remove full screen styles if needed
    if (this.state.isFullscreen) {
      this.exitFullscreen();
    }

    // Clear any pending popover timeout to prevent memory leaks
    if (this.popoverTimeout) {
      window.clearTimeout(this.popoverTimeout);
      this.popoverTimeout = null;
    }

    // Clear scroll check timeout
    if (this.scrollCheckTimeout) {
      window.clearTimeout(this.scrollCheckTimeout);
      this.scrollCheckTimeout = null;
    }
  }

  private loadDynamicColorMappings = async (): Promise<void> => {
    try {
      const colorMappingService = new ColorMappingService(this.props.context);
      const colorPaletteConfig = await colorMappingService.getColorPaletteConfig();

      // Combine swimlane and status colors into a single map
      const combinedColorMappings = new Map<string, string>();
      const combinedIconMappings = new Map<string, string>();

      // Add swimlane colors and icons
      colorPaletteConfig.swimlaneColors.forEach((color, swimlane) => {
        combinedColorMappings.set(swimlane, color);
      });
      colorPaletteConfig.swimlaneIcons.forEach((icon, swimlane) => {
        combinedIconMappings.set(swimlane, icon);
      });

      // Add status colors and icons
      colorPaletteConfig.statusColors.forEach((color, status) => {
        combinedColorMappings.set(status, color);
      });
      colorPaletteConfig.statusIcons.forEach((icon, status) => {
        combinedIconMappings.set(status, icon);
      });

      this.setState({
        dynamicColorMappings: combinedColorMappings,
        dynamicIconMappings: combinedIconMappings
      });
      Logger.debug('Loaded dynamic color and icon mappings', {
        colors: combinedColorMappings.size,
        icons: combinedIconMappings.size
      });
    } catch (error) {
      Logger.error('Failed to load dynamic color mappings', error);
      // Fall back to static mappings
      const staticColorMappings = new Map<string, string>();
      for (const key in SPECIFIC_COLOR_MAPPINGS) {
        if (Object.prototype.hasOwnProperty.call(SPECIFIC_COLOR_MAPPINGS, key)) {
          staticColorMappings.set(key, SPECIFIC_COLOR_MAPPINGS[key]);
        }
      }

      // Fall back to default icon mappings
      const staticIconMappings = new Map<string, string>();
      for (const key in DEFAULT_ICON_MAPPINGS) {
        if (Object.prototype.hasOwnProperty.call(DEFAULT_ICON_MAPPINGS, key)) {
          staticIconMappings.set(key, DEFAULT_ICON_MAPPINGS[key]);
        }
      }

      this.setState({
        dynamicColorMappings: staticColorMappings,
        dynamicIconMappings: staticIconMappings
      });
    }
  };

  /**
   * Load available swimlanes from SharePoint list for dynamic dropdowns
   */
  private loadAvailableSwimlanes = async (): Promise<void> => {
    try {
      const colorMappingService = new ColorMappingService(this.props.context);
      const discoveredOptions = await colorMappingService.discoverFieldOptions(this.props.listName);

      // Extract swimlane options
      const swimlanes = discoveredOptions
        .filter(option => option.fieldName === 'Swimlanes')
        .map(option => option.optionValue)
        .sort(); // Sort alphabetically for consistent ordering

      // Update available swimlanes and ensure all are selected in the filter by default
      const { selectedEventCategories } = this.state;
      const updatedSelectedCategories = new Set<string>();
      selectedEventCategories.forEach(category => updatedSelectedCategories.add(category));

      // Add any new swimlanes to the selected categories (except Private Events which is handled separately)
      swimlanes.forEach(swimlane => {
        if (swimlane !== 'Private Events') {
          updatedSelectedCategories.add(swimlane);
        }
      });

      this.setState({
        availableSwimlanes: swimlanes,
        selectedEventCategories: updatedSelectedCategories
      });

      Logger.debug('Loaded available swimlanes', { count: swimlanes.length, swimlanes });

    } catch (error) {
      Logger.warn('Failed to load available swimlanes, using fallback', error);
      // Don't set state - EventModal will use fallback options
    }
  };

  private loadColorPaletteMappings = async (): Promise<void> => {
    try {
      const colorMappingService = new ColorMappingService(this.props.context);
      const colorMappings = await colorMappingService.getColorMappings();

      this.setState({ colorPaletteMappings: colorMappings });
      Logger.debug('Loaded color palette mappings for text color logic', {
        mappings: colorMappings.length
      });
    } catch (error) {
      Logger.error('Failed to load color palette mappings', error);
      // Don't throw - this is for text color enhancement only
    }
  };

  /**
   * Calculate date range for initial lazy load
   */
  private calculateInitialDateRange(): { start: Date; end: Date } {
    const today = new Date();
    const startDate = new Date(today.getTime());
    const endDate = new Date(today.getTime());

    // Apply configured months (with minimum safeguards)
    const monthsPast = Math.max(0, this.props.lazyLoadMonthsPast);
    const monthsFuture = Math.max(0, this.props.lazyLoadMonthsFuture);

    // Set start date (X months in the past)
    startDate.setMonth(today.getMonth() - monthsPast);
    startDate.setDate(1); // Start of month
    startDate.setHours(0, 0, 0, 0);

    // Set end date (X months in the future)
    endDate.setMonth(today.getMonth() + monthsFuture + 1); // +1 to include the full future month
    endDate.setDate(0); // Last day of previous month (end of the future month)
    endDate.setHours(23, 59, 59, 999);

    return { start: startDate, end: endDate };
  }

  /**
   * Check if a date is outside the currently loaded range
   */
  private isDateOutsideLoadedRange(date: Date): boolean {
    if (!this.state.isPartialLoad || !this.state.loadedDateRange) {
      return false; // All events loaded or no range set
    }

    const { start, end } = this.state.loadedDateRange;
    return date < start || date > end;
  }

  /**
   * Check if we need to load all events and trigger load if needed
   */
  private checkAndLoadAllIfNeeded = async (requestedDate?: Date): Promise<void> => {
    // Skip if already loading or if all events are loaded
    if (this.state.isLoadingFullDataset || !this.state.isPartialLoad) {
      return;
    }

    // Check if requested date is outside loaded range
    if (requestedDate && this.isDateOutsideLoadedRange(requestedDate)) {
      if (this.props.enablePerformanceLogging) {
        Logger.info(`[Lazy Load] Date ${requestedDate.toLocaleDateString()} is outside loaded range. Loading all events...`);
      }
      await this.loadAllEvents();
    }
  };

  /**
   * Load events - uses lazy loading if enabled, otherwise loads all events
   */
  private loadEvents = async (): Promise<void> => {
    if (this.props.enableLazyLoading) {
      await this.loadInitialEvents();
    } else {
      await this.loadAllEvents();
    }
  };

  /**
   * Load initial events within configured date range (lazy loading)
   */
  private loadInitialEvents = async (): Promise<void> => {
    try {
      this.setState({ isLoading: true, error: undefined });

      const dateRange = this.calculateInitialDateRange();
      const startTime = performance.now();

      if (this.props.enablePerformanceLogging) {
        Logger.info(`[Lazy Load] Loading events from ${dateRange.start.toLocaleDateString()} to ${dateRange.end.toLocaleDateString()} (${this.props.lazyLoadMonthsPast} past + current + ${this.props.lazyLoadMonthsFuture} future months)`);
      }

      // Use HybridEventsService to get events within date range
      const calendarEvents = await this.hybridEventsService.getAllEventsByDateRange(
        dateRange.start,
        dateRange.end,
        this.state.emulateNonPrivilegedUser
      );

      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);

      if (this.props.enablePerformanceLogging) {
        Logger.info(`[Lazy Load] Loaded ${calendarEvents.length} events in ${duration}ms`);
      }

      this.setState({
        events: calendarEvents,
        isLoading: false,
        isPartialLoad: true,
        loadedDateRange: dateRange
      }, () => {
        // Apply filters after events are loaded
        this.applyFilters();
      });
    } catch (error) {
      Logger.error('Failed to load initial events', error);
      this.setState({
        error: 'Failed to load events from SharePoint. Please check your connection and permissions.',
        isLoading: false
      });
    }
  };

  /**
   * Load all events (full dataset) - triggered by user action or when lazy loading is disabled
   */
  private loadAllEvents = async (): Promise<void> => {
    try {
      this.setState({ isLoadingFullDataset: true, error: undefined });

      const startTime = performance.now();

      if (this.props.enablePerformanceLogging) {
        Logger.info('[Full Load] Loading all events...');
      }

      // Use HybridEventsService to get all events (public + private based on permissions)
      const calendarEvents = await this.hybridEventsService.getAllEvents(this.state.emulateNonPrivilegedUser);

      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);

      if (this.props.enablePerformanceLogging) {
        Logger.info(`[Full Load] Loaded ${calendarEvents.length} events in ${duration}ms`);
      }

      this.setState({
        events: calendarEvents,
        isLoading: false,
        isLoadingFullDataset: false,
        isPartialLoad: false,
        loadedDateRange: undefined // No range limit when all events are loaded
      }, () => {
        // Apply filters after events are loaded
        this.applyFilters();
      });
    } catch (error) {
      Logger.error('Failed to load all events', error);
      this.setState({
        error: 'Failed to load events from SharePoint. Please check your connection and permissions.',
        isLoading: false,
        isLoadingFullDataset: false
      });
    }
  };

  private applyFilters = (): void => {
    // This method is now handled by applyFiltersToEvents
    // Keep for backward compatibility but use the new approach
    const allEventsWithHolidays = this.getAllEventsWithHolidays();
    const filtered = this.applyFiltersToEvents(allEventsWithHolidays);

    // Extract only regular events for the filteredEvents state (used by other components)
    const regularFiltered = filtered.filter(event => !event.isHoliday);
    this.setState({ filteredEvents: regularFiltered });
  };

  private handleSearchChange = (searchText: string): void => {
    this.setState({ searchText }, () => {
      this.applyFilters();
    });
  };

  private toggleSearchModal = (): void => {
    this.setState({ isSearchModalOpen: !this.state.isSearchModalOpen });
  };

  private closeSearchModal = (): void => {
    this.setState({ isSearchModalOpen: false });
  };





  private handleMonthNavigate = (month: Date): void => {
    this.setState({ currentDate: month, viewMode: 'calendar' });

    // Check if we need to load all events (lazy loading trigger for mini-calendar navigation)
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.checkAndLoadAllIfNeeded(month);
  };

  private handleViewModeChange = (item?: PivotItem): void => {
    if (item?.props.itemKey) {
      const newViewMode = item.props.itemKey as 'calendar' | 'briefing' | 'grid' | 'timeline';

      // Trigger load all events for grid view (18-month view needs all data)
      if (newViewMode === 'grid' && this.state.isPartialLoad) {
        if (this.props.enablePerformanceLogging) {
          Logger.info('[Lazy Load] Switching to 18-Month Grid View. Loading all events...');
        }
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.loadAllEvents();
      }

      this.setState({ viewMode: newViewMode }, () => {
        if (newViewMode === 'calendar') {
          // Maintain mini calendar scroll position when switching back to calendar view
          setTimeout(() => {
            this.scrollToCurrentMonth();
          }, 50);
        }
      });
    }
  };

  private openDataSheetModal = (): void => {
    // Trigger load all events for DataSheet view (needs all data for editing)
    if (this.state.isPartialLoad) {
      if (this.props.enablePerformanceLogging) {
        Logger.info('[Lazy Load] Opening DataSheet View. Loading all events...');
      }
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.loadAllEvents();
    }

    this.setState({ isDataSheetModalOpen: true });
  };

  private closeDataSheetModal = (): void => {
    this.setState({ isDataSheetModalOpen: false });
  };

  private handleTimelineReset = (): void => {
    // Reset timeline to default zoom and current date
    this.setState({ currentDate: new Date() });

    // Trigger timeline reset via a custom event that TimelineView can listen to
    const resetEvent = new CustomEvent('timelineReset', {
      detail: { resetToToday: true }
    });
    window.dispatchEvent(resetEvent);
  };











  private get18MonthRange = (): Date[] => {
    const months: Date[] = [];
    const startDate = new Date(2025, 7, 1);

    for (let i = 0; i < 18; i++) {
      const month = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
      months.push(month);
    }
    return months;
  };

  /**
   * Auto-scroll to the current month in the mini calendar sidebar
   * Uses scroll-into-view-if-needed for smooth, intelligent scrolling
   * Implements smart navigation: shows next month during the last week
   */
  private scrollToCurrentMonth = (): void => {
    // Don't auto-scroll if user is actively scrolling (preserve their position)
    if (this.state.preserveScrollPosition) {
      return;
    }

    // Use the currently displayed calendar date for smart navigation
    const referenceDate = this.state.currentDate;

    // Smart navigation: if we're in the last 7 days of the month, show next month
    const targetDate = this.getSmartNavigationDate(referenceDate);
    const targetMonthKey = `${targetDate.getFullYear()}-${targetDate.getMonth()}`;
    const targetMonthElement = this.miniCalendarRefs.get(targetMonthKey);

    // Debug logging
    const availableKeys: string[] = [];
    this.miniCalendarRefs.forEach((value, key) => {
      availableKeys.push(key);
    });

    console.log('🎯 Auto-scroll Debug:', {
      referenceDate: referenceDate.toDateString(),
      targetDate: targetDate.toDateString(),
      targetMonthKey,
      hasTargetElement: !!targetMonthElement,
      hasScrollContainer: !!this.miniCalendarScrollAreaRef.current,
      availableRefs: availableKeys
    });

    if (targetMonthElement && this.miniCalendarScrollAreaRef.current) {
      console.log('🚀 Executing scroll to:', targetDate.toDateString());

      // Get current scroll position before
      const scrollContainer = this.miniCalendarScrollAreaRef.current;
      const beforeScrollTop = scrollContainer.scrollTop;

      console.log('📏 Scroll container info:', {
        scrollTop: beforeScrollTop,
        scrollHeight: scrollContainer.scrollHeight,
        clientHeight: scrollContainer.clientHeight,
        targetElementOffsetTop: targetMonthElement.offsetTop
      });

      this.isProgrammaticMiniCalendarScroll = true;

      scrollIntoView(targetMonthElement, {
        behavior: 'smooth',
        block: 'start', // Position the target month at the top of the viewport
        inline: 'nearest',
        scrollMode: 'always', // Force scroll even if already visible
        boundary: this.miniCalendarScrollAreaRef.current
      });

      // Check scroll position after a delay
      setTimeout(() => {
        const afterScrollTop = scrollContainer.scrollTop;
        console.log('📏 After scroll:', {
          beforeScrollTop,
          afterScrollTop,
          scrollChanged: beforeScrollTop !== afterScrollTop
        });

        this.isProgrammaticMiniCalendarScroll = false;
      }, 1000);
    } else {
      console.warn('❌ Cannot scroll - missing element or container');
    }
  };

  /**
   * Handle mini-calendar scroll events to detect when user scrolls beyond loaded range
   */
  private handleMiniCalendarScroll = (): void => {
    if (this.isProgrammaticMiniCalendarScroll) {
      return;
    }

    // Debounce scroll checks to avoid excessive processing
    if (this.scrollCheckTimeout) {
      window.clearTimeout(this.scrollCheckTimeout);
    }

    // Mark that user is actively scrolling (preserve their position)
    this.setState({ preserveScrollPosition: true });

    this.scrollCheckTimeout = window.setTimeout(() => {
      try {
        // Only check if we're in partial load mode
        if (!this.state.isPartialLoad || !this.state.loadedDateRange) {
          return;
        }

        const scrollContainer = this.miniCalendarScrollAreaRef.current;
        if (!scrollContainer) {
          return;
        }

        // Get scroll metrics
        const scrollTop = scrollContainer.scrollTop;
        const scrollHeight = scrollContainer.scrollHeight;
        const clientHeight = scrollContainer.clientHeight;
        const scrollPercentage = (scrollTop / (scrollHeight - clientHeight)) * 100;

        // Check which months are currently visible in the viewport
        const visibleMonths: Date[] = [];
        this.miniCalendarRefs.forEach((element, monthKey) => {
          const rect = element.getBoundingClientRect();
          const containerRect = scrollContainer.getBoundingClientRect();

          // Check if this month is visible in the viewport
          if (rect.top < containerRect.bottom && rect.bottom > containerRect.top) {
            const [year, month] = monthKey.split('-').map(Number);
            visibleMonths.push(new Date(year, month, 1));
          }
        });

        if (visibleMonths.length === 0) {
          return;
        }

        // Find the earliest and latest visible months
        const earliestVisible = new Date(Math.min(...visibleMonths.map(d => d.getTime())));
        const latestVisible = new Date(Math.max(...visibleMonths.map(d => d.getTime())));

        // Check if user has scrolled beyond the loaded range
        const loadedStart = this.state.loadedDateRange.start;
        const loadedEnd = this.state.loadedDateRange.end;

        const scrolledBeforeRange = earliestVisible < loadedStart;
        const scrolledAfterRange = latestVisible > loadedEnd;

        if (scrolledBeforeRange || scrolledAfterRange) {
          if (this.props.enablePerformanceLogging) {
            Logger.info('[Lazy Load] User scrolled beyond loaded range. Triggering load all events...', {
              scrollPercentage: scrollPercentage.toFixed(1),
              earliestVisible: earliestVisible.toLocaleDateString(),
              latestVisible: latestVisible.toLocaleDateString(),
              loadedStart: loadedStart.toLocaleDateString(),
              loadedEnd: loadedEnd.toLocaleDateString(),
              scrolledBeforeRange,
              scrolledAfterRange
            });
          }

          // Trigger load all events
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          this.loadAllEvents();
        }
      } finally {
        this.setState({ preserveScrollPosition: false });
      }
    }, 300); // 300ms debounce
  };

  /**
   * Smart navigation logic: anticipate user needs during the last week of the month
   * Returns the date that should be prominently displayed in mini calendars
   */
  private getSmartNavigationDate = (referenceDate: Date): Date => {
    const lastDayOfMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0);
    const daysUntilEndOfMonth = lastDayOfMonth.getDate() - referenceDate.getDate();

    // Debug logging
    console.log('🧠 Smart Navigation Logic:', {
      referenceDate: referenceDate.toDateString(),
      lastDayOfMonth: lastDayOfMonth.toDateString(),
      daysUntilEndOfMonth,
      shouldShowNextMonth: daysUntilEndOfMonth < 7
    });

    // If we're in the last 7 days of the month, show next month
    if (daysUntilEndOfMonth < 7) {
      const nextMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 1);
      console.log('📅 Showing next month:', nextMonth.toDateString());
      return nextMonth;
    }

    // Otherwise, show current month
    console.log('📅 Showing current month:', referenceDate.toDateString());
    return referenceDate;
  };

  private getEventsForMonth = (month: Date): number => {
    // Use filtered events to match what's displayed in mini calendars
    const allEventsWithHolidays = this.getAllEventsWithHolidays();
    const allFilteredEvents = this.applyFiltersToEvents(allEventsWithHolidays);
    return allFilteredEvents.filter(event => {
      return event.start.getFullYear() === month.getFullYear() &&
             event.start.getMonth() === month.getMonth();
    }).length;
  };



  private getEventCategoryDropdownOptions = (): IDropdownOption[] => {
    const { filteredEvents, selectedEventCategories, availableSwimlanes } = this.state;

    // Use dynamic swimlanes if available, otherwise fallback to hardcoded list
    const categories = availableSwimlanes && availableSwimlanes.length > 0
      ? availableSwimlanes.filter(swimlane => swimlane !== 'Private Events') // Exclude Private Events from regular categories
      : [
          'CDR/DIR FYSA',
          'DCDC',
          'Delegated',
          'DISA',
          'DOD CIO / NSA / USCC',
          'Exec Time',
          'Exercises',
          'FO/SIG',
          'FYSA',
          'Holiday/Downday',
          'Joint DISA & DCDC',
          'Mission Partner',
          'Out of Office',
          'Seniors',
          'Speaking Event',
          'TDY Meetings/Congressional',
          'Transit'
        ];

    const options = categories.map(eventCategory => {
      // Only count regular events, not holidays
      const count = filteredEvents.filter(e => !e.isHoliday && e.swimlane === eventCategory).length;
      const icon = this.state.dynamicIconMappings.get(eventCategory) || '';
      return {
        key: eventCategory,
        text: `${eventCategory} (${count})`,
        data: { icon, count }
      };
    });

    // Add Private Events option
    const privateCount = filteredEvents.filter(e => !e.isHoliday && e.isPrivate).length;
    const privateIcon = this.state.dynamicIconMappings.get('Private Events') || DEFAULT_ICON_MAPPINGS['Private Events'] || '';
    options.push({
      key: 'Private Events',
      text: `Private Events (${privateCount})`,
      data: { icon: privateIcon, count: privateCount }
    });

    // Add Select All/Unselect All toggle option
    const allAvailableCategories = [...categories, 'Private Events'];
    const allSelected = allAvailableCategories.every(cat => selectedEventCategories.has(cat));
    options.push({
      key: '__toggle_all_categories__',
      text: allSelected ? 'Unselect All' : 'Select All',
      data: { icon: '', count: 0, isToggle: true, allSelected } as { icon: string; count: number; isToggle: boolean; allSelected: boolean }
    });

    return options;
  };

  private getStatusDropdownOptions = (): IDropdownOption[] => {
    const { filteredEvents, selectedStatuses } = this.state;
    const allStatuses = ['Confirmed', 'Tentative', 'Not Set'];

    const options = allStatuses.map(status => {
      // Count events with this status, including events with no status for "Not Set"
      let count: number;
      if (status === 'Not Set') {
        count = filteredEvents.filter(e => !e.isHoliday && (!e.status || e.status === 'Not Set')).length;
      } else {
        count = filteredEvents.filter(e => !e.isHoliday && e.status === status).length;
      }

      return {
        key: status,
        text: `${status} (${count})`,
        data: {
          color: status === 'Tentative'
            ? (this.state.dynamicColorMappings.get('Tentative') || '#ffc107')
            : 'transparent',
          count
        }
      };
    });

    // Add Select All/Unselect All toggle option
    const allSelected = allStatuses.every((status: string) => selectedStatuses.has(status));
    options.push({
      key: '__toggle_all_statuses__',
      text: allSelected ? 'Unselect All' : 'Select All',
      data: { color: '', count: 0, isToggle: true, allSelected } as { color: string; count: number; isToggle: boolean; allSelected: boolean }
    });

    return options;
  };

  private getIMODropdownOptions = (): IDropdownOption[] => {
    const { filteredEvents, selectedIMOs } = this.state;
    const allIMOs = ['IMO 1', 'IMO 2', 'IMO 3', 'IMO 4', 'IMO 5', 'IMO 6', 'IMO 7', 'IMO 8', 'Not Set'];

    const options = allIMOs.map(imo => {
      // Count events with this IMO, including events with no IMO for "Not Set"
      let count: number;
      if (imo === 'Not Set') {
        count = filteredEvents.filter(e => !e.isHoliday && (!e.imo || e.imo === 'Not Set' || (e.imo as string) === '')).length;
      } else {
        count = filteredEvents.filter(e => !e.isHoliday && e.imo === imo).length;
      }

      return {
        key: imo,
        text: `${imo} (${count})`,
        data: {
          color: 'transparent', // IMO doesn't use colors
          count
        }
      };
    });

    // Add Select All/Unselect All toggle option
    const allSelected = allIMOs.every((imo: string) => selectedIMOs.has(imo));
    options.push({
      key: '__toggle_all_imos__',
      text: allSelected ? 'Unselect All' : 'Select All',
      data: { color: '', count: 0, isToggle: true, allSelected } as { color: string; count: number; isToggle: boolean; allSelected: boolean }
    });

    return options;
  };

  private getOPRDropdownOptions = (): IDropdownOption[] => {
    const { filteredEvents, selectedOPRs } = this.state;
    const allOPRs = ['J-0', 'J-3/5/7', 'Industry - EM', 'DAFA - SPIO', 'MILDEPs - SPIO', 'International Engagements', 'Speaking Engagements - PAO', 'Media Engagements/Queries - PAO', 'Conferences and Exhibits - PAO', 'J9', 'Internal Engagements', 'OSD/Congress', 'Not Set'];

    const options = allOPRs.map(opr => {
      // Count events with this OPR, including events with no OPR for "Not Set"
      let count: number;
      if (opr === 'Not Set') {
        count = filteredEvents.filter(event => !event.opr || event.opr === 'Not Set' || (event.opr as string) === '').length;
      } else {
        count = filteredEvents.filter(event => event.opr === opr).length;
      }

      return {
        key: opr,
        text: `${opr} (${count})`,
        selected: selectedOPRs.has(opr),
        data: {
          color: '', // No color for OPR
          count: count
        }
      };
    });

    // Add Select All/Unselect All toggle option
    const allSelected = allOPRs.every((opr: string) => selectedOPRs.has(opr));
    options.push({
      key: '__toggle_all_oprs__',
      text: allSelected ? 'Unselect All' : 'Select All',
      selected: false, // Toggle options are not selected
      data: { color: '', count: 0, isToggle: true, allSelected } as { color: string; count: number; isToggle: boolean; allSelected: boolean }
    });

    return options;
  };










  private injectDynamicStyles = (): void => {
    // Dynamic styles are now handled by the Color Palette Studio system
    // This method is kept for compatibility but does nothing
  };

  /**
   * Update dynamic color and icon mappings from provided mappings
   * Used for real-time updates when ColorPaletteStudio makes changes
   */
  private updateDynamicMappingsFromMappings = (mappings: IColorMapping[]): void => {
    // Build color and icon mappings from provided mappings
    const combinedColorMappings = new Map<string, string>();
    const combinedIconMappings = new Map<string, string>();

    mappings.forEach(mapping => {
      if (mapping.isActive) {
        // Use the mapping key format that matches the event styling
        const key = mapping.optionValue;

        if (mapping.colorHex) {
          combinedColorMappings.set(key, mapping.colorHex);
        }

        if (mapping.iconName) {
          combinedIconMappings.set(key, mapping.iconName);
        }
      }
    });

    // Update state with new mappings
    this.setState({
      dynamicColorMappings: combinedColorMappings,
      dynamicIconMappings: combinedIconMappings
    });
  };





  // Remove getStatusIcon since we're using colored circles instead

  private getAllEventsWithHolidays = (): ICalendarEvent[] => {
    const holidayEvents = HolidayService.getHolidayEvents().map(holiday => ({
      ...holiday,
      swimlane: undefined,
      status: undefined,
      isHoliday: true,
      isObserved: holiday.isObserved
    } as ICalendarEvent));

    return [...this.state.events, ...holidayEvents];
  };

  private applyFiltersToEvents = (events: ICalendarEvent[]): ICalendarEvent[] => {
    const { searchText, selectedEventCategories, selectedStatuses, selectedIMOs, selectedOPRs } = this.state;



    const filteredEvents = events.filter(event => {
      // Holiday events are always shown (they don't have swimlane/status filters)
      if (event.isHoliday) {
        // Apply search filter to holidays
        if (searchText && event.title.toLowerCase().indexOf(searchText.toLowerCase()) === -1) {
          return false;
        }
        return true;
      }

      // All events are now visible - no category filtering needed

      // Regular event filters
      // Fix: When no categories are selected, show no events (not all events)
      // Fix: When no statuses are selected, show no events (not all events)
      // This matches user expectation that "Unselect All" hides everything

      // Check if event matches category (including Private Events)
      let matchesCategory = false;
      if (selectedEventCategories.size > 0) {
        if (event.isPrivate && selectedEventCategories.has('Private Events')) {
          matchesCategory = true;
        } else if (!event.isPrivate && event.swimlane && selectedEventCategories.has(event.swimlane)) {
          matchesCategory = true;
        }
        // Note: Events with null swimlane (need configuration) should NOT automatically pass
        // They should only show if user explicitly selects appropriate category
      }

      // Check status match, including "Not Set" for events with no status
      let matchesStatus = false;
      if (selectedStatuses.size > 0) {
        if (selectedStatuses.has('Not Set') && (!event.status || event.status === 'Not Set')) {
          matchesStatus = true;
        } else if (event.status && event.status !== 'Not Set' && selectedStatuses.has(event.status)) {
          matchesStatus = true;
        }
      }

      // Check IMO match, including "Not Set" for events with no IMO
      let matchesIMO = false;
      if (selectedIMOs.size > 0) {
        if (selectedIMOs.has('Not Set') && (!event.imo || event.imo === 'Not Set' || (event.imo as string) === '')) {
          matchesIMO = true;
        } else if (event.imo && event.imo !== 'Not Set' && (event.imo as string) !== '' && selectedIMOs.has(event.imo)) {
          matchesIMO = true;
        }
      }

      // Check OPR match, including "Not Set" for events with no OPR
      let matchesOPR = false;
      if (selectedOPRs.size > 0) {
        if (selectedOPRs.has('Not Set') && (!event.opr || event.opr === 'Not Set' || (event.opr as string) === '')) {
          matchesOPR = true;
        } else if (event.opr && event.opr !== 'Not Set' && (event.opr as string) !== '' && selectedOPRs.has(event.opr)) {
          matchesOPR = true;
        }
      }

      const matchesSearch = !searchText || event.title.toLowerCase().indexOf(searchText.toLowerCase()) !== -1;

      return matchesCategory && matchesStatus && matchesIMO && matchesOPR && matchesSearch;
    });



    return filteredEvents;
  };

  private handleEventCategoryDropdownChange = (event: React.FormEvent<HTMLDivElement>, option?: IDropdownOption): void => {
    if (option) {
      // Handle Select All/Unselect All toggle
      if (option.key === '__toggle_all_categories__') {
        const { availableSwimlanes } = this.state;

        // Use dynamic swimlanes if available, otherwise fallback to hardcoded list
        const allCategories = availableSwimlanes && availableSwimlanes.length > 0
          ? availableSwimlanes.filter(swimlane => swimlane !== 'Private Events')
          : [
              'CDR/DIR FYSA',
              'DCDC',
              'Delegated',
              'DISA',
              'DOD CIO / NSA / USCC',
              'Exec Time',
              'Exercises',
              'FO/SIG',
              'FYSA',
              'Holiday/Downday',
              'Joint DISA & DCDC',
              'Mission Partner',
              'Out of Office',
              'Seniors',
              'Speaking Event',
              'TDY Meetings/Congressional',
              'Transit'
            ];

        // Include Private Events in toggle logic for all views now that they have their own dedicated lane
        const allAvailableCategories = [...allCategories, 'Private Events'];
        const allSelected = option.data?.allSelected;
        const newSelected = allSelected ? new Set<string>() : new Set<string>(allAvailableCategories);

        this.setState({ selectedEventCategories: newSelected }, () => {
          this.applyFilters();
        });
        return;
      }

      // Handle individual category selection
      const { selectedEventCategories } = this.state;
      const newSelected = new Set<string>();
      selectedEventCategories.forEach(item => newSelected.add(item));

      if (option.selected) {
        newSelected.add(option.key as string);
      } else {
        newSelected.delete(option.key as string);
      }

      this.setState({ selectedEventCategories: newSelected }, () => {
        this.applyFilters();
      });
    }
  };

  private handleStatusDropdownChange = (event: React.FormEvent<HTMLDivElement>, option?: IDropdownOption): void => {
    if (option) {
      // Handle Select All/Unselect All toggle
      if (option.key === '__toggle_all_statuses__') {
        const allStatuses = ['Confirmed', 'Tentative', 'Not Set'];
        const allSelected = option.data?.allSelected;
        const newSelected = allSelected ? new Set<string>() : new Set<string>(allStatuses);

        this.setState({ selectedStatuses: newSelected }, () => {
          this.applyFilters();
        });
        return;
      }

      // Handle individual status selection
      const { selectedStatuses } = this.state;
      const newSelected = new Set<string>();
      selectedStatuses.forEach(item => newSelected.add(item));

      if (option.selected) {
        newSelected.add(option.key as string);
      } else {
        newSelected.delete(option.key as string);
      }

      this.setState({ selectedStatuses: newSelected }, () => {
        this.applyFilters();
      });
    }
  };

  private handleIMODropdownChange = (event: React.FormEvent<HTMLDivElement>, option?: IDropdownOption): void => {
    if (option) {
      // Handle Select All/Unselect All toggle
      if (option.key === '__toggle_all_imos__') {
        const allIMOs = ['IMO 1', 'IMO 2', 'IMO 3', 'IMO 4', 'IMO 5', 'IMO 6', 'IMO 7', 'IMO 8', 'Not Set'];
        const allSelected = option.data?.allSelected;
        const newSelected = allSelected ? new Set<string>() : new Set<string>(allIMOs);

        this.setState({ selectedIMOs: newSelected }, () => {
          this.applyFilters();
        });
        return;
      }

      // Handle individual IMO selection
      const { selectedIMOs } = this.state;
      const newSelected = new Set<string>();
      selectedIMOs.forEach(item => newSelected.add(item));

      if (option.selected) {
        newSelected.add(option.key as string);
      } else {
        newSelected.delete(option.key as string);
      }

      this.setState({ selectedIMOs: newSelected }, () => {
        this.applyFilters();
      });
    }
  };

  private handleOPRDropdownChange = (event: React.FormEvent<HTMLDivElement>, option?: IDropdownOption): void => {
    if (option) {
      // Handle Select All/Unselect All toggle
      if (option.key === '__toggle_all_oprs__') {
        const allOPRs = ['J-0', 'J-3/5/7', 'Industry - EM', 'DAFA - SPIO', 'MILDEPs - SPIO', 'International Engagements', 'Speaking Engagements - PAO', 'Media Engagements/Queries - PAO', 'Conferences and Exhibits - PAO', 'J9', 'Internal Engagements', 'OSD/Congress', 'Not Set'];
        const allSelected = option.data?.allSelected;
        const newSelected = allSelected ? new Set<string>() : new Set<string>(allOPRs);

        this.setState({ selectedOPRs: newSelected }, () => {
          this.applyFilters();
        });
        return;
      }

      // Handle individual OPR selection
      const { selectedOPRs } = this.state;
      const newSelected = new Set<string>();
      selectedOPRs.forEach(item => newSelected.add(item));

      if (option.selected) {
        newSelected.add(option.key as string);
      } else {
        newSelected.delete(option.key as string);
      }

      this.setState({ selectedOPRs: newSelected }, () => {
        this.applyFilters();
      });
    }
  };

  private renderEventCategoryOption = (option?: IDropdownOption): React.ReactElement => {
    if (!option) return <div />;

    // Render toggle button
    if (option.data?.isToggle) {
      return (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          padding: '8px 0',
          borderTop: '1px solid #edebe9',
          marginTop: '4px'
        }}>
          <span style={{
            fontSize: '13px',
            fontWeight: '600',
            color: 'var(--themePrimary, #0078d4)',
            cursor: 'pointer'
          }}>
            {option.text}
          </span>
        </div>
      );
    }

    // Render normal option
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
        <span style={{
          width: '18px',
          textAlign: 'center',
          display: 'inline-block'
        }}>
          {this.renderIcon(option.data?.icon || '', '16px')}
        </span>
        <span style={{ fontSize: '13px' }}>
          {option.text}
        </span>
      </div>
    );
  };

  private renderEventCategoryTitle = (options?: IDropdownOption[]): React.ReactElement => {
    return (
      <span style={{ fontSize: '13px' }}>
        Event Category
      </span>
    );
  };

  private renderStatusOption = (option?: IDropdownOption): React.ReactElement => {
    if (!option) return <div />;

    // Render toggle button
    if (option.data?.isToggle) {
      return (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          padding: '8px 0',
          borderTop: '1px solid #edebe9',
          marginTop: '4px'
        }}>
          <span style={{
            fontSize: '13px',
            fontWeight: '600',
            color: 'var(--themePrimary, #0078d4)',
            cursor: 'pointer'
          }}>
            {option.text}
          </span>
        </div>
      );
    }

    // Render normal option with colored circle
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
        <div
          style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: option.data?.color,
            flexShrink: 0
          }}
        />
        <span style={{ fontSize: '13px' }}>
          {option.text}
        </span>
      </div>
    );
  };

  private renderStatusTitle = (options?: IDropdownOption[]): React.ReactElement => {
    return (
      <span style={{ fontSize: '13px' }}>
        Status
      </span>
    );
  };
  private renderIMOOption = (option?: IDropdownOption): React.ReactElement => {
    if (!option) return <div />;

    // Render toggle button
    if (option.data?.isToggle) {
      return (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          padding: '8px 0',
          borderTop: '1px solid #edebe9',
          marginTop: '4px'
        }}>
          <span style={{
            fontSize: '13px',
            fontWeight: '600',
            color: 'var(--themePrimary, #0078d4)',
            cursor: 'pointer'
          }}>
            {option.text}
          </span>
        </div>
      );
    }

    // Render normal option without colored circle (IMO doesn't use colors)
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
        <span style={{ fontSize: '13px' }}>
          {option.text}
        </span>
      </div>
    );
  };

  private renderIMOTitle = (options?: IDropdownOption[]): React.ReactElement => {
    return (
      <span style={{ fontSize: '13px' }}>
        IMO
      </span>
    );
  };

  private renderOPROption = (option?: IDropdownOption): React.ReactElement => {
    if (!option) return <div />;

    // Render toggle button
    if (option.data?.isToggle) {
      return (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          padding: '8px 0',
          borderTop: '1px solid #edebe9',
          marginTop: '4px'
        }}>
          <span style={{
            fontSize: '13px',
            fontWeight: '600',
            color: 'var(--themePrimary, #0078d4)',
            cursor: 'pointer'
          }}>
            {option.text}
          </span>
        </div>
      );
    }

    // Render normal option without colored circle (OPR doesn't use colors)
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
        <span style={{ fontSize: '13px' }}>
          {option.text}
        </span>
      </div>
    );
  };

  private renderOPRTitle = (options?: IDropdownOption[]): React.ReactElement => {
    return (
      <span style={{ fontSize: '13px' }}>
        OPR
      </span>
    );
  };





  private renderGridView = (): React.ReactElement => {
    const { currentDate } = this.state;
    const allEventsWithHolidays = this.getAllEventsWithHolidays();
    const allFilteredEvents = this.applyFiltersToEvents(allEventsWithHolidays);

    return (
      <GridView
        currentDate={currentDate}
        allFilteredEvents={allFilteredEvents}
        eventStyleGetter={this.eventStyleGetter}
        onMonthNavigate={this.handleMonthNavigate}
        MiniCalendarEvent={this.MiniCalendarEvent}
      />
    );
  };

  /**
   * Apply fullscreen styles using ProgramTracker's proven approach
   * This is essential for SharePoint site page compatibility
   */
  private enterFullscreen = (): void => {
    try {
      // Get our component element
      const bigCalElement = document.querySelector(`.${styles.bigCal}`);
      if (!bigCalElement) return;

      // Find SharePoint container using ProgramTracker's proven selectors
      const webpartContainer = document.querySelector('[data-sp-feature-tag="BigCalWebPart"]') ||
                              document.querySelector('.ControlZone') ||
                              bigCalElement.closest('.ControlZone') ||
                              bigCalElement.closest('.CanvasComponent');

      if (webpartContainer) {
        Logger.debug('Applying fullscreen styles to SharePoint container');

        // Apply ProgramTracker's proven DOM manipulation approach
        const container = webpartContainer as HTMLElement;
        container.style.position = 'fixed';
        container.style.top = '0';
        container.style.left = '0';
        container.style.right = '0';
        container.style.bottom = '0';
        container.style.zIndex = '100';  // Lower than SharePoint's toolbar
        container.style.height = '100vh';
        container.style.width = '100vw';
        container.style.maxWidth = '100vw';
        container.style.padding = '0';
        container.style.margin = '0';

        // Force layout recalculation (critical for SharePoint) - use requestAnimationFrame for smoother rendering
        requestAnimationFrame(() => {
          window.dispatchEvent(new Event('resize'));
        });
      }
    } catch (error) {
      Logger.error('Error applying fullscreen styles', error);
    }
  };

  /**
   * Reset SharePoint container styles to normal mode
   */
  private exitFullscreen = (): void => {
    try {
      // FLICKER FIX: Reset styles on the webPartDomElement (where CSS bootstrap was applied)
      if (this.props.webPartDomElement) {
        const container = this.props.webPartDomElement;
        container.style.position = '';
        container.style.top = '';
        container.style.left = '';
        container.style.right = '';
        container.style.bottom = '';
        container.style.zIndex = '';
        container.style.height = '';
        container.style.width = '';
        container.style.maxWidth = '';
        container.style.padding = '';
        container.style.margin = '';
        container.style.backgroundColor = '';

        Logger.debug('Reset fullscreen CSS bootstrap on web part container');
      }

      // Get our component element
      const bigCalElement = document.querySelector(`.${styles.bigCal}`);
      if (!bigCalElement) return;

      // Find SharePoint container using ProgramTracker's proven selectors
      const webpartContainer = document.querySelector('[data-sp-feature-tag="BigCalWebPart"]') ||
                              document.querySelector('.ControlZone') ||
                              bigCalElement.closest('.ControlZone') ||
                              bigCalElement.closest('.CanvasComponent');

      if (webpartContainer) {
        Logger.debug('Resetting SharePoint container to normal mode');

        // Reset to normal mode (ProgramTracker approach)
        const container = webpartContainer as HTMLElement;
        container.style.position = '';
        container.style.top = '';
        container.style.left = '';
        container.style.right = '';
        container.style.bottom = '';
        container.style.zIndex = '';
        container.style.height = '';
        container.style.width = '';
        container.style.maxWidth = '';
        container.style.padding = '';
        container.style.margin = '';

        // Set minimum height for normal mode
        container.style.minHeight = '600px';

        // Force layout recalculation - use requestAnimationFrame for smoother rendering
        requestAnimationFrame(() => {
          window.dispatchEvent(new Event('resize'));
        });
      }
    } catch (error) {
      Logger.error('Error resetting fullscreen styles', error);
    }
  };

  private toggleFullscreen = (): void => {
    const newFullscreenState = !this.state.isFullscreen;
    this.setState({ isFullscreen: newFullscreenState });

    if (newFullscreenState) {
      this.enterFullscreen();
    } else {
      this.exitFullscreen();
    }
  };

  private toggleProperties = (): void => {
    if (this.props.onConfigureProperties) {
      this.props.onConfigureProperties();
    }
  };

  private handleViewChange = (view: View): void => {
    this.setState({ currentView: view });
  };

  private handleNavigate = (date: Date): void => {
    this.setState({ currentDate: date });

    // Check if we need to load all events (lazy loading trigger)
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.checkAndLoadAllIfNeeded(date);
  };

  private handleShowMore = (events: ICalendarEvent[], date: Date): void => {
    Logger.debug(`Showing ${events.length} more events for ${date.toDateString()}`);
    // Switch to day view and navigate to the selected date
    this.setState({
      currentView: 'day',
      currentDate: date
    });
  };

  private eventStyleGetter = (event: ICalendarEvent): { className: string; style: React.CSSProperties } => {
    // Holiday events get special styling
    if (event.isHoliday) {
      const observedClass = event.isObserved ? 'holiday-observed' : '';
      return {
        className: `holiday-event ${observedClass}`,
        style: {
          backgroundColor: '#ff9800',
          color: 'white',
          border: 'none'
        }
      };
    }

    // Private events always get grey styling regardless of status
    if (event.isPrivate) {
      const statusClass = (event.status && event.status !== null) ? `status-${event.status.toLowerCase().replace(/\s+/g, '')}` : 'status-none';
      const swimlaneClass = (event.swimlane && event.swimlane !== null) ? `swimlane-${event.swimlane.toLowerCase().replace(/\s+/g, '')}` : 'swimlane-none';

      return {
        className: `private-event ${statusClass} ${swimlaneClass}`,
        style: {
          backgroundColor: '#8a8886', // Neutral grey color
          color: 'white',
          border: 'none'
        }
      };
    }

    // For agenda view, use minimal styling to avoid colorful backgrounds
    if (this.state.currentView === 'agenda') {
      const statusClass = (event.status && event.status !== null) ? `status-${event.status.toLowerCase().replace(/\s+/g, '')}` : 'status-none';
      const swimlaneClass = (event.swimlane && event.swimlane !== null) ? `swimlane-${event.swimlane.toLowerCase().replace(/\s+/g, '')}` : 'swimlane-none';

      return {
        className: `${statusClass} ${swimlaneClass}`,
        style: {
          backgroundColor: 'transparent',
          color: 'inherit',
          border: 'none'
        }
      };
    }

    // Regular events for other views (month, week, day)
    const statusClass = `status-${((event.status && event.status !== null) ? event.status : 'notset').toLowerCase().replace(/\s+/g, '')}`;
    const swimlaneClass = `swimlane-${((event.swimlane && event.swimlane !== null) ? event.swimlane : 'fysa').toLowerCase().replace(/\s+/g, '')}`;

    // Check if there are critical configuration issues that prevent color system from working
    // Only BigCalConfig missing or Public Events issues should disable colors
    const hasCriticalIssues = !this.state.colorMappingsAvailable || !this.state.publicEventsListAvailable;
    if (hasCriticalIssues) {
      return {
        className: `${statusClass} ${swimlaneClass} config-unavailable`,
        style: {
          backgroundColor: '#6c757d', // Gray when config unavailable
          color: 'white',
          border: 'none'
        }
      };
    }

    // Use Color Palette Studio system for all events
    const backgroundColor = this.getEventColorFromMapping(event.swimlane || 'FYSA', event.status || 'Confirmed');
    const textColor = this.getEventTextColorFromMapping(event.swimlane || 'FYSA', event.status || 'Confirmed');

    return {
      className: `${statusClass} ${swimlaneClass}`,
      style: {
        backgroundColor,
        color: textColor,
        border: 'none'
      }
    };
  };


  private getEventColorFromMapping = (swimlane: string, status: string): string => {
    // New color strategy: Confirmed and blank/null use swimlane color, Tentative uses its own color
    if (status === 'Tentative') {
      return this.state.dynamicColorMappings.get('Tentative') ||
             SPECIFIC_COLOR_MAPPINGS.Tentative ||
             '#ffc107'; // Yellow fallback for Tentative
    }

    // For Confirmed and blank/null status, use swimlane color
    return this.state.dynamicColorMappings.get(swimlane) ||
           SPECIFIC_COLOR_MAPPINGS[swimlane] ||
           '#6c757d'; // Gray fallback
  };

  private getEventTextColorFromMapping = (swimlane: string, status: string): string => {
    // Check if we should use dark text for this event
    const optionValue = status === 'Tentative' ? 'Tentative' : swimlane;

    // Find the color mapping to check useDarkText preference
    for (let i = 0; i < this.state.colorPaletteMappings.length; i++) {
      const mapping = this.state.colorPaletteMappings[i];
      if (mapping.optionValue === optionValue && mapping.isActive) {
        return mapping.useDarkText ? '#000000' : '#ffffff';
      }
    }

    // Default to white text
    return '#ffffff';
  };

  private getEventIconFromMapping = (swimlane: string, status: string): string => {
    // Check for dynamic icon mappings first
    // Priority: Status icon (if Tentative) > Swimlane icon > Static fallback
    if (status === 'Tentative') {
      const tentativeIcon = this.state.dynamicIconMappings.get('Tentative');
      if (tentativeIcon) {
        return tentativeIcon;
      }
    }

    // Check for swimlane icon
    const swimlaneIcon = this.state.dynamicIconMappings.get(swimlane);
    if (swimlaneIcon) {
      return swimlaneIcon;
    }

    // No fallback - only use Color Palette Studio icons
    return '';
  };

  private checkListConfigurations = async (): Promise<void> => {
    const issues: string[] = [];
    let colorMappingsAvailable = true;
    let publicEventsListAvailable = true;
    let privateEventsListAvailable = true;

    try {
      // Check BigCalConfig list
      try {
        const { ColorMappingService } = await import(/* webpackChunkName: 'color-mapping-service' */ '../services/ColorMappingService');
        const colorMappingService = new ColorMappingService(this.props.context);
        colorMappingsAvailable = await colorMappingService.checkConfigListExists();

        if (!colorMappingsAvailable) {
          issues.push('BigCalConfig list is missing - events will display in gray');
        }
      } catch (error) {
        colorMappingsAvailable = false;
        issues.push('BigCalConfig list validation failed');
        Logger.error('Error checking BigCalConfig', error);
      }

      // Check Public Events list (main list)
      try {
        const { SharePointService } = await import(/* webpackChunkName: 'sharepoint-service' */ '../services/SharePointService');
        const sharePointService = new SharePointService(this.props.context, this.props.listName);
        const publicListValidation = await sharePointService.validateList(this.props.listName, true);

        publicEventsListAvailable = publicListValidation.isValid;
        if (!publicEventsListAvailable) {
          if (!publicListValidation.listExists) {
            issues.push(`Public Events list '${this.props.listName}' does not exist`);
          } else if (publicListValidation.missingFields.length > 0) {
            issues.push(`Public Events list is missing required fields: ${publicListValidation.missingFields.join(', ')}`);
          } else {
            issues.push('Public Events list configuration is invalid');
          }
        }
      } catch (error) {
        publicEventsListAvailable = false;
        issues.push('Public Events list validation failed');
        Logger.error('Error checking Public Events list', error);
      }

      // Check PrivateEvents list - but only report issues to admin users
      try {
        const { SharePointService } = await import(/* webpackChunkName: 'sharepoint-service' */ '../services/SharePointService');
        const sharePointService = new SharePointService(this.props.context, this.props.listName);

        // First check if user can access PrivateEvents
        const canAccessPrivateEvents = await this.hybridEventsService.canUserAccessPrivateEvents();

        if (canAccessPrivateEvents) {
          // User has access - validate normally
          const privateListValidation = await sharePointService.validateList('PrivateEvents', true);
          privateEventsListAvailable = privateListValidation.isValid;

          // Only show PrivateEvents issues to admin users
          if (!privateEventsListAvailable && this.props.isUserAdmin) {
            if (!privateListValidation.listExists) {
              issues.push('PrivateEvents list does not exist - private events will not work');
            } else if (privateListValidation.missingFields.length > 0) {
              issues.push(`PrivateEvents list is missing required fields: ${privateListValidation.missingFields.join(', ')}`);
            } else {
              issues.push('PrivateEvents list configuration is invalid');
            }
          }
        } else {
          // User doesn't have access to PrivateEvents - this is normal for regular users
          // Don't add any issues, just mark as unavailable
          privateEventsListAvailable = false;
          Logger.debug('User does not have access to PrivateEvents - this is normal for regular users');
        }
      } catch (error) {
        privateEventsListAvailable = false;
        // Only show PrivateEvents errors to admin users
        if (this.props.isUserAdmin) {
          issues.push('PrivateEvents list validation failed');
        }
        Logger.error('Error checking PrivateEvents list', error);
      }

      // Update state with all results
      this.setState({
        colorMappingsAvailable,
        publicEventsListAvailable,
        privateEventsListAvailable,
        listConfigurationIssues: issues
      });

      // Log summary
      if (issues.length > 0) {
        Logger.warn(`BigCal configuration issues found (${issues.length})`, issues);
      }

    } catch (error) {
      Logger.error('Error during list configuration check', error);
      this.setState({
        colorMappingsAvailable: false,
        publicEventsListAvailable: false,
        privateEventsListAvailable: false,
        listConfigurationIssues: ['Failed to validate list configurations - check console for details']
      });
    }
  };







  private EventComponent = ({ event }: { event: ICalendarEvent }): React.ReactElement => {
    // Holiday events get special display
    if (event.isHoliday) {
      return (
        <div className={styles.customEvent}>
          <span
            className={styles.eventIcon}
            style={{ fontSize: '16px', marginRight: '6px' }}
          >
            🏛️
          </span>
          <span className={styles.eventTitle}>
            {event.title}
            {event.isObserved && ' (observed)'}
          </span>
        </div>
      );
    }

    // Private events get locked icon, regular events get dynamic category icon
    const iconName = event.isPrivate ? '🔒' : this.getEventIconFromMapping(event.swimlane!, event.status || '');

    return (
      <div
        className={styles.customEvent}
        onMouseEnter={(e) => {
          // Clear any existing timeout and show immediately for better responsiveness
          if (this.popoverTimeout) {
            window.clearTimeout(this.popoverTimeout);
            this.popoverTimeout = null;
          }
          this.showPopover(event, e.currentTarget as HTMLElement);
        }}
        onMouseLeave={() => {
          this.hidePopover();
        }}
      >
        <span
          className={styles.eventIcon}
          style={{ marginRight: '6px' }}
        >
          {this.renderIcon(iconName, '16px')}
        </span>
        <span className={styles.eventTitle}>{event.title}</span>
      </div>
    );
  };

  private MonthDateHeader = ({ date, label }: { date: Date; label: string }): React.ReactElement => {
    const handleNewEvent = (e: React.MouseEvent): void => {
      e.preventDefault();
      e.stopPropagation();

      // Open the create modal for this date
      this.openCreateModal(date);
    };

    return (
      <div className={styles.monthDateHeader}>
        <span className={styles.dateLabel}>{label}</span>
        <button
          className={styles.newEventButton}
          onClick={handleNewEvent}
          title="Create new event"
        >
          + New
        </button>
      </div>
    );
  };

  private MonthEvent = ({ event }: { event: ICalendarEvent }): React.ReactElement => {
    // Holiday events get special display
    if (event.isHoliday) {
      return (
        <div className={`${styles.customEvent} ${styles.monthEventItem}`}>
          <span
            className={styles.eventIcon}
            style={{ fontSize: '14px', marginRight: '4px' }}
          >
            🏛️
          </span>
          <span className={styles.eventTitle}>
            {event.title}
            {event.isObserved && ' (obs)'}
          </span>
        </div>
      );
    }

    // Private events get locked icon, regular events get dynamic category icon
    const iconName = event.isPrivate ? '🔒' : this.getEventIconFromMapping(event.swimlane!, event.status || '');

    return (
      <div
        className={`${styles.customEvent} ${styles.monthEventItem}`}
        onMouseEnter={(e) => {
          // Clear any existing timeout and show immediately for better responsiveness
          if (this.popoverTimeout) {
            window.clearTimeout(this.popoverTimeout);
            this.popoverTimeout = null;
          }
          this.showPopover(event, e.currentTarget as HTMLElement);
        }}
        onMouseLeave={() => {
          this.hidePopover();
        }}
      >
        <span
          className={styles.eventIcon}
          style={{ marginRight: '4px' }}
        >
          {this.renderIcon(iconName, '14px')}
        </span>
        <span className={styles.eventTitle}>{event.title}</span>
      </div>
    );
  };

  private MiniCalendarEvent = ({ event }: { event: ICalendarEvent }): React.ReactElement => {
    const displayTitle = event.isHoliday
      ? (event.title.length > 6 ? `${event.title.substring(0, 6)}...` : event.title)
      : (event.title.length > 8 ? `${event.title.substring(0, 8)}...` : event.title);

    // Determine CSS classes and inline styles based on event type
    let eventClasses = styles.miniEvent;
    let inlineStyles: React.CSSProperties = {};

    if (event.isHoliday) {
      eventClasses += ` ${styles.miniHolidayEvent}`;
    } else if (event.isPrivate) {
      eventClasses += ` ${styles.miniPrivateEvent}`;
    } else {
      // Regular events - apply dynamic color system
      const backgroundColor = this.getEventColorFromMapping(event.swimlane || 'FYSA', event.status || 'Confirmed');
      const textColor = this.getEventTextColorFromMapping(event.swimlane || 'FYSA', event.status || 'Confirmed');
      inlineStyles = {
        backgroundColor,
        color: textColor
      };
    }

    return (
      <div className={eventClasses} style={inlineStyles} title={event.title}>
        <span className={styles.miniEventText}>
          {event.isHoliday && '🏛️ '}
          {event.isPrivate && '🔒 '}
          {displayTitle}
        </span>
      </div>
    );
  };

  private openCreateModal = (date: Date): void => {
    this.setState({
      isModalOpen: true,
      selectedEvent: undefined,
      selectedDate: date
    });
  };

  private openEditModal = (event: ICalendarEvent): void => {
    this.setState({
      isModalOpen: true,
      selectedEvent: event,
      selectedDate: undefined
    });
  };

  private closeModal = (): void => {
    this.setState({
      isModalOpen: false,
      selectedEvent: undefined,
      selectedDate: undefined
    });
  };

  // Export/Print dialog methods
  private openExportDialog = (): void => {
    // Trigger load all events for Excel Export (users expect to export all events)
    if (this.state.isPartialLoad) {
      if (this.props.enablePerformanceLogging) {
        Logger.info('[Lazy Load] Opening Excel Export. Loading all events...');
      }
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.loadAllEvents();
    }

    this.setState({ isExportDialogOpen: true });
  };

  private closeExportDialog = (): void => {
    this.setState({ isExportDialogOpen: false });
  };

  private closePrintDialog = (): void => {
    this.setState({ isPrintDialogOpen: false });
  };

  // 🚀 LEGENDARY PRINT METHODS
  private openLegendaryPrint = (): void => {
    Logger.info('Opening Legendary Print Preview - prepare for awesomeness! 🎸');

    // Trigger load all events for Legendary Print (multi-month/week/day prints need all data)
    if (this.state.isPartialLoad) {
      if (this.props.enablePerformanceLogging) {
        Logger.info('[Lazy Load] Opening Legendary Print. Loading all events...');
      }
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.loadAllEvents();
    }

    this.setState({ isLegendaryPrintOpen: true });
  };

  private closeLegendaryPrint = (): void => {
    Logger.info('Closing Legendary Print Preview - hope you enjoyed the show! 🎭');
    this.setState({ isLegendaryPrintOpen: false });
  };

  private openIconSelector = (): void => {
    this.setState({ isIconSelectorOpen: true });
  };

  private closeIconSelector = (): void => {
    this.setState({ isIconSelectorOpen: false });
  };

  /**
   * Generate fallback field options when network operations fail
   * This ensures Legend Studio always shows complete data
   */
  private generateFallbackFieldOptions = (): IFieldOption[] => {
    const fallbackOptions: IFieldOption[] = [];

    // Standard swimlanes that should always be available
    const standardSwimlanes = [
      'CDR/DIR FYSA', 'DCDC', 'Delegated', 'DISA', 'DOD CIO / NSA / USCG', 'Exec Time',
      'Exercises', 'FO/SIG', 'FYSA', 'Holiday/Downday', 'Joint DISA & DCDC', 'Mission Partner',
      'Out of Office', 'Seniors', 'Speaking Event', 'TDY Meetings/Congressional', 'Transit'
    ];

    // Standard status options
    const standardStatuses = ['Confirmed', 'Tentative'];

    // Add swimlane options
    standardSwimlanes.forEach(swimlane => {
      fallbackOptions.push({
        fieldName: 'Swimlanes',
        optionValue: swimlane,
        isNewlyDiscovered: false,
        hasColorMapping: true,
        currentColor: undefined // Will be filled by fallback mappings
      });
    });

    // Add status options
    standardStatuses.forEach(status => {
      fallbackOptions.push({
        fieldName: 'Status',
        optionValue: status,
        isNewlyDiscovered: false,
        hasColorMapping: true,
        currentColor: undefined // Will be filled by fallback mappings
      });
    });

    return fallbackOptions;
  };

  /**
   * Generate fallback color mappings when network operations fail
   * Uses the original color mappings as fallback
   */
  private generateFallbackColorMappings = (options: IFieldOption[]): IColorMapping[] => {
    const fallbackMappings: IColorMapping[] = [];

    options.forEach((option, index) => {
      // Use original color mappings as fallback
      const originalColor = ORIGINAL_COLOR_MAPPINGS[option.optionValue];
      if (originalColor) {
        fallbackMappings.push({
          configType: 'ColorMapping',
          fieldName: option.fieldName,
          optionValue: option.optionValue,
          colorHex: originalColor,
          iconName: '', // No icons in fallback mode
          isActive: true,
          sortOrder: index + 1
        });
      }
    });

    return fallbackMappings;
  };

  // Color Palette Studio Methods
  private openColorPaletteStudio = async (): Promise<void> => {
    this.setState({ isColorPaletteStudioOpen: true, isColorPaletteLoading: true });

    try {
      const colorMappingService = new ColorMappingService(this.props.context);

      // Use timeout wrapper for the Promise.all to prevent hanging on slow networks
      const dataPromise = Promise.all([
        colorMappingService.discoverFieldOptions(this.props.listName),
        colorMappingService.getColorMappings()
      ]);

      const [discoveredOptions, colorMappings] = await withTimeout(
        dataPromise,
        NETWORK_TIMEOUTS.STANDARD,
        'Load Color Palette Studio data'
      );

      // Check for missing swimlanes that need BigCalConfig entries
      // Only count as missing if they don't have a color mapping (no BigCalConfig entry)
      const missingSwimlanesCount = discoveredOptions.filter(option =>
        option.fieldName === 'Swimlanes' &&
        !option.hasColorMapping && // This is the key - no BigCalConfig entry
        option.optionValue !== 'Private Events' // Skip virtual swimlane
      ).length;

      // Also check for orphaned BigCalConfig entries (swimlanes that no longer exist in SharePoint)
      const currentSwimlanes = new Set(discoveredOptions
        .filter(option => option.fieldName === 'Swimlanes' && option.optionValue !== 'Private Events')
        .map(option => option.optionValue)
      );

      const orphanedSwimlanesCount = colorMappings.filter(mapping =>
        mapping.fieldName === 'Swimlanes' &&
        mapping.optionValue !== 'Private Events' &&
        !currentSwimlanes.has(mapping.optionValue)
      ).length;

      // If we have missing OR orphaned swimlanes, offer to refresh
      const totalIssuesCount = missingSwimlanesCount + orphanedSwimlanesCount;
      if (totalIssuesCount > 0) {
        this.setState({
          isColorPaletteStudioOpen: false,
          isColorPaletteLoading: false,
          isSwimlanesRefreshModalOpen: true,
          missingSwimlanesCount: totalIssuesCount // Use total count for display
        });
        return;
      }

      this.setState({
        colorPaletteDiscoveredOptions: discoveredOptions,
        colorPaletteMappings: colorMappings,
        isColorPaletteLoading: false
      });
    } catch (error) {
      Logger.error('Failed to load Color Palette Studio data', error);

      // Provide fallback data so Legend Studio shows something useful instead of being empty
      const fallbackOptions = this.generateFallbackFieldOptions();
      const fallbackMappings = this.generateFallbackColorMappings(fallbackOptions);

      this.setState({
        colorPaletteDiscoveredOptions: fallbackOptions,
        colorPaletteMappings: fallbackMappings,
        isColorPaletteLoading: false
      });
    }
  };

  private saveColorMappings = async (mappings: IColorMapping[]): Promise<void> => {
    try {
      const colorMappingService = new ColorMappingService(this.props.context);
      await colorMappingService.saveBulkColorMappings(mappings);

      // Update local state with saved mappings
      // This ensures the Legend Studio UI shows the correct saved values
      this.setState({ colorPaletteMappings: mappings });

    } catch (error) {
      Logger.error('Failed to save color mappings', error);
      throw error; // Re-throw so ColorPaletteStudio can handle the error
    }
  };

  /**
   * Open Color Palette Studio with forced cache refresh
   * Used after refresh operations to ensure fresh data
   */
  private openColorPaletteStudioWithCacheRefresh = async (): Promise<void> => {
    this.setState({ isColorPaletteStudioOpen: true, isColorPaletteLoading: true });

    try {
      const colorMappingService = new ColorMappingService(this.props.context);

      // Force cache refresh to get latest data after refresh operations
      const dataPromise = Promise.all([
        colorMappingService.discoverFieldOptions(this.props.listName),
        colorMappingService.getColorMappings(true) // Force refresh = true
      ]);

      const [discoveredOptions, colorMappings] = await withTimeout(
        dataPromise,
        NETWORK_TIMEOUTS.STANDARD,
        'Load Color Palette Studio data with cache refresh'
      );

      // Check for missing swimlanes that need BigCalConfig entries
      // Only count as missing if they don't have a color mapping (no BigCalConfig entry)
      const missingSwimlanesCount = discoveredOptions.filter(option =>
        option.fieldName === 'Swimlanes' &&
        !option.hasColorMapping && // This is the key - no BigCalConfig entry
        option.optionValue !== 'Private Events' // Skip virtual swimlane
      ).length;

      // Also check for orphaned BigCalConfig entries (swimlanes that no longer exist in SharePoint)
      const currentSwimlanes = new Set(discoveredOptions
        .filter(option => option.fieldName === 'Swimlanes' && option.optionValue !== 'Private Events')
        .map(option => option.optionValue)
      );

      const orphanedSwimlanesCount = colorMappings.filter(mapping =>
        mapping.fieldName === 'Swimlanes' &&
        mapping.optionValue !== 'Private Events' &&
        !currentSwimlanes.has(mapping.optionValue)
      ).length;

      // If we still have missing OR orphaned swimlanes after refresh, something went wrong
      const totalIssuesCount = missingSwimlanesCount + orphanedSwimlanesCount;
      if (totalIssuesCount > 0) {
        Logger.warn(`Still detecting ${totalIssuesCount} swimlane issues after refresh operation (${missingSwimlanesCount} missing, ${orphanedSwimlanesCount} orphaned)`);
        // Show the refresh modal again, but this indicates a potential issue
        this.setState({
          isColorPaletteStudioOpen: false,
          isColorPaletteLoading: false,
          isSwimlanesRefreshModalOpen: true,
          missingSwimlanesCount: totalIssuesCount
        });
        return;
      }

      this.setState({
        colorPaletteDiscoveredOptions: discoveredOptions,
        colorPaletteMappings: colorMappings,
        isColorPaletteLoading: false
      });
    } catch (error) {
      Logger.error('Failed to load Color Palette Studio data with cache refresh', error);

      // Provide fallback data so Legend Studio shows something useful instead of being empty
      const fallbackOptions = this.generateFallbackFieldOptions();
      const fallbackMappings = this.generateFallbackColorMappings(fallbackOptions);

      this.setState({
        colorPaletteDiscoveredOptions: fallbackOptions,
        colorPaletteMappings: fallbackMappings,
        isColorPaletteLoading: false
      });
    }
  };

  // Swimlanes Refresh Modal Methods
  private closeSwimlanesRefreshModal = (): void => {
    this.setState({
      isSwimlanesRefreshModalOpen: false,
      missingSwimlanesCount: 0
    });
  };

  private handleSwimlanesRefreshComplete = (): void => {
    // After refresh is complete, reload swimlanes and automatically open Color Palette Studio
    // Add a small delay to ensure BigCalConfig changes are fully committed
    setTimeout(async () => {
      try {
        await this.loadAvailableSwimlanes();
        // Force cache refresh when opening Legend Studio after refresh
        await this.openColorPaletteStudioWithCacheRefresh();
      } catch (error) {
        Logger.error('Failed to reload data after swimlanes refresh', error);
      }
    }, 500); // 500ms delay to ensure SharePoint consistency
  };

  /**
   * Connect the public Events list to Outlook using stssync protocol
   */
  private connectToOutlook = async (): Promise<void> => {
    try {
      // Get site information
      const siteUrl = this.props.context.pageContext.web.absoluteUrl;
      const listGuid = await this.sharePointService.getListGuid(this.props.listName);

      // Extract server-relative path from site URL
      const siteUrlObj = new URL(siteUrl);
      const serverRelativePath = siteUrlObj.pathname;

      // Construct proper server-relative list URL
      const listUrl = `${serverRelativePath}/Lists/${this.props.listName}`;

      // Build stssync URL according to ChatGPT's recommendation
      const stssyncUrl = `stssync://sts/?ver=1.1&type=calendar&cmd=add-folder` +
        `&base-url=${encodeURIComponent(siteUrl)}` +
        `&list-url=${encodeURIComponent(listUrl)}` +
        `&guid=${encodeURIComponent(listGuid)}`;

      Logger.info('Attempting stssync connection', {
        siteUrl,
        listUrl,
        listGuid,
        stssyncUrl
      });

      // Try to open the stssync URL directly
      window.location.href = stssyncUrl;

    } catch (error) {
      Logger.error('Error with stssync approach, falling back to ribbon method', error);

      // Fallback: Open SharePoint list with ribbon focused on Calendar tab
      try {
        const siteUrl = this.props.context.pageContext.web.absoluteUrl;

        // Use ChatGPT's ribbon deep-link approach
        const ribbonUrl = `${siteUrl}/Lists/${this.props.listName}/calendar.aspx` +
          `?InitialTabId=Ribbon.Calendar&VisibilityContext=WSSTabPersistence`;

        // Show user instructions and open with ribbon focused
        const userConfirmed = confirm(
          `BigCal will open the SharePoint calendar with the ribbon ready.\n\n` +
          `The Calendar ribbon tab will be pre-selected so you can:\n` +
          `1. Click "Connect to Outlook" in the ribbon\n` +
          `2. Follow the prompts to sync with Outlook\n\n` +
          `Click OK to continue.`
        );

        if (userConfirmed) {
          window.open(ribbonUrl, '_blank');
          Logger.info('Opened SharePoint calendar with ribbon focused', {
            listName: this.props.listName,
            ribbonUrl
          });
        }

      } catch (fallbackError) {
        Logger.error('Both stssync and ribbon approaches failed', fallbackError);
        alert('Unable to connect to Outlook automatically. Please manually navigate to the SharePoint list and use the "Connect to Outlook" button in the ribbon.');
      }
    }
  };



  // Testing method - remove after testing
  private togglePrivilegeEmulation = (): void => {
    this.setState(prevState => ({
      emulateNonPrivilegedUser: !prevState.emulateNonPrivilegedUser
    }), () => {
      // Reload events to apply the privilege emulation
      this.loadEvents().catch(error => Logger.error('Failed to reload events after privilege toggle', error));
    });
  };

  // Handle immediate UI updates for imported events (for fast user feedback)
  private handleAddEventsToUI = (newEvents: ICalendarEvent[]): void => {
    this.setState(prevState => ({
      events: [...prevState.events, ...newEvents]
    }), () => {
      // Apply filters after adding events
      this.applyFilters();

      // Auto-navigate to the month of the first imported event for better UX
      if (newEvents.length > 0) {
        const firstEvent = newEvents[0];
        if (firstEvent.start) {
          const eventDate = firstEvent.start;
          // Only navigate if the event is in a different month than currently displayed
          const currentMonth = this.state.currentDate.getMonth();
          const currentYear = this.state.currentDate.getFullYear();
          const eventMonth = eventDate.getMonth();
          const eventYear = eventDate.getFullYear();

          if (currentMonth !== eventMonth || currentYear !== eventYear) {
            Logger.info(`Auto-navigating to ${eventDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} to show imported events`);
            // Create a new date with the event's year and month, but keep current day for navigation
            const navigationDate = new Date(eventYear, eventMonth, 1);
            this.setState({ currentDate: navigationDate });
          }
        }
      }
    });
  };

  // Handle import errors (only show errors, not successes)
  private handleImportError = (errorMessage: string): void => {
    Logger.error('Import error occurred', errorMessage);
    this.setState({
      error: `Import Error: ${errorMessage}`
    });
  };

  // Popover event handlers
  private showPopover = (event: ICalendarEvent, target: HTMLElement): void => {
    // Don't show popover for holiday events
    if (event.isHoliday) {
      return;
    }

    // Clear any existing timeout
    if (this.popoverTimeout) {
      window.clearTimeout(this.popoverTimeout);
      this.popoverTimeout = null;
    }

    Logger.debug(`Showing popover for event: ${event.title}`);

    this.setState({
      popoverEvent: event,
      popoverTarget: target,
      isPopoverVisible: true
    });
  };

  private hidePopover = (): void => {
    // Clear any existing timeout
    if (this.popoverTimeout) {
      window.clearTimeout(this.popoverTimeout);
    }

    // Set a small delay before hiding
    this.popoverTimeout = window.setTimeout(() => {
      Logger.debug('Hiding popover');
      this.setState({
        popoverEvent: undefined,
        popoverTarget: undefined,
        isPopoverVisible: false
      });
      this.popoverTimeout = null;
    }, 100);
  };

  private handlePopoverEdit = (): void => {
    if (this.state.popoverEvent) {
      // Hide popover and open edit modal
      this.setState({
        isPopoverVisible: false,
        isModalOpen: true,
        selectedEvent: this.state.popoverEvent,
        selectedDate: undefined,
        popoverEvent: undefined,
        popoverTarget: undefined
      });
    }
  };



  private handleSaveEvent = async (eventData: Partial<ICalendarEvent>): Promise<void> => {
    try {
      if (eventData.id) {
        // Update existing event using HybridEventsService
        const result = await this.hybridEventsService.updateEvent(
          eventData.id as number,
          eventData.title!,
          eventData.start!,
          eventData.end!,
          eventData.swimlane!,
          eventData.status!,
          eventData.imo || '',
          eventData.opr || '',
          eventData.description || '',
          eventData.notes || '',
          eventData.isPrivate || false
        );

        if (!result.success) {
          throw new Error(result.errorMessage || 'Failed to update event');
        }

        if (result.warning) {
          Logger.warn('Event update warning', result.warning);
        }

        Logger.debug('Event updated successfully');
      } else {
        // Create new event using HybridEventsService
        const result = await this.hybridEventsService.createEvent(
          eventData.title!,
          eventData.start!,
          eventData.end!,
          eventData.swimlane!,
          eventData.status!,
          eventData.imo || '',
          eventData.opr || '',
          eventData.description || '',
          eventData.notes || '',
          eventData.isPrivate || false
        );

        if (!result.success) {
          throw new Error(result.errorMessage || 'Failed to create event');
        }

        if (result.warning) {
          Logger.warn('Event creation warning', result.warning);
          // You could show this warning to the user if desired
        }

        Logger.debug('Event created successfully');
      }

      // Reload all events to ensure newly created/updated event is visible
      // (even if it's outside the lazy-loaded date range)
      await this.loadAllEvents();
    } catch (error) {
      Logger.error('Failed to save event', error);
      throw error; // Re-throw to let modal handle the error display
    }
  };

  private handleDeleteEvent = async (eventId: number | string): Promise<void> => {
    try {
      await this.sharePointService.deleteEvent(eventId as number);
      Logger.debug('Event deleted successfully');

      // Reload all events to ensure UI is fully refreshed after deletion
      await this.loadAllEvents();
    } catch (error) {
      Logger.error('Failed to delete event', error);
      throw error; // Re-throw to let modal handle the error display
    }
  };

  public render(): React.ReactElement<IBigCalProps> {
    const { hasTeamsContext } = this.props;
    const { events, isFullscreen, isLoading, error, currentView, currentDate, isModalOpen, selectedEvent, selectedDate, searchText, isSearchModalOpen, selectedEventCategories, selectedStatuses, selectedIMOs, selectedOPRs, viewMode, isExportDialogOpen, isPrintDialogOpen, isLegendaryPrintOpen, isIconSelectorOpen, isColorPaletteStudioOpen } = this.state;
    const showMiniCalendars = viewMode === 'calendar';
    const isCalendarLayoutMode = viewMode === 'calendar' || viewMode === 'briefing';

    // Combine regular events with holiday events and apply filters
    const allEventsWithHolidays = this.getAllEventsWithHolidays();
    const allFilteredEvents = this.applyFiltersToEvents(allEventsWithHolidays);

    const fullscreenIcon: IIconProps = {
      iconName: isFullscreen ? 'BackToWindow' : 'FullScreen'
    };

    const propertiesIcon: IIconProps = {
      iconName: 'Settings'
    };

    // Apply fullscreen class conditionally (ProgramTracker pattern)
    const containerClassName = isFullscreen
      ? `${styles.bigCal} ${styles.fullScreenMode} ${hasTeamsContext ? styles.teams : ''}`
      : `${styles.bigCal} ${hasTeamsContext ? styles.teams : ''}`;

    // Create dynamic CSS custom properties for grid line opacity
    const dynamicGridStyles: React.CSSProperties = {
      '--grid-line-opacity': this.props.gridLineOpacity.toString(),
      '--grid-border-color': `rgba(153, 153, 153, ${this.props.gridLineOpacity})`, // #999 with dynamic opacity
    } as React.CSSProperties;

    return (
      <div className={containerClassName} style={dynamicGridStyles}>
        {/* Navigation Bar - Conditional based on fullscreen mode */}
        {!isFullscreen ? (
          /* Configuration-focused navbar for non-fullscreen mode */
          <div className={styles.configNavbar}>
            <div className={styles.configMessage}>
              <Icon iconName="Settings" style={{ marginRight: '8px' }} />
              <span>Configuration Mode - Use fullscreen for normal operation</span>
            </div>
            <div className={styles.configButtons}>
              <IconButton
                iconProps={propertiesIcon}
                title="Configure Web Part Properties"
                onClick={this.toggleProperties}
                className={styles.navbarButton}
              />
              <IconButton
                iconProps={fullscreenIcon}
                title="Enter Fullscreen"
                onClick={this.toggleFullscreen}
                className={styles.navbarButton}
              />
            </div>
          </div>
        ) : (
          /* Full navbar with all features for fullscreen mode */
          <div className={styles.navbar}>
            <div className={styles.navbarLeft}>
              <IconButton
                iconProps={{ iconName: 'Search' }}
                title={searchText ? `Search: "${searchText}"` : 'Search events...'}
                onClick={this.toggleSearchModal}
                className={styles.navbarButton}
              />

              <Dropdown
                placeholder="Event Category"
                multiSelect
                options={this.getEventCategoryDropdownOptions()}
                selectedKeys={(() => {
                  const keys: string[] = [];
                  selectedEventCategories.forEach(key => keys.push(key));
                  return keys;
                })()}
                onChange={this.handleEventCategoryDropdownChange}
                onRenderOption={this.renderEventCategoryOption}
                onRenderTitle={this.renderEventCategoryTitle}
                calloutProps={{
                  styles: {
                    root: {
                      maxHeight: 'none', // Remove height restriction
                      overflowY: 'visible' // Remove scrollbar
                    },
                    calloutMain: {
                      maxHeight: 'none', // Remove height restriction on main callout
                      overflowY: 'visible' // Remove scrollbar
                    }
                  }
                }}
                styles={{
                  root: {
                    width: '250px', // Increased to prevent "TDY Meetings/Congressional" wrapping
                    minWidth: '230px',
                    maxWidth: '270px',
                    flex: '1 1 250px'
                  },
                  title: { fontSize: '13px' },
                  dropdownItemsWrapper: {
                    maxHeight: 'none' // Remove height restriction on items wrapper
                  },
                  dropdownItems: {
                    maxHeight: 'none' // Remove height restriction on items container
                  }
                }}
              />

              <Dropdown
                placeholder="Status"
                multiSelect
                options={this.getStatusDropdownOptions()}
                selectedKeys={(() => {
                  const keys: string[] = [];
                  selectedStatuses.forEach(key => keys.push(key));
                  return keys;
                })()}
                onChange={this.handleStatusDropdownChange}
                onRenderOption={this.renderStatusOption}
                onRenderTitle={this.renderStatusTitle}
                styles={{
                  root: {
                    width: '140px',
                    minWidth: '120px',
                    maxWidth: '160px',
                    flex: '1 1 140px'
                  },
                  title: { fontSize: '13px' }
                }}
              />

              <Dropdown
                placeholder="IMO"
                multiSelect
                options={this.getIMODropdownOptions()}
                selectedKeys={(() => {
                  const keys: string[] = [];
                  selectedIMOs.forEach(key => keys.push(key));
                  return keys;
                })()}
                onChange={this.handleIMODropdownChange}
                onRenderOption={this.renderIMOOption}
                onRenderTitle={this.renderIMOTitle}
                styles={{
                  root: {
                    width: '140px',
                    minWidth: '120px',
                    maxWidth: '160px',
                    flex: '1 1 140px'
                  },
                  title: { fontSize: '13px' }
                }}
              />

              <Dropdown
                placeholder="OPR"
                multiSelect
                options={this.getOPRDropdownOptions()}
                selectedKeys={(() => {
                  const keys: string[] = [];
                  selectedOPRs.forEach(key => keys.push(key));
                  return keys;
                })()}
                onChange={this.handleOPRDropdownChange}
                onRenderOption={this.renderOPROption}
                onRenderTitle={this.renderOPRTitle}
                styles={{
                  root: {
                    width: '290px', // Further optimized - still fits longest option with good margin
                    minWidth: '260px',
                    maxWidth: '320px',
                    flex: '1 1 290px'
                  },
                  title: { fontSize: '13px' }
                }}
              />
            </div>

            {/* Center section for icon selector */}
            {this.props.showIconSelector && (
              <div className={styles.navbarCenter}>
                {/* Icon Selector Button */}
                <IconButton
                  iconProps={{ iconName: 'Emoji2' }}
                  title="Icon Selection Helper"
                  onClick={this.openIconSelector}
                  className={styles.navbarButton}
                  styles={{
                    root: {
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.3)'
                    }
                  }}
                />
              </div>
            )}

            <div className={styles.navbarRight}>
              {/* Option 1: Pivot Component (Currently Active) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                <Pivot
                  selectedKey={viewMode}
                  onLinkClick={this.handleViewModeChange}
                  className={styles.viewPivot}
                  headersOnly={true}
                >
                  <PivotItem
                    headerText="Calendar"
                    itemKey="calendar"
                    itemIcon="Calendar"
                  />
                  <PivotItem
                    headerText="Briefing"
                    itemKey="briefing"
                    itemIcon="View"
                  />
                  <PivotItem
                    headerText="18-Month"
                    itemKey="grid"
                    itemIcon="GridViewMedium"
                  />
                  {this.props.showTimelineView && (
                    <PivotItem
                      headerText="Timeline"
                      itemKey="timeline"
                      itemIcon="Timeline"
                    />
                  )}
                </Pivot>

                {/* Reset button - only show when Timeline view is active */}
                {viewMode === 'timeline' && (
                  <IconButton
                    iconProps={{ iconName: 'Refresh' }}
                    title="Reset Timeline to Today"
                    onClick={this.handleTimelineReset}
                    styles={{
                      root: {
                        height: '32px',
                        width: '32px',
                        marginLeft: '4px'
                      },
                      icon: {
                        fontSize: '14px',
                        color: 'var(--themePrimary, #0078d4)'
                      }
                    }}
                  />
                )}
              </div>

              {/* Option 2: Individual Buttons (Alternative - Commented Out)
              <IconButton
                iconProps={{ iconName: 'Calendar' }}
                title="Calendar View"
                onClick={this.switchToCalendarView}
                className={`${styles.navbarButton} ${viewMode === 'calendar' ? styles.activeButton : ''}`}
              />
              <IconButton
                iconProps={{ iconName: 'GridViewMedium' }}
                title="18-Month View"
                onClick={this.switchToGridView}
                className={`${styles.navbarButton} ${viewMode === 'grid' ? styles.activeButton : ''}`}
              />
              <IconButton
                iconProps={{ iconName: 'Timeline' }}
                title="Timeline View"
                onClick={this.switchToTimelineView}
                className={`${styles.navbarButton} ${viewMode === 'timeline' ? styles.activeButton : ''}`}
              />
              */}
              <IconButton
                iconProps={{ iconName: 'ExcelDocument' }}
                title="Export to Excel"
                onClick={this.openExportDialog}
                className={styles.navbarButton}
              />
              <IconButton
                iconProps={{ iconName: 'Print' }}
                title="🚀 Legendary Print - WYSIWYG Print Preview"
                onClick={this.openLegendaryPrint}
                className={styles.navbarButton}
              />
              <IconButton
                iconProps={{ iconName: 'Color' }}
                title="🎨 Color Palette Studio"
                onClick={this.openColorPaletteStudio}
                className={styles.navbarButton}
              />
              <IconButton
                iconProps={{ iconName: 'Table' }}
                title="DataSheet View"
                onClick={this.openDataSheetModal}
                className={styles.navbarButton}
              />
              <IconButton
                iconProps={{ iconName: 'OutlookLogo' }}
                title="Connect to Outlook - Sync this calendar with Outlook"
                onClick={this.connectToOutlook}
                className={styles.navbarButton}
              />
              {/* Impersonate Button - Conditionally visible based on webpart property */}
              {this.props.showImpersonateButton && (
                <IconButton
                  iconProps={{ iconName: this.state.emulateNonPrivilegedUser ? 'RedEye' : 'View' }}
                  title={this.state.emulateNonPrivilegedUser ? "Testing: Non-Privileged User Mode" : "Testing: Normal User Mode"}
                  onClick={this.togglePrivilegeEmulation}
                  className={styles.navbarButton}
                  styles={{
                    root: {
                      backgroundColor: this.state.emulateNonPrivilegedUser ? '#d13438' : 'transparent',
                      color: this.state.emulateNonPrivilegedUser ? 'white' : 'inherit'
                    }
                  }}
                />
              )}
              <IconButton
                iconProps={propertiesIcon}
                title="Configure Web Part Properties"
                onClick={this.toggleProperties}
                className={styles.navbarButton}
              />
              <IconButton
                iconProps={fullscreenIcon}
                title="Exit Fullscreen"
                onClick={this.toggleFullscreen}
                className={styles.navbarButton}
              />
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className={styles.mainContent}>
          {isCalendarLayoutMode ? (
            <>
              {showMiniCalendars && (
                /* Left Column - Mini Calendars */
                <div className={styles.leftColumn}>
                  <div className={styles.leftColumnContent}>
                    <div className={styles.miniCalendarContainer}>
                      <div
                        className={styles.miniCalendarScrollArea}
                        ref={this.miniCalendarScrollAreaRef}
                        onScroll={this.handleMiniCalendarScroll}
                      >
                        {this.get18MonthRange().map((month, index) => {
                          const monthEvents = this.getEventsForMonth(month);
                          const isCurrentMonth = month.getFullYear() === currentDate.getFullYear() &&
                                               month.getMonth() === currentDate.getMonth();
                          const monthKey = `${month.getFullYear()}-${month.getMonth()}`;
                          return (
                            <div key={index} className={styles.miniCalendarWrapper}>
                              <div
                                className={`${styles.miniCalendarCard} ${isCurrentMonth ? styles.currentMonth : ''}`}
                                onClick={() => this.handleMonthNavigate(month)}
                                ref={(el) => {
                                  if (el) {
                                    this.miniCalendarRefs.set(monthKey, el);
                                  } else {
                                    this.miniCalendarRefs.delete(monthKey);
                                  }
                                }}
                              >
                                <div className={styles.miniCalendarTitle}>
                                  {formatMonthYear(month)} ({monthEvents})
                                </div>
                                <div className={styles.miniCalendarContent}>
                                  {/* Mini calendar will be rendered here */}
                                  <Calendar
                                    localizer={localizer}
                                    events={allFilteredEvents.filter(event =>
                                      event.start.getFullYear() === month.getFullYear() &&
                                      event.start.getMonth() === month.getMonth()
                                    )}
                                    startAccessor="start"
                                    endAccessor="end"
                                    style={{ height: '240px' }}
                                    views={['month']}
                                    view="month"
                                    date={month}
                                    toolbar={false}
                                    eventPropGetter={this.eventStyleGetter}
                                    components={{
                                      event: this.MiniCalendarEvent
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

          {/* Right Column - Calendar */}
          <div className={`${styles.rightColumn} ${!showMiniCalendars ? styles.rightColumnFullWidth : ''}`.trim()}>
            <div className={styles.calendarContainer}>
              {error && (
                <MessageBar messageBarType={MessageBarType.error} isMultiline>
                  {error}
                </MessageBar>
              )}

              {this.state.listConfigurationIssues.length > 0 && this.props.isUserAdmin && (
                <MessageBar messageBarType={MessageBarType.warning} isMultiline>
                  <strong>Configuration Issues Found ({this.state.listConfigurationIssues.length}):</strong>
                  <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                    {this.state.listConfigurationIssues.map((issue, index) => (
                      <li key={index}>{issue}</li>
                    ))}
                  </ul>
                  <strong>Solution:</strong> Open the webpart properties panel to create or fix the missing lists and fields.
                </MessageBar>
              )}

              {isLoading ? (
                <div className={styles.loadingContainer}>
                  <Spinner size={SpinnerSize.large} label="Loading events..." />
                </div>
              ) : (
                <Calendar
                  localizer={localizer}
                  events={allFilteredEvents}
                  startAccessor="start"
                  endAccessor="end"
                  style={{ height: isFullscreen ? 'calc(100vh - 84px)' : '552px' }}
                  views={['month', 'week', 'day', 'agenda']}
                  view={currentView}
                  date={currentDate}
                  onView={this.handleViewChange}
                  onNavigate={this.handleNavigate}
                  onShowMore={this.handleShowMore}
                  eventPropGetter={this.eventStyleGetter}
                  components={{
                    event: currentView === 'month' ? this.MonthEvent : this.EventComponent,
                    month: {
                      dateHeader: this.MonthDateHeader
                    }
                  }}
                  popup
                  onSelectEvent={(event) => {
                    // Don't allow editing holiday events or "Unavailable" private events
                    if (!event.isHoliday && !(event.isPrivate && event.title === 'Unavailable')) {
                      this.openEditModal(event);
                    }
                  }}
                  onSelectSlot={(slotInfo) => {
                    Logger.debug('Selected calendar slot', slotInfo.start);
                    // Open create modal with the selected date
                    this.openCreateModal(slotInfo.start);
                  }}
                  selectable
                />
              )}
            </div>
          </div>
            </>
          ) : viewMode === 'grid' ? (
            this.renderGridView()
          ) : viewMode === 'timeline' && this.props.showTimelineView ? (
            <Suspense fallback={<Spinner size={SpinnerSize.large} label="Loading Timeline View..." />}>
              <LazyTimelineView
                events={events}
                selectedEventCategories={selectedEventCategories}
                searchText={searchText}
                selectedStatuses={selectedStatuses}
                onEventClick={this.openEditModal}
                onEventDoubleClick={this.openEditModal}
                dynamicColorMappings={this.state.dynamicColorMappings}
              />
            </Suspense>
          ) : (
            // Fallback: if timeline is disabled but somehow selected, show message and switch to calendar
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <MessageBar messageBarType={MessageBarType.info}>
                Timeline view is disabled. Please enable it in the webpart properties or switch to Calendar view.
              </MessageBar>
            </div>
          )}
        </div>

        {/* Event Modal */}
        <EventModal
          isOpen={isModalOpen}
          event={selectedEvent}
          selectedDate={selectedDate}
          dynamicColorMappings={this.state.dynamicColorMappings}
          dynamicIconMappings={this.state.dynamicIconMappings}
          availableSwimlanes={this.state.availableSwimlanes}
          sharePointService={this.sharePointService}
          onSave={this.handleSaveEvent}
          onDelete={selectedEvent ? this.handleDeleteEvent : undefined}
          onClose={this.closeModal}
        />

        {/* DataSheet Modal */}
        {this.state.isDataSheetModalOpen && (
          <LazyComponentErrorBoundary componentName="DataSheetView">
            <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}><Spinner size={SpinnerSize.large} label="Loading DataSheet view..." /></div>}>
              <LazyDataSheetView
                context={this.props.context}
                listName={this.props.listName}
                events={allEventsWithHolidays}
                isLoading={isLoading}
                onEventsUpdated={this.loadEvents}
                isModal={true}
                onClose={this.closeDataSheetModal}
              />
            </Suspense>
          </LazyComponentErrorBoundary>
        )}

        {/* Export Manager - Handles Excel Export and Print */}
        <ExportManager
          context={this.props.context}
          events={events}
          filteredEvents={allFilteredEvents}
          currentView={currentView}
          currentDate={currentDate}
          isExcelExportOpen={isExportDialogOpen}
          isPrintDialogOpen={isPrintDialogOpen}
          onDismissExcelExport={this.closeExportDialog}
          onDismissPrintDialog={this.closePrintDialog}
          listName={this.props.listName}
          onEventsImported={this.loadEvents}
          onAddEventsToUI={this.handleAddEventsToUI}
          onImportError={this.handleImportError}
          dynamicColorMappings={this.state.dynamicColorMappings}
          colorPaletteMappings={this.state.colorPaletteMappings}
        />

        {/* Icon Selector Modal */}
        <IconSelector
          isOpen={isIconSelectorOpen}
          onDismiss={this.closeIconSelector}
        />

        {/* Color Palette Studio Modal */}
        <ColorPaletteStudio
          isOpen={isColorPaletteStudioOpen}
          onDismiss={() => {
            this.setState({ isColorPaletteStudioOpen: false });
          }}
          discoveredOptions={this.state.colorPaletteDiscoveredOptions}
          colorMappings={this.state.colorPaletteMappings}
          isLoading={this.state.isColorPaletteLoading}
          onSaveColorMappings={this.saveColorMappings}
          onColorsChanged={(updatedMappings: IColorMapping[]) => {
            // Update dynamic color and icon mappings from the provided local mappings
            // This ensures we use the latest changes immediately, not stale state
            this.updateDynamicMappingsFromMappings(updatedMappings);
          }}
        />

        {/* Swimlanes Refresh Modal */}
        <SwimlanesRefreshModal
          isOpen={this.state.isSwimlanesRefreshModalOpen}
          onDismiss={this.closeSwimlanesRefreshModal}
          onRefreshComplete={this.handleSwimlanesRefreshComplete}
          context={this.props.context}
          eventsListName={this.props.listName}
          missingSwimlanesCount={this.state.missingSwimlanesCount}
        />

        {/* 🚀 LEGENDARY PRINT PREVIEW - The Future of Calendar Printing! */}
        <LegendaryPrintPreview
          events={allFilteredEvents}
          isOpen={isLegendaryPrintOpen}
          onClose={this.closeLegendaryPrint}
          currentDate={currentDate}
          currentView={currentView}
          eventStyleGetter={this.eventStyleGetter}
          dynamicIconMappings={this.state.dynamicIconMappings}
          gridLineOpacity={this.props.gridLineOpacity}
        />

        {/* Event Popover */}
        {this.state.popoverEvent && (
          <EventPopover
            event={this.state.popoverEvent}
            target={this.state.popoverTarget}
            isVisible={this.state.isPopoverVisible}
            onDismiss={this.hidePopover}
            onEdit={this.handlePopoverEdit}
            dynamicIconMappings={this.state.dynamicIconMappings}
          />
        )}

        {/* Search Modal */}
        {isSearchModalOpen && (
          <div className={styles.searchModal}>
            <div className={styles.searchModalBackdrop} onClick={this.closeSearchModal} />
            <div className={styles.searchModalContent}>
              <div className={styles.searchModalHeader}>
                <Icon iconName="Search" style={{ marginRight: '8px', color: 'var(--themePrimary, #0078d4)' }} />
                <span style={{ fontWeight: '600', fontSize: '16px' }}>Search Events</span>
                <IconButton
                  iconProps={{ iconName: 'Cancel' }}
                  onClick={this.closeSearchModal}
                  styles={{
                    root: { marginLeft: 'auto', width: '32px', height: '32px' }
                  }}
                />
              </div>
              <div className={styles.searchModalBody}>
                <SearchBox
                  placeholder="Search events..."
                  value={searchText}
                  onChange={(_, newValue) => this.handleSearchChange(newValue || '')}
                  autoFocus
                  styles={{
                    root: { width: '100%' }
                  }}
                />
                {this.state.isPartialLoad && this.state.loadedDateRange && (
                  <MessageBar
                    messageBarType={MessageBarType.info}
                    styles={{ root: { marginTop: '12px' } }}
                    actions={
                      <div>
                        <IconButton
                          iconProps={{ iconName: 'Download' }}
                          title="Load all events"
                          ariaLabel="Load all events"
                          onClick={() => {
                            // eslint-disable-next-line @typescript-eslint/no-floating-promises
                            this.loadAllEvents();
                          }}
                          disabled={this.state.isLoadingFullDataset}
                        />
                      </div>
                    }
                  >
                    Searching {this.state.loadedDateRange.start.toLocaleDateString()} - {this.state.loadedDateRange.end.toLocaleDateString()} ({this.props.lazyLoadMonthsPast + 1 + this.props.lazyLoadMonthsFuture} months). Click to load all events.
                  </MessageBar>
                )}
                {searchText && (
                  <div style={{ marginTop: '12px', fontSize: '14px', color: 'var(--neutralSecondary, #605e5c)' }}>
                    Found {allFilteredEvents.filter(event => event.title.toLowerCase().indexOf(searchText.toLowerCase()) !== -1).length} events matching &ldquo;{searchText}&rdquo;
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
}
