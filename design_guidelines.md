# EcoRide Fleet Control Panel - Design Guidelines

## Design Approach
**System:** Material Design for Admin Panels with influences from Linear and Notion for data-dense interfaces
**Rationale:** Operational dashboard prioritizing data clarity, efficient workflows, and real-time monitoring for fleet managers and maintenance technicians

## Typography System

**Font Family:** 
- Primary: Inter (via Google Fonts CDN)
- Monospace: JetBrains Mono (for IDs, battery percentages, coordinates)

**Hierarchy:**
- Page Titles: text-3xl font-bold
- Section Headers: text-xl font-semibold
- Card Titles: text-lg font-medium
- Table Headers: text-sm font-semibold uppercase tracking-wide
- Body Text: text-base font-normal
- Metadata/Labels: text-sm
- Captions/Status: text-xs font-medium

## Layout System

**Spacing Primitives:** Tailwind units of 2, 4, 6, 8, 12, 16
- Component padding: p-4, p-6
- Section margins: mb-8, mt-12
- Grid gaps: gap-4, gap-6
- Table cell padding: px-4 py-3

**Container Strategy:**
- Full-width dashboard with fixed sidebar (w-64)
- Main content: max-w-7xl mx-auto px-6 py-8
- Cards and panels: rounded-lg with consistent padding p-6

## Component Library

### Navigation
**Fixed Sidebar (w-64):**
- Logo/branding at top (h-16)
- Navigation sections with icon + label
- Active state indicators (border-l-4)
- Icons: Heroicons (outline style)

**Top Bar:**
- Full-width with shadow-sm
- Right-aligned: real-time status indicator, notification bell, user profile dropdown
- Height: h-16

### Dashboard Metrics Cards
**Stats Overview (Grid: grid-cols-1 md:grid-cols-4 gap-6):**
- Total Scooters Available
- Low Battery Count (<20%)
- Active Trips
- Maintenance Required

Each card structure:
- Icon container (h-12 w-12 rounded-lg)
- Large number (text-3xl font-bold)
- Label (text-sm)
- Trend indicator if applicable

### Data Tables
**Scooter List Table:**
- Sticky header (sticky top-0)
- Zebra striping for rows
- Columns: ID (monospace) | Status Badge | Battery Level (progress bar) | Location | Last Updated | Actions
- Compact row height (h-14)
- Hover state for rows

**Status Badges:**
- Pill-shaped (rounded-full px-3 py-1)
- "Livre" (Available)
- "Ocupado" (In Use) 
- "Manutenção" (Maintenance)
- Icon + text combination

**Battery Level Display:**
- Horizontal progress bar (h-2 rounded-full)
- Percentage text (monospace)
- Visual warning states (<20%, 20-50%, >50%)

### Forms & Modals
**Scooter Registration Form:**
- Two-column layout on desktop (grid-cols-2 gap-6)
- Input groups with labels (text-sm font-medium mb-2)
- Input fields: h-10 rounded-md with focus rings
- Select dropdowns for status
- Number inputs for battery level
- Action buttons: primary (full) + secondary (outline)

**Action Modals:**
- Centered overlay with backdrop blur
- Modal width: max-w-lg
- Header with title + close button
- Content area with form or confirmation
- Footer with action buttons (justify-end)

### Filters & Controls
**Filter Bar (above table):**
- Flex row with gap-4
- Search input (w-64) with magnifying glass icon
- Status filter dropdown
- Battery level filter slider
- "Reset Filters" link

### Trip Details View
**Trip Card Layout:**
- Two-column grid showing:
  - Scooter ID & Details
  - User Information
  - Start/End Times (with duration calculation)
  - Distance Traveled
  - Route Map placeholder (if applicable)

### Real-time Indicators
**Live Status Indicator:**
- Pulsing dot animation (animate-pulse)
- "Live" label with timestamp
- Positioned in top bar

## Icons
**Library:** Heroicons via CDN (outline weight for navigation, solid for status indicators)
- Navigation: HomeIcon, ClipboardListIcon, CogIcon
- Status: CheckCircleIcon, ExclamationCircleIcon, WrenchIcon
- Actions: PencilIcon, TrashIcon, EyeIcon
- Battery: BoltIcon
- Location: LocationMarkerIcon

## Responsive Behavior
**Breakpoints:**
- Mobile (base): Single column, hamburger menu, collapsible sidebar
- Tablet (md): Two-column metrics, visible sidebar
- Desktop (lg+): Full multi-column layout

**Mobile Adaptations:**
- Convert table to card list view
- Stack form columns vertically
- Bottom navigation for key actions

## Accessibility
- Proper form labels with for attributes
- ARIA labels for icon-only buttons
- Focus visible states on all interactive elements
- High contrast between text and backgrounds
- Keyboard navigation support throughout

## Images
**Hero/Dashboard Header:** No large hero image needed - this is an operational dashboard prioritizing immediate data access over visual appeal. Replace traditional hero with live metrics overview.

---

**Key Principle:** Prioritize information density, scanability, and rapid task completion for fleet managers monitoring operations in real-time.