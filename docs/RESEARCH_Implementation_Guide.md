# Implementation Guide: UX/UI Best Practices for Tortit
**Target**: Offspring Analysis Tool
**Framework**: React/TypeScript (based on existing Tortit codebase)

---

## Table of Contents
1. [Accessible Color System](#1-accessible-color-system)
2. [Progressive Disclosure Components](#2-progressive-disclosure-components)
3. [Pictographic Risk Visualization](#3-pictographic-risk-visualization)
4. [Empathetic Microcopy Library](#4-empathetic-microcopy-library)
5. [Privacy & Consent Flow](#5-privacy--consent-flow)
6. [Interactive Punnett Square](#6-interactive-punnett-square)
7. [PDF Report Generation](#7-pdf-report-generation)
8. [Mobile-First Responsive Patterns](#8-mobile-first-responsive-patterns)

---

## 1. Accessible Color System

### Design Tokens (Theme Configuration)

```typescript
// src/theme/riskColors.ts

export const riskColors = {
  high: {
    background: '#FFEBEE',      // Light red background
    border: '#D32F2F',          // Strong red border
    text: '#B71C1C',            // Dark red text
    icon: '⚠️',
    iconColor: '#D32F2F',
    label: 'High Risk',
    ariaLabel: 'High risk of affected offspring'
  },
  moderate: {
    background: '#FFF3E0',      // Light orange background
    border: '#F57C00',          // Orange border
    text: '#E65100',            // Dark orange text
    icon: 'ⓘ',
    iconColor: '#F57C00',
    label: 'Moderate Risk',
    ariaLabel: 'Moderate risk of affected offspring'
  },
  low: {
    background: '#E3F2FD',      // Light blue background (NOT green!)
    border: '#1976D2',          // Blue border
    text: '#0D47A1',            // Dark blue text
    icon: '✓',
    iconColor: '#1976D2',
    label: 'Low Risk',
    ariaLabel: 'Low risk of affected offspring'
  },
  none: {
    background: '#F5F5F5',      // Light gray background
    border: '#757575',          // Medium gray border
    text: '#424242',            // Dark gray text
    icon: '—',
    iconColor: '#757575',
    label: 'Not a Carrier',
    ariaLabel: 'Not a carrier for this condition'
  }
} as const;

export type RiskLevel = keyof typeof riskColors;
```

### Risk Badge Component

```tsx
// src/components/RiskBadge.tsx

import React from 'react';
import { riskColors, RiskLevel } from '../theme/riskColors';

interface RiskBadgeProps {
  level: RiskLevel;
  showLabel?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({
  level,
  showLabel = true,
  size = 'medium'
}) => {
  const config = riskColors[level];

  const sizeClasses = {
    small: 'px-2 py-1 text-xs',
    medium: 'px-3 py-1.5 text-sm',
    large: 'px-4 py-2 text-base'
  };

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-md border-2 font-medium ${sizeClasses[size]}`}
      style={{
        backgroundColor: config.background,
        borderColor: config.border,
        color: config.text
      }}
      role="status"
      aria-label={config.ariaLabel}
    >
      <span className="text-lg" aria-hidden="true">{config.icon}</span>
      {showLabel && <span>{config.label}</span>}
    </div>
  );
};
```

### Usage Example

```tsx
// In OffspringAnalysisPage.tsx
<RiskBadge level="high" />
<RiskBadge level="moderate" size="small" />
<RiskBadge level="low" showLabel={false} />
```

---

## 2. Progressive Disclosure Components

### Multi-Stage Result Reveal

```tsx
// src/components/ProgressiveResultsDisclosure.tsx

import React, { useState } from 'react';

type DisclosureStage = 'upload' | 'personal' | 'partner' | 'offspring';

interface ProgressiveResultsDisclosureProps {
  currentStage: DisclosureStage;
  onStageChange: (stage: DisclosureStage) => void;
}

export const ProgressiveResultsDisclosure: React.FC<ProgressiveResultsDisclosureProps> = ({
  currentStage,
  onStageChange
}) => {
  const stages = [
    { id: 'upload' as const, label: 'Upload Data', description: 'Upload your genetic data file' },
    { id: 'personal' as const, label: 'Your Status', description: 'View your carrier status' },
    { id: 'partner' as const, label: 'Partner Comparison', description: 'Compare with partner (optional)' },
    { id: 'offspring' as const, label: 'Offspring Analysis', description: 'Calculate probabilities' }
  ];

  const currentIndex = stages.findIndex(s => s.id === currentStage);

  return (
    <div className="space-y-6">
      {/* Progress Indicator */}
      <div className="flex items-center justify-between">
        {stages.map((stage, index) => (
          <React.Fragment key={stage.id}>
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                  index <= currentIndex
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
                aria-current={index === currentIndex ? 'step' : undefined}
              >
                {index + 1}
              </div>
              <span className="text-xs mt-2 text-center max-w-[80px]">
                {stage.label}
              </span>
            </div>
            {index < stages.length - 1 && (
              <div
                className={`flex-1 h-1 mx-2 ${
                  index < currentIndex ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Stage Content */}
      <div className="bg-white rounded-lg shadow-md p-6">
        {currentStage === 'personal' && (
          <PersonalStatusStage onContinue={() => onStageChange('partner')} />
        )}
        {currentStage === 'partner' && (
          <PartnerComparisonStage
            onContinue={() => onStageChange('offspring')}
            onSkip={() => onStageChange('offspring')}
          />
        )}
        {currentStage === 'offspring' && (
          <OffspringAnalysisStage />
        )}
      </div>
    </div>
  );
};

// Stage Components with Opt-In Patterns

const PersonalStatusStage: React.FC<{ onContinue: () => void }> = ({ onContinue }) => {
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">Your Carrier Status</h2>

      {!revealed ? (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 text-center">
          <p className="text-gray-700 mb-4">
            Your results are ready. When you're ready, click below to view your carrier status.
          </p>
          <button
            onClick={() => setRevealed(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-md font-semibold hover:bg-blue-700 transition"
          >
            View My Results
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Actual results shown here */}
          <div className="border-l-4 border-blue-600 pl-4 py-2">
            <p className="text-gray-700">
              You are a carrier for <strong>3 genetic conditions</strong>.
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Being a carrier means you have one copy of a genetic variant. Carriers typically don't show symptoms.
            </p>
          </div>

          {/* Detailed condition list */}
          <div className="space-y-2">
            {/* Condition cards here */}
          </div>

          <div className="flex gap-4 mt-6">
            <button
              onClick={onContinue}
              className="bg-blue-600 text-white px-6 py-2 rounded-md font-semibold hover:bg-blue-700"
            >
              Compare with Partner
            </button>
            <button className="text-blue-600 hover:underline">
              Learn More About Carrier Status
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const PartnerComparisonStage: React.FC<{
  onContinue: () => void;
  onSkip: () => void;
}> = ({ onContinue, onSkip }) => {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">Partner Comparison</h2>
      <p className="text-gray-700">
        To calculate offspring risk, we need to compare your results with a partner's genetic data.
      </p>

      <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-gray-700">
          <strong>Privacy Note:</strong> Partner data linking requires consent from both individuals.
          Each person maintains control over their own genetic information.
        </p>
      </div>

      <div className="flex gap-4">
        <button
          onClick={onContinue}
          className="bg-blue-600 text-white px-6 py-2 rounded-md font-semibold hover:bg-blue-700"
        >
          Link Partner Data
        </button>
        <button
          onClick={onSkip}
          className="border-2 border-gray-300 text-gray-700 px-6 py-2 rounded-md font-semibold hover:bg-gray-50"
        >
          Skip for Now
        </button>
      </div>
    </div>
  );
};

const OffspringAnalysisStage: React.FC = () => {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">Offspring Risk Analysis</h2>
      {/* Full offspring analysis with pictographs, Punnett squares, etc. */}
    </div>
  );
};
```

---

## 3. Pictographic Risk Visualization

### Icon Array Component (100-Dot Grid)

```tsx
// src/components/PictographicRisk.tsx

import React, { useState } from 'react';

interface PictographicRiskProps {
  affectedPercent: number;    // e.g., 25 for 25%
  carrierPercent: number;     // e.g., 50 for 50%
  unaffectedPercent: number;  // e.g., 25 for 25%
}

export const PictographicRisk: React.FC<PictographicRiskProps> = ({
  affectedPercent,
  carrierPercent,
  unaffectedPercent
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Generate 100 dots
  const dots = Array.from({ length: 100 }, (_, i) => {
    if (i < affectedPercent) return 'affected';
    if (i < affectedPercent + carrierPercent) return 'carrier';
    return 'unaffected';
  });

  const getColor = (type: string) => {
    switch (type) {
      case 'affected': return '#D32F2F';   // Red
      case 'carrier': return '#F57C00';    // Orange
      case 'unaffected': return '#1976D2'; // Blue
      default: return '#757575';           // Gray
    }
  };

  const getLabel = (type: string) => {
    switch (type) {
      case 'affected': return 'May be affected';
      case 'carrier': return 'May be carrier';
      case 'unaffected': return 'Unaffected';
      default: return '';
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-900">
          Out of 100 Potential Offspring
        </h3>

        {/* Icon Grid */}
        <div className="grid grid-cols-10 gap-1 mb-4">
          {dots.map((type, index) => (
            <div
              key={index}
              className="w-full aspect-square rounded-sm transition-transform cursor-pointer hover:scale-125"
              style={{ backgroundColor: getColor(type) }}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              aria-label={`Child ${index + 1}: ${getLabel(type)}`}
              role="img"
            />
          ))}
        </div>

        {/* Hover Tooltip */}
        {hoveredIndex !== null && (
          <div className="bg-white border-2 border-gray-300 rounded-md p-3 text-sm">
            <strong>Child #{hoveredIndex + 1}:</strong> {getLabel(dots[hoveredIndex])}
          </div>
        )}

        {/* Legend */}
        <div className="space-y-2 mt-6">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-sm" style={{ backgroundColor: '#D32F2F' }} />
            <span className="text-sm">
              <strong>{affectedPercent}</strong> may be affected ({affectedPercent}%)
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-sm" style={{ backgroundColor: '#F57C00' }} />
            <span className="text-sm">
              <strong>{carrierPercent}</strong> may be carriers ({carrierPercent}%)
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-sm" style={{ backgroundColor: '#1976D2' }} />
            <span className="text-sm">
              <strong>{unaffectedPercent}</strong> unaffected ({unaffectedPercent}%)
            </span>
          </div>
        </div>
      </div>

      {/* Plain Language Summary */}
      <div className="bg-blue-50 border-l-4 border-blue-600 p-4">
        <p className="text-gray-800">
          <strong>What this means:</strong> If both parents are carriers, about{' '}
          <strong>1 in {Math.round(100 / affectedPercent)} children</strong> may inherit
          this condition.
        </p>
      </div>
    </div>
  );
};

// Usage
<PictographicRisk affectedPercent={25} carrierPercent={50} unaffectedPercent={25} />
```

---

## 4. Empathetic Microcopy Library

### Copy Templates

```typescript
// src/constants/microcopy.ts

export const microcopy = {
  // Results Reveal
  resultsReady: {
    title: "Your Results Are Ready",
    description: "When you're ready, we'll walk through what your genetic data shows.",
    cta: "View My Results"
  },

  // Carrier Status
  carrierStatus: {
    isCarrier: "Your results show carrier status for {count} condition{plural}. Let's explore what this means.",
    notCarrier: "Great news! You are not a carrier for any of the {totalTested} conditions we tested.",
    whatIsCarrier: "Being a carrier means you have one copy of a genetic variant. Carriers typically don't show symptoms, but can pass the variant to their children."
  },

  // Risk Communication
  riskExplanation: {
    bothCarriers: "When both parents are carriers, about 1 in 4 children may inherit the condition.",
    oneCarrier: "When only one parent is a carrier, children will not be affected, but may be carriers themselves.",
    lowRisk: "Based on your results, the risk of having an affected child for this condition is low."
  },

  // Privacy & Consent
  privacy: {
    dataUse: "Your genetic data is encrypted and never shared without your explicit consent.",
    partnerLink: "Linking partner data requires consent from both individuals. Each person maintains full control over their own information.",
    deletion: "You can request deletion of your data at any time from your account settings."
  },

  // Support Resources
  support: {
    counselorCTA: "Have questions? Talk to a genetic counselor",
    learnMore: "Learn more about {conditionName}",
    supportGroups: "Connect with others in the {conditionName} community"
  },

  // Errors & Edge Cases
  errors: {
    uploadFailed: "We couldn't process your file. Please check that it's in the correct format and try again.",
    partnerNotFound: "We couldn't find that partner account. Please double-check the email address.",
    analysisIncomplete: "Your analysis is still processing. We'll notify you when it's ready (usually within 24 hours)."
  }
} as const;

// Helper function for dynamic text
export function getMicrocopy(
  path: string,
  replacements: Record<string, string | number> = {}
): string {
  const keys = path.split('.');
  let value: any = microcopy;

  for (const key of keys) {
    value = value[key];
    if (value === undefined) return path;
  }

  let text = String(value);
  for (const [key, replacement] of Object.entries(replacements)) {
    text = text.replace(`{${key}}`, String(replacement));
  }

  return text;
}

// Usage
const message = getMicrocopy('carrierStatus.isCarrier', {
  count: 3,
  plural: 's'
});
// Returns: "Your results show carrier status for 3 conditions. Let's explore what this means."
```

---

## 5. Privacy & Consent Flow

### Multi-Step Consent Component

```tsx
// src/components/PrivacyConsentFlow.tsx

import React, { useState } from 'react';

interface ConsentState {
  geneticAnalysis: boolean;
  partnerLinking: boolean;
  dataRetention: boolean;
  researchParticipation: boolean;
}

export const PrivacyConsentFlow: React.FC<{
  onComplete: (consents: ConsentState) => void;
}> = ({ onComplete }) => {
  const [consents, setConsents] = useState<ConsentState>({
    geneticAnalysis: false,
    partnerLinking: false,
    dataRetention: false,
    researchParticipation: false
  });

  const [showDetails, setShowDetails] = useState<string | null>(null);

  const consentItems = [
    {
      id: 'geneticAnalysis' as const,
      required: true,
      title: 'Genetic Data Analysis',
      description: 'I consent to Tortit analyzing my uploaded genetic data to identify carrier status.',
      details: 'We will analyze your raw genetic data (23andMe, AncestryDNA, etc.) against a panel of 371 genetic conditions. Your data is encrypted in transit and at rest.'
    },
    {
      id: 'partnerLinking' as const,
      required: false,
      title: 'Partner Data Linking',
      description: 'I consent to linking my genetic data with a partner\'s data for offspring analysis.',
      details: 'This allows comparison of carrier status between partners to calculate offspring risk. Both partners must consent. You can unlink at any time.'
    },
    {
      id: 'dataRetention' as const,
      required: false,
      title: 'Data Retention',
      description: 'I consent to Tortit retaining my genetic data for future analysis and updates.',
      details: 'As genetic research advances, we may update our disease panel. Retaining data allows us to notify you of new findings. You can request deletion at any time.'
    },
    {
      id: 'researchParticipation' as const,
      required: false,
      title: 'De-Identified Research Use',
      description: 'I consent to my de-identified data being used for genetic research.',
      details: 'Your data would be anonymized (all personally identifying information removed) and used only for aggregate statistical research. This is optional and does not affect your service.'
    }
  ];

  const allRequiredConsented = consentItems
    .filter(item => item.required)
    .every(item => consents[item.id]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Privacy & Consent</h2>
        <p className="text-gray-600 mb-6">
          Please review and consent to the following to continue with your genetic analysis.
        </p>

        <div className="space-y-4">
          {consentItems.map(item => (
            <div key={item.id} className="border-2 border-gray-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id={item.id}
                  checked={consents[item.id]}
                  onChange={(e) => setConsents(prev => ({
                    ...prev,
                    [item.id]: e.target.checked
                  }))}
                  className="mt-1 w-5 h-5 text-blue-600"
                />
                <div className="flex-1">
                  <label htmlFor={item.id} className="flex items-center gap-2 cursor-pointer">
                    <span className="font-semibold text-gray-900">{item.title}</span>
                    {item.required && (
                      <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded">
                        Required
                      </span>
                    )}
                  </label>
                  <p className="text-sm text-gray-600 mt-1">{item.description}</p>

                  {showDetails === item.id ? (
                    <div className="mt-3 bg-gray-50 rounded p-3 text-sm text-gray-700">
                      {item.details}
                      <button
                        onClick={() => setShowDetails(null)}
                        className="text-blue-600 hover:underline mt-2 block"
                      >
                        Hide details
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowDetails(item.id)}
                      className="text-blue-600 hover:underline text-sm mt-2"
                    >
                      Learn more
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex gap-4">
          <button
            onClick={() => onComplete(consents)}
            disabled={!allRequiredConsented}
            className={`flex-1 py-3 rounded-md font-semibold transition ${
              allRequiredConsented
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Continue
          </button>
        </div>

        <div className="mt-4 text-xs text-gray-500 text-center">
          By continuing, you agree to our{' '}
          <a href="/privacy-policy" className="text-blue-600 hover:underline">Privacy Policy</a>
          {' '}and{' '}
          <a href="/terms" className="text-blue-600 hover:underline">Terms of Service</a>
        </div>
      </div>
    </div>
  );
};
```

---

## 6. Interactive Punnett Square

```tsx
// src/components/InteractivePunnettSquare.tsx

import React, { useState } from 'react';

interface PunnettSquareProps {
  parent1Genotype: 'AA' | 'Aa' | 'aa';
  parent2Genotype: 'AA' | 'Aa' | 'aa';
  conditionName: string;
}

export const InteractivePunnettSquare: React.FC<PunnettSquareProps> = ({
  parent1Genotype,
  parent2Genotype,
  conditionName
}) => {
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);

  // Calculate Punnett square
  const p1Alleles = parent1Genotype.split('');
  const p2Alleles = parent2Genotype.split('');

  const grid = [
    [p1Alleles[0] + p2Alleles[0], p1Alleles[0] + p2Alleles[1]],
    [p1Alleles[1] + p2Alleles[0], p1Alleles[1] + p2Alleles[1]]
  ];

  // Determine phenotype
  const getPhenotype = (genotype: string) => {
    const sorted = genotype.split('').sort().join('');
    if (sorted === 'AA') return 'unaffected';
    if (sorted === 'Aa' || sorted === 'aA') return 'carrier';
    if (sorted === 'aa') return 'affected';
    return 'unknown';
  };

  const getColor = (phenotype: string) => {
    switch (phenotype) {
      case 'affected': return '#FFEBEE';
      case 'carrier': return '#FFF3E0';
      case 'unaffected': return '#E3F2FD';
      default: return '#F5F5F5';
    }
  };

  const getBorderColor = (phenotype: string) => {
    switch (phenotype) {
      case 'affected': return '#D32F2F';
      case 'carrier': return '#F57C00';
      case 'unaffected': return '#1976D2';
      default: return '#757575';
    }
  };

  // Calculate ratios
  const allCells = grid.flat();
  const counts = allCells.reduce((acc, cell) => {
    const phenotype = getPhenotype(cell);
    acc[phenotype] = (acc[phenotype] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">
          Inheritance Pattern for {conditionName}
        </h3>

        {/* Punnett Square Grid */}
        <div className="flex justify-center mb-6">
          <div className="inline-grid grid-cols-[auto_1fr_1fr] gap-2">
            {/* Header row */}
            <div />
            <div className="text-center font-semibold text-sm p-2">
              Parent 2: {p2Alleles[0]}
            </div>
            <div className="text-center font-semibold text-sm p-2">
              Parent 2: {p2Alleles[1]}
            </div>

            {/* Row 1 */}
            <div className="flex items-center justify-end font-semibold text-sm pr-2">
              Parent 1: {p1Alleles[0]}
            </div>
            {[0, 1].map(col => {
              const genotype = grid[0][col];
              const phenotype = getPhenotype(genotype);
              return (
                <div
                  key={`0-${col}`}
                  className="w-24 h-24 flex items-center justify-center text-lg font-bold border-4 rounded-lg cursor-pointer transition-transform hover:scale-105"
                  style={{
                    backgroundColor: getColor(phenotype),
                    borderColor: getBorderColor(phenotype)
                  }}
                  onMouseEnter={() => setHoveredCell(`${genotype}-${phenotype}`)}
                  onMouseLeave={() => setHoveredCell(null)}
                >
                  {genotype}
                </div>
              );
            })}

            {/* Row 2 */}
            <div className="flex items-center justify-end font-semibold text-sm pr-2">
              Parent 1: {p1Alleles[1]}
            </div>
            {[0, 1].map(col => {
              const genotype = grid[1][col];
              const phenotype = getPhenotype(genotype);
              return (
                <div
                  key={`1-${col}`}
                  className="w-24 h-24 flex items-center justify-center text-lg font-bold border-4 rounded-lg cursor-pointer transition-transform hover:scale-105"
                  style={{
                    backgroundColor: getColor(phenotype),
                    borderColor: getBorderColor(phenotype)
                  }}
                  onMouseEnter={() => setHoveredCell(`${genotype}-${phenotype}`)}
                  onMouseLeave={() => setHoveredCell(null)}
                >
                  {genotype}
                </div>
              );
            })}
          </div>
        </div>

        {/* Hover Tooltip */}
        {hoveredCell && (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-700">
              Genotype: <strong>{hoveredCell.split('-')[0]}</strong>
              {' → '}
              {hoveredCell.split('-')[1] === 'affected' && 'Affected individual'}
              {hoveredCell.split('-')[1] === 'carrier' && 'Carrier (no symptoms)'}
              {hoveredCell.split('-')[1] === 'unaffected' && 'Unaffected'}
            </p>
          </div>
        )}

        {/* Ratio Summary */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <h4 className="font-semibold text-gray-900 mb-3">Probability of Each Outcome:</h4>
          {counts.affected && (
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded border-2" style={{
                backgroundColor: getColor('affected'),
                borderColor: getBorderColor('affected')
              }} />
              <span className="text-sm">
                <strong>{counts.affected}/4 ({(counts.affected / 4 * 100).toFixed(0)}%)</strong> may be affected
              </span>
            </div>
          )}
          {counts.carrier && (
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded border-2" style={{
                backgroundColor: getColor('carrier'),
                borderColor: getBorderColor('carrier')
              }} />
              <span className="text-sm">
                <strong>{counts.carrier}/4 ({(counts.carrier / 4 * 100).toFixed(0)}%)</strong> may be carriers
              </span>
            </div>
          )}
          {counts.unaffected && (
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded border-2" style={{
                backgroundColor: getColor('unaffected'),
                borderColor: getBorderColor('unaffected')
              }} />
              <span className="text-sm">
                <strong>{counts.unaffected}/4 ({(counts.unaffected / 4 * 100).toFixed(0)}%)</strong> unaffected
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Educational Note */}
      <div className="bg-blue-50 border-l-4 border-blue-600 p-4">
        <h4 className="font-semibold text-gray-900 mb-2">Understanding This Chart</h4>
        <p className="text-sm text-gray-700">
          This Punnett square shows all possible genetic combinations for your potential children.
          Each child has these probabilities independently—this doesn't mean exactly these ratios
          will occur in your family.
        </p>
      </div>
    </div>
  );
};

// Usage
<InteractivePunnettSquare
  parent1Genotype="Aa"
  parent2Genotype="Aa"
  conditionName="Cystic Fibrosis"
/>
```

---

## 7. PDF Report Generation

### Report Templates (using react-pdf)

```tsx
// src/components/PDFReport/SummaryReport.tsx

import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica' },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  section: { marginBottom: 15 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 5 },
  text: { fontSize: 11, lineHeight: 1.5 },
  riskBadge: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 5,
    borderRadius: 4,
    marginVertical: 3
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: '#666',
    textAlign: 'center'
  }
});

interface ReportData {
  userName: string;
  reportDate: string;
  carrierConditions: Array<{
    name: string;
    omimId: string;
    inheritance: string;
  }>;
  partnerName?: string;
  sharedRisks?: Array<{
    condition: string;
    offspringRisk: number;
  }>;
}

export const SummaryReport: React.FC<{ data: ReportData }> = ({ data }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.section}>
        <Text style={styles.header}>Genetic Carrier Screening Report</Text>
        <Text style={styles.text}>Name: {data.userName}</Text>
        <Text style={styles.text}>Report Date: {data.reportDate}</Text>
      </View>

      {/* Executive Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Executive Summary</Text>
        <Text style={styles.text}>
          This report summarizes your carrier status for {data.carrierConditions.length} genetic
          condition{data.carrierConditions.length !== 1 ? 's' : ''}. Being a carrier typically
          does not cause symptoms, but can affect family planning decisions.
        </Text>
      </View>

      {/* Carrier Conditions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Carrier Status</Text>
        {data.carrierConditions.map((condition, idx) => (
          <View key={idx} style={{ marginBottom: 8 }}>
            <Text style={{ fontSize: 12, fontWeight: 'bold' }}>{condition.name}</Text>
            <Text style={styles.text}>OMIM ID: {condition.omimId}</Text>
            <Text style={styles.text}>Inheritance: {condition.inheritance}</Text>
          </View>
        ))}
      </View>

      {/* Partner Comparison (if available) */}
      {data.partnerName && data.sharedRisks && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Offspring Risk Analysis</Text>
          <Text style={styles.text}>Partner: {data.partnerName}</Text>
          {data.sharedRisks.map((risk, idx) => (
            <Text key={idx} style={styles.text}>
              • {risk.condition}: {risk.offspringRisk}% chance of affected offspring
            </Text>
          ))}
        </View>
      )}

      {/* Next Steps */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recommended Next Steps</Text>
        <Text style={styles.text}>1. Review this report with a genetic counselor</Text>
        <Text style={styles.text}>2. Share with your healthcare provider</Text>
        <Text style={styles.text}>3. Learn more about each condition at Tortit.com</Text>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text>Generated by Tortit | For informational purposes only | Not a diagnostic test</Text>
        <Text>Consult with a genetic counselor or healthcare provider for medical advice</Text>
      </View>
    </Page>
  </Document>
);

// Usage in component
import { PDFDownloadLink } from '@react-pdf/renderer';

<PDFDownloadLink
  document={<SummaryReport data={reportData} />}
  fileName="tortit_carrier_report.pdf"
>
  {({ loading }) => loading ? 'Generating PDF...' : 'Download Report (PDF)'}
</PDFDownloadLink>
```

---

## 8. Mobile-First Responsive Patterns

### Responsive Container

```tsx
// src/components/ResponsiveContainer.tsx

import React from 'react';

export const ResponsiveContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="
      px-4 py-6          /* Mobile: smaller padding */
      sm:px-6 sm:py-8    /* Tablet: medium padding */
      lg:px-8 lg:py-10   /* Desktop: larger padding */
      max-w-7xl mx-auto  /* Constrain max width */
    ">
      {children}
    </div>
  );
};
```

### Responsive Card Grid

```tsx
// Condition cards that stack on mobile, grid on desktop
<div className="
  grid grid-cols-1           /* Mobile: single column */
  sm:grid-cols-2             /* Tablet: 2 columns */
  lg:grid-cols-3             /* Desktop: 3 columns */
  gap-4 sm:gap-6            /* Responsive gap */
">
  {conditions.map(condition => (
    <ConditionCard key={condition.id} {...condition} />
  ))}
</div>
```

### Touch-Friendly Buttons

```tsx
// Minimum 44x44px hit target (iOS guidelines)
<button className="
  min-h-[44px] min-w-[44px]  /* Touch-friendly size */
  px-6 py-3                   /* Comfortable padding */
  text-base                   /* Readable text (16px+) */
  font-semibold
  rounded-lg
  bg-blue-600 text-white
  active:bg-blue-700          /* Touch feedback */
  transition-colors
">
  Continue
</button>
```

### Collapsible Sections for Mobile

```tsx
// src/components/CollapsibleSection.tsx

import React, { useState } from 'react';

export const CollapsibleSection: React.FC<{
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}> = ({ title, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-2 border-gray-200 rounded-lg">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition"
      >
        <span className="font-semibold text-gray-900">{title}</span>
        <span className="text-2xl text-gray-500">
          {isOpen ? '−' : '+'}
        </span>
      </button>
      {isOpen && (
        <div className="p-4 border-t-2 border-gray-200">
          {children}
        </div>
      )}
    </div>
  );
};

// Usage: Collapse detailed info on mobile
<div className="space-y-2">
  <CollapsibleSection title="About Cystic Fibrosis">
    <p>Detailed medical information here...</p>
  </CollapsibleSection>
  <CollapsibleSection title="Inheritance Pattern">
    <InteractivePunnettSquare {...props} />
  </CollapsibleSection>
</div>
```

---

## Testing Checklist

### Accessibility Testing

- [ ] Test with screen reader (NVDA, JAWS, VoiceOver)
- [ ] Verify all interactive elements have `aria-labels`
- [ ] Check color contrast ratios (WCAG AA: 4.5:1 for text)
- [ ] Test keyboard navigation (Tab, Enter, Escape)
- [ ] Verify focus indicators visible on all interactive elements

### Color Blindness Simulation

Use browser extensions to test color schemes:
- [ ] Deuteranopia (red-green, most common)
- [ ] Protanopia (red-green, severe)
- [ ] Tritanopia (blue-yellow, rare)
- [ ] Achromatopsia (total colorblindness)

### Mobile Testing

- [ ] Test on iOS Safari (iPhones)
- [ ] Test on Android Chrome
- [ ] Verify touch targets ≥44×44px
- [ ] Check text readability without zoom
- [ ] Test landscape and portrait orientations
- [ ] Verify PDF downloads work on mobile

### User Testing Scripts

**Task 1: View Personal Results**
1. Upload genetic data file
2. Navigate to carrier status
3. Read and understand carrier status for 1 condition

**Task 2: Compare with Partner**
1. Link partner data
2. Identify shared carrier conditions
3. Understand offspring risk for 1 shared condition

**Task 3: Export Report**
1. Generate PDF report
2. Download and open on mobile device
3. Verify report is readable

---

## Performance Optimization

### Code Splitting

```typescript
// Lazy load heavy components
const InteractivePunnettSquare = lazy(() =>
  import('./components/InteractivePunnettSquare')
);

const PDFReport = lazy(() =>
  import('./components/PDFReport/SummaryReport')
);

// Use with Suspense
<Suspense fallback={<div>Loading visualization...</div>}>
  <InteractivePunnettSquare {...props} />
</Suspense>
```

### Optimize Icon Array Rendering

```tsx
// Use CSS Grid instead of individual divs for 100 dots
<div
  className="grid grid-cols-10 gap-1"
  style={{
    background: `
      repeating-linear-gradient(
        0deg,
        transparent 0 10%,
        rgba(0,0,0,0.1) 10% 11%
      ),
      repeating-linear-gradient(
        90deg,
        transparent 0 10%,
        rgba(0,0,0,0.1) 10% 11%
      )
    `
  }}
>
  {/* Render colored cells */}
</div>
```

---

## Next Steps

1. **Week 1**: Implement accessible color system and risk badges
2. **Week 2**: Build progressive disclosure flow for results page
3. **Week 3**: Add pictographic risk visualizations
4. **Week 4**: Implement privacy consent flow
5. **Month 2**: Build interactive Punnett squares
6. **Month 2**: Create PDF export system
7. **Month 3**: Mobile optimization and user testing

---

**Document Version**: 1.0
**Last Updated**: 2026-02-06
**Maintained by**: Tortit Development Team
