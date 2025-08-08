import * as React from 'react';
import { Timeline, DataSet } from 'vis-timeline/standalone';
import 'vis-timeline/styles/vis-timeline-graph2d.css';
import { ICalendarEvent } from './ICalendarEvent';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import styles from './TimelineView.module.scss';

export interface ITimelineViewProps {
  events: ICalendarEvent[];
  onEventClick?: (event: ICalendarEvent) => void;
  onEventDoubleClick?: (event: ICalendarEvent) => void;
}

export interface ITimelineViewState {
  timeline: Timeline | undefined;
  isLoading: boolean;
}

export class TimelineView extends React.Component<ITimelineViewProps, ITimelineViewState> {
  private timelineRef = React.createRef<HTMLDivElement>();
  private items: DataSet<unknown>;
  private groups: DataSet<unknown>;

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

      zoomMin: 1000 * 60 * 60 * 24, // 1 day
      zoomMax: 1000 * 60 * 60 * 24 * 365 * 2, // 2 years
      orientation: {
        axis: 'top',
        item: 'bottom'
      },
      margin: {
        item: {
          horizontal: 10,
          vertical: 15
        },
        axis: 5
      },
      order: function(a: { start: number }, b: { start: number }) {
        return a.start - b.start;
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
      console.log('Redraw event not available');
    }

    // Fallback timeout in case events don't fire properly
    setTimeout(() => {
      if (this.state.isLoading) {
        console.log('Timeline loading timeout - forcing hide spinner');
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

    // Fit the timeline to show all items
    if (timelineItems.length > 0) {
      // Set a reasonable window range
      const startDates = timelineItems.map(item => item.start);
      const minDate = new Date(Math.min(...startDates.map(d => d.getTime())));
      const maxDate = new Date(Math.max(...startDates.map(d => d.getTime())));

      // Add some padding
      const padding = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
      const windowStart = new Date(minDate.getTime() - padding);
      const windowEnd = new Date(maxDate.getTime() + padding);

      // Use setWindow with animation disabled and callback
      this.state.timeline.setWindow(windowStart, windowEnd, {
        animation: false
      });
    }

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
