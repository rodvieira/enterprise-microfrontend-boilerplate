import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Select } from '../src/components/select';

function roles() {
  return (
    <>
      <option value="admin">admin</option>
      <option value="editor">editor</option>
      <option value="viewer">viewer</option>
    </>
  );
}

describe('Select', () => {
  it('associates its label programmatically, not just visually', () => {
    render(<Select label="Role">{roles()}</Select>);
    const select = screen.getByLabelText('Role');
    expect(select).toBeInTheDocument();
    expect(select.tagName).toBe('SELECT');
  });

  it('generates an id when none is given, so two selects never collide', () => {
    render(
      <>
        <Select label="Role">{roles()}</Select>
        <Select label="New role">{roles()}</Select>
      </>,
    );
    const first = screen.getByLabelText('Role');
    const second = screen.getByLabelText('New role');
    expect(first.id).not.toBe('');
    expect(first.id).not.toBe(second.id);
  });

  it('respects a caller-supplied id', () => {
    render(
      <Select label="Role" id="role-field">
        {roles()}
      </Select>,
    );
    expect(screen.getByLabelText('Role')).toHaveAttribute('id', 'role-field');
  });

  it('reports an error to assistive technology, not only in colour', () => {
    render(
      <Select label="Role" error="Pick a role">
        {roles()}
      </Select>,
    );
    const select = screen.getByLabelText('Role');
    expect(select).toHaveAttribute('aria-invalid', 'true');
    expect(select).toHaveAccessibleDescription('Pick a role');
    expect(screen.getByRole('alert')).toHaveTextContent('Pick a role');
  });

  it('describes itself with a hint when there is no error', () => {
    render(
      <Select label="Role" hint="Determines what they can change">
        {roles()}
      </Select>,
    );
    const select = screen.getByLabelText('Role');
    expect(select).not.toHaveAttribute('aria-invalid');
    expect(select).toHaveAccessibleDescription('Determines what they can change');
  });

  it('lets an error win over a hint, so the failure is what gets announced', () => {
    render(
      <Select label="Role" hint="Determines what they can change" error="Pick a role">
        {roles()}
      </Select>,
    );
    expect(screen.getByLabelText('Role')).toHaveAccessibleDescription('Pick a role');
  });

  it('passes the chosen value through, as a plain native select would', async () => {
    const onChange = vi.fn();
    render(
      <Select label="Role" defaultValue="viewer" onChange={onChange}>
        {roles()}
      </Select>,
    );

    await userEvent.selectOptions(screen.getByLabelText('Role'), 'editor');

    expect(onChange).toHaveBeenCalled();
    expect(screen.getByLabelText('Role')).toHaveValue('editor');
  });
});
