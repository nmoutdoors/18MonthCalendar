import * as React from 'react';
import { Dropdown, IDropdownOption, SearchBox } from '@fluentui/react';
import { ICalendarEvent } from './ICalendarEvent';
import { ColorPaletteService } from '../services/ColorPaletteService';
import styles from './BigCal.module.scss';

export interface IFilterPanelProps {
  searchText: string;
  selectedEventCategories: Set<string>;
  selectedStatuses: Set<string>;
  filteredEvents: ICalendarEvent[];
  colorPalette: string;
  eventRenderingMode: string;
  onSearchChange: (searchText: string) => void;
  onEventCategoryChange: (event: React.FormEvent<HTMLDivElement>, option?: IDropdownOption) => void;
  onStatusChange: (event: React.FormEvent<HTMLDivElement>, option?: IDropdownOption) => void;
}

export class FilterPanel extends React.Component<IFilterPanelProps> {
  
  private getEventCategoryDropdownOptions = (): IDropdownOption[] => {
    const { filteredEvents, selectedEventCategories } = this.props;
    const allCategories = [
      'DCDC',
      'DISA',
      'DOD CIO / NSA / USCC',
      'Exec Time',
      'Exercises',
      'FYSA',
      'Joint DISA & DCDC',
      'Mission Partner',
      'Out of Office',
      'Speaking Event',
      'TDY Meetings/Congressional',
      'Transit'
    ];

    // All categories are now available since we removed the problematic ones
    const categories = allCategories;

    const options = categories.map(eventCategory => {
      // Only count regular events, not holidays
      const count = filteredEvents.filter(e => !e.isHoliday && e.swimlane === eventCategory).length;
      return {
        key: eventCategory,
        text: `${eventCategory} (${count})`,
        data: { icon: this.getEventCategoryIcon(eventCategory), count }
      };
    });

    // Add Private Events option (now available in all views since they have their own dedicated lane in timeline)
    const privateCount = filteredEvents.filter(e => !e.isHoliday && e.isPrivate).length;
    options.push({
      key: 'Private Events',
      text: `Private Events (${privateCount})`,
      data: { icon: '🔒', count: privateCount }
    });

    // Add Select All/Unselect All toggle option
    const allSelected = categories.every((category: string) => selectedEventCategories.has(category)) && selectedEventCategories.has('Private Events');
    options.push({
      key: '__toggle_all_categories__',
      text: allSelected ? 'Unselect All' : 'Select All',
      data: { icon: '', count: 0, isToggle: true, allSelected } as { icon: string; count: number; isToggle: boolean; allSelected: boolean }
    });

    return options;
  };

  private getStatusDropdownOptions = (): IDropdownOption[] => {
    const { filteredEvents, selectedStatuses } = this.props;
    const allStatuses = ['Confirmed', 'Tentative', 'Not Set'];

    const options = allStatuses.map(status => {
      // Count events with this status, including events with no status for "Not Set"
      let count: number;
      if (status === 'Not Set') {
        count = filteredEvents.filter(e => !e.isHoliday && (!e.status || e.status === 'Not Set')).length;
      } else {
        count = filteredEvents.filter(e => !e.isHoliday && e.status === status).length;
      }

      return {
        key: status,
        text: `${status} (${count})`,
        data: { color: ColorPaletteService.getStatusColor(status, this.props.colorPalette), count }
      };
    });

    // Add Select All/Unselect All toggle option
    const allSelected = allStatuses.every((status: string) => selectedStatuses.has(status));
    options.push({
      key: '__toggle_all_statuses__',
      text: allSelected ? 'Unselect All' : 'Select All',
      data: { color: '', count: 0, isToggle: true, allSelected } as { color: string; count: number; isToggle: boolean; allSelected: boolean }
    });

    return options;
  };

  private getEventCategoryIcon = (eventCategory: string): string => {
    // Return Unicode emoji symbols for consistent display across all views
    switch (eventCategory) {
      case 'Away w/RON':
        return '✈️'; // Airplane
      case 'Day Trip - NCR':
        return '🚗'; // Car
      case 'DCDC':
        return '🏢'; // Office building
      case 'DISA':
        return '🔒'; // Lock (security)
      case 'DOD CIO / NSA / USCC':
        return '🛡️'; // Shield
      case 'Exec Time':
        return '👔'; // Necktie (executive)
      case 'Exercise':
      case 'Exercises':
        return '🎯'; // Direct hit (training)
      case 'FYSA':
        return '📋'; // Clipboard
      case 'Joint DISA & DCDC':
        return '🤝'; // Handshake
      case 'Mission Partner':
        return '🌐'; // Globe with meridians
      case 'Out of Office':
        return '🏠'; // House
      case 'Speaking Event':
        return '🎤'; // Microphone
      case 'TDY Meetings/Congressional':
        return '🏛️'; // Classical building
      case 'Training Holiday':
        return '🎓'; // Graduation cap
      case 'Transit':
        return '🚌'; // Bus
      case 'VIP/High Priority':
        return '⭐'; // Star
      default:
        return '📅'; // Calendar (default)
    }
  };

  private renderEventCategoryOption = (option?: IDropdownOption): React.ReactElement => {
    if (!option) return <div />;

    // Render toggle button
    if (option.data?.isToggle) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', color: '#0078d4' }}>
          <span>{option.text}</span>
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '14px' }}>{option.data?.icon}</span>
        <span>{option.text}</span>
      </div>
    );
  };

  private renderEventCategoryTitle = (options?: IDropdownOption[]): React.ReactElement => {
    return (
      <span style={{ fontSize: '13px' }}>
        Event Category
      </span>
    );
  };

  private renderStatusOption = (option?: IDropdownOption): React.ReactElement => {
    if (!option) return <div />;

    // Render toggle button
    if (option.data?.isToggle) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', color: '#0078d4' }}>
          <span>{option.text}</span>
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div
          style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: option.data?.color || '#6c757d',
            border: '1px solid #ccc'
          }}
        />
        <span>{option.text}</span>
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

  public render(): React.ReactElement {
    const { searchText, selectedEventCategories, selectedStatuses, onSearchChange, onEventCategoryChange, onStatusChange } = this.props;

    return (
      <div className={styles.leftColumn}>
        <div className={styles.leftColumnContent}>
          {/* Search Box */}
          <div style={{ marginBottom: '16px' }}>
            <SearchBox
              placeholder="Search events..."
              value={searchText}
              onChange={(_, newValue) => onSearchChange(newValue || '')}
              styles={{
                root: { width: '100%' }
              }}
            />
          </div>

          {/* Event Category Filter */}
          <div style={{ marginBottom: '16px' }}>
            <Dropdown
              placeholder="Event Category"
              multiSelect
              options={this.getEventCategoryDropdownOptions()}
              selectedKeys={(() => {
                const keys: string[] = [];
                selectedEventCategories.forEach(key => keys.push(key));
                return keys;
              })()}
              onChange={onEventCategoryChange}
              onRenderOption={this.renderEventCategoryOption}
              onRenderTitle={this.renderEventCategoryTitle}
              styles={{
                root: {
                  width: '280px',
                  minWidth: '250px'
                },
                dropdown: {
                  fontSize: '13px'
                }
              }}
            />
          </div>

          {/* Status Filter */}
          <div style={{ marginBottom: '16px' }}>
            <Dropdown
              placeholder="Status"
              multiSelect
              options={this.getStatusDropdownOptions()}
              selectedKeys={(() => {
                const keys: string[] = [];
                selectedStatuses.forEach(key => keys.push(key));
                return keys;
              })()}
              onChange={onStatusChange}
              onRenderOption={this.renderStatusOption}
              onRenderTitle={this.renderStatusTitle}
              styles={{
                root: {
                  width: '170px',
                  minWidth: '170px'
                },
                dropdown: {
                  fontSize: '13px'
                }
              }}
            />
          </div>
        </div>
      </div>
    );
  }
}
