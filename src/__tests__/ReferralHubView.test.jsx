import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ReferralHubView from '../components/ReferralHubView';
import { WEALTH_DATA } from '../data/wealthData';

describe('ReferralHubView Component', () => {
  const defaultProps = {
    referrals: WEALTH_DATA.referrals,
    onAcceptReferral: vi.fn(),
    showToast: vi.fn()
  };

  it('renders referrals table with correct headers and rows', () => {
    render(<ReferralHubView {...defaultProps} />);

    expect(screen.getByText('Cross-Divisional Banking Referral Stream')).toBeInTheDocument();
    expect(screen.getByText('Geoff Reynolds')).toBeInTheDocument();
    expect(screen.getByText('$12.5M AUM')).toBeInTheDocument();
    expect(screen.getByText('Dr. Aris Thorne')).toBeInTheDocument();
  });

  it('calls onAcceptReferral when clicking Accept & Route button', () => {
    const onAcceptReferral = vi.fn();
    render(<ReferralHubView {...defaultProps} onAcceptReferral={onAcceptReferral} />);

    const acceptButtons = screen.getAllByText('Accept & Route');
    fireEvent.click(acceptButtons[0]);

    expect(onAcceptReferral).toHaveBeenCalledWith(WEALTH_DATA.referrals[0].id);
  });
});
