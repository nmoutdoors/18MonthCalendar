import * as React from 'react';
import {
  Modal,
  Stack,
  TextField,
  PrimaryButton,
  DefaultButton,
  DatePicker,
  Dropdown,
  IDropdownOption,
  Text,
  IconButton,
  IIconProps,
  Checkbox
} from '@fluentui/react';
import { ICalendarEvent, SwimlaneType, StatusType } from './ICalendarEvent';
import { Logger } from '../services/LoggingService';

import styles from './EventModal.module.scss';

export interface IEventModalProps {
  isOpen: boolean;
  event?: ICalendarEvent;
  selectedDate?: Date;
  dynamicColorMappings?: Map<string, string>;
  dynamicIconMappings?: Map<string, string>;
  availableSwimlanes?: string[]; // Dynamic swimlanes from SharePoint list
  onSave: (event: Partial<ICalendarEvent>) => Promise<void>;
  onDelete?: (eventId: number) => Promise<void>;
  onClose: () => void;
}

interface IEventModalState {
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  startTime: string;
  endTime: string;
  startAmPm: 'AM' | 'PM';
  endAmPm: 'AM' | 'PM';
  swimlane: SwimlaneType;
  status: StatusType;
  isPrivate: boolean;
  isSaving: boolean;
  isDeleting: boolean;
}

// Fallback swimlane options for when dynamic loading fails
const getFallbackSwimlaneOptions = (): IDropdownOption[] => [
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

const amPmOptions: IDropdownOption[] = [
  { key: 'AM', text: 'AM' },
  { key: 'PM', text: 'PM' }
];

// Remove static statusOptions - will be created dynamically in component

export class EventModal extends React.Component<IEventModalProps, IEventModalState> {
  constructor(props: IEventModalProps) {
    super(props);

    const now = new Date();
    const defaultStart = props.selectedDate || now;
    const defaultEnd = new Date(defaultStart.getTime() + 60 * 60 * 1000); // 1 hour later

    const startTimeData = this.formatTimeWithAmPm(props.event?.start || defaultStart);
    const endTimeData = this.formatTimeWithAmPm(props.event?.end || defaultEnd);



    this.state = {
      title: props.event?.title || '',
      description: props.event?.description || '',
      startDate: props.event?.start || defaultStart,
      endDate: props.event?.end || defaultEnd,
      startTime: startTimeData.time,
      endTime: endTimeData.time,
      startAmPm: startTimeData.amPm,
      endAmPm: endTimeData.amPm,
      swimlane: props.event?.swimlane || 'FYSA',
      status: props.event?.status ? props.event.status : 'Not Set', // Show "Not Set" for empty/null status
      isPrivate: props.event?.isPrivate || false,
      isSaving: false,
      isDeleting: false
    };
  }

  public componentDidUpdate(prevProps: IEventModalProps): void {
    // If the modal was closed and reopened, or if selectedDate changed, reset the form
    if (this.props.isOpen && !prevProps.isOpen) {
      // Modal just opened
      if (!this.props.event) {
        // This is create mode, initialize with selectedDate
        const now = new Date();
        const defaultStart = this.props.selectedDate || now;
        const defaultEnd = new Date(defaultStart.getTime() + 60 * 60 * 1000); // 1 hour later

        const startTimeData = this.formatTimeWithAmPm(defaultStart);
        const endTimeData = this.formatTimeWithAmPm(defaultEnd);

        this.setState({
          title: '',
          description: '',
          startDate: defaultStart,
          endDate: defaultEnd,
          startTime: startTimeData.time,
          endTime: endTimeData.time,
          startAmPm: startTimeData.amPm,
          endAmPm: endTimeData.amPm,
          swimlane: 'FYSA',
          status: '', // Default to blank status
          isPrivate: false,
          isSaving: false,
          isDeleting: false
        });
      } else {
        // This is edit mode, initialize with event data
        const startTimeData = this.formatTimeWithAmPm(this.props.event.start);
        const endTimeData = this.formatTimeWithAmPm(this.props.event.end);

        this.setState({
          title: this.props.event.title,
          description: this.props.event.description || '',
          startDate: this.props.event.start,
          endDate: this.props.event.end,
          startTime: startTimeData.time,
          endTime: endTimeData.time,
          startAmPm: startTimeData.amPm,
          endAmPm: endTimeData.amPm,
          swimlane: this.props.event.swimlane || 'FYSA',
          status: this.props.event.status || '', // Keep blank status as empty string
          isPrivate: this.props.event.isPrivate || false,
          isSaving: false,
          isDeleting: false
        });
      }
    }
  }

  private getStatusOptions = (): IDropdownOption[] => {
    // Get Tentative color from Color Palette Studio, fallback to yellow
    const tentativeColor = this.props.dynamicColorMappings?.get('Tentative') || '#ffc107';

    const allStatuses = [
      { key: 'Not Set', text: 'Not Set', data: { color: 'transparent' } },
      { key: 'Confirmed', text: 'Confirmed', data: { color: 'transparent' } },
      { key: 'Tentative', text: 'Tentative', data: { color: tentativeColor } }
    ];

    // Cancel option is always available now
    allStatuses.push({ key: 'Cancel', text: 'Cancel', data: { color: 'transparent' } });

    return allStatuses;
  };

  private onRenderSwimlaneOption = (option?: IDropdownOption): JSX.Element => {
    const icon = this.props.dynamicIconMappings?.get(option?.key as string) || '';
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{
          fontSize: '16px',
          width: '18px',
          textAlign: 'center',
          display: 'inline-block'
        }}>
          {icon}
        </span>
        <span>{option?.text}</span>
      </div>
    );
  };

  private onRenderSwimlaneTitle = (options?: IDropdownOption[]): JSX.Element => {
    const selectedOption = options?.[0];
    const icon = this.props.dynamicIconMappings?.get(selectedOption?.key as string) || '';
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{
          fontSize: '16px',
          width: '18px',
          textAlign: 'center',
          display: 'inline-block'
        }}>
          {icon}
        </span>
        <span>{selectedOption?.text}</span>
      </div>
    );
  };

  /**
   * Get swimlane options dynamically from props or fallback to hardcoded list
   */
  private getSwimlaneOptions = (): IDropdownOption[] => {
    if (this.props.availableSwimlanes && this.props.availableSwimlanes.length > 0) {
      // Use dynamic swimlanes from SharePoint list
      return this.props.availableSwimlanes.map(swimlane => ({
        key: swimlane,
        text: swimlane
      }));
    }

    // Fallback to hardcoded list if dynamic loading failed
    return getFallbackSwimlaneOptions();
  };

  private onRenderStatusOption = (option?: IDropdownOption): JSX.Element => {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div
          style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: option?.data?.color
          }}
        />
        <span>{option?.text || '(blank)'}</span>
      </div>
    );
  };

  private onRenderStatusTitle = (options?: IDropdownOption[]): JSX.Element => {
    const selectedOption = options?.[0];
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div
          style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: selectedOption?.data?.color
          }}
        />
        <span>{selectedOption?.text || '(blank)'}</span>
      </div>
    );
  };

  private formatTimeWithAmPm = (date: Date): { time: string; amPm: 'AM' | 'PM' } => {
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const amPm: 'AM' | 'PM' = hours >= 12 ? 'PM' : 'AM';

    // Convert to 12-hour format
    if (hours === 0) {
      hours = 12; // Midnight becomes 12 AM
    } else if (hours > 12) {
      hours = hours - 12; // PM hours
    }

    // Use manual padding instead of padStart for compatibility
    const minutesStr = minutes < 10 ? `0${minutes}` : minutes.toString();
    const timeString = `${hours}:${minutesStr}`;
    return { time: timeString, amPm };
  };

  private parseTime = (timeString: string, date: Date, amPm?: 'AM' | 'PM'): Date => {
    // Parse time components
    const [hours, minutes] = timeString.split(':').map(Number);

    // Create a new Date object based on the input date, staying in local time
    const result = new Date(date.getTime());

    if (amPm) {
      // 12-hour format with AM/PM
      let adjustedHours = hours;
      if (amPm === 'AM' && hours === 12) {
        adjustedHours = 0; // 12 AM becomes 0 hours
      } else if (amPm === 'PM' && hours !== 12) {
        adjustedHours = hours + 12; // PM hours (except 12 PM)
      }
      result.setHours(adjustedHours, minutes, 0, 0);
    } else {
      // 24-hour format (backward compatibility)
      result.setHours(hours, minutes, 0, 0);
    }



    return result;
  };



  private handleSave = async (): Promise<void> => {
    const { title, startDate, endDate, startTime, endTime, startAmPm, endAmPm, swimlane, status, isPrivate } = this.state;

    if (!title.trim()) {
      alert('Please enter a title for the event.');
      return;
    }

    this.setState({ isSaving: true });

    try {
      const start = this.parseTime(startTime, startDate, startAmPm);
      const end = this.parseTime(endTime, endDate, endAmPm);



      const eventData: Partial<ICalendarEvent> = {
        id: this.props.event?.id,
        title: title.trim(),
        description: this.state.description.trim(),
        start,
        end,
        swimlane,
        status: (status === 'Not Set' ? '' : status), // Convert "Not Set" to empty string for storage
        isPrivate
      };

      await this.props.onSave(eventData);

      // Close the modal after successful save (both create and update)
      this.props.onClose();
    } catch (error) {
      Logger.error('Error saving event', error);
      alert('Failed to save event. Please try again.');
    } finally {
      this.setState({ isSaving: false });
    }
  };

  private handleDelete = async (): Promise<void> => {
    if (!this.props.event || !this.props.onDelete) return;

    if (!confirm('Are you sure you want to delete this event?')) {
      return;
    }

    this.setState({ isDeleting: true });

    try {
      await this.props.onDelete(this.props.event.id as number);
      this.props.onClose();
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Failed to delete event. Please try again.');
    } finally {
      this.setState({ isDeleting: false });
    }
  };

  public render(): React.ReactElement<IEventModalProps> {
    const { isOpen, event, onClose } = this.props;
    const { title, description, startDate, endDate, startTime, endTime, startAmPm, endAmPm, swimlane, status, isPrivate, isSaving, isDeleting } = this.state;
    
    const closeIcon: IIconProps = { iconName: 'Cancel' };
    const isEditMode = !!event;

    return (
      <Modal
        isOpen={isOpen}
        onDismiss={onClose}
        isBlocking={false}
        containerClassName={styles.modalContainer}
        styles={{
          main: {
            width: '690px !important',
            maxWidth: '690px !important',
            minWidth: '690px !important'
          }
        }}
      >
        <div style={{ width: '690px', maxWidth: '690px', minWidth: '690px' }}>
          <div className={styles.modalHeader}>
          <Text variant="xLarge" as="h2">
            {isEditMode ? 'Edit Event' : 'New Event'}
          </Text>
          <IconButton
            iconProps={closeIcon}
            ariaLabel="Close modal"
            onClick={onClose}
            className={styles.closeButton}
          />
        </div>

        <div className={styles.modalBody}>
          <Stack tokens={{ childrenGap: 16 }}>
            {/* Private Event Checkbox - Top Center */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
              <Checkbox
                label="Private Event"
                checked={isPrivate}
                onChange={(_, checked) => this.setState({ isPrivate: checked || false })}
                styles={{
                  root: {
                    backgroundColor: isPrivate ? '#fff4e6' : 'transparent',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    border: isPrivate ? '1px solid #d83b01' : '1px solid transparent'
                  },
                  text: {
                    fontSize: 14,
                    fontWeight: 600,
                    color: isPrivate ? '#d83b01' : '#323130'
                  },
                  checkbox: {
                    borderColor: isPrivate ? '#d83b01' : '#605e5c'
                  }
                }}
              />
            </div>

            <TextField
              label="Event Title"
              value={title}
              onChange={(_, newValue) => this.setState({ title: newValue || '' })}
              required
              placeholder="Enter event title"
            />

            <TextField
              label="Description"
              value={description}
              onChange={(_, newValue) => this.setState({ description: newValue || '' })}
              multiline
              rows={3}
              placeholder="Enter event description (optional)"
            />

            <Stack horizontal tokens={{ childrenGap: 16 }}>
              <Stack.Item grow>
                <DatePicker
                  label="Start Date"
                  value={startDate}
                  onSelectDate={(date) => date && this.setState({ startDate: date })}
                  placeholder="Select start date"
                />
              </Stack.Item>
              <Stack.Item>
                <TextField
                  label="Start Time"
                  value={startTime}
                  onChange={(_, newValue) => this.setState({ startTime: newValue || '' })}
                  placeholder="H:MM"
                  styles={{ root: { width: 70 } }}
                />
              </Stack.Item>
              <Stack.Item>
                <Dropdown
                  label="AM/PM"
                  selectedKey={startAmPm}
                  options={amPmOptions}
                  onChange={(_, option) => this.setState({ startAmPm: option?.key as 'AM' | 'PM' })}
                  styles={{ root: { width: 70 } }}
                />
              </Stack.Item>
            </Stack>

            <Stack horizontal tokens={{ childrenGap: 16 }}>
              <Stack.Item grow>
                <DatePicker
                  label="End Date"
                  value={endDate}
                  onSelectDate={(date) => date && this.setState({ endDate: date })}
                  placeholder="Select end date"
                />
              </Stack.Item>
              <Stack.Item>
                <TextField
                  label="End Time"
                  value={endTime}
                  onChange={(_, newValue) => this.setState({ endTime: newValue || '' })}
                  placeholder="H:MM"
                  styles={{ root: { width: 70 } }}
                />
              </Stack.Item>
              <Stack.Item>
                <Dropdown
                  label="AM/PM"
                  selectedKey={endAmPm}
                  options={amPmOptions}
                  onChange={(_, option) => this.setState({ endAmPm: option?.key as 'AM' | 'PM' })}
                  styles={{ root: { width: 70 } }}
                />
              </Stack.Item>
            </Stack>

            <Stack horizontal tokens={{ childrenGap: 16 }}>
              <Stack.Item grow>
                <Dropdown
                  label="Event Category"
                  selectedKey={swimlane}
                  options={this.getSwimlaneOptions()}
                  onChange={(_, option) => this.setState({ swimlane: option?.key as SwimlaneType })}
                  onRenderOption={this.onRenderSwimlaneOption}
                  onRenderTitle={this.onRenderSwimlaneTitle}
                />
              </Stack.Item>
              <Stack.Item grow>
                <Dropdown
                  label="Status"
                  selectedKey={status}
                  options={this.getStatusOptions()}
                  onChange={(_, option) => this.setState({ status: option?.key as StatusType })}
                  onRenderOption={this.onRenderStatusOption}
                  onRenderTitle={this.onRenderStatusTitle}
                />
              </Stack.Item>
            </Stack>
          </Stack>
        </div>

        <div className={styles.modalFooter}>
          <Stack horizontal horizontalAlign="space-between">
            <Stack.Item>
              {isEditMode && this.props.onDelete && (
                <DefaultButton
                  text="Delete"
                  onClick={this.handleDelete}
                  disabled={isSaving || isDeleting}
                  iconProps={{ iconName: 'Delete' }}
                />
              )}
            </Stack.Item>
            <Stack horizontal tokens={{ childrenGap: 8 }}>
              <DefaultButton
                text="Cancel"
                onClick={onClose}
                disabled={isSaving || isDeleting}
              />
              <PrimaryButton
                text={isEditMode ? 'Update' : 'Create'}
                onClick={this.handleSave}
                disabled={isSaving || isDeleting || !title.trim()}
              />
            </Stack>
          </Stack>
        </div>
        </div>
      </Modal>
    );
  }
}
