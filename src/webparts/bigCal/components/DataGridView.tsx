import * as React from 'react';
import { DetailsList, DetailsListLayoutMode, IColumn, SelectionMode } from '@fluentui/react';
import { ICalendarEvent } from './ICalendarEvent';
import { ColorPaletteService } from '../services/ColorPaletteService';
import styles from './BigCal.module.scss';

export interface IDataGridViewProps {
  events: ICalendarEvent[];
  colorPalette: string;
  eventRenderingMode: string;
  onEventClick: (event: ICalendarEvent) => void;
}

export const DataGridView: React.FC<IDataGridViewProps> = ({
  events,
  colorPalette,
  eventRenderingMode,
  onEventClick
}) => {
  const getEventCategoryIcon = (eventCategory: string): string => {
    switch (eventCategory) {
      case 'Away w/RON':
        return '✈️';
      case 'Day Trip - NCR':
        return '📍';
      case 'Exercise':
        return '🏃';
      case 'FYSA':
        return 'ℹ️';
      case 'Out of Office':
        return '🚪';
      case 'Training Holiday':
        return '🎓';
      case 'VIP/High Priority':
        return '⚠️';
      case 'Private Events':
        return '🔒';
      default:
        return 'ℹ️';
    }
  };

  const getStatusColor = (status: string): string => {
    return ColorPaletteService.getStatusColor(status, colorPalette);
  };

  const columns: IColumn[] = [
    {
      key: 'icon',
      name: '',
      fieldName: 'icon',
      minWidth: 30,
      maxWidth: 30,
      isResizable: false,
      onRender: (item: ICalendarEvent) => {
        const category = item.isPrivate ? 'Private Events' : (item.swimlane || 'FYSA');
        return (
          <span style={{ fontSize: '16px' }}>
            {getEventCategoryIcon(category)}
          </span>
        );
      }
    },
    {
      key: 'title',
      name: 'Event',
      fieldName: 'title',
      minWidth: 200,
      maxWidth: 400,
      isResizable: true,
      onRender: (item: ICalendarEvent) => (
        <div style={{ fontWeight: '600' }}>
          {item.title}
        </div>
      )
    },
    {
      key: 'start',
      name: 'Start Date',
      fieldName: 'start',
      minWidth: 120,
      maxWidth: 150,
      isResizable: true,
      onRender: (item: ICalendarEvent) => (
        <div>
          {item.start.toLocaleDateString()}
          <br />
          <span style={{ fontSize: '12px', color: '#666' }}>
            {item.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      )
    },
    {
      key: 'end',
      name: 'End Date',
      fieldName: 'end',
      minWidth: 120,
      maxWidth: 150,
      isResizable: true,
      onRender: (item: ICalendarEvent) => (
        <div>
          {item.end.toLocaleDateString()}
          <br />
          <span style={{ fontSize: '12px', color: '#666' }}>
            {item.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      )
    },
    {
      key: 'category',
      name: 'Category',
      fieldName: 'swimlane',
      minWidth: 120,
      maxWidth: 180,
      isResizable: true,
      onRender: (item: ICalendarEvent) => {
        const category = item.isPrivate ? 'Private Events' : (item.swimlane || 'FYSA');
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px' }}>
              {getEventCategoryIcon(category)}
            </span>
            <span>{category}</span>
          </div>
        );
      }
    },
    {
      key: 'status',
      name: 'Status',
      fieldName: 'status',
      minWidth: 100,
      maxWidth: 120,
      isResizable: true,
      onRender: (item: ICalendarEvent) => {
        const status = item.status || 'Confirmed';
        const statusColor = getStatusColor(status);
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: statusColor,
                border: '1px solid #ccc'
              }}
            />
            <span>{status}</span>
          </div>
        );
      }
    },
    {
      key: 'description',
      name: 'Description',
      fieldName: 'description',
      minWidth: 200,
      maxWidth: 300,
      isResizable: true,
      isMultiline: true,
      onRender: (item: ICalendarEvent) => (
        <div style={{ 
          maxHeight: '60px', 
          overflow: 'hidden',
          fontSize: '13px',
          color: '#666'
        }}>
          {item.description || '—'}
        </div>
      )
    }
  ];

  const onItemClick = (item?: ICalendarEvent): void => {
    if (item && !item.isHoliday && !(item.isPrivate && item.title === 'Unavailable')) {
      onEventClick(item);
    }
  };

  return (
    <div className={styles.gridView}>
      <DetailsList
        items={events}
        columns={columns}
        layoutMode={DetailsListLayoutMode.justified}
        selectionMode={SelectionMode.none}
        onItemInvoked={onItemClick}
        styles={{
          root: {
            backgroundColor: '#fff',
            border: '1px solid #edebe9'
          },
          headerWrapper: {
            backgroundColor: '#f8f9fa'
          }
        }}
        compact={false}
      />
    </div>
  );
};
