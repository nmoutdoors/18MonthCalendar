/**
 * Curated icon mappings for different swimlanes and contexts
 * Icons are from Fluent UI icon set - no need to show icon set names to users
 */

export interface IIconOption {
  iconName: string;
  displayName: string;
  description?: string;
  iconSet?: 'emoji' | 'fluent' | 'unicode' | 'fontawesome';
}

/**
 * Deduplicate icons by iconName, prioritizing by vibrancy order: emoji > unicode > fontawesome > fluent
 */
const deduplicateIcons = (icons: IIconOption[]): IIconOption[] => {
  const iconMap: { [key: string]: IIconOption } = {};
  const priorityOrder = ['emoji', 'unicode', 'fontawesome', 'fluent'];

  icons.forEach(icon => {
    const existing = iconMap[icon.iconName];
    if (!existing) {
      iconMap[icon.iconName] = icon;
    } else {
      // Keep the higher priority icon (lower index = higher priority)
      const existingPriority = priorityOrder.indexOf(existing.iconSet || 'fluent');
      const newPriority = priorityOrder.indexOf(icon.iconSet || 'fluent');
      if (newPriority < existingPriority) {
        iconMap[icon.iconName] = icon;
      }
    }
  });

  // Convert object to array (ES5 compatible)
  const result: IIconOption[] = [];
  for (const key in iconMap) {
    if (Object.prototype.hasOwnProperty.call(iconMap, key)) {
      result.push(iconMap[key]);
    }
  }
  return result;
};

/**
 * Get contextual icons for a specific swimlane/status option
 */
export const getContextualIcons = (optionValue: string): IIconOption[] => {
  const option = optionValue.toLowerCase();

  // Transit - planes, cars, travel
  if (option.indexOf('transit') !== -1) {
    const transitIcons: IIconOption[] = [
      { iconName: '', displayName: 'None', description: 'No icon' },
      // Emoji icons (most vibrant)
      { iconName: '✈️', displayName: 'Airplane', iconSet: 'emoji' },
      { iconName: '🚗', displayName: 'Car', iconSet: 'emoji' },
      { iconName: '🚌', displayName: 'Bus', iconSet: 'emoji' },
      { iconName: '🚂', displayName: 'Train', iconSet: 'emoji' },
      { iconName: '🚁', displayName: 'Helicopter', iconSet: 'emoji' },
      { iconName: '🚢', displayName: 'Ship', iconSet: 'emoji' },
      { iconName: '🚤', displayName: 'Boat', iconSet: 'emoji' },
      { iconName: '🚲', displayName: 'Bike', iconSet: 'emoji' },
      { iconName: '🛵', displayName: 'Scooter', iconSet: 'emoji' },
      { iconName: '🚙', displayName: 'SUV', iconSet: 'emoji' },
      { iconName: '🚐', displayName: 'Van', iconSet: 'emoji' },
      { iconName: '🚚', displayName: 'Truck', iconSet: 'emoji' },
      { iconName: '🚛', displayName: 'Semi', iconSet: 'emoji' },
      { iconName: '🚜', displayName: 'Tractor', iconSet: 'emoji' },
      { iconName: '🏍️', displayName: 'Motorcycle', iconSet: 'emoji' },
      { iconName: '🛻', displayName: 'Pickup', iconSet: 'emoji' },
      { iconName: '🚎', displayName: 'Trolley', iconSet: 'emoji' },
      { iconName: '🚃', displayName: 'Rail', iconSet: 'emoji' },
      { iconName: '🚄', displayName: 'Bullet Train', iconSet: 'emoji' },
      { iconName: '🚅', displayName: 'High Speed', iconSet: 'emoji' },
      // Unicode symbols
      { iconName: '✈', displayName: 'Plane', iconSet: 'unicode' },
      { iconName: '🌐', displayName: 'Globe', iconSet: 'unicode' },
      { iconName: '🗺', displayName: 'Map', iconSet: 'unicode' },
      { iconName: '📍', displayName: 'Pin', iconSet: 'unicode' },
      { iconName: '🚗', displayName: 'Auto', iconSet: 'unicode' },
      { iconName: '🚌', displayName: 'Transit', iconSet: 'unicode' },
      { iconName: '🚂', displayName: 'Railway', iconSet: 'unicode' },
      { iconName: '🚁', displayName: 'Chopper', iconSet: 'unicode' },
      // Font Awesome icons
      { iconName: 'fa-plane', displayName: 'Plane', iconSet: 'fontawesome' },
      { iconName: 'fa-car', displayName: 'Car', iconSet: 'fontawesome' },
      { iconName: 'fa-bus', displayName: 'Bus', iconSet: 'fontawesome' },
      { iconName: 'fa-train', displayName: 'Train', iconSet: 'fontawesome' },
      { iconName: 'fa-ship', displayName: 'Ship', iconSet: 'fontawesome' },
      { iconName: 'fa-bicycle', displayName: 'Bicycle', iconSet: 'fontawesome' },
      { iconName: 'fa-motorcycle', displayName: 'Motorcycle', iconSet: 'fontawesome' },
      { iconName: 'fa-truck', displayName: 'Truck', iconSet: 'fontawesome' },
      { iconName: 'fa-globe', displayName: 'Globe', iconSet: 'fontawesome' },
      { iconName: 'fa-map-marker', displayName: 'Location', iconSet: 'fontawesome' },
      { iconName: 'fa-suitcase', displayName: 'Luggage', iconSet: 'fontawesome' },
      { iconName: 'fa-compass', displayName: 'Compass', iconSet: 'fontawesome' },
      { iconName: 'fa-road', displayName: 'Road', iconSet: 'fontawesome' },
      { iconName: 'fa-map', displayName: 'Map', iconSet: 'fontawesome' },
      { iconName: 'fa-location-arrow', displayName: 'Direction', iconSet: 'fontawesome' },
      // Fluent UI icons (least colorful)
      { iconName: 'Airplane', displayName: 'Airplane', iconSet: 'fluent' },
      { iconName: 'Car', displayName: 'Car', iconSet: 'fluent' },
      { iconName: 'Bus', displayName: 'Bus', iconSet: 'fluent' },
      { iconName: 'Train', displayName: 'Train', iconSet: 'fluent' },
      { iconName: 'Move', displayName: 'Movement', iconSet: 'fluent' },
      { iconName: 'Forward', displayName: 'Travel', iconSet: 'fluent' },
      { iconName: 'Location', displayName: 'Location', iconSet: 'fluent' },
      { iconName: 'MapPin', displayName: 'Pin', iconSet: 'fluent' },
      { iconName: 'Compass', displayName: 'Compass', iconSet: 'fluent' },
      { iconName: 'Globe', displayName: 'Globe', iconSet: 'fluent' },
      { iconName: 'Forward', displayName: 'Directions', iconSet: 'fluent' }
    ];
    return deduplicateIcons(transitIcons);
  }
  
  // Speaking events - presentation, microphone
  if (option.indexOf('speaking') !== -1) {
    const speakingIcons: IIconOption[] = [
      { iconName: '', displayName: 'None', description: 'No icon' },
      // Emoji icons
      { iconName: '🎤', displayName: 'Microphone', iconSet: 'emoji' },
      { iconName: '🎙️', displayName: 'Studio Mic', iconSet: 'emoji' },
      { iconName: '📢', displayName: 'Megaphone', iconSet: 'emoji' },
      { iconName: '🎭', displayName: 'Performance', iconSet: 'emoji' },
      { iconName: '🎪', displayName: 'Event', iconSet: 'emoji' },
      // Unicode symbols
      { iconName: '📢', displayName: 'Megaphone', iconSet: 'unicode' },
      { iconName: '💡', displayName: 'Idea', iconSet: 'unicode' },
      { iconName: '📝', displayName: 'Notes', iconSet: 'unicode' },
      // Font Awesome icons
      { iconName: 'fa-microphone', displayName: 'Microphone', iconSet: 'fontawesome' },
      { iconName: 'fa-bullhorn', displayName: 'Bullhorn', iconSet: 'fontawesome' },
      { iconName: 'fa-volume-up', displayName: 'Volume', iconSet: 'fontawesome' },
      { iconName: 'fa-users', displayName: 'Audience', iconSet: 'fontawesome' },
      // Fluent UI icons (using guaranteed SharePoint icons)
      { iconName: 'Microphone', displayName: 'Microphone', iconSet: 'fluent' },
      { iconName: 'Document', displayName: 'Presentation', iconSet: 'fluent' },
      { iconName: 'Megaphone', displayName: 'Megaphone', iconSet: 'fluent' },
      { iconName: 'Home', displayName: 'Stage', iconSet: 'fluent' },
      { iconName: 'People', displayName: 'Audience', iconSet: 'fluent' },
      { iconName: 'FavoriteStarFill', displayName: 'Podium', iconSet: 'fluent' }
    ];
    return deduplicateIcons(speakingIcons);
  }

  // Meetings - people, calendar, conference
  if (option.indexOf('meeting') !== -1 || option.indexOf('congressional') !== -1 || option.indexOf('tdy') !== -1) {
    const meetingIcons: IIconOption[] = [
      { iconName: '', displayName: 'None', description: 'No icon' },
      // Emoji icons (most vibrant)
      { iconName: '🤝', displayName: 'Handshake', iconSet: 'emoji' },
      { iconName: '📅', displayName: 'Calendar', iconSet: 'emoji' },
      { iconName: '👥', displayName: 'People', iconSet: 'emoji' },
      { iconName: '💼', displayName: 'Business', iconSet: 'emoji' },
      { iconName: '🏛️', displayName: 'Government', iconSet: 'emoji' },
      { iconName: '📋', displayName: 'Agenda', iconSet: 'emoji' },
      // Unicode symbols
      { iconName: '📅', displayName: 'Calendar', iconSet: 'unicode' },
      { iconName: '👥', displayName: 'Group', iconSet: 'unicode' },
      { iconName: '🤝', displayName: 'Agreement', iconSet: 'unicode' },
      { iconName: '📋', displayName: 'Notes', iconSet: 'unicode' },
      // Font Awesome icons
      { iconName: 'fa-calendar', displayName: 'Calendar', iconSet: 'fontawesome' },
      { iconName: 'fa-users', displayName: 'Users', iconSet: 'fontawesome' },
      { iconName: 'fa-handshake-o', displayName: 'Handshake', iconSet: 'fontawesome' },
      { iconName: 'fa-briefcase', displayName: 'Business', iconSet: 'fontawesome' },
      { iconName: 'fa-building', displayName: 'Building', iconSet: 'fontawesome' },
      { iconName: 'fa-clipboard', displayName: 'Clipboard', iconSet: 'fontawesome' },
      // Fluent UI icons (least colorful) - using guaranteed SharePoint icons
      { iconName: 'People', displayName: 'People', iconSet: 'fluent' },
      { iconName: 'People', displayName: 'Meeting', iconSet: 'fluent' },
      { iconName: 'Calendar', displayName: 'Calendar', iconSet: 'fluent' },
      { iconName: 'People', displayName: 'Conference', iconSet: 'fluent' },
      { iconName: 'People', displayName: 'Group', iconSet: 'fluent' },
      { iconName: 'People', displayName: 'Partnership', iconSet: 'fluent' },
      { iconName: 'Home', displayName: 'Government', iconSet: 'fluent' }
    ];
    return deduplicateIcons(meetingIcons);
  }
  
  // Executive time - clock, calendar, executive
  if (option.indexOf('exec') !== -1) {
    const execIcons: IIconOption[] = [
      { iconName: '', displayName: 'None', description: 'No icon' },
      // Emoji icons (most vibrant)
      { iconName: '👔', displayName: 'Executive', iconSet: 'emoji' },
      { iconName: '⏰', displayName: 'Clock', iconSet: 'emoji' },
      { iconName: '📅', displayName: 'Calendar', iconSet: 'emoji' },
      { iconName: '⭐', displayName: 'Priority', iconSet: 'emoji' },
      { iconName: '👑', displayName: 'Authority', iconSet: 'emoji' },
      { iconName: '💼', displayName: 'Business', iconSet: 'emoji' },
      { iconName: '🏆', displayName: 'Achievement', iconSet: 'emoji' },
      { iconName: '📊', displayName: 'Analytics', iconSet: 'emoji' },
      { iconName: '🎯', displayName: 'Focus', iconSet: 'emoji' },
      { iconName: '⚙️', displayName: 'Management', iconSet: 'emoji' },
      { iconName: '📈', displayName: 'Growth', iconSet: 'emoji' },
      // Unicode symbols
      { iconName: '⏰', displayName: 'Time', iconSet: 'unicode' },
      { iconName: '📅', displayName: 'Date', iconSet: 'unicode' },
      { iconName: '⭐', displayName: 'Star', iconSet: 'unicode' },
      { iconName: '👑', displayName: 'Crown', iconSet: 'unicode' },
      { iconName: '💼', displayName: 'Case', iconSet: 'unicode' },
      { iconName: '🏆', displayName: 'Trophy', iconSet: 'unicode' },
      { iconName: '📊', displayName: 'Chart', iconSet: 'unicode' },
      { iconName: '🎯', displayName: 'Target', iconSet: 'unicode' },
      { iconName: '⚙', displayName: 'Gear', iconSet: 'unicode' },
      { iconName: '📈', displayName: 'Growth', iconSet: 'unicode' },
      // Font Awesome icons
      { iconName: 'fa-clock-o', displayName: 'Clock', iconSet: 'fontawesome' },
      { iconName: 'fa-calendar', displayName: 'Calendar', iconSet: 'fontawesome' },
      { iconName: 'fa-star', displayName: 'Priority', iconSet: 'fontawesome' },
      { iconName: 'fa-star', displayName: 'Executive', iconSet: 'fontawesome' },
      { iconName: 'fa-briefcase', displayName: 'Business', iconSet: 'fontawesome' },
      { iconName: 'fa-trophy', displayName: 'Success', iconSet: 'fontawesome' },
      { iconName: 'fa-bar-chart', displayName: 'Analytics', iconSet: 'fontawesome' },
      { iconName: 'fa-bullseye', displayName: 'Focus', iconSet: 'fontawesome' },
      { iconName: 'fa-cogs', displayName: 'Management', iconSet: 'fontawesome' },
      { iconName: 'fa-line-chart', displayName: 'Growth', iconSet: 'fontawesome' },
      // Fluent UI icons (least colorful)
      { iconName: 'Clock', displayName: 'Clock', iconSet: 'fluent' },
      { iconName: 'Calendar', displayName: 'Calendar', iconSet: 'fluent' },
      { iconName: 'Important', displayName: 'Important', iconSet: 'fluent' },
      { iconName: 'FavoriteStarFill', displayName: 'Executive', iconSet: 'fluent' },
      { iconName: 'Home', displayName: 'Business', iconSet: 'fluent' },
      { iconName: 'Trophy2', displayName: 'Achievement', iconSet: 'fluent' },
      { iconName: 'Info', displayName: 'Analytics', iconSet: 'fluent' },
      { iconName: 'POI', displayName: 'Focus', iconSet: 'fluent' },
      { iconName: 'Important', displayName: 'Management', iconSet: 'fluent' },
      { iconName: 'Important', displayName: 'Growth', iconSet: 'fluent' }
    ];
    return deduplicateIcons(execIcons);
  }

  // Out of office - away, vacation
  if (option.indexOf('out of office') !== -1 || option.indexOf('away') !== -1) {
    const outOfOfficeIcons: IIconOption[] = [
      { iconName: '', displayName: 'None', description: 'No icon' },
      // Emoji icons (most vibrant)
      { iconName: '🏠', displayName: 'Home', iconSet: 'emoji' },
      { iconName: '🏖️', displayName: 'Vacation', iconSet: 'emoji' },
      { iconName: '🚪', displayName: 'Away', iconSet: 'emoji' },
      { iconName: '⏰', displayName: 'Time Off', iconSet: 'emoji' },
      { iconName: '🔒', displayName: 'Unavailable', iconSet: 'emoji' },
      { iconName: '📴', displayName: 'Offline', iconSet: 'emoji' },
      // Unicode symbols
      { iconName: '🏠', displayName: 'Home', iconSet: 'unicode' },
      { iconName: '🚪', displayName: 'Door', iconSet: 'unicode' },
      { iconName: '⏰', displayName: 'Clock', iconSet: 'unicode' },
      { iconName: '🔒', displayName: 'Lock', iconSet: 'unicode' },
      // Font Awesome icons
      { iconName: 'fa-home', displayName: 'Home', iconSet: 'fontawesome' },
      { iconName: 'fa-sign-out', displayName: 'Sign Out', iconSet: 'fontawesome' },
      { iconName: 'fa-clock-o', displayName: 'Time Off', iconSet: 'fontawesome' },
      { iconName: 'fa-lock', displayName: 'Locked', iconSet: 'fontawesome' },
      { iconName: 'fa-phone-slash', displayName: 'No Contact', iconSet: 'fontawesome' },
      { iconName: 'fa-bed', displayName: 'Rest', iconSet: 'fontawesome' },
      // Fluent UI icons (least colorful) - using guaranteed SharePoint icons
      { iconName: 'Forward', displayName: 'Away', iconSet: 'fluent' },
      { iconName: 'Calendar', displayName: 'Vacation', iconSet: 'fluent' },
      { iconName: 'Home', displayName: 'Home', iconSet: 'fluent' },
      { iconName: 'Clock', displayName: 'Time Off', iconSet: 'fluent' },
      { iconName: 'Cancel', displayName: 'Unavailable', iconSet: 'fluent' },
      { iconName: 'Back', displayName: 'Leave', iconSet: 'fluent' }
    ];
    return deduplicateIcons(outOfOfficeIcons);
  }
  
  // Exercises - training, military
  if (option.indexOf('exercise') !== -1) {
    const exerciseIcons: IIconOption[] = [
      { iconName: '', displayName: 'None', description: 'No icon' },
      // Emoji icons (most vibrant)
      { iconName: '🎯', displayName: 'Target', iconSet: 'emoji' },
      { iconName: '🏋️', displayName: 'Training', iconSet: 'emoji' },
      { iconName: '🛡️', displayName: 'Defense', iconSet: 'emoji' },
      { iconName: '🏆', displayName: 'Achievement', iconSet: 'emoji' },
      { iconName: '🚁', displayName: 'Military', iconSet: 'emoji' },
      { iconName: '⚡', displayName: 'Power', iconSet: 'emoji' },
      // Unicode symbols
      { iconName: '🎯', displayName: 'Target', iconSet: 'unicode' },
      { iconName: '🛡', displayName: 'Shield', iconSet: 'unicode' },
      { iconName: '🏆', displayName: 'Trophy', iconSet: 'unicode' },
      { iconName: '⚡', displayName: 'Energy', iconSet: 'unicode' },
      // Font Awesome icons
      { iconName: 'fa-target', displayName: 'Target', iconSet: 'fontawesome' },
      { iconName: 'fa-shield', displayName: 'Shield', iconSet: 'fontawesome' },
      { iconName: 'fa-trophy', displayName: 'Trophy', iconSet: 'fontawesome' },
      { iconName: 'fa-bolt', displayName: 'Power', iconSet: 'fontawesome' },
      { iconName: 'fa-flag', displayName: 'Flag', iconSet: 'fontawesome' },
      { iconName: 'fa-fire', displayName: 'Intensity', iconSet: 'fontawesome' },
      // Fluent UI icons (least colorful) - using guaranteed SharePoint icons
      { iconName: 'Document', displayName: 'Training', iconSet: 'fluent' },
      { iconName: 'Warning', displayName: 'Defense', iconSet: 'fluent' },
      { iconName: 'People', displayName: 'Teamwork', iconSet: 'fluent' },
      { iconName: 'POI', displayName: 'Target', iconSet: 'fluent' },
      { iconName: 'FavoriteStarFill', displayName: 'Mission', iconSet: 'fluent' },
      { iconName: 'Star', displayName: 'Achievement', iconSet: 'fluent' }
    ];
    return deduplicateIcons(exerciseIcons);
  }

  // DISA - technology, network
  if (option.indexOf('disa') !== -1) {
    const disaIcons: IIconOption[] = [
      { iconName: '', displayName: 'None', description: 'No icon' },
      // Emoji icons (most vibrant)
      { iconName: '🌐', displayName: 'Global', iconSet: 'emoji' },
      { iconName: '💻', displayName: 'Technology', iconSet: 'emoji' },
      { iconName: '🔒', displayName: 'Security', iconSet: 'emoji' },
      { iconName: '📡', displayName: 'Network', iconSet: 'emoji' },
      { iconName: '☁️', displayName: 'Cloud', iconSet: 'emoji' },
      { iconName: '🛡️', displayName: 'Defense', iconSet: 'emoji' },
      { iconName: '⚡', displayName: 'Systems', iconSet: 'emoji' },
      { iconName: '🔧', displayName: 'Tools', iconSet: 'emoji' },
      { iconName: '📊', displayName: 'Data', iconSet: 'emoji' },
      { iconName: '🎯', displayName: 'Mission', iconSet: 'emoji' },
      // Unicode symbols
      { iconName: '🌐', displayName: 'Globe', iconSet: 'unicode' },
      { iconName: '💻', displayName: 'Computer', iconSet: 'unicode' },
      { iconName: '🔒', displayName: 'Lock', iconSet: 'unicode' },
      { iconName: '📡', displayName: 'Satellite', iconSet: 'unicode' },
      { iconName: '☁', displayName: 'Cloud', iconSet: 'unicode' },
      { iconName: '🛡', displayName: 'Shield', iconSet: 'unicode' },
      { iconName: '⚡', displayName: 'Power', iconSet: 'unicode' },
      { iconName: '🔧', displayName: 'Wrench', iconSet: 'unicode' },
      { iconName: '📊', displayName: 'Chart', iconSet: 'unicode' },
      { iconName: '🎯', displayName: 'Target', iconSet: 'unicode' },
      // Font Awesome icons
      { iconName: 'fa-globe', displayName: 'Globe', iconSet: 'fontawesome' },
      { iconName: 'fa-server', displayName: 'Server', iconSet: 'fontawesome' },
      { iconName: 'fa-shield', displayName: 'Shield', iconSet: 'fontawesome' },
      { iconName: 'fa-wifi', displayName: 'Network', iconSet: 'fontawesome' },
      { iconName: 'fa-cloud', displayName: 'Cloud', iconSet: 'fontawesome' },
      { iconName: 'fa-lock', displayName: 'Security', iconSet: 'fontawesome' },
      { iconName: 'fa-bolt', displayName: 'Systems', iconSet: 'fontawesome' },
      { iconName: 'fa-wrench', displayName: 'Tools', iconSet: 'fontawesome' },
      { iconName: 'fa-bar-chart', displayName: 'Data', iconSet: 'fontawesome' },
      { iconName: 'fa-crosshairs', displayName: 'Mission', iconSet: 'fontawesome' },
      // Fluent UI icons (least colorful)
      { iconName: 'Globe', displayName: 'Network', iconSet: 'fluent' },
      { iconName: 'Home', displayName: 'Server', iconSet: 'fluent' },
      { iconName: 'Warning', displayName: 'Security', iconSet: 'fluent' },
      { iconName: 'Wifi', displayName: 'Connectivity', iconSet: 'fluent' },
      { iconName: 'Cloud', displayName: 'Cloud', iconSet: 'fluent' },
      { iconName: 'Lock', displayName: 'Secure', iconSet: 'fluent' },
      { iconName: 'Important', displayName: 'Systems', iconSet: 'fluent' },
      { iconName: 'Repair', displayName: 'Tools', iconSet: 'fluent' },
      { iconName: 'Info', displayName: 'Data', iconSet: 'fluent' },
      { iconName: 'POI', displayName: 'Mission', iconSet: 'fluent' }
    ];
    return deduplicateIcons(disaIcons);
  }
  
  // DCDC - command, control (LOTS of options)
  if (option.indexOf('dcdc') !== -1) {
    const dcdcIcons: IIconOption[] = [
      { iconName: '', displayName: 'None', description: 'No icon' },
      // Emoji icons (most vibrant)
      { iconName: '🏢', displayName: 'Command', iconSet: 'emoji' },
      { iconName: '🛡️', displayName: 'Defense', iconSet: 'emoji' },
      { iconName: '🌐', displayName: 'Global', iconSet: 'emoji' },
      { iconName: '📡', displayName: 'Monitoring', iconSet: 'emoji' },
      { iconName: '🚩', displayName: 'Flag', iconSet: 'emoji' },
      { iconName: '⚡', displayName: 'Critical', iconSet: 'emoji' },
      { iconName: '🎯', displayName: 'Target', iconSet: 'emoji' },
      { iconName: '🔒', displayName: 'Secure', iconSet: 'emoji' },
      { iconName: '💻', displayName: 'Tech', iconSet: 'emoji' },
      { iconName: '📊', displayName: 'Data', iconSet: 'emoji' },
      // Unicode symbols
      { iconName: '🏢', displayName: 'Building', iconSet: 'unicode' },
      { iconName: '🛡', displayName: 'Shield', iconSet: 'unicode' },
      { iconName: '🌐', displayName: 'Globe', iconSet: 'unicode' },
      { iconName: '📡', displayName: 'Radar', iconSet: 'unicode' },
      { iconName: '🚩', displayName: 'Flag', iconSet: 'unicode' },
      { iconName: '⚡', displayName: 'Power', iconSet: 'unicode' },
      { iconName: '🎯', displayName: 'Target', iconSet: 'unicode' },
      { iconName: '🔒', displayName: 'Lock', iconSet: 'unicode' },
      { iconName: '💻', displayName: 'Computer', iconSet: 'unicode' },
      { iconName: '📊', displayName: 'Chart', iconSet: 'unicode' },
      // Font Awesome icons
      { iconName: 'fa-building', displayName: 'Building', iconSet: 'fontawesome' },
      { iconName: 'fa-shield', displayName: 'Shield', iconSet: 'fontawesome' },
      { iconName: 'fa-globe', displayName: 'Globe', iconSet: 'fontawesome' },
      { iconName: 'fa-flag', displayName: 'Flag', iconSet: 'fontawesome' },
      { iconName: 'fa-bolt', displayName: 'Power', iconSet: 'fontawesome' },
      { iconName: 'fa-crosshairs', displayName: 'Target', iconSet: 'fontawesome' },
      { iconName: 'fa-lock', displayName: 'Secure', iconSet: 'fontawesome' },
      { iconName: 'fa-desktop', displayName: 'Desktop', iconSet: 'fontawesome' },
      { iconName: 'fa-cogs', displayName: 'Settings', iconSet: 'fontawesome' },
      { iconName: 'fa-eye', displayName: 'Monitor', iconSet: 'fontawesome' },
      // Fluent UI icons (least colorful) - using guaranteed SharePoint icons
      { iconName: 'Home', displayName: 'Command', iconSet: 'fluent' },
      { iconName: 'Warning', displayName: 'Defense', iconSet: 'fluent' },
      { iconName: 'Globe', displayName: 'Global', iconSet: 'fluent' },
      { iconName: 'Globe', displayName: 'Monitoring', iconSet: 'fluent' },
      { iconName: 'FavoriteStarFill', displayName: 'Flag', iconSet: 'fluent' },
      { iconName: 'Important', displayName: 'Critical', iconSet: 'fluent' },
      { iconName: 'POI', displayName: 'Target', iconSet: 'fluent' },
      { iconName: 'Lock', displayName: 'Secure', iconSet: 'fluent' },
      { iconName: 'Info', displayName: 'Monitor', iconSet: 'fluent' },
      { iconName: 'FavoriteStarFill', displayName: 'Authority', iconSet: 'fluent' }
    ];
    return deduplicateIcons(dcdcIcons);
  }

  // Joint DISA & DCDC - combined operations
  if ((option.indexOf('joint') !== -1 && option.indexOf('disa') !== -1) ||
      (option.indexOf('joint') !== -1 && option.indexOf('dcdc') !== -1) ||
      (option.indexOf('disa') !== -1 && option.indexOf('dcdc') !== -1)) {
    const jointIcons: IIconOption[] = [
      { iconName: '', displayName: 'None', description: 'No icon' },
      // Emoji icons (most vibrant)
      { iconName: '🌐', displayName: 'Network', iconSet: 'emoji' },
      { iconName: '🏢', displayName: 'Command', iconSet: 'emoji' },
      { iconName: '💻', displayName: 'Systems', iconSet: 'emoji' },
      { iconName: '🛡️', displayName: 'Security', iconSet: 'emoji' },
      { iconName: '🔒', displayName: 'Secure', iconSet: 'emoji' },
      { iconName: '📡', displayName: 'Communications', iconSet: 'emoji' },
      { iconName: '⚡', displayName: 'Operations', iconSet: 'emoji' },
      { iconName: '🎯', displayName: 'Mission', iconSet: 'emoji' },
      { iconName: '🚩', displayName: 'Joint', iconSet: 'emoji' },
      { iconName: '⚙️', displayName: 'Integration', iconSet: 'emoji' },
      // Unicode symbols
      { iconName: '🌐', displayName: 'Globe', iconSet: 'unicode' },
      { iconName: '🏢', displayName: 'Building', iconSet: 'unicode' },
      { iconName: '💻', displayName: 'Computer', iconSet: 'unicode' },
      { iconName: '🛡', displayName: 'Shield', iconSet: 'unicode' },
      { iconName: '🔒', displayName: 'Lock', iconSet: 'unicode' },
      { iconName: '📡', displayName: 'Satellite', iconSet: 'unicode' },
      { iconName: '⚡', displayName: 'Power', iconSet: 'unicode' },
      { iconName: '🎯', displayName: 'Target', iconSet: 'unicode' },
      { iconName: '🚩', displayName: 'Flag', iconSet: 'unicode' },
      { iconName: '⚙', displayName: 'Gear', iconSet: 'unicode' },
      // Font Awesome icons
      { iconName: 'fa-globe', displayName: 'Network', iconSet: 'fontawesome' },
      { iconName: 'fa-building', displayName: 'Command', iconSet: 'fontawesome' },
      { iconName: 'fa-desktop', displayName: 'Systems', iconSet: 'fontawesome' },
      { iconName: 'fa-shield', displayName: 'Security', iconSet: 'fontawesome' },
      { iconName: 'fa-lock', displayName: 'Secure', iconSet: 'fontawesome' },
      { iconName: 'fa-wifi', displayName: 'Comms', iconSet: 'fontawesome' },
      { iconName: 'fa-bolt', displayName: 'Operations', iconSet: 'fontawesome' },
      { iconName: 'fa-crosshairs', displayName: 'Mission', iconSet: 'fontawesome' },
      { iconName: 'fa-flag', displayName: 'Joint', iconSet: 'fontawesome' },
      { iconName: 'fa-cogs', displayName: 'Integration', iconSet: 'fontawesome' },
      // Fluent UI icons (least colorful)
      { iconName: 'Globe', displayName: 'Network', iconSet: 'fluent' },
      { iconName: 'Home', displayName: 'Command', iconSet: 'fluent' },
      { iconName: 'Info', displayName: 'Systems', iconSet: 'fluent' },
      { iconName: 'Warning', displayName: 'Security', iconSet: 'fluent' },
      { iconName: 'Lock', displayName: 'Secure', iconSet: 'fluent' },
      { iconName: 'Globe', displayName: 'Communications', iconSet: 'fluent' },
      { iconName: 'Important', displayName: 'Operations', iconSet: 'fluent' },
      { iconName: 'POI', displayName: 'Mission', iconSet: 'fluent' },
      { iconName: 'FavoriteStarFill', displayName: 'Joint', iconSet: 'fluent' },
      { iconName: 'Important', displayName: 'Integration', iconSet: 'fluent' }
    ];
    return deduplicateIcons(jointIcons);
  }

  // DOD CIO / NSA / USCC - security, government (TONS of options)
  if (option.indexOf('dod') !== -1 || option.indexOf('nsa') !== -1 || option.indexOf('uscc') !== -1 || option.indexOf('cio') !== -1) {
    const dodIcons: IIconOption[] = [
      { iconName: '', displayName: 'None', description: 'No icon' },
      // Emoji icons (most vibrant)
      { iconName: '🛡️', displayName: 'Security', iconSet: 'emoji' },
      { iconName: '🏛️', displayName: 'Government', iconSet: 'emoji' },
      { iconName: '🔒', displayName: 'Secure', iconSet: 'emoji' },
      { iconName: '⚡', displayName: 'Critical', iconSet: 'emoji' },
      { iconName: '🇺🇸', displayName: 'National', iconSet: 'emoji' },
      { iconName: '👑', displayName: 'Authority', iconSet: 'emoji' },
      { iconName: '🎖️', displayName: 'Military', iconSet: 'emoji' },
      { iconName: '🔐', displayName: 'Encrypted', iconSet: 'emoji' },
      { iconName: '🔑', displayName: 'Key', iconSet: 'emoji' },
      { iconName: '🚨', displayName: 'Alert', iconSet: 'emoji' },
      // Unicode symbols
      { iconName: '🛡', displayName: 'Shield', iconSet: 'unicode' },
      { iconName: '🏛', displayName: 'Capitol', iconSet: 'unicode' },
      { iconName: '🔒', displayName: 'Lock', iconSet: 'unicode' },
      { iconName: '⚡', displayName: 'Power', iconSet: 'unicode' },
      { iconName: '🚩', displayName: 'Flag', iconSet: 'unicode' },
      { iconName: '👑', displayName: 'Crown', iconSet: 'unicode' },
      { iconName: '🔐', displayName: 'Secure', iconSet: 'unicode' },
      { iconName: '🔑', displayName: 'Key', iconSet: 'unicode' },
      { iconName: '🚨', displayName: 'Alarm', iconSet: 'unicode' },
      { iconName: '⚠', displayName: 'Caution', iconSet: 'unicode' },
      // Font Awesome icons
      { iconName: 'fa-shield', displayName: 'Shield', iconSet: 'fontawesome' },
      { iconName: 'fa-university', displayName: 'Government', iconSet: 'fontawesome' },
      { iconName: 'fa-lock', displayName: 'Lock', iconSet: 'fontawesome' },
      { iconName: 'fa-exclamation-triangle', displayName: 'Critical', iconSet: 'fontawesome' },
      { iconName: 'fa-star', displayName: 'Authority', iconSet: 'fontawesome' },
      { iconName: 'fa-key', displayName: 'Key', iconSet: 'fontawesome' },
      { iconName: 'fa-bell', displayName: 'Alert', iconSet: 'fontawesome' },
      { iconName: 'fa-crosshairs', displayName: 'Target', iconSet: 'fontawesome' },
      { iconName: 'fa-laptop', displayName: 'Cyber', iconSet: 'fontawesome' },
      { iconName: 'fa-globe', displayName: 'Global', iconSet: 'fontawesome' },
      // Fluent UI icons (least colorful) - using guaranteed SharePoint icons
      { iconName: 'Warning', displayName: 'Security', iconSet: 'fluent' },
      { iconName: 'Home', displayName: 'Government', iconSet: 'fluent' },
      { iconName: 'Lock', displayName: 'Secure', iconSet: 'fluent' },
      { iconName: 'Important', displayName: 'Critical', iconSet: 'fluent' },
      { iconName: 'FavoriteStarFill', displayName: 'National', iconSet: 'fluent' },
      { iconName: 'FavoriteStarFill', displayName: 'Authority', iconSet: 'fluent' },
      { iconName: 'Accept', displayName: 'Certified', iconSet: 'fluent' },
      { iconName: 'People', displayName: 'Access', iconSet: 'fluent' },
      { iconName: 'AlertSolid', displayName: 'Alert', iconSet: 'fluent' },
      { iconName: 'POI', displayName: 'Target', iconSet: 'fluent' }
    ];
    return deduplicateIcons(dodIcons);
  }
  
  // Mission Partner - partnership, collaboration (MASSIVE selection)
  if (option.indexOf('mission') !== -1 || option.indexOf('partner') !== -1) {
    const missionPartnerIcons: IIconOption[] = [
      { iconName: '', displayName: 'None', description: 'No icon' },
      // Emoji icons (most vibrant)
      { iconName: '🤝', displayName: 'Partnership', iconSet: 'emoji' },
      { iconName: '👥', displayName: 'Collaboration', iconSet: 'emoji' },
      { iconName: '👫', displayName: 'Team', iconSet: 'emoji' },
      { iconName: '🌐', displayName: 'Global', iconSet: 'emoji' },
      { iconName: '🔗', displayName: 'Connection', iconSet: 'emoji' },
      { iconName: '🤜🤛', displayName: 'Teamwork', iconSet: 'emoji' },
      { iconName: '🌍', displayName: 'World', iconSet: 'emoji' },
      { iconName: '🏢', displayName: 'Business', iconSet: 'emoji' },
      { iconName: '💼', displayName: 'Professional', iconSet: 'emoji' },
      { iconName: '📋', displayName: 'Agreement', iconSet: 'emoji' },
      { iconName: '✍️', displayName: 'Contract', iconSet: 'emoji' },
      { iconName: '🎯', displayName: 'Mission', iconSet: 'emoji' },
      { iconName: '🚀', displayName: 'Launch', iconSet: 'emoji' },
      { iconName: '⚡', displayName: 'Alliance', iconSet: 'emoji' },
      { iconName: '🔄', displayName: 'Exchange', iconSet: 'emoji' },
      { iconName: '💪', displayName: 'Strength', iconSet: 'emoji' },
      { iconName: '🎪', displayName: 'Joint', iconSet: 'emoji' },
      { iconName: '🌟', displayName: 'Excellence', iconSet: 'emoji' },
      { iconName: '🏆', displayName: 'Success', iconSet: 'emoji' },
      { iconName: '🎖️', displayName: 'Achievement', iconSet: 'emoji' },
      // Unicode symbols
      { iconName: '🤝', displayName: 'Handshake', iconSet: 'unicode' },
      { iconName: '👥', displayName: 'Group', iconSet: 'unicode' },
      { iconName: '🌐', displayName: 'Globe', iconSet: 'unicode' },
      { iconName: '🔗', displayName: 'Link', iconSet: 'unicode' },
      { iconName: '🌍', displayName: 'Earth', iconSet: 'unicode' },
      { iconName: '🏢', displayName: 'Office', iconSet: 'unicode' },
      { iconName: '💼', displayName: 'Briefcase', iconSet: 'unicode' },
      { iconName: '📋', displayName: 'Clipboard', iconSet: 'unicode' },
      { iconName: '🎯', displayName: 'Target', iconSet: 'unicode' },
      { iconName: '🚀', displayName: 'Rocket', iconSet: 'unicode' },
      // Font Awesome icons
      { iconName: 'fa-handshake-o', displayName: 'Handshake', iconSet: 'fontawesome' },
      { iconName: 'fa-users', displayName: 'Users', iconSet: 'fontawesome' },
      { iconName: 'fa-group', displayName: 'Group', iconSet: 'fontawesome' },
      { iconName: 'fa-globe', displayName: 'Globe', iconSet: 'fontawesome' },
      { iconName: 'fa-link', displayName: 'Link', iconSet: 'fontawesome' },
      { iconName: 'fa-chain', displayName: 'Chain', iconSet: 'fontawesome' },
      { iconName: 'fa-building', displayName: 'Building', iconSet: 'fontawesome' },
      { iconName: 'fa-briefcase', displayName: 'Briefcase', iconSet: 'fontawesome' },
      { iconName: 'fa-clipboard', displayName: 'Clipboard', iconSet: 'fontawesome' },
      { iconName: 'fa-bullseye', displayName: 'Mission', iconSet: 'fontawesome' },
      { iconName: 'fa-rocket', displayName: 'Rocket', iconSet: 'fontawesome' },
      { iconName: 'fa-bolt', displayName: 'Power', iconSet: 'fontawesome' },
      { iconName: 'fa-exchange', displayName: 'Exchange', iconSet: 'fontawesome' },
      { iconName: 'fa-heart', displayName: 'Unity', iconSet: 'fontawesome' },
      { iconName: 'fa-star', displayName: 'Star', iconSet: 'fontawesome' },
      { iconName: 'fa-trophy', displayName: 'Trophy', iconSet: 'fontawesome' },
      { iconName: 'fa-medal', displayName: 'Medal', iconSet: 'fontawesome' },
      { iconName: 'fa-flag', displayName: 'Flag', iconSet: 'fontawesome' },
      { iconName: 'fa-puzzle-piece', displayName: 'Partnership', iconSet: 'fontawesome' },
      { iconName: 'fa-cog', displayName: 'Cooperation', iconSet: 'fontawesome' },
      // Fluent UI icons (least colorful) - using guaranteed SharePoint icons
      { iconName: 'People', displayName: 'Partnership', iconSet: 'fluent' },
      { iconName: 'People', displayName: 'Collaboration', iconSet: 'fluent' },
      { iconName: 'Group', displayName: 'Team', iconSet: 'fluent' },
      { iconName: 'Globe', displayName: 'Global', iconSet: 'fluent' },
      { iconName: 'Link', displayName: 'Connection', iconSet: 'fluent' },
      { iconName: 'People', displayName: 'Teamwork', iconSet: 'fluent' },
      { iconName: 'Home', displayName: 'Business', iconSet: 'fluent' },
      { iconName: 'Contact', displayName: 'Contact', iconSet: 'fluent' },
      { iconName: 'Document', displayName: 'Agreement', iconSet: 'fluent' },
      { iconName: 'POI', displayName: 'Mission', iconSet: 'fluent' },
      { iconName: 'Forward', displayName: 'Launch', iconSet: 'fluent' },
      { iconName: 'Important', displayName: 'Alliance', iconSet: 'fluent' },
      { iconName: 'Sync', displayName: 'Exchange', iconSet: 'fluent' },
      { iconName: 'Heart', displayName: 'Unity', iconSet: 'fluent' },
      { iconName: 'Star', displayName: 'Excellence', iconSet: 'fluent' },
      { iconName: 'Star', displayName: 'Success', iconSet: 'fluent' },
      { iconName: 'Accept', displayName: 'Achievement', iconSet: 'fluent' },
      { iconName: 'FavoriteStarFill', displayName: 'Flag', iconSet: 'fluent' }
    ];
    return deduplicateIcons(missionPartnerIcons);
  }

  // Status options
  if (option.indexOf('tentative') !== -1) {
    const tentativeIcons: IIconOption[] = [
      { iconName: '', displayName: 'None', description: 'No icon' },
      // Emoji icons (most vibrant)
      { iconName: '❓', displayName: 'Question', iconSet: 'emoji' },
      { iconName: '⏰', displayName: 'Pending', iconSet: 'emoji' },
      { iconName: '⚠️', displayName: 'Caution', iconSet: 'emoji' },
      { iconName: '🤔', displayName: 'Thinking', iconSet: 'emoji' },
      { iconName: '⏳', displayName: 'Waiting', iconSet: 'emoji' },
      { iconName: '🔄', displayName: 'In Progress', iconSet: 'emoji' },
      // Unicode symbols
      { iconName: '❓', displayName: 'Question', iconSet: 'unicode' },
      { iconName: '⏰', displayName: 'Clock', iconSet: 'unicode' },
      { iconName: '⚠', displayName: 'Warning', iconSet: 'unicode' },
      { iconName: '⏳', displayName: 'Hourglass', iconSet: 'unicode' },
      // Font Awesome icons
      { iconName: 'fa-question', displayName: 'Question', iconSet: 'fontawesome' },
      { iconName: 'fa-clock-o', displayName: 'Clock', iconSet: 'fontawesome' },
      { iconName: 'fa-exclamation-triangle', displayName: 'Warning', iconSet: 'fontawesome' },
      { iconName: 'fa-hourglass-half', displayName: 'Waiting', iconSet: 'fontawesome' },
      { iconName: 'fa-refresh', displayName: 'Refresh', iconSet: 'fontawesome' },
      // Fluent UI icons (least colorful)
      { iconName: 'Clock', displayName: 'Pending', iconSet: 'fluent' },
      { iconName: 'Search', displayName: 'Uncertain', iconSet: 'fluent' },
      { iconName: 'Warning', displayName: 'Caution', iconSet: 'fluent' },
      { iconName: 'Clock', displayName: 'Waiting', iconSet: 'fluent' },
      { iconName: 'Sync', displayName: 'In Progress', iconSet: 'fluent' }
    ];
    return deduplicateIcons(tentativeIcons);
  }

  if (option.indexOf('confirmed') !== -1) {
    const confirmedIcons: IIconOption[] = [
      { iconName: '', displayName: 'None', description: 'No icon' },
      // Emoji icons (most vibrant)
      { iconName: '✅', displayName: 'Confirmed', iconSet: 'emoji' },
      { iconName: '✔️', displayName: 'Check', iconSet: 'emoji' },
      { iconName: '🎯', displayName: 'On Target', iconSet: 'emoji' },
      { iconName: '🏆', displayName: 'Success', iconSet: 'emoji' },
      { iconName: '⭐', displayName: 'Priority', iconSet: 'emoji' },
      { iconName: '👍', displayName: 'Approved', iconSet: 'emoji' },
      // Unicode symbols
      { iconName: '✅', displayName: 'Check', iconSet: 'unicode' },
      { iconName: '✔', displayName: 'Checkmark', iconSet: 'unicode' },
      { iconName: '⭐', displayName: 'Star', iconSet: 'unicode' },
      { iconName: '🎯', displayName: 'Target', iconSet: 'unicode' },
      // Font Awesome icons
      { iconName: 'fa-check', displayName: 'Check', iconSet: 'fontawesome' },
      { iconName: 'fa-check-circle', displayName: 'Check Circle', iconSet: 'fontawesome' },
      { iconName: 'fa-thumbs-up', displayName: 'Thumbs Up', iconSet: 'fontawesome' },
      { iconName: 'fa-star', displayName: 'Star', iconSet: 'fontawesome' },
      { iconName: 'fa-trophy', displayName: 'Trophy', iconSet: 'fontawesome' },
      // Fluent UI icons (least colorful)
      { iconName: 'CheckMark', displayName: 'Confirmed', iconSet: 'fluent' },
      { iconName: 'CheckMark', displayName: 'Accepted', iconSet: 'fluent' },
      { iconName: 'CheckMark', displayName: 'Complete', iconSet: 'fluent' },
      { iconName: 'Star', displayName: 'Success', iconSet: 'fluent' },
      { iconName: 'Star', displayName: 'Priority', iconSet: 'fluent' }
    ];
    return deduplicateIcons(confirmedIcons);
  }
  
  // Default icons for any option
  const defaultIcons: IIconOption[] = [
    { iconName: '', displayName: 'None', description: 'No icon' },
    // Emoji icons (most vibrant)
    { iconName: '📅', displayName: 'Calendar', iconSet: 'emoji' },
    { iconName: '⭐', displayName: 'Star', iconSet: 'emoji' },
    { iconName: '👥', displayName: 'People', iconSet: 'emoji' },
    { iconName: '⏰', displayName: 'Clock', iconSet: 'emoji' },
    { iconName: '📍', displayName: 'Location', iconSet: 'emoji' },
    { iconName: '🚩', displayName: 'Flag', iconSet: 'emoji' },
    // Unicode symbols
    { iconName: '📅', displayName: 'Calendar', iconSet: 'unicode' },
    { iconName: '⭐', displayName: 'Star', iconSet: 'unicode' },
    { iconName: '👥', displayName: 'Group', iconSet: 'unicode' },
    { iconName: '⏰', displayName: 'Time', iconSet: 'unicode' },
    // Font Awesome icons
    { iconName: 'fa-calendar', displayName: 'Calendar', iconSet: 'fontawesome' },
    { iconName: 'fa-star', displayName: 'Star', iconSet: 'fontawesome' },
    { iconName: 'fa-users', displayName: 'Users', iconSet: 'fontawesome' },
    { iconName: 'fa-clock-o', displayName: 'Clock', iconSet: 'fontawesome' },
    { iconName: 'fa-map-marker', displayName: 'Location', iconSet: 'fontawesome' },
    { iconName: 'fa-flag', displayName: 'Flag', iconSet: 'fontawesome' },
    // Fluent UI icons (least colorful)
    { iconName: 'Calendar', displayName: 'Calendar', iconSet: 'fluent' },
    { iconName: 'Important', displayName: 'Important', iconSet: 'fluent' },
    { iconName: 'Star', displayName: 'Star', iconSet: 'fluent' },
    { iconName: 'FavoriteStarFill', displayName: 'Flag', iconSet: 'fluent' },
    { iconName: 'People', displayName: 'People', iconSet: 'fluent' },
    { iconName: 'Clock', displayName: 'Clock', iconSet: 'fluent' },
    { iconName: 'Location', displayName: 'Location', iconSet: 'fluent' }
  ];
  return deduplicateIcons(defaultIcons);
};

/**
 * Get all unique icons across all contexts (for testing/debugging)
 */
export const getAllAvailableIcons = (): IIconOption[] => {
  const allIcons: { [key: string]: IIconOption } = {};

  // Sample all contexts to get unique icons
  const sampleOptions = [
    'Transit', 'Speaking Event', 'TDY Meetings', 'Exec Time',
    'Out of Office', 'Exercises', 'DISA', 'DCDC', 'DOD CIO',
    'Joint DISA & DCDC', 'Mission Partner', 'Tentative', 'Confirmed'
  ];

  sampleOptions.forEach(option => {
    getContextualIcons(option).forEach(icon => {
      if (!allIcons[icon.iconName]) {
        allIcons[icon.iconName] = icon;
      }
    });
  });

  // Convert to array and sort
  const iconArray: IIconOption[] = [];
  for (const key in allIcons) {
    if (Object.prototype.hasOwnProperty.call(allIcons, key)) {
      iconArray.push(allIcons[key]);
    }
  }

  return iconArray.sort((a: IIconOption, b: IIconOption) => a.displayName.localeCompare(b.displayName));
};
