---
name: Lumina Code
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#393939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1b1b1c'
  surface-container: '#202020'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353535'
  on-surface: '#e5e2e1'
  on-surface-variant: '#c2c6d6'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#303030'
  outline: '#8c909f'
  outline-variant: '#424754'
  surface-tint: '#adc6ff'
  primary: '#adc6ff'
  on-primary: '#002e6a'
  primary-container: '#4d8eff'
  on-primary-container: '#00285d'
  inverse-primary: '#005ac2'
  secondary: '#4edea3'
  on-secondary: '#003824'
  secondary-container: '#00a572'
  on-secondary-container: '#00311f'
  tertiary: '#ffb786'
  on-tertiary: '#502400'
  tertiary-container: '#df7412'
  on-tertiary-container: '#461f00'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#adc6ff'
  on-primary-fixed: '#001a42'
  on-primary-fixed-variant: '#004395'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#ffdcc6'
  tertiary-fixed-dim: '#ffb786'
  on-tertiary-fixed: '#311400'
  on-tertiary-fixed-variant: '#723600'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353535'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 26px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  code-block:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
  code-inline:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 40px
  max-width: 1280px
---

## Brand & Style

The design system is engineered for focused technical education, targeting Grade 11 students. The brand personality is professional, systematic, and empowering, stripping away visual noise to prioritize clarity and code comprehension. 

The aesthetic is a **Technical Minimalism** style. It utilizes high-contrast ratios to ensure accessibility and long-form readability. The interface relies on structural integrity rather than decorative elements, using subtle borders and intentional whitespace to define the hierarchy. The emotional response should be one of "calm focus"—reducing the cognitive load often associated with learning complex programming concepts.

## Colors

The palette is optimized for dark-mode environments typical of professional IDEs. 

- **Backgrounds**: The base layer uses a deep charcoal (#121212) to minimize eye strain. Elevated surfaces use slate gray (#1E1E1E) to create subtle depth without relying on heavy shadows.
- **Accents**: Electric Blue (#3B82F6) is reserved for primary actions, progress indicators, and active states. Emerald Green (#10B981) specifically highlights success states, completed milestones, and passing test cases.
- **Contrast**: Text follows strict WCAG AA/AAA guidelines, utilizing pure white for headings and a muted slate for secondary metadata.

## Typography

This design system uses a dual-font approach. **Inter** provides a neutral, highly legible foundation for the UI and instructional content, featuring tight apertures and a large x-height suited for screen reading. **JetBrains Mono** is utilized for all code-related content, offering distinct character shapes (like the zero and lowercase 'l') to prevent syntax confusion.

- **Scale**: Headlines are kept relatively compact to maximize content area for code editors.
- **Rhythm**: Line heights for body text are generous (1.6x) to facilitate scanning through technical documentation.
- **Code**: All code blocks should use ligatures where applicable to mirror modern development environments.

## Layout & Spacing

The layout follows a **Fluid Grid** model with strict 4px increments. This ensures a mathematical rhythm across the application.

- **Desktop**: A 12-column grid with a 24px gutter. The maximum content width is 1280px to prevent excessively long line lengths in text-heavy lessons.
- **Mobile**: A 4-column grid with 16px margins. 
- **Reflow**: Sidebars (for navigation or file trees) should be collapsible to prioritize the workspace. 
- **Density**: Use "Comfortable" padding for instructional content and "Compact" padding for technical panels (like terminal outputs or file explorers) to maximize information density where appropriate.

## Elevation & Depth

To maintain a minimalist profile, this design system avoids heavy drop shadows. Instead, it uses **Tonal Layering** and **Low-Contrast Outlines**.

- **Level 0 (Base)**: #121212 - The main canvas.
- **Level 1 (Surface)**: #1E1E1E - Used for cards and secondary panels. These are defined by a 1px solid border (#334155).
- **Level 2 (Overlay)**: #2D2D2D - Used for modals and tooltips. These include a subtle 8px blur shadow with 20% opacity to lift them from the surface.
- **Active State**: Use a 1px primary electric blue border to denote focus and active input states rather than a change in elevation.

## Shapes

The shape language is **Soft** and systematic.

- **Standard Elements**: Buttons, input fields, and small cards use a 0.25rem (4px) radius. This provides a professional, "tool-like" feel that is more approachable than sharp corners but less "toy-like" than fully rounded corners.
- **Large Elements**: Main content containers and code editor windows use 0.5rem (8px) for a slightly softer enclosure.
- **Icons**: Icons should follow a 2px stroke weight with consistent corner rounding to match the UI elements.

## Components

- **Buttons**: Primary buttons are solid Electric Blue with white text. Secondary buttons use a transparent background with a 1px slate border.
- **Code Editor**: Must feature a distinct background (#0F172A) to separate the workspace from the instructional UI. Use syntax highlighting based on the defined primary and secondary colors.
- **Progress Indicators**: Use thin, linear bars. Milestones should trigger the Emerald Green success color upon completion.
- **Input Fields**: Ghost-style inputs with #1E1E1E backgrounds and 1px borders. The border transitions to Electric Blue on `:focus`.
- **Instructional Cards**: Use a left-border accent (4px width) in Electric Blue to signify the current step in a tutorial.
- **Monospace Labels**: Use JetBrains Mono in uppercase for technical labels (e.g., "STDOUT", "TERMINAL", "ERRORS").