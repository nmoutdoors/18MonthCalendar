# BigCal Test Cases Checklist

## 🎯 **Pre-Test Setup**
- [ ] **Clean SharePoint Environment**: Delete existing Events, PrivateEvents, BigCalConfig lists
- [ ] **Fresh Webpart**: Add BigCal webpart to clean SharePoint page
- [ ] **Browser Console**: Open developer tools to monitor for errors

---

## 📋 **1. List Configuration & Warnings**

### **Initial State (No Lists)**
- [ ] **Warning Display**: Shows comprehensive warning with all missing lists
- [ ] **Warning Content**: Lists specific issues (Public Events, PrivateEvents, BigCalConfig)
- [ ] **Warning Solution**: Directs to webpart properties panel
- [ ] **Gray Events**: All events display in gray when configuration issues exist

### **List Creation via Webpart Properties**
- [ ] **Open Properties**: Click gear icon → Edit web part
- [ ] **Public Events**: Create main Events list with all required fields
- [ ] **PrivateEvents**: Create PrivateEvents list (Events type, not custom)
- [ ] **BigCalConfig**: Create configuration list for color mappings
- [ ] **Validation Success**: All lists show green checkmarks after creation
- [ ] **Warning Disappears**: No configuration warnings after all lists created

---

## 🎨 **2. Color System & Status Handling**

### **Blank Status Behavior**
- [ ] **New Event Modal**: Status defaults to "Not Set" (blank)
- [ ] **Save Blank Status**: "Not Set" saves as empty string to SharePoint
- [ ] **Load Blank Status**: Empty status displays as "Not Set" in modal
- [ ] **Filter "Not Set"**: Shows events with blank/null status

### **Color Strategy**
- [ ] **Tentative Events**: Always display in magenta (`#ff00ff`)
- [ ] **Confirmed Events**: Display in swimlane color
- [ ] **Blank Status Events**: Display in swimlane color (same as Confirmed)
- [ ] **Color Consistency**: Same swimlane = same color across all events

### **Status Dropdown**
- [ ] **Filter Options**: Shows Confirmed, Tentative, Not Set
- [ ] **Filter Counts**: Accurate counts for each status type
- [ ] **Filter Functionality**: Each filter shows/hides correct events

---

## 📊 **3. CSV Import/Export**

### **CSV Import**
- [ ] **File Upload**: Drag & drop or browse for CSV file
- [ ] **Date Parsing**: Handles "8/1/2025 9:00 AM" format correctly
- [ ] **Blank Status**: Empty Status column imports as blank (not "Not Set")
- [ ] **Success Message**: Shows "Successfully imported X events"
- [ ] **Immediate Display**: Events appear in calendar without refresh
- [ ] **Auto-Navigation**: Calendar navigates to month of imported events

### **CSV Export**
- [ ] **Date Range**: Prompts for start/end dates
- [ ] **File Generation**: Creates properly formatted CSV
- [ ] **Data Accuracy**: Exported data matches calendar events
- [ ] **Status Values**: Blank status exports as empty, not "Not Set"

---

## 📅 **4. Event Management**

### **Event Creation**
- [ ] **New Event Button**: Opens modal for event creation
- [ ] **Required Fields**: Title, Start Date, End Date, Swimlane
- [ ] **Optional Fields**: Status, Description, Private checkbox
- [ ] **Default Values**: Status defaults to "Not Set", Swimlane to "FYSA"
- [ ] **Save Success**: Event appears in calendar immediately
- [ ] **Color Display**: New event shows correct color based on status/swimlane

### **Event Editing**
- [ ] **Click Event**: Opens edit modal with current values
- [ ] **Field Population**: All fields show correct current values
- [ ] **Status Display**: Blank status shows as "Not Set" in dropdown
- [ ] **Update Success**: Changes appear immediately in calendar
- [ ] **Color Update**: Color changes if status/swimlane changed

### **Event Deletion**
- [ ] **Delete Button**: Available in edit modal
- [ ] **Confirmation**: Prompts for deletion confirmation
- [ ] **Remove Success**: Event disappears from calendar immediately

---

## 🔒 **5. Private Events (if PrivateEvents list configured)**

### **Private Event Creation**
- [ ] **Private Checkbox**: Available in event modal
- [ ] **Dual Storage**: Creates placeholder in main list + full event in PrivateEvents
- [ ] **Placeholder Display**: Shows "Unavailable" for non-privileged users
- [ ] **Full Display**: Shows real title/details for privileged users

### **Private Event Management**
- [ ] **Edit Private**: Can edit private event details
- [ ] **Convert to Public**: Can make private event public
- [ ] **Convert to Private**: Can make public event private
- [ ] **Delete Private**: Removes from both lists

---

## 🎛️ **6. Filtering & Search**

### **Swimlane Filtering**
- [ ] **Dropdown Options**: Shows all 12 current swimlanes with counts
- [ ] **Multi-Select**: Can select/deselect multiple swimlanes
- [ ] **Select All/None**: Toggle buttons work correctly
- [ ] **Filter Application**: Shows only selected swimlanes
- [ ] **Count Updates**: Counts update as filters change

### **Status Filtering**
- [ ] **Status Options**: Confirmed, Tentative, Not Set with counts
- [ ] **Multi-Select**: Can select/deselect multiple statuses
- [ ] **Not Set Mapping**: "Not Set" filter finds blank status events
- [ ] **Filter Combination**: Swimlane + Status filters work together

### **Search Functionality**
- [ ] **Text Search**: Searches event titles and descriptions
- [ ] **Real-time**: Updates results as you type
- [ ] **Case Insensitive**: Finds events regardless of case
- [ ] **Combined Filters**: Works with swimlane/status filters

---

## 📱 **7. Views & Navigation**

### **Calendar Views**
- [ ] **Month View**: Default view shows monthly calendar
- [ ] **Week View**: Shows weekly calendar layout
- [ ] **Day View**: Shows single day detailed view
- [ ] **Agenda View**: Shows list format of events
- [ ] **View Switching**: Can switch between all views smoothly

### **Date Navigation**
- [ ] **Month Navigation**: Previous/Next month buttons work
- [ ] **Mini Calendars**: Left panel calendars navigate to clicked month
- [ ] **Today Button**: Returns to current date
- [ ] **Date Picker**: Can jump to specific dates

### **Grid View (18-Month)**
- [ ] **Grid Display**: Shows 18 months in grid format
- [ ] **Event Counts**: Shows event count per month
- [ ] **Month Navigation**: Click month navigates to that month
- [ ] **Current Month**: Highlights current month

---

## 🎨 **8. Color Palette System**

### **Dynamic Color Mappings**
- [ ] **BigCalConfig List**: Stores color configurations
- [ ] **Color Assignment**: Can assign colors to swimlanes/statuses
- [ ] **Real-time Updates**: Color changes apply immediately
- [ ] **Persistence**: Color choices saved and restored

### **Color Palette Studio**
- [ ] **Interface**: Clean interface for color assignment
- [ ] **Color Picker**: Easy color selection tools
- [ ] **Preview**: Shows color changes before saving
- [ ] **Reset Options**: Can restore default colors

---

## 🖨️ **9. Export & Print Features**

### **Excel Export**
- [ ] **Export Dialog**: Opens with date range options
- [ ] **Date Range**: Can specify custom date ranges
- [ ] **File Generation**: Creates Excel file with event data
- [ ] **Data Format**: Proper formatting for SharePoint import

### **Print Functionality**
- [ ] **Print Dialog**: Opens with print options
- [ ] **Calendar Print**: Prints calendar view cleanly
- [ ] **Agenda Print**: Prints agenda list format
- [ ] **Custom Styling**: Print-specific CSS applied

---

## ⚡ **10. Performance & Error Handling**

### **Loading Performance**
- [ ] **Fast Load**: Calendar loads quickly on page load
- [ ] **Smooth Navigation**: Month/view changes are responsive
- [ ] **Large Datasets**: Handles 100+ events without lag
- [ ] **Memory Usage**: No memory leaks during extended use

### **Error Handling**
- [ ] **Network Errors**: Graceful handling of SharePoint connection issues
- [ ] **Invalid Data**: Handles malformed CSV imports gracefully
- [ ] **Permission Errors**: Clear messages for access issues
- [ ] **Console Clean**: No JavaScript errors in browser console

---

## 🔧 **11. Configuration Validation**

### **Field Validation**
- [ ] **Events List**: Validates EventDate, EndDate, Swimlane, Status fields
- [ ] **PrivateEvents List**: Validates as Events list type (template 106)
- [ ] **BigCalConfig List**: Validates configuration list structure
- [ ] **Missing Fields**: Clear error messages for missing fields

### **List Type Validation**
- [ ] **Events Template**: Validates lists are Events type (not custom)
- [ ] **Field Names**: Uses correct field names (EventDate vs Start)
- [ ] **Template Mismatch**: Clear error for wrong list types

---

## 📋 **Quick Smoke Test (5 minutes)**
1. [ ] **Create all lists** via webpart properties
2. [ ] **Import test CSV** (34 events)
3. [ ] **Verify events display** in August 2025
4. [ ] **Test color variety** (different swimlanes show different colors)
5. [ ] **Create new event** and verify it appears
6. [ ] **Filter by status** and verify counts
7. [ ] **Switch calendar views** (month/week/day)
8. [ ] **Check console** for any errors

---

## 🚨 **Critical Issues to Watch For**
- **Console Errors**: Any JavaScript errors indicate problems
- **Gray Events**: All gray events = configuration issues
- **Missing Events**: Events imported but not visible = date/filter issues
- **Wrong Colors**: Color mismatches = mapping issues
- **Slow Performance**: Lag indicates optimization needed
- **Field Validation Errors**: "Start, End missing" = field name mismatch

---

## ✅ **Success Criteria**
- **Zero console errors** during normal operation
- **All events display** with correct colors
- **All filters work** with accurate counts
- **All views function** smoothly
- **Import/export works** reliably
- **Configuration warnings** appear/disappear correctly
- **Performance remains** responsive with test dataset
