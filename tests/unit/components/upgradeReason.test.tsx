import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UpgradeReasonBanner } from '@/components/upgrade/UpgradeModal';

describe('UpgradeReasonBanner', () => {
  it('renders the quota banner for reason "quota"', () => {
    render(<UpgradeReasonBanner reason="quota" />);
    expect(screen.queryByText(/hit your plan's limit/i)).not.toBeNull();
    expect(screen.queryByText(/plan has expired/i)).toBeNull();
  });

  it('renders the expired banner for reason "expired"', () => {
    render(<UpgradeReasonBanner reason="expired" />);
    expect(
      screen.queryByText(/your plan has expired — renew to restore your limits\./i),
    ).not.toBeNull();
    expect(screen.queryByText(/hit your plan's limit/i)).toBeNull();
  });

  it('renders no banner for reason "settings"', () => {
    const { container } = render(<UpgradeReasonBanner reason="settings" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders no banner when reason is undefined', () => {
    const { container } = render(<UpgradeReasonBanner reason={undefined} />);
    expect(container.firstChild).toBeNull();
  });
});
