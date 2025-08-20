# SharePoint Events List Configuration for BigCal

## Critical Update: Standard SharePoint Events List Fields

### Overview
BigCal has been updated to use the standard SharePoint Events list field names for proper Outlook calendar synchronization. This ensures compatibility with Outlook's built-in calendar sync functionality.

### Field Name Changes

#### Previous (Custom Fields)
- `Start` (DateTime)
- `End` (DateTime)

#### Updated (Standard SharePoint Events Fields)
- `EventDate` (DateTime) - "Start Time" 
- `EndDate` (DateTime) - "End Time"

### Why This Change is Critical

1. **Outlook Sync Compatibility**: Outlook writes to `EventDate` and `EndDate` fields when users sync their calendars
2. **SharePoint Standard**: These are the built-in field names for SharePoint Events lists
3. **Date Format Consistency**: Ensures proper ISO 8601 format handling (e.g., `2025-08-20T14:30:00Z`)

### Webpart Configuration Requirements

#### For Existing Deployments
If you have existing BigCal deployments using custom `Start`/`End` fields:

1. **Option A: Migrate to Standard Events List**
   - Create a new SharePoint Events list (not custom list)
   - Export existing data using BigCal's Excel export
   - Import data into the new Events list
   - Update webpart properties to point to the new list

2. **Option B: Add Standard Fields to Existing List**
   - Add `EventDate` and `EndDate` fields to your existing list
   - Migrate data from `Start`/`End` to `EventDate`/`EndDate`
   - Remove old `Start`/`End` fields

#### For New Deployments
- Use SharePoint's built-in "Events" list template
- BigCal will automatically work with the standard field names

### Webpart Properties Configuration

Ensure your webpart properties are configured to use a SharePoint Events list that has:

#### Required Standard Fields
- `Title` (Single line of text)
- `EventDate` (Date and Time) - Start Time
- `EndDate` (Date and Time) - End Time
- `Description` (Multiple lines of text)

#### Custom Fields (Added by BigCal)
- `Swimlane` (Choice) - Event Category
- `Status` (Choice) - Event Status
- `Private` (Yes/No) - Private Event Flag
- `PrivateEventId` (Single line of text) - GUID for private events

### Date Format Specification

All dates are now stored in ISO 8601 format with UTC timezone:
- Format: `YYYY-MM-DDTHH:mm:ss.sssZ`
- Example: `2025-08-20T14:30:00.000Z`

This ensures:
- Proper timezone handling
- Outlook sync compatibility
- Cross-platform date consistency

### Testing Your Configuration

1. **Import Test**: Use the provided CSV test data to verify import functionality
2. **Outlook Sync**: Test calendar sync with Outlook to ensure events appear correctly
3. **Date Accuracy**: Verify imported dates match your source data exactly

### Migration Script (PowerShell)

If you need to migrate existing data from `Start`/`End` to `EventDate`/`EndDate`:

```powershell
# Connect to SharePoint
Connect-PnPOnline -Url "https://yourtenant.sharepoint.com/sites/yoursite"

# Get all items from your events list
$items = Get-PnPListItem -List "YourEventsList"

foreach($item in $items) {
    $startValue = $item["Start"]
    $endValue = $item["End"]
    
    if($startValue -and $endValue) {
        Set-PnPListItem -List "YourEventsList" -Identity $item.Id -Values @{
            "EventDate" = $startValue
            "EndDate" = $endValue
        }
    }
}
```

### Verification Checklist

- [ ] SharePoint list uses Events template or has EventDate/EndDate fields
- [ ] Webpart properties point to correct list
- [ ] Excel import shows correct dates
- [ ] Outlook sync works properly
- [ ] Status filtering includes "Not Set" option
- [ ] Events appear immediately during import

### Support

If you encounter issues after this update:
1. Check browser console for any field name errors
2. Verify your SharePoint list has the correct field names
3. Test with the provided CSV sample data
4. Ensure webpart properties are correctly configured
