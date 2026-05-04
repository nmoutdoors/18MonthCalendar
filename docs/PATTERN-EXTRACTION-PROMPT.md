# Pattern Extraction Prompt Template

**Edit the first line below to describe what you need, then share this entire prompt:**

---

**I need to extract a pattern for:** [DESCRIBE YOUR PATTERN HERE - e.g., "managing SharePoint Choice field options via a wizard interface"]

---

## Instructions for AI Assistant

I am working in a production SPFx project that contains a `unityfx/` junction to the canonical UnityFX pattern library.

- Use the **current repo** as the **source implementation** to study.
- Use the **`unityfx/` junction** as the **documentation target** for any pattern work.
- **Do not modify source project code under any circumstances.** The source project is in production and is **read-only** for pattern extraction work.
- This request means I have already decided the implementation is ready to be captured as a pattern.

**Your task:**
1. Review the existing UnityFX pattern library structure
2. Extract the implementation pattern from the source project
3. Create a **self-contained pattern document** following UnityFX conventions

## Required execution rules

### 1. Read these first
- `unityfx/docs/UnityFX-Standing-Orders.md` - Complete guidelines for UnityFX work
- `unityfx/docs/PatternLibrary.md` - Pattern library index and structure
- `unityfx/unityfx-manifest.json` - Machine-readable pattern index and metadata conventions
- `unityfx/patterns/installers/Installer.FieldChoiceWizard.md` - Example of a well-documented, self-contained pattern
- `unityfx/patterns/ui-components/UiComponent.VisTimelineIntegration.md` - Example of a comprehensive pattern

### 2. Source project is read-only
- **Never change implementation code in the source project**
- Do not refactor, fix, clean up, or “improve” source files while extracting the pattern
- Only read the source implementation and capture it for later reuse in UnityFX

### 3. Check for existing UnityFX overlap before writing
Before creating or updating any UnityFX pattern files:
- Search the UnityFX library for existing patterns that overlap with the requested pattern
- Review the closest matching pattern(s)
- If an existing pattern appears related, overlapping, incomplete, or potentially redundant:
  - **Pause**
  - Summarize the overlap
  - Present COA options
  - **Do not create or update pattern files until I approve the COA**

### 4. Use the canonical filename convention
When creating a new UnityFX pattern file, always use this filename format:

- `unityfx/patterns/[category]/[Category].[PatternName].md`

Examples:
- `unityfx/patterns/installers/Installer.FieldChoiceWizard.md`
- `unityfx/patterns/studios/Studio.LegendStudio.md`
- `unityfx/patterns/data/Data.SharePointAttachments.md`

Use this naming convention even if older UnityFX patterns do not yet follow it.

## UnityFX Pattern Structure

Each pattern document should include:
- **Summary** - What the pattern does and why it exists
- **When to Use** - Clear use cases and anti-patterns
- **Problem Statement** - Real-world scenario this solves
- **Solution Architecture** - High-level flow and components
- **Implementation Details** - Complete code examples (TypeScript, interfaces, etc.)
- **Integration** - How to wire it into a WebPart or component
- **Best Practices** - Do's and don'ts
- **Common Gotchas** - Known issues and fixes from production
- **Testing Checklist** - How to verify the implementation
- **Related Patterns** - Links to complementary patterns

## Critical Requirements

✅ **Self-Contained** - All code must be inline in the markdown (no external file references)  
✅ **Complete Examples** - Provide full TypeScript implementations, not just snippets  
✅ **Production-Tested** - Include lessons learned, bugs fixed, edge cases  
✅ **Copy-Paste Ready** - Developers should be able to implement from the doc alone  
✅ **Proper Metadata** - Pattern ID, category, status, tags at the top  
✅ **No Source Code Changes** - The source project must remain untouched  
✅ **Discuss COA First If Overlap Exists** - Do not silently update or duplicate patterns

## Pattern Categories
- `core` - Architecture, logging, security, performance
- `installers` - List provisioning, field management, setup wizards
- `data` - Services, repositories, SharePoint integration
- `ui-shell` - Layouts, navigation, fullscreen, themes
- `ui-components` - Reusable UI elements
- `dashboards` - Card grids, filters, loading states
- `forms` - Modals, editors, validation
- `print` - Export, printing, document generation
- `studios` - Admin tools, bulk editors
- `experimental` - New/unproven patterns

## Deliverables

1. **Pattern Document** - `unityfx/patterns/[category]/[Category].[PatternName].md`
2. **Suggest Pattern ID** - e.g., `installer.field-choice-wizard`
3. **Suggest Manifest Entry** - JSON entry for `unityfx/unityfx-manifest.json`
4. **Update Library Index** - `unityfx/docs/PatternLibrary.md`

## Required first response

Before doing substantive work, respond with:
1. The likely source files you will inspect
2. The existing UnityFX pattern(s) you will compare against
3. The proposed new pattern path using the canonical naming convention
4. A note that source code will remain unchanged
5. A statement that you will pause for COA discussion if overlap with an existing pattern is found

## Example Output Structure

```markdown
# [Pattern Name] Pattern

**Pattern ID:** `category.pattern-name`
**Category:** [category]
**Status:** stable | draft | experimental
**Tags:** [comma-separated tags]

> **✅ Self-Contained Pattern**: [Brief description of completeness]

---

## Summary
[What it does, complexity, time savings, production status]

## When to Use This Pattern
[Use cases and anti-patterns]

## Problem Statement
[Real-world scenario]

## Solution Architecture
[High-level flow with diagrams/code blocks]

## Implementation Details
[Complete code with sections for each component]

## Integration
[How to wire into WebPart]

## Best Practices
[Do's and don'ts]

## Common Gotchas
[Production lessons learned]

## Testing Checklist
[Verification steps]

## Related Patterns
[Links to other patterns]
```

## Before You Start

1. Search the source project for the implementation
2. Review `unityfx/docs/PatternLibrary.md` to ensure the pattern is not already captured
3. Review `unityfx/unityfx-manifest.json` for existing IDs, naming, and metadata conventions
4. Read 2-3 existing UnityFX patterns to understand the documentation style
5. If overlap exists with an existing pattern, pause and discuss COA with me before making pattern-library changes

## After You Finish

1. Add or propose the entry for `unityfx/unityfx-manifest.json`
2. Update `unityfx/docs/PatternLibrary.md` with the new pattern reference
3. Verify all code in the new pattern doc is self-contained
4. Summarize:
   - source files analyzed
   - UnityFX files created or updated
   - any overlap findings discussed with me
