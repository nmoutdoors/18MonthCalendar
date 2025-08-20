import * as React from 'react';
import { Callout, DirectionalHint } from '@fluentui/react/lib/Callout';
import { Stack } from '@fluentui/react/lib/Stack';
import { Text } from '@fluentui/react/lib/Text';
import { Icon } from '@fluentui/react/lib/Icon';
import { IconButton } from '@fluentui/react/lib/Button';
import { ICalendarEvent } from './ICalendarEvent';
import { Logger } from '../services/LoggingService';
import styles from './EventPopover.module.scss';

export interface IEventPopoverProps {
  event: ICalendarEvent;
  target: HTMLElement | undefined;
  isVisible: boolean;
  onDismiss: () => void;
  onEdit?: () => void;
}

export class EventPopover extends React.Component<IEventPopoverProps> {
  private getEventCategoryIcon = (swimlane: string): string => {
    switch (swimlane) {
      case 'Away w/RON': return '✈️';
      case 'Day Trip - NCR': return '📍';
      case 'Exercise': return '🏃';
      case 'FYSA': return '📋';
      case 'Out of Office': return '🏠';
      case 'Training Holiday': return '🎓';
      case 'VIP/High Priority': return '⭐';
      default: return '📅';
    }
  };

  private formatDateTime = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  private formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  private isAllDayEvent = (event: ICalendarEvent): boolean => {
    const start = event.start;
    const end = event.end;

    // Check if it's exactly midnight to midnight next day
    return start.getHours() === 0 && start.getMinutes() === 0 &&
           end.getHours() === 0 && end.getMinutes() === 0 &&
           (end.getTime() - start.getTime()) >= 24 * 60 * 60 * 1000;
  };

  private isSameDay = (date1: Date, date2: Date): boolean => {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  };

  public render(): React.ReactElement<IEventPopoverProps> {
    const { event, target, isVisible, onDismiss, onEdit } = this.props;

    Logger.debug(`EventPopover render: ${event?.title || 'no event'} (visible: ${isVisible})`);

    if (!isVisible || !target || !event) {
      return <div />;
    }

    // Don't show popover for holiday events
    if (event.isHoliday) {
      return <div />;
    }

    // Private events get locked icon, regular events get category icon
    const iconEmoji = event.isPrivate ? '🔒' : this.getEventCategoryIcon(event.swimlane!);
    const statusColor = '#6c757d'; // Gray fallback - colors are now handled by Color Palette Studio
    const isAllDay = this.isAllDayEvent(event);
    const isSameDayEvent = this.isSameDay(event.start, event.end);

    let timeDisplay = '';
    if (isAllDay) {
      timeDisplay = 'All day';
    } else if (isSameDayEvent) {
      timeDisplay = `${this.formatTime(event.start)} - ${this.formatTime(event.end)}`;
    } else {
      timeDisplay = `${this.formatDateTime(event.start)} - ${this.formatDateTime(event.end)}`;
    }

    return (
      <Callout
        target={target}
        isBeakVisible={true}
        beakWidth={12}
        gapSpace={8}
        directionalHint={DirectionalHint.topCenter}
        onDismiss={onDismiss}
        setInitialFocus={false}
        className={styles.popoverCallout}
      >
        <div className={styles.popoverContainer}>
          <div className={styles.popoverHeader}>
            <div className={styles.eventTitleRow}>
              <span className={styles.eventIcon}>{iconEmoji}</span>
              <Text variant="mediumPlus" className={styles.eventTitle}>
                {event.title}
              </Text>
              {onEdit && (
                <IconButton
                  iconProps={{ iconName: 'Edit' }}
                  title="Edit event"
                  ariaLabel="Edit event"
                  onClick={onEdit}
                  className={styles.editButton}
                />
              )}
            </div>
          </div>

          <div className={styles.popoverBody}>
            <Stack tokens={{ childrenGap: 8 }}>
              <div className={styles.detailRow}>
                <Icon iconName="Clock" className={styles.detailIcon} />
                <Text variant="small" className={styles.detailText}>
                  {timeDisplay}
                </Text>
              </div>

              <div className={styles.detailRow}>
                <Icon iconName="Tag" className={styles.detailIcon} />
                <Text variant="small" className={styles.detailText}>
                  {event.swimlane}
                </Text>
              </div>

              <div className={styles.detailRow}>
                <Icon iconName="CircleFill" className={styles.detailIcon} style={{ color: statusColor }} />
                <Text variant="small" className={styles.detailText}>
                  {event.status}
                </Text>
              </div>

              {event.description && event.description.trim() && (
                <div className={styles.descriptionRow}>
                  <Icon iconName="Info" className={styles.detailIcon} />
                  <Text variant="small" className={styles.descriptionText}>
                    {event.description}
                  </Text>
                </div>
              )}
            </Stack>
          </div>
        </div>
      </Callout>
    );
  }
}
