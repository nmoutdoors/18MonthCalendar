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
  Icon
} from '@fluentui/react';
import { ICalendarEvent, SwimlaneType, StatusType } from './ICalendarEvent';
import styles from './EventModal.module.scss';

export interface IEventModalProps {
  isOpen: boolean;
  event?: ICalendarEvent;
  selectedDate?: Date;
  onSave: (event: Partial<ICalendarEvent>) => Promise<void>;
  onDelete?: (eventId: number) => Promise<void>;
  onClose: () => void;
}

interface IEventModalState {
  title: string;
  startDate: Date;
  endDate: Date;
  startTime: string;
  endTime: string;
  swimlane: SwimlaneType;
  status: StatusType;
  isSaving: boolean;
  isDeleting: boolean;
}

const swimlaneOptions: IDropdownOption[] = [
  { key: 'Category 1', text: 'Category 1', data: { icon: 'People' } },
  { key: 'Category 2', text: 'Category 2', data: { icon: 'Settings' } },
  { key: 'Category 3', text: 'Category 3', data: { icon: 'Calendar' } }
];

const statusOptions: IDropdownOption[] = [
  { key: 'Green', text: 'Green', data: { color: '#0078d4' } }, // SharePoint blue
  { key: 'Amber', text: 'Amber', data: { color: '#FBC02D' } }, // Yellow
  { key: 'Red', text: 'Red', data: { color: '#D32F2F' } } // Red
];

export class EventModal extends React.Component<IEventModalProps, IEventModalState> {
  constructor(props: IEventModalProps) {
    super(props);

    const now = new Date();
    const defaultStart = props.selectedDate || now;
    const defaultEnd = new Date(defaultStart.getTime() + 60 * 60 * 1000); // 1 hour later

    this.state = {
      title: props.event?.title || '',
      startDate: props.event?.start || defaultStart,
      endDate: props.event?.end || defaultEnd,
      startTime: this.formatTime(props.event?.start || defaultStart),
      endTime: this.formatTime(props.event?.end || defaultEnd),
      swimlane: props.event?.swimlane || 'Category 1',
      status: props.event?.status || 'Green',
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

        this.setState({
          title: '',
          startDate: defaultStart,
          endDate: defaultEnd,
          startTime: this.formatTime(defaultStart),
          endTime: this.formatTime(defaultEnd),
          swimlane: 'Category 1',
          status: 'Green',
          isSaving: false,
          isDeleting: false
        });
      } else {
        // This is edit mode, initialize with event data
        this.setState({
          title: this.props.event.title,
          startDate: this.props.event.start,
          endDate: this.props.event.end,
          startTime: this.formatTime(this.props.event.start),
          endTime: this.formatTime(this.props.event.end),
          swimlane: this.props.event.swimlane,
          status: this.props.event.status,
          isSaving: false,
          isDeleting: false
        });
      }
    }
  }

  private onRenderSwimlaneOption = (option?: IDropdownOption): JSX.Element => {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Icon iconName={option?.data?.icon} style={{ fontSize: '14px' }} />
        <span>{option?.text}</span>
      </div>
    );
  };

  private onRenderSwimlaneTitle = (options?: IDropdownOption[]): JSX.Element => {
    const selectedOption = options?.[0];
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Icon iconName={selectedOption?.data?.icon} style={{ fontSize: '14px' }} />
        <span>{selectedOption?.text}</span>
      </div>
    );
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
        <span>{option?.text}</span>
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
        <span>{selectedOption?.text}</span>
      </div>
    );
  };

  private formatTime = (date: Date): string => {
    return date.toTimeString().slice(0, 5); // HH:MM format
  };

  private parseTime = (timeString: string, date: Date): Date => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const newDate = new Date(date.getTime());
    newDate.setHours(hours, minutes, 0, 0);
    return newDate;
  };



  private handleSave = async (): Promise<void> => {
    const { title, startDate, endDate, startTime, endTime, swimlane, status } = this.state;

    if (!title.trim()) {
      alert('Please enter a title for the event.');
      return;
    }

    this.setState({ isSaving: true });

    try {
      const start = this.parseTime(startTime, startDate);
      const end = this.parseTime(endTime, endDate);

      const eventData: Partial<ICalendarEvent> = {
        id: this.props.event?.id,
        title: title.trim(),
        start,
        end,
        swimlane,
        status
      };

      await this.props.onSave(eventData);

      // Close the modal after successful save (both create and update)
      this.props.onClose();
    } catch (error) {
      console.error('Error saving event:', error);
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
      await this.props.onDelete(this.props.event.id);
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
    const { title, startDate, endDate, startTime, endTime, swimlane, status, isSaving, isDeleting } = this.state;
    
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
            <TextField
              label="Event Title"
              value={title}
              onChange={(_, newValue) => this.setState({ title: newValue || '' })}
              required
              placeholder="Enter event title"
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
                  placeholder="HH:MM"
                  styles={{ root: { width: 80 } }}
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
                  placeholder="HH:MM"
                  styles={{ root: { width: 80 } }}
                />
              </Stack.Item>
            </Stack>

            <Stack horizontal tokens={{ childrenGap: 16 }}>
              <Stack.Item grow>
                <Dropdown
                  label="Category"
                  selectedKey={swimlane}
                  options={swimlaneOptions}
                  onChange={(_, option) => this.setState({ swimlane: option?.key as SwimlaneType })}
                  onRenderOption={this.onRenderSwimlaneOption}
                  onRenderTitle={this.onRenderSwimlaneTitle}
                />
              </Stack.Item>
              <Stack.Item grow>
                <Dropdown
                  label="Status"
                  selectedKey={status}
                  options={statusOptions}
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
