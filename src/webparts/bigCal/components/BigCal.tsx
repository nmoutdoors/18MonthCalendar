/* eslint-disable max-lines */
// NOTE: This file is intentionally large due to the complexity of the calendar component.
// New features should be added as separate components rather than expanding this file further.
// See docs/component-refactoring-summary.md for refactoring guidelines.

import * as React from 'react';
import { Calendar, momentLocalizer, View } from 'react-big-calendar';
import * as moment from 'moment';
import { IconButton, IIconProps, Spinner, SpinnerSize, MessageBar, MessageBarType, Icon, SearchBox, Dropdown, IDropdownOption, Pivot, PivotItem } from '@fluentui/react';
import styles from './BigCal.module.scss';
import type { IBigCalProps } from './IBigCalProps';
import type { ICalendarEvent } from './ICalendarEvent';

import { SharePointService } from '../services/SharePointService';
import { HybridEventsService } from '../services/HybridEventsService';
import { SPECIFIC_COLOR_MAPPINGS } from '../interfaces/IColorMapping';
import { ColorMappingService } from '../services/ColorMappingService';

import { HolidayService } from '../services/HolidayService';
import { Logger } from '../services/LoggingService';
import { EventModal } from './EventModal';
import { EventPopover } from './EventPopover';
import { TimelineView } from './TimelineView';
import { ExportManager } from './ExportManager';
import { IconSelector } from './IconSelector';
import { GridView } from './GridView';
import { formatMonthYear, getEventCategoryIcon } from '../utils/BigCalUtilities';
import 'react-big-calendar/lib/css/react-big-calendar.css';

// Setup the localizer for react-big-calendar
const localizer = momentLocalizer(moment);

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
  selectedEventCategories: Set<string>;
  selectedStatuses: Set<string>;
  monthNavigatorExpanded: boolean;
  viewMode: 'calendar' | 'grid' | 'timeline';
  isExportDialogOpen: boolean;
  isPrintDialogOpen: boolean;
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
  // List configuration status
  colorMappingsAvailable: boolean;
  publicEventsListAvailable: boolean;
  privateEventsListAvailable: boolean;
  listConfigurationIssues: string[];
  // Dynamic color mappings from Color Palette Studio
  dynamicColorMappings: Map<string, string>;
}

export default class BigCal extends React.Component<IBigCalProps, IBigCalState> {
  private webPartElement: HTMLElement | null = null;
  private sharePointService: SharePointService;
  private hybridEventsService: HybridEventsService;
  private popoverTimeout: number | null = null;

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
      currentDate: new Date(),
      isModalOpen: false,
      selectedEvent: undefined,
      selectedDate: undefined,
      searchText: '',
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
        'Speaking Event',
        'TDY Meetings/Congressional',
        'Transit',
        'Private Events'
      ]), // All current swimlanes selected by default
      selectedStatuses: new Set(['Confirmed', 'Tentative', 'Not Set']), // All selected by default (Not Set = null/empty status)
      monthNavigatorExpanded: true,
      viewMode: 'calendar',
      isExportDialogOpen: false,
      isPrintDialogOpen: false,
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
      // List configuration status
      colorMappingsAvailable: true, // Will be checked on load
      publicEventsListAvailable: true, // Will be checked on load
      privateEventsListAvailable: true, // Will be checked on load
      listConfigurationIssues: [], // Will be populated on load
      // Dynamic color mappings from Color Palette Studio
      dynamicColorMappings: new Map()
    };

    this.sharePointService = new SharePointService(props.context, props.listName);
    this.hybridEventsService = new HybridEventsService(props.context, props.listName);
  }

  public async componentDidMount(): Promise<void> {
    // Add debug reference for console debugging
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).bigCalInstance = this;

    // Find the web part container element - try multiple selectors
    this.webPartElement = document.querySelector('[data-sp-web-part-id]') as HTMLElement ||
                         document.querySelector('.CanvasComponent') as HTMLElement ||
                         document.querySelector('[data-automation-id="CanvasComponent"]') as HTMLElement;

    if (this.webPartElement && this.state.isFullscreen) {
      this.enterFullscreen();
    }

    // Check all list configurations and load color mappings
    await Promise.all([
      this.checkListConfigurations(),
      this.loadDynamicColorMappings()
    ]);

    // Inject dynamic color styles
    this.injectDynamicStyles();

    // Load events from SharePoint
    await this.loadEvents();
  }

  /**
   * Handle property changes - ProgramTracker pattern
   */
  public componentDidUpdate(prevProps: IBigCalProps): void {
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

    // Dynamic styles are handled by Color Palette Studio changes
  }

  /**
   * Cleanup fullscreen styles on unmount - ProgramTracker pattern
   */
  public componentWillUnmount(): void {
    // Remove full screen styles if needed
    if (this.state.isFullscreen) {
      this.exitFullscreen();
    }
  }

  private loadDynamicColorMappings = async (): Promise<void> => {
    try {
      const colorMappingService = new ColorMappingService(this.props.context);
      const colorPaletteConfig = await colorMappingService.getColorPaletteConfig();

      // Combine swimlane and status colors into a single map
      const combinedMappings = new Map<string, string>();

      // Add swimlane colors
      colorPaletteConfig.swimlaneColors.forEach((color, swimlane) => {
        combinedMappings.set(swimlane, color);
      });

      // Add status colors
      colorPaletteConfig.statusColors.forEach((color, status) => {
        combinedMappings.set(status, color);
      });

      this.setState({ dynamicColorMappings: combinedMappings });
      Logger.debug('Loaded dynamic color mappings', combinedMappings);
    } catch (error) {
      Logger.error('Failed to load dynamic color mappings', error);
      // Fall back to static mappings
      const staticMappings = new Map<string, string>();
      for (const key in SPECIFIC_COLOR_MAPPINGS) {
        if (Object.prototype.hasOwnProperty.call(SPECIFIC_COLOR_MAPPINGS, key)) {
          staticMappings.set(key, SPECIFIC_COLOR_MAPPINGS[key]);
        }
      }
      this.setState({ dynamicColorMappings: staticMappings });
    }
  };

  private loadEvents = async (): Promise<void> => {
    try {
      this.setState({ isLoading: true, error: undefined });

      // Use HybridEventsService to get all events (public + private based on permissions)
      // Pass the emulation flag for testing
      const calendarEvents = await this.hybridEventsService.getAllEvents(this.state.emulateNonPrivilegedUser);

      this.setState({
        events: calendarEvents,
        isLoading: false
      }, () => {
        // Apply filters after events are loaded
        this.applyFilters();
      });
    } catch (error) {
      Logger.error('Failed to load events', error);
      this.setState({
        error: 'Failed to load events from SharePoint. Please check your connection and permissions.',
        isLoading: false
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





  private handleMonthNavigate = (month: Date): void => {
    this.setState({ currentDate: month, viewMode: 'calendar' });
  };

  private handleViewModeChange = (item?: PivotItem): void => {
    if (item?.props.itemKey) {
      this.setState({ viewMode: item.props.itemKey as 'calendar' | 'grid' | 'timeline' });
    }
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
    const current = new Date();

    for (let i = 0; i < 18; i++) {
      const month = new Date(current.getFullYear(), current.getMonth() + i, 1);
      months.push(month);
    }
    return months;
  };

  private getEventsForMonth = (month: Date): number => {
    const { events } = this.state;
    return events.filter(event => {
      return event.start.getFullYear() === month.getFullYear() &&
             event.start.getMonth() === month.getMonth();
    }).length;
  };



  private getEventCategoryDropdownOptions = (): IDropdownOption[] => {
    const { filteredEvents, selectedEventCategories } = this.state;
    const allCategories = [
      'DCDC',
      'DISA',
      'DOD CIO / NSA / USCC',
      'Exec Time',
      'Exercises',
      'FYSA',
      'Joint DISA & DCDC',
      'Mission Partner',
      'Out of Office',
      'Speaking Event',
      'TDY Meetings/Congressional',
      'Transit'
    ];

    // All categories are now available since we removed the problematic ones
    const categories = allCategories;

    const options = categories.map(eventCategory => {
      // Only count regular events, not holidays
      const count = filteredEvents.filter(e => !e.isHoliday && e.swimlane === eventCategory).length;
      return {
        key: eventCategory,
        text: `${eventCategory} (${count})`,
        data: { icon: getEventCategoryIcon(eventCategory), count }
      };
    });

    // Add Private Events option
    const privateCount = filteredEvents.filter(e => !e.isHoliday && e.isPrivate).length;
    options.push({
      key: 'Private Events',
      text: `Private Events (${privateCount})`,
      data: { icon: '🔒', count: privateCount }
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













  private injectDynamicStyles = (): void => {
    // Dynamic styles are now handled by the Color Palette Studio system
    // This method is kept for compatibility but does nothing
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
    const { searchText, selectedEventCategories, selectedStatuses } = this.state;

    return events.filter(event => {
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
        } else if (!event.isPrivate && selectedEventCategories.has(event.swimlane!)) {
          matchesCategory = true;
        }
      }

      // Check status match, including "Not Set" for events with no status
      let matchesStatus = false;
      if (selectedStatuses.size > 0) {
        if (selectedStatuses.has('Not Set') && (!event.status || event.status === 'Not Set')) {
          matchesStatus = true;
        } else if (event.status && selectedStatuses.has(event.status)) {
          matchesStatus = true;
        }
      }
      const matchesSearch = !searchText || event.title.toLowerCase().indexOf(searchText.toLowerCase()) !== -1;

      return matchesCategory && matchesStatus && matchesSearch;
    });
  };

  private handleEventCategoryDropdownChange = (event: React.FormEvent<HTMLDivElement>, option?: IDropdownOption): void => {
    if (option) {
      // Handle Select All/Unselect All toggle
      if (option.key === '__toggle_all_categories__') {
        // Use the actual swimlanes from the data instead of hardcoded legacy categories
        const allCategories = [
          'DCDC',
          'DISA',
          'DOD CIO / NSA / USCC',
          'Exec Time',
          'Exercises',
          'FYSA',
          'Joint DISA & DCDC',
          'Mission Partner',
          'Out of Office',
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
          fontSize: '16px',
          width: '18px',
          textAlign: 'center',
          display: 'inline-block'
        }}>
          {option.data?.icon}
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

        // Force layout recalculation (critical for SharePoint)
        window.dispatchEvent(new Event('resize'));
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

        // Force layout recalculation
        window.dispatchEvent(new Event('resize'));
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
      const statusClass = event.status ? `status-${event.status.toLowerCase().replace(/\s+/g, '')}` : 'status-none';
      const swimlaneClass = event.swimlane ? `swimlane-${event.swimlane.toLowerCase().replace(' ', '')}` : 'swimlane-none';

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
      const statusClass = event.status ? `status-${event.status.toLowerCase().replace(/\s+/g, '')}` : 'status-none';
      const swimlaneClass = event.swimlane ? `swimlane-${event.swimlane.toLowerCase().replace(' ', '')}` : 'swimlane-none';

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
    const statusClass = `status-${(event.status || 'notset').toLowerCase().replace(/\s+/g, '')}`;
    const swimlaneClass = `swimlane-${(event.swimlane || 'fysa').toLowerCase().replace(' ', '')}`;

    // Check if there are any configuration issues - if so, show all events as gray
    if (this.state.listConfigurationIssues.length > 0 || !this.state.colorMappingsAvailable) {
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

    return {
      className: `${statusClass} ${swimlaneClass}`,
      style: {
        backgroundColor,
        color: 'white',
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
        console.error('Error checking BigCalConfig:', error);
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
        console.error('Error checking Public Events list:', error);
      }

      // Check PrivateEvents list
      try {
        const { SharePointService } = await import(/* webpackChunkName: 'sharepoint-service' */ '../services/SharePointService');
        const sharePointService = new SharePointService(this.props.context, this.props.listName);
        const privateListValidation = await sharePointService.validateList('PrivateEvents', true);

        privateEventsListAvailable = privateListValidation.isValid;
        if (!privateEventsListAvailable) {
          if (!privateListValidation.listExists) {
            issues.push('PrivateEvents list does not exist - private events will not work');
          } else if (privateListValidation.missingFields.length > 0) {
            issues.push(`PrivateEvents list is missing required fields: ${privateListValidation.missingFields.join(', ')}`);
          } else {
            issues.push('PrivateEvents list configuration is invalid');
          }
        }
      } catch (error) {
        privateEventsListAvailable = false;
        issues.push('PrivateEvents list validation failed');
        console.error('Error checking PrivateEvents list:', error);
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
        console.warn(`BigCal configuration issues found (${issues.length}):`, issues);
      } else {
        console.log('All BigCal lists are properly configured');
      }

    } catch (error) {
      console.error('Error during list configuration check:', error);
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

    // Private events get locked icon, regular events get category icon
    const iconEmoji = event.isPrivate ? '🔒' : getEventCategoryIcon(event.swimlane!);

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
          style={{ fontSize: '16px', marginRight: '6px' }}
        >
          {iconEmoji}
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

    // Private events get locked icon, regular events get category icon
    const iconEmoji = event.isPrivate ? '🔒' : getEventCategoryIcon(event.swimlane!);

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
          style={{ fontSize: '14px', marginRight: '4px' }}
        >
          {iconEmoji}
        </span>
        <span className={styles.eventTitle}>{event.title}</span>
      </div>
    );
  };

  private MiniCalendarEvent = ({ event }: { event: ICalendarEvent }): React.ReactElement => {
    const displayTitle = event.isHoliday
      ? (event.title.length > 6 ? `${event.title.substring(0, 6)}...` : event.title)
      : (event.title.length > 8 ? `${event.title.substring(0, 8)}...` : event.title);

    // Determine CSS classes based on event type
    let eventClasses = styles.miniEvent;
    if (event.isHoliday) {
      eventClasses += ` ${styles.miniHolidayEvent}`;
    } else if (event.isPrivate) {
      eventClasses += ` ${styles.miniPrivateEvent}`;
    }

    return (
      <div className={eventClasses} title={event.title}>
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
    this.setState({ isExportDialogOpen: true });
  };

  private closeExportDialog = (): void => {
    this.setState({ isExportDialogOpen: false });
  };

  private openPrintDialog = (): void => {
    this.setState({ isPrintDialogOpen: true });
  };

  private closePrintDialog = (): void => {
    this.setState({ isPrintDialogOpen: false });
  };

  private openIconSelector = (): void => {
    this.setState({ isIconSelectorOpen: true });
  };

  private closeIconSelector = (): void => {
    this.setState({ isIconSelectorOpen: false });
  };

  // Color Palette Studio Methods
  private openColorPaletteStudio = (): void => {
    this.setState({ isColorPaletteStudioOpen: true });
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
          eventData.description || '',
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
          eventData.description || '',
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

      // Reload events to show changes
      await this.loadEvents();
    } catch (error) {
      Logger.error('Failed to save event', error);
      throw error; // Re-throw to let modal handle the error display
    }
  };

  private handleDeleteEvent = async (eventId: number | string): Promise<void> => {
    try {
      await this.sharePointService.deleteEvent(eventId as number);
      Logger.debug('Event deleted successfully');

      // Reload events to show changes
      await this.loadEvents();
    } catch (error) {
      Logger.error('Failed to delete event', error);
      throw error; // Re-throw to let modal handle the error display
    }
  };

  public render(): React.ReactElement<IBigCalProps> {
    const { hasTeamsContext } = this.props;
    const { events, isFullscreen, isLoading, error, currentView, currentDate, isModalOpen, selectedEvent, selectedDate, searchText, selectedEventCategories, selectedStatuses, viewMode, isExportDialogOpen, isPrintDialogOpen, isIconSelectorOpen } = this.state;

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

    return (
      <div className={containerClassName}>
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
              <SearchBox
                placeholder="Search events..."
                value={searchText}
                onChange={(_, newValue) => this.handleSearchChange(newValue || '')}
                styles={{
                  root: {
                    width: '180px',
                    minWidth: '120px',
                    maxWidth: '220px',
                    flex: '1 1 180px'
                  }
                }}
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
                styles={{
                  root: {
                    width: '280px',
                    minWidth: '250px',
                    maxWidth: '320px',
                    flex: '1 1 280px'
                  },
                  title: { fontSize: '13px' }
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
                    width: '170px',
                    minWidth: '120px',
                    maxWidth: '190px',
                    flex: '1 1 170px'
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
                    headerText="18-Month"
                    itemKey="grid"
                    itemIcon="GridViewMedium"
                  />
                  <PivotItem
                    headerText="Timeline"
                    itemKey="timeline"
                    itemIcon="Timeline"
                  />
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
                title="Print Calendar"
                onClick={this.openPrintDialog}
                className={styles.navbarButton}
              />
              <IconButton
                iconProps={{ iconName: 'Color' }}
                title="🎨 Color Palette Studio"
                onClick={this.openColorPaletteStudio}
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
          {viewMode === 'calendar' ? (
            <>
              {/* Left Column - Mini Calendars */}
              <div className={styles.leftColumn}>
                <div className={styles.leftColumnContent}>
                  <div className={styles.miniCalendarContainer}>
                    <div className={styles.miniCalendarScrollArea}>
                      {this.get18MonthRange().map((month, index) => {
                        const monthEvents = this.getEventsForMonth(month);
                        const isCurrentMonth = month.getFullYear() === currentDate.getFullYear() &&
                                             month.getMonth() === currentDate.getMonth();
                        return (
                          <div key={index} className={styles.miniCalendarWrapper}>
                            <div
                              className={`${styles.miniCalendarCard} ${isCurrentMonth ? styles.currentMonth : ''}`}
                              onClick={() => this.handleMonthNavigate(month)}
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

          {/* Right Column - Calendar */}
          <div className={styles.rightColumn}>
            <div className={styles.calendarContainer}>
              {error && (
                <MessageBar messageBarType={MessageBarType.error} isMultiline>
                  {error}
                </MessageBar>
              )}

              {this.state.listConfigurationIssues.length > 0 && (
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
          ) : (
            <TimelineView
              events={events}
              selectedEventCategories={selectedEventCategories}
              searchText={searchText}
              selectedStatuses={selectedStatuses}
              onEventClick={this.openEditModal}
              onEventDoubleClick={this.openEditModal}
              dynamicColorMappings={this.state.dynamicColorMappings}
            />
          )}
        </div>

        {/* Event Modal */}
        <EventModal
          isOpen={isModalOpen}
          event={selectedEvent}
          selectedDate={selectedDate}
          dynamicColorMappings={this.state.dynamicColorMappings}
          onSave={this.handleSaveEvent}
          onDelete={selectedEvent ? this.handleDeleteEvent : undefined}
          onClose={this.closeModal}
        />

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
        />

        {/* Icon Selector Modal */}
        <IconSelector
          isOpen={isIconSelectorOpen}
          onDismiss={this.closeIconSelector}
        />



        {/* Event Popover */}
        {this.state.popoverEvent && (
          <EventPopover
            event={this.state.popoverEvent}
            target={this.state.popoverTarget}
            isVisible={this.state.isPopoverVisible}
            onDismiss={this.hidePopover}
            onEdit={this.handlePopoverEdit}
          />
        )}
      </div>
    );
  }
}
