import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdvisorCopilotView from '../components/AdvisorCopilotView';

describe('AdvisorCopilotView Component', () => {
  it('renders initial assistant greeting message and quick prompt buttons', () => {
    render(<AdvisorCopilotView showToast={vi.fn()} />);

    expect(screen.getByText(/VGT Wealth Advisor Copilot/i)).toBeInTheDocument();
    expect(screen.getByText(/Hello Catherine/i)).toBeInTheDocument();
    expect(screen.getByText(/Marcus Vance Meeting Brief/i)).toBeInTheDocument();
    expect(screen.getByText(/Explain Tax Drag on \$14M Surplus/i)).toBeInTheDocument();
  });

  it('triggers quick prompt and generates document preview', async () => {
    render(<AdvisorCopilotView showToast={vi.fn()} />);

    const briefQuickBtn = screen.getByText(/Marcus Vance Meeting Brief/i);
    fireEvent.click(briefQuickBtn);

    // Verify user message appears in chat
    expect(screen.getByText(/Generate Executive Meeting Brief for Marcus Vance/i)).toBeInTheDocument();

    // Wait for AI response
    await waitFor(() => {
      expect(screen.getByText(/I have compiled the comprehensive pre-meeting briefing/i)).toBeInTheDocument();
    }, { timeout: 2000 });
  });
});
