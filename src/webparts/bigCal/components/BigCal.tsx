import * as React from 'react';
import { Calendar, momentLocalizer, View } from 'react-big-calendar';
import * as moment from 'moment';
import { IconButton, IIconProps, Spinner, SpinnerSize, MessageBar, MessageBarType, Icon, SearchBox, Dropdown, IDropdownOption, Pivot, PivotItem } from '@fluentui/react';
import styles from './BigCal.module.scss';
import type { IBigCalProps } from './IBigCalProps';
import type { ICalendarEvent } from './ICalendarEvent';
import { convertSharePointEventToCalendarEvent } from './ICalendarEvent';
import { SharePointService } from '../services/SharePointService';
import { EventModal } from './EventModal';
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
  selectedSwimlanes: Set<string>;
  selectedStatuses: Set<string>;
  monthNavigatorExpanded: boolean;
  viewMode: 'calendar' | 'grid' | 'timeline';
  isExportDialogOpen: boolean;
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
      selectedStatuses: new Set(['On Track', 'At Risk', 'Off Track']), // All selected by default
      monthNavigatorExpanded: true,
      viewMode: 'calendar',
      isExportDialogOpen: false
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



  private formatMonthYear = (date: Date): string => {
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  private getSwimlaneDropdownOptions = (): IDropdownOption[] => {
    const { filteredEvents } = this.state;
    return ['Category 1', 'Category 2', 'Category 3'].map(swimlane => {
      const count = filteredEvents.filter(e => e.swimlane === swimlane).length;
      return {
        key: swimlane,
        text: `${swimlane} (${count})`,
        data: { icon: this.getSwimlaneIcon(swimlane), count }
      };
    });
  };

  private getStatusDropdownOptions = (): IDropdownOption[] => {
    const { filteredEvents } = this.state;
    return ['On Track', 'At Risk', 'Off Track'].map(status => {
      const count = filteredEvents.filter(e => e.status === status).length;
      return {
        key: status,
        text: `${status} (${count})`,
        data: {
          icon: this.getStatusIcon(status),
          color: this.getStatusColor(status),
          count
        }
      };
    });
  };

  private getStatusColor = (status: string): string => {
    switch (status) {
      case 'On Track':
        return '#0078d4'; // Blue
      case 'At Risk':
        return '#FBC02D'; // Yellow/Amber
      case 'Off Track':
        return '#D32F2F'; // Red
      default:
        return '#605e5c'; // Neutral gray
    }
  };

  private getStatusIcon = (status: string): string => {
    switch (status) {
      case 'On Track':
        return 'CheckMark';
      case 'At Risk':
        return 'Warning';
      case 'Off Track':
        return 'ErrorBadge';
      default:
        return 'Info';
    }
  };

  private handleSwimlaneDropdownChange = (event: React.FormEvent<HTMLDivElement>, option?: IDropdownOption): void => {
    if (option) {
      const { selectedSwimlanes } = this.state;
      const newSelected = new Set<string>();
      selectedSwimlanes.forEach(item => newSelected.add(item));

      if (option.selected) {
        newSelected.add(option.key as string);
      } else {
        newSelected.delete(option.key as string);
      }

      this.setState({ selectedSwimlanes: newSelected }, () => {
        this.applyFilters();
      });
    }
  };

  private handleStatusDropdownChange = (event: React.FormEvent<HTMLDivElement>, option?: IDropdownOption): void => {
    if (option) {
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

  private renderSwimlaneOption = (option?: IDropdownOption): React.ReactElement => {
    if (!option) return <div />;

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
        <Icon
          iconName={option.data?.icon}
          style={{
            color: 'var(--themePrimary, #0078d4)',
            fontSize: '14px'
          }}
        />
        <span style={{ fontSize: '13px' }}>
          {option.text}
        </span>
      </div>
    );
  };

  private renderSwimlaneTitle = (options?: IDropdownOption[]): React.ReactElement => {
    return (
      <span style={{ fontSize: '13px' }}>
        Swimlanes
      </span>
    );
  };

  private renderStatusOption = (option?: IDropdownOption): React.ReactElement => {
    if (!option) return <div />;

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
        <Icon
          iconName={option.data?.icon}
          style={{
            color: option.data?.color,
            fontSize: '14px'
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
    const { filteredEvents, currentDate } = this.state;

    return (
      <div className={styles.gridViewContainer}>
        <div className={styles.gridViewHeader}>
          <h2>18-Month Overview</h2>
        </div>
        <div className={styles.gridViewContent}>
          {this.get18MonthRange().map((month, index) => {
            const monthEvents = filteredEvents.filter(event =>
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
    const statusClass = `status-${event.status.toLowerCase().replace(/\s+/g, '')}`;
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

  private MiniCalendarEvent = ({ event }: { event: ICalendarEvent }): React.ReactElement => {
    return (
      <div className={styles.miniEvent} title={event.title}>
        <span className={styles.miniEventText}>
          {event.title.length > 8 ? `${event.title.substring(0, 8)}...` : event.title}
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

  private handleImportEvents = async (importedEvents: ICalendarEvent[]): Promise<void> => {
    try {
      // Add imported events to SharePoint list
      const addPromises = importedEvents.map(event =>
        this.sharePointService.createEvent(
          event.title,
          event.start,
          event.end,
          event.swimlane,
          event.status
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
    const { isFullscreen, filteredEvents, isLoading, error, currentView, currentDate, isModalOpen, selectedEvent, selectedDate, searchText, selectedSwimlanes, selectedStatuses, viewMode, isExportDialogOpen } = this.state;

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
                root: { width: '250px', marginRight: '16px' }
              }}
            />

            <Dropdown
              placeholder="Swimlanes"
              multiSelect
              options={this.getSwimlaneDropdownOptions()}
              selectedKeys={(() => {
                const keys: string[] = [];
                selectedSwimlanes.forEach(key => keys.push(key));
                return keys;
              })()}
              onChange={this.handleSwimlaneDropdownChange}
              onRenderOption={this.renderSwimlaneOption}
              onRenderTitle={this.renderSwimlaneTitle}
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
                              events={filteredEvents.filter(event =>
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
            </>
          ) : viewMode === 'grid' ? (
            this.renderGridView()
          ) : (
            <TimelineView
              events={filteredEvents}
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
          onSave={this.handleSaveEvent}
          onDelete={selectedEvent ? this.handleDeleteEvent : undefined}
          onClose={this.closeModal}
        />

        {/* Excel Export Dialog */}
        <ExcelExport
          isOpen={isExportDialogOpen}
          events={filteredEvents}
          currentDate={currentDate}
          onDismiss={this.closeExportDialog}
          onImportEvents={this.handleImportEvents}
        />
      </div>
    );
  }
}
