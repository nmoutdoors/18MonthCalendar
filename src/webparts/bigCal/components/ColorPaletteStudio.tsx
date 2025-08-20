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
  IconButton,
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
  showIconPicker: boolean;
  selectedIconOption?: IFieldOption;
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
      showIconPicker: false,
      selectedIconOption: undefined,
      availableIcons: [],
      errorMessage: undefined,
      successMessage: undefined
    };
  }

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
    } catch (error) {
      // Show error but don't block UI
      this.setState({
        errorMessage: `Auto-save failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
      // Clear error after 5 seconds
      setTimeout(() => {
        this.setState({ errorMessage: undefined });
      }, 5000);
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
      showIconPicker: false,
      errorMessage: undefined
    });

    // Trigger real-time UI update in calendar
    this.props.onColorsChanged();

    // Silent auto-save in background
    try {
      await this.props.onSaveColorMappings(updatedMappings);
    } catch (error) {
      // Show error but don't block UI
      this.setState({
        errorMessage: `Auto-save failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
      // Clear error after 5 seconds
      setTimeout(() => {
        this.setState({ errorMessage: undefined });
      }, 5000);
    }
  };

  private openIconPicker = (option: IFieldOption): void => {
    const availableIcons = getContextualIcons(option.optionValue);
    this.setState({
      selectedIconOption: option,
      showIconPicker: true,
      availableIcons
    });
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

    return (
      <Stack key={`${option.fieldName}-${option.optionValue}`} horizontal verticalAlign="center" tokens={{ childrenGap: 12 }}>
        {/* Color Square */}
        <div
          style={{
            width: '40px',
            height: '40px',
            backgroundColor: this.getCurrentColor(option),
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
            selectedColor: getColorFromString(this.getCurrentColor(option))!
          })}
          title={`Click to change color for ${option.optionValue}`}
        >
          {option.isNewlyDiscovered && (
            <Text style={{ color: 'white', fontSize: '10px', fontWeight: 'bold' }}>NEW</Text>
          )}
        </div>

        {/* Option Info */}
        <Stack style={{ flex: 1 }}>
          <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 8 }}>
            <Text variant="medium" style={{ fontWeight: option.isNewlyDiscovered ? 'bold' : 'normal' }}>
              {option.optionValue}
            </Text>
            {currentIcon && (
              <Icon iconName={currentIcon} style={{ fontSize: '16px', color: '#605e5c' }} />
            )}
          </Stack>
          <Text variant="small" style={{ color: '#605e5c' }}>
            {this.getCurrentColor(option)} {currentIcon && `• ${currentIcon}`}
          </Text>
        </Stack>

        {/* Icon Button */}
        <IconButton
          iconProps={{ iconName: 'Edit' }}
          title="Choose icon"
          onClick={() => this.openIconPicker(option)}
          styles={{
            root: {
              width: '32px',
              height: '32px',
              backgroundColor: '#f3f2f1',
              border: '1px solid #edebe9'
            }
          }}
        />
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
    const { showColorPicker, selectedColorOption, selectedColor, showIconPicker, selectedIconOption, availableIcons, errorMessage, successMessage } = this.state;

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
                  text="🔄 Restore Original Colors"
                  onClick={this.handleRestoreOriginal}
                  disabled={isLoading}
                  title="Restore all colors to their original values"
                />

                <DefaultButton
                  text="Close"
                  onClick={onDismiss}
                />
              </Stack>
            )}
          </Stack>
        </div>

        {/* Color Picker Modal */}
        {showColorPicker && selectedColorOption && (
          <Modal
            isOpen={showColorPicker}
            onDismiss={() => this.setState({ showColorPicker: false })}
            containerClassName={styles.colorPickerModal}
          >
            <div className={styles.colorPickerContent}>
              <Stack tokens={{ childrenGap: 16 }}>
                <Text variant="large">Choose Color for {selectedColorOption.optionValue}</Text>
                
                <ColorPicker
                  color={selectedColor}
                  onChange={(ev, color) => this.setState({ selectedColor: color })}
                  alphaType="none"
                />
                
                <Stack horizontal horizontalAlign="end" tokens={{ childrenGap: 12 }}>
                  <DefaultButton
                    text="Cancel"
                    onClick={() => this.setState({ showColorPicker: false })}
                  />
                  <PrimaryButton
                    text="Apply Color"
                    onClick={() => {
                      this.handleColorChange(selectedColorOption, selectedColor).catch(console.error);
                    }}
                  />
                </Stack>
              </Stack>
            </div>
          </Modal>
        )}

        {/* Icon Picker Modal */}
        {showIconPicker && selectedIconOption && (
          <Modal
            isOpen={showIconPicker}
            onDismiss={() => this.setState({ showIconPicker: false })}
            containerClassName={styles.colorPickerModal}
          >
            <div className={styles.colorPickerContent}>
              <Stack tokens={{ childrenGap: 16 }}>
                <Text variant="large">Choose Icon for {selectedIconOption.optionValue}</Text>

                {/* Icon Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '8px',
                  maxHeight: '300px',
                  overflowY: 'auto',
                  padding: '8px',
                  border: '1px solid #edebe9',
                  borderRadius: '4px'
                }}>
                  {availableIcons.map((iconOption, index) => (
                    <div
                      key={index}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        padding: '8px',
                        cursor: 'pointer',
                        border: '1px solid #edebe9',
                        borderRadius: '4px',
                        backgroundColor: '#fafafa',
                        minHeight: '60px',
                        justifyContent: 'center'
                      }}
                      onClick={() => this.handleIconChange(selectedIconOption, iconOption.iconName)}
                      title={iconOption.description || iconOption.displayName}
                    >
                      {iconOption.iconName ? (
                        <Icon iconName={iconOption.iconName} style={{ fontSize: '20px', marginBottom: '4px' }} />
                      ) : (
                        <div style={{ width: '20px', height: '20px', marginBottom: '4px' }} />
                      )}
                      <Text variant="tiny" style={{ textAlign: 'center', fontSize: '10px' }}>
                        {iconOption.displayName}
                      </Text>
                    </div>
                  ))}
                </div>

                <Stack horizontal horizontalAlign="end" tokens={{ childrenGap: 12 }}>
                  <DefaultButton
                    text="Cancel"
                    onClick={() => this.setState({ showIconPicker: false })}
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
