# ChromeHider WebPart - Vision & Technical Specification

## 🎯 **Project Vision**

Create a standalone, ultra-lightweight SPFx webpart that hides SharePoint visual overhead to provide a clean, professional fullscreen experience for any site page. This will be a reusable solution across all fullscreen projects, eliminating the need to solve visual polish issues repeatedly.

## 🚀 **Core Requirements**

### **Primary Goal**
- **Hide SharePoint chrome elements** (navigation, headers, footers, page overhead)
- **Load as fast as possible** to hide elements before users see them
- **Provide clean, white, professional appearance** during page loads
- **Be completely reusable** across all fullscreen projects

### **Key Success Criteria**
1. **Speed**: Must load and execute faster than other webparts on the page
2. **Safety**: Always maintain access to webpart properties for emergency recovery
3. **Reliability**: Works consistently across different SharePoint page types
4. **Simplicity**: Minimal code, no heavy dependencies, pure CSS approach

## 🏗️ **Technical Architecture**

### **Webpart Type**
- **SPFx WebPart** (not Application Customizer)
- **Standalone deployment** - can be added to any site page
- **Self-contained** - no site collection level deployment needed

### **Core Implementation**
```typescript
// Ultra-lightweight approach
export default class ChromeHiderWebPart extends BaseClientSideWebPart<IProperties> {
  public onInit(): Promise<void> {
    // Inject CSS immediately - no async operations
    this.injectHidingCSS();
    return Promise.resolve();
  }
  
  private injectHidingCSS(): void {
    // Fast CSS injection to hide SharePoint chrome
    // Target specific SharePoint elements
    // Provide clean white background
  }
}
```

### **CSS Strategy**
Target these SharePoint elements for hiding:
- `#SuiteNavPlaceHolder` - Top navigation
- `[data-automationid="SiteHeader"]` - Site header
- `[data-automationid="TopNav"]` - Top navigation bar
- `[data-automationid="PageCommandBar"]` - Page command bar
- `[data-automationid="pageHeader"]` - Page header
- `[data-automationid="SiteFooter"]` - Site footer
- `[data-automationid="LeftNav"]` - Left navigation

## 🔧 **Critical Technical Challenges**

### **1. Load Order Problem**
**Challenge**: SharePoint doesn't guarantee webpart load sequence
**Potential Solutions**:
- Make ChromeHider the ONLY webpart initially, then dynamically add others
- Use `onInit()` instead of `render()` for immediate execution
- Inject CSS in constructor if possible
- Use `!important` CSS rules to override any timing issues

### **2. Emergency Access (CRITICAL)**
**Challenge**: If CSS breaks, page becomes uneditable
**Required Solutions**:
- **Keyboard shortcut** (e.g., Ctrl+Shift+H) to toggle hiding
- **Small, always-visible toggle button** in corner of screen
- **URL parameter override** (e.g., `?showchrome=1`) to disable hiding
- **Webpart properties** must always be accessible somehow

### **3. Performance Optimization**
**Requirements**:
- **No async operations** in critical path
- **Minimal bundle size** - no unnecessary dependencies
- **Pure CSS approach** - no JavaScript DOM manipulation
- **Immediate execution** - no delays or timeouts

## 🎨 **User Experience Design**

### **Visual Goals**
- **Clean white background** replacing SharePoint chrome
- **Edge-to-edge content** with no margins or padding
- **Professional appearance** during page loads and refreshes
- **Seamless integration** with fullscreen webparts like BigCal

### **Safety Features**
- **Subtle toggle button** (maybe 20x20px) in top-right corner
- **Hover tooltip** explaining how to restore chrome
- **Keyboard shortcut indicator** for power users
- **Emergency recovery instructions** in webpart properties

## 📋 **Implementation Phases**

### **Phase 1: Core Functionality**
- [ ] Create SPFx webpart project
- [ ] Implement basic CSS injection in `onInit()`
- [ ] Target primary SharePoint chrome elements
- [ ] Test load speed and effectiveness

### **Phase 2: Safety Features**
- [ ] Add emergency toggle button
- [ ] Implement keyboard shortcut (Ctrl+Shift+H)
- [ ] Add URL parameter override
- [ ] Test recovery scenarios thoroughly

### **Phase 3: Polish & Optimization**
- [ ] Optimize bundle size
- [ ] Add webpart property for different hiding levels
- [ ] Test across different SharePoint page types
- [ ] Performance testing and optimization

### **Phase 4: Integration Testing**
- [ ] Test with BigCal on same page
- [ ] Verify load order behavior
- [ ] Test emergency access scenarios
- [ ] Cross-browser compatibility testing

## 🔍 **Technical Specifications**

### **Webpart Properties**
```typescript
interface IChromeHiderWebPartProps {
  isEnabled: boolean;           // Master on/off switch
  hideLevel: 'minimal' | 'full'; // Future: different hiding levels
  emergencyKey: string;         // Keyboard shortcut combination
  showToggleButton: boolean;    // Show/hide the toggle button
}
```

### **CSS Injection Strategy**
```css
/* Immediate injection - no delays */
#chrome-hider-styles {
  /* Hide SharePoint chrome */
  #SuiteNavPlaceHolder,
  [data-automationid="SiteHeader"],
  [data-automationid="TopNav"],
  [data-automationid="PageCommandBar"],
  [data-automationid="pageHeader"],
  [data-automationid="SiteFooter"],
  [data-automationid="LeftNav"] {
    display: none !important;
  }
  
  /* Clean white background */
  body, #spPageChrome, .SPPageChrome {
    background: #ffffff !important;
    margin: 0 !important;
    padding: 0 !important;
  }
  
  /* Expand canvas to full width */
  .CanvasZone, .CanvasSection, .Canvas {
    margin: 0 !important;
    padding: 0 !important;
    max-width: 100% !important;
  }
}
```

## ⚠️ **Risk Mitigation**

### **High Priority Risks**
1. **Page becomes uneditable** - Mitigated by multiple recovery methods
2. **Load order issues** - Mitigated by immediate CSS injection
3. **SharePoint updates break selectors** - Mitigated by multiple selector fallbacks

### **Testing Requirements**
- **Emergency recovery** must work 100% of the time
- **Cross-browser testing** (Chrome, Edge, Firefox)
- **Different SharePoint versions** and update levels
- **Mobile responsiveness** (if applicable)

## 🎯 **Success Metrics**

### **Performance**
- **Load time**: < 100ms from page start to chrome hidden
- **Bundle size**: < 50KB total
- **No impact** on other webparts' load times

### **Reliability**
- **100% emergency access** success rate
- **Works on all tested SharePoint page types**
- **No breaking changes** with SharePoint updates

### **User Experience**
- **Immediate visual improvement** - no flash of SharePoint chrome
- **Professional appearance** during page loads
- **Easy recovery** if issues occur

## 🔄 **Future Enhancements**

### **Potential Features**
- **Multiple hiding levels** (minimal, moderate, full)
- **Custom CSS injection** via webpart properties
- **Site-wide deployment option** via Application Customizer
- **Integration with other fullscreen webparts**

### **Advanced Options**
- **Conditional hiding** based on user permissions
- **Time-based hiding** (e.g., hide during business hours)
- **Integration with SharePoint themes**

---

## 📝 **Development Notes**

This webpart will be the foundation for all future fullscreen SharePoint applications. The focus must be on **speed, safety, and reliability** above all else. Every decision should prioritize these three factors.

**Remember**: This solves the visual polish problem once and for all, allowing future projects to focus on functionality rather than fighting SharePoint's visual overhead.
