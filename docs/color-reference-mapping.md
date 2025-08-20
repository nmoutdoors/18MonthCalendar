# Color Reference Mapping - Exact Hex Values from Reference Image

## Overview
Updated the `ORIGINAL_COLOR_MAPPINGS` to exactly match the hex values shown in the user's reference image with color codes.

## Status Colors (From Reference Image with Hex Values)
Based on the exact hex codes visible in the reference image:

| Status | Color Name | Hex Code | Visual | Source |
|--------|------------|----------|---------|---------|
| Confirmed Event | Green | `#008050` | 🟢 | Same as FYSA |
| Tentative | Orange | `#ff9900` | 🟠 | ✓ Matches |
| VIP/High Priority | Red | `#ff283c` | 🔴 | Same as DOD CIO |
| Fed/Trng Holiday | Purple | `#7030a0` | 🟣 | Same as Exercises |
| Out of Office | Blue | `#4f81bd` | 🔵 | Out of Office/Leave |
| Away w/RON | Green | `#008050` | 🟢 | Same as FYSA |
| Day Trip - NCR | Orange | `#ff9900` | 🟠 | Same as Tentative |
| Exercise | Purple | `#7030a0` | 🟣 | Exercises |
| FYSA | Green | `#008050` | 🟢 | FYSA hex value |

## Swimlane Colors (From Reference Image with Exact Hex Values)
Based on the exact hex codes visible in the reference image:

| Swimlane | Color Name | Hex Code | Visual | Source |
|----------|------------|----------|---------|---------|
| DISA | Blue | `#4f81bd` | 🔵 | Out of Office/Leave color |
| DCDC | Green | `#008050` | 🟢 | FYSA color |
| Joint DISA & DCDC | Light Purple | `#B39DDB` | 🟣 | Light purple/lavender from reference image |
| Speaking Engagement | Yellow | `#ffff00` | 🟡 | Speaking Event hex |
| DOD CIO / NSA / USCC | Red | `#ff283c` | 🔴 | DOD CIO hex value |
| Mission Partner | Pink/Red | `#ff5050` | 🩷 | Mission Partner hex |
| Transit | Gray | `#7f7f7f` | ⚫ | Standard gray |
| TDY Meetings/Congressional | Blue | `#4f81bd` | 🔵 | Same as Out of Office |
| Exec Time | Gray | `#7f7f7f` | ⚫ | Standard gray |

## Additional Default Colors
For any unmapped options:

| Option | Color Name | Hex Code | Visual |
|--------|------------|----------|---------|
| Not Set (Status) | Gray | `#6c757d` | ⚫ |
| Training Holiday | Gray | `#7f7f7f` | ⚫ |

## Color Palette Breakdown

### Primary Colors Used (Exact Hex Values)
- **Green**: `#008050` (FYSA, Confirmed, DCDC, Away w/RON)
- **Blue**: `#4f81bd` (Out of Office/Leave, DISA, TDY)
- **Light Purple**: `#B39DDB` (Joint DISA & DCDC)
- **Orange**: `#ff9900` (Tentative, Day Trip - NCR)
- **Purple**: `#7030a0` (Exercises, Fed/Trng Holiday)
- **Red**: `#ff283c` (DOD CIO/NSA/USCC, VIP/High Priority)
- **Yellow**: `#ffff00` (Speaking Engagement - bright yellow)
- **Pink/Red**: `#ff5050` (Mission Partner)
- **Gray Variants**: `#7f7f7f` (Transit, Exec Time), `#6c757d` (Not Set)

### Color Distribution
- **Most Common**: Green (4 items) - `#00b050` and `#70ad47`
- **Second Most**: Orange (3 items) - `#ff9900`
- **Third Most**: Gray (3 items) - `#7f7f7f` and `#6c757d`

## Implementation Notes

### Files Updated
- `src/webparts/bigCal/interfaces/IColorMapping.ts`
  - Updated `ORIGINAL_COLOR_MAPPINGS` constant
  - Updated `SPECIFIC_COLOR_MAPPINGS` for consistency

### Restore Functionality
- "Restore Original Colors" button in CPS will apply these exact colors
- Matches the visual appearance from the reference image
- Preserves the original design intent

### Testing
After deployment, verify:
1. CPS shows these exact hex codes
2. Calendar events display with matching colors
3. Restore function applies these colors correctly
4. Both Status and Swimlane tabs show proper colors

## Visual Verification
Compare the CPS display with the reference image:
- Status colors should match the left legend exactly
- Swimlane colors should match the right panel exactly
- Hex codes in CPS should match this document

## Future Updates
If colors need adjustment:
1. Update `ORIGINAL_COLOR_MAPPINGS` in `IColorMapping.ts`
2. Update `SPECIFIC_COLOR_MAPPINGS` for consistency
3. Test restore functionality
4. Update this reference document
