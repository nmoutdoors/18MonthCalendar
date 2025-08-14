import { WebPartContext } from '@microsoft/sp-webpart-base';

export interface IBigCalProps {
  description: string;
  isDarkTheme: boolean;
  hasTeamsContext: boolean;
  userDisplayName: string;
  startInFullscreen: boolean;
  isUserAdmin: boolean;
  context: WebPartContext;
  colorPalette: string;
  listName: string;
  showImpersonateButton: boolean;
  showPalettePicker: boolean;
  showIconSelector: boolean;
  onConfigureProperties?: () => void;
  onPaletteChange?: (palette: string) => void;
}
