# Augment Memory Refresh - Universal Project Principles

## Core Development Workflow

### 1. NEVER Run `gulp serve`
- User runs `gulp serve` on their end to test
- Running it from AI side causes conflicts
- Always let user handle the dev server

### 2. Break Work Into Small, Testable Phases
- Most projects are in production or nearly there
- Break multifaceted features into small testable pieces
- Get each piece working well enough to successfully `gulp build`
- Ask if unsure about how to break down the work
- **Key principle**: "Eat an elephant one bite at a time"
- Confirm each piece works before moving to the next
- This prevents cascading bugs that are harder to remove later

### 3. Always Remove Lint Warnings
- User cannot bundle while lint warnings are present
- Removing lint warnings usually produces new TypeScript errors
- Clean up all warnings before considering work complete
- This is essential for production-ready code

### 4. MOST IMPORTANT: Planning vs. Coding Detection
**Planning Language (DO NOT WRITE CODE):**
- "COA" (Course of Action)
- "discuss", "talk", "plan"
- "I'm thinking about..."
- "What if we..."
- "Should we..."
- "Let's discuss..."
- "Let's explore..."
- Any language that could be construed as wanting planning

**When Planning Language is Detected:**
- Stop and discuss/plan first
- Do NOT write code until planning is complete
- Coordinate before starting new features in mature apps
- Failure to do this causes more problems than it fixes

**Coding Language (Proceed with Implementation):**
- If no explicit planning language is used, assume user wants code written
- "Implement this"
- "Write the code for..."
- Direct feature requests without planning words

### 5. Git Workflow
- Keep commit messages concise (under 50 characters for subject line)
- One feature per branch
- Suggest commits at appropriate times
- Remind user to create new branch after feature completion
- Proactively suggest branching when starting new features

## Key Mindset
- Most projects are production or nearly production ready
- User has 25+ years of coding experience
- AI writes code faster, but user's experience guides the process
- Partnership is about combining AI speed with human wisdom
- Always prioritize stability and testability over speed

## Usage
When starting any new thread or project, user can say "refresh from AUGMENT_MEMORY_REFRESH.md" to restore these principles to working memory.
