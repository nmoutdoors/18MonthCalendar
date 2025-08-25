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
      // More Font Awesome icons
      { iconName: 'fa-taxi', displayName: 'Taxi', iconSet: 'fontawesome' },
      { iconName: 'fa-subway', displayName: 'Subway', iconSet: 'fontawesome' },
      { iconName: 'fa-anchor', displayName: 'Anchor', iconSet: 'fontawesome' },
      { iconName: 'fa-paper-plane', displayName: 'Paper Plane', iconSet: 'fontawesome' },
      { iconName: 'fa-rocket', displayName: 'Rocket', iconSet: 'fontawesome' },
      // More Emoji icons
      { iconName: '🏨', displayName: 'Hotel', iconSet: 'emoji' },
      { iconName: '🗺️', displayName: 'World Map', iconSet: 'emoji' },
      { iconName: '🧳', displayName: 'Luggage', iconSet: 'emoji' },
      { iconName: '🏖️', displayName: 'Beach', iconSet: 'emoji' },
      { iconName: '🏔️', displayName: 'Mountain', iconSet: 'emoji' },
      { iconName: '⛵', displayName: 'Sailboat', iconSet: 'emoji' }
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
      // More Font Awesome icons
      { iconName: 'fa-file-powerpoint-o', displayName: 'PowerPoint', iconSet: 'fontawesome' },
      { iconName: 'fa-desktop', displayName: 'Screen', iconSet: 'fontawesome' },
      { iconName: 'fa-video-camera', displayName: 'Camera', iconSet: 'fontawesome' },
      { iconName: 'fa-star', displayName: 'Featured', iconSet: 'fontawesome' },
      // More Emoji icons
      { iconName: '🎤', displayName: 'Mic', iconSet: 'emoji' },
      { iconName: '🎪', displayName: 'Event', iconSet: 'emoji' },
      { iconName: '🎭', displayName: 'Performance', iconSet: 'emoji' },
      { iconName: '🎬', displayName: 'Action', iconSet: 'emoji' },
      { iconName: '📺', displayName: 'Broadcast', iconSet: 'emoji' },
      { iconName: '🎯', displayName: 'Focus', iconSet: 'emoji' }
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
      // More Font Awesome icons
      { iconName: 'fa-group', displayName: 'Group', iconSet: 'fontawesome' },
      { iconName: 'fa-comments', displayName: 'Discussion', iconSet: 'fontawesome' },
      { iconName: 'fa-phone', displayName: 'Call', iconSet: 'fontawesome' },
      { iconName: 'fa-video-camera', displayName: 'Video Call', iconSet: 'fontawesome' },
      { iconName: 'fa-table', displayName: 'Conference Table', iconSet: 'fontawesome' },
      // More Emoji icons
      { iconName: '👥', displayName: 'Team', iconSet: 'emoji' },
      { iconName: '🤝', displayName: 'Agreement', iconSet: 'emoji' },
      { iconName: '💼', displayName: 'Business', iconSet: 'emoji' },
      { iconName: '🏢', displayName: 'Corporate', iconSet: 'emoji' },
      { iconName: '📋', displayName: 'Agenda', iconSet: 'emoji' }
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
      // More Font Awesome icons
      { iconName: 'fa-user-tie', displayName: 'Executive', iconSet: 'fontawesome' },
      { iconName: 'fa-diamond', displayName: 'Premium', iconSet: 'fontawesome' },
      { iconName: 'fa-crown', displayName: 'Leadership', iconSet: 'fontawesome' },
      { iconName: 'fa-gavel', displayName: 'Decision', iconSet: 'fontawesome' },
      // More Emoji icons
      { iconName: '⏰', displayName: 'Alarm', iconSet: 'emoji' },
      { iconName: '📅', displayName: 'Schedule', iconSet: 'emoji' },
      { iconName: '⚡', displayName: 'Priority', iconSet: 'emoji' },
      { iconName: '👔', displayName: 'Executive', iconSet: 'emoji' },
      { iconName: '🏆', displayName: 'Achievement', iconSet: 'emoji' },
      { iconName: '📊', displayName: 'Analytics', iconSet: 'emoji' }
    ];
    return deduplicateIcons(execIcons);
  }

  // Out of office - away, vacation
  if (option.indexOf('out of office') !== -1 || option.indexOf('away') !== -1) {
    const outOfOfficeIcons: IIconOption[] = [
      { iconName: '', displayName: 'None', description: 'No icon' },
      // Emoji icons (most vibrant)
      { iconName: '🕐', displayName: 'Clock (Default)', iconSet: 'emoji' }, // Default Out of Office icon
      { iconName: '🏠', displayName: 'Home', iconSet: 'emoji' },
      { iconName: '🏖️', displayName: 'Vacation', iconSet: 'emoji' },
      { iconName: '🚪', displayName: 'Away', iconSet: 'emoji' },
      { iconName: '⏰', displayName: 'Alarm Clock', iconSet: 'emoji' },
      { iconName: '🔒', displayName: 'Unavailable', iconSet: 'emoji' },
      { iconName: '📴', displayName: 'Offline', iconSet: 'emoji' },
      // Unicode symbols
      { iconName: '🕐', displayName: 'Clock (Default)', iconSet: 'unicode' }, // Default Out of Office icon
      { iconName: '🏠', displayName: 'Home', iconSet: 'unicode' },
      { iconName: '🚪', displayName: 'Door', iconSet: 'unicode' },
      { iconName: '⏰', displayName: 'Alarm Clock', iconSet: 'unicode' },
      { iconName: '🔒', displayName: 'Lock', iconSet: 'unicode' },
      // Font Awesome icons
      { iconName: 'fa-home', displayName: 'Home', iconSet: 'fontawesome' },
      { iconName: 'fa-sign-out', displayName: 'Sign Out', iconSet: 'fontawesome' },
      { iconName: 'fa-clock-o', displayName: 'Time Off', iconSet: 'fontawesome' },
      { iconName: 'fa-lock', displayName: 'Locked', iconSet: 'fontawesome' },
      { iconName: 'fa-phone-slash', displayName: 'No Contact', iconSet: 'fontawesome' },
      { iconName: 'fa-bed', displayName: 'Rest', iconSet: 'fontawesome' },
      // More Font Awesome icons
      { iconName: 'fa-home', displayName: 'Home', iconSet: 'fontawesome' },
      { iconName: 'fa-calendar-times-o', displayName: 'Time Off', iconSet: 'fontawesome' },
      { iconName: 'fa-ban', displayName: 'Unavailable', iconSet: 'fontawesome' },
      { iconName: 'fa-arrow-left', displayName: 'Leave', iconSet: 'fontawesome' },
      // More Emoji icons
      { iconName: '🏠', displayName: 'Home', iconSet: 'emoji' },
      { iconName: '🚪', displayName: 'Exit', iconSet: 'emoji' },
      { iconName: '🔒', displayName: 'Locked Out', iconSet: 'emoji' },
      { iconName: '💤', displayName: 'Sleep', iconSet: 'emoji' }
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
      // More Font Awesome icons
      { iconName: 'fa-graduation-cap', displayName: 'Training', iconSet: 'fontawesome' },
      { iconName: 'fa-users', displayName: 'Teamwork', iconSet: 'fontawesome' },
      { iconName: 'fa-bullseye', displayName: 'Target', iconSet: 'fontawesome' },
      { iconName: 'fa-flag-checkered', displayName: 'Mission', iconSet: 'fontawesome' },
      // More Emoji icons
      { iconName: '🎖️', displayName: 'Military', iconSet: 'emoji' },
      { iconName: '🏋️', displayName: 'Training', iconSet: 'emoji' },
      { iconName: '🛡️', displayName: 'Defense', iconSet: 'emoji' },
      { iconName: '🎯', displayName: 'Target', iconSet: 'emoji' },
      { iconName: '🚁', displayName: 'Military', iconSet: 'emoji' }
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
      // More Font Awesome icons
      { iconName: 'fa-server', displayName: 'Server', iconSet: 'fontawesome' },
      { iconName: 'fa-database', displayName: 'Database', iconSet: 'fontawesome' },
      { iconName: 'fa-code', displayName: 'Code', iconSet: 'fontawesome' },
      { iconName: 'fa-terminal', displayName: 'Terminal', iconSet: 'fontawesome' },
      // More Emoji icons
      { iconName: '🌐', displayName: 'Network', iconSet: 'emoji' },
      { iconName: '💻', displayName: 'Computer', iconSet: 'emoji' },
      { iconName: '🔒', displayName: 'Security', iconSet: 'emoji' },
      { iconName: '📡', displayName: 'Satellite', iconSet: 'emoji' },
      { iconName: '☁️', displayName: 'Cloud', iconSet: 'emoji' },
      { iconName: '🛡️', displayName: 'Shield', iconSet: 'emoji' }
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
      // More Font Awesome icons
      { iconName: 'fa-home', displayName: 'Command', iconSet: 'fontawesome' },
      { iconName: 'fa-shield', displayName: 'Defense', iconSet: 'fontawesome' },
      { iconName: 'fa-sitemap', displayName: 'Control', iconSet: 'fontawesome' },
      { iconName: 'fa-bullseye', displayName: 'Target', iconSet: 'fontawesome' },
      { iconName: 'fa-crown', displayName: 'Authority', iconSet: 'fontawesome' },
      // More Emoji icons
      { iconName: '🏢', displayName: 'Command', iconSet: 'emoji' },
      { iconName: '🛡️', displayName: 'Defense', iconSet: 'emoji' },
      { iconName: '🌐', displayName: 'Global', iconSet: 'emoji' },
      { iconName: '📡', displayName: 'Monitoring', iconSet: 'emoji' },
      { iconName: '🚩', displayName: 'Flag', iconSet: 'emoji' },
      { iconName: '⚡', displayName: 'Critical', iconSet: 'emoji' }
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
      // More Font Awesome icons
      { iconName: 'fa-link', displayName: 'Connection', iconSet: 'fontawesome' },
      { iconName: 'fa-handshake-o', displayName: 'Partnership', iconSet: 'fontawesome' },
      { iconName: 'fa-puzzle-piece', displayName: 'Integration', iconSet: 'fontawesome' },
      { iconName: 'fa-users', displayName: 'Joint', iconSet: 'fontawesome' },
      // More Emoji icons
      { iconName: '🌐', displayName: 'Network', iconSet: 'emoji' },
      { iconName: '🏢', displayName: 'Command', iconSet: 'emoji' },
      { iconName: '💻', displayName: 'Systems', iconSet: 'emoji' },
      { iconName: '🛡️', displayName: 'Security', iconSet: 'emoji' },
      { iconName: '🔒', displayName: 'Secure', iconSet: 'emoji' },
      { iconName: '📡', displayName: 'Communications', iconSet: 'emoji' }
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
      // More Font Awesome icons
      { iconName: 'fa-certificate', displayName: 'Certified', iconSet: 'fontawesome' },
      { iconName: 'fa-users', displayName: 'Access', iconSet: 'fontawesome' },
      { iconName: 'fa-flag-usa', displayName: 'National', iconSet: 'fontawesome' },
      { iconName: 'fa-gavel', displayName: 'Authority', iconSet: 'fontawesome' },
      // More Emoji icons
      { iconName: '🛡️', displayName: 'Security', iconSet: 'emoji' },
      { iconName: '🏛️', displayName: 'Government', iconSet: 'emoji' },
      { iconName: '🔒', displayName: 'Secure', iconSet: 'emoji' },
      { iconName: '⚡', displayName: 'Critical', iconSet: 'emoji' },
      { iconName: '🇺🇸', displayName: 'National', iconSet: 'emoji' },
      { iconName: '👑', displayName: 'Authority', iconSet: 'emoji' },
      { iconName: '🎖️', displayName: 'Military', iconSet: 'emoji' }
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
      // More Font Awesome icons
      { iconName: 'fa-handshake-o', displayName: 'Partnership', iconSet: 'fontawesome' },
      { iconName: 'fa-users', displayName: 'Collaboration', iconSet: 'fontawesome' },
      { iconName: 'fa-group', displayName: 'Team', iconSet: 'fontawesome' },
      { iconName: 'fa-link', displayName: 'Connection', iconSet: 'fontawesome' },
      { iconName: 'fa-phone', displayName: 'Contact', iconSet: 'fontawesome' },
      { iconName: 'fa-file-text', displayName: 'Agreement', iconSet: 'fontawesome' },
      { iconName: 'fa-arrow-right', displayName: 'Launch', iconSet: 'fontawesome' },
      { iconName: 'fa-refresh', displayName: 'Exchange', iconSet: 'fontawesome' },
      // More Emoji icons
      { iconName: '🤝', displayName: 'Partnership', iconSet: 'emoji' },
      { iconName: '👥', displayName: 'Collaboration', iconSet: 'emoji' },
      { iconName: '🌍', displayName: 'Global', iconSet: 'emoji' },
      { iconName: '🔗', displayName: 'Connection', iconSet: 'emoji' },
      { iconName: '💼', displayName: 'Business', iconSet: 'emoji' },
      { iconName: '📋', displayName: 'Agreement', iconSet: 'emoji' },
      { iconName: '🚀', displayName: 'Launch', iconSet: 'emoji' },
      { iconName: '❤️', displayName: 'Unity', iconSet: 'emoji' }
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
      // More Font Awesome icons
      { iconName: 'fa-pause', displayName: 'Pending', iconSet: 'fontawesome' },
      { iconName: 'fa-search', displayName: 'Uncertain', iconSet: 'fontawesome' },
      { iconName: 'fa-spinner', displayName: 'Processing', iconSet: 'fontawesome' },
      { iconName: 'fa-ellipsis-h', displayName: 'Waiting', iconSet: 'fontawesome' },
      // More Emoji icons
      { iconName: '⏸️', displayName: 'Paused', iconSet: 'emoji' },
      { iconName: '🔍', displayName: 'Searching', iconSet: 'emoji' },
      { iconName: '⚠️', displayName: 'Caution', iconSet: 'emoji' },
      { iconName: '🔄', displayName: 'Processing', iconSet: 'emoji' }
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
      // More Font Awesome icons
      { iconName: 'fa-check-square', displayName: 'Confirmed', iconSet: 'fontawesome' },
      { iconName: 'fa-check-square-o', displayName: 'Accepted', iconSet: 'fontawesome' },
      { iconName: 'fa-tasks', displayName: 'Complete', iconSet: 'fontawesome' },
      { iconName: 'fa-star-o', displayName: 'Priority', iconSet: 'fontawesome' },
      // More Emoji icons
      { iconName: '✅', displayName: 'Confirmed', iconSet: 'emoji' },
      { iconName: '☑️', displayName: 'Accepted', iconSet: 'emoji' },
      { iconName: '🎯', displayName: 'On Target', iconSet: 'emoji' },
      { iconName: '🏆', displayName: 'Success', iconSet: 'emoji' }
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
    // More Font Awesome icons
    { iconName: 'fa-home', displayName: 'Home', iconSet: 'fontawesome' },
    { iconName: 'fa-briefcase', displayName: 'Work', iconSet: 'fontawesome' },
    { iconName: 'fa-cog', displayName: 'Settings', iconSet: 'fontawesome' },
    { iconName: 'fa-info', displayName: 'Info', iconSet: 'fontawesome' },
    // More Emoji icons
    { iconName: '📅', displayName: 'Calendar', iconSet: 'emoji' },
    { iconName: '⚡', displayName: 'Important', iconSet: 'emoji' },
    { iconName: '⭐', displayName: 'Star', iconSet: 'emoji' },
    { iconName: '🚩', displayName: 'Flag', iconSet: 'emoji' },
    { iconName: '👥', displayName: 'People', iconSet: 'emoji' },
    { iconName: '🕐', displayName: 'Clock', iconSet: 'emoji' },
    { iconName: '📍', displayName: 'Location', iconSet: 'emoji' }
  ];
  return deduplicateIcons(defaultIcons);
};

/**
 * Get comprehensive icon options for new swimlanes - provides extensive choices
 * Ordered by vibrancy: None first, then Emoji, Unicode, Font Awesome, Fluent UI
 */
export const getComprehensiveIcons = (): IIconOption[] => {
  const comprehensiveIcons: IIconOption[] = [
    // None option first
    { iconName: '', displayName: 'None', description: 'No icon' },

    // Emoji icons (most vibrant) - extensive collection
    { iconName: '📅', displayName: 'Calendar', iconSet: 'emoji' },
    { iconName: '⭐', displayName: 'Star', iconSet: 'emoji' },
    { iconName: '🚩', displayName: 'Flag', iconSet: 'emoji' },
    { iconName: '🎯', displayName: 'Target', iconSet: 'emoji' },
    { iconName: '👥', displayName: 'People', iconSet: 'emoji' },
    { iconName: '🏢', displayName: 'Building', iconSet: 'emoji' },
    { iconName: '🌐', displayName: 'Globe', iconSet: 'emoji' },
    { iconName: '💼', displayName: 'Briefcase', iconSet: 'emoji' },
    { iconName: '📊', displayName: 'Chart', iconSet: 'emoji' },
    { iconName: '🔒', displayName: 'Lock', iconSet: 'emoji' },
    { iconName: '🛡️', displayName: 'Shield', iconSet: 'emoji' },
    { iconName: '⚡', displayName: 'Lightning', iconSet: 'emoji' },
    { iconName: '🔥', displayName: 'Fire', iconSet: 'emoji' },
    { iconName: '💡', displayName: 'Lightbulb', iconSet: 'emoji' },
    { iconName: '🎖️', displayName: 'Medal', iconSet: 'emoji' },
    { iconName: '🏛️', displayName: 'Government', iconSet: 'emoji' },
    { iconName: '✈️', displayName: 'Airplane', iconSet: 'emoji' },
    { iconName: '🚁', displayName: 'Helicopter', iconSet: 'emoji' },
    { iconName: '🚗', displayName: 'Car', iconSet: 'emoji' },
    { iconName: '🚌', displayName: 'Bus', iconSet: 'emoji' },
    { iconName: '🚂', displayName: 'Train', iconSet: 'emoji' },
    { iconName: '📡', displayName: 'Satellite', iconSet: 'emoji' },
    { iconName: '💻', displayName: 'Computer', iconSet: 'emoji' },
    { iconName: '📱', displayName: 'Phone', iconSet: 'emoji' },
    { iconName: '📞', displayName: 'Telephone', iconSet: 'emoji' },
    { iconName: '📧', displayName: 'Email', iconSet: 'emoji' },
    { iconName: '📋', displayName: 'Clipboard', iconSet: 'emoji' },
    { iconName: '📝', displayName: 'Memo', iconSet: 'emoji' },
    { iconName: '📄', displayName: 'Document', iconSet: 'emoji' },
    { iconName: '📊', displayName: 'Data', iconSet: 'emoji' },
    { iconName: '🎤', displayName: 'Microphone', iconSet: 'emoji' },
    { iconName: '📢', displayName: 'Megaphone', iconSet: 'emoji' },
    { iconName: '🔔', displayName: 'Bell', iconSet: 'emoji' },
    { iconName: '⏰', displayName: 'Clock', iconSet: 'emoji' },
    { iconName: '🕐', displayName: 'Time', iconSet: 'emoji' },
    { iconName: '📍', displayName: 'Location', iconSet: 'emoji' },
    { iconName: '🗺️', displayName: 'Map', iconSet: 'emoji' },
    { iconName: '🏠', displayName: 'Home', iconSet: 'emoji' },
    { iconName: '🏖️', displayName: 'Beach', iconSet: 'emoji' },
    { iconName: '🎓', displayName: 'Education', iconSet: 'emoji' },
    { iconName: '📚', displayName: 'Books', iconSet: 'emoji' },
    { iconName: '🔧', displayName: 'Tools', iconSet: 'emoji' },
    { iconName: '⚙️', displayName: 'Settings', iconSet: 'emoji' },
    { iconName: '🔍', displayName: 'Search', iconSet: 'emoji' },
    { iconName: '❗', displayName: 'Important', iconSet: 'emoji' },
    { iconName: '❓', displayName: 'Question', iconSet: 'emoji' },
    { iconName: '✅', displayName: 'Check', iconSet: 'emoji' },
    { iconName: '❌', displayName: 'X', iconSet: 'emoji' },
    { iconName: '🤝', displayName: 'Handshake', iconSet: 'emoji' },
    { iconName: '👑', displayName: 'Crown', iconSet: 'emoji' },
    { iconName: '🎨', displayName: 'Art', iconSet: 'emoji' },
    { iconName: '🎪', displayName: 'Event', iconSet: 'emoji' },
    { iconName: '🎭', displayName: 'Theater', iconSet: 'emoji' },
    { iconName: '🎬', displayName: 'Movie', iconSet: 'emoji' },
    { iconName: '🎵', displayName: 'Music', iconSet: 'emoji' },
    { iconName: '🏆', displayName: 'Trophy', iconSet: 'emoji' },
    { iconName: '🥇', displayName: 'Gold Medal', iconSet: 'emoji' },
    { iconName: '🎊', displayName: 'Celebration', iconSet: 'emoji' },
    { iconName: '🎉', displayName: 'Party', iconSet: 'emoji' },
    { iconName: '💰', displayName: 'Money', iconSet: 'emoji' },
    { iconName: '💎', displayName: 'Diamond', iconSet: 'emoji' },
    { iconName: '🔑', displayName: 'Key', iconSet: 'emoji' },
    { iconName: '🎲', displayName: 'Dice', iconSet: 'emoji' },
    { iconName: '🧩', displayName: 'Puzzle', iconSet: 'emoji' },
    { iconName: '🎯', displayName: 'Bullseye', iconSet: 'emoji' },
    { iconName: '🚀', displayName: 'Rocket', iconSet: 'emoji' },
    { iconName: '🌟', displayName: 'Glowing Star', iconSet: 'emoji' },
    { iconName: '💫', displayName: 'Dizzy', iconSet: 'emoji' },
    { iconName: '⚖️', displayName: 'Balance', iconSet: 'emoji' },
    { iconName: '🔬', displayName: 'Microscope', iconSet: 'emoji' },
    { iconName: '🧪', displayName: 'Test Tube', iconSet: 'emoji' },
    { iconName: '🩺', displayName: 'Stethoscope', iconSet: 'emoji' },
    { iconName: '💊', displayName: 'Pill', iconSet: 'emoji' },
    { iconName: '🏥', displayName: 'Hospital', iconSet: 'emoji' },
    { iconName: '🚑', displayName: 'Ambulance', iconSet: 'emoji' },
    { iconName: '🚒', displayName: 'Fire Truck', iconSet: 'emoji' },
    { iconName: '🚓', displayName: 'Police Car', iconSet: 'emoji' },
    { iconName: '⚽', displayName: 'Soccer', iconSet: 'emoji' },
    { iconName: '🏀', displayName: 'Basketball', iconSet: 'emoji' },
    { iconName: '🏈', displayName: 'Football', iconSet: 'emoji' },
    { iconName: '⚾', displayName: 'Baseball', iconSet: 'emoji' },
    { iconName: '🎾', displayName: 'Tennis', iconSet: 'emoji' },
    { iconName: '🏐', displayName: 'Volleyball', iconSet: 'emoji' },
    { iconName: '🏓', displayName: 'Ping Pong', iconSet: 'emoji' },
    { iconName: '🏸', displayName: 'Badminton', iconSet: 'emoji' },
    { iconName: '🥊', displayName: 'Boxing', iconSet: 'emoji' },
    { iconName: '🏋️', displayName: 'Weightlifting', iconSet: 'emoji' },
    { iconName: '🤸', displayName: 'Gymnastics', iconSet: 'emoji' },
    { iconName: '🏃', displayName: 'Running', iconSet: 'emoji' },
    { iconName: '🚴', displayName: 'Cycling', iconSet: 'emoji' },
    { iconName: '🏊', displayName: 'Swimming', iconSet: 'emoji' },
    { iconName: '🧘', displayName: 'Meditation', iconSet: 'emoji' },
    { iconName: '🍕', displayName: 'Pizza', iconSet: 'emoji' },
    { iconName: '🍔', displayName: 'Burger', iconSet: 'emoji' },
    { iconName: '☕', displayName: 'Coffee', iconSet: 'emoji' },
    { iconName: '🍺', displayName: 'Beer', iconSet: 'emoji' },
    { iconName: '🍷', displayName: 'Wine', iconSet: 'emoji' },
    { iconName: '🎂', displayName: 'Cake', iconSet: 'emoji' },
    { iconName: '🎈', displayName: 'Balloon', iconSet: 'emoji' },
    { iconName: '🎁', displayName: 'Gift', iconSet: 'emoji' },

    // Unicode symbols (clean and simple)
    { iconName: '★', displayName: 'Star', iconSet: 'unicode' },
    { iconName: '●', displayName: 'Circle', iconSet: 'unicode' },
    { iconName: '■', displayName: 'Square', iconSet: 'unicode' },
    { iconName: '▲', displayName: 'Triangle', iconSet: 'unicode' },
    { iconName: '♦', displayName: 'Diamond', iconSet: 'unicode' },
    { iconName: '♠', displayName: 'Spade', iconSet: 'unicode' },
    { iconName: '♥', displayName: 'Heart', iconSet: 'unicode' },
    { iconName: '♣', displayName: 'Club', iconSet: 'unicode' },
    { iconName: '→', displayName: 'Arrow Right', iconSet: 'unicode' },
    { iconName: '↑', displayName: 'Arrow Up', iconSet: 'unicode' },
    { iconName: '↓', displayName: 'Arrow Down', iconSet: 'unicode' },
    { iconName: '←', displayName: 'Arrow Left', iconSet: 'unicode' },
    { iconName: '✓', displayName: 'Check', iconSet: 'unicode' },
    { iconName: '✗', displayName: 'X', iconSet: 'unicode' },
    { iconName: '?', displayName: 'Question', iconSet: 'unicode' },
    { iconName: '!', displayName: 'Exclamation', iconSet: 'unicode' },
    { iconName: '@', displayName: 'At', iconSet: 'unicode' },
    { iconName: '#', displayName: 'Hash', iconSet: 'unicode' },
    { iconName: '$', displayName: 'Dollar', iconSet: 'unicode' },
    { iconName: '%', displayName: 'Percent', iconSet: 'unicode' },
    { iconName: '&', displayName: 'Ampersand', iconSet: 'unicode' },
    { iconName: '+', displayName: 'Plus', iconSet: 'unicode' },
    { iconName: '-', displayName: 'Minus', iconSet: 'unicode' },
    { iconName: '=', displayName: 'Equals', iconSet: 'unicode' },
    { iconName: '~', displayName: 'Tilde', iconSet: 'unicode' },
    { iconName: '©', displayName: 'Copyright', iconSet: 'unicode' },
    { iconName: '®', displayName: 'Registered', iconSet: 'unicode' },
    { iconName: '™', displayName: 'Trademark', iconSet: 'unicode' },

    // Font Awesome 4.7 icons (comprehensive set)
    { iconName: 'fa-home', displayName: 'Home', iconSet: 'fontawesome' },
    { iconName: 'fa-user', displayName: 'User', iconSet: 'fontawesome' },
    { iconName: 'fa-users', displayName: 'Users', iconSet: 'fontawesome' },
    { iconName: 'fa-cog', displayName: 'Settings', iconSet: 'fontawesome' },
    { iconName: 'fa-cogs', displayName: 'Settings Multiple', iconSet: 'fontawesome' },
    { iconName: 'fa-star', displayName: 'Star', iconSet: 'fontawesome' },
    { iconName: 'fa-star-o', displayName: 'Star Outline', iconSet: 'fontawesome' },
    { iconName: 'fa-heart', displayName: 'Heart', iconSet: 'fontawesome' },
    { iconName: 'fa-heart-o', displayName: 'Heart Outline', iconSet: 'fontawesome' },
    { iconName: 'fa-flag', displayName: 'Flag', iconSet: 'fontawesome' },
    { iconName: 'fa-flag-o', displayName: 'Flag Outline', iconSet: 'fontawesome' },
    { iconName: 'fa-calendar', displayName: 'Calendar', iconSet: 'fontawesome' },
    { iconName: 'fa-calendar-o', displayName: 'Calendar Outline', iconSet: 'fontawesome' },
    { iconName: 'fa-clock-o', displayName: 'Clock', iconSet: 'fontawesome' },
    { iconName: 'fa-bell', displayName: 'Bell', iconSet: 'fontawesome' },
    { iconName: 'fa-bell-o', displayName: 'Bell Outline', iconSet: 'fontawesome' },
    { iconName: 'fa-envelope', displayName: 'Envelope', iconSet: 'fontawesome' },
    { iconName: 'fa-envelope-o', displayName: 'Envelope Outline', iconSet: 'fontawesome' },
    { iconName: 'fa-phone', displayName: 'Phone', iconSet: 'fontawesome' },
    { iconName: 'fa-mobile', displayName: 'Mobile', iconSet: 'fontawesome' },
    { iconName: 'fa-laptop', displayName: 'Laptop', iconSet: 'fontawesome' },
    { iconName: 'fa-desktop', displayName: 'Desktop', iconSet: 'fontawesome' },
    { iconName: 'fa-tablet', displayName: 'Tablet', iconSet: 'fontawesome' },
    { iconName: 'fa-globe', displayName: 'Globe', iconSet: 'fontawesome' },
    { iconName: 'fa-map-marker', displayName: 'Map Marker', iconSet: 'fontawesome' },
    { iconName: 'fa-map', displayName: 'Map', iconSet: 'fontawesome' },
    { iconName: 'fa-building', displayName: 'Building', iconSet: 'fontawesome' },
    { iconName: 'fa-building-o', displayName: 'Building Outline', iconSet: 'fontawesome' },
    { iconName: 'fa-car', displayName: 'Car', iconSet: 'fontawesome' },
    { iconName: 'fa-plane', displayName: 'Plane', iconSet: 'fontawesome' },
    { iconName: 'fa-train', displayName: 'Train', iconSet: 'fontawesome' },
    { iconName: 'fa-bus', displayName: 'Bus', iconSet: 'fontawesome' },
    { iconName: 'fa-bicycle', displayName: 'Bicycle', iconSet: 'fontawesome' },
    { iconName: 'fa-ship', displayName: 'Ship', iconSet: 'fontawesome' },
    { iconName: 'fa-rocket', displayName: 'Rocket', iconSet: 'fontawesome' },
    { iconName: 'fa-briefcase', displayName: 'Briefcase', iconSet: 'fontawesome' },
    { iconName: 'fa-suitcase', displayName: 'Suitcase', iconSet: 'fontawesome' },
    { iconName: 'fa-money', displayName: 'Money', iconSet: 'fontawesome' },
    { iconName: 'fa-credit-card', displayName: 'Credit Card', iconSet: 'fontawesome' },
    { iconName: 'fa-shopping-cart', displayName: 'Shopping Cart', iconSet: 'fontawesome' },
    { iconName: 'fa-gift', displayName: 'Gift', iconSet: 'fontawesome' },
    { iconName: 'fa-trophy', displayName: 'Trophy', iconSet: 'fontawesome' },
    { iconName: 'fa-certificate', displayName: 'Certificate', iconSet: 'fontawesome' },
    { iconName: 'fa-graduation-cap', displayName: 'Graduation Cap', iconSet: 'fontawesome' },
    { iconName: 'fa-book', displayName: 'Book', iconSet: 'fontawesome' },
    { iconName: 'fa-bookmark', displayName: 'Bookmark', iconSet: 'fontawesome' },
    { iconName: 'fa-bookmark-o', displayName: 'Bookmark Outline', iconSet: 'fontawesome' },
    { iconName: 'fa-file', displayName: 'File', iconSet: 'fontawesome' },
    { iconName: 'fa-file-o', displayName: 'File Outline', iconSet: 'fontawesome' },
    { iconName: 'fa-file-text', displayName: 'File Text', iconSet: 'fontawesome' },
    { iconName: 'fa-file-text-o', displayName: 'File Text Outline', iconSet: 'fontawesome' },
    { iconName: 'fa-folder', displayName: 'Folder', iconSet: 'fontawesome' },
    { iconName: 'fa-folder-o', displayName: 'Folder Outline', iconSet: 'fontawesome' },
    { iconName: 'fa-folder-open', displayName: 'Folder Open', iconSet: 'fontawesome' },
    { iconName: 'fa-folder-open-o', displayName: 'Folder Open Outline', iconSet: 'fontawesome' },
    { iconName: 'fa-database', displayName: 'Database', iconSet: 'fontawesome' },
    { iconName: 'fa-server', displayName: 'Server', iconSet: 'fontawesome' },
    { iconName: 'fa-cloud', displayName: 'Cloud', iconSet: 'fontawesome' },
    { iconName: 'fa-download', displayName: 'Download', iconSet: 'fontawesome' },
    { iconName: 'fa-upload', displayName: 'Upload', iconSet: 'fontawesome' },
    { iconName: 'fa-share', displayName: 'Share', iconSet: 'fontawesome' },
    { iconName: 'fa-link', displayName: 'Link', iconSet: 'fontawesome' },
    { iconName: 'fa-chain', displayName: 'Chain', iconSet: 'fontawesome' },
    { iconName: 'fa-lock', displayName: 'Lock', iconSet: 'fontawesome' },
    { iconName: 'fa-unlock', displayName: 'Unlock', iconSet: 'fontawesome' },
    { iconName: 'fa-key', displayName: 'Key', iconSet: 'fontawesome' },
    { iconName: 'fa-shield', displayName: 'Shield', iconSet: 'fontawesome' },
    { iconName: 'fa-fire', displayName: 'Fire', iconSet: 'fontawesome' },
    { iconName: 'fa-bolt', displayName: 'Bolt', iconSet: 'fontawesome' },
    { iconName: 'fa-flash', displayName: 'Flash', iconSet: 'fontawesome' },
    { iconName: 'fa-magic', displayName: 'Magic', iconSet: 'fontawesome' },
    { iconName: 'fa-wrench', displayName: 'Wrench', iconSet: 'fontawesome' },
    { iconName: 'fa-gear', displayName: 'Gear', iconSet: 'fontawesome' },
    { iconName: 'fa-gears', displayName: 'Gears', iconSet: 'fontawesome' },
    { iconName: 'fa-bug', displayName: 'Bug', iconSet: 'fontawesome' },
    { iconName: 'fa-code', displayName: 'Code', iconSet: 'fontawesome' },
    { iconName: 'fa-terminal', displayName: 'Terminal', iconSet: 'fontawesome' },
    { iconName: 'fa-search', displayName: 'Search', iconSet: 'fontawesome' },
    { iconName: 'fa-search-plus', displayName: 'Search Plus', iconSet: 'fontawesome' },
    { iconName: 'fa-search-minus', displayName: 'Search Minus', iconSet: 'fontawesome' },
    { iconName: 'fa-filter', displayName: 'Filter', iconSet: 'fontawesome' },
    { iconName: 'fa-sort', displayName: 'Sort', iconSet: 'fontawesome' },
    { iconName: 'fa-sort-asc', displayName: 'Sort Ascending', iconSet: 'fontawesome' },
    { iconName: 'fa-sort-desc', displayName: 'Sort Descending', iconSet: 'fontawesome' },
    { iconName: 'fa-list', displayName: 'List', iconSet: 'fontawesome' },
    { iconName: 'fa-th', displayName: 'Grid', iconSet: 'fontawesome' },
    { iconName: 'fa-th-list', displayName: 'List View', iconSet: 'fontawesome' },
    { iconName: 'fa-table', displayName: 'Table', iconSet: 'fontawesome' },
    { iconName: 'fa-bars', displayName: 'Menu', iconSet: 'fontawesome' },
    { iconName: 'fa-navicon', displayName: 'Navigation', iconSet: 'fontawesome' },
    { iconName: 'fa-reorder', displayName: 'Reorder', iconSet: 'fontawesome' },
    { iconName: 'fa-plus', displayName: 'Plus', iconSet: 'fontawesome' },
    { iconName: 'fa-minus', displayName: 'Minus', iconSet: 'fontawesome' },
    { iconName: 'fa-times', displayName: 'Times', iconSet: 'fontawesome' },
    { iconName: 'fa-check', displayName: 'Check', iconSet: 'fontawesome' },
    { iconName: 'fa-close', displayName: 'Close', iconSet: 'fontawesome' },
    { iconName: 'fa-remove', displayName: 'Remove', iconSet: 'fontawesome' },
    { iconName: 'fa-ban', displayName: 'Ban', iconSet: 'fontawesome' },
    { iconName: 'fa-trash', displayName: 'Trash', iconSet: 'fontawesome' },
    { iconName: 'fa-trash-o', displayName: 'Trash Outline', iconSet: 'fontawesome' },
    { iconName: 'fa-edit', displayName: 'Edit', iconSet: 'fontawesome' },
    { iconName: 'fa-pencil', displayName: 'Pencil', iconSet: 'fontawesome' },
    { iconName: 'fa-pencil-square', displayName: 'Pencil Square', iconSet: 'fontawesome' },
    { iconName: 'fa-pencil-square-o', displayName: 'Pencil Square Outline', iconSet: 'fontawesome' },
    { iconName: 'fa-save', displayName: 'Save', iconSet: 'fontawesome' },
    { iconName: 'fa-print', displayName: 'Print', iconSet: 'fontawesome' },
    { iconName: 'fa-copy', displayName: 'Copy', iconSet: 'fontawesome' },
    { iconName: 'fa-cut', displayName: 'Cut', iconSet: 'fontawesome' },
    { iconName: 'fa-paste', displayName: 'Paste', iconSet: 'fontawesome' },
    { iconName: 'fa-undo', displayName: 'Undo', iconSet: 'fontawesome' },
    { iconName: 'fa-repeat', displayName: 'Repeat', iconSet: 'fontawesome' },
    { iconName: 'fa-refresh', displayName: 'Refresh', iconSet: 'fontawesome' },
    { iconName: 'fa-sync', displayName: 'Sync', iconSet: 'fontawesome' },
    { iconName: 'fa-spinner', displayName: 'Spinner', iconSet: 'fontawesome' },
    { iconName: 'fa-circle-o-notch', displayName: 'Loading', iconSet: 'fontawesome' },
    { iconName: 'fa-play', displayName: 'Play', iconSet: 'fontawesome' },
    { iconName: 'fa-pause', displayName: 'Pause', iconSet: 'fontawesome' },
    { iconName: 'fa-stop', displayName: 'Stop', iconSet: 'fontawesome' },
    { iconName: 'fa-forward', displayName: 'Forward', iconSet: 'fontawesome' },
    { iconName: 'fa-backward', displayName: 'Backward', iconSet: 'fontawesome' },
    { iconName: 'fa-step-forward', displayName: 'Step Forward', iconSet: 'fontawesome' },
    { iconName: 'fa-step-backward', displayName: 'Step Backward', iconSet: 'fontawesome' },
    { iconName: 'fa-fast-forward', displayName: 'Fast Forward', iconSet: 'fontawesome' },
    { iconName: 'fa-fast-backward', displayName: 'Fast Backward', iconSet: 'fontawesome' },
    { iconName: 'fa-volume-up', displayName: 'Volume Up', iconSet: 'fontawesome' },
    { iconName: 'fa-volume-down', displayName: 'Volume Down', iconSet: 'fontawesome' },
    { iconName: 'fa-volume-off', displayName: 'Volume Off', iconSet: 'fontawesome' },
    { iconName: 'fa-mute', displayName: 'Mute', iconSet: 'fontawesome' },
    { iconName: 'fa-microphone', displayName: 'Microphone', iconSet: 'fontawesome' },
    { iconName: 'fa-microphone-slash', displayName: 'Microphone Off', iconSet: 'fontawesome' },
    { iconName: 'fa-video-camera', displayName: 'Video Camera', iconSet: 'fontawesome' },
    { iconName: 'fa-camera', displayName: 'Camera', iconSet: 'fontawesome' },
    { iconName: 'fa-picture-o', displayName: 'Picture', iconSet: 'fontawesome' },
    { iconName: 'fa-image', displayName: 'Image', iconSet: 'fontawesome' },
    { iconName: 'fa-music', displayName: 'Music', iconSet: 'fontawesome' },
    { iconName: 'fa-headphones', displayName: 'Headphones', iconSet: 'fontawesome' },
    { iconName: 'fa-film', displayName: 'Film', iconSet: 'fontawesome' },
    { iconName: 'fa-tv', displayName: 'TV', iconSet: 'fontawesome' },
    { iconName: 'fa-gamepad', displayName: 'Gamepad', iconSet: 'fontawesome' },
    { iconName: 'fa-puzzle-piece', displayName: 'Puzzle', iconSet: 'fontawesome' },
    { iconName: 'fa-cube', displayName: 'Cube', iconSet: 'fontawesome' },
    { iconName: 'fa-cubes', displayName: 'Cubes', iconSet: 'fontawesome' },

    // Fluent UI icons (professional and consistent)
    { iconName: 'Home', displayName: 'Home', iconSet: 'fluent' },
    { iconName: 'Settings', displayName: 'Settings', iconSet: 'fluent' },
    { iconName: 'People', displayName: 'People', iconSet: 'fluent' },
    { iconName: 'Globe', displayName: 'Globe', iconSet: 'fluent' },
    { iconName: 'Search', displayName: 'Search', iconSet: 'fluent' },
    { iconName: 'Flag', displayName: 'Flag', iconSet: 'fluent' },
    { iconName: 'Lock', displayName: 'Lock', iconSet: 'fluent' },
    { iconName: 'Shield', displayName: 'Shield', iconSet: 'fluent' },
    { iconName: 'Important', displayName: 'Important', iconSet: 'fluent' },
    { iconName: 'Warning', displayName: 'Warning', iconSet: 'fluent' },
    { iconName: 'Alert', displayName: 'Alert', iconSet: 'fluent' },
    { iconName: 'Heart', displayName: 'Heart', iconSet: 'fluent' },
    { iconName: 'Star', displayName: 'Star', iconSet: 'fluent' },
    { iconName: 'Contact', displayName: 'Contact', iconSet: 'fluent' },
    { iconName: 'Group', displayName: 'Group', iconSet: 'fluent' },
    { iconName: 'Link', displayName: 'Link', iconSet: 'fluent' },
    { iconName: 'Move', displayName: 'Move', iconSet: 'fluent' },
    { iconName: 'Forward', displayName: 'Forward', iconSet: 'fluent' },
    { iconName: 'Location', displayName: 'Location', iconSet: 'fluent' },
    { iconName: 'Airplane', displayName: 'Airplane', iconSet: 'fluent' },
    { iconName: 'Car', displayName: 'Car', iconSet: 'fluent' },
    { iconName: 'Bus', displayName: 'Bus', iconSet: 'fluent' },
    { iconName: 'Train', displayName: 'Train', iconSet: 'fluent' },
    { iconName: 'Sync', displayName: 'Sync', iconSet: 'fluent' },
    { iconName: 'Target', displayName: 'Target', iconSet: 'fluent' },
    { iconName: 'Crown', displayName: 'Crown', iconSet: 'fluent' },
    { iconName: 'Calendar', displayName: 'Calendar', iconSet: 'fluent' },
    { iconName: 'Clock', displayName: 'Clock', iconSet: 'fluent' },
    { iconName: 'Mail', displayName: 'Mail', iconSet: 'fluent' },
    { iconName: 'Phone', displayName: 'Phone', iconSet: 'fluent' },
    { iconName: 'Video', displayName: 'Video', iconSet: 'fluent' },
    { iconName: 'Microphone', displayName: 'Microphone', iconSet: 'fluent' },
    { iconName: 'Speaker', displayName: 'Speaker', iconSet: 'fluent' },
    { iconName: 'Document', displayName: 'Document', iconSet: 'fluent' },
    { iconName: 'Folder', displayName: 'Folder', iconSet: 'fluent' },
    { iconName: 'FolderOpen', displayName: 'Folder Open', iconSet: 'fluent' },
    { iconName: 'Edit', displayName: 'Edit', iconSet: 'fluent' },
    { iconName: 'Add', displayName: 'Add', iconSet: 'fluent' },
    { iconName: 'Delete', displayName: 'Delete', iconSet: 'fluent' },
    { iconName: 'Save', displayName: 'Save', iconSet: 'fluent' },
    { iconName: 'Print', displayName: 'Print', iconSet: 'fluent' },
    { iconName: 'Download', displayName: 'Download', iconSet: 'fluent' },
    { iconName: 'Upload', displayName: 'Upload', iconSet: 'fluent' },
    { iconName: 'Share', displayName: 'Share', iconSet: 'fluent' },
    { iconName: 'Copy', displayName: 'Copy', iconSet: 'fluent' },
    { iconName: 'Cut', displayName: 'Cut', iconSet: 'fluent' },
    { iconName: 'Paste', displayName: 'Paste', iconSet: 'fluent' },
    { iconName: 'Undo', displayName: 'Undo', iconSet: 'fluent' },
    { iconName: 'Redo', displayName: 'Redo', iconSet: 'fluent' },
    { iconName: 'Refresh', displayName: 'Refresh', iconSet: 'fluent' },
    { iconName: 'Back', displayName: 'Back', iconSet: 'fluent' },
    { iconName: 'Up', displayName: 'Up', iconSet: 'fluent' },
    { iconName: 'Down', displayName: 'Down', iconSet: 'fluent' },
    { iconName: 'Left', displayName: 'Left', iconSet: 'fluent' },
    { iconName: 'Right', displayName: 'Right', iconSet: 'fluent' },
    { iconName: 'CheckMark', displayName: 'Check Mark', iconSet: 'fluent' },
    { iconName: 'Cancel', displayName: 'Cancel', iconSet: 'fluent' },
    { iconName: 'Radar', displayName: 'Radar', iconSet: 'fluent' },
    { iconName: 'Server', displayName: 'Server', iconSet: 'fluent' },
    { iconName: 'Certificate', displayName: 'Certificate', iconSet: 'fluent' },
    { iconName: 'Permissions', displayName: 'Permissions', iconSet: 'fluent' },
    { iconName: 'Laptop', displayName: 'Laptop', iconSet: 'fluent' }
  ];

  return deduplicateIcons(comprehensiveIcons);
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
