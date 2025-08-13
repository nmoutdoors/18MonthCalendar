# Configurable List Name Feature

## Overview
Added a webpart property to allow users to specify a custom SharePoint list name instead of the hardcoded 'Events' list. The feature includes validation to ensure the specified list exists and contains the required fields (Swimlane and Status).

## Implementation Details

### 1. WebPart Property
- **Property Name**: `listName`
- **Type**: `string`
- **Default Value**: `'Events'`
- **Location**: `IBigCalWebPartProps` interface

### 2. Property Pane Configuration
- **Field Type**: `PropertyPaneTextField`
- **Label**: "SharePoint List Name"
- **Description**: Dynamic description showing validation status
- **Placeholder**: "Events"
- **Error Message**: Dynamic error message for validation failures

### 3. Validation Features
- ✅ **List Existence Check**: Verifies the specified list exists
- ✅ **Required Fields Check**: Ensures list contains 'Swimlane' and 'Status' fields
- ✅ **Real-time Validation**: Validates when property value changes
- ✅ **Visual Feedback**: Shows success/error messages in property pane

### 4. Validation States

#### Success State
- **Description**: "✅ List validated successfully - contains all required fields (Swimlane and Status)"
- **Error Message**: None

#### List Not Found
- **Description**: "❌ List does not exist"
- **Error Message**: "List 'ListName' does not exist."

#### Missing Fields
- **Description**: "⚠️ List exists but missing required fields: Swimlane, Status"
- **Error Message**: "List 'ListName' is missing required fields: Swimlane, Status"

## Files Modified

### Core Implementation
1. **`BigCalWebPart.ts`**
   - Added `listName` property to interface
   - Added property pane field with validation
   - Added validation methods and property change handler
   - Updated render method to pass listName to component

2. **`IBigCalProps.ts`**
   - Added `listName: string` property

3. **`BigCal.tsx`**
   - Updated constructor to pass listName to SharePointService

4. **`SharePointService.ts`**
   - Modified constructor to accept optional listName parameter
   - Added `IListValidationResult` interface
   - Added `validateList()` method with comprehensive validation logic

### Test Files
5. **`SharePointServiceValidation.test.ts`**
   - Test file demonstrating validation functionality
   - Examples of expected validation results

## Usage Instructions

### For Developers
1. The webpart now accepts any SharePoint list name
2. Validation occurs automatically when the property is changed
3. The SharePointService is automatically updated with the new list name

### For End Users
1. Open webpart properties
2. Enter the desired SharePoint list name in "SharePoint List Name" field
3. Validation feedback appears immediately:
   - Green checkmark: List is valid and ready to use
   - Red X: List doesn't exist
   - Yellow warning: List exists but missing required fields
4. Save properties when validation shows success

## Required SharePoint List Structure
Any list used with this webpart must contain:
- **Standard Fields**: Id, Title
- **Custom Fields**:
  - `Start` (Date and Time) - Event start date/time
  - `End` (Date and Time) - Event end date/time
  - `Description` (Multiple lines of text) - Event description
  - `Swimlane` (Choice field) - Event categories
  - `Status` (Choice field) - Event status (Confirmed, Tentative, Canceled)

## Error Handling
- Graceful handling of non-existent lists
- Clear error messages for missing fields
- Fallback to default 'Events' list if property is undefined
- Console logging for debugging validation issues

## List Creation Feature

### Automatic List Creation
When validation fails because a list doesn't exist, the webpart now offers to create it automatically:

#### Creation Process
1. **Detection**: Validation detects list doesn't exist (`canCreate: true`)
2. **UI Update**: Property pane shows "Create List with Required Fields" button
3. **Creation**: Creates SharePoint Calendar list (template 100) with:
   - **Base Fields**: Title (from Calendar template)
   - **Custom Fields**: Start/End (date/time), Description (multiple lines of text), Swimlane and Status choice fields with proper options
4. **Validation**: Automatically re-validates the created list
5. **Integration**: Updates SharePointService to use the new list

#### Swimlane Field Options
- Away w/RON
- Day Trip - NCR
- Exercise
- FYSA (default)
- Out of Office
- Training Holiday
- VIP/High Priority

#### Status Field Options
- Confirmed (default)
- Tentative
- Canceled

### User Experience Flow
1. Enter non-existent list name → ❌ "List does not exist"
2. Click "Create List with Required Fields" button
3. Button shows "Creating List..." during process
4. Success → ✅ "List validated successfully"
5. Ready to use with full BigCal functionality

## Benefits
- **Flexibility**: Use any appropriately structured SharePoint list
- **Validation**: Prevents runtime errors from misconfigured lists
- **Self-Service**: Users can create compatible lists without IT assistance
- **User Experience**: Clear feedback on list compatibility with creation option
- **Maintainability**: Centralized validation and creation logic in SharePointService
- **Enterprise Ready**: Proper error handling and logging for troubleshooting
