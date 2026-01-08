# 🔐 Permission-Based UI Pattern

## Overview

The **Permission-Based UI Pattern** is a proven approach for creating enterprise applications that adapt their interface and functionality based on user permissions. This pattern provides graceful degradation for non-admin users, admin-only configuration messages, permission-aware feature access, and "Unavailable" placeholders for restricted content - all while maintaining a professional user experience for everyone.

## What Makes This Pattern Valuable

### User Benefits
- **Appropriate Experience**: Users see only what they can access
- **No Error Spam**: Non-admin users don't see configuration messages they can't act on
- **Clear Feedback**: Admin users get actionable configuration guidance
- **Graceful Degradation**: Features degrade gracefully when permissions are insufficient
- **Professional Polish**: No confusing error messages or broken features

### Developer Benefits
- **Security by Design**: Permissions checked at multiple levels
- **Reusable Pattern**: Same approach works across all features
- **Clear Separation**: Admin vs user logic is explicit
- **Type Safety**: Strong TypeScript interfaces for permission states
- **Testable**: Easy to test different permission scenarios

## Core Problem

Enterprise applications need to:
- **Differentiate** between admin and general users
- **Show** configuration warnings only to users who can fix them
- **Hide** features users don't have permission to access
- **Provide** "Unavailable" placeholders for restricted content
- **Avoid** error spam for normal permission restrictions
- **Maintain** professional UX for all permission levels
- **Check** permissions at multiple layers (UI, service, API)

## Solution Architecture

### The Pattern

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Startup                       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Check User Permissions (WebPart)                │
│  • Check list admin rights                                   │
│  • Pass isUserAdmin flag to component                        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Component Initialization                    │
│  • Validate resources                                        │
│  • Check feature-specific permissions                        │
│  • Determine available features                              │
└─────────────────────────────────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                ▼                       ▼
┌──────────────────────────┐  ┌──────────────────────────┐
│     Admin User UI        │  │   General User UI        │
├──────────────────────────┤  ├──────────────────────────┤
│ • Configuration warnings │  │ • Clean interface        │
│ • All features visible   │  │ • Available features     │
│ • Error details          │  │ • "Unavailable" for      │
│ • Settings access        │  │   restricted content     │
│ • Create/fix resources   │  │ • No config messages     │
└──────────────────────────┘  └──────────────────────────┘
```

### Key Components

1. **Permission Checker** - Determines user's permission level
2. **Admin Flag Propagation** - Passes `isUserAdmin` through component tree
3. **Conditional Rendering** - Shows/hides UI based on permissions
4. **Graceful Degradation** - Provides fallbacks for restricted features
5. **Admin-Only Messages** - Configuration warnings only for admins
6. **Feature Access Control** - Permission-aware feature availability

## Permission Checking

### 1. WebPart-Level Permission Check

```typescript
// BigCalWebPart.ts
export default class BigCalWebPart extends BaseClientSideWebPart<IBigCalWebPartProps> {
  private _sharePointService: SharePointService | undefined;
  
  public async render(): Promise<void> {
    // Check user permissions asynchronously
    const isUserAdmin = await this._checkUserPermissions();
    
    const element = React.createElement(
      BigCal,
      {
        context: this.context,
        listName: this.properties.listName || 'Events',
        isUserAdmin: isUserAdmin, // Pass admin flag to component
        // ... other props
      }
    );
    
    ReactDom.render(element, this.domElement);
  }
  
  private async _checkUserPermissions(): Promise<boolean> {
    try {
      if (!this._sharePointService) {
        return false;
      }
      
      // Check if user has admin rights to the main list
      const isListAdmin = await this._sharePointService.checkUserIsListAdmin(
        this.properties.listName || 'Events'
      );
      
      Logger.debug(`User admin status for Events list: ${isListAdmin}`);
      return isListAdmin;
      
    } catch (error) {
      // Fallback: if we can't determine permissions, assume no admin rights
      Logger.warn('Could not determine user list permissions', error);
      return false;
    }
  }
}
```

**Key Principles:**
- Check permissions at webpart level (before rendering)
- Use list admin rights (more accurate than page edit permissions)
- Fail closed (assume no admin rights on error)
- Log permission checks for debugging
- Pass admin flag to component tree

### 2. Service-Level Permission Check

```typescript
// SharePointService.ts
export class SharePointService {
  /**
   * Check if current user has admin rights to the specified list
   * Admin rights = can manage list (add/edit/delete items and manage list settings)
   */
  public async checkUserIsListAdmin(listName?: string): Promise<boolean> {
    const targetListName = listName || this.listName;
    
    try {
      // Try to access list permissions - this will fail if user doesn't have admin rights
      await this.sp.web.lists.getByTitle(targetListName).effectiveBasePermissions();
      
      // Try to access list settings - only admins can do this
      await this.sp.web.lists.getByTitle(targetListName).select('Title', 'Id')();
      
      // If we can access both, user likely has admin rights
      Logger.debug(`User has admin rights to list: ${targetListName}`);
      return true;
      
    } catch (error) {
      // If any permission check fails, user is not an admin
      Logger.debug(`User does not have admin rights to list: ${targetListName}`, error);
      return false;
    }
  }
}
```

**Key Principles:**
- Try to access admin-only operations
- Catch permission errors (don't throw)
- Return boolean (not error)
- Log results for debugging
- Use specific permission checks (not generic)

### 3. Feature-Specific Permission Check

```typescript
// PrivateEventsService.ts
export class PrivateEventsService {
  private canAccessPrivateEvents: boolean | undefined;
  
  /**
   * Check if current user can access private events list
   * Uses 403 error approach - try to query, catch permission error
   */
  public async canUserAccessPrivateEvents(): Promise<boolean> {
    // Return cached result if available
    if (this.canAccessPrivateEvents !== undefined) {
      return this.canAccessPrivateEvents;
    }
    
    try {
      // Try to query the private events list
      await this.sp.web.lists.getByTitle(this.privateListName).items
        .select('Id')
        .top(1)();
      
      Logger.debug('User has access to private events');
      this.canAccessPrivateEvents = true;
      return true;
      
    } catch {
      Logger.debug('User does not have access to private events');
      this.canAccessPrivateEvents = false;
      return false;
    }
  }
}
```

**Key Principles:**
- Cache permission check results
- Try minimal query (top 1, select Id only)
- Catch errors silently (expected for non-privileged users)
- Log for debugging (not errors)
- Return boolean for easy consumption

## Props Interface

```typescript
export interface IComponentProps {
  // ... other props
  
  // Permission flag from webpart
  isUserAdmin: boolean;
  
  // Context for permission checks
  context: WebPartContext;
}
```

## Conditional Rendering Patterns

### 1. Admin-Only Configuration Warnings

```tsx
// BigCal.tsx
public render(): React.ReactElement<IBigCalProps> {
  return (
    <div className={styles.container}>
      {/* Error messages - shown to ALL users */}
      {error && (
        <MessageBar messageBarType={MessageBarType.error} isMultiline>
          {error}
        </MessageBar>
      )}

      {/* Configuration warnings - ONLY shown to admin users */}
      {this.state.listConfigurationIssues.length > 0 && this.props.isUserAdmin && (
        <MessageBar messageBarType={MessageBarType.warning} isMultiline>
          <strong>⚠️ Configuration Issues Found ({this.state.listConfigurationIssues.length}):</strong>
          <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
            {this.state.listConfigurationIssues.map((issue, index) => (
              <li key={index}>{issue}</li>
            ))}
          </ul>
          <strong>Solution:</strong> Open the webpart properties panel to create or fix the missing lists and fields.
        </MessageBar>
      )}

      {/* Main content */}
      {this.renderMainContent()}
    </div>
  );
}
```

**Why This Matters:**
- **Errors** affect all users → show to everyone
- **Configuration issues** only admins can fix → show only to admins
- Non-admin users get clean interface without confusing messages

### 2. Admin-Only Feature Buttons

```tsx
// Conditional feature visibility
{this.props.showImpersonateButton && (
  <IconButton
    iconProps={{ iconName: this.state.emulateNonPrivilegedUser ? 'RedEye' : 'View' }}
    title={this.state.emulateNonPrivilegedUser ? "Testing: Non-Privileged User Mode" : "Testing: Normal User Mode"}
    onClick={this.togglePrivilegeEmulation}
    className={styles.navbarButton}
    styles={{
      root: {
        backgroundColor: this.state.emulateNonPrivilegedUser ? '#d13438' : 'transparent',
        color: this.state.emulateNonPrivilegedUser ? 'white' : 'inherit'
      }
    }}
  />
)}
```

**Key Principles:**
- Use webpart properties to control admin feature visibility
- Provide visual feedback for testing modes
- Make admin features obvious (different colors)

### 3. Permission-Aware Validation

```typescript
private validateConfiguration = async (): Promise<void> => {
  const issues: string[] = [];

  // Check required resources - report to ALL users if broken
  const publicListValidation = await this.sharePointService.validateList('Events', false);
  if (!publicListValidation.isValid) {
    issues.push('Events list is not properly configured');
  }

  // Check optional resources - ONLY report to admin users
  if (this.props.isUserAdmin) {
    try {
      const canAccessPrivateEvents = await this.hybridEventsService.canUserAccessPrivateEvents();

      if (canAccessPrivateEvents) {
        // User has access - validate normally
        const privateListValidation = await this.sharePointService.validateList('PrivateEvents', true);

        if (!privateListValidation.isValid) {
          if (!privateListValidation.listExists) {
            issues.push('PrivateEvents list does not exist - private events will not work');
          } else if (privateListValidation.missingFields.length > 0) {
            issues.push(`PrivateEvents list is missing required fields: ${privateListValidation.missingFields.join(', ')}`);
          }
        }
      }
    } catch (error) {
      // Only show PrivateEvents errors to admin users
      issues.push('PrivateEvents list validation failed');
      Logger.error('Error checking PrivateEvents list', error);
    }
  }

  this.setState({
    listConfigurationIssues: issues
  });
};
```

**Key Principles:**
- Required resources → validate for all users
- Optional resources → validate only for admins
- Permission errors for optional resources → don't show to non-admins
- Log all errors for debugging

## Graceful Degradation

### 1. "Unavailable" Placeholders for Restricted Content

```typescript
// HybridEventsService.ts
public async getAllEvents(emulateNonPrivilegedUser: boolean = false): Promise<ICalendarEvent[]> {
  // Get public events (everyone can access)
  const publicEvents = await this.publicEventsService.getEvents();

  // Check if user can access private events
  const canAccessPrivateEvents = emulateNonPrivilegedUser
    ? false
    : await this.canUserAccessPrivateEvents();

  if (!canAccessPrivateEvents) {
    // User doesn't have access - return public events with "Unavailable" placeholders
    return this.createUnavailablePlaceholders(publicEvents);
  }

  // User has access - merge public and private events
  const privateEvents = await this.privateEventsService.getEvents();
  return this.mergeEvents(publicEvents, privateEvents);
}

private createUnavailablePlaceholders(publicEvents: ICalendarEvent[]): ICalendarEvent[] {
  return publicEvents.map(event => {
    if (event.hasPrivateDetails) {
      // Replace private details with "Unavailable" placeholder
      return {
        ...event,
        title: 'Unavailable',
        description: 'You do not have permission to view this event',
        location: '',
        // Keep color from BigCalConfig so it displays correctly
        color: event.color
      };
    }
    return event;
  });
}
```

**Key Principles:**
- Don't throw errors for permission restrictions
- Provide meaningful placeholders
- Preserve visual elements (colors) for consistency
- Make it clear why content is unavailable

### 2. Feature Availability Flags

```typescript
interface IComponentState {
  // Feature availability based on permissions
  colorMappingsAvailable: boolean;
  publicEventsListAvailable: boolean;
  privateEventsListAvailable: boolean;

  // Configuration issues (admin-only)
  listConfigurationIssues: string[];
}

// Check feature availability
private checkFeatureAvailability = async (): Promise<void> => {
  let colorMappingsAvailable = false;
  let publicEventsListAvailable = false;
  let privateEventsListAvailable = false;
  const issues: string[] = [];

  // Check public events (required for all users)
  try {
    const publicValidation = await this.sharePointService.validateList('Events', false);
    publicEventsListAvailable = publicValidation.isValid;

    if (!publicEventsListAvailable) {
      issues.push('Events list is not properly configured');
    }
  } catch (error) {
    issues.push('Failed to validate Events list');
  }

  // Check private events (optional, permission-based)
  try {
    const canAccessPrivateEvents = await this.hybridEventsService.canUserAccessPrivateEvents();

    if (canAccessPrivateEvents) {
      const privateValidation = await this.sharePointService.validateList('PrivateEvents', true);
      privateEventsListAvailable = privateValidation.isValid;

      // Only report issues to admins
      if (!privateEventsListAvailable && this.props.isUserAdmin) {
        issues.push('PrivateEvents list is not properly configured');
      }
    } else {
      // User doesn't have access - this is normal, not an error
      privateEventsListAvailable = false;
      Logger.debug('User does not have access to PrivateEvents - this is normal for regular users');
    }
  } catch (error) {
    privateEventsListAvailable = false;
    if (this.props.isUserAdmin) {
      issues.push('PrivateEvents list validation failed');
    }
  }

  this.setState({
    colorMappingsAvailable,
    publicEventsListAvailable,
    privateEventsListAvailable,
    listConfigurationIssues: issues
  });
};
```

**Key Principles:**
- Track feature availability separately from errors
- Distinguish between "not available" and "error"
- Log normal permission restrictions (not errors)
- Only report configuration issues to admins

### 3. Conditional Feature Rendering

```tsx
// Render features based on availability
{this.state.privateEventsListAvailable && (
  <PrimaryButton
    text="Manage Private Events"
    onClick={this.openPrivateEventsManager}
    iconProps={{ iconName: 'Lock' }}
  />
)}

{!this.state.privateEventsListAvailable && this.props.isUserAdmin && (
  <MessageBar messageBarType={MessageBarType.info}>
    Private events feature is not available.
    <DefaultButton
      text="Set Up Private Events"
      onClick={this.createPrivateEventsList}
    />
  </MessageBar>
)}
```

**Key Principles:**
- Show features only when available
- Provide setup guidance to admins
- Don't show setup messages to non-admins

## Testing and Emulation

### 1. Privilege Emulation for Testing

```typescript
interface IComponentState {
  // Testing flag to emulate non-privileged user
  emulateNonPrivilegedUser: boolean;
}

private togglePrivilegeEmulation = (): void => {
  this.setState(
    prevState => ({ emulateNonPrivilegedUser: !prevState.emulateNonPrivilegedUser }),
    () => {
      // Reload events with new permission context
      this.loadEvents();
    }
  );
};

// Use emulation flag in service calls
private loadEvents = async (): Promise<void> => {
  const calendarEvents = await this.hybridEventsService.getAllEvents(
    this.state.emulateNonPrivilegedUser
  );

  this.setState({ events: calendarEvents });
};
```

**Key Principles:**
- Provide testing mode for admins
- Make testing mode visually obvious
- Allow toggling without reloading page
- Test both admin and non-admin experiences

### 2. Visual Feedback for Testing Mode

```tsx
{this.props.showImpersonateButton && (
  <IconButton
    iconProps={{
      iconName: this.state.emulateNonPrivilegedUser ? 'RedEye' : 'View'
    }}
    title={
      this.state.emulateNonPrivilegedUser
        ? "Testing: Non-Privileged User Mode"
        : "Testing: Normal User Mode"
    }
    onClick={this.togglePrivilegeEmulation}
    styles={{
      root: {
        backgroundColor: this.state.emulateNonPrivilegedUser ? '#d13438' : 'transparent',
        color: this.state.emulateNonPrivilegedUser ? 'white' : 'inherit'
      }
    }}
  />
)}
```

**Key Principles:**
- Use distinct colors for testing mode (red = restricted)
- Clear icon changes (RedEye vs View)
- Descriptive tooltips
- Only show to admins via webpart property

## Error Handling by Permission Level

### 1. Admin Users - Detailed Errors

```typescript
if (this.props.isUserAdmin) {
  this.setState({
    error: `Failed to load events: ${error.message}. Check SharePoint list permissions and field configuration.`,
    errorDetails: {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    }
  });
}
```

### 2. General Users - User-Friendly Errors

```typescript
if (!this.props.isUserAdmin) {
  this.setState({
    error: 'Unable to load events. Please contact your administrator if this problem persists.'
  });
}
```

### 3. Combined Approach

```typescript
private handleError = (error: Error, context: string): void => {
  Logger.error(`Error in ${context}`, error);

  if (this.props.isUserAdmin) {
    // Admin users get detailed error with technical info
    this.setState({
      error: `${context} failed: ${error.message}`,
      errorDetails: error
    });
  } else {
    // General users get friendly message
    this.setState({
      error: `Unable to complete ${context}. Please contact your administrator if this problem persists.`
    });
  }
};
```

**Key Principles:**
- Always log errors (for debugging)
- Show technical details only to admins
- Provide actionable guidance to admins
- Keep general user messages simple and friendly
- Never expose sensitive error details to non-admins

## Best Practices

### 1. Permission Checking

**Always:**
- Check permissions at webpart level (before rendering)
- Use list-specific permissions (not page permissions)
- Cache permission check results
- Fail closed (assume no permissions on error)
- Log permission checks for debugging
- Use try-catch for permission checks (don't throw)

**Avoid:**
- Checking permissions on every render
- Using page edit permissions for feature access
- Throwing errors for permission failures
- Assuming permissions without checking
- Silent permission failures
- Checking permissions in render methods

### 2. Admin-Only Messages

**Always:**
- Show configuration warnings only to admins
- Provide actionable guidance ("Open Settings")
- Include specific details (missing fields, etc.)
- Use warning MessageBar (not error)
- Make messages dismissible
- Explain why the issue matters

**Avoid:**
- Showing config messages to non-admins
- Generic "something is wrong" messages
- Error MessageBar for configuration issues
- Permanent, non-dismissible warnings
- Technical jargon without context
- Messages without solutions

### 3. Graceful Degradation

**Always:**
- Provide "Unavailable" placeholders for restricted content
- Preserve visual consistency (colors, layout)
- Log permission restrictions (not errors)
- Track feature availability separately from errors
- Distinguish "not available" from "error"
- Make unavailability clear to users

**Avoid:**
- Throwing errors for permission restrictions
- Breaking layout when content unavailable
- Treating permission restrictions as errors
- Confusing "no permission" with "broken"
- Silent feature removal
- Inconsistent visual treatment

### 4. Error Handling

**Always:**
- Log all errors for debugging
- Show detailed errors to admins
- Show friendly errors to general users
- Provide context with errors
- Suggest next steps
- Include timestamps in error logs

**Avoid:**
- Exposing technical details to non-admins
- Generic "error occurred" messages
- Errors without context
- Errors without suggested actions
- Silent failures
- Stack traces in user-facing messages

### 5. Testing

**Always:**
- Provide emulation mode for admins
- Make testing mode visually obvious
- Test both admin and non-admin experiences
- Use webpart properties to control testing features
- Allow toggling without page reload
- Document testing procedures

**Avoid:**
- Testing only as admin
- Invisible testing modes
- Requiring page reload to test
- Leaving testing features visible to all users
- Undocumented testing procedures
- Production testing without safeguards

## Common Pitfalls and Solutions

### Pitfall 1: Configuration Spam for Non-Admins

**Problem:** Non-admin users see warnings about missing lists they can't create

**Solution:**
```typescript
// WRONG - Shows to all users
{this.state.listConfigurationIssues.length > 0 && (
  <MessageBar messageBarType={MessageBarType.warning}>
    Configuration issues found!
  </MessageBar>
)}

// RIGHT - Shows only to admins
{this.state.listConfigurationIssues.length > 0 && this.props.isUserAdmin && (
  <MessageBar messageBarType={MessageBarType.warning}>
    Configuration issues found! Open settings to fix.
  </MessageBar>
)}
```

### Pitfall 2: Permission Errors Breaking UI

**Problem:** Permission check throws error and breaks component

**Solution:**
```typescript
// WRONG - Throws error
public async checkPermissions(): Promise<boolean> {
  const result = await this.sp.web.lists.getByTitle('PrivateEvents').items();
  return true;
}

// RIGHT - Catches error, returns boolean
public async checkPermissions(): Promise<boolean> {
  try {
    await this.sp.web.lists.getByTitle('PrivateEvents').items.top(1)();
    return true;
  } catch {
    return false; // Expected for non-privileged users
  }
}
```

### Pitfall 3: Treating Permission Restrictions as Errors

**Problem:** Logging permission restrictions as errors, filling logs with noise

**Solution:**
```typescript
// WRONG - Logs as error
try {
  await this.loadPrivateEvents();
} catch (error) {
  Logger.error('Failed to load private events', error);
}

// RIGHT - Logs as debug
const canAccess = await this.canAccessPrivateEvents();
if (!canAccess) {
  Logger.debug('User does not have access to private events - this is normal');
  return this.getPublicEventsOnly();
}
```

### Pitfall 4: Inconsistent Permission Checks

**Problem:** Checking permissions in some places but not others

**Solution:**
```typescript
// Create centralized permission service
export class PermissionService {
  private permissionCache: Map<string, boolean> = new Map();

  public async checkFeatureAccess(feature: string): Promise<boolean> {
    if (this.permissionCache.has(feature)) {
      return this.permissionCache.get(feature)!;
    }

    const hasAccess = await this.checkPermissionForFeature(feature);
    this.permissionCache.set(feature, hasAccess);
    return hasAccess;
  }
}
```

### Pitfall 5: No Visual Feedback for Restricted Content

**Problem:** Content just disappears with no explanation

**Solution:**
```typescript
// WRONG - Silent removal
{this.state.privateEventsAvailable && (
  <PrivateEventsPanel />
)}

// RIGHT - Clear feedback
{this.state.privateEventsAvailable ? (
  <PrivateEventsPanel />
) : (
  <div className={styles.unavailablePanel}>
    <Icon iconName="Lock" />
    <Text>Private events are not available to you</Text>
  </div>
)}
```

## Implementation Checklist

### WebPart Setup
- [ ] Create `_checkUserPermissions()` method in webpart
- [ ] Call permission check in `render()` before creating element
- [ ] Pass `isUserAdmin` flag to component props
- [ ] Add `isUserAdmin` to props interface
- [ ] Handle permission check errors gracefully

### Service Layer
- [ ] Implement `checkUserIsListAdmin()` in SharePointService
- [ ] Implement feature-specific permission checks
- [ ] Cache permission check results
- [ ] Use try-catch for all permission checks
- [ ] Return boolean (not throw errors)
- [ ] Log permission check results

### Component Layer
- [ ] Add `isUserAdmin` to props interface
- [ ] Create state for feature availability flags
- [ ] Implement `validateConfiguration()` method
- [ ] Check required resources for all users
- [ ] Check optional resources only for admins
- [ ] Track configuration issues separately

### Conditional Rendering
- [ ] Show errors to all users
- [ ] Show configuration warnings only to admins
- [ ] Render features based on availability
- [ ] Provide "Unavailable" placeholders
- [ ] Show setup guidance to admins only
- [ ] Hide admin features from non-admins

### Error Handling
- [ ] Log all errors for debugging
- [ ] Show detailed errors to admins
- [ ] Show friendly errors to general users
- [ ] Provide context and next steps
- [ ] Never expose sensitive details to non-admins

### Testing
- [ ] Add emulation mode for testing
- [ ] Make testing mode visually obvious
- [ ] Control testing features via webpart properties
- [ ] Test as admin user
- [ ] Test as general user
- [ ] Test with missing permissions
- [ ] Test with missing resources

## Testing Scenarios

### Scenario 1: Admin User with Full Permissions
1. Log in as site admin
2. Open webpart
3. Verify all features visible
4. Create configuration issue (delete a field)
5. Verify warning message appears
6. Verify warning includes specific details
7. Verify "Open Settings" button works
8. Fix configuration issue
9. Verify warning disappears

### Scenario 2: General User with Standard Permissions
1. Log in as general user (no admin rights)
2. Open webpart
3. Verify no configuration warnings
4. Verify available features work
5. Verify restricted features show "Unavailable"
6. Create error condition (disconnect network)
7. Verify friendly error message (not technical details)
8. Verify no "Open Settings" button

### Scenario 3: User Without Private Events Access
1. Log in as user without PrivateEvents permissions
2. Open webpart
3. Verify public events load normally
4. Verify private event details show "Unavailable"
5. Verify colors display correctly
6. Verify no error messages
7. Verify clean, professional interface

### Scenario 4: Admin Testing Non-Admin Experience
1. Log in as admin
2. Open webpart
3. Enable "Impersonate" mode
4. Verify button turns red
5. Verify private events become "Unavailable"
6. Verify configuration warnings still visible (you're still admin)
7. Disable "Impersonate" mode
8. Verify private events load normally

### Scenario 5: Permission Check Failure
1. Remove user's access to Events list
2. Open webpart
3. Verify error message appears
4. Verify error is user-friendly (if general user)
5. Verify error includes details (if admin user)
6. Restore permissions
7. Refresh page
8. Verify webpart loads normally

## Real-World Examples

### Example 1: BigCal Private Events

**Use Case:** Some users can see private event details, others see "Unavailable"

**Implementation:**
```typescript
// Check permission once at startup
const canAccessPrivateEvents = await this.canUserAccessPrivateEvents();

// Use permission flag to determine data access
if (canAccessPrivateEvents) {
  // Load full event details
  const privateEvents = await this.privateEventsService.getEvents();
  return this.mergeEvents(publicEvents, privateEvents);
} else {
  // Return placeholders for private content
  return publicEvents.map(event =>
    event.hasPrivateDetails
      ? { ...event, title: 'Unavailable', description: '' }
      : event
  );
}
```

### Example 2: Configuration Validation

**Use Case:** Validate SharePoint lists, show issues only to admins

**Implementation:**
```typescript
// Validate required resources (all users)
const publicValidation = await this.sharePointService.validateList('Events');
if (!publicValidation.isValid) {
  issues.push('Events list is not properly configured');
}

// Validate optional resources (admins only)
if (this.props.isUserAdmin) {
  const privateValidation = await this.sharePointService.validateList('PrivateEvents');
  if (!privateValidation.isValid) {
    issues.push('PrivateEvents list is not properly configured');
  }
}

// Display issues (admins only)
{issues.length > 0 && this.props.isUserAdmin && (
  <MessageBar messageBarType={MessageBarType.warning}>
    {issues.map(issue => <li>{issue}</li>)}
  </MessageBar>
)}
```

### Example 3: Feature Availability

**Use Case:** Show feature only if user has permissions

**Implementation:**
```typescript
// Check feature availability
const canManageColors = await this.checkColorManagementPermissions();

this.setState({ canManageColors });

// Render feature conditionally
{this.state.canManageColors && (
  <PrimaryButton
    text="Manage Colors"
    onClick={this.openColorPaletteStudio}
  />
)}

{!this.state.canManageColors && this.props.isUserAdmin && (
  <MessageBar messageBarType={MessageBarType.info}>
    Color management requires admin permissions.
  </MessageBar>
)}
```

## Performance Considerations

### Cache Permission Checks

```typescript
export class PermissionService {
  private permissionCache: Map<string, boolean> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  public async checkPermission(resource: string): Promise<boolean> {
    // Check cache
    const cached = this.permissionCache.get(resource);
    const expiry = this.cacheExpiry.get(resource);

    if (cached !== undefined && expiry && Date.now() < expiry) {
      return cached;
    }

    // Check permission
    const hasPermission = await this.performPermissionCheck(resource);

    // Cache result
    this.permissionCache.set(resource, hasPermission);
    this.cacheExpiry.set(resource, Date.now() + this.CACHE_DURATION);

    return hasPermission;
  }
}
```

### Batch Permission Checks

```typescript
public async checkMultiplePermissions(resources: string[]): Promise<Map<string, boolean>> {
  const results = new Map<string, boolean>();

  // Check all permissions in parallel
  const checks = resources.map(async resource => {
    const hasPermission = await this.checkPermission(resource);
    results.set(resource, hasPermission);
  });

  await Promise.all(checks);
  return results;
}
```

## Related Patterns

- [WebPart Initialization/Installation Pattern](webpart-initialization-installation-pattern.md) - For resource validation
- [Modal Studio Pattern](modal-studio-pattern.md) - For admin configuration UIs
- [DataSheet View Pattern](datasheet-view-pattern.md) - For permission-aware data editing

## Summary

The **Permission-Based UI Pattern** provides a professional, secure approach to handling different user permission levels:

**Key Principles:**
1. **Check Early** - Determine permissions at webpart level
2. **Fail Closed** - Assume no permissions on error
3. **Admin-Only Messages** - Show config warnings only to admins
4. **Graceful Degradation** - Provide "Unavailable" placeholders
5. **Clear Feedback** - Make permission restrictions obvious
6. **Cache Results** - Don't check permissions repeatedly

**The Secret Sauce:**
- Check list admin rights (not page permissions)
- Pass `isUserAdmin` flag through component tree
- Conditional rendering: `{condition && this.props.isUserAdmin && <Component />}`
- Try-catch permission checks (return boolean, don't throw)
- Log restrictions as debug (not errors)
- Provide testing/emulation mode for admins

**Benefits:**
- **Users** get appropriate experience for their permission level
- **Admins** get actionable configuration guidance
- **Developers** get reusable, testable permission pattern
- **Organizations** get secure, professional applications

This pattern has been proven in production with BigCal's private events feature, configuration validation, and admin-only features. Use it to create applications that gracefully handle different permission levels while maintaining a professional experience for all users. 🔐

---

**Document Version:** 1.0
**Last Updated:** 2024-11-23
**Pattern Status:** Production-Proven ✅

