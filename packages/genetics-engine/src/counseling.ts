/**
 * Genetic Counseling Referral System
 *
 * Determines when genetic counseling is recommended based on analysis results,
 * generates tier-gated referral summaries, and provides a searchable counselor
 * directory filtered by specialty and location.
 *
 * Counseling recommendation triggers:
 * 1. Both parents are carriers for the same disease (25% offspring affected risk)
 * 2. Any high-risk result in carrier analysis
 * 3. High PRS percentile (>90th percentile)
 * 4. Actionable pharmacogenomic findings
 *
 * Tier gating:
 * - Free: recommendation + NSGC link only
 * - Premium: full summary with key findings and specialties
 * - Pro: everything + formatted referral letter
 *
 * Ported from Source/counseling.py (323 lines).
 */

import type {
  CarrierResult,
  CounselingResult,
  CounselingKeyFinding,
  CounselorSpecialty,
  CounselingUrgency,
  Tier,
  CounselingProviderEntry,
} from './types';

// ─── Constants ──────────────────────────────────────────────────────────────

/** NSGC Find a Genetic Counselor URL. */
const NSGC_URL = 'https://www.nsgc.org/findageneticcounselor';

// ─── Urgency Classification ─────────────────────────────────────────────────

/**
 * Compute counseling urgency from carrier analysis results.
 *
 * - 'high': Any high_risk carrier result OR both parents are carriers for the
 *   same disease (25% offspring affected risk).
 * - 'moderate': Any carrier_detected result.
 * - 'informational': No actionable findings.
 *
 * @param carrierResults - Output of analyzeCarrierRisk()
 * @returns CounselingUrgency level
 */
function computeUrgency(carrierResults: CarrierResult[]): CounselingUrgency {
  let hasCarrierDetected = false;

  for (const r of carrierResults) {
    // High urgency: any high_risk result
    if (r.riskLevel === 'high_risk') {
      return 'high';
    }
    // High urgency: both parents are carriers for the same disease
    if (r.parentAStatus === 'carrier' && r.parentBStatus === 'carrier') {
      return 'high';
    }
    if (r.riskLevel === 'carrier_detected') {
      hasCarrierDetected = true;
    }
  }

  if (hasCarrierDetected) {
    return 'moderate';
  }

  return 'informational';
}

// ─── Recommendation Logic ───────────────────────────────────────────────────

/**
 * Decide whether genetic counseling should be recommended.
 *
 * Evaluates multiple trigger conditions from carrier analysis, PRS, and PGx
 * results and returns a recommendation with specific reasons.
 *
 * Trigger conditions (from Source/counseling.py should_recommend_counseling):
 * 1. Both parents are carriers for the same disease
 * 2. Any high-risk carrier result
 * 3. PRS percentile > 90th for any condition
 * 4. Any actionable PGx finding
 *
 * Ported from Source/counseling.py `should_recommend_counseling()`.
 *
 * @param carrierResults - Output of analyzeCarrierRisk()
 * @param prsResults - Optional PRS results (array of {percentile, trait} objects)
 * @param pgxResults - Optional PGx results (array of {actionable, drug} objects)
 * @returns Tuple of [recommend, reasons]
 */
export function shouldRecommendCounseling(
  carrierResults: CarrierResult[],
  prsResults?: Array<{ percentile: number; trait: string }>,
  pgxResults?: Array<{ actionable: boolean; drug: string }>,
): [boolean, string[]] {
  const reasons: string[] = [];

  // 1. Both parents are carriers for the same disease
  for (const r of carrierResults) {
    if (r.parentAStatus === 'carrier' && r.parentBStatus === 'carrier') {
      let riskDescription: string;
      if ('sons' in r.offspringRisk) {
        const sons = r.offspringRisk.sons.affected;
        const daughters = r.offspringRisk.daughters.affected;
        riskDescription = `${sons}% of sons and ${daughters}% of daughters may be affected`;
      } else {
        riskDescription = `offspring have a ${r.offspringRisk.affected}% chance of being affected`;
      }
      reasons.push(`Both parents are carriers for ${r.condition} \u2014 ${riskDescription}`);
    }
  }

  // 2. Any high-risk result
  for (const r of carrierResults) {
    if (r.riskLevel === 'high_risk') {
      const msg = `High-risk result detected for ${r.condition}`;
      if (!reasons.includes(msg)) {
        reasons.push(msg);
      }
    }
  }

  // 3. High PRS percentile (>90th)
  if (prsResults) {
    for (const p of prsResults) {
      if (p.percentile > 90) {
        reasons.push(
          `Polygenic risk score for ${p.trait} ` +
            `is in the ${Math.round(p.percentile)}th percentile (elevated)`,
        );
      }
    }
  }

  // 4. Actionable PGx findings
  if (pgxResults) {
    for (const g of pgxResults) {
      if (g.actionable) {
        reasons.push(`Actionable pharmacogenomic finding for ${g.drug}`);
      }
    }
  }

  return [reasons.length > 0, reasons];
}

/**
 * Create a tier-gated referral summary from carrier analysis results.
 *
 * Tier levels:
 * - Free: recommend + reasons + NSGC link only (summaryText/keyFindings/specialties/letter = null)
 * - Premium: full summary with key findings and recommended specialties
 * - Pro: everything + formatted referral letter
 *
 * Ported from Source/counseling.py `generate_referral_summary()`.
 *
 * @param carrierResults - Output of analyzeCarrierRisk()
 * @param tier - Pricing tier (default: "free")
 * @param userName - Optional user name for the referral letter (pro only)
 * @returns CounselingResult with tier-appropriate fields populated
 */
export function generateReferralSummary(
  carrierResults: CarrierResult[],
  tier: Tier = 'free',
  userName?: string,
  prsResults?: Array<{ percentile: number; trait: string }>,
  pgxResults?: Array<{ actionable: boolean; drug: string }>,
): CounselingResult {
  const [recommend, reasons] = shouldRecommendCounseling(carrierResults, prsResults, pgxResults);
  const urgency = computeUrgency(carrierResults);

  const base: CounselingResult = {
    recommend,
    urgency,
    reasons,
    nsgcUrl: NSGC_URL,
    summaryText: null,
    keyFindings: null,
    recommendedSpecialties: null,
    referralLetter: null,
    upgradeMessage:
      tier === 'free'
        ? 'Upgrade to Premium for detailed counseling summaries with key findings and recommended specialties, or Pro for a personalized referral letter.'
        : tier === 'premium'
          ? 'Upgrade to Pro for a personalized genetic counseling referral letter you can share with your healthcare provider.'
          : null,
  };

  if (tier === 'free') {
    return base;
  }

  // Premium & Pro: full summary
  const keyFindings = extractKeyFindings(carrierResults);
  const specialties = inferSpecialties(carrierResults);

  const highRiskCount = carrierResults.filter((r) => r.riskLevel === 'high_risk').length;
  const carrierCount = carrierResults.filter((r) => r.riskLevel === 'carrier_detected').length;

  const today = new Date().toISOString().split('T')[0];

  let summaryText =
    `Mergenix Genetic Counseling Summary\n` +
    `Generated: ${today}\n\n` +
    `Diseases analyzed: ${carrierResults.length}\n` +
    `High-risk findings: ${highRiskCount}\n` +
    `Carrier findings: ${carrierCount}\n\n`;

  if (recommend) {
    summaryText += 'Recommendation: Genetic counseling is advised.\n';
    for (let i = 0; i < reasons.length; i++) {
      summaryText += `  ${i + 1}. ${reasons[i]}\n`;
    }
  } else {
    summaryText += 'Recommendation: No urgent findings. Routine counseling optional.\n';
  }

  base.summaryText = summaryText;
  base.keyFindings = keyFindings;
  base.recommendedSpecialties = specialties;

  // Pro: referral letter
  if (tier === 'pro') {
    base.referralLetter = formatReferralLetter(userName ?? '', keyFindings, specialties, reasons);
  }

  return base;
}

// ─── Provider Search ────────────────────────────────────────────────────────

/**
 * Filter a provider list by specialty and/or US state.
 *
 * Ported from Source/counseling.py `find_providers_by_specialty()`.
 *
 * @param providers - Array of counseling provider entries
 * @param specialty - Filter by specialty (case-insensitive). Optional.
 * @param state - Filter by US state code (2-letter, case-insensitive). Optional.
 * @returns Filtered array of matching providers
 */
export function findProvidersBySpecialty(
  providers: CounselingProviderEntry[],
  specialty?: string,
  state?: string,
): CounselingProviderEntry[] {
  let results = providers;

  if (specialty) {
    const specLower = specialty.toLowerCase();
    results = results.filter((p) => p.specialty.some((s) => s.toLowerCase() === specLower));
  }

  if (state) {
    const stateUpper = state.toUpperCase();
    results = results.filter((p) => p.state.toUpperCase() === stateUpper);
  }

  return results;
}

// ─── Internal Helpers ────────────────────────────────────────────────────────

/**
 * Extract clinically relevant key findings for the counseling summary.
 *
 * Filters carrier results to only high_risk and carrier_detected entries,
 * extracting condition, gene, risk level, parent statuses, and inheritance.
 *
 * Ported from Source/counseling.py `_extract_key_findings()`.
 *
 * @param carrierResults - Output of analyzeCarrierRisk()
 * @returns Array of key findings
 */
function extractKeyFindings(carrierResults: CarrierResult[]): CounselingKeyFinding[] {
  const findings: CounselingKeyFinding[] = [];

  for (const r of carrierResults) {
    if (r.riskLevel === 'high_risk' || r.riskLevel === 'carrier_detected') {
      findings.push({
        condition: r.condition,
        gene: r.gene,
        riskLevel: r.riskLevel,
        parentAStatus: r.parentAStatus,
        parentBStatus: r.parentBStatus,
        inheritance: r.inheritance,
      });
    }
  }

  return findings;
}

/**
 * Suggest counseling specialties based on disease categories in the findings.
 *
 * Since CarrierResult does not include a `category` field (unlike the Python
 * dict-based results), this function infers specialties by searching the
 * `condition` and `description` fields for category keywords. This is a
 * faithful adaptation: the same keyword patterns are used ("cancer"/"oncolog",
 * "cardio"/"heart", "neuro"/"brain", "pediatr"), just applied to condition
 * and description strings instead of a dedicated category field.
 *
 * Category-to-specialty mapping (from Source/counseling.py _infer_specialties):
 * - "cancer" / "oncolog" -> cancer
 * - "cardio" / "heart" -> cardiovascular
 * - "neuro" / "brain" -> neurogenetics
 * - "pediatr" -> pediatric
 * - carrier_detected results -> carrier_screening
 * - high_risk results -> prenatal
 * - Any findings at all -> general
 *
 * Ported from Source/counseling.py `_infer_specialties()`.
 *
 * @param carrierResults - Output of analyzeCarrierRisk()
 * @returns Sorted array of recommended specialty strings
 */
function inferSpecialties(carrierResults: CarrierResult[]): CounselorSpecialty[] {
  const specs = new Set<CounselorSpecialty>();

  for (const r of carrierResults) {
    if (r.riskLevel !== 'high_risk' && r.riskLevel !== 'carrier_detected') {
      continue;
    }

    // Build a searchable text from condition and description, which together
    // contain the same keywords that the Python code found in the category field
    // (e.g., "Cancer Predisposition" category -> condition often contains "cancer")
    const searchText = `${r.condition} ${r.description}`.toLowerCase();

    // Map disease keywords to counseling specialties
    if (searchText.includes('cancer') || searchText.includes('oncolog')) {
      specs.add('cancer');
    }
    if (searchText.includes('cardio') || searchText.includes('heart')) {
      specs.add('cardiovascular');
    }
    if (searchText.includes('neuro') || searchText.includes('brain')) {
      specs.add('neurogenetics');
    }
    if (searchText.includes('pediatr')) {
      specs.add('pediatric');
    }

    // Carrier screening is always relevant for carrier results
    if (
      r.riskLevel === 'carrier_detected' ||
      (r.parentAStatus === 'carrier' && r.parentBStatus === 'carrier')
    ) {
      specs.add('carrier_screening');
    }

    // Prenatal is recommended for any high-risk finding
    if (r.riskLevel === 'high_risk') {
      specs.add('prenatal');
    }
  }

  // Always include general if we have any findings
  if (specs.size > 0) {
    specs.add('general');
  }

  return [...specs].sort();
}

/**
 * Generate a formatted referral letter for pro-tier users.
 *
 * Includes date, patient name, reasons, key findings, recommended specialties,
 * disclaimer, and NSGC link.
 *
 * Ported from Source/counseling.py `_format_referral_letter()`.
 *
 * @param userName - Patient display name
 * @param keyFindings - Key findings from the analysis
 * @param specialties - Recommended specialties
 * @param reasons - Counseling recommendation reasons
 * @returns Formatted letter string
 */
function formatReferralLetter(
  userName: string,
  keyFindings: CounselingKeyFinding[],
  specialties: CounselorSpecialty[],
  reasons: string[],
): string {
  const today = new Date().toISOString().split('T')[0];
  const nameLine = userName ? `Patient: ${userName}` : '';

  const lines: string[] = [
    'GENETIC COUNSELING REFERRAL',
    '='.repeat(40),
    `Date: ${today}`,
    nameLine,
    '',
    'Dear Genetic Counselor,',
    '',
    'This referral is generated by the Mergenix genetic analysis platform.',
    'The following findings warrant professional genetic counseling:',
    '',
  ];

  if (reasons.length > 0) {
    for (let i = 0; i < reasons.length; i++) {
      lines.push(`  ${i + 1}. ${reasons[i]}`);
    }
    lines.push('');
  }

  if (keyFindings.length > 0) {
    lines.push('Key Findings:');
    for (const f of keyFindings) {
      lines.push(
        `  - ${f.condition} (${f.gene}): ` +
          `Parent A=${f.parentAStatus}, Parent B=${f.parentBStatus} ` +
          `[${f.inheritance}]`,
      );
    }
    lines.push('');
  }

  if (specialties.length > 0) {
    lines.push(`Recommended specialties: ${specialties.join(', ')}`);
    lines.push('');
  }

  lines.push(
    'This report is for informational purposes only and does not constitute',
    'a medical diagnosis. Please review the raw data and clinical context.',
    '',
    'Sincerely,',
    'Mergenix Genetic Analysis Platform',
    `NSGC Directory: ${NSGC_URL}`,
  );

  return lines.join('\n');
}
