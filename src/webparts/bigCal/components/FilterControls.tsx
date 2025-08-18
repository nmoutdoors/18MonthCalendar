import * as React from 'react';
import { SearchBox, Dropdown, IDropdownOption } from '@fluentui/react';
import styles from './BigCal.module.scss';

export interface IFilterControlsProps {
  searchText: string;
  selectedEventCategories: Set<string>;
  selectedStatuses: Set<string>;
  eventCategoryOptions: IDropdownOption[];
  statusOptions: IDropdownOption[];
  onSearchChange: (searchText: string) => void;
  onEventCategoryChange: (event: React.FormEvent<HTMLDivElement>, option?: IDropdownOption) => void;
  onStatusChange: (event: React.FormEvent<HTMLDivElement>, option?: IDropdownOption) => void;
  onRenderEventCategoryOption: (option?: IDropdownOption) => React.ReactElement;
  onRenderEventCategoryTitle: (options?: IDropdownOption[]) => React.ReactElement;
  onRenderStatusOption: (option?: IDropdownOption) => React.ReactElement;
  onRenderStatusTitle: (options?: IDropdownOption[]) => React.ReactElement;
}

export const FilterControls: React.FC<IFilterControlsProps> = ({
  searchText,
  selectedEventCategories,
  selectedStatuses,
  eventCategoryOptions,
  statusOptions,
  onSearchChange,
  onEventCategoryChange,
  onStatusChange,
  onRenderEventCategoryOption,
  onRenderEventCategoryTitle,
  onRenderStatusOption,
  onRenderStatusTitle
}) => {
  return (
    <div className={styles.filterControls}>
      <SearchBox
        placeholder="Search events..."
        value={searchText}
        onChange={(_, newValue) => onSearchChange(newValue || '')}
        styles={{
          root: {
            width: '200px',
            minWidth: '150px',
            maxWidth: '250px',
            flex: '1 1 200px'
          }
        }}
      />

      <Dropdown
        placeholder="Event Category"
        multiSelect
        options={eventCategoryOptions}
        selectedKeys={(() => {
          const keys: string[] = [];
          selectedEventCategories.forEach(key => keys.push(key));
          return keys;
        })()}
        onChange={onEventCategoryChange}
        onRenderOption={onRenderEventCategoryOption}
        onRenderTitle={onRenderEventCategoryTitle}
        styles={{
          root: {
            width: '200px',
            minWidth: '150px',
            maxWidth: '220px',
            flex: '1 1 200px'
          },
          title: { fontSize: '13px' }
        }}
      />

      <Dropdown
        placeholder="Status"
        multiSelect
        options={statusOptions}
        selectedKeys={(() => {
          const keys: string[] = [];
          selectedStatuses.forEach(key => keys.push(key));
          return keys;
        })()}
        onChange={onStatusChange}
        onRenderOption={onRenderStatusOption}
        onRenderTitle={onRenderStatusTitle}
        styles={{
          root: {
            width: '150px',
            minWidth: '120px',
            maxWidth: '180px',
            flex: '1 1 150px'
          },
          title: { fontSize: '13px' }
        }}
      />
    </div>
  );
};
