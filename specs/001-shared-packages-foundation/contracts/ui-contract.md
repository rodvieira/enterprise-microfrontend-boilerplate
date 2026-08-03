# Public Contract: `@enterprise-mfe/ui`

**Feature**: `001-shared-packages-foundation` | **Date**: 2026-08-02

Seven components (FR-001), each styled on first use, each operable by keyboard
(FR-002), each forwarding a caller-supplied `className` (FR-004), and none aware
of any application, remote, or the session (FR-005).

## Exports

```ts
export { Button, Input, Modal, Table, Toast, ToastProvider, Layout, Nav } from './...';
export type { ButtonProps, InputProps, ModalProps, TableProps, ToastProps, LayoutProps, NavProps };
```

Plus one stylesheet entry point:

```ts
// consuming application
import '@enterprise-mfe/ui/styles.css';
```

## Shared conventions

Every component:

- accepts `className` and appends it after its own classes, so a consumer can
  override without forking (FR-004);
- forwards its `ref` to the underlying element it wraps;
- spreads unrecognized props onto that element, so `aria-*`, `data-*`, and event
  handlers work without the component enumerating them;
- takes no dependency beyond `react` and `react-dom` as peers (research D3).

## Components

| Component | Contract |
|---|---|
| `Button` | `variant: 'primary' \| 'secondary' \| 'ghost' \| 'danger'`, `size: 'sm' \| 'md' \| 'lg'`, `disabled`, `type`. Renders a real `<button>`. Disabled state is conveyed to assistive technology, not only visually. |
| `Input` | `label` (required — an input without one is an accessibility defect), `error`, `hint`, `id` auto-generated when omitted. Label is programmatically associated; `error` is announced. |
| `Modal` | `open`, `onClose`, `title`, `children`, `footer`. See focus rules below. |
| `Table` | Generic over row type: `columns`, `rows`, `getRowId`, `emptyState`. Renders a real `<table>` with header scope. Empty collection renders `emptyState`, never a bare frame (spec scenario 1.3). |
| `Toast` / `ToastProvider` | Provider owns the queue; `useToast().show({ title, description, variant, duration })`. Multiple toasts stay readable and dismiss independently (spec scenario 1.4). Announced politely to assistive technology. |
| `Layout` | `header`, `sidebar`, `children`, `footer`. Regions are real landmarks. Collapses predictably at small widths. |
| `Nav` | `items: { href, label, icon? }[]`, `activeHref`. Arrow-key movement between items; the active item is marked as current, not merely styled. |

## Modal focus rules

These are the requirements the hand-rolled implementation must satisfy (FR-003),
and they are what makes research decision D3 defensible:

1. On open, focus moves into the modal — to the first focusable element, or to
   the modal container when none exists.
2. While open, Tab and Shift+Tab cycle within the modal and never reach content
   behind it.
3. Escape invokes `onClose`.
4. On close, focus returns to the element that was focused before opening (spec
   scenario 1.2).
5. Content behind the modal is inert to assistive technology while it is open.

Each of the five is a named test (FR-021).

## Styling contract

Utility classes come from Tailwind CSS v4. Design tokens are declared in a
`@theme` block that the package exports as `styles.css` (research D2).

A consumer must import that stylesheet and include the package's source in what
Tailwind scans. A consumer that imports a component without the stylesheet gets
visibly unstyled output — this is intentional and loud, not a silent degradation
(spec edge case 4).

## What is deliberately absent

No form library, no date picker, no data grid, no theming API beyond tokens and
`className`. The design system proves the pattern and stays small enough that an
adopter reads it in one sitting.
