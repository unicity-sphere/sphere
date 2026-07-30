import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// vi.mock factories are hoisted above regular top-level `const`s, so the mocks
// referenced inside the factory below must themselves be created via vi.hoisted
// to avoid a TDZ ReferenceError when ExplorePage's import of useMarketplace is
// resolved.
const { useProjects, useFeaturedProjects } = vi.hoisted(() => ({
  useProjects: vi.fn(() => ({ data: { projects: [] }, isLoading: false })),
  useFeaturedProjects: vi.fn(() => ({ data: [] })),
}));

vi.mock('../../../src/hooks/useMarketplace', () => ({
  useProjects,
  useFeaturedProjects,
  useProjectMetricsBatch: () => ({ data: {} }),
}));
vi.mock('../../../src/hooks/useMaintenanceStatus', () => ({
  useMaintenanceStatus: () => ({ data: { enabled: false } }),
}));

import { MemoryRouter } from 'react-router-dom';
import { ExplorePage } from '../../../src/pages/ExplorePage';

// The page links out (project cards, the dev-portal CTA), so a router has to be
// present even though the mocked queries return no projects.
const renderExplore = () => render(<MemoryRouter><ExplorePage /></MemoryRouter>);

beforeEach(() => { vi.clearAllMocks(); });

describe('Explore type tabs', () => {
  it('starts on Apps', () => {
    renderExplore();
    expect(useProjects).toHaveBeenCalledWith({ type: 'app' });
    expect(useFeaturedProjects).toHaveBeenCalledWith('app');
  });

  it('switches the query to standalone projects', () => {
    renderExplore();
    fireEvent.click(screen.getByRole('button', { name: /Standalone/i }));
    expect(useProjects).toHaveBeenLastCalledWith({ type: 'sdk' });
    expect(useFeaturedProjects).toHaveBeenLastCalledWith('sdk');
  });
});
