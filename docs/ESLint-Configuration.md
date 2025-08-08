# ESLint Configuration for SPFx Projects

## 🔧 **Current Rules**

Your SPFx project already has these TypeScript ESLint rules enabled:

```json
{
  "@typescript-eslint/no-explicit-any": "error",
  "@rushstack/no-new-null": "error"
}
```

## 📋 **Quick Checklist Before Committing**

- [ ] No `any` types used (use `unknown`, interfaces, or union types)
- [ ] No `null` used (use `undefined` instead)
- [ ] All error handling uses `error: unknown`
- [ ] All API responses have proper interfaces
- [ ] All React event handlers have proper types

## 🚨 **Common Violations & Fixes**

### 1. **Error Handling**
```typescript
// ❌ Will cause linting error
} catch (error: any) { }

// ✅ Correct approach
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : 'Unknown error';
}
```

### 2. **Null Usage**
```typescript
// ❌ Will cause linting error
const value: string | null = null;

// ✅ Correct approach  
const value: string | undefined = undefined;
```

## 💡 **IDE Setup**

Make sure your VS Code has these extensions:
- ESLint
- TypeScript and JavaScript Language Features

This will show you the errors in real-time as you type!

## 🎯 **Team Reminder**

**Always run `npm run build` before committing** - it will catch these issues early and save time in code reviews!
