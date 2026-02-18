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
  Checkbox,
  MessageBarType,
  Separator
} from '@fluentui/react';
import { ICalendarEvent, SwimlaneType, StatusType, IMOType, OPRType } from './ICalendarEvent';
import { IAttachmentInfo, SharePointService } from '../services/SharePointService';
import { AttachmentUploader } from './AttachmentUploader';
import { AttachmentList } from './AttachmentList';
import { Logger } from '../services/LoggingService';

import styles from './EventModal.module.scss';

export interface IEventModalProps {
  isOpen: boolean;
  event?: ICalendarEvent;
  selectedDate?: Date;
  dynamicColorMappings?: Map<string, string>;
  dynamicIconMappings?: Map<string, string>;
  availableSwimlanes?: string[]; // Dynamic swimlanes from SharePoint list
  sharePointService?: SharePointService; // For attachment operations
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
  imo: IMOType;
  opr: OPRType;
  isPrivate: boolean;
  isSaving: boolean;
  isDeleting: boolean;
  // Attachment-related state
  attachments: IAttachmentInfo[];
  isLoadingAttachments: boolean;
  isUploadingAttachment: boolean;
  attachmentUploadMessage: string;
  attachmentUploadMessageType: MessageBarType;
  attachmentError: string;
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
  { key: 'Seniors', text: 'Seniors' },
  { key: 'Speaking Event', text: 'Speaking Event' },
  { key: 'TDY Meetings/Congressional', text: 'TDY Meetings/Congressional' },
  { key: 'Transit', text: 'Transit' }
];

const amPmOptions: IDropdownOption[] = [
  { key: 'AM', text: 'AM' },
  { key: 'PM', text: 'PM' }
];

// Fallback IMO options
const getFallbackIMOOptions = (): IDropdownOption[] => [
  { key: 'Not Set', text: 'Not Set' },
  { key: 'IMO 1', text: 'IMO 1' },
  { key: 'IMO 2', text: 'IMO 2' },
  { key: 'IMO 3', text: 'IMO 3' },
  { key: 'IMO 4', text: 'IMO 4' },
  { key: 'IMO 5', text: 'IMO 5' },
  { key: 'IMO 6', text: 'IMO 6' },
  { key: 'IMO 7', text: 'IMO 7' },
  { key: 'IMO 8', text: 'IMO 8' }
];

// Fallback OPR options
const getFallbackOPROptions = (): IDropdownOption[] => [
  { key: 'Not Set', text: 'Not Set' },
  { key: 'J-0', text: 'J-0' },
  { key: 'J-3/5/7', text: 'J-3/5/7' },
  { key: 'Industry - EM', text: 'Industry - EM' },
  { key: 'DAFA - SPIO', text: 'DAFA - SPIO' },
  { key: 'MILDEPs - SPIO', text: 'MILDEPs - SPIO' },
  { key: 'International Engagements', text: 'International Engagements' },
  { key: 'Speaking Engagements - PAO', text: 'Speaking Engagements - PAO' },
  { key: 'Media Engagements/Queries - PAO', text: 'Media Engagements/Queries - PAO' },
  { key: 'Conferences and Exhibits - PAO', text: 'Conferences and Exhibits - PAO' },
  { key: 'J9', text: 'J9' },
  { key: 'Internal Engagements', text: 'Internal Engagements' },
  { key: 'OSD/Congress', text: 'OSD/Congress' }
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
      imo: (() => {
        // Handle IMO field: treat empty string as "Not Set", preserve actual values
        if (props.event?.imo === undefined || props.event?.imo === null || props.event?.imo === '') {
          return 'Not Set';
        }
        return props.event.imo;
      })(),
      opr: (() => {
        // Handle OPR field: treat empty string as "Not Set", preserve actual values
        if (props.event?.opr === undefined || props.event?.opr === null || props.event?.opr === '') {
          return 'Not Set';
        }
        return props.event.opr;
      })(),
      isPrivate: props.event?.isPrivate || false,
      isSaving: false,
      isDeleting: false,
      // Attachment-related state
      attachments: [],
      isLoadingAttachments: false,
      isUploadingAttachment: false,
      attachmentUploadMessage: '',
      attachmentUploadMessageType: MessageBarType.info,
      attachmentError: ''
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
          imo: 'Not Set',
          opr: 'J-0', // Default to first OPR option since it's mandatory
          isPrivate: false,
          isSaving: false,
          isDeleting: false,
          // Reset attachment state for create mode
          attachments: [],
          isLoadingAttachments: false,
          isUploadingAttachment: false,
          attachmentUploadMessage: '',
          attachmentUploadMessageType: MessageBarType.info,
          attachmentError: ''
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
          imo: (() => {
            // Handle IMO field: treat empty string as "Not Set", preserve actual values
            if (this.props.event.imo === undefined || this.props.event.imo === null || this.props.event.imo === '') {
              return 'Not Set';
            }
            return this.props.event.imo;
          })(),
          opr: (() => {
            // Handle OPR field: treat empty string as "Not Set", preserve actual values
            if (this.props.event.opr === undefined || this.props.event.opr === null || this.props.event.opr === '') {
              return 'Not Set';
            }
            return this.props.event.opr;
          })(),
          isPrivate: this.props.event.isPrivate || false,
          isSaving: false,
          isDeleting: false,
          // Reset attachment state for edit mode
          attachments: [],
          isLoadingAttachments: false,
          isUploadingAttachment: false,
          attachmentUploadMessage: '',
          attachmentUploadMessageType: MessageBarType.info,
          attachmentError: ''
        });

        // Load attachments for edit mode
        this.loadAttachments().catch(error => {
          Logger.error('Error loading attachments in componentDidUpdate', error);
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

  /**
   * Get IMO options - always use fallback list (no dynamic loading for IMO)
   */
  private getIMOOptions = (): IDropdownOption[] => {
    return getFallbackIMOOptions();
  };

  /**
   * Get OPR options - always use fallback list (no dynamic loading for OPR)
   */
  private getOPROptions = (): IDropdownOption[] => {
    return getFallbackOPROptions();
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
    const { title, startDate, endDate, startTime, endTime, startAmPm, endAmPm, swimlane, status, imo, opr, isPrivate } = this.state;

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
        imo: (imo === 'Not Set' ? '' : imo), // Convert "Not Set" to empty string for storage
        opr: (opr === 'Not Set' ? '' : opr), // Convert "Not Set" to empty string for storage
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

  // ==================== ATTACHMENT METHODS ====================

  private loadAttachments = async (): Promise<void> => {
    if (!this.props.event || !this.props.sharePointService) {
      return;
    }

    const eventId = this.props.event.id as number;
    if (!eventId || eventId <= 0) {
      return;
    }

    this.setState({
      isLoadingAttachments: true,
      attachmentError: ''
    });

    try {
      const attachments = await this.props.sharePointService.getEventAttachments(eventId);
      this.setState({
        attachments,
        isLoadingAttachments: false
      });
    } catch (error) {
      Logger.error('Error loading attachments', error);
      this.setState({
        attachmentError: 'Failed to load attachments',
        isLoadingAttachments: false
      });
    }
  };

  private handleFileUpload = async (file: File): Promise<void> => {
    if (!this.props.event || !this.props.sharePointService) {
      this.setState({
        attachmentUploadMessage: 'Cannot upload attachments: Event must be saved first',
        attachmentUploadMessageType: MessageBarType.warning
      });
      return;
    }

    const eventId = this.props.event.id as number;

    if (!eventId || eventId <= 0) {
      this.setState({
        attachmentUploadMessage: 'Cannot upload attachments: Event must be saved first',
        attachmentUploadMessageType: MessageBarType.warning
      });
      return;
    }

    // Validate file
    const validation = this.props.sharePointService.validateFileForUpload(file);

    if (!validation.isValid) {
      this.setState({
        attachmentUploadMessage: validation.errorMessage || 'File validation failed',
        attachmentUploadMessageType: MessageBarType.error
      });
      return;
    }

    this.setState({
      isUploadingAttachment: true,
      attachmentUploadMessage: `Uploading ${file.name}...`,
      attachmentUploadMessageType: MessageBarType.info
    });

    try {
      // Read the file as ArrayBuffer before uploading
      const fileContent = await this.readFileAsArrayBuffer(file);

      const result = await this.props.sharePointService.addEventAttachment(eventId, file.name, fileContent);

      if (result.success) {
        this.setState({
          attachmentUploadMessage: `Successfully uploaded ${file.name}`,
          attachmentUploadMessageType: MessageBarType.success,
          isUploadingAttachment: false
        });

        // Reload attachments to show the new file
        await this.loadAttachments();

        // Clear success message after 3 seconds
        setTimeout(() => {
          this.setState({ attachmentUploadMessage: '' });
        }, 3000);
      } else {
        this.setState({
          attachmentUploadMessage: result.errorMessage || 'Failed to upload file',
          attachmentUploadMessageType: MessageBarType.error,
          isUploadingAttachment: false
        });
      }
    } catch (error) {
      Logger.error('Error uploading attachment', error);
      this.setState({
        attachmentUploadMessage: 'Failed to upload file',
        attachmentUploadMessageType: MessageBarType.error,
        isUploadingAttachment: false
      });
    }
  };

  /**
   * Read a File object as ArrayBuffer for upload
   */
  private readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result instanceof ArrayBuffer) {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to read file as ArrayBuffer'));
        }
      };
      reader.onerror = () => {
        reject(new Error('Error reading file'));
      };
      reader.readAsArrayBuffer(file);
    });
  };

  private handleAttachmentDownload = (fileName: string): void => {
    if (!this.props.event || !this.props.sharePointService) {
      return;
    }

    // Find the attachment in the state to get its ServerRelativeUrl
    let attachment: IAttachmentInfo | undefined;
    for (let i = 0; i < this.state.attachments.length; i++) {
      if (this.state.attachments[i].FileName === fileName) {
        attachment = this.state.attachments[i];
        break;
      }
    }

    if (attachment && attachment.ServerRelativeUrl) {
      // ServerRelativeUrl is already a full server-relative path (e.g., /sites/Dev/Lists/...)
      // We need to get the origin (protocol + hostname) and append the ServerRelativeUrl
      const origin = window.location.origin;
      const downloadUrl = `${origin}${attachment.ServerRelativeUrl}`;
      window.open(downloadUrl, '_blank');
    } else {
      // Fallback to the old method if ServerRelativeUrl is not available
      const eventId = this.props.event.id as number;
      const downloadUrl = this.props.sharePointService.getAttachmentDownloadUrl(eventId, fileName);
      window.open(downloadUrl, '_blank');
    }
  };

  private handleAttachmentDelete = async (fileName: string): Promise<void> => {
    if (!this.props.event || !this.props.sharePointService) {
      return;
    }

    const eventId = this.props.event.id as number;

    try {
      await this.props.sharePointService.deleteEventAttachment(eventId, fileName);

      // Reload attachments to reflect the deletion
      await this.loadAttachments();
    } catch (error) {
      Logger.error('Error deleting attachment', error);
      throw error; // Let AttachmentList handle the error display
    }
  };

  public render(): React.ReactElement<IEventModalProps> {
    const { isOpen, event, onClose } = this.props;
    const {
      title, description, startDate, endDate, startTime, endTime, startAmPm, endAmPm,
      swimlane, status, imo, opr, isPrivate, isSaving, isDeleting,
      attachments, isLoadingAttachments, isUploadingAttachment, attachmentUploadMessage,
      attachmentUploadMessageType, attachmentError
    } = this.state;
    
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
          <Stack tokens={{ childrenGap: 12 }}>
            {/* Private Event Checkbox - Reduced margin */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
              <Checkbox
                label="Private Event"
                checked={isPrivate}
                onChange={(_, checked) => this.setState({ isPrivate: checked || false })}
                styles={{
                  root: {
                    backgroundColor: isPrivate ? '#fff4e6' : 'transparent',
                    padding: '6px 12px',
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
              rows={2}
              placeholder="Enter event description (optional)"
            />

            {/* Start Date and Time Row */}
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

            {/* End Date and Time Row */}
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

            {/* Event Category and Status Row */}
            <Stack horizontal tokens={{ childrenGap: 16 }}>
              <Stack.Item>
                <Dropdown
                  label="Event Category"
                  selectedKey={swimlane}
                  options={this.getSwimlaneOptions()}
                  onChange={(_, option) => this.setState({ swimlane: option?.key as SwimlaneType })}
                  onRenderOption={this.onRenderSwimlaneOption}
                  onRenderTitle={this.onRenderSwimlaneTitle}
                  styles={{ root: { width: 300 } }}
                />
              </Stack.Item>
              <Stack.Item>
                <Dropdown
                  label="Status"
                  selectedKey={status}
                  options={this.getStatusOptions()}
                  onChange={(_, option) => this.setState({ status: option?.key as StatusType })}
                  onRenderOption={this.onRenderStatusOption}
                  onRenderTitle={this.onRenderStatusTitle}
                  styles={{ root: { width: 300 } }}
                />
              </Stack.Item>
            </Stack>

            {/* IMO and OPR Row */}
            <Stack horizontal tokens={{ childrenGap: 16 }}>
              <Stack.Item>
                <Dropdown
                  label="IMO"
                  selectedKey={imo}
                  options={this.getIMOOptions()}
                  onChange={(_, option) => this.setState({ imo: option?.key as IMOType })}
                  styles={{ root: { width: 300 } }}
                />
              </Stack.Item>
              <Stack.Item>
                <Dropdown
                  label="OPR"
                  selectedKey={opr}
                  options={this.getOPROptions()}
                  onChange={(_, option) => this.setState({ opr: option?.key as OPRType })}
                  styles={{ root: { width: 300 } }}
                />
              </Stack.Item>
            </Stack>

            {/* Attachment Section */}
            <Stack tokens={{ childrenGap: 12 }}>
              <Separator>
                <Text variant="medium" styles={{ root: { fontWeight: 600 } }}>
                  Attachments
                </Text>
              </Separator>

              {isEditMode ? (
                <Stack tokens={{ childrenGap: 16 }}>
                  <AttachmentList
                    attachments={attachments}
                    onDownload={this.handleAttachmentDownload}
                    onDelete={this.handleAttachmentDelete}
                    isLoading={isLoadingAttachments}
                    errorMessage={attachmentError}
                  />

                  <AttachmentUploader
                    onFileUpload={this.handleFileUpload}
                    isUploading={isUploadingAttachment}
                    uploadMessage={attachmentUploadMessage}
                    uploadMessageType={attachmentUploadMessageType}
                    maxFileSizeMB={10}
                  />
                </Stack>
              ) : (
                <Text variant="small" styles={{ root: { color: '#666', fontStyle: 'italic' } }}>
                  Save the event first to add attachments
                </Text>
              )}
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
