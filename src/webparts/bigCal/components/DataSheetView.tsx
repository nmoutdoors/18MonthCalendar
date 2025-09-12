import * as React from 'react';
import { DetailsList, DetailsListLayoutMode, IColumn, SelectionMode } from '@fluentui/react/lib/DetailsList';
import { Dropdown, IDropdownOption } from '@fluentui/react/lib/Dropdown';
import { Checkbox } from '@fluentui/react/lib/Checkbox';
import { Text } from '@fluentui/react/lib/Text';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import { Icon } from '@fluentui/react/lib/Icon';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { Modal, IconButton, IIconProps, PrimaryButton, TextField } from '@fluentui/react';
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

  /**
   * Detect if content contains HTML markup, CSS, or other formatting
   */
  private detectHtmlContent = (content: string): boolean => {
    if (!content) return false;

    // Check for HTML tags
    const hasHtmlTags = content.indexOf('<') !== -1 && content.indexOf('>') !== -1;

    // Check for CSS styles
    const hasCssStyles = content.indexOf('style=') !== -1 ||
                        content.indexOf('margin') !== -1 ||
                        content.indexOf('font-') !== -1 ||
                        content.indexOf('color:') !== -1;

    // Check for HTML entities
    const hasHtmlEntities = content.indexOf('&') !== -1 && content.indexOf(';') !== -1;

    return hasHtmlTags || hasCssStyles || hasHtmlEntities;
  };

  /**
   * Strip HTML tags, CSS styles, and decode HTML entities from Outlook-generated descriptions
   */
  private stripHtmlFromDescription = (htmlString: string): string => {
    if (!htmlString) return '';

    try {
      // First, remove style attributes and CSS blocks
      const cleanedHtml = htmlString
        // Remove style attributes
        .replace(/\s*style\s*=\s*["'][^"']*["']/gi, '')
        // Remove CSS blocks
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        // Remove script blocks
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        // Remove HTML comments
        .replace(/<!--[\s\S]*?-->/g, '')
        // Remove XML/Office namespace declarations
        .replace(/\s*xmlns[^=]*=["'][^"']*["']/gi, '')
        // Remove Office-specific attributes
        .replace(/\s*o:[^=]*=["'][^"']*["']/gi, '')
        .replace(/\s*w:[^=]*=["'][^"']*["']/gi, '')
        .replace(/\s*v:[^=]*=["'][^"']*["']/gi, '');

      // Create a temporary DOM element to parse the cleaned HTML
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = cleanedHtml;

      // Extract text content (automatically strips remaining HTML tags)
      let textContent = tempDiv.textContent || tempDiv.innerText || '';

      // Clean up common Outlook artifacts and formatting
      textContent = textContent
        // Remove multiple whitespace/newlines
        .replace(/\s+/g, ' ')
        // Remove common Outlook artifacts
        .replace(/\u00A0/g, ' ') // Non-breaking spaces
        .replace(/\u200B/g, '') // Zero-width spaces
        .replace(/\u2060/g, '') // Word joiners
        // Clean up punctuation spacing
        .replace(/\s*([,.!?;:])\s*/g, '$1 ')
        // Remove leading/trailing whitespace
        .trim();

      return textContent;

    } catch (error) {
      Logger.warn('Error stripping HTML from description, returning original text', error);
      // Fallback: return original string if parsing fails
      return htmlString;
    }
  };

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
      { key: 'Seniors', text: 'Seniors' },
      { key: 'Speaking Event', text: 'Speaking Event' },
      { key: 'TDY Meetings/Congressional', text: 'TDY Meetings/Congressional' },
      { key: 'Transit', text: 'Transit' }
    ];
  };

  private getIMOOptions = (): IDropdownOption[] => {
    return [
      { key: '', text: '(select IMO)' },
      { key: 'IMO 1', text: 'IMO 1' },
      { key: 'IMO 2', text: 'IMO 2' },
      { key: 'IMO 3', text: 'IMO 3' },
      { key: 'IMO 4', text: 'IMO 4' },
      { key: 'IMO 5', text: 'IMO 5' },
      { key: 'IMO 6', text: 'IMO 6' },
      { key: 'IMO 7', text: 'IMO 7' },
      { key: 'IMO 8', text: 'IMO 8' }
    ];
  };

  private handleStatusChange = (eventId: number | string, newStatus: string): void => {
    this.updateEventField(eventId, 'status', newStatus);
  };

  private handleSwimlaneChange = (eventId: number | string, newSwimlane: string): void => {
    this.updateEventField(eventId, 'swimlane', newSwimlane);
  };

  private handleIMOChange = (eventId: number | string, newIMO: string): void => {
    this.updateEventField(eventId, 'imo', newIMO);
  };

  private handlePrivateChange = (eventId: number | string, isPrivate: boolean): void => {
    this.updateEventField(eventId, 'isPrivate', isPrivate);
  };

  private handleDescriptionChange = (eventId: number | string, description: string): void => {
    this.updateEventField(eventId, 'description', description);
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
            updatedEvent.imo || '',
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
            updatedEvent.imo || '',
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

  private renderIMOCell = (item: ICalendarEvent): JSX.Element => {
    const isUpdating = this.state.isUpdating && this.state.updatingEventId === item.id;
    const pendingChanges = this.state.pendingChanges.get(item.id);
    const currentValue = pendingChanges?.imo !== undefined ? pendingChanges.imo : (item.imo || '');
    const hasChanges = pendingChanges?.imo !== undefined;

    return (
      <div className={styles.editableCell}>
        {isUpdating ? (
          <Spinner size={SpinnerSize.xSmall} />
        ) : (
          <Dropdown
            options={this.getIMOOptions()}
            selectedKey={currentValue as string}
            onChange={(_, option) => {
              if (option) {
                this.handleIMOChange(item.id, option.key as string);
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

  private renderDescriptionCell = (item: ICalendarEvent): JSX.Element => {
    const isUpdating = this.state.isUpdating && this.state.updatingEventId === item.id;
    const pendingChanges = this.state.pendingChanges.get(item.id);
    const currentValue = pendingChanges?.description !== undefined ? pendingChanges.description : (item.description || '');
    const hasChanges = pendingChanges?.description !== undefined;

    // Strip HTML from description for display and editing
    const cleanDescription = this.stripHtmlFromDescription(currentValue);
    const hasHtmlContent = this.detectHtmlContent(currentValue);

    // Check if stripping actually cleaned something significant
    const wasSignificantlyCleaned = currentValue && cleanDescription &&
      (currentValue.length - cleanDescription.length) > 20;

    return (
      <div className={styles.editableCell} style={{ width: '100%' }}>
        {isUpdating ? (
          <Spinner size={SpinnerSize.xSmall} />
        ) : (
          <div style={{ width: '100%' }}>
            {(hasHtmlContent || wasSignificantlyCleaned) && (
              <div style={{
                fontSize: '10px',
                color: wasSignificantlyCleaned ? '#d13438' : '#ff8c00',
                fontWeight: 'bold',
                marginBottom: '4px',
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                {wasSignificantlyCleaned ? '🧹 HTML/CSS Cleaned' : '⚠️ HTML Detected'}
                {wasSignificantlyCleaned && (
                  <span style={{
                    fontSize: '9px',
                    color: '#666',
                    fontWeight: 'normal',
                    textTransform: 'none'
                  }}>
                    ({currentValue.length - cleanDescription.length} chars removed)
                  </span>
                )}
              </div>
            )}
            <TextField
              value={cleanDescription}
              onChange={(event: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string) => {
                this.handleDescriptionChange(item.id, newValue || '');
              }}
              multiline
              rows={2}
              placeholder="Event description..."
              styles={{
                root: { width: '100%' },
                field: {
                  fontSize: '12px',
                  backgroundColor: hasChanges ? '#f3f9ff' : (hasHtmlContent ? '#fff8f0' : 'white'),
                  border: hasChanges ? '2px solid #0078d4' : '1px solid #edebe9',
                  borderRadius: '4px'
                }
              }}
            />
          </div>
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
        name: 'Start',
        fieldName: 'start',
        minWidth: 140,
        maxWidth: 160,
        isResizable: true,
        onRender: (item: ICalendarEvent) => (
          <Text variant="small">
            {item.start.toLocaleDateString('en-US', {
              month: '2-digit',
              day: '2-digit',
              year: 'numeric'
            })} {item.start.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            })}
          </Text>
        )
      },
      {
        key: 'end',
        name: 'End',
        fieldName: 'end',
        minWidth: 140,
        maxWidth: 160,
        isResizable: true,
        onRender: (item: ICalendarEvent) => (
          <Text variant="small">
            {item.end ? `${item.end.toLocaleDateString('en-US', {
              month: '2-digit',
              day: '2-digit',
              year: 'numeric'
            })} ${item.end.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            })}` : '—'}
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
        key: 'imo',
        name: '🏢 IMO',
        fieldName: 'imo',
        minWidth: 100,
        maxWidth: 120,
        isResizable: true,
        onRender: this.renderIMOCell
      },
      {
        key: 'private',
        name: '🔒 Private',
        fieldName: 'private',
        minWidth: 70,
        maxWidth: 85,
        isResizable: true,
        onRender: this.renderPrivateCell
      },
      {
        key: 'description',
        name: '📝 Description',
        fieldName: 'description',
        minWidth: 200,
        maxWidth: 300,
        isResizable: true,
        onRender: this.renderDescriptionCell
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
        >
          <div>
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
