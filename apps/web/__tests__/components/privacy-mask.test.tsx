/**
 * Tests for data-privacy-mask attribute on sensitive genetics components.
 *
 * These attributes are a defense-in-depth measure that prevents session replay
 * tools (if ever added) from capturing genetic health data.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render } from "@testing-library/react";
import { useAnalysisStore } from "../../lib/stores/analysis-store";
import type { FullAnalysisResult } from "@mergenix/shared-types";

// ─── Mocks ──────────────────────────────────────────────────────────────────

// Mock SensitiveContentGuard to render children directly
vi.mock("@/components/ui/sensitive-content-guard", () => ({
  SensitiveContentGuard: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

// ─── Additional mocks for AnalysisPage ──────────────────────────────────────

vi.mock("@/lib/stores/legal-store", () => ({
  useLegalStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ partnerConsentGiven: false, geneticDataConsentGiven: false, chipLimitationAcknowledged: false }),
}));

vi.mock("@/hooks/use-genetics-worker", () => ({
  useGeneticsWorker: () => ({ startAnalysis: vi.fn(), cancel: vi.fn() }),
}));

vi.mock("next/dynamic", () => ({
  __esModule: true,
  default: () => () => <div>Dynamic Component</div>,
}));

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => (
    <a {...props}>{children}</a>
  ),
}));

vi.mock("@/components/genetics/couple-upload-card", () => ({
  CoupleUploadCard: () => <div data-privacy-mask="true">CoupleUploadCard</div>,
}));

vi.mock("@/components/genetics/analysis-progress", () => ({
  AnalysisProgress: () => <div>Analysis Progress</div>,
}));

vi.mock("@/components/genetics/population-selector", () => ({
  PopulationSelector: () => <div>Population Selector</div>,
}));

vi.mock("@/components/legal/consent-modal", () => ({
  ConsentModal: () => null,
}));

vi.mock("@/components/legal/chip-disclosure-modal", () => ({
  ChipDisclosureModal: () => null,
}));

vi.mock("@/components/analysis/save-result-dialog", () => ({
  SaveResultDialog: () => null,
}));

vi.mock("@/components/analysis/saved-results-list", () => ({
  SavedResultsList: () => null,
}));

vi.mock("@/components/save/save-options-modal", () => ({
  SaveOptionsModal: () => null,
}));

vi.mock("@/components/error-boundary", () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/a11y/high-contrast-toggle", () => ({
  HighContrastToggle: () => null,
}));

vi.mock("@/components/genetics/results/pdf-export-button", () => ({
  PdfExportButton: () => null,
}));

vi.mock("@/components/genetics/results/stale-results-banner", () => ({
  StaleResultsBanner: () => null,
}));

// Mock useAuthStore
vi.mock("@/lib/stores/auth-store", () => ({
  useAuthStore: (
    selector: (s: { user: { tier: string } | null }) => unknown,
  ) => selector({ user: { tier: "pro" } }),
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

// Mock lucide-react icons — explicit mocks to avoid Proxy hangs
vi.mock("lucide-react", () => {
  const Icon = (props: Record<string, unknown>) => <svg {...props} />;
  return {
    Upload: Icon, File: Icon, X: Icon, ArrowRight: Icon,
    Search: Icon, ChevronDown: Icon, ChevronUp: Icon, ChevronRight: Icon, Lock: Icon,
    Pill: Icon, AlertTriangle: Icon, AlertCircle: Icon, Sparkles: Icon,
    Heart: Icon, HeartPulse: Icon, ExternalLink: Icon, Phone: Icon,
    MessageSquare: Icon, BarChart3: Icon, Microscope: Icon, Dna: Icon,
    Info: Icon, Loader2: Icon, ShieldCheck: Icon,
  };
});

// Mock GlassCard to pass through all props (including data-privacy-mask)
vi.mock("@/components/ui/glass-card", () => ({
  GlassCard: ({
    children,
    className,
    ...props
  }: {
    children: React.ReactNode;
    className?: string;
    [key: string]: unknown;
  }) => (
    <div className={className} {...props}>
      {children}
    </div>
  ),
}));

// Mock Button
vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => <button {...props}>{children}</button>,
}));

// Mock PartnerConsentCheckbox
vi.mock("@/components/legal/partner-consent-checkbox", () => ({
  PartnerConsentCheckbox: () => (
    <div data-testid="partner-consent">PartnerConsentCheckbox</div>
  ),
}));

// Mock shared sub-components
vi.mock("@/components/genetics/results/limitations-section", () => ({
  LimitationsSection: () => <div data-testid="limitations">Limitations</div>,
}));

vi.mock("@/components/genetics/results/clinical-testing-banner", () => ({
  ClinicalTestingBanner: () => (
    <div data-testid="clinical-banner">Clinical Banner</div>
  ),
}));

vi.mock("@/components/genetics/results/coverage-meter", () => ({
  CoverageMeter: () => <div data-testid="coverage-meter">Coverage</div>,
}));

vi.mock("@/components/genetics/results/residual-risk-badge", () => ({
  ResidualRiskBadge: () => <div data-testid="residual-risk">Residual</div>,
}));

vi.mock("@/components/genetics/results/cyp2d6-warning", () => ({
  CYP2D6Warning: () => <div data-testid="cyp2d6-warning">CYP2D6</div>,
}));

vi.mock("@/components/genetics/results/ancestry-confidence-badge", () => ({
  AncestryConfidenceBadge: () => <div data-testid="ancestry-badge">Ancestry</div>,
}));

vi.mock("@/components/genetics/results/prs-context-disclaimer", () => ({
  PrsContextDisclaimer: () => <div data-testid="prs-context">PRS Context</div>,
}));

vi.mock("@/components/genetics/punnett-square", () => ({
  PunnettSquare: () => <div data-testid="punnett">Punnett</div>,
}));

vi.mock("@/components/genetics/tier-upgrade-prompt", () => ({
  TierUpgradePrompt: () => <div data-testid="upgrade">Upgrade</div>,
}));

vi.mock("@/components/genetics/medical-disclaimer", () => ({
  MedicalDisclaimer: () => <div data-testid="disclaimer">Disclaimer</div>,
}));

vi.mock("@/components/genetics/prs-gauge", () => ({
  PrsGauge: () => <div data-testid="prs-gauge">PRS Gauge</div>,
}));

vi.mock("@/components/genetics/results/virtual-baby-card", () => ({
  VirtualBabyCard: () => <div data-testid="virtual-baby">Virtual Baby</div>,
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => <span {...props}>{children}</span>,
}));

vi.mock("@/components/ui/input", () => ({
  Input: (props: Record<string, unknown>) => <input {...props} />,
}));

vi.mock("@/components/ui/select-filter", () => ({
  SelectFilter: () => <select data-testid="select-filter" />,
}));

vi.mock("react-virtuoso", () => ({
  Virtuoso: ({
    data,
    itemContent,
  }: {
    data: unknown[];
    itemContent: (index: number, item: unknown) => React.ReactNode;
  }) => (
    <div data-testid="virtuoso">
      {data.map((item, i) => (
        <div key={i}>{itemContent(i, item)}</div>
      ))}
    </div>
  ),
}));

vi.mock("@/lib/constants/disclaimers", () => ({
  PRS_ANCESTRY_WARNING: "PRS ancestry warning text.",
}));

vi.mock("@mergenix/genetics-data", () => ({
  CARRIER_PANEL_COUNT: 423,
  CARRIER_PANEL_COUNT_DISPLAY: "423",
  TRAIT_CATEGORIES: [
    'Physical Appearance',
    'Behavioral/Personality',
    'Athletic/Fitness',
    'Nutrition/Metabolism',
    'Sensory/Perception/Immune',
    'Reproductive/Hormonal',
    'Unusual/Quirky/Fun',
    'Skin/Aging/Longevity',
    'Pharmacogenomic',
    'Cardiovascular/Metabolic',
    'Neurological/Brain',
    'Cancer Risk',
    'Musculoskeletal/Bone',
    'Eye/Vision/Dental',
    'Longevity/Aging/Immunity',
  ],
  TRAIT_COUNT: 476,
  TRAIT_COUNT_DISPLAY: "476",
}));

// ─── Component imports (after mocks) ────────────────────────────────────────

import { CoupleUploadCard } from "../../components/genetics/couple-upload-card";
import { CarrierTab } from "../../components/genetics/results/carrier-tab";
import { TraitsTab } from "../../components/genetics/results/traits-tab";
import { PgxTab } from "../../components/genetics/results/pgx-tab";
import { PrsTab } from "../../components/genetics/results/prs-tab";
import { CounselingTab } from "../../components/genetics/results/counseling-tab";
import { OverviewTab } from "../../components/genetics/results/overview-tab";
import AnalysisPage from "../../app/(app)/analysis/page";

// ─── Fixtures ───────────────────────────────────────────────────────────────

/**
 * Factory for creating mock FullAnalysisResult objects.
 *
 * Centralises the `as unknown as FullAnalysisResult` cast in one place so
 * individual tests stay clean. Pass partial overrides to customise.
 */
function createMockAnalysisResult(
  overrides?: Partial<FullAnalysisResult>,
): FullAnalysisResult {
  return {
    carrier: [
      {
        condition: "Cystic Fibrosis",
        gene: "CFTR",
        severity: "high",
        description: "",
        parentAStatus: "carrier",
        parentBStatus: "carrier",
        offspringRisk: { affected: 25, carrier: 50, normal: 25 },
        riskLevel: "high_risk",
        rsid: "rs1",
        inheritance: "autosomal_recessive",
      },
    ],
    traits: [
      {
        trait: "Eye Color",
        gene: "OCA2",
        rsid: "rs12",
        chromosome: "15",
        description: "",
        confidence: "high",
        inheritance: "codominant",
        status: "success",
        parentAGenotype: "AG",
        parentBGenotype: "AG",
        offspringProbabilities: { Blue: 25, Brown: 75 },
      },
    ],
    pgx: {
      genesAnalyzed: 1,
      tier: "pro",
      isLimited: false,
      upgradeMessage: null,
      disclaimer: "PGx disclaimer",
      results: {
        CYP2D6: {
          gene: "CYP2D6",
          description: "Metabolizes drugs.",
          chromosome: "22",
          parentA: {
            diplotype: "*1/*1",
            metabolizerStatus: { status: "normal_metabolizer", activityScore: 2.0 },
            drugRecommendations: [],
          },
          parentB: {
            diplotype: "*1/*2",
            metabolizerStatus: { status: "normal_metabolizer", activityScore: 2.0 },
            drugRecommendations: [],
          },
          offspringPredictions: [],
        },
      },
    },
    prs: {
      conditionsAvailable: 1,
      conditionsTotal: 10,
      tier: "pro",
      isLimited: false,
      upgradeMessage: null,
      disclaimer: "PRS disclaimer",
      conditions: {
        "Type 2 Diabetes": {
          name: "Type 2 Diabetes",
          snpsUsed: 100,
          snpsMissing: 5,
          ancestryNote: "european",
          parentA: { rawScore: 0.5, percentile: 50, riskCategory: "average" as const },
          parentB: { rawScore: 0.6, percentile: 55, riskCategory: "average" as const },
          offspring: {
            expectedPercentile: 52,
            rangeLow: 40,
            rangeHigh: 65,
            riskCategory: "average" as const,
          },
        },
      },
    },
    counseling: {
      recommend: true,
      urgency: "moderate",
      reasons: ["Both parents are carriers for Cystic Fibrosis."],
      keyFindings: [
        {
          condition: "Cystic Fibrosis",
          gene: "CFTR",
          riskLevel: "high_risk",
          inheritance: "autosomal_recessive",
          parentAStatus: "carrier",
          parentBStatus: "carrier",
        },
      ],
      recommendedSpecialties: ["carrier_screening"],
      referralLetter: null,
      nsgcUrl: "https://findageneticcounselor.com",
      upgradeMessage: null,
    },
    metadata: {
      engineVersion: "1.0.0",
      analysisTimestamp: new Date().toISOString(),
      tier: "pro",
      parent1Format: "23andme",
      parent2Format: "23andme",
      parent1SnpCount: 600000,
      parent2SnpCount: 600000,
      dataVersion: "1.0.0",
    },
    ...overrides,
  } as unknown as FullAnalysisResult;
}

const mockResults: FullAnalysisResult = createMockAnalysisResult();

// ─── Setup ──────────────────────────────────────────────────────────────────

function setStore(overrides?: Partial<FullAnalysisResult>) {
  const results = overrides ? createMockAnalysisResult(overrides) : mockResults;
  useAnalysisStore.setState({
    fullResults: results,
    currentStep: "complete",
    isDemo: false,
    parentA: { name: "parent-a.txt", format: "23andme", size: 1000, snpCount: 600000 },
    parentB: { name: "parent-b.txt", format: "23andme", size: 1000, snpCount: 600000 },
    highRiskCount: 1,
  });
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("data-privacy-mask attribute", () => {
  beforeEach(() => {
    useAnalysisStore.getState().reset();
  });

  it("CoupleUploadCard has data-privacy-mask on its outermost container", () => {
    const { container } = render(
      <CoupleUploadCard
        parentAFile={null}
        parentBFile={null}
        onFileSelectA={() => {}}
        onFileSelectB={() => {}}
      />,
    );
    const masked = container.querySelector('[data-privacy-mask="true"]');
    expect(masked).not.toBeNull();
  });

  it("CarrierTab has data-privacy-mask on its results container", () => {
    setStore();
    const { container } = render(<CarrierTab />);
    const masked = container.querySelector('[data-privacy-mask="true"]');
    expect(masked).not.toBeNull();
  });

  it("TraitsTab has data-privacy-mask on its results container", () => {
    setStore();
    const { container } = render(<TraitsTab />);
    const masked = container.querySelector('[data-privacy-mask="true"]');
    expect(masked).not.toBeNull();
  });

  it("PgxTab has data-privacy-mask on its results container", () => {
    setStore();
    const { container } = render(<PgxTab />);
    const masked = container.querySelector('[data-privacy-mask="true"]');
    expect(masked).not.toBeNull();
  });

  it("PrsTab has data-privacy-mask on its results container", () => {
    setStore();
    const { container } = render(<PrsTab />);
    const masked = container.querySelector('[data-privacy-mask="true"]');
    expect(masked).not.toBeNull();
  });

  it("CounselingTab has data-privacy-mask on its results container", () => {
    setStore();
    const { container } = render(<CounselingTab />);
    const masked = container.querySelector('[data-privacy-mask="true"]');
    expect(masked).not.toBeNull();
  });

  it("OverviewTab has data-privacy-mask on its results container", () => {
    setStore();
    const { container } = render(<OverviewTab />);
    const masked = container.querySelector('[data-privacy-mask="true"]');
    expect(masked).not.toBeNull();
  });

  it("AnalysisPage has data-privacy-mask on its outer section", () => {
    const { container } = render(<AnalysisPage />);
    const section = container.querySelector('section[data-privacy-mask="true"]');
    expect(section).not.toBeNull();
  });
});
