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
  hoveredEvent: ICalendarEvent | undefined;
  hoveredElement: HTMLElement | undefined;
}

export class TimelineView extends React.Component<ITimelineViewProps, ITimelineViewState> {
  private timelineRef = React.createRef<HTMLDivElement>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private items: DataSet<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private groups: DataSet<any>;

  constructor(props: ITimelineViewProps) {
    super(props);

    this.state = {
      timeline: undefined,
      isLoading: true,
      hoveredEvent: undefined,
      hoveredElement: undefined
    };

    // Initialize DataSets
    this.items = new DataSet([]);
    this.groups = new DataSet([]);
  }

  public componentDidMount(): void {
    console.log('Fresh Timeline mounting - events:', this.props.events.length);
    this.initializeTimeline();
  }

  public componentDidUpdate(prevProps: ITimelineViewProps): void {
    if (prevProps.events !== this.props.events ||
        prevProps.selectedEventCategories !== this.props.selectedEventCategories ||
        prevProps.searchText !== this.props.searchText ||
        prevProps.selectedStatuses !== this.props.selectedStatuses) {
      console.log('Timeline updating - events:', this.props.events.length);
      this.updateTimelineData();
    }
  }

  public componentWillUnmount(): void {
    if (this.state.timeline) {
      this.state.timeline.destroy();
    }
  }

  private initializeTimeline = (): void => {
    if (!this.timelineRef.current) return;

    console.log('Initializing fresh timeline');

    // Set initial date range
    const today = new Date();
    const startDate = new Date();
    startDate.setDate(today.getDate() - 5);
    const endDate = new Date();
    endDate.setDate(today.getDate() + 20);

    // Minimal timeline options based on working implementation
    const options = {
      height: '770px',
      autoResize: true,
      stack: true,
      stackSubgroups: true,
      showCurrentTime: true,

      // Critical interaction settings
      zoomable: true,
      zoomKey: 'ctrlKey' as const,
      moveable: true,
      selectable: true,

      // Scrolling behavior
      verticalScroll: true,
      horizontalScroll: true,

      // Grid and labels
      showMajorLabels: true,
      showMinorLabels: true,

      // Default view range
      start: startDate,
      end: endDate,

      // Critical spacing settings
      margin: {
        item: {
          horizontal: 10,
          vertical: 15
        },
        axis: 5
      },

      // Position date labels above timeline
      orientation: {
        axis: 'top',
        item: 'bottom'
      },

      // Item stacking order
      order: function(a: { start: number }, b: { start: number }) {
        return a.start - b.start;
      }
    };

    // Create timeline
    console.log('Creating Timeline instance');
    const timeline = new Timeline(this.timelineRef.current, this.items, this.groups, options);
    console.log('Timeline instance created');

    // Add event listeners
    timeline.on('select', (properties: { items: number[] }) => {
      if (properties.items.length > 0 && this.props.onEventClick) {
        const itemId = properties.items[0];
        const event = this.props.events.filter((e: ICalendarEvent) => e.id === itemId)[0];
        if (event && !event.isHoliday && !(event.isPrivate && event.title === 'Unavailable')) {
          this.props.onEventClick(event);
        }
        timeline.setSelection([]);
      }
    });

    // Mouse events for popover
    timeline.on('itemover', (properties: { item: number; event: MouseEvent }) => {
      const event = this.props.events.filter((e: ICalendarEvent) => e.id === properties.item)[0];
      if (event) {
        this.setState({
          hoveredEvent: event,
          hoveredElement: properties.event.target as HTMLElement
        });
      }
    });

    timeline.on('itemout', () => {
      this.setState({
        hoveredEvent: undefined,
        hoveredElement: undefined
      });
    });

    this.setState({ timeline, isLoading: false }, () => {
      console.log('Timeline initialized, updating data');
      this.updateTimelineData();
    });
  };

  private updateTimelineData = (): void => {
    if (!this.state.timeline) return;

    console.log('Updating timeline data');

    // Filter events
    const filteredEvents = this.props.events.filter(event => {
      const matchesSearch = !this.props.searchText ||
        event.title.toLowerCase().indexOf(this.props.searchText.toLowerCase()) !== -1;
      const matchesStatus = !this.props.selectedStatuses ||
        this.props.selectedStatuses.has(event.status || 'Confirmed');
      return matchesSearch && matchesStatus;
    });

    // Create groups from event categories
    const discoveredCategories = new Set<string>();
    filteredEvents.forEach(event => {
      if (event.isPrivate) {
        discoveredCategories.add('Private Events');
      } else if (event.swimlane) {
        discoveredCategories.add(event.swimlane);
      }
    });

    const categoriesArray: string[] = [];
    discoveredCategories.forEach((category: string) => categoriesArray.push(category));

    const visibleGroups = categoriesArray
      .filter((category: string) => this.props.selectedEventCategories.has(category))
      .sort()
      .map((category: string) => ({
        id: category,
        content: category
      }));

    console.log('Timeline groups:', visibleGroups.length);
    this.groups.clear();
    this.groups.add(visibleGroups);

    // Create timeline items
    const timelineItems = filteredEvents.map(event => ({
      id: event.id,
      content: event.title,
      start: event.start,
      group: event.isPrivate ? 'Private Events' : event.swimlane,
      className: `status-${(event.status || 'confirmed').toLowerCase().replace(/\s+/g, '')}`,
      type: 'point'
    }));

    console.log('Timeline items:', timelineItems.length);
    this.items.clear();
    this.items.add(timelineItems);

    // Auto-fit timeline
    setTimeout(() => {
      if (this.state.timeline && timelineItems.length > 0) {
        this.state.timeline.fit();
      }
    }, 100);
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
              label="Loading timeline..."
              styles={{ root: { marginTop: '100px' } }}
            />
          </div>
        )}

        <div
          ref={this.timelineRef}
          className={styles.timeline}
          style={{ opacity: isLoading ? 0 : 1 }}
        />

        {hoveredEvent && hoveredElement && (
          <EventPopover
            event={hoveredEvent}
            target={hoveredElement}
            isVisible={true}
            onDismiss={() => this.setState({ hoveredEvent: undefined, hoveredElement: undefined })}
          />
        )}
      </div>
    );
  }
}