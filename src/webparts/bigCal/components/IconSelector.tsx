import * as React from 'react';
import {
  Modal,
  Pivot,
  PivotItem,
  IconButton,
  Text,
  Stack,
  DefaultButton
} from '@fluentui/react';
import { Logger } from '../services/LoggingService';
import styles from './IconSelector.module.scss';

export interface IIconSelectorProps {
  isOpen: boolean;
  onDismiss: () => void;
}

export interface IIconSelectorState {
  selectedTab: string;
  selectedIcons: { [category: string]: string };
}

export class IconSelector extends React.Component<IIconSelectorProps, IIconSelectorState> {
  constructor(props: IIconSelectorProps) {
    super(props);
    this.state = {
      selectedTab: 'emoji',
      selectedIcons: {}
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

  // Free icon sets that work well in SharePoint/web environments
  private getEmojiIcons = (): { [category: string]: string[] } => {
    return {
      'Away w/RON': ['✈️', '🛫', '🌍', '🏖️', '🚁'],
      'Day Trip - NCR': ['📍', '🗺️', '🚗', '🚌', '🏛️'],
      'Exercise': ['🏃', '💪', '🏋️', '⚡', '🎯'],
      'FYSA': ['ℹ️', '📋', '📢', '💡', '📝'],
      'Out of Office': ['🚪', '🏠', '📴', '🔒', '⏰'],
      'Training Holiday': ['🎓', '📚', '🏫', '✏️', '🎯'],
      'VIP/High Priority': ['⚠️', '🔥', '⭐', '🚨', '❗'],
      'Confirmed Status': ['✅', '☑️', '✔️', '🟢', '👍'],
      'Tentative Status': ['❓', '❔', '🟡', '⚠️', '🤔']
    };
  };

  private getFluentUIIcons = (): { [category: string]: string[] } => {
    return {
      'Away w/RON': ['Airplane', 'Globe', 'MapPin', 'Vacation', 'World'],
      'Day Trip - NCR': ['Car', 'Bus', 'POI', 'Nav2DMapView', 'LocationDot'],
      'Exercise': ['Running', 'Health', 'HeartFill', 'Trophy2', 'Weights'],
      'FYSA': ['Info', 'ClipboardList', 'Megaphone', 'Lightbulb', 'EditNote'],
      'Out of Office': ['Door', 'Home', 'PhoneOff', 'Lock', 'Clock'],
      'Training Holiday': ['Education', 'BookAnswers', 'School', 'Pencil', 'LearningTools'],
      'VIP/High Priority': ['Warning', 'Flame', 'FavoriteStarFill', 'Ringer', 'Important'],
      'Confirmed Status': ['CheckMark', 'Completed', 'Accept', 'SkypeCheck', 'StatusCircleCheckmark'],
      'Tentative Status': ['Unknown', 'Help', 'StatusCircleQuestionMark', 'AlertSolid', 'Clock']
    };
  };

  private getUnicodeIcons = (): { [category: string]: string[] } => {
    return {
      'Away w/RON': ['✈', '🌐', '🗺', '📍', '🚁'],
      'Day Trip - NCR': ['🚗', '🚌', '🏛', '📍', '🗺'],
      'Exercise': ['💪', '🏃', '⚡', '🎯', '🏋'],
      'FYSA': ['ℹ', '📋', '📢', '💡', '📝'],
      'Out of Office': ['🚪', '🏠', '📴', '🔒', '⏰'],
      'Training Holiday': ['🎓', '📚', '🏫', '✏', '🎯'],
      'VIP/High Priority': ['⚠', '🔥', '⭐', '🚨', '❗'],
      'Confirmed Status': ['✓', '✔', '☑', '●', '◉'],
      'Tentative Status': ['?', '◐', '◑', '○', '◯']
    };
  };

  private getFontAwesome4Icons = (): { [category: string]: string[] } => {
    return {
      'Away w/RON': ['fa-plane', 'fa-globe', 'fa-map-marker', 'fa-suitcase', 'fa-compass'],
      'Day Trip - NCR': ['fa-car', 'fa-bus', 'fa-building', 'fa-map', 'fa-road'],
      'Exercise': ['fa-heartbeat', 'fa-bicycle', 'fa-trophy', 'fa-fire', 'fa-bolt'],
      'FYSA': ['fa-info-circle', 'fa-clipboard', 'fa-bullhorn', 'fa-lightbulb-o', 'fa-file-text'],
      'Out of Office': ['fa-sign-out', 'fa-home', 'fa-phone-slash', 'fa-lock', 'fa-clock-o'],
      'Training Holiday': ['fa-graduation-cap', 'fa-book', 'fa-university', 'fa-pencil', 'fa-certificate'],
      'VIP/High Priority': ['fa-exclamation-triangle', 'fa-fire', 'fa-star', 'fa-bell', 'fa-exclamation'],
      'Confirmed Status': ['fa-check', 'fa-check-circle', 'fa-check-square', 'fa-thumbs-up', 'fa-check-circle-o'],
      'Tentative Status': ['fa-question', 'fa-question-circle', 'fa-clock-o', 'fa-exclamation-circle', 'fa-question-circle-o']
    };
  };

  private onTabChange = (item?: PivotItem): void => {
    if (item) {
      this.setState({ selectedTab: item.props.itemKey || 'emoji' });
    }
  };

  private selectIcon = (category: string, icon: string): void => {
    this.setState(prevState => ({
      selectedIcons: {
        ...prevState.selectedIcons,
        [category]: icon
      }
    }));
  };

  private renderIconGrid = (icons: { [category: string]: string[] }, iconType: 'emoji' | 'fluent' | 'unicode' | 'fontawesome' = 'emoji'): JSX.Element => {
    const categories = Object.keys(icons);
    Logger.debug(`Rendering ${iconType} icon grid with ${categories.length} categories`);

    return (
      <div className={styles.iconGrid}>
        {categories.map(category => (
          <div key={category} className={styles.categorySection}>
            <Text variant="mediumPlus" className={styles.categoryTitle}>
              {category}
            </Text>
            <div className={styles.iconRow}>
              {icons[category].map((icon, index) => (
                <div
                  key={index}
                  className={`${styles.iconOption} ${
                    this.state.selectedIcons[category] === icon ? styles.selectedIcon : ''
                  }`}
                  onClick={() => this.selectIcon(category, icon)}
                  title={iconType === 'fluent' ? `Fluent UI: ${icon}` : iconType === 'fontawesome' ? `Font Awesome: ${icon}` : icon}
                >
                  {iconType === 'fluent' ? (
                    <IconButton
                      iconProps={{ iconName: icon }}
                      styles={{
                        root: {
                          fontSize: '20px',
                          color: '#323130',
                          backgroundColor: 'transparent',
                          border: 'none',
                          padding: 0,
                          minWidth: 'auto',
                          width: '100%',
                          height: '100%'
                        },
                        icon: {
                          fontSize: '20px',
                          color: '#323130'
                        }
                      }}
                    />
                  ) : iconType === 'fontawesome' ? (
                    <i
                      className={`fa ${icon}`}
                      style={{
                        fontSize: '20px',
                        color: '#323130',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '100%',
                        height: '100%'
                      }}
                      aria-hidden="true"
                    />
                  ) : (
                    <span className={styles.iconDisplay}>{icon}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  public render(): React.ReactElement<IIconSelectorProps> {
    const { isOpen, onDismiss } = this.props;
    const { selectedTab } = this.state;

    return (
      <Modal
        isOpen={isOpen}
        onDismiss={onDismiss}
        isBlocking={false}
        containerClassName={styles.modalContainer}
      >
        <div className={styles.modalHeader}>
          <Text variant="xLarge">Icon Selection Helper</Text>
          <Text variant="medium" className={styles.modalSubtitle}>
            Choose your preferred icon style for each event category
          </Text>
          <IconButton
            iconProps={{ iconName: 'Cancel' }}
            ariaLabel="Close"
            onClick={onDismiss}
            className={styles.closeButton}
          />
        </div>

        <div className={styles.modalBody}>
          <Pivot
            selectedKey={selectedTab}
            onLinkClick={this.onTabChange}
          >
            <PivotItem headerText="Emoji Icons" itemKey="emoji" itemIcon="Emoji2">
              <div className={styles.tabContent}>
                <Text variant="medium" className={styles.tabDescription}>
                  Unicode emoji icons - universally supported, colorful, and expressive
                </Text>
                {this.renderIconGrid(this.getEmojiIcons(), 'emoji')}
              </div>
            </PivotItem>

            <PivotItem headerText="Fluent UI Icons" itemKey="fluent" itemIcon="Design">
              <div className={styles.tabContent}>
                <Text variant="medium" className={styles.tabDescription}>
                  Microsoft Fluent UI icon set - professional, consistent, and SharePoint-native
                </Text>
                {this.renderIconGrid(this.getFluentUIIcons(), 'fluent')}
              </div>
            </PivotItem>

            <PivotItem headerText="Unicode Symbols" itemKey="unicode" itemIcon="Symbol">
              <div className={styles.tabContent}>
                <Text variant="medium" className={styles.tabDescription}>
                  Unicode symbol characters - clean, simple, and always visible
                </Text>
                {this.renderIconGrid(this.getUnicodeIcons(), 'unicode')}
              </div>
            </PivotItem>

            <PivotItem headerText="Font Awesome 4.7" itemKey="fontawesome" itemIcon="FontSize">
              <div className={styles.tabContent}>
                <Text variant="medium" className={styles.tabDescription}>
                  Font Awesome 4.7 icons - widely used, reliable, and comprehensive icon set
                </Text>
                {this.renderIconGrid(this.getFontAwesome4Icons(), 'fontawesome')}
              </div>
            </PivotItem>
          </Pivot>
        </div>

        <div className={styles.modalFooter}>
          <Stack horizontal tokens={{ childrenGap: 8 }}>
            <Text variant="medium" className={styles.footerNote}>
              This is a temporary feature to help choose the final icon set for the project
            </Text>
            <DefaultButton text="Close" onClick={onDismiss} />
          </Stack>
        </div>
      </Modal>
    );
  }
}
