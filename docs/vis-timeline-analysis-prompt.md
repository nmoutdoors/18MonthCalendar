# vis-timeline Analysis Prompt for Working Project

## Instructions for Augment

Please analyze this SPFx project's vis-timeline implementation and create a comprehensive comparison report. This project is known to work successfully on SharePoint site pages, unlike our BigCalendar project which has issues.

## Analysis Request

**Create a markdown file called `working-project-vis-timeline-analysis.md` that includes:**

### 1. Package Configuration Analysis
```
- What versions of vis-timeline and vis-data are being used?
- Are there any additional vis-related packages?
- Compare with BigCalendar versions: vis-data ^8.0.1, vis-timeline ^8.2.1
```

### 2. Import and Module Loading Patterns
```
- How is vis-timeline imported? (standalone, full package, etc.)
- Where are the CSS files imported?
- Any webpack externals or special bundling configuration?
- Compare with BigCalendar: import { Timeline, DataSet } from 'vis-timeline/standalone'
```

### 3. Component Architecture
```
- React class component vs functional component?
- Lifecycle methods used for initialization?
- How is the timeline container managed (refs, direct DOM, etc.)?
- Compare with BigCalendar: React class component with createRef
```

### 4. Timeline Configuration Options
```
- Document all timeline options being used
- Any special SharePoint-specific configurations?
- Event handling patterns (select, doubleClick, etc.)
- Compare with BigCalendar's extensive options (see reference file)
```

### 5. CSS and Styling Approach
```
- How are vis-timeline styles handled?
- Any global CSS overrides?
- SCSS/CSS module usage patterns?
- Site page compatibility considerations?
- Compare with BigCalendar's heavy :global overrides
```

### 6. Data Management
```
- How are DataSets initialized and managed?
- Data update patterns
- Event data structure
- Compare with BigCalendar's constructor-based DataSet initialization
```

### 7. SharePoint Integration Specifics
```
- Any special handling for different page types (site pages vs web part pages)?
- Permission or context considerations?
- Build configuration differences?
- CDN or asset loading patterns?
```

### 8. Error Handling and Edge Cases
```
- Storage quota error handling?
- Timeline destruction/cleanup patterns?
- Loading state management?
- Browser compatibility considerations?
```

### 9. Key Differences Summary
```
Create a section highlighting the major differences from BigCalendar:
- Package versions
- Import methods
- CSS handling
- Component patterns
- Configuration options
- SharePoint-specific adaptations
```

### 10. Recommendations
```
Based on the analysis, provide specific recommendations for fixing BigCalendar:
- What should be changed in package.json?
- Import statement modifications?
- CSS handling improvements?
- Configuration adjustments?
- Component architecture changes?
```

## Context: BigCalendar Issues

Our BigCalendar project has these specific problems:
- ✅ Works perfectly in workbench and web part pages
- ❌ Fails on SharePoint site pages with:
  - "You're running a development build" warning (even with --ship)
  - QuotaExceededError: Quota exceeded
  - Missing admin buttons (permission issues)
  - Timeline may not render properly

## Reference Configuration

The working project should be compared against our current BigCalendar configuration documented in `docs/BigCalendar-vis-timeline-configuration.md`.

## Output Format

Please create the analysis as a well-structured markdown file that can be easily compared with our current implementation. Focus on actionable differences that could explain why this project works on site pages while BigCalendar doesn't.

---

**To use this prompt:** Copy this entire content and ask Augment in the other project to analyze their vis-timeline implementation using these guidelines.
