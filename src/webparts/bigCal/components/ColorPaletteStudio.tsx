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
} from '@fluentui/react';
import { IColorMapping, IFieldOption, ORIGINAL_COLOR_MAPPINGS } from '../interfaces/IColorMapping';
import { getContextualIcons, IIconOption } from '../utils/IconMappings';
import styles from './BigCal.module.scss';

export interface IColorPaletteStudioProps {
  isOpen: boolean;
  onDismiss: () => void;
  discoveredOptions: IFieldOption[];
  colorMappings: IColorMapping[];
  isLoading: boolean;
  error?: string;
  onSaveColorMappings: (mappings: IColorMapping[]) => Promise<void>;
  onColorsChanged: () => void; // Real-time UI update callback
}

export interface IColorPaletteStudioState {
  localMappings: IColorMapping[];
  selectedColorOption?: IFieldOption;
  showColorPicker: boolean;
  selectedColor: IColor;
  selectedIcon: string;
  availableIcons: IIconOption[];
  errorMessage?: string;
  successMessage?: string;
}

export class ColorPaletteStudio extends React.Component<IColorPaletteStudioProps, IColorPaletteStudioState> {
  
  constructor(props: IColorPaletteStudioProps) {
    super(props);

    this.state = {
      localMappings: [...props.colorMappings],
      selectedColorOption: undefined,
      showColorPicker: false,
      selectedColor: getColorFromString('#0078d4')!,
      selectedIcon: '',
      availableIcons: [],
      errorMessage: undefined,
      successMessage: undefined
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

  public componentDidUpdate(prevProps: IColorPaletteStudioProps): void {
    if (prevProps.colorMappings !== this.props.colorMappings) {
      this.setState({
        localMappings: [...this.props.colorMappings]
      });
    }
  }

  private handleColorChange = async (option: IFieldOption, color: IColor): Promise<void> => {
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
      // Update existing mapping
      updatedMappings = [...localMappings];
      updatedMappings[existingIndex] = {
        ...updatedMappings[existingIndex],
        colorHex,
        isActive: true
      };
    } else {
      // Create new mapping
      const newMapping: IColorMapping = {
        configType: 'ColorMapping',
        fieldName: option.fieldName,
        optionValue: option.optionValue,
        colorHex,
        isActive: true,
        sortOrder: localMappings.length + 1
      };
      updatedMappings = [...localMappings, newMapping];
    }

    // Update state immediately for real-time UI feedback
    this.setState({
      localMappings: updatedMappings,
      showColorPicker: false,
      errorMessage: undefined
    });

    // Trigger real-time UI update in calendar
    this.props.onColorsChanged();

    // Silent auto-save in background
    try {
      await this.props.onSaveColorMappings(updatedMappings);
      console.log('Color mapping saved successfully');
    } catch (error) {
      console.error('Auto-save error:', error);

      // Only show error if it's not a SharePoint concurrency issue (which often resolves itself)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.indexOf('Save Conflict') === -1 &&
          errorMessage.indexOf('2130575305') === -1 &&
          errorMessage.indexOf('-2147467259') === -1 && // The specific error you encountered
          errorMessage.indexOf('concurrently') === -1 &&
          errorMessage.indexOf('Cannot complete this action') === -1) {
        this.setState({
          errorMessage: `Auto-save failed: ${errorMessage}`
        });
        // Clear error after 5 seconds
        setTimeout(() => {
          this.setState({ errorMessage: undefined });
        }, 5000);
      }
    }
  };

  private handleIconChange = async (option: IFieldOption, iconName: string): Promise<void> => {
    const { localMappings } = this.state;

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
      // Update existing mapping
      updatedMappings = [...localMappings];
      updatedMappings[existingIndex] = {
        ...updatedMappings[existingIndex],
        iconName: iconName || undefined, // Store undefined for empty icon
        isActive: true
      };
    } else {
      // Create new mapping
      const newMapping: IColorMapping = {
        configType: 'ColorMapping',
        fieldName: option.fieldName,
        optionValue: option.optionValue,
        colorHex: this.getCurrentColor(option),
        iconName: iconName || undefined,
        isActive: true,
        sortOrder: localMappings.length + 1
      };
      updatedMappings = [...localMappings, newMapping];
    }

    // Update state immediately for real-time UI feedback
    this.setState({
      localMappings: updatedMappings,
      selectedIcon: iconName,
      errorMessage: undefined
    });

    // Trigger real-time UI update in calendar
    this.props.onColorsChanged();

    // Silent auto-save in background
    try {
      await this.props.onSaveColorMappings(updatedMappings);
      console.log('Icon mapping saved successfully');
    } catch (error) {
      console.error('Auto-save error:', error);

      // Only show error if it's not a SharePoint concurrency issue (which often resolves itself)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.indexOf('Save Conflict') === -1 &&
          errorMessage.indexOf('2130575305') === -1 &&
          errorMessage.indexOf('-2147467259') === -1 && // The specific error you encountered
          errorMessage.indexOf('concurrently') === -1 &&
          errorMessage.indexOf('Cannot complete this action') === -1) {
        this.setState({
          errorMessage: `Auto-save failed: ${errorMessage}`
        });
        // Clear error after 5 seconds
        setTimeout(() => {
          this.setState({ errorMessage: undefined });
        }, 5000);
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

      // Create mappings using original colors for discovered options
      discoveredOptions.forEach((option, index) => {
        const originalColor = ORIGINAL_COLOR_MAPPINGS[option.optionValue];
        if (originalColor) {
          restoredMappings.push({
            configType: 'ColorMapping',
            fieldName: option.fieldName,
            optionValue: option.optionValue,
            colorHex: originalColor,
            iconName: '', // Clear icons on restore
            isActive: true,
            sortOrder: index + 1
          });
        }
      });

      // Update state immediately
      this.setState({
        localMappings: restoredMappings,
        successMessage: 'Original colors restored!'
      });

      // Trigger real-time UI update
      this.props.onColorsChanged();

      // Silent auto-save
      await this.props.onSaveColorMappings(restoredMappings);

      // Clear success message after 3 seconds
      setTimeout(() => {
        this.setState({ successMessage: undefined });
      }, 3000);

    } catch (error) {
      this.setState({
        errorMessage: `Failed to restore original colors: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
      setTimeout(() => {
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

  private renderOptionRow = (option: IFieldOption): React.ReactElement => {
    const currentIcon = this.getCurrentIcon(option);
    const currentColor = this.getCurrentColor(option);

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
            boxShadow: option.isNewlyDiscovered ? '0 0 8px rgba(255, 193, 7, 0.6)' : 'none'
          }}
          onClick={() => this.setState({
            selectedColorOption: option,
            showColorPicker: true,
            selectedColor: getColorFromString(currentColor)!,
            selectedIcon: this.getCurrentIcon(option),
            availableIcons: getContextualIcons(option.optionValue)
          })}
          title={`Click to change color for ${option.optionValue}`}
        >
          {option.isNewlyDiscovered && (
            <Text style={{ color: 'white', fontSize: '10px', fontWeight: 'bold' }}>NEW</Text>
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
            boxShadow: option.isNewlyDiscovered ? '0 0 8px rgba(255, 193, 7, 0.6)' : 'none'
          }}
          onClick={() => this.setState({
            selectedColorOption: option,
            showColorPicker: true,
            selectedColor: getColorFromString(currentColor)!,
            selectedIcon: this.getCurrentIcon(option),
            availableIcons: getContextualIcons(option.optionValue)
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
          <Text variant="medium" style={{ fontWeight: option.isNewlyDiscovered ? 'bold' : 'normal' }}>
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
    const allOptions = [...this.props.discoveredOptions];
    const newOptions = allOptions.filter(o => o.isNewlyDiscovered);

    // Split options into two columns
    const midpoint = Math.ceil(allOptions.length / 2);
    const leftColumn = allOptions.slice(0, midpoint);
    const rightColumn = allOptions.slice(midpoint);

    return (
      <Stack tokens={{ childrenGap: 16 }}>
        {newOptions.length > 0 && (
          <MessageBar messageBarType={MessageBarType.warning}>
            <Text>
              {newOptions.length} new option(s) discovered! Assign colors and icons below.
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
            <Text>No options found in your Events list.</Text>
          </MessageBar>
        )}
      </Stack>
    );
  };



  public render(): React.ReactElement {
    const { isOpen, onDismiss, isLoading, error } = this.props;
    const { showColorPicker, selectedColorOption, selectedColor, selectedIcon, availableIcons, errorMessage, successMessage } = this.state;

    return (
      <Modal
        isOpen={isOpen}
        onDismiss={onDismiss}
        isBlocking={false}
        containerClassName={styles.colorPaletteStudioModal}
      >
        <div className={styles.colorPaletteStudioContent}>
          <Stack tokens={{ childrenGap: 20 }}>
            <Stack horizontal horizontalAlign="space-between" verticalAlign="center">
              <Text variant="xLarge">🎨 Color Palette Studio</Text>
              <DefaultButton
                iconProps={{ iconName: 'Cancel' }}
                onClick={onDismiss}
                title="Close"
              />
            </Stack>

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
                  disabled={isLoading}
                  title="Restore all colors and icons to their default values"
                />

                <DefaultButton
                  text="Close"
                  onClick={onDismiss}
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
                <Text variant="large">Choose Color & Icon for {selectedColorOption.optionValue}</Text>

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
                    <Text variant="medium" style={{ marginBottom: '8px' }}>Choose Icon:</Text>
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
                      this.handleColorChange(selectedColorOption, selectedColor).catch(console.error);
                      this.handleIconChange(selectedColorOption, selectedIcon).catch(console.error);
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
