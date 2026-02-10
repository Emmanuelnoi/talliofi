import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { MoneyInput } from '../money-input';

describe('MoneyInput', () => {
  it('renders with dollar prefix', () => {
    const onChange = vi.fn();
    render(<MoneyInput value={100} onChange={onChange} />);

    expect(screen.getByText('$')).toBeInTheDocument();
  });

  it('displays formatted value when not focused', () => {
    const onChange = vi.fn();
    render(<MoneyInput value={1234.56} onChange={onChange} />);

    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('1,234.56');
  });

  it('shows raw number when focused', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<MoneyInput value={1234.56} onChange={onChange} />);

    const input = screen.getByRole('textbox');
    await user.click(input);

    expect(input).toHaveValue('1234.56');
  });

  it('formats on blur', async () => {
    const user = userEvent.setup();
    let currentValue = 0;
    const onChange = vi.fn((val: number) => {
      currentValue = val;
    });

    const { rerender } = render(
      <MoneyInput value={currentValue} onChange={onChange} />,
    );

    const input = screen.getByRole('textbox');
    await user.click(input);
    await user.clear(input);
    await user.type(input, '5000');

    // Rerender with the latest value to simulate controlled component
    rerender(<MoneyInput value={currentValue} onChange={onChange} />);
    await user.tab();

    expect(onChange).toHaveBeenCalledWith(5000);
    expect(input).toHaveValue('5,000.00');
  });

  it('calls onChange with parsed numeric value', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<MoneyInput value={0} onChange={onChange} />);

    const input = screen.getByRole('textbox');
    await user.click(input);
    await user.clear(input);
    await user.type(input, '42.5');

    expect(onChange).toHaveBeenLastCalledWith(42.5);
  });

  it('clamps value to min/max on blur', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<MoneyInput value={0} onChange={onChange} min={10} max={100} />);

    const input = screen.getByRole('textbox');
    await user.click(input);
    await user.clear(input);
    await user.type(input, '5');
    await user.tab();

    // Should clamp to min of 10
    expect(onChange).toHaveBeenLastCalledWith(10);
  });

  it('shows empty string for undefined value', () => {
    const onChange = vi.fn();
    render(<MoneyInput value={undefined} onChange={onChange} />);

    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('');
  });

  it('uses inputMode="decimal" for mobile keyboards', () => {
    const onChange = vi.fn();
    render(<MoneyInput value={100} onChange={onChange} />);

    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('inputMode', 'decimal');
  });
});
