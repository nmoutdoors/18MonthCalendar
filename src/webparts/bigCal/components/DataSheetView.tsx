import * as React from 'react';
import { DetailsList, DetailsListLayoutMode, IColumn, SelectionMode } from '@fluentui/react/lib/DetailsList';
import { Dropdown, IDropdownOption } from '@fluentui/react/lib/Dropdown';
import { Checkbox } from '@fluentui/react/lib/Checkbox';
import { Text } from '@fluentui/react/lib/Text';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import { Icon } from '@fluentui/react/lib/Icon';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { Modal, IconButton, IIconProps, PrimaryButton } from '@fluentui/react';
import { ICalendarEvent } from './ICalendarEvent';
import { SharePointService } from '../services/SharePointService';
import { HybridEventsService } from '../services/HybridEventsService';
import { Logger } from '../services/LoggingService';
import { WebPartContext } from '@microsoft/sp-webpart-base';
import styles from './DataSheetView.module.scss';
import modalStyles from './DataSheetModal.module.scss';

export interface IDataSheetViewProps {
  context: WebPartContext;
  listName: string;
  events: ICalendarEvent[];
  isLoading: boolean;
  onEventsUpdated?: () => void;
  isModal?: boolean;
  onClose?: () => void;
}

export interface IDataSheetViewState {
  isUpdating: boolean;
  error?: string;
  updatingEventId?: number | string;
  hasUnsavedChanges: boolean;
  pendingChanges: Map<number | string, Partial<ICalendarEvent>>;
  isSaving: boolean;
}

export class DataSheetView extends React.Component<IDataSheetViewProps, IDataSheetViewState> {
  private sharePointService: SharePointService;
  private hybridEventsService: HybridEventsService;

  constructor(props: IDataSheetViewProps) {
    super(props);

    this.state = {
      isUpdating: false,
      error: undefined,
      updatingEventId: undefined,
      hasUnsavedChanges: false,
      pendingChanges: new Map(),
      isSaving: false
    };

    this.sharePointService = new SharePointService(props.context, props.listName);
    this.hybridEventsService = new HybridEventsService(props.context, props.listName);
  }

  private getStatusOptions = (): IDropdownOption[] => {
    return [
      { key: '', text: '(blank)' },
      { key: 'Confirmed', text: 'Confirmed' },
      { key: 'Tentative', text: 'Tentative' },
      { key: 'On Track', text: 'On Track' }
    ];
  };

  private getSwimlaneOptions = (): IDropdownOption[] => {
    return [
      { key: '', text: '(select category)' },
      { key: 'DCDC', text: 'DCDC' },
      { key: 'DISA', text: 'DISA' },
      { key: 'DOD CIO / NSA / USCC', text: 'DOD CIO / NSA / USCC' },
      { key: 'Exec Time', text: 'Exec Time' },
      { key: 'Exercises', text: 'Exercises' },
      { key: 'FYSA', text: 'FYSA' },
      { key: 'Joint DISA & DCDC', text: 'Joint DISA & DCDC' },
      { key: 'Mission Partner', text: 'Mission Partner' },
      { key: 'Out of Office', text: 'Out of Office' },
      { key: 'Speaking Event', text: 'Speaking Event' },
      { key: 'TDY Meetings/Congressional', text: 'TDY Meetings/Congressional' },
      { key: 'Transit', text: 'Transit' }
    ];
  };

  private handleStatusChange = (eventId: number | string, newStatus: string): void => {
    this.updateEventField(eventId, 'status', newStatus);
  };

  private handleSwimlaneChange = (eventId: number | string, newSwimlane: string): void => {
    this.updateEventField(eventId, 'swimlane', newSwimlane);
  };

  private handlePrivateChange = (eventId: number | string, isPrivate: boolean): void => {
    this.updateEventField(eventId, 'isPrivate', isPrivate);
  };

  private handleModalClose = (): void => {
    // If there are unsaved changes, prompt user
    if (this.state.hasUnsavedChanges) {
      const shouldClose = window.confirm(
        'You have unsaved changes. Are you sure you want to close without saving?'
      );

      if (!shouldClose) {
        return; // Don't close the modal
      }
    }

    if (this.props.onClose) {
      this.props.onClose();
    }
  };

  private updateEventField = (eventId: number | string, field: string, value: string | boolean): void => {
    const { pendingChanges } = this.state;

    // Get existing pending changes for this event or create new
    const existingChanges = pendingChanges.get(eventId) || {};
    const updatedChanges = { ...existingChanges, [field]: value };

    // Update pending changes
    const newPendingChanges = new Map<number | string, Partial<ICalendarEvent>>();
    pendingChanges.forEach((value, key) => {
      newPendingChanges.set(key, value);
    });
    newPendingChanges.set(eventId, updatedChanges);

    this.setState({
      pendingChanges: newPendingChanges,
      hasUnsavedChanges: true
    });
  };

  private saveAllChanges = async (): Promise<void> => {
    const { pendingChanges } = this.state;

    if (pendingChanges.size === 0) {
      return;
    }

    this.setState({ isSaving: true, error: undefined });

    try {
      // Process each event with pending changes
      const pendingEntries: Array<[number | string, Partial<ICalendarEvent>]> = [];
      pendingChanges.forEach((value, key) => {
        pendingEntries.push([key, value]);
      });

      for (const [eventId, changes] of pendingEntries) {
        const event = this.props.events.filter((e: ICalendarEvent) => e.id === eventId)[0];
        if (!event) {
          throw new Error(`Event with ID ${eventId} not found`);
        }

        // Apply pending changes to event
        const updatedEvent = { ...event, ...changes };

        // Handle private/public conversion if needed
        if ('isPrivate' in changes) {
          await this.hybridEventsService.updateEvent(
            eventId as number,
            updatedEvent.title,
            updatedEvent.start,
            updatedEvent.end,
            updatedEvent.swimlane || '',
            updatedEvent.status || '',
            updatedEvent.description || '',
            updatedEvent.isPrivate || false
          );
        } else {
          // Regular field updates
          await this.sharePointService.updateEvent(
            eventId as number,
            updatedEvent.title,
            updatedEvent.start,
            updatedEvent.end,
            updatedEvent.swimlane || '',
            updatedEvent.status || '',
            updatedEvent.description || '',
            updatedEvent.isPrivate || false
          );
        }

        Logger.info(`Successfully saved changes for event ${eventId}`);
      }

      // Clear pending changes and refresh parent
      this.setState({
        pendingChanges: new Map<number | string, Partial<ICalendarEvent>>(),
        hasUnsavedChanges: false
      });

      if (this.props.onEventsUpdated) {
        this.props.onEventsUpdated();
      }

    } catch (error) {
      Logger.error('Failed to save changes', error);
      this.setState({
        error: 'Failed to save changes. Please try again.'
      });
    } finally {
      this.setState({ isSaving: false });
    }
  };

  private renderStatusCell = (item: ICalendarEvent): JSX.Element => {
    const isUpdating = this.state.isUpdating && this.state.updatingEventId === item.id;
    const pendingChanges = this.state.pendingChanges.get(item.id);
    const currentValue = pendingChanges?.status !== undefined ? pendingChanges.status : (item.status || '');
    const hasChanges = pendingChanges?.status !== undefined;

    return (
      <div className={styles.editableCell}>
        {isUpdating ? (
          <Spinner size={SpinnerSize.xSmall} />
        ) : (
          <Dropdown
            options={this.getStatusOptions()}
            selectedKey={currentValue as string}
            onChange={(_, option) => {
              if (option) {
                this.handleStatusChange(item.id, option.key as string);
              }
            }}
            styles={{
              dropdown: { minWidth: 100 },
              title: {
                border: hasChanges ? '2px solid #0078d4' : 'none',
                backgroundColor: hasChanges ? '#f3f9ff' : 'transparent'
              }
            }}
          />
        )}
      </div>
    );
  };

  private renderSwimlaneCell = (item: ICalendarEvent): JSX.Element => {
    const isUpdating = this.state.isUpdating && this.state.updatingEventId === item.id;
    const pendingChanges = this.state.pendingChanges.get(item.id);
    const currentValue = pendingChanges?.swimlane !== undefined ? pendingChanges.swimlane : (item.swimlane || '');
    const hasChanges = pendingChanges?.swimlane !== undefined;

    return (
      <div className={styles.editableCell}>
        {isUpdating ? (
          <Spinner size={SpinnerSize.xSmall} />
        ) : (
          <Dropdown
            options={this.getSwimlaneOptions()}
            selectedKey={currentValue as string}
            onChange={(_, option) => {
              if (option) {
                this.handleSwimlaneChange(item.id, option.key as string);
              }
            }}
            styles={{
              dropdown: { minWidth: 150 },
              title: {
                border: hasChanges ? '2px solid #0078d4' : 'none',
                backgroundColor: hasChanges ? '#f3f9ff' : 'transparent'
              }
            }}
          />
        )}
      </div>
    );
  };

  private renderPrivateCell = (item: ICalendarEvent): JSX.Element => {
    const isUpdating = this.state.isUpdating && this.state.updatingEventId === item.id;
    const pendingChanges = this.state.pendingChanges.get(item.id);
    const currentValue = pendingChanges?.isPrivate !== undefined ? pendingChanges.isPrivate : (item.isPrivate || false);
    const hasChanges = pendingChanges?.isPrivate !== undefined;

    return (
      <div className={styles.editableCell}>
        {isUpdating ? (
          <Spinner size={SpinnerSize.xSmall} />
        ) : (
          <Checkbox
            checked={currentValue as boolean}
            onChange={(_, checked) => {
              this.handlePrivateChange(item.id, checked || false);
            }}
            styles={{
              root: {
                backgroundColor: hasChanges ? '#f3f9ff' : 'transparent',
                padding: hasChanges ? '4px 8px' : '0',
                borderRadius: hasChanges ? '4px' : '0',
                border: hasChanges ? '2px solid #0078d4' : 'none'
              }
            }}
          />
        )}
      </div>
    );
  };

  private getColumns = (): IColumn[] => {
    return [
      {
        key: 'title',
        name: 'Title',
        fieldName: 'title',
        minWidth: 150,
        maxWidth: 200,
        isResizable: true,
        onRender: (item: ICalendarEvent) => (
          <Text variant="small" styles={{ root: { fontWeight: 500 } }}>
            {item.title}
          </Text>
        )
      },
      {
        key: 'start',
        name: 'Start Date',
        fieldName: 'start',
        minWidth: 90,
        maxWidth: 110,
        isResizable: true,
        onRender: (item: ICalendarEvent) => (
          <Text variant="small">
            {item.start.toLocaleDateString('en-US', {
              month: '2-digit',
              day: '2-digit',
              year: 'numeric'
            })}
          </Text>
        )
      },
      {
        key: 'startTime',
        name: 'Start Time',
        fieldName: 'startTime',
        minWidth: 75,
        maxWidth: 90,
        isResizable: true,
        onRender: (item: ICalendarEvent) => (
          <Text variant="small">
            {item.start.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            })}
          </Text>
        )
      },
      {
        key: 'end',
        name: 'End Date',
        fieldName: 'end',
        minWidth: 90,
        maxWidth: 110,
        isResizable: true,
        onRender: (item: ICalendarEvent) => (
          <Text variant="small">
            {item.end ? item.end.toLocaleDateString('en-US', {
              month: '2-digit',
              day: '2-digit',
              year: 'numeric'
            }) : '—'}
          </Text>
        )
      },
      {
        key: 'endTime',
        name: 'End Time',
        fieldName: 'endTime',
        minWidth: 75,
        maxWidth: 90,
        isResizable: true,
        onRender: (item: ICalendarEvent) => (
          <Text variant="small">
            {item.end ? item.end.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            }) : '—'}
          </Text>
        )
      },
      {
        key: 'swimlane',
        name: '🎯 Event Category',
        fieldName: 'swimlane',
        minWidth: 140,
        maxWidth: 180,
        isResizable: true,
        onRender: this.renderSwimlaneCell
      },
      {
        key: 'status',
        name: '📊 Status',
        fieldName: 'status',
        minWidth: 100,
        maxWidth: 120,
        isResizable: true,
        onRender: this.renderStatusCell
      },
      {
        key: 'private',
        name: '🔒 Private',
        fieldName: 'private',
        minWidth: 70,
        maxWidth: 85,
        isResizable: true,
        onRender: this.renderPrivateCell
      }
    ];
  };

  private getEventsNeedingAttention = (): ICalendarEvent[] => {
    return this.props.events.filter(event => {
      // Skip holiday events - they don't need configuration
      if (event.isHoliday) {
        return false;
      }

      // Only show events that are truly blank (like fresh Outlook imports)
      // These events have no Status AND no Swimlane AND are not private
      const hasBlankStatus = !event.status || event.status === 'Not Set';
      const hasBlankSwimlane = !event.swimlane; // Must be completely blank
      const isNotPrivate = !event.isPrivate;

      // Show ONLY if ALL three conditions are true (truly needs configuration)
      return hasBlankStatus && hasBlankSwimlane && isNotPrivate;
    });
  };

  public render(): React.ReactElement<IDataSheetViewProps> {
    const { isModal } = this.props;

    const closeIcon: IIconProps = { iconName: 'Cancel' };

    // Render the main content
    const mainContent = this.renderMainContent();

    // If modal mode, wrap in Modal component
    if (isModal) {
      return (
        <Modal
          isOpen={true}
          onDismiss={this.handleModalClose}
          isBlocking={false}
          containerClassName={modalStyles.modalContainer}
          styles={{
            main: {
              width: '1200px !important',
              maxWidth: '1200px !important',
              minWidth: '1200px !important'
            }
          }}
        >
          <div style={{ width: '1200px', maxWidth: '1200px', minWidth: '1200px' }}>
            <div className={modalStyles.modalHeader}>
              <Text variant="xLarge" as="h2">
                DataSheet View
              </Text>
              <IconButton
                iconProps={closeIcon}
                ariaLabel="Close modal"
                onClick={this.handleModalClose}
                className={modalStyles.closeButton}
              />
            </div>

            <div className={modalStyles.modalBody}>
              {mainContent}
            </div>

            <div className={modalStyles.modalFooter}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <Text className={modalStyles.footerText}>
                  Use DataSheet view for bulk edits and Outlook imports. Make your changes and click Save.
                </Text>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  {this.state.hasUnsavedChanges && (
                    <Text variant="small" styles={{ root: { color: '#d83b01', fontStyle: 'italic' } }}>
                      You have unsaved changes
                    </Text>
                  )}
                  <PrimaryButton
                    text={this.state.isSaving ? 'Saving...' : 'Save Changes'}
                    disabled={!this.state.hasUnsavedChanges || this.state.isSaving}
                    onClick={this.saveAllChanges}
                    iconProps={this.state.isSaving ? { iconName: 'Sync' } : { iconName: 'Save' }}
                  />
                </div>
              </div>
            </div>
          </div>
        </Modal>
      );
    }

    // Non-modal mode (legacy)
    return mainContent;
  }

  private renderMainContent(): React.ReactElement {
    const { isLoading } = this.props;
    const { error } = this.state;

    if (isLoading) {
      return (
        <div className={styles.loadingContainer}>
          <Spinner size={SpinnerSize.large} label="Loading events..." />
        </div>
      );
    }

    const eventsNeedingAttention = this.getEventsNeedingAttention();

    return (
      <div className={this.props.isModal ? '' : styles.dataSheetView} style={this.props.isModal ? {} : { paddingLeft: '40px', maxWidth: '1400px' }}>
        {error && (
          <MessageBar
            messageBarType={MessageBarType.error}
            onDismiss={() => this.setState({ error: undefined })}
            dismissButtonAriaLabel="Close"
          >
            {error}
          </MessageBar>
        )}

        {eventsNeedingAttention.length === 0 ? (
          <div className={this.props.isModal ? modalStyles.emptyState : styles.emptyState}>
            <Icon iconName="CheckMark" styles={{ root: { fontSize: 48, color: '#107c10', marginBottom: 16 } }} />
            <Text variant="xLarge" block styles={{ root: { marginBottom: 8, fontWeight: 600 } }}>
              All Events Configured
            </Text>
            <Text variant="medium" block styles={{ root: { color: '#666', textAlign: 'center', maxWidth: 400 } }}>
              No events need bulk configuration. Events imported from Outlook with blank Status and Category will appear here for quick setup.
            </Text>
          </div>
        ) : (
          <>
            <div className={this.props.isModal ? modalStyles.headerInfo : styles.headerInfo}>
              <MessageBar messageBarType={MessageBarType.warning} styles={{ root: { marginBottom: 20 } }}>
                <Text variant="medium">
                  <Icon iconName="Warning" styles={{ root: { marginRight: 8, color: '#ff8c00' } }} />
                  <strong>Showing {eventsNeedingAttention.length} events</strong> imported from Outlook that need configuration.
                  <br />
                  <strong>⚠️ Important:</strong> Only <strong>Event Category</strong> is required for events to display in the calendar.
                </Text>
              </MessageBar>
            </div>
            <div style={this.props.isModal ? {} : {
              backgroundColor: 'white',
              borderRadius: '12px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
              border: '1px solid #e1e5e9',
              overflow: 'hidden'
            }}>
              <DetailsList
                items={eventsNeedingAttention}
                columns={this.getColumns()}
                layoutMode={DetailsListLayoutMode.justified}
                selectionMode={SelectionMode.none}
                isHeaderVisible={true}
                compact={this.props.isModal ? true : false}
                className={this.props.isModal ? modalStyles.detailsList : styles.detailsList}
                styles={this.props.isModal ? {} : {
                  root: {
                    '& .ms-DetailsHeader': {
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      borderBottom: 'none'
                    },
                    '& .ms-DetailsHeader-cell': {
                      color: 'white !important',
                      fontWeight: '600 !important',
                      fontSize: '14px !important',
                      padding: '16px 12px !important'
                    },
                    '& .ms-DetailsRow': {
                      borderBottom: '1px solid #f0f0f0',
                      '&:hover': {
                        backgroundColor: '#f8f9fa !important'
                      }
                    },
                    '& .ms-DetailsRow-cell': {
                      padding: '12px !important',
                      minHeight: '60px !important',
                      display: 'flex !important',
                      alignItems: 'center !important'
                    }
                  }
                }}
              />
            </div>
          </>
        )}
      </div>
    );
  }
}
