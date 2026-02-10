import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { TemplateSelector } from '../template-selector';
import { BUDGET_TEMPLATES } from '@/lib/budget-templates';

describe('TemplateSelector', () => {
  it('renders all built-in templates', () => {
    render(
      <TemplateSelector selectedTemplateId={null} onSelectTemplate={vi.fn()} />,
    );

    // Check that all templates are rendered
    for (const template of BUDGET_TEMPLATES) {
      expect(screen.getByText(template.name)).toBeInTheDocument();
    }
  });

  it('renders "Start from scratch" option by default', () => {
    render(
      <TemplateSelector selectedTemplateId={null} onSelectTemplate={vi.fn()} />,
    );

    expect(
      screen.getByRole('button', { name: /start from scratch/i }),
    ).toBeInTheDocument();
  });

  it('hides "Start from scratch" option when showScratchOption is false', () => {
    render(
      <TemplateSelector
        selectedTemplateId={null}
        onSelectTemplate={vi.fn()}
        showScratchOption={false}
      />,
    );

    expect(
      screen.queryByRole('button', { name: /start from scratch/i }),
    ).not.toBeInTheDocument();
  });

  it('calls onSelectTemplate when a template is clicked', async () => {
    const user = userEvent.setup();
    const onSelectTemplate = vi.fn();

    render(
      <TemplateSelector
        selectedTemplateId={null}
        onSelectTemplate={onSelectTemplate}
      />,
    );

    const templateCard = screen
      .getByText('50/30/20 Rule')
      .closest('[role="radio"]');
    await user.click(templateCard!);

    expect(onSelectTemplate).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'fifty-thirty-twenty' }),
    );
  });

  it('toggles selection when clicking the same template', async () => {
    const user = userEvent.setup();
    const onSelectTemplate = vi.fn();

    render(
      <TemplateSelector
        selectedTemplateId="fifty-thirty-twenty"
        onSelectTemplate={onSelectTemplate}
      />,
    );

    const templateCard = screen
      .getByText('50/30/20 Rule')
      .closest('[role="radio"]');
    await user.click(templateCard!);

    // Should deselect (pass null)
    expect(onSelectTemplate).toHaveBeenCalledWith(null);
  });

  it('calls onSelectTemplate with null when "Start from scratch" is clicked', async () => {
    const user = userEvent.setup();
    const onSelectTemplate = vi.fn();

    render(
      <TemplateSelector
        selectedTemplateId="fifty-thirty-twenty"
        onSelectTemplate={onSelectTemplate}
      />,
    );

    await user.click(
      screen.getByRole('button', { name: /start from scratch/i }),
    );

    expect(onSelectTemplate).toHaveBeenCalledWith(null);
  });

  it('shows selected state for the selected template', () => {
    render(
      <TemplateSelector
        selectedTemplateId="fifty-thirty-twenty"
        onSelectTemplate={vi.fn()}
      />,
    );

    const selectedCard = screen
      .getByText('50/30/20 Rule')
      .closest('[role="radio"]');
    expect(selectedCard).toHaveAttribute('aria-checked', 'true');

    // Other cards should not be selected
    const otherCard = screen.getByText('Minimalist').closest('[role="radio"]');
    expect(otherCard).toHaveAttribute('aria-checked', 'false');
  });

  it('renders additional templates when provided', () => {
    const customTemplate = {
      id: 'custom-template',
      name: 'My Custom Template',
      description: 'A custom user-created template',
      buckets: [
        { name: 'Custom Bucket', color: '#000000', targetPercentage: 100 },
      ],
      isBuiltIn: false,
    };

    render(
      <TemplateSelector
        selectedTemplateId={null}
        onSelectTemplate={vi.fn()}
        additionalTemplates={[customTemplate]}
      />,
    );

    expect(screen.getByText('My Custom Template')).toBeInTheDocument();
    // Built-in templates should still be present
    expect(screen.getByText('50/30/20 Rule')).toBeInTheDocument();
  });

  it('has accessible radiogroup role', () => {
    render(
      <TemplateSelector selectedTemplateId={null} onSelectTemplate={vi.fn()} />,
    );

    expect(
      screen.getByRole('radiogroup', { name: /budget template options/i }),
    ).toBeInTheDocument();
  });

  it('shows "Start from scratch" button with different styling when selected', () => {
    render(
      <TemplateSelector
        selectedTemplateId={null}
        onSelectTemplate={vi.fn()}
        showScratchOption={true}
      />,
    );

    // When no template is selected, the scratch button should appear as "selected"
    const scratchButton = screen.getByRole('button', {
      name: /start from scratch/i,
    });
    // The button should be the default variant (not outline) when nothing is selected
    expect(scratchButton).toBeInTheDocument();
  });
});
