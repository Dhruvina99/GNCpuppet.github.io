# Design Guidelines: Sunday Attendance Management System

## Design Approach
**System: Material Design 3** - Selected for its robust form components, data display patterns, and excellent mobile responsiveness. This system excels at information-dense applications with clear hierarchy and intuitive interactions.

## Core Design Principles
1. **Clarity First**: Every data point and action must be immediately understandable
2. **Mobile-Optimized**: Primary use case is mobile attendance entry on Sundays
3. **Efficient Data Entry**: Minimize taps/clicks to complete attendance submission
4. **Role-Aware UI**: Clear visual distinction between admin and normal user contexts

---

## Typography System

**Font Family**: Google Fonts - Roboto (primary), Roboto Condensed (data tables)

**Hierarchy**:
- Page Titles: text-3xl font-bold (Admin dashboard gets text-4xl)
- Section Headers: text-xl font-semibold
- Card Titles: text-lg font-medium
- Body Text: text-base font-normal
- Labels: text-sm font-medium uppercase tracking-wide
- Helper Text: text-xs
- Data Tables: text-sm (Roboto Condensed for density)

---

## Layout System

**Spacing Scale**: Tailwind units of **2, 4, 6, 8, 12, 16** (p-2, m-4, gap-6, py-8, etc.)

**Container Strategy**:
- Max-width: max-w-7xl for desktop dashboards
- Max-width: max-w-2xl for forms and single-column content
- Mobile: Full-width (px-4 for breathing room)
- Card padding: p-6 on desktop, p-4 on mobile

**Grid Patterns**:
- Dashboard Stats: grid-cols-1 md:grid-cols-2 lg:grid-cols-4
- Form Layouts: Single column on mobile, 2-column (md:grid-cols-2) for related fields on desktop
- Admin Member List: Single column cards on mobile, grid-cols-1 lg:grid-cols-2 on desktop

---

## Component Library

### Navigation
**Top App Bar** (Mobile & Desktop):
- Fixed position with elevation shadow
- Left: Menu icon (mobile) / Logo + App name
- Center: Page title (mobile only)
- Right: Profile avatar with role badge (subtle indicator for admins)
- Height: h-16

**Side Navigation** (Desktop Admin Only):
- Width: w-64
- Collapsible to icon-only mode (w-16)
- Sections: Dashboard, Attendance, Members, Stories, Reports, Notifications

### Cards & Containers
**Profile Card**:
- Rounded corners (rounded-lg)
- Elevation: shadow-md
- Avatar: Large circular (w-24 h-24) at top or left
- MHT ID displayed prominently below name
- Admin badge: Pill-shaped, positioned top-right

**Attendance Status Card**:
- Large circular progress indicator (120px diameter)
- Percentage in center (text-4xl font-bold)
- Status label below (Very Good/Good/Average/Bad)
- Uses Material Design's circular progress component

**Form Cards**:
- Max-width: max-w-2xl
- Grouped sections with dividers (border-t with mt-6 pt-6)
- Sticky submit button on mobile

### Form Elements
**Input Fields**:
- Filled variant (Material Design style)
- Height: h-12
- Labels: Floating when focused/filled
- Gap between fields: space-y-4
- Full width on mobile, intelligent sizing on desktop

**Select Dropdowns**:
- Native select styled with Material Design treatment
- Multi-select for characters: Chip display of selected items
- Story select triggers character list update

**Date Picker**:
- Calendar overlay interface
- Restrict to "last week and earlier" for normal users
- No future dates allowed

**Time Inputs**:
- Time In / Time Out: Side-by-side on desktop (grid-cols-2)
- 12-hour format with AM/PM selector

**Radio Groups** (Present/Absent/Replaced):
- Large touch targets (min-h-14)
- Card-style radio buttons with icons
- Active state shows expanded form fields below

### Data Display
**Attendance Table** (Admin):
- Responsive table that converts to cards on mobile
- Sortable columns
- Row actions menu (3-dot icon)
- Pagination: 20 items per page
- Sticky header on scroll

**Member List** (Admin):
- Card-based layout
- Quick stats visible (attendance %, last active)
- Tap to expand for edit/delete actions

**Story-Character Matrix**:
- Collapsible sections per story
- Character chips with avatar icons
- Badge count showing how many times each character was played

### Buttons & Actions
**Primary Actions**: 
- Filled buttons (rounded-lg)
- Height: h-12
- Full width on mobile below md breakpoint

**Secondary Actions**:
- Outlined buttons
- Same sizing as primary

**FAB (Floating Action Button)**:
- Bottom-right corner (Mobile only)
- Used for "Mark Attendance" on dashboard
- Size: w-14 h-14, rounded-full

### Status & Feedback
**Status Badges**:
- Pill-shaped (rounded-full)
- Sizes: px-3 py-1 (small), px-4 py-2 (medium)
- Text: text-xs font-semibold uppercase

**Notifications/Polls**:
- Banner style at top of dashboard
- Dismissible with X button
- Action buttons inline
- Stacks vertically if multiple (gap-2)

**Empty States**:
- Centered content with icon (size: w-32 h-32)
- Helpful message and CTA button
- Used for: No attendance records, no notifications, no reports

### Reports & Downloads
**Report Filter Panel**:
- Collapsible sidebar on desktop (w-80)
- Full-screen overlay on mobile
- Apply/Reset buttons sticky at bottom

**Export Buttons**:
- Icon + Text format
- Grouped horizontally: PDF | Excel | Image
- Download initiates immediately, shows toast notification

---

## Page-Specific Layouts

### Login Page
- Centered card (max-w-md)
- Single-column form
- Input fields: Mobile/Email, MHT ID
- Large submit button
- Error messages below form (if validation fails)

### Dashboard (Normal User)
- Profile card at top (full-width)
- Attendance status card (prominent)
- Quick action cards (2x2 grid on desktop)
- Recent attendance list (last 5 entries)
- Notification banner (if active)

### Dashboard (Admin)
- Multi-column layout (sidebar + main content)
- Stats row at top (4 cards: Total Members, This Week's Attendance, Pending Reports, Active Shows)
- Tabbed interface: Overview | Members | Reports | Settings
- Chart visualizations for attendance trends

### Attendance Form
- Wizard-style progression for conditional fields
- Radio selection → Reveal relevant fields with slide-down animation
- Character selection: Modal overlay with searchable list
- Progress indicator if multi-step (Step 1 of 3)

### Admin Member Management
- List view with search/filter bar
- Add Member: Side drawer (w-96) on desktop, full-screen on mobile
- Edit: Same drawer pattern
- Bulk actions: Checkbox selection with action bar

---

## Responsive Breakpoints
- Mobile: base (< 768px)
- Tablet: md (768px - 1024px)
- Desktop: lg (1024px+)

**Mobile-First Approach**: Stack vertically, expand to multi-column on larger screens

---

## Images & Icons

**Icons**: Material Icons (via CDN)
- Consistent 24px size for navigation and inline icons
- 20px for small contexts (chips, badges)
- 48px for empty states and large features

**Images**:
- User Avatars: Circular, 40px (lists), 96px (profile)
- Empty State Illustrations: 256px centered
- Story Thumbnails: 16:9 aspect ratio, used in story selection
- No hero images needed for this application

---

## Animation Guidelines
**Minimal Motion**:
- Form field reveals: 200ms ease-out slide-down
- Modal overlays: 250ms fade-in
- Success/Error notifications: Toast from bottom, 3s auto-dismiss
- No scroll-based animations or decorative motion