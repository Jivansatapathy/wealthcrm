import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import OpportunityPipelineView from '../components/OpportunityPipelineView';
import { WEALTH_DATA } from '../data/wealthData';

describe('OpportunityPipelineView Component', () => {
  const defaultProps = {
    pipeline: WEALTH_DATA.pipelineOpportunities,
    onAdvanceStage: vi.fn(),
    showToast: vi.fn()
  };

  it('renders all 6 kanban columns', () => {
    render(<OpportunityPipelineView {...defaultProps} />);

    expect(screen.getByText('Intent Detected')).toBeInTheDocument();
    expect(screen.getByText('Advisor Qualified')).toBeInTheDocument();
    expect(screen.getByText('Discovery Scheduled')).toBeInTheDocument();
    expect(screen.getByText('Wealth Plan Presented')).toBeInTheDocument();
    expect(screen.getByText('KYC & Suitability')).toBeInTheDocument();
    expect(screen.getByText('Funded & Active AUM')).toBeInTheDocument();
  });

  it('renders deal cards with estimated AUM', () => {
    render(<OpportunityPipelineView {...defaultProps} />);

    expect(screen.getByText(/Marcus Vance - Wealth Portfolio/i)).toBeInTheDocument();
    expect(screen.getByText('$12,500,000 AUM')).toBeInTheDocument();
    expect(screen.getByText(/Tariq Mansoor - Real Estate Family Office/i)).toBeInTheDocument();
  });

  it('calls onAdvanceStage when clicking Advance button on a deal card', () => {
    const onAdvanceStage = vi.fn();
    render(<OpportunityPipelineView {...defaultProps} onAdvanceStage={onAdvanceStage} />);

    const advanceButtons = screen.getAllByRole('button', { name: /^Advance/i });
    expect(advanceButtons.length).toBeGreaterThan(0);

    fireEvent.click(advanceButtons[0]);
    expect(onAdvanceStage).toHaveBeenCalledWith(WEALTH_DATA.pipelineOpportunities[0].id);
  });
});
