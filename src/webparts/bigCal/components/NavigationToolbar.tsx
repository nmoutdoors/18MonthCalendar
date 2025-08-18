import * as React from 'react';
import { IconButton, IIconProps, Pivot, PivotItem } from '@fluentui/react';
import { View } from 'react-big-calendar';
import styles from './BigCal.module.scss';

export interface INavigationToolbarProps {
  isFullscreen: boolean;
  currentView: View;
  currentDate: Date;
  viewMode: 'calendar' | 'grid' | 'timeline';
  showPalettePicker: boolean;
  showIconSelector: boolean;
  showImpersonateButton: boolean;
  emulateNonPrivilegedUser: boolean;
  onToggleFullscreen: () => void;
  onToggleProperties: () => void;
  onViewChange: (view: View) => void;
  onNavigate: (date: Date, view: View, action: 'PREV' | 'NEXT' | 'TODAY' | 'DATE') => void;
  onViewModeChange: (viewMode: 'calendar' | 'grid' | 'timeline') => void;
  onOpenExportDialog: () => void;
  onOpenPrintDialog: () => void;
  onToggleIconSelector: () => void;
  onTogglePalettePicker: () => void;
  onToggleImpersonate: () => void;
}

export const NavigationToolbar: React.FC<INavigationToolbarProps> = ({
  isFullscreen,
  currentView,
  currentDate,
  viewMode,
  showPalettePicker,
  showIconSelector,
  showImpersonateButton,
  emulateNonPrivilegedUser,
  onToggleFullscreen,
  onToggleProperties,
  onViewChange,
  onNavigate,
  onViewModeChange,
  onOpenExportDialog,
  onOpenPrintDialog,
  onToggleIconSelector,
  onTogglePalettePicker,
  onToggleImpersonate
}) => {
  // Icon definitions
  const fullscreenIcon: IIconProps = { iconName: isFullscreen ? 'BackToWindow' : 'FullScreen' };
  const propertiesIcon: IIconProps = { iconName: 'Settings' };
  const exportIcon: IIconProps = { iconName: 'ExcelDocument' };
  const printIcon: IIconProps = { iconName: 'Print' };
  const iconSelectorIcon: IIconProps = { iconName: 'Emoji2' };
  const paletteIcon: IIconProps = { iconName: 'Color' };
  const impersonateIcon: IIconProps = { iconName: emulateNonPrivilegedUser ? 'RedEye' : 'Hide3' };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long' 
    });
  };

  const handlePrevious = (): void => {
    const newDate = new Date(currentDate.getTime());
    if (currentView === 'month') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else if (currentView === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    } else if (currentView === 'day') {
      newDate.setDate(newDate.getDate() - 1);
    }
    onNavigate(newDate, currentView, 'PREV');
  };

  const handleNext = (): void => {
    const newDate = new Date(currentDate.getTime());
    if (currentView === 'month') {
      newDate.setMonth(newDate.getMonth() + 1);
    } else if (currentView === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else if (currentView === 'day') {
      newDate.setDate(newDate.getDate() + 1);
    }
    onNavigate(newDate, currentView, 'NEXT');
  };

  const handleToday = (): void => {
    onNavigate(new Date(), currentView, 'TODAY');
  };

  return (
    <div className={styles.navbar}>
      <div className={styles.navbarLeft}>
        {/* Navigation Controls */}
        <div className={styles.navControls}>
          <IconButton
            iconProps={{ iconName: 'ChevronLeft' }}
            title="Previous"
            onClick={handlePrevious}
            className={styles.navbarButton}
          />
          <IconButton
            iconProps={{ iconName: 'ChevronRight' }}
            title="Next"
            onClick={handleNext}
            className={styles.navbarButton}
          />
          <IconButton
            iconProps={{ iconName: 'GotoToday' }}
            title="Today"
            onClick={handleToday}
            className={styles.navbarButton}
          />
        </div>

        {/* Current Date Display */}
        <div className={styles.currentDate}>
          {formatDate(currentDate)}
        </div>

        {/* View Mode Selector */}
        <Pivot
          selectedKey={viewMode}
          onLinkClick={(item) => {
            if (item?.props.itemKey) {
              onViewModeChange(item.props.itemKey as 'calendar' | 'grid' | 'timeline');
            }
          }}
          headersOnly
          className={styles.viewModePivot}
        >
          <PivotItem headerText="📅 Calendar" itemKey="calendar" />
          <PivotItem headerText="📊 Grid" itemKey="grid" />
          <PivotItem headerText="📈 Timeline" itemKey="timeline" />
        </Pivot>

        {/* Calendar View Controls (only show in calendar mode) */}
        {viewMode === 'calendar' && (
          <Pivot
            selectedKey={currentView}
            onLinkClick={(item) => {
              if (item?.props.itemKey) {
                onViewChange(item.props.itemKey as View);
              }
            }}
            headersOnly
            className={styles.calendarViewPivot}
          >
            <PivotItem headerText="Month" itemKey="month" />
            <PivotItem headerText="Week" itemKey="week" />
            <PivotItem headerText="Day" itemKey="day" />
            <PivotItem headerText="Agenda" itemKey="agenda" />
          </Pivot>
        )}
      </div>

      <div className={styles.navbarRight}>
        {/* Feature Buttons */}
        {showIconSelector && (
          <IconButton
            iconProps={iconSelectorIcon}
            title="Icon Selector"
            onClick={onToggleIconSelector}
            className={styles.navbarButton}
          />
        )}

        {showPalettePicker && (
          <IconButton
            iconProps={paletteIcon}
            title="Color Palette"
            onClick={onTogglePalettePicker}
            className={styles.navbarButton}
          />
        )}

        {showImpersonateButton && (
          <IconButton
            iconProps={impersonateIcon}
            title={emulateNonPrivilegedUser ? "Show as Admin" : "Show as User"}
            onClick={onToggleImpersonate}
            className={styles.navbarButton}
          />
        )}

        {/* Action Buttons */}
        <IconButton
          iconProps={exportIcon}
          title="Excel Export/Import"
          onClick={onOpenExportDialog}
          className={styles.navbarButton}
        />

        <IconButton
          iconProps={printIcon}
          title="Print Calendar"
          onClick={onOpenPrintDialog}
          className={styles.navbarButton}
        />

        <IconButton
          iconProps={propertiesIcon}
          title="Configure Web Part Properties"
          onClick={onToggleProperties}
          className={styles.navbarButton}
        />

        <IconButton
          iconProps={fullscreenIcon}
          title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          onClick={onToggleFullscreen}
          className={styles.navbarButton}
        />
      </div>
    </div>
  );
};
