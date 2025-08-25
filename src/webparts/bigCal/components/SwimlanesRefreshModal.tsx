import * as React from 'react';
import {
  Modal,
  Stack,
  Text,
  PrimaryButton,
  DefaultButton,
  MessageBar,
  MessageBarType,
  Spinner,
  SpinnerSize
} from '@fluentui/react';
import { Logger } from '../services/LoggingService';
import { ColorMappingService } from '../services/ColorMappingService';
import { WebPartContext } from '@microsoft/sp-webpart-base';

export interface ISwimlanesRefreshModalProps {
  isOpen: boolean;
  onDismiss: () => void;
  onRefreshComplete: () => void;
  context: WebPartContext;
  eventsListName: string;
  missingSwimlanesCount: number;
}

export interface ISwimlanesRefreshModalState {
  isRefreshing: boolean;
  refreshMessage: string;
  refreshError: string;
}

export class SwimlanesRefreshModal extends React.Component<ISwimlanesRefreshModalProps, ISwimlanesRefreshModalState> {
  constructor(props: ISwimlanesRefreshModalProps) {
    super(props);
    this.state = {
      isRefreshing: false,
      refreshMessage: '',
      refreshError: ''
    };
  }

  private handleRefresh = async (): Promise<void> => {
    this.setState({ 
      isRefreshing: true, 
      refreshMessage: '', 
      refreshError: '' 
    });

    try {
      const colorMappingService = new ColorMappingService(this.props.context);

      // Clean up orphaned swimlanes first
      const cleanupResult = await colorMappingService.cleanupOrphanedSwimlanes(this.props.eventsListName);

      // Discover new field options
      const discoveredOptions = await colorMappingService.discoverFieldOptions(this.props.eventsListName);

      // Filter to only newly discovered swimlanes
      const newSwimlanes = discoveredOptions.filter(option =>
        option.fieldName === 'Swimlanes' && option.isNewlyDiscovered
      );

      // Build feedback message
      const feedbackParts: string[] = [];

      if (cleanupResult.deletedCount > 0) {
        feedbackParts.push(`Removed ${cleanupResult.deletedCount} obsolete swimlane(s)`);
      }

      if (newSwimlanes.length > 0) {
        // Generate and save default mappings
        const newMappings = await colorMappingService.generateDefaultMappings(newSwimlanes);
        
        if (newMappings.length > 0) {
          await colorMappingService.saveBulkColorMappings(newMappings);
          const swimlaneNames = newSwimlanes.map(s => s.optionValue).join(', ');
          feedbackParts.push(`Added ${newMappings.length} new swimlane(s): ${swimlaneNames}`);
        }
      }

      const successMessage = feedbackParts.length > 0 
        ? feedbackParts.join('. ') 
        : 'All swimlanes are up to date';

      this.setState({ 
        refreshMessage: successMessage,
        isRefreshing: false 
      });

      Logger.info('Swimlanes refresh completed successfully', { 
        newCount: newSwimlanes.length,
        deletedCount: cleanupResult.deletedCount 
      });

      // Auto-close after 2 seconds and notify parent
      setTimeout(() => {
        this.props.onRefreshComplete();
        this.props.onDismiss();
      }, 2000);

    } catch (error) {
      Logger.error('Error during swimlanes refresh', error);
      this.setState({
        refreshError: `Refresh failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        isRefreshing: false
      });
    }
  };

  private handleCancel = (): void => {
    if (!this.state.isRefreshing) {
      this.props.onDismiss();
    }
  };

  public render(): React.ReactElement<ISwimlanesRefreshModalProps> {
    const { isOpen, missingSwimlanesCount } = this.props;
    const { isRefreshing, refreshMessage, refreshError } = this.state;

    return (
      <Modal
        isOpen={isOpen}
        onDismiss={this.handleCancel}
        isBlocking={isRefreshing}
        containerClassName="swimlanes-refresh-modal"
      >
        <div style={{ padding: '24px', minWidth: '400px', maxWidth: '500px' }}>
          <Stack tokens={{ childrenGap: 16 }}>
            <Text variant="xLarge" style={{ fontWeight: 600 }}>
              Swimlanes Need Refresh
            </Text>

            <Text variant="medium">
              Legend Studio detected {missingSwimlanesCount} swimlane configuration issue{missingSwimlanesCount !== 1 ? 's' : ''} that need{missingSwimlanesCount === 1 ? 's' : ''} to be resolved.
            </Text>

            <Text variant="medium" style={{ color: '#605e5c' }}>
              Would you like to automatically refresh the swimlanes configuration? This will:
            </Text>

            <Stack style={{ paddingLeft: '16px' }} tokens={{ childrenGap: 8 }}>
              <Text variant="small">• Add missing swimlanes with default colors and icons</Text>
              <Text variant="small">• Remove any obsolete swimlane configurations</Text>
              <Text variant="small">• Update the Color Palette Studio with current data</Text>
            </Stack>

            {isRefreshing && (
              <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 12 }}>
                <Spinner size={SpinnerSize.medium} />
                <Text variant="medium">Refreshing swimlanes configuration...</Text>
              </Stack>
            )}

            {refreshMessage && (
              <MessageBar messageBarType={MessageBarType.success}>
                {refreshMessage}
              </MessageBar>
            )}

            {refreshError && (
              <MessageBar messageBarType={MessageBarType.error}>
                {refreshError}
              </MessageBar>
            )}

            <Stack horizontal horizontalAlign="end" tokens={{ childrenGap: 12 }}>
              <DefaultButton
                text="Cancel"
                onClick={this.handleCancel}
                disabled={isRefreshing}
              />
              <PrimaryButton
                text={isRefreshing ? "Refreshing..." : "Refresh Swimlanes"}
                onClick={this.handleRefresh}
                disabled={isRefreshing}
              />
            </Stack>
          </Stack>
        </div>
      </Modal>
    );
  }
}
