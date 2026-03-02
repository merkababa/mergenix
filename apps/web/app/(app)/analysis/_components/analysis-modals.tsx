"use client";

import { ConsentModal } from "@/components/legal/consent-modal";
import { ChipDisclosureModal } from "@/components/legal/chip-disclosure-modal";
import { SaveOptionsModal } from "@/components/save/save-options-modal";
import type { Tier } from "@mergenix/shared-types";

// ─── Props ───────────────────────────────────────────────────────────────────

export interface AnalysisModalsProps {
  showConsentModal: boolean;
  onConsentAccept: () => void;
  onConsentDecline: () => void;
  showChipDisclosure: boolean;
  onChipContinue: () => void;
  onChipCancel: () => void;
  showSaveModal: boolean;
  onSaveClose: () => void;
  onDownloadPdf: () => void;
  userTier: Tier;
}

// ─── Analysis Modals ─────────────────────────────────────────────────────────

export function AnalysisModals({
  showConsentModal,
  onConsentAccept,
  onConsentDecline,
  showChipDisclosure,
  onChipContinue,
  onChipCancel,
  showSaveModal,
  onSaveClose,
  onDownloadPdf,
  userTier,
}: AnalysisModalsProps) {
  return (
    <>
      {/* ── GDPR Consent Modal (shown before first analysis) ── */}
      <ConsentModal
        isOpen={showConsentModal}
        onAccept={onConsentAccept}
        onDecline={onConsentDecline}
      />
      {/* ── Chip Limitation Disclosure (shown before first analysis for all users) ── */}
      <ChipDisclosureModal
        isOpen={showChipDisclosure}
        onContinue={onChipContinue}
        onCancel={onChipCancel}
      />
      {/* ── Save Options Modal (PDF download / cloud save) ── */}
      <SaveOptionsModal
        isOpen={showSaveModal}
        onClose={onSaveClose}
        onDownloadPDF={onDownloadPdf}
        tier={userTier}
      />
    </>
  );
}
