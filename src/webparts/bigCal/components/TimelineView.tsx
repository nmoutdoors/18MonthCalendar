import * as React from 'react';
import { Timeline, DataSet } from 'vis-timeline/standalone';
import 'vis-timeline/styles/vis-timeline-graph2d.css';
import { ICalendarEvent } from './ICalendarEvent';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import { EventPopover } from './EventPopover';
import styles from './TimelineView.module.scss';

export interface ITimelineViewProps {
  events: ICalendarEvent[];
  selectedEventCategories: Set<string>;
  searchText?: string;
  selectedStatuses?: Set<string>;
  onEventClick?: (event: ICalendarEvent) => void;
  onEventDoubleClick?: (event: ICalendarEvent) => void;
}

export interface ITimelineViewState {
  timeline: Timeline | undefined;
  isLoading: boolean;
  currentHeight: number;
  hoveredEvent: ICalendarEvent | undefined;
  hoveredElement: HTMLElement | undefined;
}

export class TimelineView extends React.Component<ITimelineViewProps, ITimelineViewState> {
  private timelineRef = React.createRef<HTMLDivElement>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private items: DataSet<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private groups: DataSet<any>;
  private isUpdating: boolean = false;

  constructor(props: ITimelineViewProps) {
    super(props);
    this.state = {
      timeline: undefined,
      isLoading: true,
      currentHeight: 770, // Default height
      hoveredEvent: undefined,
      hoveredElement: undefined
    };

    // Initialize DataSets
    this.items = new DataSet([]);
    this.groups = new DataSet([]);
  }

  public componentDidMount(): void {
    console.log('Timeline componentDidMount - events:', this.props.events.length, 'selected categories:', this.props.selectedEventCategories.size);
    this.initializeTimeline();

    // Add custom mouse wheel handling
    if (this.timelineRef.current) {
      this.timelineRef.current.addEventListener('wheel', this.handleMouseWheel, { passive: false });
    }

    // Listen for timeline reset events
    window.addEventListener('timelineReset', this.handleTimelineReset);
  }

  public componentWillUnmount(): void {
    // Clean up event listeners
    if (this.timelineRef.current) {
      this.timelineRef.current.removeEventListener('wheel', this.handleMouseWheel);
    }
    window.removeEventListener('timelineReset', this.handleTimelineReset);

    // Destroy timeline instance
    if (this.state.timeline) {
      this.state.timeline.destroy();
    }
  }

  public componentDidUpdate(prevProps: ITimelineViewProps): void {
    console.log('Timeline componentDidUpdate - events changed:', prevProps.events.length, '->', this.props.events.length);
    console.log('Timeline componentDidUpdate - categories changed:', prevProps.selectedEventCategories.size, '->', this.props.selectedEventCategories.size);

    if (prevProps.events !== this.props.events ||
        prevProps.searchText !== this.props.searchText ||
        prevProps.selectedStatuses !== this.props.selectedStatuses) {
      console.log('Timeline updating due to events/search/status change - setting loading to true');
      // Show loading when events or filters change
      this.setState({ isLoading: true }, () => {
        // When events change, we need to update groups first (they're discovered from events)
        // then update the timeline data
        this.updateGroupsVisibility();
        this.updateTimelineData();
      });
    }

    // Update groups visibility when selected event categories change
    if (prevProps.selectedEventCategories !== this.props.selectedEventCategories) {
      console.log('Timeline updating due to category selection change');
      this.updateGroupsVisibility();
    }
  }

  private initializeTimeline = (): void => {
    if (!this.timelineRef.current) return;

    // Groups will be dynamically created based on actual event data
    // Initialize with empty groups - they'll be populated in updateGroupsVisibility
    this.groups.clear();

    // Set initial date range (ProgramTracker approach)
    const today = new Date();
    const startDate = new Date();
    startDate.setDate(today.getDate() - 5);  // 5 days before today
    const endDate = new Date();
    endDate.setDate(today.getDate() + 20);   // 20 days after today

    console.log('Timeline date range calculation:');
    console.log('Today:', today);
    console.log('Start date:', startDate);
    console.log('End date:', endDate);

    // Timeline options
    const options = {
      height: '770px',
      autoResize: true,
      groupOrder: 'id',
      editable: false,
      selectable: true,
      stack: true,
      stackSubgroups: true,
      showCurrentTime: true,

      // CRITICAL: Clustering disabled by omitting cluster property
      // This prevents vis-timeline from clustering nearby events into groups

      // Critical interaction settings
      zoomable: true,
      zoomKey: 'ctrlKey' as const, // Require Ctrl key for zoom (prevents accidental zoom)
      moveable: true,

      // Scrolling behavior
      verticalScroll: true,
      horizontalScroll: true,

      // Grid and labels for better navigation
      showMajorLabels: true,
      showMinorLabels: true,

      // Default view range (ProgramTracker approach)
      start: startDate,    // Initial start date
      end: endDate,        // Initial end date

      zoomMin: 1000 * 60 * 60 * 24, // 1 day
      zoomMax: 1000 * 60 * 60 * 24 * 365 * 2, // 2 years
      orientation: {
        axis: 'top',
        item: 'bottom'
      },
      margin: {
        item: {
          horizontal: 10,
          vertical: 15               // Space between items vertically (key for stacking)
        },
        axis: 5
      },
      order: function(a: { start: number }, b: { start: number }) {
        return a.start - b.start;    // Earlier dates stack higher
      },
      format: {
        minorLabels: {
          millisecond: 'SSS',
          second: 's',
          minute: 'HH:mm',
          hour: 'HH:mm',
          weekday: 'ddd D',
          day: 'D',
          week: 'w',
          month: 'MMM',
          year: 'YYYY'
        },
        majorLabels: {
          millisecond: 'HH:mm:ss',
          second: 'D MMMM HH:mm',
          minute: 'ddd D MMMM',
          hour: 'ddd D MMMM',
          weekday: 'MMMM YYYY',
          day: 'MMMM YYYY',
          week: 'MMMM YYYY',
          month: 'YYYY',
          year: ''
        }
      }
    };

    // Create timeline
    console.log('Creating new Timeline instance');
    const timeline = new Timeline(this.timelineRef.current, this.items, this.groups, options);
    console.log('Timeline instance created');

    // Add event listeners
    timeline.on('select', (properties: { items: number[] }) => {
      if (properties.items.length > 0 && this.props.onEventClick) {
        const itemId = properties.items[0];
        const event = this.props.events.filter((e: ICalendarEvent) => e.id === itemId)[0];
        if (event) {
          // Don't allow editing holiday events or "Unavailable" private events (same logic as calendar view)
          if (!event.isHoliday && !(event.isPrivate && event.title === 'Unavailable')) {
            this.props.onEventClick(event);
          }
          // Deselect item to allow re-selection
          timeline.setSelection([]);
        }
      }
    });

    timeline.on('doubleClick', (properties: { item: number }) => {
      if (properties.item && this.props.onEventDoubleClick) {
        const event = this.props.events.filter((e: ICalendarEvent) => e.id === properties.item)[0];
        if (event) {
          // Don't allow editing holiday events or "Unavailable" private events (same logic as calendar view)
          if (!event.isHoliday && !(event.isPrivate && event.title === 'Unavailable')) {
            this.props.onEventDoubleClick(event);
          }
        }
      }
    });

    // Add vis.js native event handlers for popovers
    timeline.on('itemover', (properties: { item: number; event: Event }) => {
      const element = properties.event.target as HTMLElement;
      this.handleItemMouseOver(properties.item, element);
    });

    timeline.on('itemout', () => {
      this.handleItemMouseOut();
    });

    // Listen for multiple timeline events to ensure we catch when rendering is complete
    const hideLoadingSpinner = (): void => {
      if (this.state.isLoading) {
        // Use double requestAnimationFrame to ensure all DOM updates are complete
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            // Additional check to ensure timeline is actually rendered
            const timelineElement = this.timelineRef.current;
            if (timelineElement && timelineElement.querySelector('.vis-item')) {
              this.setState({ isLoading: false });
            } else {
              // If no items are visible yet, wait a bit more
              setTimeout(() => {
                this.setState({ isLoading: false });
              }, 200);
            }
          });
        });
      }
    };

    // Listen to various vis.js events
    timeline.on('changed', hideLoadingSpinner);
    timeline.on('rangechanged', () => {
      hideLoadingSpinner();
      // Recalculate height when zoom/pan changes affect visible content
      this.recalculateTimelineHeight();
    });

    // Try to listen for redraw events (vis.js internal)
    try {
      timeline.on('redraw', () => {
        hideLoadingSpinner();
        // Recalculate height after redraw to optimize space usage
        this.recalculateTimelineHeight();
      });
    } catch {
      // Redraw event might not be available in all vis.js versions
    }

    // Fallback timeout in case events don't fire properly
    setTimeout(() => {
      if (this.state.isLoading) {
        this.setState({ isLoading: false });
      }
    }, 3000);

    this.setState({ timeline }, () => {
      console.log('Timeline setState callback - initializing with events:', this.props.events.length);
      // Initialize with proper height and groups
      this.updateGroupsVisibility();
      this.updateTimelineData();
    });
  };

  private getEventCategoryIcon = (eventCategory: string): string => {
    // Return Unicode symbols that will display reliably
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
      case 'Private Events':
        return '🔒'; // Lock (private)
      default:
        return 'ℹ️'; // Information
    }
  };



  private generateEventContent = (event: ICalendarEvent): string => {
    // Private events get locked icon, regular events get category icon
    const iconSymbol = event.isPrivate ? '🔒' : this.getEventCategoryIcon(event.swimlane || 'FYSA');

    // Generate HTML content with Unicode emoji icon and title
    // Unicode symbols display reliably across all contexts
    return `<span class="timeline-event-content" style="display: inline-flex; align-items: center; font-family: 'Segoe UI', system-ui, sans-serif;">
      <span style="margin-right: 8px; font-size: 16px; flex-shrink: 0; display: inline-block; width: 18px; text-align: center;">${iconSymbol}</span>
      <span style="font-size: 13px; line-height: 1.2; font-weight: 500;">${event.title}</span>
    </span>`;
  };

  private updateGroupsVisibility = (): void => {
    console.log('updateGroupsVisibility called - timeline exists:', !!this.state.timeline);
    if (!this.state.timeline) return;

    // Dynamically discover all unique swimlanes from events data
    const discoveredSwimlanes = new Set<string>();

    // Add swimlanes from actual events
    this.props.events.forEach(event => {
      if (event.isPrivate) {
        discoveredSwimlanes.add('Private Events');
      } else if (event.swimlane) {
        discoveredSwimlanes.add(event.swimlane);
      }
    });

    // Convert to sorted array for consistent ordering
    const allEventCategories: string[] = [];
    discoveredSwimlanes.forEach(swimlane => allEventCategories.push(swimlane));
    allEventCategories.sort();

    console.log('Discovered swimlanes:', allEventCategories);
    console.log('Selected categories size:', this.props.selectedEventCategories.size);
    const selectedArray: string[] = [];
    this.props.selectedEventCategories.forEach(cat => selectedArray.push(cat));
    console.log('Selected categories:', selectedArray);



    // Create groups array with only selected categories
    const visibleGroups = allEventCategories
      .filter((category: string) => this.props.selectedEventCategories.has(category))
      .map((category: string) => ({
        id: category,
        content: category,
        className: `eventcategory-${category.toLowerCase().replace(/[^a-z0-9]/g, '')}`
      }));

    console.log('Visible groups count:', visibleGroups.length);
    console.log('Visible groups:', visibleGroups.map(g => g.id));

    // Update the groups dataset
    this.groups.clear();
    this.groups.add(visibleGroups);

    // Calculate dynamic height based on number of visible groups
    this.updateTimelineHeight(visibleGroups.length);

    // Force timeline redraw to reflect group changes
    this.state.timeline.redraw();
  };

  private updateTimelineHeight = (visibleGroupCount: number): void => {
    if (!this.state.timeline) return;

    // Calculate height based on visible groups
    // Base height: 120px for timeline controls and padding
    // Per group: 80px (gives good spacing for events and group labels)
    // Minimum height: 200px (for at least some content)
    // Maximum height: 770px (original full height)
    const baseHeight = 120;
    const heightPerGroup = 80;
    const minHeight = 200;
    const maxHeight = 770;

    const calculatedHeight = Math.max(
      minHeight,
      Math.min(maxHeight, baseHeight + (visibleGroupCount * heightPerGroup))
    );

    // Update timeline options with new height
    this.state.timeline.setOptions({
      height: `${calculatedHeight}px`
    });

    // Track current height in state
    this.setState({ currentHeight: calculatedHeight });
  };

  private recalculateTimelineHeight = (): void => {
    if (!this.state.timeline) return;

    // Use a small delay to allow vis-timeline to finish its internal calculations
    setTimeout(() => {
      try {
        // Get the actual rendered timeline content
        const timelineElement = this.timelineRef.current;
        if (!timelineElement) return;

        // Find the vis-timeline content area
        const visContent = timelineElement.querySelector('.vis-content') as HTMLElement;
        if (!visContent) return;

        // Calculate the actual content height needed
        const visItemsContainer = timelineElement.querySelector('.vis-itemset') as HTMLElement;
        if (!visItemsContainer) return;

        // Get the bounding box of all visible content
        const contentHeight = visItemsContainer.scrollHeight;

        // Add padding for timeline controls and margins
        const controlsHeight = 80; // Timeline axis and controls
        const paddingHeight = 40; // Extra padding
        const minHeight = 200;
        const maxHeight = 770;

        const optimalHeight = Math.max(
          minHeight,
          Math.min(maxHeight, contentHeight + controlsHeight + paddingHeight)
        );

        // Only update if the height difference is significant (avoid constant micro-adjustments)
        const currentHeight = this.state.currentHeight;
        if (Math.abs(optimalHeight - currentHeight) > 20) {
          this.state.timeline?.setOptions({
            height: `${optimalHeight}px`
          });

          // Update tracked height
          this.setState({ currentHeight: optimalHeight });
        }
      } catch (error) {
        console.warn('Error recalculating timeline height:', error);
      }
    }, 100); // Small delay to let vis-timeline finish rendering
  };

  private handleTimelineReset = (event: Event): void => {
    if (!this.state.timeline) return;

    try {
      // Reset to today with a reasonable default range
      const today = new Date();
      const startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1); // Start of previous month
      const endDate = new Date(today.getFullYear(), today.getMonth() + 2, 0); // End of next month

      // Set the timeline window to show today with context
      this.state.timeline.setWindow(startDate, endDate);

      // Optionally fit all items if there are any
      if (this.items.length > 0) {
        // Small delay to let the window change take effect first
        setTimeout(() => {
          this.state.timeline?.fit();
        }, 100);
      }
    } catch (error) {
      console.warn('Error resetting timeline:', error);
    }
  };

  private updateTimelineData = (): void => {
    console.log('updateTimelineData called - timeline exists:', !!this.state.timeline, 'isUpdating:', this.isUpdating);
    if (!this.state.timeline || this.isUpdating) return;

    this.isUpdating = true;

    // Apply search and status filters (event category filtering is handled by group visibility)
    const filteredEvents = this.props.events.filter(event => {
      // Search filter
      const matchesSearch = !this.props.searchText || this.props.searchText === '' ||
        event.title.toLowerCase().indexOf(this.props.searchText.toLowerCase()) !== -1;

      // Status filter
      const matchesStatus = !this.props.selectedStatuses || this.props.selectedStatuses.has(event.status || 'Confirmed');

      return matchesSearch && matchesStatus;
    });

    console.log('Filtered events for timeline:', filteredEvents.length);



    // Convert calendar events to timeline items
    const timelineItems = filteredEvents.map(event => {
      // Check if event spans multiple days
      const startDate = new Date(event.start.getFullYear(), event.start.getMonth(), event.start.getDate());
      const endDate = new Date(event.end.getFullYear(), event.end.getMonth(), event.end.getDate());
      const isMultiDay = startDate.getTime() !== endDate.getTime();

      const item: any = {
        id: event.id,
        content: this.generateEventContent(event), // HTML content with icon and title
        start: event.start,
        group: event.isPrivate ? 'Private Events' : event.swimlane, // Private events go to dedicated lane
        className: `status-${(event.status || 'confirmed').toLowerCase().replace(/\s+/g, '')}`,
        title: `${event.title}\nEvent Category: ${event.isPrivate ? 'Private Events' : event.swimlane}\nStatus: ${event.status}\nStart: ${event.start.toLocaleDateString()}\nEnd: ${event.end.toLocaleDateString()}`,
        type: isMultiDay ? 'range' : 'point' // Use range for multi-day, point for single-day
      };

      // Add end date for multi-day events
      if (isMultiDay) {
        item.end = event.end;
      }

      return item;
    });

    console.log('Timeline items created:', timelineItems.length);
    const itemGroups = new Set<string>();
    timelineItems.forEach(item => {
      if (item.group) itemGroups.add(item.group);
    });
    const itemGroupsArray: string[] = [];
    itemGroups.forEach(group => itemGroupsArray.push(group));
    console.log('Timeline items groups:', itemGroupsArray);

    console.log('Clearing timeline items - current count:', this.items.length);
    this.items.clear();
    console.log('Adding timeline items - new count:', timelineItems.length);
    this.items.add(timelineItems);
    console.log('Timeline items after add:', this.items.length);

    // Use default range from options (ProgramTracker approach)
    // The timeline will use the start/end dates set in options above
    // This provides a focused view (today -5 to +20 days) instead of showing all data
    // Users can scroll/zoom to see events outside this range

    // Force a redraw to ensure everything is positioned correctly
    this.state.timeline.redraw();

    // Debug: Check timeline's internal state
    console.log('Timeline window:', this.state.timeline.getWindow());
    console.log('Timeline items count:', this.items.length);
    console.log('Timeline groups count:', this.groups.length);

    // Recalculate height after data update to optimize space usage
    this.recalculateTimelineHeight();

    // Force the timeline to fit all items in the view - this might fix the empty display
    setTimeout(() => {
      if (this.state.timeline && this.items.length > 0) {
        console.log('Forcing timeline fit after data load');
        this.state.timeline.fit();

        // Debug: Check if timeline container and items exist
        const timelineElement = this.timelineRef.current;
        console.log('Timeline container exists:', !!timelineElement);
        if (timelineElement) {
          console.log('Timeline container innerHTML length:', timelineElement.innerHTML.length);
          const visItems = timelineElement.querySelectorAll('.vis-item');
          const visItemPoints = timelineElement.querySelectorAll('.vis-item.vis-point');
          const visItemRanges = timelineElement.querySelectorAll('.vis-item.vis-range');
          console.log('Timeline vis-items found:', visItems.length);
          console.log('Timeline vis-item-points found:', visItemPoints.length);
          console.log('Timeline vis-item-ranges found:', visItemRanges.length);

          // Check timeline visibility - the timeline div is the container itself
          const timelineDiv = this.timelineRef.current;
          if (timelineDiv) {
            const computedStyle = window.getComputedStyle(timelineDiv);
            console.log('Timeline div opacity:', computedStyle.opacity);
            console.log('Timeline div display:', computedStyle.display);
            console.log('Timeline div visibility:', computedStyle.visibility);
            console.log('Timeline div has timelineHidden class:', timelineDiv.classList.contains(styles.timelineHidden));
            console.log('Timeline div classes:', timelineDiv.className);
          } else {
            console.log('Timeline div not found!');
          }

          // Check for duplicate IDs
          const itemIds: string[] = [];
          visItems.forEach(item => {
            const id = item.getAttribute('data-id') || item.id;
            if (id) itemIds.push(id);
          });
          const uniqueIds = new Set(itemIds);
          console.log('Timeline unique item IDs:', uniqueIds.size, 'vs total items:', itemIds.length);
        }

        // Force loading state to clear after a reasonable delay
        setTimeout(() => {
          console.log('Force clearing loading state - current state:', this.state.isLoading);
          this.setState({ isLoading: false }, () => {
            console.log('Loading state cleared - new state:', this.state.isLoading);
          });
        }, 500);
      }
    }, 100);

    // Clear the updating flag
    setTimeout(() => {
      this.isUpdating = false;
      console.log('Timeline update complete - isUpdating cleared');
    }, 600);

    // The timeline events will handle hiding the loading spinner
    // No need for setTimeout here as the events will fire when ready
  };

  // Custom mouse wheel handler for better scroll behavior
  private handleMouseWheel = (event: WheelEvent): void => {
    // If Ctrl key is pressed, allow default behavior (zoom)
    if (event.ctrlKey) {
      return; // Let vis.js handle zoom
    }

    // Otherwise, prevent default zoom and handle horizontal scrolling
    event.preventDefault();

    if (this.state.timeline) {
      const timeline = this.state.timeline as Timeline & {
        getWindow: () => { start: Date; end: Date };
        setWindow: (start: Date, end: Date, options?: { animation: boolean }) => void;
      };

      const current = timeline.getWindow();
      const delta = event.deltaY * 0.05; // Adjust scrolling speed (fine-tuned value)

      // Calculate new time window
      const newStart = new Date(current.start.valueOf() + delta);
      const newEnd = new Date(current.end.valueOf() + delta);

      // Apply new window without animation for smooth scrolling
      timeline.setWindow(newStart, newEnd, { animation: false });
    }
  };

  private handleItemMouseOver = (itemId: number, element: HTMLElement): void => {
    // Find the event using the timeline item ID
    const matchingEvents = this.props.events.filter((ev: ICalendarEvent) => ev.id === itemId);
    if (matchingEvents.length > 0) {
      const event = matchingEvents[0];
      this.setState({
        hoveredEvent: event,
        hoveredElement: element
      });
    }
  };

  private handleItemMouseOut = (): void => {
    this.setState({
      hoveredEvent: undefined,
      hoveredElement: undefined
    });
  };

  public render(): React.ReactElement<ITimelineViewProps> {
    const { isLoading, hoveredEvent, hoveredElement } = this.state;

    return (
      <div className={styles.timelineContainer}>
        <div className={styles.timelineHeader}>
          <h2>Timeline View</h2>
        </div>

        {isLoading && (
          <div className={styles.loadingOverlay}>
            <Spinner
              size={SpinnerSize.large}
              label="Arranging timeline..."
              styles={{
                root: { marginTop: '100px' }
              }}
            />
          </div>
        )}

        <div
          ref={this.timelineRef}
          className={`${styles.timeline} ${isLoading ? styles.timelineHidden : ''}`}
        />

        {/* Event Popover - Render only when we have both event and element */}
        {hoveredEvent && hoveredElement && (
          <EventPopover
            event={hoveredEvent}
            target={hoveredElement}
            isVisible={true}
            onDismiss={this.handleItemMouseOut}

          />
        )}
      </div>
    );
  }
}
