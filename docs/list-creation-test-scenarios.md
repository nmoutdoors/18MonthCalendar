# List Creation Feature - Test Scenarios

## Overview
Test scenarios for the automatic SharePoint list creation feature in BigCal webpart.

## Test Scenarios

### Scenario 1: Create New List (Happy Path)
**Setup**: Non-existent list name
**Steps**:
1. Open webpart properties
2. Enter "MyEvents" in SharePoint List Name field
3. Observe validation message: "❌ List does not exist - use the Create List button below"
4. Click "Create List with Required Fields" button
5. Wait for creation process (button shows "Creating List...")
6. Verify success message: "✅ List validated successfully"

**Expected Results**:
- Calendar list "MyEvents" created in SharePoint (template 100)
- List contains base fields: Title, Start, End, Description
- List contains custom fields: Swimlane, Status
- Swimlane field has correct choice options
- Status field has correct choice options
- Webpart can load and display events from new list

### Scenario 2: Existing List Validation
**Setup**: Existing "Events" list
**Steps**:
1. Open webpart properties
2. Enter "Events" in SharePoint List Name field
3. Observe validation result

**Expected Results**:
- Validation message: "✅ List validated successfully"
- No create button shown
- Webpart works normally with existing list

### Scenario 3: Existing List Missing Fields
**Setup**: Existing list without Swimlane/Status fields
**Steps**:
1. Create a basic SharePoint list named "TestList"
2. Open webpart properties
3. Enter "TestList" in SharePoint List Name field
4. Observe validation result

**Expected Results**:
- Validation message: "⚠️ List exists but missing required fields: Swimlane, Status"
- No create button shown (canCreate: false)
- Error message explains missing fields

### Scenario 4: Permission Errors
**Setup**: User without list creation permissions
**Steps**:
1. Enter non-existent list name
2. Click "Create List with Required Fields" button
3. Observe error handling

**Expected Results**:
- Graceful error handling
- Clear error message about permissions
- Button returns to normal state
- User can try different approach

### Scenario 5: Network/Connection Errors
**Setup**: Simulate network issues during creation
**Steps**:
1. Enter non-existent list name
2. Click create button during network interruption
3. Observe error handling

**Expected Results**:
- Timeout handling
- Clear error message
- Button returns to normal state
- User can retry

## Field Validation Tests

### Swimlane Field Test
**Verify Created Field**:
- Field Type: Choice
- Internal Name: "Swimlane"
- Display Name: "Swimlane"
- Required: No
- Choices: Away w/RON, Day Trip - NCR, Exercise, FYSA, Out of Office, Training Holiday, VIP/High Priority
- Default Value: FYSA

### Status Field Test
**Verify Created Field**:
- Field Type: Choice
- Internal Name: "Status"
- Display Name: "Status"
- Required: No
- Choices: Confirmed, Tentative, Canceled
- Default Value: Confirmed

## Integration Tests

### Event Creation Test
**After List Creation**:
1. Create new event in webpart
2. Verify Swimlane dropdown shows correct options
3. Verify Status dropdown shows correct options
4. Verify default values are applied
5. Save event and verify in SharePoint list

### Event Display Test
**After List Creation**:
1. Add test events to created list
2. Verify events display in calendar view
3. Verify events display in grid view
4. Verify events display in timeline view
5. Verify filtering by Swimlane works
6. Verify filtering by Status works

## Error Scenarios

### Invalid List Names
- Test with special characters
- Test with very long names
- Test with reserved SharePoint names
- Verify appropriate error messages

### Concurrent Creation
- Multiple users trying to create same list
- Verify proper error handling
- Verify no duplicate lists created

## Performance Tests

### Large Site Collections
- Test creation in sites with many lists
- Verify reasonable response times
- Verify no timeout issues

### Field Creation Performance
- Measure time to create both choice fields
- Verify acceptable performance (< 30 seconds total)

## Cleanup Procedures

### Test Cleanup
After testing, clean up created lists:
1. Navigate to Site Contents
2. Delete test lists created during scenarios
3. Verify no orphaned data remains

### Reset Webpart
1. Change list name back to "Events"
2. Verify webpart returns to normal operation
3. Clear any cached validation results

## Success Criteria

### Functional Requirements
- ✅ List creation works for valid names
- ✅ Proper field creation with correct options
- ✅ Validation updates after creation
- ✅ Error handling for all failure scenarios
- ✅ UI feedback during creation process

### Non-Functional Requirements
- ✅ Creation completes within 30 seconds
- ✅ Graceful error handling
- ✅ No memory leaks or hanging processes
- ✅ Proper logging for troubleshooting
- ✅ Accessible UI elements

## Demo Script

### For Stakeholder Demo
1. **Show Problem**: Enter "DemoEvents" → validation fails
2. **Show Solution**: Click create button → watch progress
3. **Show Success**: Validation passes → create test event
4. **Show Integration**: Event appears in all views with proper fields
5. **Show Flexibility**: Works with any valid list name

This comprehensive test suite ensures the list creation feature works reliably in all scenarios.
