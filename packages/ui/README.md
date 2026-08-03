# @enterprise-mfe/ui

The design system: seven components — Button, Input, Modal, Table, Toast, Layout,
Nav — that render something real the moment you clone the repository, rather than
the empty placeholders most starters call a design system. Every component is
operable by keyboard alone, forwards a caller-supplied `className` so it can be
adapted without forking, and knows nothing about any application, remote, or
session. It carries **zero runtime dependencies**: class composition, focus
trapping, and background inertness are implemented here rather than pulled in,
because a boilerplate's dependency list is inherited wholesale by everyone who
adopts it.

## Usage

```tsx
import { Button, Modal, Table, ToastProvider, useToast } from '@enterprise-mfe/ui';
import '@enterprise-mfe/ui/styles.css';
```

The stylesheet import is not optional. Skip it and components render visibly
unstyled — loudly wrong rather than subtly broken.

Point Tailwind at this package's source so the utility classes used inside the
components are generated:

```css
@import '@enterprise-mfe/ui/styles.css';
@source '../../node_modules/@enterprise-mfe/ui/src';
```

## Theming

Design tokens are declared in a Tailwind v4 `@theme` block in
`src/styles/tokens.css` — colour, radius, spacing, and type. Override a token in
your own stylesheet to re-skin every component at once; use `className` for
one-off adjustments.

## Accessibility

Modal focus behaviour is specified as five rules — focus enters on open, cycles
inside, Escape closes, focus returns to the opener, background is inert to
assistive technology — and each has its own named test in `tests/modal-focus.test.tsx`.
If one of those starts failing in a way that is awkward to fix, that is the
signal to reconsider hand-rolling and reach for a headless dialog library.
