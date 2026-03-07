'use client';

// PRIVACY: This file MUST remain client-side. DNA data must NEVER reach the server.

import { useCallback, useState } from 'react';
import { Lock, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { GlassCard } from '@/components/ui/glass-card';
import { Button, buttonVariants } from '@/components/ui/button';
import { GinaNotice } from '@/components/legal/gina-notice';
import { useAnalysisStore } from '@/lib/stores/analysis-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useLegalStore } from '@/lib/stores/legal-store';
import { useGeneticsWorker } from '@/hooks/use-genetics-worker';
import { SavedResultsList } from '@/components/analysis/saved-results-list';
import { HighContrastToggle } from '@/components/a11y/high-contrast-toggle';
import { usePdfExport } from '@/lib/pdf/use-pdf-export';
import { AnalysisUploadSection } from './analysis-upload-section';
import { AnalysisProgressSection } from './analysis-progress-section';
import { AnalysisResultsSection, RESULT_TABS } from './analysis-results-section';
import { AnalysisModals } from './analysis-modals';

// ─── File-select helper (module-level, not a hook) ──────────────────────────
// Shared logic for handleFileSelectA and handleFileSelectB.
// Using a factory at module scope keeps useCallback calls at the component
// top level (Rules of Hooks compliant) while eliminating duplicated logic.

function applyFileSelect(side: 'A' | 'B', file: File | null): void {
  const state = useAnalysisStore.getState();
  const setFile = side === 'A' ? state.setParentAFile : state.setParentBFile;
  const setParent = side === 'A' ? state.setParentA : state.setParentB;
  setFile(file);
  if (file) {
    setParent({
      name: file.name,
      format: '23andme', // Format is detected during parsing
      size: file.size,
      snpCount: null,
    });
  } else {
    // Clear parent metadata when file is removed
    useAnalysisStore.setState(side === 'A' ? { parentA: null } : { parentB: null });
  }
}

// ─── Analysis Content Component ─────────────────────────────────────────────

export function AnalysisContent() {
  // ── Store selectors ────────────────────────────────────────────────────
  const parentA = useAnalysisStore((s) => s.parentA);
  const parentB = useAnalysisStore((s) => s.parentB);
  const parentAFile = useAnalysisStore((s) => s.parentAFile);
  const parentBFile = useAnalysisStore((s) => s.parentBFile);
  const currentStep = useAnalysisStore((s) => s.currentStep);
  const activeTab = useAnalysisStore((s) => s.activeTab);
  const isDemo = useAnalysisStore((s) => s.isDemo);
  const errorMessage = useAnalysisStore((s) => s.errorMessage);
  const fullResults = useAnalysisStore((s) => s.fullResults);

  const setActiveTab = useAnalysisStore((s) => s.setActiveTab);
  const setDemoResults = useAnalysisStore((s) => s.setDemoResults);
  const reset = useAnalysisStore((s) => s.reset);

  const user = useAuthStore((s) => s.user);
  const userTier = user?.tier ?? 'free';

  // ── Legal consent selectors ──────────────────────────────────────────
  const partnerConsentGiven = useLegalStore((s) => s.partnerConsentGiven);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [showChipDisclosure, setShowChipDisclosure] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);

  // ── Worker hook ────────────────────────────────────────────────────────
  const { startAnalysis, cancel } = useGeneticsWorker();

  // ── PDF export hook ────────────────────────────────────────────────────
  const { generatePdf } = usePdfExport();

  // ── Handlers (H2: stable useCallback references) ─────────────────────

  const handleFileSelectA = useCallback((file: File | null) => applyFileSelect('A', file), []);

  const handleFileSelectB = useCallback((file: File | null) => applyFileSelect('B', file), []);

  // ── Shared analysis start helper ───────────────────────────────────────
  // Checks all consent gates then fires startAnalysis when both files are ready.
  // Called by handleStartAnalysis, handleConsentAccept, and handleChipDisclosureContinue
  // after their modal-specific logic has run (so all gates are already passed).
  const tryStartAnalysis = useCallback(() => {
    const fileA = useAnalysisStore.getState().parentAFile;
    const fileB = useAnalysisStore.getState().parentBFile;
    // Gate: require partner consent when both files are present (couple mode)
    if (fileA && fileB && !useLegalStore.getState().partnerConsentGiven) {
      return;
    }
    if (fileA && fileB) startAnalysis(fileA, fileB);
  }, [startAnalysis]);

  const handleStartAnalysis = useCallback(() => {
    // Gate: require GDPR genetic data consent before starting
    if (!useLegalStore.getState().geneticDataConsentGiven) {
      setShowConsentModal(true);
      return;
    }
    // Gate: require chip limitation acknowledgement before starting
    if (!useLegalStore.getState().chipLimitationAcknowledged) {
      setShowChipDisclosure(true);
      return;
    }
    tryStartAnalysis();
  }, [tryStartAnalysis]);

  const handleConsentAccept = useCallback(() => {
    setShowConsentModal(false);
    // Consent was set in the store by ConsentModal — now check chip disclosure
    if (!useLegalStore.getState().chipLimitationAcknowledged) {
      setShowChipDisclosure(true);
      return;
    }
    tryStartAnalysis();
  }, [tryStartAnalysis]);

  const handleConsentDecline = useCallback(() => {
    setShowConsentModal(false);
    // User declined — stay on the upload page, do not start analysis
  }, []);

  const handleChipDisclosureContinue = useCallback(() => {
    setShowChipDisclosure(false);
    // Chip limitation was acknowledged in the store by ChipDisclosureModal — proceed
    tryStartAnalysis();
  }, [tryStartAnalysis]);

  const handleChipDisclosureCancel = useCallback(() => {
    setShowChipDisclosure(false);
    // User cancelled — stay on the upload page, do not start analysis
  }, []);

  const handleViewDemo = useCallback(async () => {
    try {
      const { DEMO_RESULTS } = await import('@/lib/data/demo-results');
      setDemoResults(DEMO_RESULTS);
    } catch {
      useAnalysisStore
        .getState()
        .setError('Failed to load demo data. Please refresh and try again.');
    }
  }, [setDemoResults]);

  const handleReset = useCallback(() => reset(), [reset]);

  const handleSaveOpen = useCallback(() => setShowSaveModal(true), []);
  const handleSaveClose = useCallback(() => setShowSaveModal(false), []);

  const handleDownloadPdf = useCallback(() => {
    if (fullResults) generatePdf(fullResults);
    setShowSaveModal(false);
  }, [fullResults, generatePdf]);

  // H3: single delegated keyboard handler for the tablist
  const handleTabKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const tabKeys = RESULT_TABS.map((t) => t.key);
      const currentIndex = tabKeys.indexOf(activeTab);
      let nextIndex: number | null = null;

      if (e.key === 'ArrowRight') {
        nextIndex = (currentIndex + 1) % tabKeys.length;
      } else if (e.key === 'ArrowLeft') {
        nextIndex = (currentIndex - 1 + tabKeys.length) % tabKeys.length;
      } else if (e.key === 'Home') {
        nextIndex = 0;
      } else if (e.key === 'End') {
        nextIndex = tabKeys.length - 1;
      }

      if (nextIndex !== null) {
        e.preventDefault();
        setActiveTab(tabKeys[nextIndex]);
        document.getElementById(`tab-${tabKeys[nextIndex]}`)?.focus();
      }
    },
    [activeTab, setActiveTab],
  );

  // ── Derived state ──────────────────────────────────────────────────────
  const isIdle = currentStep === 'idle';
  const isComplete = currentStep === 'complete';
  const isRunning = !isIdle && !isComplete;
  const bothFilesSelected = parentA !== null && parentB !== null;
  // Partner consent is required when both files are selected (couple analysis)
  const canStartAnalysis = bothFilesSelected && partnerConsentGiven;

  return (
    <section data-privacy-mask="true" aria-label="Genetic Analysis">
      {/* ── Header ── */}
      <div className="mb-8 text-center">
        <div className="flex items-center justify-end">
          <HighContrastToggle />
        </div>
        <h1 className="gradient-text font-heading text-3xl font-extrabold md:text-4xl">
          Genetic Analysis
        </h1>
        <p className="text-(--text-muted) mx-auto mt-3 max-w-2xl">
          Upload both parents&apos; DNA files to predict offspring disease risk, traits, and more
        </p>
      </div>

      {/* ── Dynamic tier notice (Business #4) ── */}
      {!isDemo && userTier !== 'pro' && (
        <GlassCard
          variant="subtle"
          hover="none"
          className="mb-8 flex items-center gap-3 border-[rgba(245,158,11,0.15)] p-4"
        >
          <Lock className="text-(--accent-amber) h-5 w-5 shrink-0" />
          <div className="flex-1">
            <p className="text-(--text-body) text-sm">
              {userTier === 'premium' ? (
                <>
                  <span className="font-semibold">Premium tier</span> &mdash;{' '}
                  <span className="text-(--accent-teal)">
                    Upgrade to Pro for genetic counseling referrals.
                  </span>
                </>
              ) : (
                <>
                  <span className="font-semibold">Free tier:</span> All trait predictions included.{' '}
                  <span className="text-(--accent-teal)">
                    Upgrade to Premium for disease screening.
                  </span>
                </>
              )}
            </p>
          </div>
          <Link href="/subscription" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            Upgrade
          </Link>
        </GlassCard>
      )}

      {/* ── GINA Privacy Rights Notice ── */}
      <GinaNotice />

      {/* ── File Upload Section (shown when idle) ── */}
      {isIdle && (
        <AnalysisUploadSection
          hasParentA={!!parentA}
          hasParentB={!!parentB}
          parentAFile={parentAFile}
          parentBFile={parentBFile}
          onFileSelectA={handleFileSelectA}
          onFileSelectB={handleFileSelectB}
          onStartAnalysis={handleStartAnalysis}
          onViewDemo={handleViewDemo}
          bothFilesSelected={bothFilesSelected}
          canStartAnalysis={canStartAnalysis}
        />
      )}

      {/* ── Progress + Cancel (shown when running) ── */}
      {isRunning && <AnalysisProgressSection currentStep={currentStep} onCancel={cancel} />}

      {/* ── Error Display ── */}
      {errorMessage && (
        <GlassCard
          role="alert"
          variant="subtle"
          hover="none"
          className="mt-8 flex items-center gap-3 border-[rgba(244,63,94,0.2)] bg-[rgba(244,63,94,0.04)] p-4"
        >
          <AlertTriangle className="text-(--accent-rose) h-5 w-5 shrink-0" />
          <div className="flex-1">
            <p className="text-(--text-body) text-sm font-medium">Analysis Error</p>
            <p className="text-(--text-muted) mt-0.5 text-sm">{errorMessage}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleReset}>
            Try Again
          </Button>
        </GlassCard>
      )}

      {/* ── Saved Analyses (shown when idle and authenticated) ── */}
      {isIdle && (
        <div className="mt-8">
          <SavedResultsList />
        </div>
      )}

      {/* ── Results Dashboard (shown when complete) ── */}
      {isComplete && (
        <AnalysisResultsSection
          activeTab={activeTab}
          onTabChange={setActiveTab}
          fullResults={fullResults}
          isDemo={isDemo}
          onReset={handleReset}
          onSave={handleSaveOpen}
          onTabKeyDown={handleTabKeyDown}
        />
      )}

      {/* ── Modals ── */}
      <AnalysisModals
        showConsentModal={showConsentModal}
        onConsentAccept={handleConsentAccept}
        onConsentDecline={handleConsentDecline}
        showChipDisclosure={showChipDisclosure}
        onChipContinue={handleChipDisclosureContinue}
        onChipCancel={handleChipDisclosureCancel}
        showSaveModal={showSaveModal}
        onSaveClose={handleSaveClose}
        onDownloadPdf={handleDownloadPdf}
        userTier={userTier}
      />
    </section>
  );
}
