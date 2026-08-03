import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Button } from '../src/components/button';
import { Modal } from '../src/components/modal';

/**
 * The five focus rules from contracts/ui-contract.md, one named test each.
 *
 * These are the acceptance surface for research decision D3 — hand-rolling focus
 * management instead of taking a dependency on a headless dialog library. If any
 * of these five fails, that decision is the thing to revisit.
 */

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open</Button>
      <Button>Behind</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Confirm">
        <Button>First</Button>
        <Button>Second</Button>
      </Modal>
    </>
  );
}

describe('Modal focus rules', () => {
  it('rule 1: on open, focus moves to the first focusable element inside', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'Open' }));
    expect(screen.getByRole('button', { name: 'First' })).toHaveFocus();
  });

  it('rule 1b: falls back to the close control when the content has nothing focusable', async () => {
    render(
      <Modal open onClose={vi.fn()} title="Empty">
        <p>Nothing to focus here</p>
      </Modal>,
    );
    // The close control is always rendered, so it is the first focusable element
    // when the content has none. The container fallback in useFocusTrap stays as
    // defence for a surface built without one.
    expect(screen.getByRole('button', { name: /close/i })).toHaveFocus();
  });

  it('rule 2: Tab and Shift+Tab cycle inside and never reach content behind', async () => {
    render(<Harness />);
    // Captured before opening: once the modal is open, rule 5 makes this button
    // unreachable by role query — which is the point of rule 5.
    const behind = screen.getByRole('button', { name: 'Behind' });

    await userEvent.click(screen.getByRole('button', { name: 'Open' }));

    const first = screen.getByRole('button', { name: 'First' });
    const second = screen.getByRole('button', { name: 'Second' });
    const close = screen.getByRole('button', { name: /close/i });

    await userEvent.tab();
    expect(second).toHaveFocus();
    await userEvent.tab();
    expect(close).toHaveFocus();
    await userEvent.tab();
    expect(first).toHaveFocus(); // wrapped forward, never left the modal

    await userEvent.tab({ shift: true });
    expect(close).toHaveFocus(); // wrapped backward

    expect(behind).not.toHaveFocus();
  });

  it('rule 3: Escape invokes onClose', async () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="Confirm">
        <Button>First</Button>
      </Modal>,
    );
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('rule 4: on close, focus returns to the element that opened it', async () => {
    render(<Harness />);
    const opener = screen.getByRole('button', { name: 'Open' });
    await userEvent.click(opener);
    expect(opener).not.toHaveFocus();

    await userEvent.keyboard('{Escape}');
    expect(opener).toHaveFocus();
  });

  it('rule 5: content behind the modal is inert to assistive technology', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'Open' }));

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleName('Confirm');

    // The button rendered outside the modal is unreachable to assistive
    // technology while the dialog is open.
    expect(screen.queryByRole('button', { name: 'Behind' })).not.toBeInTheDocument();
  });

  it('renders nothing at all while closed', () => {
    render(<Harness />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
