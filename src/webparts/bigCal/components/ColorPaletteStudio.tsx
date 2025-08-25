import * as React from 'react';
import {
  Modal,
  PrimaryButton,
  DefaultButton,
  Stack,
  Text,
  Spinner,
  SpinnerSize,
  MessageBar,
  MessageBarType,
  ColorPicker,
  IColor,
  getColorFromString,
  Icon,
  Checkbox,
} from '@fluentui/react';
import { IColorMapping, IFieldOption, ORIGINAL_COLOR_MAPPINGS, getDefaultIcon } from '../interfaces/IColorMapping';
import { getContextualIcons, getComprehensiveIcons, IIconOption } from '../utils/IconMappings';
import styles from './BigCal.module.scss';

export interface IColorPaletteStudioProps {
  isOpen: boolean;
  onDismiss: () => void;
  discoveredOptions: IFieldOption[];
  colorMappings: IColorMapping[];
  isLoading: boolean;
  error?: string;
  onSaveColorMappings: (mappings: IColorMapping[]) => Promise<void>;
  onColorsChanged: (updatedMappings: IColorMapping[]) => void; // Real-time UI update callback
}

export interface IColorPaletteStudioState {
  localMappings: IColorMapping[];
  selectedColorOption?: IFieldOption;
  showColorPicker: boolean;
  selectedColor: IColor;
  selectedIcon: string;
  selectedUseDarkText: boolean; // Track dark text preference for current selection
  availableIcons: IIconOption[];
  errorMessage?: string;
  successMessage?: string;
  isSaving: boolean; // Track save state to show spinner and prevent close
}

export class ColorPaletteStudio extends React.Component<IColorPaletteStudioProps, IColorPaletteStudioState> {
  private messageTimeouts: number[] = []; // Track timeouts to prevent memory leaks

  constructor(props: IColorPaletteStudioProps) {
    super(props);

    this.state = {
      localMappings: [...props.colorMappings],
      selectedColorOption: undefined,
      showColorPicker: false,
      selectedColor: getColorFromString('#0078d4')!,
      selectedIcon: '',
      selectedUseDarkText: false,
      availableIcons: [],
      errorMessage: undefined,
      successMessage: undefined,
      isSaving: false
    };

    // Load Font Awesome 4.7 CSS if not already loaded
    this.loadFontAwesome();
  }

  private loadFontAwesome = (): void => {
    const existingLink = document.querySelector('link[href*="font-awesome"]');
    if (!existingLink) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css';
      link.integrity = 'sha512-SfTiTlX6kk+qitfevl/7LibUOeJWlt9rbyDn92a1DqWOw9vWG2MFoays0sgObmWazO5BQPiFucnnEAjpAB+/Sw==';
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    }
  };

  /**
   * Cleanup timeouts on unmount to prevent memory leaks
   */
  public componentWillUnmount(): void {
    // Clear all pending message timeouts
    this.messageTimeouts.forEach(timeoutId => {
      window.clearTimeout(timeoutId);
    });
    this.messageTimeouts = [];
  }

  /**
   * Helper method to track timeouts and prevent memory leaks
   */
  private setTrackedTimeout = (callback: () => void, delay: number): void => {
    const timeoutId = window.setTimeout(() => {
      callback();
      // Remove from tracking array when timeout completes
      const index = this.messageTimeouts.indexOf(timeoutId);
      if (index > -1) {
        this.messageTimeouts.splice(index, 1);
      }
    }, delay);

    // Track the timeout ID
    this.messageTimeouts.push(timeoutId);
  };

  public componentDidUpdate(prevProps: IColorPaletteStudioProps): void {
    if (prevProps.colorMappings !== this.props.colorMappings) {
      // Case 1: Modal just opened - initialize with fresh data from props (only if props have data)
      if (!prevProps.isOpen && this.props.isOpen) {
        // DEFENSIVE: Only initialize if we actually have color mappings data
        if (this.props.colorMappings.length > 0) {
          this.setState({
            localMappings: [...this.props.colorMappings]
          });
        }
        // If props are empty but modal is open, wait for data to arrive
      }
      // Case 2: Modal is open and props updated - check if this represents a successful save
      else if (this.props.isOpen && this.propsContainLocalChanges(this.props.colorMappings)) {
        // Props contain our local changes - this is a successful save, update local state
        this.setState({
          localMappings: [...this.props.colorMappings]
        });
      }
      // Case 3: Modal is open but props don't contain local changes - ignore (stale data)
    }

    // DEFENSIVE: If modal is open but local mappings are empty and props now have data, reinitialize
    if (this.props.isOpen && this.state.localMappings.length === 0 && this.props.colorMappings.length > 0) {
      this.setState({
        localMappings: [...this.props.colorMappings]
      });
    }
  }

  /**
   * Check if the incoming props contain the changes we made locally
   * This helps distinguish between successful saves and stale data
   */
  private propsContainLocalChanges = (newMappings: IColorMapping[]): boolean => {
    const { localMappings } = this.state;

    // If we have no local changes, accept any props update
    if (localMappings.length === 0) {
      return true;
    }

    // Check if the new mappings contain our local changes
    // Compare key fields that would indicate our changes were saved
    for (let i = 0; i < localMappings.length; i++) {
      const localMapping = localMappings[i];
      let matchingProp: IColorMapping | undefined;

      // Find matching mapping in new props
      for (let j = 0; j < newMappings.length; j++) {
        const propMapping = newMappings[j];
        if (propMapping.fieldName === localMapping.fieldName &&
            propMapping.optionValue === localMapping.optionValue) {
          matchingProp = propMapping;
          break;
        }
      }

      if (matchingProp) {
        // If colors or icons don't match, this might be stale data
        if (localMapping.colorHex && matchingProp.colorHex !== localMapping.colorHex) {
          return false;
        }
        if (localMapping.iconName && matchingProp.iconName !== localMapping.iconName) {
          return false;
        }
      }
    }

    return true;
  };





  /**
   * Combined handler for color, icon, and text preference changes to prevent race conditions
   */
  private handleColorAndIconChange = async (option: IFieldOption, color: IColor, iconName: string, useDarkText: boolean): Promise<void> => {
    const { localMappings } = this.state;
    const colorHex = `#${color.hex}`;

    // Find existing mapping or create new one
    let existingIndex = -1;
    for (let i = 0; i < localMappings.length; i++) {
      if (localMappings[i].fieldName === option.fieldName && localMappings[i].optionValue === option.optionValue) {
        existingIndex = i;
        break;
      }
    }

    let updatedMappings: IColorMapping[];

    if (existingIndex >= 0) {
      // Update existing mapping with color, icon, and text preference
      updatedMappings = [...localMappings];
      updatedMappings[existingIndex] = {
        ...updatedMappings[existingIndex],
        colorHex,
        iconName: iconName || undefined,
        useDarkText,
        isActive: true
      };
    } else {
      // Create new mapping with color, icon, and text preference
      const newMapping: IColorMapping = {
        configType: 'ColorMapping',
        fieldName: option.fieldName,
        optionValue: option.optionValue,
        colorHex,
        iconName: iconName || undefined,
        useDarkText,
        isActive: true,
        sortOrder: localMappings.length + 1
      };
      updatedMappings = [...localMappings, newMapping];
    }

    // Update state immediately for real-time UI feedback
    this.setState({
      localMappings: updatedMappings,
      showColorPicker: false,
      selectedIcon: iconName,
      errorMessage: undefined,
      isSaving: true // Show saving state
    });

    // Trigger real-time UI update in calendar
    this.props.onColorsChanged(updatedMappings);

    // Save changes and wait for completion
    try {
      await this.props.onSaveColorMappings(updatedMappings);
      // Success - clear saving state
      this.setState({ isSaving: false });
    } catch (error) {
      console.error('Save error:', error);

      // Clear saving state and show error
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.indexOf('Save Conflict') === -1 &&
          errorMessage.indexOf('2130575305') === -1 &&
          errorMessage.indexOf('-2147467259') === -1 &&
          errorMessage.indexOf('concurrently') === -1 &&
          errorMessage.indexOf('Cannot complete this action') === -1) {
        this.setState({
          isSaving: false,
          errorMessage: `Failed to save color and icon: ${errorMessage}`
        });
        this.setTrackedTimeout(() => {
          this.setState({ errorMessage: undefined });
        }, 5000);
      } else {
        // For concurrency errors, just clear saving state (save likely succeeded)
        this.setState({ isSaving: false });
      }
    }
  };

  private getCurrentIcon = (option: IFieldOption): string => {
    let mapping: IColorMapping | undefined;
    for (let i = 0; i < this.state.localMappings.length; i++) {
      if (this.state.localMappings[i].fieldName === option.fieldName && this.state.localMappings[i].optionValue === option.optionValue) {
        mapping = this.state.localMappings[i];
        break;
      }
    }
    return mapping?.iconName || '';
  };

  private renderIcon = (iconOption: IIconOption): React.ReactElement => {
    const { iconName, iconSet } = iconOption;

    if (!iconName) {
      return <div style={{ width: '24px', height: '24px' }} />;
    }

    switch (iconSet) {
      case 'emoji':
      case 'unicode':
        return (
          <span style={{ fontSize: '24px', display: 'block', lineHeight: '1' }}>
            {iconName}
          </span>
        );
      case 'fontawesome':
        return (
          <i
            className={`fa ${iconName}`}
            style={{ fontSize: '24px', display: 'block', lineHeight: '1' }}
          />
        );
      case 'fluent':
      default: {
        // Use guaranteed SharePoint icons with fallback - comprehensive list
        const guaranteedIcons = [
          'Home', 'Settings', 'People', 'Globe', 'Search', 'Flag', 'Lock',
          'Shield', 'Important', 'Warning', 'Alert', 'Heart', 'Star',
          'Contact', 'Group', 'Link', 'Move', 'Forward', 'Location',
          'Airplane', 'Car', 'Bus', 'Train', 'Sync', 'Target', 'Crown',
          'Calendar', 'Clock', 'Mail', 'Phone', 'Video', 'Microphone',
          'Speaker', 'Document', 'Folder', 'FolderOpen', 'Edit', 'Add',
          'Delete', 'Save', 'Print', 'Download', 'Upload', 'Share',
          'Copy', 'Cut', 'Paste', 'Undo', 'Redo', 'Refresh', 'Back',
          'Up', 'Down', 'Left', 'Right', 'CheckMark', 'Cancel',
          // Additional guaranteed icons
          'Radar', 'Server', 'Certificate', 'Permissions', 'Laptop'
        ];

        const safeIconName = guaranteedIcons.indexOf(iconName) !== -1 ? iconName : 'Settings';

        return (
          <Icon
            iconName={safeIconName}
            style={{ fontSize: '24px', display: 'block', lineHeight: '1' }}
          />
        );
      }
    }
  };

  private renderIconForDisplay = (iconName: string): React.ReactElement => {
    if (!iconName) {
      return <div style={{ width: '24px', height: '24px' }} />;
    }

    // Determine icon type based on iconName
    if (iconName.indexOf('fa-') === 0) {
      // Font Awesome icon
      return (
        <i
          className={`fa ${iconName}`}
          style={{
            fontSize: '24px',
            color: '#605e5c',
            display: 'block',
            lineHeight: '1'
          }}
        />
      );
    } else if (/[\u{1F000}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(iconName)) {
      // Emoji or Unicode symbol
      return (
        <span style={{ fontSize: '24px', display: 'block', lineHeight: '1' }}>
          {iconName}
        </span>
      );
    } else {
      // Fallback to regular text/symbol
      return (
        <span style={{ fontSize: '24px', display: 'block', lineHeight: '1', color: '#605e5c' }}>
          {iconName}
        </span>
      );
    }
  };

  private handleRestoreOriginal = async (): Promise<void> => {
    try {
      const { discoveredOptions } = this.props;
      const restoredMappings: IColorMapping[] = [];

      // Create mappings using original colors and default icons for discovered options
      discoveredOptions.forEach((option, index) => {
        const originalColor = ORIGINAL_COLOR_MAPPINGS[option.optionValue];
        if (originalColor) {
          restoredMappings.push({
            configType: 'ColorMapping',
            fieldName: option.fieldName,
            optionValue: option.optionValue,
            colorHex: originalColor,
            iconName: getDefaultIcon(option.optionValue), // Restore default icons
            isActive: true,
            sortOrder: index + 1
          });
        }
      });

      // Update state immediately and force re-render
      this.setState({
        localMappings: restoredMappings,
        successMessage: 'Original colors restored!',
        isSaving: true,
        // Clear any selected state to ensure fresh display
        selectedColorOption: undefined,
        showColorPicker: false,
        selectedIcon: '',
        selectedUseDarkText: false,
        availableIcons: []
      });

      // Trigger real-time UI update
      this.props.onColorsChanged(restoredMappings);

      // Save and wait for completion
      await this.props.onSaveColorMappings(restoredMappings);

      // Clear saving state and force a complete re-render
      this.setState({ isSaving: false });

      // Force component to re-render to ensure icon display updates
      this.forceUpdate();

      // Clear success message after 3 seconds
      this.setTrackedTimeout(() => {
        this.setState({ successMessage: undefined });
      }, 3000);

    } catch (error) {
      this.setState({
        isSaving: false,
        errorMessage: `Failed to restore original colors: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
      this.setTrackedTimeout(() => {
        this.setState({ errorMessage: undefined });
      }, 5000);
    }
  };

  private getCurrentColor = (option: IFieldOption): string => {
    let mapping: IColorMapping | undefined;
    for (let i = 0; i < this.state.localMappings.length; i++) {
      if (this.state.localMappings[i].fieldName === option.fieldName && this.state.localMappings[i].optionValue === option.optionValue) {
        mapping = this.state.localMappings[i];
        break;
      }
    }
    return mapping ? mapping.colorHex : '#0078d4';
  };

  private getCurrentUseDarkText = (option: IFieldOption): boolean => {
    let mapping: IColorMapping | undefined;
    for (let i = 0; i < this.state.localMappings.length; i++) {
      if (this.state.localMappings[i].fieldName === option.fieldName && this.state.localMappings[i].optionValue === option.optionValue) {
        mapping = this.state.localMappings[i];
        break;
      }
    }
    return mapping ? (mapping.useDarkText || false) : false;
  };

  private renderOptionRow = (option: IFieldOption): React.ReactElement => {
    const currentIcon = this.getCurrentIcon(option);
    const currentColor = this.getCurrentColor(option);

    // Determine if this option should be highlighted (newly discovered OR recently created)
    const shouldHighlight = option.isNewlyDiscovered || option.isRecentlyCreated;
    const highlightLabel = option.isNewlyDiscovered ? 'NEW' : (option.isRecentlyCreated ? 'NEW' : '');

    return (
      <Stack key={`${option.fieldName}-${option.optionValue}`} horizontal verticalAlign="center" tokens={{ childrenGap: 12 }}>
        {/* Color Square */}
        <div
          style={{
            width: '40px',
            height: '40px',
            backgroundColor: currentColor,
            border: '2px solid #edebe9',
            borderRadius: '4px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: shouldHighlight ? '0 0 8px rgba(255, 193, 7, 0.6), inset 0 0 0 2px rgba(255, 193, 7, 0.3)' : 'none',
            // FIXED: Use background instead of backgroundColor to avoid override, and preserve color when highlighting
            background: shouldHighlight ? `linear-gradient(135deg, rgba(255, 193, 7, 0.05) 0%, rgba(255, 193, 7, 0.02) 100%), ${currentColor}` : currentColor
          }}
          onClick={() => this.setState({
            selectedColorOption: option,
            showColorPicker: true,
            selectedColor: getColorFromString(currentColor)!,
            selectedIcon: this.getCurrentIcon(option),
            selectedUseDarkText: this.getCurrentUseDarkText(option),
            availableIcons: shouldHighlight ? getComprehensiveIcons() : getContextualIcons(option.optionValue)
          })}
          title={`Click to change color for ${option.optionValue}`}
        >
          {shouldHighlight && highlightLabel && (
            <Text style={{ color: 'white', fontSize: '10px', fontWeight: 'bold' }}>{highlightLabel}</Text>
          )}
        </div>

        {/* Icon Square */}
        <div
          style={{
            width: '40px',
            height: '40px',
            border: '2px solid #edebe9',
            borderRadius: '4px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#fafafa',
            boxShadow: shouldHighlight ? '0 0 8px rgba(255, 193, 7, 0.6), inset 0 0 0 2px rgba(255, 193, 7, 0.3)' : 'none',
            background: shouldHighlight ? 'linear-gradient(135deg, rgba(255, 193, 7, 0.05) 0%, rgba(255, 193, 7, 0.02) 100%)' : '#fafafa'
          }}
          onClick={() => this.setState({
            selectedColorOption: option,
            showColorPicker: true,
            selectedColor: getColorFromString(currentColor)!,
            selectedIcon: this.getCurrentIcon(option),
            selectedUseDarkText: this.getCurrentUseDarkText(option),
            availableIcons: shouldHighlight ? getComprehensiveIcons() : getContextualIcons(option.optionValue)
          })}
          title={`Click to change icon for ${option.optionValue}`}
        >
          {currentIcon ? (
            this.renderIconForDisplay(currentIcon)
          ) : (
            <div style={{ width: '24px', height: '24px', border: '1px dashed #ccc', borderRadius: '2px' }} />
          )}
        </div>

        {/* Option Info */}
        <Stack style={{ flex: 1 }}>
          <Text variant="medium" style={{ fontWeight: shouldHighlight ? 'bold' : 'normal' }}>
            {option.optionValue}
          </Text>
          <Text variant="small" style={{ color: '#605e5c' }}>
            {currentColor}
          </Text>
        </Stack>

      </Stack>
    );
  };

  private renderTwoColumnLayout = (): React.ReactElement => {
    // Filter to only show Swimlanes (not Status options) - this prevents Status values like "Tentative" from appearing
    const swimlaneOptions = this.props.discoveredOptions.filter(o => o.fieldName === 'Swimlanes');

    // Sort options to put newly discovered ones at the bottom for better visibility
    const existingOptions = swimlaneOptions.filter(o => !o.isNewlyDiscovered);
    const newOptions = swimlaneOptions.filter(o => o.isNewlyDiscovered);

    // Also identify recently created items for highlighting
    const recentlyCreatedOptions = swimlaneOptions.filter(o => o.isRecentlyCreated);

    const allOptions = [...existingOptions, ...newOptions];

    // Split options into two columns
    const midpoint = Math.ceil(allOptions.length / 2);
    const leftColumn = allOptions.slice(0, midpoint);
    const rightColumn = allOptions.slice(midpoint);

    return (
      <Stack tokens={{ childrenGap: 16 }}>
        {(newOptions.length > 0 || recentlyCreatedOptions.length > 0) && (
          <MessageBar messageBarType={MessageBarType.warning}>
            <Text>
              {newOptions.length > 0 && `${newOptions.length} new option(s) discovered! `}
              {recentlyCreatedOptions.length > 0 && `${recentlyCreatedOptions.length} recently added option(s) highlighted. `}
              Assign colors and icons below.
            </Text>
          </MessageBar>
        )}

        <Stack horizontal tokens={{ childrenGap: 24 }}>
          {/* Left Column */}
          <Stack style={{ flex: 1 }} tokens={{ childrenGap: 12 }}>
            {leftColumn.map(option => this.renderOptionRow(option))}
          </Stack>

          {/* Right Column */}
          <Stack style={{ flex: 1 }} tokens={{ childrenGap: 12 }}>
            {rightColumn.map(option => this.renderOptionRow(option))}
          </Stack>
        </Stack>

        {allOptions.length === 0 && (
          <MessageBar messageBarType={MessageBarType.info}>
            <Text>No swimlane options found in your Events list.</Text>
          </MessageBar>
        )}
      </Stack>
    );
  };



  public render(): React.ReactElement {
    const { isOpen, onDismiss, isLoading, error } = this.props;
    const { showColorPicker, selectedColorOption, selectedColor, selectedIcon, availableIcons, errorMessage, successMessage, isSaving } = this.state;

    return (
      <Modal
        isOpen={isOpen}
        onDismiss={isSaving ? undefined : onDismiss} // Prevent close during save
        isBlocking={isSaving} // Block interaction during save
        containerClassName={styles.colorPaletteStudioModal}
      >
        <div className={styles.colorPaletteStudioContent}>
          <Stack tokens={{ childrenGap: 20 }}>
            <Stack horizontal horizontalAlign="space-between" verticalAlign="center">
              <Text variant="xLarge">📊 Legend Studio</Text>
              <DefaultButton
                iconProps={{ iconName: 'Cancel' }}
                onClick={onDismiss}
                disabled={isSaving}
                title={isSaving ? "Please wait while saving..." : "Close"}
              />
            </Stack>

            {/* Saving Alert */}
            {isSaving && (
              <MessageBar messageBarType={MessageBarType.info}>
                <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 8 }}>
                  <Spinner size={SpinnerSize.small} />
                  <Text>Saving changes to SharePoint...</Text>
                </Stack>
              </MessageBar>
            )}

            {/* Show error from props (e.g., missing BigCalConfig list) */}
            {error && (
              <MessageBar messageBarType={MessageBarType.error}>
                <Stack tokens={{ childrenGap: 8 }}>
                  <Text>{error}</Text>
                  {error.indexOf('BigCalConfig list not found') !== -1 && (
                    <Stack tokens={{ childrenGap: 4 }}>
                      <Text variant="small" style={{ fontWeight: 600 }}>To create the BigCalConfig list:</Text>
                      <Text variant="small">1. Close this dialog</Text>
                      <Text variant="small">2. Click the ⚙️ gear icon to open webpart settings</Text>
                      <Text variant="small">3. Scroll down to &quot;Dynamic Color Palette Configuration&quot;</Text>
                      <Text variant="small">4. Click &quot;Create BigCalConfig List&quot;</Text>
                      <Text variant="small">5. Reopen Color Palette Studio</Text>
                    </Stack>
                  )}
                </Stack>
              </MessageBar>
            )}

            {/* Show local error messages */}
            {errorMessage && (
              <MessageBar messageBarType={MessageBarType.error} onDismiss={() => this.setState({ errorMessage: undefined })}>
                {errorMessage}
              </MessageBar>
            )}

            {successMessage && (
              <MessageBar messageBarType={MessageBarType.success} onDismiss={() => this.setState({ successMessage: undefined })}>
                {successMessage}
              </MessageBar>
            )}

            {isLoading ? (
              <Stack horizontalAlign="center" tokens={{ childrenGap: 16 }}>
                <Spinner size={SpinnerSize.large} label="Loading color mappings..." />
              </Stack>
            ) : error ? (
              // Show a helpful message when there's an error (like missing BigCalConfig)
              <Stack horizontalAlign="center" tokens={{ childrenGap: 16 }}>
                <Text variant="large" style={{ color: '#605e5c' }}>
                  Color Palette Studio requires the BigCalConfig list
                </Text>
                <Text variant="medium" style={{ color: '#605e5c', textAlign: 'center' }}>
                  Please follow the instructions above to create the required SharePoint list.
                </Text>
              </Stack>
            ) : (
              this.renderTwoColumnLayout()
            )}

            {/* Action buttons */}
            {!error && (
              <Stack horizontal horizontalAlign="space-between" tokens={{ childrenGap: 12 }}>
                <DefaultButton
                  text="🔄 Restore Default Colors & Icons"
                  onClick={this.handleRestoreOriginal}
                  disabled={isLoading || isSaving}
                  title={isSaving ? "Please wait while saving..." : "Restore all colors and icons to their default values"}
                />

                <DefaultButton
                  text="Close"
                  onClick={onDismiss}
                  disabled={isSaving}
                />
              </Stack>
            )}
          </Stack>
        </div>

        {/* Color & Icon Picker Modal */}
        {showColorPicker && selectedColorOption && (
          <Modal
            isOpen={showColorPicker}
            onDismiss={() => this.setState({ showColorPicker: false })}
            containerClassName={styles.colorPickerModal}
          >
            <div className={styles.colorPickerContent}>
              <Stack tokens={{ childrenGap: 16 }}>
                <Text variant="large">
                  {(selectedColorOption.isNewlyDiscovered || selectedColorOption.isRecentlyCreated) ? 'Choose Color & Icon for New Lane' : 'Choose Color & Icon for'} {selectedColorOption.optionValue}
                </Text>

                <Stack horizontal tokens={{ childrenGap: 20 }}>
                  {/* Color Picker */}
                  <div style={{ flex: '0 0 auto' }}>
                    <ColorPicker
                      color={selectedColor}
                      onChange={(ev, color) => this.setState({ selectedColor: color })}
                      alphaType="none"
                    />
                  </div>

                  {/* Icon Selection */}
                  <div style={{ flex: '1 1 auto', minWidth: '300px' }}>
                    <Stack tokens={{ childrenGap: 8 }}>
                      <Checkbox
                        label="Use dark text"
                        checked={this.state.selectedUseDarkText}
                        onChange={(ev, checked) => this.setState({ selectedUseDarkText: checked || false })}
                        styles={{
                          text: { fontSize: '14px' },
                          label: { fontSize: '14px' }
                        }}
                      />
                      <Text variant="medium">
                        Choose Icon: {(selectedColorOption.isNewlyDiscovered || selectedColorOption.isRecentlyCreated) && <span style={{ color: '#605e5c', fontSize: '12px' }}>(Comprehensive options available)</span>}
                      </Text>
                    </Stack>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(48px, 1fr))',
                      gap: '6px',
                      maxHeight: '300px',
                      overflowY: 'auto',
                      padding: '8px',
                      border: '1px solid #edebe9',
                      borderRadius: '4px',
                      backgroundColor: '#fafafa'
                    }}>
                      {availableIcons.map((iconOption, index) => (
                        <div
                          key={index}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '6px',
                            border: selectedIcon === iconOption.iconName ? '2px solid #0078d4' : '1px solid #edebe9',
                            borderRadius: '4px',
                            backgroundColor: selectedIcon === iconOption.iconName ? '#f3f9ff' : 'white',
                            cursor: 'pointer',
                            width: '48px',
                            height: '48px'
                          }}
                          onClick={() => this.setState({ selectedIcon: iconOption.iconName })}
                          title={iconOption.description || iconOption.displayName}
                        >
                          {iconOption.iconName ? (
                            this.renderIcon(iconOption)
                          ) : (
                            <div style={{ width: '24px', height: '24px', border: '1px dashed #ccc', borderRadius: '2px' }} />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </Stack>

                <Stack horizontal horizontalAlign="end" tokens={{ childrenGap: 12 }}>
                  <DefaultButton
                    text="Cancel"
                    onClick={() => this.setState({ showColorPicker: false })}
                  />
                  <PrimaryButton
                    text="Apply Color & Icon"
                    onClick={() => {
                      this.handleColorAndIconChange(selectedColorOption, selectedColor, selectedIcon, this.state.selectedUseDarkText).catch(console.error);
                    }}
                  />
                </Stack>
              </Stack>
            </div>
          </Modal>
        )}


      </Modal>
    );
  }
}
