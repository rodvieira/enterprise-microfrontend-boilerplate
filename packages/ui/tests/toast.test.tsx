import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Button } from '../src/components/button';
import { ToastProvider } from '../src/components/toast';
import { useToast } from '../src/hooks/use-toast';

function Publisher() {
  const { show } = useToast();
  return (
    <>
      <Button onClick={() => show({ title: 'Saved', description: 'Your changes are live' })}>
        First
      </Button>
      <Button onClick={() => show({ title: 'Deleted', variant: 'danger' })}>Second</Button>
    </>
  );
}

function setup() {
  return render(
    <ToastProvider>
      <Publisher />
    </ToastProvider>,
  );
}

describe('Toast', () => {
  it('shows a toast when one is published', async () => {
    setup();
    await userEvent.click(screen.getByRole('button', { name: 'First' }));
    expect(screen.getByText('Saved')).toBeInTheDocument();
    expect(screen.getByText('Your changes are live')).toBeInTheDocument();
  });

  it('keeps two simultaneous toasts readable', async () => {
    setup();
    await userEvent.click(screen.getByRole('button', { name: 'First' }));
    await userEvent.click(screen.getByRole('button', { name: 'Second' }));
    expect(screen.getByText('Saved')).toBeVisible();
    expect(screen.getByText('Deleted')).toBeVisible();
  });

  it('dismisses each toast independently', async () => {
    setup();
    await userEvent.click(screen.getByRole('button', { name: 'First' }));
    await userEvent.click(screen.getByRole('button', { name: 'Second' }));

    const dismissers = screen.getAllByRole('button', { name: /dismiss/i });
    expect(dismissers).toHaveLength(2);

    await userEvent.click(dismissers[0] as HTMLElement);
    expect(screen.queryByText('Saved')).not.toBeInTheDocument();
    expect(screen.getByText('Deleted')).toBeInTheDocument();
  });

  it('announces politely rather than interrupting', async () => {
    setup();
    await userEvent.click(screen.getByRole('button', { name: 'First' }));
    const region = screen.getByRole('status');
    expect(region).toHaveAttribute('aria-live', 'polite');
  });

  it('throws a clear error when useToast is called outside a provider', () => {
    function Orphan() {
      useToast();
      return null;
    }
    expect(() => render(<Orphan />)).toThrowError(/ToastProvider/);
  });
});
