import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Input } from '../src/components/input';

describe('Input', () => {
  it('associates its label programmatically, not just visually', () => {
    render(<Input label="Email" />);
    const input = screen.getByLabelText('Email');
    expect(input).toBeInTheDocument();
    expect(input.tagName).toBe('INPUT');
  });

  it('generates an id when none is given, so two inputs never collide', () => {
    render(
      <>
        <Input label="First" />
        <Input label="Second" />
      </>,
    );
    const first = screen.getByLabelText('First');
    const second = screen.getByLabelText('Second');
    expect(first.id).not.toBe('');
    expect(first.id).not.toBe(second.id);
  });

  it('respects a caller-supplied id', () => {
    render(<Input label="Email" id="email-field" />);
    expect(screen.getByLabelText('Email')).toHaveAttribute('id', 'email-field');
  });

  it('announces an error to assistive technology and marks the field invalid', () => {
    render(<Input label="Email" error="Enter a valid address" />);
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid address');
    expect(input).toHaveAccessibleDescription('Enter a valid address');
  });

  it('describes the field with its hint when there is no error', () => {
    render(<Input label="Email" hint="We never share this" />);
    expect(screen.getByLabelText('Email')).toHaveAccessibleDescription('We never share this');
  });

  it('accepts typed input by keyboard', async () => {
    render(<Input label="Email" />);
    await userEvent.tab();
    await userEvent.keyboard('a@b.com');
    expect(screen.getByLabelText('Email')).toHaveValue('a@b.com');
  });

  it('forwards className to the input', () => {
    render(<Input label="Email" className="w-full" />);
    expect(screen.getByLabelText('Email').className).toContain('w-full');
  });
});
