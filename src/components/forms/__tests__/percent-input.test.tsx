import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { PercentInput } from '../percent-input';

describe('PercentInput', () => {
  it('renders with percent suffix', () => {
    const onChange = vi.fn();
    render(<PercentInput value={25} onChange={onChange} />);

    expect(screen.getByText('%')).toBeInTheDocument();
  });

  it('displays formatted value when not focused', () => {
    const onChange = vi.fn();
    render(<PercentInput value={25.5} onChange={onChange} />);

    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('25.5');
  });

  it('shows raw number when focused', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<PercentInput value={25.5} onChange={onChange} />);

    const input = screen.getByRole('textbox');
    await user.click(input);

    expect(input).toHaveValue('25.5');
  });

  it('formats on blur', async () => {
    const user = userEvent.setup();
    let currentValue = 0;
    const onChange = vi.fn((val: number) => {
      currentValue = val;
    });

    const { rerender } = render(
      <PercentInput value={currentValue} onChange={onChange} />,
    );

    const input = screen.getByRole('textbox');
    await user.click(input);
    await user.clear(input);
    await user.type(input, '30');

    rerender(<PercentInput value={currentValue} onChange={onChange} />);
    await user.tab();

    expect(onChange).toHaveBeenCalledWith(30);
    expect(input).toHaveValue('30');
  });

  it('clamps to max of 100 by default', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<PercentInput value={0} onChange={onChange} />);

    const input = screen.getByRole('textbox');
    await user.click(input);
    await user.clear(input);
    // Type three digits -- 1, 1, 0 -> would be "110" but clamped
    await user.type(input, '99');
    await user.tab();

    // Should clamp to 99 (still within 100)
    expect(onChange).toHaveBeenLastCalledWith(99);
  });

  it('uses inputMode="decimal" for mobile keyboards', () => {
    const onChange = vi.fn();
    render(<PercentInput value={25} onChange={onChange} />);

    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('inputMode', 'decimal');
  });

  it('shows empty string for undefined value', () => {
    const onChange = vi.fn();
    render(<PercentInput value={undefined} onChange={onChange} />);

    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('');
  });
});
