---
name: Quantro AI Style
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#464555'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#777587'
  outline-variant: '#c7c4d8'
  surface-tint: '#4d44e3'
  primary: '#3525cd'
  on-primary: '#ffffff'
  primary-container: '#4f46e5'
  on-primary-container: '#dad7ff'
  inverse-primary: '#c3c0ff'
  secondary: '#006c49'
  on-secondary: '#ffffff'
  secondary-container: '#6cf8bb'
  on-secondary-container: '#00714d'
  tertiary: '#684000'
  on-tertiary: '#ffffff'
  tertiary-container: '#885500'
  on-tertiary-container: '#ffd4a4'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#0f0069'
  on-primary-fixed-variant: '#3323cc'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 16px
  label-caps:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  container-max: 1440px
  sidebar-width: 260px
  gutter: 24px
  margin-mobile: 16px
  card-padding: 20px
  stack-gap: 16px
---

## Brand & Style

This design system is engineered for the EdTech sector, specifically targeting modern learners and educators. The brand personality is **Knowledgeable, Encouraging, and Precise**. It balances the clinical efficiency of a SaaS productivity tool with the approachability required for an educational environment.

The visual style is **Corporate / Modern** with a focus on high information density managed through clear hierarchy. It utilizes a "Surface-First" philosophy where content is organized into distinct white containers against a soft, tinted background. This approach reduces cognitive load by framing related data points into digestible modules. The overall emotional response should be one of organized progress—making complex AI and technology concepts feel structured and attainable.

## Colors

The palette is anchored by a **Primary Indigo-Blue**, representing intelligence and stability. This is used for primary actions, active navigation states, and key progress indicators. 

- **Primary (#4F46E5):** Brand-defining actions and focus states.
- **Success/Secondary (#10B981):** Positive progress, completed status, and "Correct" feedback.
- **Warning/Tertiary (#F59E0B):** In-progress indicators and attention-required notifications.
- **Neutrals:** A range of Slate grays is used for text hierarchy. The background is a very soft blue-white (#F8FAFC) to differentiate from the pure white (#FFFFFF) component cards.
- **Accents:** Soft, low-opacity washes of the primary color (sidebar_accent) are used to highlight active menu items without creating heavy visual weight.

## Typography

The design system uses **Plus Jakarta Sans** across all levels. This typeface offers a clean, geometric structure that feels modern and "tech-forward" while maintaining a soft, approachable curve that suits an educational context.

Hierarchy is established primarily through weight and color rather than extreme size shifts. 
- **Headlines:** Use SemiBold (600) or Bold (700) weights with slightly tightened letter spacing for a more cohesive, authoritative look.
- **Body Text:** Standardizes on 14px for density, using the Slate neutral palette to distinguish between primary content (Slate-900) and secondary descriptions (Slate-500).
- **Interactive Labels:** Use a slightly heavier weight than body text to signify clickability.

## Layout & Spacing

This design system utilizes a **Fixed-Fluid Hybrid Grid**. The main navigation is a fixed left-hand sidebar, while the primary content area uses a 12-column fluid grid that responds to viewport width.

- **Breakpoints:**
  - **Desktop (1024px+):** 12 columns, 24px gutters, fixed sidebar.
  - **Tablet (768px - 1023px):** 8 columns, 20px gutters, sidebar collapses to an icon-only rail or drawer.
  - **Mobile (<767px):** 4 columns, 16px margins, sidebar becomes a bottom navigation bar or hamburger menu.

**Spacing Rhythm:** A 4px baseline grid is used. Component internal padding is typically 20px or 24px to ensure content has enough "breathing room" within cards, preventing the information-dense UI from feeling cluttered.

## Elevation & Depth

Visual hierarchy is managed through **Tonal Layering** and **Ambient Shadows**.

1.  **Level 0 (Base):** The `background_tint` (#F8FAFC). All structural elements sit on this.
2.  **Level 1 (Cards/Containers):** Pure white surfaces with a very soft, diffused shadow.
    - *Shadow Specs:* `0px 4px 20px rgba(0, 0, 0, 0.05)`. This creates a sense of "lift" without being distracting.
3.  **Level 2 (Interactive/Floating):** Used for dropdowns and tooltips.
    - *Shadow Specs:* `0px 8px 30px rgba(0, 0, 0, 0.08)`.
4.  **Level 3 (Modals):** Centered overlays with a backdrop blur (8px) and a darker scrim (20% opacity) to focus user attention.

Elements do not use heavy borders; instead, the contrast between the white card and the tinted background provides the necessary boundary definition.

## Shapes

The shape language is **Rounded**, favoring friendliness and safety. 
- **Base Components:** Standard buttons and input fields use a 0.5rem (8px) radius.
- **Structural Containers:** Content cards and main dashboard modules use the `rounded-lg` token (1rem / 16px) to create a distinct, modern containerized look.
- **Status Indicators:** Progress bars and "pills" (tags/chips) use the `rounded-xl` or full-pill setting to differentiate them from functional UI elements.

## Components

### Buttons
- **Primary:** Solid `#4F46E5` with white text. 16px horizontal padding. Subtle hover state: 10% darken.
- **Secondary:** Transparent background with `#4F46E5` border and text.
- **Ghost:** No border, primary color text; used for secondary actions like "View All".

### Cards
- Always use `surface_white`.
- 16px (`rounded-lg`) corner radius.
- Standardized 20px internal padding.
- Section headers within cards should use `headline-sm`.

### Progress Indicators
- **Circular:** 8px stroke width. Background track is a 10% opacity version of the progress color.
- **Linear:** 6px height, fully rounded ends. 

### Inputs & Selects
- 1px border (#E2E8F0).
- On focus: Border changes to primary blue with a 3px soft outer glow (15% opacity).
- Labels sit above the field in `label-md` style.

### Sidebar Items
- Active state: `#EEF2FF` background wash and a 4px vertical "indicator" bar on the far left or right of the item.
- Icons: 20x20px, stroke-based (2px weight), matching the text color of the item.