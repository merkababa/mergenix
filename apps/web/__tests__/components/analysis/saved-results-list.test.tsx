import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { useAnalysisStore } from "../../../lib/stores/analysis-store";
import { useAuthStore } from "../../../lib/stores/auth-store";

import { mockLucideIcons, mockGlassCardFactory, mockButtonFactory } from '../../__helpers__';

// ─── Mocks ────────────────────────────────────────────────────────────────────
vi.mock("lucide-react", () => mockLucideIcons('Archive', 'Trash2', 'Download', 'Clock', 'FileText', 'Crown'));
vi.mock("@/components/ui/glass-card", () => mockGlassCardFactory());
vi.mock("@/components/ui/button", () => mockButtonFactory());

// ─── Import after mocks ────────────────────────────────────────────────────────

import { SavedResultsList } from "../../../components/analysis/saved-results-list";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockUser = {
  id: "u1",
  email: "a@b.com",
  name: "Test User",
  tier: "premium" as const,
  emailVerified: true,
  totpEnabled: false,
  createdAt: "2025-01-01T00:00:00Z",
};

const mockResult = {
  id: "result-1",
  label: "Our First Analysis",
  parent1Filename: "mom.23andme.txt",
  parent2Filename: "dad.23andme.txt",
  tierAtTime: "premium" as const,
  summary: null,
  createdAt: new Date(Date.now() - 3600 * 1000).toISOString(),
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("SavedResultsList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock loadSavedResults to be a no-op so the component doesn't make API calls
    vi.spyOn(useAnalysisStore.getState(), "loadSavedResults").mockResolvedValue(undefined);
    useAnalysisStore.setState({ savedResults: [] });
  });

  it("renders nothing when user is not authenticated", () => {
    useAuthStore.setState({ isAuthenticated: false, user: null });

    const { container } = render(<SavedResultsList />);

    expect(container.firstChild).toBeNull();
  });

  it("renders the section heading when authenticated", async () => {
    useAuthStore.setState({ isAuthenticated: true, user: mockUser });
    useAnalysisStore.setState({ savedResults: [mockResult] });

    render(<SavedResultsList />);

    await waitFor(() => {
      expect(screen.getByText("My Saved Analyses")).toBeInTheDocument();
    });
  });

  it("Load button is disabled for saved results", async () => {
    useAuthStore.setState({ isAuthenticated: true, user: mockUser });
    useAnalysisStore.setState({ savedResults: [mockResult] });

    render(<SavedResultsList />);

    await waitFor(() => {
      const loadButton = screen.getByRole("button", {
        name: /load analysis: our first analysis/i,
      });
      expect(loadButton).toBeDisabled();
    });
  });

  it('shows "Coming Soon" text next to the disabled Load button', async () => {
    useAuthStore.setState({ isAuthenticated: true, user: mockUser });
    useAnalysisStore.setState({ savedResults: [mockResult] });

    render(<SavedResultsList />);

    await waitFor(() => {
      expect(screen.getByText("Coming Soon")).toBeInTheDocument();
    });
  });

  it("Delete button remains enabled", async () => {
    useAuthStore.setState({ isAuthenticated: true, user: mockUser });
    useAnalysisStore.setState({ savedResults: [mockResult] });

    render(<SavedResultsList />);

    await waitFor(() => {
      const deleteButton = screen.getByRole("button", {
        name: /delete analysis: our first analysis/i,
      });
      expect(deleteButton).not.toBeDisabled();
    });
  });

  it("shows empty state when no saved results", async () => {
    useAuthStore.setState({ isAuthenticated: true, user: mockUser });
    useAnalysisStore.setState({ savedResults: [] });

    render(<SavedResultsList />);

    await waitFor(() => {
      expect(screen.getByText("No saved analyses yet")).toBeInTheDocument();
    });
  });
});
