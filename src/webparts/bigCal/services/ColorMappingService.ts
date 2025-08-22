import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';
import '@pnp/sp/fields';
import { spfi, SPFx } from '@pnp/sp';
import { WebPartContext } from '@microsoft/sp-webpart-base';
import { IColorMapping, IFieldOption, IColorPaletteConfig, generateColorsForOptions, getDefaultIcon } from '../interfaces/IColorMapping';
import { withTimeout, NETWORK_TIMEOUTS } from '../utils/BigCalUtilities';
import { Logger } from './LoggingService';
import { DEFAULT_LIST_NAMES, CACHE_CONFIG } from '../constants/BigCalConstants';

/**
 * Interface for SharePoint list item from BigCalConfig
 */
interface ISharePointConfigItem {
  Id: number;
  Title: string;
  ConfigType: string;
  FieldName: string;
  OptionValue: string;
  ColorHex: string;
  IconName?: string; // Optional icon name
  UseDarkText?: boolean; // Optional dark text preference
  IsActive: boolean;
  SortOrder: number;
  Created: string;
  Modified: string;
}

/**
 * Service for managing dynamic color mappings stored in BigCalConfig SharePoint list
 */
export class ColorMappingService {
  private sp: ReturnType<typeof spfi>;
  private configListName: string = DEFAULT_LIST_NAMES.CONFIG;
  private cachedMappings: IColorMapping[] = [];
  private lastCacheUpdate: Date | null = null;
  private cacheExpiryMinutes: number = CACHE_CONFIG.COLOR_MAPPING_EXPIRY_MINUTES;

  constructor(context: WebPartContext) {
    this.sp = spfi().using(SPFx(context));
  }

  /**
   * Discover all available options from Swimlanes and Status fields in the Events list
   */
  public async discoverFieldOptions(eventsListName: string): Promise<IFieldOption[]> {
    try {
      // Get field choices from SharePoint list with timeout protection
      const swimlaneFieldPromise = this.sp.web.lists.getByTitle(eventsListName).fields.getByInternalNameOrTitle('Swimlane')();
      const statusFieldPromise = this.sp.web.lists.getByTitle(eventsListName).fields.getByInternalNameOrTitle('Status')();

      const [swimlaneField, statusField] = await Promise.all([
        withTimeout(swimlaneFieldPromise, NETWORK_TIMEOUTS.FAST, `Get Swimlane field from ${eventsListName}`),
        withTimeout(statusFieldPromise, NETWORK_TIMEOUTS.FAST, `Get Status field from ${eventsListName}`)
      ]);

      const discoveredOptions: IFieldOption[] = [];
      const existingMappings = await this.getColorMappings();

      // Process Swimlane options
      if (swimlaneField && swimlaneField.Choices) {
        for (const choice of swimlaneField.Choices) {
          if (choice && choice.trim()) {
            let existingMapping: IColorMapping | undefined;
            for (let i = 0; i < existingMappings.length; i++) {
              if (existingMappings[i].fieldName === 'Swimlanes' && existingMappings[i].optionValue === choice) {
                existingMapping = existingMappings[i];
                break;
              }
            }

            discoveredOptions.push({
              fieldName: 'Swimlanes',
              optionValue: choice,
              isNewlyDiscovered: !existingMapping,
              hasColorMapping: !!existingMapping,
              currentColor: existingMapping?.colorHex
            });
          }
        }
      }

      // Process Status options (exclude 'Canceled' as per requirements)
      if (statusField && statusField.Choices) {
        for (const choice of statusField.Choices) {
          if (choice && choice.trim() && choice.toLowerCase() !== 'canceled') {
            let existingMapping: IColorMapping | undefined;
            for (let i = 0; i < existingMappings.length; i++) {
              if (existingMappings[i].fieldName === 'Status' && existingMappings[i].optionValue === choice) {
                existingMapping = existingMappings[i];
                break;
              }
            }

            discoveredOptions.push({
              fieldName: 'Status',
              optionValue: choice,
              isNewlyDiscovered: !existingMapping,
              hasColorMapping: !!existingMapping,
              currentColor: existingMapping?.colorHex
            });
          }
        }
      }

      return discoveredOptions;

    } catch (error) {
      console.error('Error discovering field options', error);
      throw new Error(`Failed to discover field options: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all color mappings from BigCalConfig list with caching
   */
  public async getColorMappings(forceRefresh: boolean = false): Promise<IColorMapping[]> {
    try {
      // Check cache validity
      if (!forceRefresh && this.cachedMappings.length > 0 && this.lastCacheUpdate) {
        const cacheAge = Date.now() - this.lastCacheUpdate.getTime();
        if (cacheAge < this.cacheExpiryMinutes * 60 * 1000) {
          return this.cachedMappings;
        }
      }

      const itemsPromise = this.sp.web.lists.getByTitle(this.configListName).items
        .select('Id', 'Title', 'ConfigType', 'FieldName', 'OptionValue', 'ColorHex', 'IconName', 'UseDarkText', 'IsActive', 'SortOrder', 'Created', 'Modified')
        .filter("ConfigType eq 'ColorMapping'")
        .orderBy('FieldName', true)
        .orderBy('SortOrder', true)();

      const items = await withTimeout(itemsPromise, NETWORK_TIMEOUTS.STANDARD, 'Get color mappings from BigCalConfig');

      this.cachedMappings = items.map((item: ISharePointConfigItem) => ({
        id: item.Id,
        configType: 'ColorMapping' as const,
        fieldName: item.FieldName as 'Swimlanes' | 'Status',
        optionValue: item.OptionValue,
        colorHex: item.ColorHex,
        iconName: item.IconName || undefined, // Handle null/empty icon names
        useDarkText: item.UseDarkText || false, // Handle dark text preference
        isActive: item.IsActive,
        sortOrder: item.SortOrder || 0,
        created: item.Created ? new Date(item.Created) : undefined,
        modified: item.Modified ? new Date(item.Modified) : undefined
      }));

      this.lastCacheUpdate = new Date();
      return this.cachedMappings;

    } catch (error) {
      console.error('Error fetching color mappings', error);

      // Check if this is a "list not found" error
      if (error instanceof Error && (
        error.message.indexOf('does not exist') !== -1 ||
        error.message.indexOf('List') !== -1 ||
        error.message.indexOf('404') !== -1 ||
        error.message.indexOf(this.configListName) !== -1
      )) {
        this.cachedMappings = [];
        this.lastCacheUpdate = new Date();
        return this.cachedMappings;
      }

      throw new Error(`Failed to fetch color mappings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if BigCalConfig list exists
   */
  public async checkConfigListExists(): Promise<boolean> {
    try {
      const listPromise = this.sp.web.lists.getByTitle(this.configListName)();
      await withTimeout(listPromise, NETWORK_TIMEOUTS.FAST, 'Check BigCalConfig list exists');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Save a single color mapping to BigCalConfig list
   */
  public async saveColorMapping(mapping: IColorMapping): Promise<IColorMapping> {
    try {

      const itemData = {
        Title: `${mapping.fieldName} - ${mapping.optionValue}`,
        ConfigType: mapping.configType,
        FieldName: mapping.fieldName,
        OptionValue: mapping.optionValue,
        ColorHex: mapping.colorHex,
        IconName: mapping.iconName || null, // Store null if no icon selected
        UseDarkText: mapping.useDarkText || false, // Store dark text preference
        IsActive: mapping.isActive,
        SortOrder: mapping.sortOrder
      };

      let savedItem;
      if (mapping.id) {
        // Update existing mapping
        await this.sp.web.lists.getByTitle(this.configListName).items.getById(mapping.id).update(itemData);
        savedItem = await this.sp.web.lists.getByTitle(this.configListName).items.getById(mapping.id)
          .select('Id', 'Title', 'ConfigType', 'FieldName', 'OptionValue', 'ColorHex', 'IconName', 'UseDarkText', 'IsActive', 'SortOrder', 'Created', 'Modified')();
      } else {
        // Create new mapping
        const addResult = await this.sp.web.lists.getByTitle(this.configListName).items.add(itemData);

        // Handle different PnP.js response formats
        if (addResult && addResult.data) {
          savedItem = addResult.data;
        } else if (addResult && addResult.Id) {
          savedItem = addResult;
        } else {
          // Fallback: fetch the item by querying for it
          const items = await this.sp.web.lists.getByTitle(this.configListName).items
            .select('Id', 'Title', 'ConfigType', 'FieldName', 'OptionValue', 'ColorHex', 'IconName', 'UseDarkText', 'IsActive', 'SortOrder', 'Created', 'Modified')
            .filter(`Title eq '${itemData.Title}'`)
            .top(1)();

          if (items && items.length > 0) {
            savedItem = items[0];
          } else {
            throw new Error('Failed to retrieve created item');
          }
        }
      }

      // Validate that we have a proper savedItem
      if (!savedItem || !savedItem.Id) {
        throw new Error('SavedItem is undefined or missing Id property');
      }

      const result: IColorMapping = {
        id: savedItem.Id,
        configType: 'ColorMapping',
        fieldName: savedItem.FieldName,
        optionValue: savedItem.OptionValue,
        colorHex: savedItem.ColorHex,
        iconName: savedItem.IconName || undefined, // Handle null/empty icon names
        useDarkText: savedItem.UseDarkText || false, // Handle dark text preference
        isActive: savedItem.IsActive,
        sortOrder: savedItem.SortOrder || 0,
        created: savedItem.Created ? new Date(savedItem.Created) : undefined,
        modified: savedItem.Modified ? new Date(savedItem.Modified) : undefined
      };

      // Update cache
      this.invalidateCache();

      return result;

    } catch (error) {
      console.error('Error saving color mapping', error);
      throw new Error(`Failed to save color mapping: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Save multiple color mappings in batch with improved concurrency handling
   */
  public async saveBulkColorMappings(mappings: IColorMapping[]): Promise<IColorMapping[]> {
    try {
      const results: IColorMapping[] = [];

      // Process in smaller batches with delays to avoid SharePoint concurrency issues
      const batchSize = 3; // Reduced from 10 to 3
      for (let i = 0; i < mappings.length; i += batchSize) {
        const batch = mappings.slice(i, i + batchSize);

        // Process batch items sequentially instead of parallel to avoid conflicts
        for (const mapping of batch) {
          try {
            const result = await this.saveColorMapping(mapping);
            results.push(result);

            // Small delay between individual saves within batch
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch {
            // Continue with other mappings instead of failing entire batch
          }
        }

        // Longer delay between batches
        if (i + batchSize < mappings.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      return results;

    } catch (error) {
      console.error('Error saving bulk color mappings', error);
      throw new Error(`Failed to save bulk color mappings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete a color mapping
   */
  public async deleteColorMapping(mappingId: number): Promise<void> {
    try {
      await this.sp.web.lists.getByTitle(this.configListName).items.getById(mappingId).delete();

      // Update cache
      this.invalidateCache();

    } catch (error) {
      console.error('Error deleting color mapping', error);
      throw new Error(`Failed to delete color mapping: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate default color mappings for newly discovered options
   */
  public async generateDefaultMappings(discoveredOptions: IFieldOption[]): Promise<IColorMapping[]> {
    try {
      const newOptions = discoveredOptions.filter(option => option.isNewlyDiscovered);

      if (newOptions.length === 0) {
        return [];
      }

      console.log(`Generating default colors for ${newOptions.length} new options`);

      const swimlaneOptions = newOptions.filter(o => o.fieldName === 'Swimlanes');
      const statusOptions = newOptions.filter(o => o.fieldName === 'Status');

      const defaultMappings: IColorMapping[] = [];
      let sortOrder = 1000; // Start high to avoid conflicts

      // Generate colors for Swimlanes using specific mappings
      if (swimlaneOptions.length > 0) {
        const swimlaneOptionValues = swimlaneOptions.map(o => o.optionValue);
        const swimlaneColorMap = generateColorsForOptions(swimlaneOptionValues, 'Swimlanes');

        swimlaneOptions.forEach((option) => {
          defaultMappings.push({
            configType: 'ColorMapping',
            fieldName: 'Swimlanes',
            optionValue: option.optionValue,
            colorHex: swimlaneColorMap[option.optionValue],
            iconName: getDefaultIcon(option.optionValue),
            isActive: true,
            sortOrder: sortOrder++
          });
        });
      }

      // Generate colors for Status using specific mappings
      if (statusOptions.length > 0) {
        const statusOptionValues = statusOptions.map(o => o.optionValue);
        const statusColorMap = generateColorsForOptions(statusOptionValues, 'Status');

        statusOptions.forEach((option) => {
          defaultMappings.push({
            configType: 'ColorMapping',
            fieldName: 'Status',
            optionValue: option.optionValue,
            colorHex: statusColorMap[option.optionValue],
            iconName: getDefaultIcon(option.optionValue),
            isActive: true,
            sortOrder: sortOrder++
          });
        });
      }

      return defaultMappings;

    } catch (error) {
      console.error('Error generating default mappings', error);
      throw new Error(`Failed to generate default mappings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Regenerate ALL color mappings with new default colors (not just newly discovered)
   * This will replace existing mappings with the new color scheme
   */
  public async regenerateAllColorMappings(discoveredOptions: IFieldOption[]): Promise<IColorMapping[]> {
    try {
      console.log(`Regenerating ALL color mappings for ${discoveredOptions.length} options`);

      // First, clean up any duplicate entries
      await this.cleanupDuplicateMappings();

      const swimlaneOptions = discoveredOptions.filter(o => o.fieldName === 'Swimlanes');
      const statusOptions = discoveredOptions.filter(o => o.fieldName === 'Status');

      const allMappings: IColorMapping[] = [];
      let sortOrder = 1;

      // Generate colors for ALL Swimlanes using specific mappings
      if (swimlaneOptions.length > 0) {
        const swimlaneOptionValues = swimlaneOptions.map(o => o.optionValue);
        const swimlaneColorMap = generateColorsForOptions(swimlaneOptionValues, 'Swimlanes');

        swimlaneOptions.forEach((option) => {
          allMappings.push({
            configType: 'ColorMapping',
            fieldName: 'Swimlanes',
            optionValue: option.optionValue,
            colorHex: swimlaneColorMap[option.optionValue],
            isActive: true,
            sortOrder: sortOrder++
          });
        });
      }

      // Generate colors for ALL Status using specific mappings
      if (statusOptions.length > 0) {
        const statusOptionValues = statusOptions.map(o => o.optionValue);
        const statusColorMap = generateColorsForOptions(statusOptionValues, 'Status');

        statusOptions.forEach((option) => {
          allMappings.push({
            configType: 'ColorMapping',
            fieldName: 'Status',
            optionValue: option.optionValue,
            colorHex: statusColorMap[option.optionValue],
            isActive: true,
            sortOrder: sortOrder++
          });
        });
      }

      // Delete all existing color mappings first
      await this.deleteAllColorMappings();

      // Save the new mappings
      if (allMappings.length > 0) {
        await this.saveBulkColorMappings(allMappings);
      }

      console.log(`Regenerated ${allMappings.length} color mappings with new colors`);
      return allMappings;

    } catch (error) {
      console.error('Error regenerating all color mappings', error);
      throw new Error(`Failed to regenerate color mappings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Clean up duplicate color mapping entries
   */
  private async cleanupDuplicateMappings(): Promise<void> {
    try {
      console.log('Cleaning up duplicate color mappings');

      const items = await this.sp.web.lists.getByTitle(this.configListName).items
        .select('Id', 'FieldName', 'OptionValue', 'ColorHex', 'Created')
        .filter("ConfigType eq 'ColorMapping'")
        .orderBy('Created', false)(); // Newest first

      const seen = new Set<string>();
      const duplicateIds: number[] = [];

      items.forEach(item => {
        const key = `${item.FieldName}-${item.OptionValue}`;
        if (seen.has(key)) {
          duplicateIds.push(item.Id);
        } else {
          seen.add(key);
        }
      });

      if (duplicateIds.length > 0) {
        console.log(`Found ${duplicateIds.length} duplicate entries, deleting...`);

        // Delete duplicates in batches
        for (const id of duplicateIds) {
          await this.sp.web.lists.getByTitle(this.configListName).items.getById(id).delete();
        }

        console.log(`Deleted ${duplicateIds.length} duplicate entries`);
      }

    } catch (error) {
      console.error('Error cleaning up duplicates', error);
      // Don't throw - this is a cleanup operation
    }
  }

  /**
   * Delete all existing color mappings
   */
  private async deleteAllColorMappings(): Promise<void> {
    try {
      console.log('Deleting all existing color mappings');

      const items = await this.sp.web.lists.getByTitle(this.configListName).items
        .select('Id')
        .filter("ConfigType eq 'ColorMapping'")();

      console.log(`Found ${items.length} existing color mappings to delete`);

      // Delete all existing mappings
      for (const item of items) {
        await this.sp.web.lists.getByTitle(this.configListName).items.getById(item.Id).delete();
      }

      // Clear cache
      this.invalidateCache();

      console.log(`Deleted ${items.length} existing color mappings`);

    } catch (error) {
      console.error('Error deleting color mappings', error);
      throw new Error(`Failed to delete existing color mappings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get current color palette configuration for use in calendar rendering
   */
  public async getColorPaletteConfig(): Promise<IColorPaletteConfig> {
    try {
      const mappings = await this.getColorMappings();
      const activeMappings = mappings.filter(m => m.isActive);

      const swimlaneColors = new Map<string, string>();
      const statusColors = new Map<string, string>();
      const swimlaneIcons = new Map<string, string>();
      const statusIcons = new Map<string, string>();

      activeMappings.forEach(mapping => {
        if (mapping.fieldName === 'Swimlanes') {
          swimlaneColors.set(mapping.optionValue, mapping.colorHex);
          if (mapping.iconName) {
            swimlaneIcons.set(mapping.optionValue, mapping.iconName);
          }
        } else if (mapping.fieldName === 'Status') {
          statusColors.set(mapping.optionValue, mapping.colorHex);
          if (mapping.iconName) {
            statusIcons.set(mapping.optionValue, mapping.iconName);
          }
        }
      });

      return {
        swimlaneColors,
        statusColors,
        swimlaneIcons,
        statusIcons,
        lastUpdated: new Date(),
        version: 1
      };

    } catch (error) {
      console.error('Error getting color palette config', error);
      throw new Error(`Failed to get color palette config: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if we need to regenerate color mappings (e.g., if there are duplicates or missing mappings)
   */
  public async needsColorMappingRegeneration(discoveredOptions: IFieldOption[]): Promise<boolean> {
    try {
      const existingMappings = await this.getColorMappings();

      // Check for duplicates
      const mappingKeys = new Set<string>();
      let hasDuplicates = false;

      for (const mapping of existingMappings) {
        const key = `${mapping.fieldName}-${mapping.optionValue}`;
        if (mappingKeys.has(key)) {
          hasDuplicates = true;
          break;
        }
        mappingKeys.add(key);
      }

      if (hasDuplicates) {
        console.log('Duplicate color mappings detected');
        return true;
      }

      // Check for missing mappings
      const missingMappings = discoveredOptions.filter(option => {
        const key = `${option.fieldName}-${option.optionValue}`;
        return !mappingKeys.has(key);
      });

      if (missingMappings.length > 0) {
        console.log(`Missing color mappings for ${missingMappings.length} options`);
        return true;
      }

      return false;

    } catch (error) {
      console.error('Error checking color mapping regeneration needs', error);
      return true; // If we can't check, assume we need regeneration
    }
  }

  /**
   * Initialize BigCalConfig list with default color mappings for all known options
   * This should be called after creating the BigCalConfig list to populate it with defaults
   */
  public async initializeConfigListWithDefaults(eventsListName: string): Promise<void> {
    try {
      Logger.info('Initializing BigCalConfig list with default color mappings');

      // Try to discover field options from the Events list
      let discoveredOptions = await this.discoverFieldOptions(eventsListName);

      // If discovery failed or returned incomplete results, use fallback
      if (discoveredOptions.length === 0 || this.isDiscoveryIncomplete(discoveredOptions)) {
        Logger.info('Field discovery incomplete, using fallback known options');
        discoveredOptions = this.getFallbackFieldOptions();
      }

      if (discoveredOptions.length === 0) {
        Logger.info('No field options available, skipping initialization');
        return;
      }

      // Generate color mappings for ALL discovered options using custom colors
      const allMappings = await this.generateAllColorMappingsForOptions(discoveredOptions);

      if (allMappings.length > 0) {
        // Save all the default mappings
        await this.saveBulkColorMappings(allMappings);
        Logger.info(`Initialized BigCalConfig with ${allMappings.length} default color mappings`);
      }

    } catch (error) {
      console.error('Error initializing BigCalConfig with defaults', error);
      throw new Error(`Failed to initialize BigCalConfig: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if field discovery returned incomplete results
   */
  private isDiscoveryIncomplete(discoveredOptions: IFieldOption[]): boolean {
    const swimlaneCount = discoveredOptions.filter(o => o.fieldName === 'Swimlanes').length;
    const statusCount = discoveredOptions.filter(o => o.fieldName === 'Status').length;

    // We expect 16 swimlanes and at least 2 status options (Confirmed, Tentative)
    const isIncomplete = swimlaneCount < 16 || statusCount < 2;

    if (isIncomplete) {
      console.log(`Discovery incomplete: Found ${swimlaneCount} swimlanes (expected 16) and ${statusCount} status options (expected 2+)`);
    }

    return isIncomplete;
  }

  /**
   * Get fallback field options using known choices from SharePointService
   */
  private getFallbackFieldOptions(): IFieldOption[] {
    console.log('Using fallback field options from SharePointService');

    const fallbackOptions: IFieldOption[] = [];

    // Current swimlane options (updated list from user)
    const swimlaneChoices = [
      'DCDC',
      'DISA',
      'DOD CIO / NSA / USCC',
      'Exec Time',
      'Exercises',
      'FYSA',
      'Joint DISA & DCDC',
      'Mission Partner',
      'Out of Office',
      'Speaking Event',
      'TDY Meetings/Congressional',
      'Transit'
    ];

    // Current status options (Canceled excluded from display, blank/null handled separately)
    const statusChoices = [
      'Confirmed',
      'Tentative'
      // Note: Excluding 'Canceled' as per requirements
      // Note: Blank/null status handled as separate case, not a choice option
    ];

    // Add swimlane options
    swimlaneChoices.forEach(choice => {
      fallbackOptions.push({
        fieldName: 'Swimlanes',
        optionValue: choice,
        isNewlyDiscovered: true, // Treat as new since we're using fallback
        hasColorMapping: false,
        currentColor: undefined
      });
    });

    // Add Private Events as a special virtual swimlane option for UI filtering
    fallbackOptions.push({
      fieldName: 'Swimlanes',
      optionValue: 'Private Events',
      isNewlyDiscovered: true,
      hasColorMapping: false,
      currentColor: undefined
    });

    // Add status options
    statusChoices.forEach(choice => {
      fallbackOptions.push({
        fieldName: 'Status',
        optionValue: choice,
        isNewlyDiscovered: true, // Treat as new since we're using fallback
        hasColorMapping: false,
        currentColor: undefined
      });
    });

    console.log(`Generated ${fallbackOptions.length} fallback field options`);
    return fallbackOptions;
  }

  /**
   * Generate color mappings for ALL options (not just newly discovered ones)
   * Used for initial population of BigCalConfig list
   */
  private async generateAllColorMappingsForOptions(discoveredOptions: IFieldOption[]): Promise<IColorMapping[]> {
    try {
      const swimlaneOptions = discoveredOptions.filter(o => o.fieldName === 'Swimlanes');
      const statusOptions = discoveredOptions.filter(o => o.fieldName === 'Status');

      const allMappings: IColorMapping[] = [];
      let sortOrder = 1;

      // Generate colors for ALL Swimlanes using specific mappings
      if (swimlaneOptions.length > 0) {
        const swimlaneOptionValues = swimlaneOptions.map(o => o.optionValue);
        const swimlaneColorMap = generateColorsForOptions(swimlaneOptionValues, 'Swimlanes');

        swimlaneOptions.forEach((option) => {
          allMappings.push({
            configType: 'ColorMapping',
            fieldName: 'Swimlanes',
            optionValue: option.optionValue,
            colorHex: swimlaneColorMap[option.optionValue],
            iconName: getDefaultIcon(option.optionValue),
            isActive: true,
            sortOrder: sortOrder++
          });
        });
      }

      // Generate colors for ALL Status using specific mappings
      if (statusOptions.length > 0) {
        const statusOptionValues = statusOptions.map(o => o.optionValue);
        const statusColorMap = generateColorsForOptions(statusOptionValues, 'Status');

        statusOptions.forEach((option) => {
          allMappings.push({
            configType: 'ColorMapping',
            fieldName: 'Status',
            optionValue: option.optionValue,
            colorHex: statusColorMap[option.optionValue],
            iconName: getDefaultIcon(option.optionValue),
            isActive: true,
            sortOrder: sortOrder++
          });
        });
      }

      return allMappings;

    } catch (error) {
      console.error('Error generating all color mappings for options', error);
      throw new Error(`Failed to generate color mappings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Invalidate the cache to force refresh on next request
   */
  public invalidateCache(): void {
    this.cachedMappings = [];
    this.lastCacheUpdate = null;
  }
}
