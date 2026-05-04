All implementation plans should use this structure.

The most important part of every stage is the visual acceptance test. Stages must be shaped around what a human can actually open, click, inspect, and confirm in the product at that point in the plan.

Each stage must include:

### Stage <ID>: <Name>

**Goal:**  
Clear, outcome-based description

**Visual Acceptance Test:**  
- [ ] Starting state / setup
- [ ] User action
- [ ] Expected visible result
- [ ] Important failure case or edge case if relevant

**Status:**  
Not Started / In Progress / Complete

**Tasks:**
- [ ] Granular, single-step tasks
- [ ] Include file-level detail (exact file paths)
- [ ] Avoid grouping multiple actions into one checkbox

**Files Modified:**
- Explicit list of files touched

**Implementation Notes:**
- Constraints
- Non-obvious decisions
- Deferred work

---

## Rules:
- This is an execution checklist, not a summary.
- Prefer over-explaining to under-explaining.
- Each checkbox must represent a meaningful, testable step.
- The next step should always be obvious.
- The visual acceptance test is the primary completion gate for the stage.
- A stage is not complete until its visual acceptance test is executable in the product, not merely described in the document.
- A stage is invalid if its visual acceptance test can only be performed after a later stage is implemented.
- If a stage needs UI verification, include whatever wiring is necessary in that same stage so a human can trigger and inspect the behavior.
- Do not stop at isolated components or helper methods when the stated visual acceptance test requires an entry point such as a button, menu action, route, dialog, or rendered state.
- If the work is only internally testable, either add a temporary/real entry point in the same stage or merge the work into a later stage where the behavior becomes visibly testable.
- Use exact repository file paths in tasks and file lists.

## What does NOT count as a visual acceptance test:
- Re-reading the plan
- Inspecting code without exercising the product
- Confirming a helper, type, or service exists
- Checking logs alone
- Verifying internal state with no visible user-facing effect
- Describing behavior that will only become testable after a later stage

## Stage design guidance:
- Prefer stages that end in a real user-triggerable slice: a property-pane action, dialog, button, route, preview, rendered legend, or other visible behavior.
- When a feature has service/model work and UI work, bundle them so the stage ends with a testable surface instead of a hidden implementation milestone.
- If visual tests are the most important part of the feature, they should appear before Tasks in the stage and should drive the task breakdown.