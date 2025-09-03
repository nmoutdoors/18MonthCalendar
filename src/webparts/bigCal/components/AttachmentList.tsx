import * as React from 'react';
import {
  Stack,
  Text,
  Icon,
  IconButton,
  Link,
  MessageBar,
  MessageBarType,
  Spinner,
  SpinnerSize
} from '@fluentui/react';
import { IAttachmentInfo } from '../services/SharePointService';
import { Logger } from '../services/LoggingService';
import styles from './AttachmentList.module.scss';

export interface IAttachmentListProps {
  attachments: IAttachmentInfo[];
  onDownload: (fileName: string) => void;
  onDelete: (fileName: string) => Promise<void>;
  isLoading?: boolean;
  errorMessage?: string;
  readonly?: boolean;
}

export interface IAttachmentListState {
  deletingFiles: Set<string>;
  deleteErrors: Map<string, string>;
}

export class AttachmentList extends React.Component<IAttachmentListProps, IAttachmentListState> {
  constructor(props: IAttachmentListProps) {
    super(props);
    this.state = {
      deletingFiles: new Set<string>(),
      deleteErrors: new Map<string, string>()
    };
  }

  private handleDelete = async (fileName: string): Promise<void> => {
    try {
      // Add to deleting set
      this.setState(prevState => {
        const newDeletingFiles = new Set<string>();
        prevState.deletingFiles.forEach((file: string) => newDeletingFiles.add(file));
        newDeletingFiles.add(fileName);

        const newDeleteErrors = new Map<string, string>();
        prevState.deleteErrors.forEach((value: string, key: string) => newDeleteErrors.set(key, value));

        return {
          deletingFiles: newDeletingFiles,
          deleteErrors: newDeleteErrors
        };
      });

      await this.props.onDelete(fileName);

      // Remove from deleting set on success
      this.setState(prevState => {
        const newDeletingFiles = new Set<string>();
        prevState.deletingFiles.forEach(file => {
          if (file !== fileName) {
            newDeletingFiles.add(file);
          }
        });

        const newDeleteErrors = new Map<string, string>();
        prevState.deleteErrors.forEach((value, key) => {
          if (key !== fileName) {
            newDeleteErrors.set(key, value);
          }
        });

        return {
          deletingFiles: newDeletingFiles,
          deleteErrors: newDeleteErrors
        };
      });
    } catch (error) {
      Logger.error(`Error deleting attachment ${fileName}`, error);
      
      // Remove from deleting set and add error
      this.setState(prevState => {
        const newDeletingFiles = new Set<string>();
        prevState.deletingFiles.forEach(file => {
          if (file !== fileName) {
            newDeletingFiles.add(file);
          }
        });

        const newDeleteErrors = new Map<string, string>();
        prevState.deleteErrors.forEach((value, key) => newDeleteErrors.set(key, value));
        newDeleteErrors.set(fileName, error instanceof Error ? error.message : 'Failed to delete file');

        return {
          deletingFiles: newDeletingFiles,
          deleteErrors: newDeleteErrors
        };
      });
    }
  };

  private formatFileSize = (sizeInBytes?: number): string => {
    if (!sizeInBytes) return '';
    
    if (sizeInBytes < 1024) {
      return `${sizeInBytes} B`;
    } else if (sizeInBytes < 1024 * 1024) {
      return `${(sizeInBytes / 1024).toFixed(1)} KB`;
    } else {
      return `${(sizeInBytes / 1024 / 1024).toFixed(1)} MB`;
    }
  };

  private formatDate = (dateString?: string): string => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  private getFileIcon = (fileName: string): string => {
    const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
    
    switch (extension) {
      case '.pdf':
        return 'PDF';
      case '.doc':
      case '.docx':
        return 'WordDocument';
      case '.xls':
      case '.xlsx':
        return 'ExcelDocument';
      case '.ppt':
      case '.pptx':
        return 'PowerPointDocument';
      case '.txt':
        return 'TextDocument';
      case '.jpg':
      case '.jpeg':
      case '.png':
      case '.gif':
      case '.bmp':
        return 'FileImage';
      case '.zip':
      case '.rar':
      case '.7z':
        return 'ZipFolder';
      default:
        return 'Page';
    }
  };

  public render(): React.ReactElement<IAttachmentListProps> {
    const { attachments, isLoading, errorMessage, readonly } = this.props;
    const { deletingFiles, deleteErrors } = this.state;

    if (isLoading) {
      return (
        <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 8 }}>
          <Spinner size={SpinnerSize.small} />
          <Text variant="small">Loading attachments...</Text>
        </Stack>
      );
    }

    if (errorMessage) {
      return (
        <MessageBar messageBarType={MessageBarType.error}>
          {errorMessage}
        </MessageBar>
      );
    }

    if (!attachments || attachments.length === 0) {
      return (
        <Text variant="small" styles={{ root: { color: '#666', fontStyle: 'italic' } }}>
          No attachments
        </Text>
      );
    }

    return (
      <Stack tokens={{ childrenGap: 8 }}>
        {attachments.map((attachment, index) => {
          const isDeleting = deletingFiles.has(attachment.FileName);
          const deleteError = deleteErrors.get(attachment.FileName);
          
          return (
            <div key={index} className={styles.attachmentItem}>
              <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 12 }}>
                <Icon 
                  iconName={this.getFileIcon(attachment.FileName)} 
                  styles={{ root: { fontSize: 16, color: '#0078d4' } }}
                />
                
                <Stack.Item grow>
                  <Stack tokens={{ childrenGap: 2 }}>
                    <Link
                      onClick={() => this.props.onDownload(attachment.FileName)}
                      styles={{ root: { fontSize: 14, fontWeight: 600 } }}
                    >
                      {attachment.FileName}
                    </Link>
                    
                    <Stack horizontal tokens={{ childrenGap: 16 }}>
                      {attachment.FileSize && (
                        <Text variant="xSmall" styles={{ root: { color: '#666' } }}>
                          {this.formatFileSize(attachment.FileSize)}
                        </Text>
                      )}
                      {attachment.TimeLastModified && (
                        <Text variant="xSmall" styles={{ root: { color: '#666' } }}>
                          Modified: {this.formatDate(attachment.TimeLastModified)}
                        </Text>
                      )}
                    </Stack>
                  </Stack>
                </Stack.Item>

                {!readonly && (
                  <Stack.Item>
                    {isDeleting ? (
                      <Spinner size={SpinnerSize.xSmall} />
                    ) : (
                      <IconButton
                        iconProps={{ iconName: 'Delete' }}
                        title="Delete attachment"
                        ariaLabel="Delete attachment"
                        onClick={() => this.handleDelete(attachment.FileName)}
                        styles={{
                          root: { color: '#d13438' },
                          rootHovered: { backgroundColor: '#fdf3f4', color: '#a4262c' }
                        }}
                      />
                    )}
                  </Stack.Item>
                )}
              </Stack>

              {deleteError && (
                <MessageBar 
                  messageBarType={MessageBarType.error}
                  styles={{ root: { marginTop: 8 } }}
                  onDismiss={() => {
                    this.setState(prevState => {
                      const newDeleteErrors = new Map<string, string>();
                      prevState.deleteErrors.forEach((value, key) => {
                        if (key !== attachment.FileName) {
                          newDeleteErrors.set(key, value);
                        }
                      });
                      return { ...prevState, deleteErrors: newDeleteErrors };
                    });
                  }}
                >
                  Error deleting {attachment.FileName}: {deleteError}
                </MessageBar>
              )}
            </div>
          );
        })}
      </Stack>
    );
  }
}
