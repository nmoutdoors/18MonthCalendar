# SharePoint Fields Integration

## 📊 **Fields Extracted from Events List**

### **Core Fields**
- `Id` - Unique identifier
- `Title` - Event title
- `Start` - Start date/time
- `End` - End date/time

### **New Fields Added**
- `Swimlane` - Choice field with options:
  - Category 1
  - Category 2  
  - Category 3
- `Status` - Choice field with options:
  - Red
  - Green
  - Amber

## 🎨 **Visual Indicators**

### **Status-Based Event Colors**
Events are automatically colored based on their Status field:

- **Red Status**: Muted red background (`#c50e29`)
- **Green Status**: Default SharePoint blue (uses theme primary color)
- **Amber Status**: Muted orange background (`#ca5010`)

### **Swimlane Indicators**
Small colored dots appear in the top-right corner of events:

- **Category 1**: Blue dot (`#0078d4`)
- **Category 2**: Purple dot (`#8764b8`)
- **Category 3**: Light blue dot (`#00bcf2`)

## 🔧 **Technical Implementation**

### **Data Flow**
1. **SharePoint Query**: `select('Id', 'Title', 'Start', 'End', 'Swimlane', 'Status')`
2. **Type Conversion**: SharePoint data → ICalendarEvent interface
3. **Visual Styling**: CSS classes applied based on field values
4. **Event Display**: Calendar shows colored events with indicators

### **TypeScript Types**
```typescript
export type SwimlaneType = 'Category 1' | 'Category 2' | 'Category 3';
export type StatusType = 'Red' | 'Green' | 'Amber';

export interface ICalendarEvent {
  id: number;
  title: string;
  start: Date;
  end: Date;
  swimlane: SwimlaneType;
  status: StatusType;
  // ... other fields
}
```

## 📱 **User Experience**

### **Event Information**
When clicking an event, users see:
```
Event: [Title]
Start: [Start Date/Time]
End: [End Date/Time]
Swimlane: [Category 1/2/3]
Status: [Red/Green/Amber]
```

### **Visual Identification**
- **Quick Status Check**: Event color immediately shows status
- **Category Grouping**: Swimlane dots help identify event categories
- **Consistent Theming**: Colors integrate with SharePoint theme

## 🚀 **Future Enhancements**

### **Filtering Options** (Ready to implement)
- Filter by Status (Red/Green/Amber)
- Filter by Swimlane (Category 1/2/3)
- Multiple filter combinations

### **Legend Component** (Ready to implement)
- Status color legend
- Swimlane indicator legend
- Toggle visibility options

### **Advanced Features** (Ready to implement)
- Bulk status updates
- Swimlane-based views
- Status-based notifications
