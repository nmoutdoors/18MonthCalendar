import * as React from 'react';
import {
  Stack,
  Text,
  Icon,
  PrimaryButton,
  MessageBar,
  MessageBarType,
  ProgressIndicator
} from '@fluentui/react';
import { Logger } from '../services/LoggingService';
import styles from './AttachmentUploader.module.scss';

export interface IAttachmentUploaderProps {
  onFileUpload: (file: File) => Promise<void>;
  isUploading: boolean;
  uploadMessage?: string;
  uploadMessageType?: MessageBarType;
  disabled?: boolean;
  maxFileSizeMB?: number;
  allowedExtensions?: string[];
}

export interface IAttachmentUploaderState {
  dragActive: boolean;
}

export class AttachmentUploader extends React.Component<IAttachmentUploaderProps, IAttachmentUploaderState> {
  constructor(props: IAttachmentUploaderProps) {
    super(props);
    this.state = {
      dragActive: false
    };
  }

  private onDragEnter = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    e.stopPropagation();
    this.setState({ dragActive: true });
  };

  private onDragLeave = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    e.stopPropagation();
    // Only set dragActive to false if we're leaving the drop zone entirely
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      this.setState({ dragActive: false });
    }
  };

  private onDragOver = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    e.stopPropagation();
  };

  private onDrop = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    e.stopPropagation();
    this.setState({ dragActive: false });

    if (this.props.disabled || this.props.isUploading) {
      return;
    }

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      this.handleFileUpload(files[0]).catch(error => {
        Logger.error('Error handling file upload', error);
      });
    }
  };

  private handleFileUpload = async (file: File): Promise<void> => {
    try {
      // Validate file
      const validation = this.validateFile(file);
      if (!validation.isValid) {
        Logger.warn(`File validation failed: ${validation.errorMessage}`);
        return;
      }

      await this.props.onFileUpload(file);
    } catch (error) {
      Logger.error('Error in file upload handler', error);
    }
  };

  private validateFile = (file: File): { isValid: boolean; errorMessage?: string } => {
    const maxSizeMB = this.props.maxFileSizeMB || 10;
    const maxSizeBytes = maxSizeMB * 1024 * 1024;

    // Check file size
    if (file.size > maxSizeBytes) {
      return {
        isValid: false,
        errorMessage: `File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds the ${maxSizeMB}MB limit`
      };
    }

    // Check file extension if restrictions are specified
    if (this.props.allowedExtensions && this.props.allowedExtensions.length > 0) {
      const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      if (this.props.allowedExtensions.indexOf(fileExtension) === -1) {
        return {
          isValid: false,
          errorMessage: `File type ${fileExtension} is not allowed. Allowed types: ${this.props.allowedExtensions.join(', ')}`
        };
      }
    }

    // Security check for dangerous file types
    const blockedExtensions = ['.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js', '.jar', '.ps1'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    if (blockedExtensions.indexOf(fileExtension) !== -1) {
      return {
        isValid: false,
        errorMessage: `File type ${fileExtension} is not allowed for security reasons`
      };
    }

    return { isValid: true };
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private handleBrowseClick = (e?: React.MouseEvent<any>): void => {
    // Stop propagation to prevent double-triggering when button is clicked
    if (e) {
      e.stopPropagation();
    }

    if (this.props.disabled || this.props.isUploading) {
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = false;

    if (this.props.allowedExtensions && this.props.allowedExtensions.length > 0) {
      input.accept = this.props.allowedExtensions.join(',');
    }

    input.onchange = (e: Event) => {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files.length > 0) {
        this.handleFileUpload(target.files[0]).catch(error => {
          Logger.error('Error handling file upload from browse', error);
        });
      }
    };
    input.click();
  };

  public render(): React.ReactElement<IAttachmentUploaderProps> {
    const { isUploading, uploadMessage, uploadMessageType, disabled } = this.props;
    const { dragActive } = this.state;

    const isDisabled = disabled || isUploading;

    return (
      <Stack tokens={{ childrenGap: 12 }}>
        {uploadMessage && (
          <MessageBar messageBarType={uploadMessageType || MessageBarType.info}>
            {uploadMessage}
          </MessageBar>
        )}

        <div
          className={`${styles.dropZone} ${dragActive ? styles.dragActive : ''} ${isDisabled ? styles.disabled : ''}`}
          onDragEnter={this.onDragEnter}
          onDragLeave={this.onDragLeave}
          onDragOver={this.onDragOver}
          onDrop={this.onDrop}
          onClick={this.handleBrowseClick}
        >
          {isUploading ? (
            <>
              <Icon iconName="CloudUpload" styles={{ root: { fontSize: 24, color: '#0078d4', marginBottom: 8 } }} />
              <Text variant="small" block styles={{ root: { marginBottom: 6, fontWeight: 600 } }}>
                Uploading file...
              </Text>
              <ProgressIndicator />
            </>
          ) : (
            <>
              <Icon
                iconName="CloudUpload"
                styles={{
                  root: {
                    fontSize: 24,
                    color: dragActive ? '#005a9e' : (isDisabled ? '#a6a6a6' : '#0078d4'),
                    marginBottom: 8
                  }
                }}
              />
              <Text variant="small" block styles={{ root: { marginBottom: 4, fontWeight: 600 } }}>
                {dragActive ? 'Drop your file now!' : 'Drag & Drop File'}
              </Text>
              <Text variant="xSmall" block styles={{ root: { color: '#666', marginBottom: 8 } }}>
                or click to browse
              </Text>
              <PrimaryButton
                text="Browse Files"
                disabled={isDisabled}
                onClick={this.handleBrowseClick}
                styles={{ root: { minHeight: 28, fontSize: 12 } }}
              />
            </>
          )}
        </div>

        <Stack tokens={{ childrenGap: 8 }}>
          <Text variant="xSmall" styles={{ root: { color: '#666', lineHeight: '1.4' } }}>
            <strong>File size limit:</strong> {this.props.maxFileSizeMB || 10}MB maximum
          </Text>
          {this.props.allowedExtensions && this.props.allowedExtensions.length > 0 && (
            <Text variant="xSmall" styles={{ root: { color: '#666', lineHeight: '1.4' } }}>
              <strong>Allowed types:</strong> {this.props.allowedExtensions.join(', ')}
            </Text>
          )}
        </Stack>
      </Stack>
    );
  }
}
