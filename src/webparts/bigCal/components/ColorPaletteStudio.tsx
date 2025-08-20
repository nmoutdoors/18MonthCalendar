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
  Pivot,
  PivotItem,
  ColorPicker,
  IColor,
  getColorFromString,
} from '@fluentui/react';
import { IColorMapping, IFieldOption, ORIGINAL_COLOR_MAPPINGS } from '../interfaces/IColorMapping';
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
  activeTab: string;
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
      activeTab: 'swimlanes',
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

  private renderColorAssignmentTab = (fieldName: 'Swimlanes' | 'Status'): React.ReactElement => {
    const options = this.props.discoveredOptions.filter(o => o.fieldName === fieldName);
    const newOptions = options.filter(o => o.isNewlyDiscovered);
    
    return (
      <Stack tokens={{ childrenGap: 16 }}>
        {newOptions.length > 0 && (
          <MessageBar messageBarType={MessageBarType.warning}>
            <Text>
              {newOptions.length} new {fieldName.toLowerCase()} option(s) discovered!
              Assign colors below or use &quot;Generate Defaults&quot; to auto-assign.
            </Text>
          </MessageBar>
        )}
        
        <Stack tokens={{ childrenGap: 12 }}>
          {options.map((option, index) => (
            <Stack key={`${option.fieldName}-${option.optionValue}`} horizontal verticalAlign="center" tokens={{ childrenGap: 12 }}>
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
              
              <Stack>
                <Text variant="medium" style={{ fontWeight: option.isNewlyDiscovered ? 'bold' : 'normal' }}>
                  {option.optionValue}
                </Text>
                <Text variant="small" style={{ color: '#605e5c' }}>
                  {this.getCurrentColor(option)}
                </Text>
              </Stack>
            </Stack>
          ))}
        </Stack>
        
        {options.length === 0 && (
          <MessageBar messageBarType={MessageBarType.info}>
            <Text>No {fieldName.toLowerCase()} options found in your Events list.</Text>
          </MessageBar>
        )}
      </Stack>
    );
  };



  public render(): React.ReactElement {
    const { isOpen, onDismiss, isLoading, error } = this.props;
    const { showColorPicker, selectedColorOption, selectedColor, activeTab, errorMessage, successMessage } = this.state;

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
              <Pivot
                selectedKey={activeTab}
                onLinkClick={(item) => item && this.setState({ activeTab: item.props.itemKey! })}
              >
                <PivotItem headerText="Swimlanes" itemKey="swimlanes">
                  {this.renderColorAssignmentTab('Swimlanes')}
                </PivotItem>
                <PivotItem headerText="Status" itemKey="status">
                  {this.renderColorAssignmentTab('Status')}
                </PivotItem>
              </Pivot>
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
      </Modal>
    );
  }
}
