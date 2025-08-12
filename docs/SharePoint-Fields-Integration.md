# SharePoint Fields Integration

## 📊 **Fields Extracted from Events List**

### **Core Fields**
- `Id` - Unique identifier
- `Title` - Event title
- `Start` - Start date/time
- `End` - End date/time

### **New Fields Added**
- `Swimlane` - Choice field with options:
  - Away w/RON
  - Day Trip - NCR
  - Exercise
  - FYSA
  - Out of Office
  - Training Holiday
  - VIP/High Priority
- `Status` - Choice field with options:
  - Confirmed
  - Tentative
  - Canceled

## 🎨 **Visual Indicators**

### **Status-Based Event Colors**
Events are automatically colored based on their Status field:

- **Confirmed Status**: Green background (`#107C10`)
- **Tentative Status**: Yellow background (`#FBC02D`)
- **Canceled Status**: Red background (`#D32F2F`)

### **Swimlane Indicators**
Events are organized by swimlane categories with appropriate icons:

- **Away w/RON**: Airplane icon
- **Day Trip - NCR**: Map pin icon
- **Exercise**: Running icon
- **FYSA**: Info icon
- **Out of Office**: Leave icon
- **Training Holiday**: Education icon
- **VIP/High Priority**: Important icon

## 🔧 **Technical Implementation**

### **Data Flow**
1. **SharePoint Query**: `select('Id', 'Title', 'Start', 'End', 'Swimlane', 'Status')`
2. **Type Conversion**: SharePoint data → ICalendarEvent interface
3. **Visual Styling**: CSS classes applied based on field values
4. **Event Display**: Calendar shows colored events with indicators

### **TypeScript Types**
```typescript
export type SwimlaneType = 'Away w/RON' | 'Day Trip - NCR' | 'Exercise' | 'FYSA' | 'Out of Office' | 'Training Holiday' | 'VIP/High Priority';
export type StatusType = 'Confirmed' | 'Tentative' | 'Canceled';

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
Swimlane: [Away w/RON/Day Trip - NCR/Exercise/FYSA/Out of Office/Training Holiday/VIP/High Priority]
Status: [Confirmed/Tentative/Canceled]
```

### **Visual Identification**
- **Quick Status Check**: Event color immediately shows status
- **Category Grouping**: Swimlane dots help identify event categories
- **Consistent Theming**: Colors integrate with SharePoint theme

## 🚀 **Future Enhancements**

### **Filtering Options** (Ready to implement)
- Filter by Status (Confirmed/Tentative/Canceled)
- Filter by Swimlane (Away w/RON/Day Trip - NCR/Exercise/FYSA/Out of Office/Training Holiday/VIP/High Priority)
- Multiple filter combinations

### **Legend Component** (Ready to implement)
- Status color legend
- Swimlane indicator legend
- Toggle visibility options

### **Advanced Features** (Ready to implement)
- Bulk status updates
- Swimlane-based views
- Status-based notifications
