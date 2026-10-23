import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import IntentEngineView from '../components/IntentEngineView';
import { WEALTH_DATA } from '../data/wealthData';

describe('IntentEngineView Component', () => {
  const defaultProps = {
    leads: WEALTH_DATA.intentLeads,
    kpi: WEALTH_DATA.kpiMetrics,
    searchQuery: '',
    onOpenDrawer: vi.fn(),
    onPromoteLead: vi.fn(),
    onSimulateIntent: vi.fn()
  };

  it('renders top KPI metric values and scanner banner', () => {
    render(<IntentEngineView {...defaultProps} />);

    expect(screen.getByText(WEALTH_DATA.kpiMetrics.totalPipelineAUM)).toBeInTheDocument();
    expect(screen.getByText(/AI Intent Engine — Live Bank & Corporate Intelligence Feed/i)).toBeInTheDocument();
    expect(screen.getByText(/Gordon Thompson/i)).toBeInTheDocument();
    expect(screen.getByText(/Dr. Paul Armstrong/i)).toBeInTheDocument();
  });

  it('filters leads by M&A / Corporate Liquidity tab', () => {
    render(<IntentEngineView {...defaultProps} />);

    const liquidityTab = screen.getByText(/M&A \/ Corporate Liquidity/i);
    fireEvent.click(liquidityTab);

    // Gordon Thompson is an M&A liquidation / private placement lead
    expect(screen.getByText(/Gordon Thompson/i)).toBeInTheDocument();
    // Marc Edwards is debt restructuring / commercial trigger, not M&A
    expect(screen.queryByText(/Marc Edwards/i)).not.toBeInTheDocument();
  });

  it('filters leads by MD Financial tab', () => {
    render(<IntentEngineView {...defaultProps} />);

    const mdTab = screen.getByText(/MD Financial \(Physicians\)/i);
    fireEvent.click(mdTab);

    expect(screen.getByText(/Dr. Paul Armstrong/i)).toBeInTheDocument();
    expect(screen.queryByText(/Gordon Thompson/i)).not.toBeInTheDocument();
  });

  it('filters leads by deal-size tier using the pipeline tier field', () => {
    const mk = (id, name, tier) => ({ ...WEALTH_DATA.intentLeads[0], id, name, company: `${name} Co`, tier, estimatedAUM: 'To be sized' });
    const leads = [mk('a', 'Smallco', 'Small ($10K-$250K)'), mk('b', 'Midco', 'Medium ($250K-$2M)'), mk('c', 'Bigco', 'High ($2M+)')];
    render(<IntentEngineView {...defaultProps} leads={leads} />);

    fireEvent.click(screen.getByRole('button', { name: /Medium \(\$250K–\$2M\) \(1\)/ }));
    expect(screen.getByText('Midco')).toBeInTheDocument();
    expect(screen.queryByText('Smallco')).not.toBeInTheDocument();
    expect(screen.queryByText('Bigco')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /All sizes/ }));
    expect(screen.getByText('Bigco')).toBeInTheDocument();
  });

  it('derives a tier for demo leads from their estimated mandate', () => {
    // Gordon Thompson-style demo leads have no tier field, only estimatedAUM
    const lead = { ...WEALTH_DATA.intentLeads[0], tier: undefined, estimatedAUM: '$12,500,000' };
    render(<IntentEngineView {...defaultProps} leads={[lead]} />);

    fireEvent.click(screen.getByRole('button', { name: /High \(\$2M\+\) \(1\)/ }));
    expect(screen.getByText(lead.name)).toBeInTheDocument();
  });

  it('filters leads by search query prop', () => {
    render(<IntentEngineView {...defaultProps} searchQuery="Avicanna" />);

    expect(screen.getByText(/Aras Azadian/i)).toBeInTheDocument();
    expect(screen.queryByText(/Gordon Thompson/i)).not.toBeInTheDocument();
  });

  it('triggers onOpenDrawer when clicking card or brief button', () => {
    const onOpenDrawer = vi.fn();
    render(<IntentEngineView {...defaultProps} onOpenDrawer={onOpenDrawer} />);

    const briefButtons = screen.getAllByText(/AI Outreach Brief/i);
    fireEvent.click(briefButtons[0]);

    expect(onOpenDrawer).toHaveBeenCalledWith(expect.objectContaining({ name: 'Gordon Thompson' }), 'brief');
  });

  it('triggers onPromoteLead when clicking Add to Pipeline', () => {
    const onPromoteLead = vi.fn();
    render(<IntentEngineView {...defaultProps} onPromoteLead={onPromoteLead} />);

    const promoteButtons = screen.getAllByText(/Add to Pipeline/i);
    fireEvent.click(promoteButtons[0]);

    expect(onPromoteLead).toHaveBeenCalledWith(expect.objectContaining({ name: 'Gordon Thompson' }));
  });

  it('triggers onSimulateIntent when clicking banner button', () => {
    const onSimulateIntent = vi.fn();
    render(<IntentEngineView {...defaultProps} onSimulateIntent={onSimulateIntent} />);

    const simulateBtn = screen.getByText(/Simulate Live Intent Influx/i);
    fireEvent.click(simulateBtn);

    expect(onSimulateIntent).toHaveBeenCalled();
  });
});
