import * as React from 'react';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import { ICalendarEvent } from './ICalendarEvent';
import { Logger } from '../services/LoggingService';
import styles from './TimelineView.module.scss';

export interface IMinimalTimelineViewProps {
  events: ICalendarEvent[];
  onEventClick?: (event: ICalendarEvent) => void;
  onEventDoubleClick?: (event: ICalendarEvent) => void;
}

export interface IMinimalTimelineViewState {
  timeline: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  isLoading: boolean;
  error?: string;
}

export class MinimalTimelineView extends React.Component<IMinimalTimelineViewProps, IMinimalTimelineViewState> {
  private timelineRef = React.createRef<HTMLDivElement>();
  private timelineModule: any = null; // eslint-disable-line @typescript-eslint/no-explicit-any

  constructor(props: IMinimalTimelineViewProps) {
    super(props);
    this.state = {
      timeline: undefined,
      isLoading: true,
      error: undefined
    };
  }

  public async componentDidMount(): Promise<void> {
    Logger.debug('MinimalTimelineView mounting');
    try {
      // Dynamic import of vis-timeline to avoid initial bundle issues
      Logger.debug('Loading vis-timeline module');
      const visModule = await import(/* webpackChunkName: 'vis-timeline' */ 'vis-timeline/standalone');
      // Import CSS using require to avoid TypeScript module resolution issues
      require('vis-timeline/styles/vis-timeline-graph2d.css');
      Logger.debug('vis-timeline loaded successfully');

      this.timelineModule = visModule;
      this.initializeTimeline();
    } catch (error) {
      Logger.error('Failed to load vis-timeline', error);
      this.setState({
        isLoading: false,
        error: 'Failed to load timeline component'
      });
    }
  }

  public componentWillUnmount(): void {
    if (this.state.timeline) {
      try {
        this.state.timeline.destroy();
      } catch (error) {
        Logger.warn('Error destroying timeline', error);
      }
    }
  }

  private initializeTimeline = (): void => {
    if (!this.timelineRef.current || !this.timelineModule) return;

    try {
      const { Timeline, DataSet } = this.timelineModule;

      // Create groups for swimlanes - minimal approach
      const groups = new DataSet([
        { id: 'Category 1', content: 'Category 1' },
        { id: 'Category 2', content: 'Category 2' },
        { id: 'Category 3', content: 'Category 3' }
      ]);

      // Create items dataset
      const items = new DataSet([]);

      // Minimal timeline options - based on working project
      const options = {
        height: '770px',
        autoResize: true,
        stack: true,
        stackSubgroups: true,
        orientation: {
          axis: 'top',
          item: 'bottom'
        },
        zoomable: true,
        zoomKey: 'ctrlKey',
        moveable: true,
        selectable: true,
        verticalScroll: true,
        horizontalScroll: true,
        showMajorLabels: true,
        showMinorLabels: true,
        showCurrentTime: true
      };

      // Create timeline
      const timeline = new Timeline(this.timelineRef.current, items, groups, options);

      // Add event listeners
      timeline.on('select', (properties: { items: number[] }) => {
        if (properties.items.length > 0 && this.props.onEventClick) {
          const itemId = properties.items[0];
          const event = this.props.events.filter((e: ICalendarEvent) => e.id === itemId)[0];
          if (event) {
            this.props.onEventClick(event);
            timeline.setSelection([]);
          }
        }
      });

      this.setState({ timeline, isLoading: false }, () => {
        Logger.debug('Timeline initialized, updating data');
        this.updateTimelineData();
      });

    } catch (error) {
      Logger.error('Error initializing timeline', error);
      this.setState({
        isLoading: false,
        error: 'Failed to initialize timeline'
      });
    }
  };

  private updateTimelineData = (): void => {
    if (!this.state.timeline) return;

    try {
      const timelineItems = this.props.events.map(event => ({
        id: event.id,
        content: event.title,
        start: event.start,
        group: event.swimlane,
        className: `status-${(event.status || 'confirmed').toLowerCase().replace(/\s+/g, '')}`,
        type: 'point'
      }));

      // Get the items dataset from timeline
      const items = this.state.timeline.itemsData;
      items.clear();
      items.add(timelineItems);

      // Auto-fit if we have items
      if (timelineItems.length > 0) {
        setTimeout(() => {
          try {
            this.state.timeline.fit();
          } catch (error) {
            console.warn('Error fitting timeline:', error);
          }
        }, 100);
      }

    } catch (error) {
      console.error('Error updating timeline data:', error);
    }
  };

  public componentDidUpdate(prevProps: IMinimalTimelineViewProps): void {
    if (prevProps.events !== this.props.events) {
      this.updateTimelineData();
    }
  }

  public render(): React.ReactElement<IMinimalTimelineViewProps> {
    const { isLoading, error } = this.state;

    if (error) {
      return (
        <div className={styles.timelineContainer}>
          <div className={styles.timelineHeader}>
            <h2>Timeline View</h2>
          </div>
          <div style={{ padding: '20px', textAlign: 'center', color: 'red' }}>
            <p>Error: {error}</p>
            <p>Timeline view is temporarily unavailable.</p>
          </div>
        </div>
      );
    }

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
