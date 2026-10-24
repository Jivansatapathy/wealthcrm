import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../App';

describe('App Full Integration Test', () => {
  it('shows only the enabled views in the sidebar', () => {
    render(<App />);
    expect(screen.getByText('AI Intent Engine')).toBeInTheDocument();
    expect(screen.getByText('Lead Acquisition')).toBeInTheDocument();
    ['Opportunity Pipeline', 'Client 360° & Households', 'Cross-Division Referrals', 'AI Advisor Copilot', 'Executive Analytics']
      .forEach((n) => expect(screen.queryByText(n)).not.toBeInTheDocument());
  });

  it.skip('switches between all navigation views properly (views currently hidden, see src/views.js)', () => {
    render(<App />);

    // 1. Initial view: AI Intent Engine
    expect(screen.getByText(/AI Wealth Intent Engine/i)).toBeInTheDocument();

    // 2. Switch to Opportunity Pipeline
    const pipelineNav = screen.getByText('Opportunity Pipeline');
    fireEvent.click(pipelineNav);
    expect(screen.getByText(/Canadian Wealth Acquisition Pipeline/i)).toBeInTheDocument();

    // 3. Switch to Client 360° & Households
    const client360Nav = screen.getByText('Client 360° & Households');
    fireEvent.click(client360Nav);
    expect(screen.getByText(/Household & Corporate Entity Relationship Architecture/i)).toBeInTheDocument();

    // 4. Switch to Cross-Division Referrals
    const referralsNav = screen.getByText('Cross-Division Referrals');
    fireEvent.click(referralsNav);
    expect(screen.getByText(/Cross-Divisional Banking Referral Stream/i)).toBeInTheDocument();

    // 5. Switch to AI Advisor Copilot
    const copilotNav = screen.getByText('AI Advisor Copilot');
    fireEvent.click(copilotNav);
    expect(screen.getByText(/VGT Wealth Advisor Copilot/i)).toBeInTheDocument();

    // 6. Switch to Executive Analytics
    const analyticsNav = screen.getByText('Executive Analytics');
    fireEvent.click(analyticsNav);
    expect(screen.getByText(/Lead Intent Acquisition Attribution by Bank Channel/i)).toBeInTheDocument();
  });

  it('simulates live intent influx and increments detected count and AUM', () => {
    render(<App />);

    // Check initial count
    const initialBadge = screen.getByText(/5 Signals/i);
    expect(initialBadge).toBeInTheDocument();

    // Click Simulate Live Intent in top header (first matching button)
    const simulateBtns = screen.getAllByRole('button', { name: /Simulate Live Intent/i });
    fireEvent.click(simulateBtns[0]);

    // Michael Wood (Trident Resources) should now be detected in card and toast
    const simulatedElements = screen.getAllByText(/Michael Wood/i);
    expect(simulatedElements.length).toBeGreaterThan(0);

    // Badge updates to 6 Signals
    expect(screen.getByText(/6 Signals/i)).toBeInTheDocument();

    // Pipeline AUM updates to $151.7M
    expect(screen.getByText('$151.7M')).toBeInTheDocument();
  });

  it.skip('promotes unpromoted lead (Marc Edwards) to Opportunity Pipeline and appears in Kanban board', () => {
    render(<App />);

    // In the Intent Engine, find Marc Edwards's card (Kane Biotech)
    expect(screen.getByText('Marc Edwards')).toBeInTheDocument();

    // Find the Add to Pipeline buttons and click the one on Marc Edwards's card
    const promoteButtons = screen.getAllByText(/Add to Pipeline/i);
    // Marc Edwards is the 5th lead (index 4)
    fireEvent.click(promoteButtons[4]);

    // Navigate to Pipeline
    const pipelineNav = screen.getByText('Opportunity Pipeline');
    fireEvent.click(pipelineNav);

    // Verify Marc Edwards's mandate is now present in the pipeline
    expect(screen.getByText(/Marc Edwards - Commercial Wealth Advisory Mandate/i)).toBeInTheDocument();
  });
});
