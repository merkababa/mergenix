'use client';

// PRIVACY: This file MUST remain client-side. DNA data must NEVER reach the server.

import { useState } from 'react';
import {
  Heart,
  AlertTriangle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Lock,
  Phone,
  MessageSquare,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { Badge } from '@/components/ui/badge';
import { TierUpgradePrompt } from '@/components/genetics/tier-upgrade-prompt';
import { useAnalysisStore } from '@/lib/stores/analysis-store';
import { INHERITANCE_BADGE_MAP, RISK_LABELS } from '@/lib/genetics-constants';
import { LimitationsSection } from './limitations-section';
import type { CounselingUrgency, CounselorSpecialty } from '@mergenix/shared-types';

// ─── Constants ──────────────────────────────────────────────────────────────

/** Urgency-level visual config. */
const URGENCY_CONFIG: Record<
  CounselingUrgency,
  { border: string; iconColor: string; bgTint: string }
> = {
  high: {
    border: 'border-[rgba(244,63,94,0.2)]',
    iconColor: 'text-accent-rose',
    bgTint: 'bg-[rgba(244,63,94,0.04)]',
  },
  moderate: {
    border: 'border-[rgba(245,158,11,0.2)]',
    iconColor: 'text-accent-amber',
    bgTint: 'bg-[rgba(245,158,11,0.04)]',
  },
  informational: {
    border: 'border-[rgba(6,214,160,0.2)]',
    iconColor: 'text-accent-teal',
    bgTint: 'bg-[rgba(6,214,160,0.04)]',
  },
};

/** Map CounselorSpecialty to human-readable labels. */
const SPECIALTY_LABELS: Record<CounselorSpecialty, string> = {
  prenatal: 'Prenatal',
  carrier_screening: 'Carrier Screening',
  cancer: 'Cancer',
  cardiovascular: 'Cardiovascular',
  pediatric: 'Pediatric',
  neurogenetics: 'Neurogenetics',
  pharmacogenomics: 'Pharmacogenomics',
  general: 'General',
};

/** Map risk level strings to Badge variants. */
const RISK_BADGE_MAP: Record<string, string> = {
  high_risk: 'high',
  carrier_detected: 'carrier',
  low_risk: 'normal',
  unknown: 'default',
  potential_risk: 'moderate',
  coverage_insufficient: 'default',
  not_tested: 'default',
};

// ─── Component ──────────────────────────────────────────────────────────────

export function CounselingTab() {
  const fullResults = useAnalysisStore((s) => s.fullResults);
  const [referralExpanded, setReferralExpanded] = useState(false);

  if (!fullResults) return null;

  const { counseling } = fullResults;
  const tier = fullResults.metadata.tier;
  const urgencyStyle = URGENCY_CONFIG[counseling.urgency];

  return (
    <div data-privacy-mask="true" className="space-y-6">
      {/* Supportive intro paragraph */}
      <GlassCard variant="subtle" hover="none" className="p-5">
        <p className="text-sm leading-relaxed text-(--text-body)">
          Genetic information can be complex and sometimes unexpected. Whatever your results show,
          remember that knowledge is a tool that empowers you to make informed decisions for your
          family&apos;s future.
        </p>
      </GlassCard>

      {/* Urgency-colored header card */}
      <GlassCard
        variant="medium"
        hover="none"
        className={`p-6 ${urgencyStyle.border} ${urgencyStyle.bgTint}`}
      >
        <div className="flex items-start gap-4">
          <Heart className={`mt-0.5 h-7 w-7 shrink-0 ${urgencyStyle.iconColor}`} />
          <div className="space-y-2">
            {counseling.recommend ? (
              <>
                <h3 className="font-heading text-lg font-bold text-(--text-heading)">
                  Consider Speaking with a Genetic Counselor
                </h3>
                <p className="text-sm leading-relaxed text-(--text-body)">
                  Based on your results, a genetic counselor can help you understand the
                  implications of certain findings and guide you through your options.
                </p>
              </>
            ) : (
              <>
                <h3 className="font-heading text-lg font-bold text-(--text-heading)">
                  No Urgent Counseling Needed
                </h3>
                <p className="text-sm leading-relaxed text-(--text-body)">
                  Your results did not reveal any findings that require immediate genetic
                  counseling. However, you may still benefit from speaking with a counselor if you
                  have questions about your carrier screening or trait results.
                </p>
              </>
            )}
            {counseling.urgency === 'high' && (
              <p className="text-sm leading-relaxed text-(--text-body) italic">
                We understand this information may be concerning. You&apos;re not alone — support is
                available.
              </p>
            )}
            <Badge
              variant={
                counseling.urgency === 'high'
                  ? 'high'
                  : counseling.urgency === 'moderate'
                    ? 'moderate'
                    : 'low'
              }
            >
              {counseling.urgency === 'high'
                ? 'High Priority'
                : counseling.urgency === 'moderate'
                  ? 'Moderate Priority'
                  : 'Informational'}
            </Badge>
          </div>
        </div>
      </GlassCard>

      {/* Reasons list */}
      {counseling.reasons.length > 0 && (
        <GlassCard variant="medium" hover="none" className="p-5">
          <h4 className="font-heading mb-3 text-sm font-bold text-(--text-heading)">
            Reasons for Recommendation
          </h4>
          <ul className="space-y-2">
            {counseling.reasons.map((reason, index) => (
              <li key={index} className="flex items-start gap-2.5">
                <AlertTriangle className="text-accent-amber mt-0.5 h-4 w-4 shrink-0" />
                <span className="text-sm leading-relaxed text-(--text-body)">{reason}</span>
              </li>
            ))}
          </ul>
        </GlassCard>
      )}

      {/* Key findings */}
      {counseling.keyFindings && counseling.keyFindings.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-heading text-sm font-bold text-(--text-heading)">Key Findings</h4>
          <div className="grid gap-3 sm:grid-cols-2">
            {counseling.keyFindings.map((finding) => (
              <GlassCard
                key={`${finding.gene}-${finding.condition}`}
                variant="subtle"
                hover="none"
                className="p-4"
              >
                <h5 className="font-heading text-sm font-bold text-(--text-heading)">
                  {finding.condition}
                </h5>
                <p className="mt-1 text-xs text-(--text-muted)">Gene: {finding.gene}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge
                    variant={
                      (RISK_BADGE_MAP[finding.riskLevel] ?? 'default') as
                        | 'high'
                        | 'carrier'
                        | 'normal'
                        | 'moderate'
                        | 'default'
                    }
                  >
                    {RISK_LABELS[finding.riskLevel] ?? finding.riskLevel}
                  </Badge>
                  <Badge
                    variant={
                      (INHERITANCE_BADGE_MAP[finding.inheritance] ?? 'default') as
                        | 'autosomal-recessive'
                        | 'autosomal-dominant'
                        | 'x-linked'
                    }
                  >
                    {finding.inheritance.replace(/_/g, ' ')}
                  </Badge>
                  <Badge variant={finding.parentAStatus as 'carrier' | 'affected' | 'normal'}>
                    A: {finding.parentAStatus}
                  </Badge>
                  <Badge variant={finding.parentBStatus as 'carrier' | 'affected' | 'normal'}>
                    B: {finding.parentBStatus}
                  </Badge>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      )}

      {/* Recommended specialties */}
      {counseling.recommendedSpecialties && counseling.recommendedSpecialties.length > 0 && (
        <GlassCard variant="medium" hover="none" className="p-5">
          <h4 className="font-heading mb-3 text-sm font-bold text-(--text-heading)">
            Recommended Specialties
          </h4>
          <div className="flex flex-wrap gap-2">
            {counseling.recommendedSpecialties.map((specialty) => (
              <Badge key={specialty} variant="default">
                {SPECIALTY_LABELS[specialty]}
              </Badge>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Referral letter (pro tier, or free/premium when urgency is high) or locked teaser */}
      {counseling.referralLetter ? (
        <GlassCard variant="medium" hover="none" className="p-5">
          <button
            type="button"
            onClick={() => setReferralExpanded(!referralExpanded)}
            className="flex w-full items-center justify-between text-left"
            aria-expanded={referralExpanded}
            aria-controls="referral-letter-content"
          >
            <h4 className="font-heading text-sm font-bold text-(--text-heading)">
              View Referral Letter
            </h4>
            {referralExpanded ? (
              <ChevronUp className="h-4 w-4 text-(--text-muted)" />
            ) : (
              <ChevronDown className="h-4 w-4 text-(--text-muted)" />
            )}
          </button>
          {referralExpanded && (
            <pre
              id="referral-letter-content"
              aria-label="Referral letter content"
              className="mt-4 overflow-x-auto rounded-lg bg-(--bg-elevated) p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap text-(--text-body)"
            >
              {counseling.referralLetter}
            </pre>
          )}
        </GlassCard>
      ) : tier !== 'pro' && counseling.urgency !== 'high' && counseling.recommend ? (
        <GlassCard variant="medium" hover="none" className="relative overflow-hidden p-5">
          <div className="pointer-events-none blur-xs select-none" aria-hidden="true">
            <h4 className="font-heading text-sm font-bold text-(--text-heading)">
              Referral Letter
            </h4>
            <div className="mt-3 space-y-1.5 font-mono text-xs text-(--text-muted)">
              <p>Dear Genetic Counselor,</p>
              <p>This letter is to refer the couple for genetic counseling...</p>
              <p>Key findings from their carrier screening include...</p>
            </div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center bg-(--bg-glass)/60">
            <div className="text-center">
              <Lock className="text-accent-violet mx-auto mb-2 h-6 w-6" />
              <p className="text-sm font-medium text-(--text-heading)">Pro Feature</p>
            </div>
          </div>
          <div className="relative mt-4">
            <TierUpgradePrompt
              message="Upgrade to Pro to generate a personalized referral letter for your genetic counselor."
              buttonText="Unlock Referral Letter"
            />
          </div>
        </GlassCard>
      ) : null}

      {/* Upgrade prompt */}
      {counseling.upgradeMessage && <TierUpgradePrompt message={counseling.upgradeMessage} />}

      {/* Emotional Support Resources */}
      <GlassCard
        variant="medium"
        hover="none"
        className="border-[rgba(6,182,212,0.15)] bg-[rgba(6,182,212,0.04)] p-5"
      >
        <h4 className="font-heading mb-3 text-sm font-bold text-(--text-heading)">
          Emotional Support Resources
        </h4>
        <ul className="space-y-3">
          <li className="flex items-start gap-3">
            <MessageSquare className="text-accent-cyan mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="text-sm font-medium text-(--text-heading)">Crisis Text Line</p>
              <p className="text-xs text-(--text-muted)">
                Text <span className="font-semibold">HOME</span> to{' '}
                <span className="font-semibold">741741</span>
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <Phone className="text-accent-cyan mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="text-sm font-medium text-(--text-heading)">NSGC (Find a Counselor)</p>
              <p className="text-xs text-(--text-muted)">
                <span className="font-semibold">1-800-233-6742</span> — NSGC office for finding a
                genetic counselor
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <ExternalLink className="text-accent-cyan mt-0.5 h-4 w-4 shrink-0" />
            <a
              href={counseling.nsgcUrl ?? 'https://findageneticcounselor.com'}
              target="_blank"
              rel="noopener noreferrer"
              referrerPolicy="no-referrer"
              className="text-accent-cyan text-sm font-medium underline-offset-2 hover:underline"
            >
              Find a Genetic Counselor (NSGC)
            </a>
          </li>
        </ul>
        <p className="mt-3 text-xs text-(--text-muted)">
          These resources are available in the United States. For international support, contact
          your local genetic counseling service.
        </p>
      </GlassCard>

      {/* Limitations */}
      <LimitationsSection limitations={[]} context="counseling" />
    </div>
  );
}
