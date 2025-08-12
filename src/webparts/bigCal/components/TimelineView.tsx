import * as React from 'react';
import { Timeline, DataSet } from 'vis-timeline/standalone';
import 'vis-timeline/styles/vis-timeline-graph2d.css';
import { ICalendarEvent } from './ICalendarEvent';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import styles from './TimelineView.module.scss';

export interface ITimelineViewProps {
  events: ICalendarEvent[];
  colorPalette: string;
  onEventClick?: (event: ICalendarEvent) => void;
  onEventDoubleClick?: (event: ICalendarEvent) => void;
}

export interface ITimelineViewState {
  timeline: Timeline | undefined;
  isLoading: boolean;
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
      isLoading: true
    };

    // Initialize DataSets
    this.items = new DataSet([]);
    this.groups = new DataSet([]);
  }

  public componentDidMount(): void {
    this.initializeTimeline();

    // Add custom mouse wheel handling
    if (this.timelineRef.current) {
      this.timelineRef.current.addEventListener('wheel', this.handleMouseWheel, { passive: false });
    }
  }

  public componentDidUpdate(prevProps: ITimelineViewProps): void {
    if (prevProps.events !== this.props.events) {
      // Show loading when events change
      this.setState({ isLoading: true }, () => {
        this.updateTimelineData();
      });
    }
  }

  public componentWillUnmount(): void {
    // Remove custom mouse wheel event handling
    if (this.timelineRef.current) {
      this.timelineRef.current.removeEventListener('wheel', this.handleMouseWheel);
    }

    if (this.state.timeline) {
      this.state.timeline.destroy();
    }
  }

  private initializeTimeline = (): void => {
    if (!this.timelineRef.current) return;

    // Create groups for swimlanes
    const groups = [
      { id: 'Category 1', content: 'Category 1', className: 'swimlane-category1' },
      { id: 'Category 2', content: 'Category 2', className: 'swimlane-category2' },
      { id: 'Category 3', content: 'Category 3', className: 'swimlane-category3' }
    ];

    this.groups.clear();
    this.groups.add(groups);

    // Set initial date range (ProgramTracker approach)
    const today = new Date();
    const startDate = new Date();
    startDate.setDate(today.getDate() - 5);  // 5 days before today
    const endDate = new Date();
    endDate.setDate(today.getDate() + 20);   // 20 days after today

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
    const timeline = new Timeline(this.timelineRef.current, this.items, this.groups, options);

    // Add event listeners
    timeline.on('select', (properties: { items: number[] }) => {
      if (properties.items.length > 0 && this.props.onEventClick) {
        const itemId = properties.items[0];
        const event = this.props.events.filter((e: ICalendarEvent) => e.id === itemId)[0];
        if (event) {
          this.props.onEventClick(event);
          // Deselect item to allow re-selection
          timeline.setSelection([]);
        }
      }
    });

    timeline.on('doubleClick', (properties: { item: number }) => {
      if (properties.item && this.props.onEventDoubleClick) {
        const event = this.props.events.filter((e: ICalendarEvent) => e.id === properties.item)[0];
        if (event) {
          this.props.onEventDoubleClick(event);
        }
      }
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
    timeline.on('rangechanged', hideLoadingSpinner);

    // Try to listen for redraw events (vis.js internal)
    try {
      timeline.on('redraw', hideLoadingSpinner);
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
      this.updateTimelineData();
    });
  };

  private updateTimelineData = (): void => {
    if (!this.state.timeline) return;

    // Convert calendar events to timeline items
    const timelineItems = this.props.events.map(event => ({
      id: event.id,
      content: event.title, // This text appears to the right of the status indicator
      start: event.start,
      group: event.swimlane,
      className: `status-${event.status.toLowerCase().replace(/\s+/g, '')}`,
      title: `${event.title}\nStatus: ${event.status}\nSwimlane: ${event.swimlane}\nStart: ${event.start.toLocaleDateString()}\nEnd: ${event.end.toLocaleDateString()}`,
      type: 'point' // This is crucial for icon + text layout
    }));

    this.items.clear();
    this.items.add(timelineItems);

    // Use default range from options (ProgramTracker approach)
    // The timeline will use the start/end dates set in options above
    // This provides a focused view (today -5 to +20 days) instead of showing all data
    // Users can scroll/zoom to see events outside this range

    // Force a redraw to ensure everything is positioned correctly
    this.state.timeline.redraw();

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

  public render(): React.ReactElement<ITimelineViewProps> {
    const { isLoading } = this.state;

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
      </div>
    );
  }
}
