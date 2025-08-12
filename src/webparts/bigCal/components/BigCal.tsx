import * as React from 'react';
import { Calendar, momentLocalizer, View } from 'react-big-calendar';
import * as moment from 'moment';
import { IconButton, IIconProps, Spinner, SpinnerSize, MessageBar, MessageBarType, Icon, SearchBox, Dropdown, IDropdownOption, Pivot, PivotItem } from '@fluentui/react';
import styles from './BigCal.module.scss';
import type { IBigCalProps } from './IBigCalProps';
import type { ICalendarEvent } from './ICalendarEvent';
import { convertSharePointEventToCalendarEvent } from './ICalendarEvent';
import { SharePointService } from '../services/SharePointService';
import { ColorPaletteService } from '../services/ColorPaletteService';
import { HolidayService } from '../services/HolidayService';
import { EventModal } from './EventModal';
import { EventPopover } from './EventPopover';
import { TimelineView } from './TimelineView';
import { ExcelExport } from './ExcelExport';
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
  // Popover state
  popoverEvent?: ICalendarEvent;
  popoverTarget?: HTMLElement;
  isPopoverVisible: boolean;
}

export default class BigCal extends React.Component<IBigCalProps, IBigCalState> {
  private webPartElement: HTMLElement | null = null;
  private sharePointService: SharePointService;
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
      selectedEventCategories: new Set(['Away w/RON', 'Day Trip - NCR', 'Exercise', 'FYSA', 'Out of Office', 'Training Holiday', 'VIP/High Priority']), // All selected by default
      selectedStatuses: new Set(['Confirmed', 'Tentative', 'Canceled']), // All selected by default
      monthNavigatorExpanded: true,
      viewMode: 'calendar',
      isExportDialogOpen: false,
      // Popover state
      popoverEvent: undefined,
      popoverTarget: undefined,
      isPopoverVisible: false
    };

    this.sharePointService = new SharePointService(props.context);
  }

  public async componentDidMount(): Promise<void> {
    // Find the web part container element - try multiple selectors
    this.webPartElement = document.querySelector('[data-sp-web-part-id]') as HTMLElement ||
                         document.querySelector('.CanvasComponent') as HTMLElement ||
                         document.querySelector('[data-automation-id="CanvasComponent"]') as HTMLElement;

    if (this.webPartElement && this.state.isFullscreen) {
      this.enterFullscreen();
    }

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

    // Check if color palette has changed
    if (prevProps.colorPalette !== this.props.colorPalette) {
      this.injectDynamicStyles();
    }
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

  private async loadEvents(): Promise<void> {
    try {
      this.setState({ isLoading: true, error: undefined });

      const sharePointEvents = await this.sharePointService.getEvents();
      const calendarEvents = sharePointEvents.map(convertSharePointEventToCalendarEvent);

      this.setState({
        events: calendarEvents,
        isLoading: false
      }, () => {
        // Apply filters after events are loaded
        this.applyFilters();
      });
    } catch (error) {
      console.error('Failed to load events:', error);
      this.setState({
        error: 'Failed to load events from SharePoint. Please check your connection and permissions.',
        isLoading: false
      });
    }
  }

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



  private formatMonthYear = (date: Date): string => {
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  private getEventCategoryDropdownOptions = (): IDropdownOption[] => {
    const { filteredEvents, selectedEventCategories } = this.state;
    const categories = ['Away w/RON', 'Day Trip - NCR', 'Exercise', 'FYSA', 'Out of Office', 'Training Holiday', 'VIP/High Priority'];

    const options = categories.map(eventCategory => {
      // Only count regular events, not holidays
      const count = filteredEvents.filter(e => !e.isHoliday && e.swimlane === eventCategory).length;
      return {
        key: eventCategory,
        text: `${eventCategory} (${count})`,
        data: { icon: this.getEventCategoryIcon(eventCategory), count }
      };
    });

    // Add Select All/Unselect All toggle option
    const allSelected = categories.every(cat => selectedEventCategories.has(cat));
    options.push({
      key: '__toggle_all_categories__',
      text: allSelected ? 'Unselect All' : 'Select All',
      data: { icon: '', count: 0, isToggle: true, allSelected } as { icon: string; count: number; isToggle: boolean; allSelected: boolean }
    });

    return options;
  };

  private getStatusDropdownOptions = (): IDropdownOption[] => {
    const { filteredEvents, selectedStatuses } = this.state;
    const statuses = ['Confirmed', 'Tentative', 'Canceled'];

    const options = statuses.map(status => {
      // Only count regular events, not holidays
      const count = filteredEvents.filter(e => !e.isHoliday && e.status === status).length;
      return {
        key: status,
        text: `${status} (${count})`,
        data: {
          color: this.getStatusColor(status),
          count
        }
      };
    });

    // Add Select All/Unselect All toggle option
    const allSelected = statuses.every(status => selectedStatuses.has(status));
    options.push({
      key: '__toggle_all_statuses__',
      text: allSelected ? 'Unselect All' : 'Select All',
      data: { color: '', count: 0, isToggle: true, allSelected } as { color: string; count: number; isToggle: boolean; allSelected: boolean }
    });

    return options;
  };

  private getStatusColor = (status: string): string => {
    return ColorPaletteService.getStatusColor(status, this.props.colorPalette);
  };

  private generateDynamicStyles = (): string => {
    const palette = ColorPaletteService.getPalette(this.props.colorPalette);

    return `
      <style id="bigcal-dynamic-colors">
        .rbc-event.status-confirmed {
          background-color: ${palette.onTrack} !important;
          border-color: ${ColorPaletteService.getBorderColor('Confirmed', this.props.colorPalette)} !important;
        }

        .rbc-event.status-tentative {
          background-color: ${palette.atRisk} !important;
          border-color: ${ColorPaletteService.getBorderColor('Tentative', this.props.colorPalette)} !important;
          color: ${this.getContrastColor(palette.atRisk)} !important;
        }

        .rbc-event.status-canceled {
          background-color: ${palette.offTrack} !important;
          border-color: ${ColorPaletteService.getBorderColor('Canceled', this.props.colorPalette)} !important;
        }

        .vis-item.status-confirmed .vis-dot {
          background: ${ColorPaletteService.generateGradient('Confirmed', 'classic')} !important;
          border: 1px solid ${ColorPaletteService.getBorderColor('Confirmed', 'classic')} !important;
        }

        .vis-item.status-tentative .vis-dot {
          background: ${ColorPaletteService.generateGradient('Tentative', 'classic')} !important;
          border: 1px solid ${ColorPaletteService.getBorderColor('Tentative', 'classic')} !important;
        }

        .vis-item.status-canceled .vis-dot {
          background: ${ColorPaletteService.generateGradient('Canceled', 'classic')} !important;
          border: 1px solid ${ColorPaletteService.getBorderColor('Canceled', 'classic')} !important;
        }
      </style>
    `;
  };

  private getContrastColor = (hexColor: string): string => {
    // Convert hex to RGB
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    // Return black or white based on luminance
    return luminance > 0.5 ? '#323130' : '#ffffff';
  };

  private injectDynamicStyles = (): void => {
    // Remove existing dynamic styles
    const existingStyle = document.getElementById('bigcal-dynamic-colors');
    if (existingStyle) {
      existingStyle.remove();
    }

    // Create and inject new styles
    const styleElement = document.createElement('style');
    styleElement.id = 'bigcal-dynamic-colors';
    styleElement.innerHTML = this.generateDynamicStyles().replace(/<\/?style[^>]*>/g, '');
    document.head.appendChild(styleElement);
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

      // Regular event filters
      // Fix: When no categories are selected, show no events (not all events)
      // Fix: When no statuses are selected, show no events (not all events)
      // This matches user expectation that "Unselect All" hides everything
      const matchesCategory = selectedEventCategories.size > 0 && selectedEventCategories.has(event.swimlane!);
      const matchesStatus = selectedStatuses.size > 0 && selectedStatuses.has(event.status!);
      const matchesSearch = !searchText || event.title.toLowerCase().indexOf(searchText.toLowerCase()) !== -1;

      return matchesCategory && matchesStatus && matchesSearch;
    });
  };

  private handleEventCategoryDropdownChange = (event: React.FormEvent<HTMLDivElement>, option?: IDropdownOption): void => {
    if (option) {
      // Handle Select All/Unselect All toggle
      if (option.key === '__toggle_all_categories__') {
        const categories = ['Away w/RON', 'Day Trip - NCR', 'Exercise', 'FYSA', 'Out of Office', 'Training Holiday', 'VIP/High Priority'];
        const allSelected = option.data?.allSelected;
        const newSelected = allSelected ? new Set<string>() : new Set<string>(categories);

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
        const statuses = ['Confirmed', 'Tentative', 'Canceled'];
        const allSelected = option.data?.allSelected;
        const newSelected = allSelected ? new Set<string>() : new Set<string>(statuses);

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
      <div className={styles.gridViewContainer}>
        <div className={styles.gridViewHeader}>
          <h2>18-Month Overview</h2>
        </div>
        <div className={styles.gridViewContent}>
          {this.get18MonthRange().map((month, index) => {
            const monthEvents = allFilteredEvents.filter(event =>
              event.start.getFullYear() === month.getFullYear() &&
              event.start.getMonth() === month.getMonth()
            );
            const isCurrentMonth = month.getFullYear() === currentDate.getFullYear() &&
                                 month.getMonth() === currentDate.getMonth();

            return (
              <div
                key={index}
                className={`${styles.gridCard} ${isCurrentMonth ? styles.currentGridCard : ''}`}
                onClick={() => this.handleMonthNavigate(month)}
              >
                <div className={styles.gridCardHeader}>
                  <h3>{this.formatMonthYear(month)}</h3>
                  <span className={styles.gridCardCount}>({monthEvents.length})</span>
                </div>
                <div style={{ marginTop: '8px' }}>
                  <Calendar
                    localizer={localizer}
                    events={monthEvents}
                    startAccessor="start"
                    endAccessor="end"
                    style={{ height: '400px' }}
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
            );
          })}
        </div>
      </div>
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
        console.log('BigCalendar: Applying fullscreen styles to SharePoint container');

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
      console.error('BigCalendar: Error applying fullscreen styles:', error);
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
        console.log('BigCalendar: Resetting SharePoint container to normal mode');

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
      console.error('BigCalendar: Error resetting fullscreen styles:', error);
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
    console.log(`Showing more events for ${date.toDateString()}:`, events);
    // Switch to day view and navigate to the selected date
    this.setState({
      currentView: 'day',
      currentDate: date
    });
  };

  private eventStyleGetter = (event: ICalendarEvent): { className: string } => {
    // Holiday events get special styling
    if (event.isHoliday) {
      const observedClass = event.isObserved ? 'holiday-observed' : '';
      return {
        className: `holiday-event ${observedClass}`
      };
    }

    // Regular events
    const statusClass = `status-${event.status!.toLowerCase().replace(/\s+/g, '')}`;
    const swimlaneClass = `swimlane-${event.swimlane!.toLowerCase().replace(' ', '')}`;

    return {
      className: `${statusClass} ${swimlaneClass}`
    };
  };

  private getEventCategoryIcon = (eventCategory: string): string => {
    // Return Unicode emoji symbols for consistent display across all views
    switch (eventCategory) {
      case 'Away w/RON':
        return '✈️'; // Airplane
      case 'Day Trip - NCR':
        return '📍'; // Map pin
      case 'Exercise':
        return '🏃'; // Running person
      case 'FYSA':
        return 'ℹ️'; // Information
      case 'Out of Office':
        return '🚪'; // Door (leave)
      case 'Training Holiday':
        return '🎓'; // Graduation cap (education)
      case 'VIP/High Priority':
        return '⚠️'; // Warning (important)
      default:
        return 'ℹ️'; // Information
    }
  };



  private EventComponent = ({ event }: { event: ICalendarEvent }): React.ReactElement => {
    // Holiday events get special display
    if (event.isHoliday) {
      return (
        <div className={styles.customEvent}>
          <span
            className={styles.eventIcon}
            style={{ fontSize: '14px', marginRight: '6px' }}
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

    // Regular events
    const iconEmoji = this.getEventCategoryIcon(event.swimlane!);

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
          style={{ fontSize: '14px', marginRight: '6px' }}
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
            style={{ fontSize: '12px', marginRight: '4px' }}
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

    // Regular events
    const iconEmoji = this.getEventCategoryIcon(event.swimlane!);

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
          style={{ fontSize: '12px', marginRight: '4px' }}
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

    return (
      <div className={`${styles.miniEvent} ${event.isHoliday ? styles.miniHolidayEvent : ''}`} title={event.title}>
        <span className={styles.miniEventText}>
          {event.isHoliday && '🏛️ '}{displayTitle}
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

  private openExportDialog = (): void => {
    this.setState({ isExportDialogOpen: true });
  };

  private closeExportDialog = (): void => {
    this.setState({ isExportDialogOpen: false });
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

    console.log('Showing popover for event:', event.title); // Debug log

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
      console.log('Hiding popover'); // Debug log
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

  private handleImportEvents = async (importedEvents: ICalendarEvent[]): Promise<void> => {
    try {
      // Add imported events to SharePoint list
      const addPromises = importedEvents.map(event =>
        this.sharePointService.createEvent(
          event.title,
          event.start,
          event.end,
          event.swimlane,
          event.status,
          event.description || ''
        )
      );

      await Promise.all(addPromises);

      // Refresh the events list
      await this.loadEvents();

      // Show success message (you could add a state for this)
      console.log(`Successfully imported ${importedEvents.length} events`);

    } catch (error) {
      console.error('Error importing events:', error);
      // Handle error (you could add error state/message)
    }
  };

  private handleSaveEvent = async (eventData: Partial<ICalendarEvent>): Promise<void> => {
    try {
      if (eventData.id) {
        // Update existing event
        await this.sharePointService.updateEvent(
          eventData.id as number,
          eventData.title!,
          eventData.start!,
          eventData.end!,
          eventData.swimlane!,
          eventData.status!,
          eventData.description
        );
        console.log('Event updated successfully');
      } else {
        // Create new event
        await this.sharePointService.createEvent(
          eventData.title!,
          eventData.start!,
          eventData.end!,
          eventData.swimlane!,
          eventData.status!,
          eventData.description || ''
        );
        console.log('Event created successfully');
      }

      // Reload events to show changes
      await this.loadEvents();
    } catch (error) {
      console.error('Failed to save event:', error);
      throw error; // Re-throw to let modal handle the error display
    }
  };

  private handleDeleteEvent = async (eventId: number | string): Promise<void> => {
    try {
      await this.sharePointService.deleteEvent(eventId as number);
      console.log('Event deleted successfully');

      // Reload events to show changes
      await this.loadEvents();
    } catch (error) {
      console.error('Failed to delete event:', error);
      throw error; // Re-throw to let modal handle the error display
    }
  };

  public render(): React.ReactElement<IBigCalProps> {
    const { hasTeamsContext } = this.props;
    const { events, isFullscreen, isLoading, error, currentView, currentDate, isModalOpen, selectedEvent, selectedDate, searchText, selectedEventCategories, selectedStatuses, viewMode, isExportDialogOpen } = this.state;

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
                  root: { width: '250px', marginRight: '16px' }
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
                  root: { width: '250px', marginRight: '16px' },
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
                  root: { width: '250px', marginRight: '16px' },
                  title: { fontSize: '13px' }
                }}
              />
            </div>

            <div className={styles.navbarRight}>
              {/* Option 1: Pivot Component (Currently Active) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
              {/* Left Column */}
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
                            {this.formatMonthYear(month)} ({monthEvents})
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
                    // Don't allow editing holiday events
                    if (!event.isHoliday) {
                      this.openEditModal(event);
                    }
                  }}
                  onSelectSlot={(slotInfo) => {
                    console.log('Selected slot:', slotInfo);
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
              colorPalette="classic"
              selectedEventCategories={selectedEventCategories}
              searchText={searchText}
              selectedStatuses={selectedStatuses}
              onEventClick={this.openEditModal}
              onEventDoubleClick={this.openEditModal}
            />
          )}
        </div>

        {/* Event Modal */}
        <EventModal
          isOpen={isModalOpen}
          event={selectedEvent}
          selectedDate={selectedDate}
          colorPalette={this.props.colorPalette}
          onSave={this.handleSaveEvent}
          onDelete={selectedEvent ? this.handleDeleteEvent : undefined}
          onClose={this.closeModal}
        />

        {/* Excel Export Dialog */}
        <ExcelExport
          isOpen={isExportDialogOpen}
          events={allFilteredEvents}
          currentDate={currentDate}
          onDismiss={this.closeExportDialog}
          onImportEvents={this.handleImportEvents}
        />

        {/* Event Popover */}
        {this.state.popoverEvent && (
          <EventPopover
            event={this.state.popoverEvent}
            target={this.state.popoverTarget}
            isVisible={this.state.isPopoverVisible}
            onDismiss={this.hidePopover}
            onEdit={this.handlePopoverEdit}
            colorPalette={this.props.colorPalette}
          />
        )}
      </div>
    );
  }
}
