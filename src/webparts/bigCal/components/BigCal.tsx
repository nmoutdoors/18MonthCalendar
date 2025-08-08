import * as React from 'react';
import { Calendar, momentLocalizer, View } from 'react-big-calendar';
import * as moment from 'moment';
import { IconButton, IIconProps, Spinner, SpinnerSize, MessageBar, MessageBarType, Icon, SearchBox, Checkbox, Text, Stack, Separator } from '@fluentui/react';
import styles from './BigCal.module.scss';
import type { IBigCalProps } from './IBigCalProps';
import type { ICalendarEvent } from './ICalendarEvent';
import { convertSharePointEventToCalendarEvent } from './ICalendarEvent';
import { SharePointService } from '../services/SharePointService';
import { EventModal } from './EventModal';
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
  selectedSwimlanes: Set<string>;
  selectedStatuses: Set<string>;
}

export default class BigCal extends React.Component<IBigCalProps, IBigCalState> {
  private webPartElement: HTMLElement | null = null;
  private sharePointService: SharePointService;

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
      selectedSwimlanes: new Set(['Category 1', 'Category 2', 'Category 3']), // All selected by default
      selectedStatuses: new Set(['Red', 'Green', 'Amber']) // All selected by default
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

    // Load events from SharePoint
    await this.loadEvents();
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
    const { events, searchText, selectedSwimlanes, selectedStatuses } = this.state;

    const filtered = events.filter(event => {
      // Search filter
      const matchesSearch = searchText === '' ||
        event.title.toLowerCase().indexOf(searchText.toLowerCase()) !== -1;

      // Swimlane filter
      const matchesSwimlane = selectedSwimlanes.has(event.swimlane);

      // Status filter
      const matchesStatus = selectedStatuses.has(event.status);

      return matchesSearch && matchesSwimlane && matchesStatus;
    });

    this.setState({ filteredEvents: filtered });
  };

  private handleSearchChange = (searchText: string): void => {
    this.setState({ searchText }, () => {
      this.applyFilters();
    });
  };

  private handleSwimlaneToggle = (swimlane: string): void => {
    const { selectedSwimlanes } = this.state;
    const newSelected = new Set<string>();
    selectedSwimlanes.forEach(item => newSelected.add(item));

    if (newSelected.has(swimlane)) {
      newSelected.delete(swimlane);
    } else {
      newSelected.add(swimlane);
    }

    this.setState({ selectedSwimlanes: newSelected }, () => {
      this.applyFilters();
    });
  };

  private handleStatusToggle = (status: string): void => {
    const { selectedStatuses } = this.state;
    const newSelected = new Set<string>();
    selectedStatuses.forEach(item => newSelected.add(item));

    if (newSelected.has(status)) {
      newSelected.delete(status);
    } else {
      newSelected.add(status);
    }

    this.setState({ selectedStatuses: newSelected }, () => {
      this.applyFilters();
    });
  };

  private handleUnselectAll = (): void => {
    this.setState({
      selectedSwimlanes: new Set(),
      selectedStatuses: new Set()
    }, () => {
      this.applyFilters();
    });
  };

  private handleSelectAll = (): void => {
    this.setState({
      selectedSwimlanes: new Set(['Category 1', 'Category 2', 'Category 3']),
      selectedStatuses: new Set(['Red', 'Green', 'Amber'])
    }, () => {
      this.applyFilters();
    });
  };

  private enterFullscreen = (): void => {
    if (this.webPartElement) {
      this.webPartElement.style.position = 'fixed';
      this.webPartElement.style.top = '0';
      this.webPartElement.style.left = '0';
      this.webPartElement.style.width = '100vw';
      this.webPartElement.style.height = '100vh';
      this.webPartElement.style.zIndex = '1000';
      this.webPartElement.style.backgroundColor = '#ffffff';
    }
  };

  private exitFullscreen = (): void => {
    if (this.webPartElement) {
      this.webPartElement.style.position = '';
      this.webPartElement.style.top = '';
      this.webPartElement.style.left = '';
      this.webPartElement.style.width = '';
      this.webPartElement.style.height = '';
      this.webPartElement.style.zIndex = '';
      this.webPartElement.style.backgroundColor = '';
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
    const statusClass = `status-${event.status.toLowerCase()}`;
    const swimlaneClass = `swimlane-${event.swimlane.toLowerCase().replace(' ', '')}`;

    return {
      className: `${statusClass} ${swimlaneClass}`
    };
  };

  private getSwimlaneIcon = (swimlane: string): string => {
    switch (swimlane) {
      case 'Category 1':
        return 'People';
      case 'Category 2':
        return 'Settings';
      case 'Category 3':
        return 'Calendar';
      default:
        return 'Info';
    }
  };

  private EventComponent = ({ event }: { event: ICalendarEvent }): React.ReactElement => {
    const iconName = this.getSwimlaneIcon(event.swimlane);

    return (
      <div className={styles.customEvent}>
        <Icon
          iconName={iconName}
          className={styles.eventIcon}
        />
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
    const iconName = this.getSwimlaneIcon(event.swimlane);

    return (
      <div className={`${styles.customEvent} ${styles.monthEventItem}`}>
        <Icon
          iconName={iconName}
          className={styles.eventIcon}
        />
        <span className={styles.eventTitle}>{event.title}</span>
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

  private handleSaveEvent = async (eventData: Partial<ICalendarEvent>): Promise<void> => {
    try {
      if (eventData.id) {
        // Update existing event
        await this.sharePointService.updateEvent(
          eventData.id,
          eventData.title!,
          eventData.start!,
          eventData.end!,
          eventData.swimlane,
          eventData.status
        );
        console.log('Event updated successfully');
      } else {
        // Create new event
        await this.sharePointService.createEvent(
          eventData.title!,
          eventData.start!,
          eventData.end!,
          eventData.swimlane,
          eventData.status
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

  private handleDeleteEvent = async (eventId: number): Promise<void> => {
    try {
      await this.sharePointService.deleteEvent(eventId);
      console.log('Event deleted successfully');

      // Reload events to show changes
      await this.loadEvents();
    } catch (error) {
      console.error('Failed to delete event:', error);
      throw error; // Re-throw to let modal handle the error display
    }
  };

  public render(): React.ReactElement<IBigCalProps> {
    const { hasTeamsContext, isUserAdmin } = this.props;
    const { isFullscreen, filteredEvents, isLoading, error, currentView, currentDate, isModalOpen, selectedEvent, selectedDate, searchText, selectedSwimlanes, selectedStatuses } = this.state;

    const fullscreenIcon: IIconProps = {
      iconName: isFullscreen ? 'BackToWindow' : 'FullScreen'
    };

    const propertiesIcon: IIconProps = {
      iconName: 'Settings'
    };

    return (
      <div className={`${styles.bigCal} ${hasTeamsContext ? styles.teams : ''}`}>
        {/* Navigation Bar */}
        <div className={styles.navbar}>
          <div className={styles.navbarLeft}>
            <SearchBox
              placeholder="Search events..."
              value={searchText}
              onChange={(_, newValue) => this.handleSearchChange(newValue || '')}
              styles={{
                root: { width: '300px' }
              }}
            />
          </div>

          <div className={styles.navbarRight}>
            {isUserAdmin && (
              <>
                <IconButton
                  iconProps={propertiesIcon}
                  title="Configure Web Part Properties"
                  onClick={this.toggleProperties}
                  className={styles.navbarButton}
                />
                <IconButton
                  iconProps={fullscreenIcon}
                  title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                  onClick={this.toggleFullscreen}
                  className={styles.navbarButton}
                />
              </>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div className={styles.mainContent}>
          {/* Left Column */}
          <div className={styles.leftColumn}>
            <div className={styles.leftColumnContent}>
              <Stack tokens={{ childrenGap: 16 }}>
                {/* Swimlanes Filter */}
                <div>
                  <Text variant="mediumPlus" styles={{ root: { fontWeight: 600, marginBottom: '8px', display: 'block' } }}>
                    SWIMLANES
                  </Text>
                  <Stack tokens={{ childrenGap: 8 }}>
                    {['Category 1', 'Category 2', 'Category 3'].map(swimlane => {
                      const count = filteredEvents.filter(e => e.swimlane === swimlane).length;
                      return (
                        <Checkbox
                          key={swimlane}
                          label={`${swimlane} (${count})`}
                          checked={selectedSwimlanes.has(swimlane)}
                          onChange={() => this.handleSwimlaneToggle(swimlane)}
                        />
                      );
                    })}
                  </Stack>
                </div>

                <Separator />

                {/* Status Filter */}
                <div>
                  <Text variant="mediumPlus" styles={{ root: { fontWeight: 600, marginBottom: '8px', display: 'block' } }}>
                    STATUS
                  </Text>
                  <Stack tokens={{ childrenGap: 8 }}>
                    {['Red', 'Green', 'Amber'].map(status => {
                      const count = filteredEvents.filter(e => e.status === status).length;
                      return (
                        <div key={status} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          <Checkbox
                            label={`${status} (${count})`}
                            checked={selectedStatuses.has(status)}
                            onChange={() => this.handleStatusToggle(status)}
                          />
                        </div>
                      );
                    })}
                  </Stack>
                </div>

                <Separator />

                {/* Control Buttons */}
                <Stack horizontal tokens={{ childrenGap: 8 }}>
                  <IconButton
                    text="Select All"
                    onClick={this.handleSelectAll}
                    styles={{ root: { fontSize: '12px' } }}
                  />
                  <IconButton
                    text="Unselect All"
                    onClick={this.handleUnselectAll}
                    styles={{ root: { fontSize: '12px' } }}
                  />
                </Stack>
              </Stack>
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
                  events={filteredEvents}
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
                    this.openEditModal(event);
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
        </div>

        {/* Event Modal */}
        <EventModal
          isOpen={isModalOpen}
          event={selectedEvent}
          selectedDate={selectedDate}
          onSave={this.handleSaveEvent}
          onDelete={selectedEvent ? this.handleDeleteEvent : undefined}
          onClose={this.closeModal}
        />
      </div>
    );
  }
}
