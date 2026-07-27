/**
 * #455: navigating between the desktop (/home) and an agent tab (/agents/:id)
 * must NOT remount DesktopLayout — remounting reloads every open iframe app and
 * discards the hidden-tab state DesktopLayout deliberately preserves.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, useNavigate, Outlet } from 'react-router-dom';
import { AppRoutes } from '../../../src/App';

const mounts = vi.hoisted(() => ({ count: 0 }));

// Count how many times DesktopLayout mounts across navigation.
vi.mock('../../../src/components/desktop/DesktopLayout', async () => {
  const { useEffect } = await import('react');
  return {
    DesktopLayout: () => {
      useEffect(() => {
        mounts.count += 1;
      }, []);
      return <div data-testid="desktop-layout" />;
    },
  };
});

// DashboardLayout just needs to render its Outlet for this test.
vi.mock('../../../src/components/layout/DashboardLayout', () => ({
  DashboardLayout: () => <Outlet />,
}));

// Eager route pages we never navigate to — stub so their asset imports (svg)
// don't load in the test environment.
vi.mock('../../../src/pages/IntroPage', () => ({ IntroPage: () => null }));
vi.mock('../../../src/pages/ConnectPage', () => ({ ConnectPage: () => null }));
vi.mock('../../../src/sdk', () => ({ useSphereEvents: () => {} }));

// The page components' desktop-state side effects are irrelevant here.
vi.mock('../../../src/hooks/useDesktopState', () => ({
  useDesktopState: () => ({ activeTabId: null, showDesktop: vi.fn(), openTab: vi.fn() }),
  useActiveTabId: () => null,
}));

function Nav() {
  const navigate = useNavigate();
  return (
    <>
      <button onClick={() => navigate('/home')}>go-home</button>
      <button onClick={() => navigate('/agents/custom')}>go-agent</button>
    </>
  );
}

beforeEach(() => {
  mounts.count = 0;
});

describe('desktop <-> agent navigation', () => {
  it('keeps DesktopLayout mounted (no remount) across /home <-> /agents', () => {
    render(
      <MemoryRouter initialEntries={['/home']}>
        <AppRoutes />
        <Nav />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('desktop-layout')).toBeDefined();
    expect(mounts.count).toBe(1);

    fireEvent.click(screen.getByText('go-agent'));
    fireEvent.click(screen.getByText('go-home'));
    fireEvent.click(screen.getByText('go-agent'));

    // A stable shared layout mounts DesktopLayout exactly once.
    expect(mounts.count).toBe(1);
  });
});
