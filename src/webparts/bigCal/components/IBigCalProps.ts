import { WebPartContext } from '@microsoft/sp-webpart-base';

export interface IBigCalProps {
  description: string;
  isDarkTheme: boolean;
  hasTeamsContext: boolean;
  userDisplayName: string;
  startInFullscreen: boolean;
  isUserAdmin: boolean;
  context: WebPartContext;
  listName: string;
  showImpersonateButton: boolean;
  showIconSelector: boolean;
  showTimelineView: boolean;
  onConfigureProperties?: () => void;
}
