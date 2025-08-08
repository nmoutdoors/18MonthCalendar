# TypeScript Best Practices for SPFx Projects

## 🚫 Avoid `any` Type - Common Solutions

### ❌ **Don't Do This:**
```typescript
} catch (error: any) {
  console.log(error.message);
}

const data: any = response.json();
const items: any[] = sharePointData;
```

### ✅ **Do This Instead:**

#### 1. **Error Handling**
```typescript
} catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
  console.log(errorMessage);
}
```

#### 2. **API Responses**
```typescript
interface IApiResponse {
  value: ISharePointItem[];
  hasMore: boolean;
}

const data: IApiResponse = await response.json();
```

#### 3. **SharePoint Data**
```typescript
interface ISharePointItem {
  Id: number;
  Title: string;
  Created: string;
}

const items: ISharePointItem[] = sharePointData;
```

#### 4. **Event Handlers**
```typescript
// Instead of: (event: any) => void
const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
  // Handle click
};

const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
  // Handle change
};
```

#### 5. **Dynamic Properties**
```typescript
// Instead of: any
type DynamicObject = Record<string, unknown>;
// Or be more specific:
type UserPreferences = Record<string, string | number | boolean>;
```

#### 6. **Union Types for Multiple Possibilities**
```typescript
// Instead of: any
type ApiResult = ISuccessResponse | IErrorResponse | null;
type InputValue = string | number | undefined;
```

## 🔧 **Quick Reference**

| Instead of `any` | Use This |
|------------------|----------|
| `error: any` | `error: unknown` |
| `data: any` | Create interface or use `unknown` |
| `items: any[]` | `items: ISpecificType[]` |
| `props: any` | `props: IComponentProps` |
| `event: any` | `event: React.MouseEvent` etc. |
| `obj: any` | `obj: Record<string, unknown>` |

## 💡 **Pro Tips**

1. **Use TypeScript's built-in utility types:**
   - `Partial<T>` - Makes all properties optional
   - `Pick<T, K>` - Pick specific properties
   - `Omit<T, K>` - Omit specific properties

2. **Create specific interfaces for SharePoint:**
   ```typescript
   interface ISharePointListItem {
     Id: number;
     Title: string;
     Created: string;
     Modified: string;
     Author: { Title: string };
   }
   ```

3. **Use generic types for reusable components:**
   ```typescript
   interface IGenericListProps<T> {
     items: T[];
     onItemClick: (item: T) => void;
   }
   ```

## 🎯 **Remember**
- `unknown` is safer than `any` - it forces you to check the type
- Always create interfaces for your data structures
- Use union types when you have multiple possible types
- The extra typing effort pays off in fewer runtime errors!
