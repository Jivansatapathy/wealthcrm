import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LeadDetailDrawer from '../components/LeadDetailDrawer';
import { WEALTH_DATA } from '../data/wealthData';

describe('LeadDetailDrawer Component', () => {
  const sampleLead = WEALTH_DATA.intentLeads[0]; // Marcus Vance

  const defaultProps = {
    lead: sampleLead,
    isOpen: true,
    onClose: vi.fn(),
    initialTab: 'email',
    onPromoteLead: vi.fn(),
    showToast: vi.fn()
  };

  it('renders lead details, intent radar signals, and household entities', () => {
    render(<LeadDetailDrawer {...defaultProps} />);

    expect(screen.getByText(sampleLead.name)).toBeInTheDocument();
    expect(screen.getByText(/AI Intent Radar & Detection Signals/i)).toBeInTheDocument();
    expect(screen.getByText(sampleLead.householdPreview.entities[0])).toBeInTheDocument();
    expect(screen.getByText(/AI Strategic Wealth Opportunity Rationale/i)).toBeInTheDocument();
  });

  it('switches between AI Outreach tabs (Email, Phone Script, Brief)', () => {
    render(<LeadDetailDrawer {...defaultProps} />);

    // Initially on email tab
    expect(screen.getByText(/Congratulations to you and your team/i)).toBeInTheDocument();

    // Click phone script tab
    const phoneTab = screen.getByText(/Commercial RM Intro Call Script/i);
    fireEvent.click(phoneTab);
    expect(screen.getByText(/I work closely with Geoff Reynolds/i)).toBeInTheDocument();

    // Click meeting brief tab
    const briefTab = screen.getByText(/Advisor Pre-Meeting Briefing/i);
    fireEvent.click(briefTab);
    expect(screen.getByText(/Address the Tax Drag Clock/i)).toBeInTheDocument();
  });

  it('handles copy to clipboard and toast feedback', () => {
    const showToast = vi.fn();
    // Mock navigator.clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockImplementation(() => Promise.resolve())
      }
    });

    render(<LeadDetailDrawer {...defaultProps} showToast={showToast} />);

    const copyBtn = screen.getByText(/Copy Text/i);
    fireEvent.click(copyBtn);

    expect(navigator.clipboard.writeText).toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining('copied to clipboard'), 'success');
  });

  it('calls onPromoteLead and onClose when clicking Promote to Opportunity Pipeline', () => {
    const onPromoteLead = vi.fn();
    const onClose = vi.fn();

    render(<LeadDetailDrawer {...defaultProps} onPromoteLead={onPromoteLead} onClose={onClose} />);

    const promoteBtn = screen.getByText(/Promote to Opportunity Pipeline/i);
    fireEvent.click(promoteBtn);

    expect(onPromoteLead).toHaveBeenCalledWith(sampleLead);
    expect(onClose).toHaveBeenCalled();
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(<LeadDetailDrawer {...defaultProps} isOpen={false} />);
    expect(container).toBeEmptyDOMElement();
  });
});
