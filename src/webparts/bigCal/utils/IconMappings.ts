/**
 * Curated icon mappings for different swimlanes and contexts
 * Icons are from Fluent UI icon set - no need to show icon set names to users
 */

export interface IIconOption {
  iconName: string;
  displayName: string;
  description?: string;
}

/**
 * Get contextual icons for a specific swimlane/status option
 */
export const getContextualIcons = (optionValue: string): IIconOption[] => {
  const option = optionValue.toLowerCase();

  // Transit - planes, cars, travel
  if (option.indexOf('transit') !== -1) {
    return [
      { iconName: '', displayName: 'None', description: 'No icon' },
      { iconName: 'Airplane', displayName: 'Airplane' },
      { iconName: 'Car', displayName: 'Car' },
      { iconName: 'Bus', displayName: 'Bus' },
      { iconName: 'Train', displayName: 'Train' },
      { iconName: 'Move', displayName: 'Movement' },
      { iconName: 'NavigateForward', displayName: 'Travel' },
      { iconName: 'Location', displayName: 'Location' }
    ];
  }
  
  // Speaking events - presentation, microphone
  if (option.indexOf('speaking') !== -1) {
    return [
      { iconName: '', displayName: 'None', description: 'No icon' },
      { iconName: 'Microphone', displayName: 'Microphone' },
      { iconName: 'Presentation', displayName: 'Presentation' },
      { iconName: 'Megaphone', displayName: 'Megaphone' },
      { iconName: 'Stage', displayName: 'Stage' },
      { iconName: 'People', displayName: 'Audience' },
      { iconName: 'Podium', displayName: 'Podium' }
    ];
  }

  // Meetings - people, calendar, conference
  if (option.indexOf('meeting') !== -1 || option.indexOf('congressional') !== -1 || option.indexOf('tdy') !== -1) {
    return [
      { iconName: '', displayName: 'None', description: 'No icon' },
      { iconName: 'People', displayName: 'People' },
      { iconName: 'Meeting', displayName: 'Meeting' },
      { iconName: 'Calendar', displayName: 'Calendar' },
      { iconName: 'VideoConference', displayName: 'Conference' },
      { iconName: 'Group', displayName: 'Group' },
      { iconName: 'Handshake', displayName: 'Partnership' },
      { iconName: 'Government', displayName: 'Government' }
    ];
  }
  
  // Executive time - clock, calendar, executive
  if (option.indexOf('exec') !== -1) {
    return [
      { iconName: '', displayName: 'None', description: 'No icon' },
      { iconName: 'Clock', displayName: 'Clock' },
      { iconName: 'Calendar', displayName: 'Calendar' },
      { iconName: 'Important', displayName: 'Important' },
      { iconName: 'Crown', displayName: 'Executive' },
      { iconName: 'Shield', displayName: 'Authority' },
      { iconName: 'Star', displayName: 'Priority' }
    ];
  }

  // Out of office - away, vacation
  if (option.indexOf('out of office') !== -1 || option.indexOf('away') !== -1) {
    return [
      { iconName: '', displayName: 'None', description: 'No icon' },
      { iconName: 'Away', displayName: 'Away' },
      { iconName: 'Vacation', displayName: 'Vacation' },
      { iconName: 'Home', displayName: 'Home' },
      { iconName: 'Clock', displayName: 'Time Off' },
      { iconName: 'Blocked', displayName: 'Unavailable' },
      { iconName: 'Leave', displayName: 'Leave' }
    ];
  }
  
  // Exercises - training, military
  if (option.indexOf('exercise') !== -1) {
    return [
      { iconName: '', displayName: 'None', description: 'No icon' },
      { iconName: 'Training', displayName: 'Training' },
      { iconName: 'Shield', displayName: 'Defense' },
      { iconName: 'Teamwork', displayName: 'Teamwork' },
      { iconName: 'Target', displayName: 'Target' },
      { iconName: 'Flag', displayName: 'Mission' },
      { iconName: 'Trophy', displayName: 'Achievement' }
    ];
  }

  // DISA - technology, network
  if (option.indexOf('disa') !== -1) {
    return [
      { iconName: '', displayName: 'None', description: 'No icon' },
      { iconName: 'Network', displayName: 'Network' },
      { iconName: 'Server', displayName: 'Server' },
      { iconName: 'Globe', displayName: 'Global' },
      { iconName: 'Shield', displayName: 'Security' },
      { iconName: 'Connectivity', displayName: 'Connectivity' },
      { iconName: 'CloudComputing', displayName: 'Cloud' }
    ];
  }
  
  // DCDC - command, control
  if (option.indexOf('dcdc') !== -1) {
    return [
      { iconName: '', displayName: 'None', description: 'No icon' },
      { iconName: 'CommandPrompt', displayName: 'Command' },
      { iconName: 'Shield', displayName: 'Defense' },
      { iconName: 'Globe', displayName: 'Global' },
      { iconName: 'Radar', displayName: 'Monitoring' },
      { iconName: 'Flag', displayName: 'Command' },
      { iconName: 'Important', displayName: 'Critical' }
    ];
  }

  // DOD CIO / NSA / USCC - security, government
  if (option.indexOf('dod') !== -1 || option.indexOf('nsa') !== -1 || option.indexOf('uscc') !== -1 || option.indexOf('cio') !== -1) {
    return [
      { iconName: '', displayName: 'None', description: 'No icon' },
      { iconName: 'Shield', displayName: 'Security' },
      { iconName: 'Government', displayName: 'Government' },
      { iconName: 'Lock', displayName: 'Secure' },
      { iconName: 'Important', displayName: 'Critical' },
      { iconName: 'Flag', displayName: 'National' },
      { iconName: 'Crown', displayName: 'Authority' }
    ];
  }
  
  // Mission Partner - partnership, collaboration
  if (option.indexOf('mission') !== -1 || option.indexOf('partner') !== -1) {
    return [
      { iconName: '', displayName: 'None', description: 'No icon' },
      { iconName: 'Handshake', displayName: 'Partnership' },
      { iconName: 'People', displayName: 'Collaboration' },
      { iconName: 'Group', displayName: 'Team' },
      { iconName: 'Globe', displayName: 'Global' },
      { iconName: 'Link', displayName: 'Connection' },
      { iconName: 'Teamwork', displayName: 'Teamwork' }
    ];
  }

  // Status options
  if (option.indexOf('tentative') !== -1) {
    return [
      { iconName: '', displayName: 'None', description: 'No icon' },
      { iconName: 'Clock', displayName: 'Pending' },
      { iconName: 'Question', displayName: 'Uncertain' },
      { iconName: 'Warning', displayName: 'Caution' },
      { iconName: 'Hourglass', displayName: 'Waiting' },
      { iconName: 'Sync', displayName: 'In Progress' }
    ];
  }
  
  if (option.indexOf('confirmed') !== -1) {
    return [
      { iconName: '', displayName: 'None', description: 'No icon' },
      { iconName: 'CheckMark', displayName: 'Confirmed' },
      { iconName: 'Accept', displayName: 'Accepted' },
      { iconName: 'Completed', displayName: 'Complete' },
      { iconName: 'Trophy', displayName: 'Success' },
      { iconName: 'Star', displayName: 'Priority' }
    ];
  }
  
  // Default icons for any option
  return [
    { iconName: '', displayName: 'None', description: 'No icon' },
    { iconName: 'Calendar', displayName: 'Calendar' },
    { iconName: 'Important', displayName: 'Important' },
    { iconName: 'Star', displayName: 'Star' },
    { iconName: 'Flag', displayName: 'Flag' },
    { iconName: 'People', displayName: 'People' },
    { iconName: 'Clock', displayName: 'Clock' },
    { iconName: 'Location', displayName: 'Location' }
  ];
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
    'Mission Partner', 'Tentative', 'Confirmed'
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
