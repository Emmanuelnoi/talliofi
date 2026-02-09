import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { TemplateCard } from '../template-card';
import type { BudgetTemplate } from '@/lib/budget-templates';

const mockTemplate: BudgetTemplate = {
  id: 'test-template',
  name: 'Test Template',
  description: 'A test budget template for unit testing.',
  details: 'Detailed explanation of the test template.',
  buckets: [
    { name: 'Essentials', color: '#4A90D9', targetPercentage: 50 },
    { name: 'Savings', color: '#50C878', targetPercentage: 30 },
    { name: 'Flexible', color: '#FFB347', targetPercentage: 20 },
  ],
  isBuiltIn: true,
};

describe('TemplateCard', () => {
  it('renders template name and description', () => {
    render(
      <TemplateCard
        template={mockTemplate}
        isSelected={false}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByText('Test Template')).toBeInTheDocument();
    expect(
      screen.getByText('A test budget template for unit testing.'),
    ).toBeInTheDocument();
  });

  it('renders bucket allocation preview', () => {
    render(
      <TemplateCard
        template={mockTemplate}
        isSelected={false}
        onSelect={vi.fn()}
      />,
    );

    // Check that bucket labels are rendered
    expect(screen.getByText('Essentials (50%)')).toBeInTheDocument();
    expect(screen.getByText('Savings (30%)')).toBeInTheDocument();
    expect(screen.getByText('Flexible (20%)')).toBeInTheDocument();
  });

  it('shows checkmark when selected', () => {
    const { container } = render(
      <TemplateCard
        template={mockTemplate}
        isSelected={true}
        onSelect={vi.fn()}
      />,
    );

    // Check for the selected state indicator (checkmark icon)
    const checkIcon = container.querySelector('svg');
    expect(checkIcon).toBeInTheDocument();
  });

  it('does not show checkmark when not selected', () => {
    render(
      <TemplateCard
        template={mockTemplate}
        isSelected={false}
        onSelect={vi.fn()}
      />,
    );

    // When not selected, there should be no check icon
    // The allocation bar dots are not svg, so check icon should not exist
    expect(screen.queryByRole('img', { hidden: true })).not.toBeInTheDocument();
  });

  it('calls onSelect when clicked', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <TemplateCard
        template={mockTemplate}
        isSelected={false}
        onSelect={onSelect}
      />,
    );

    await user.click(screen.getByRole('radio'));

    expect(onSelect).toHaveBeenCalledWith(mockTemplate);
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('calls onSelect when Enter key is pressed', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <TemplateCard
        template={mockTemplate}
        isSelected={false}
        onSelect={onSelect}
      />,
    );

    const card = screen.getByRole('radio');
    card.focus();
    await user.keyboard('{Enter}');

    expect(onSelect).toHaveBeenCalledWith(mockTemplate);
  });

  it('calls onSelect when Space key is pressed', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <TemplateCard
        template={mockTemplate}
        isSelected={false}
        onSelect={onSelect}
      />,
    );

    const card = screen.getByRole('radio');
    card.focus();
    await user.keyboard(' ');

    expect(onSelect).toHaveBeenCalledWith(mockTemplate);
  });

  it('has correct aria-checked attribute when selected', () => {
    render(
      <TemplateCard
        template={mockTemplate}
        isSelected={true}
        onSelect={vi.fn()}
      />,
    );

    const card = screen.getByRole('radio');
    expect(card).toHaveAttribute('aria-checked', 'true');
  });

  it('has correct aria-checked attribute when not selected', () => {
    render(
      <TemplateCard
        template={mockTemplate}
        isSelected={false}
        onSelect={vi.fn()}
      />,
    );

    const card = screen.getByRole('radio');
    expect(card).toHaveAttribute('aria-checked', 'false');
  });

  it('renders allocation bar with correct proportions', () => {
    const { container } = render(
      <TemplateCard
        template={mockTemplate}
        isSelected={false}
        onSelect={vi.fn()}
      />,
    );

    // Find allocation bar segments by their style
    const allocationBar = container.querySelector('.flex.h-2');
    expect(allocationBar).toBeInTheDocument();

    const segments = allocationBar?.children;
    expect(segments).toHaveLength(3);
  });
});
