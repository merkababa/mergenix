import type { TDocumentDefinitions, Content, TableCell } from 'pdfmake/interfaces';
import type {
  FullAnalysisResult,
  CarrierResult,
  TraitResult,
  PgxAnalysisResult,
  PgxGeneResult,
  PrsAnalysisResult,
  PrsConditionResult,
  CounselingResult,
} from '@mergenix/shared-types';
import { RISK_LABELS, RISK_CATEGORY_LABELS } from '@/lib/genetics-constants';

type Margin = [number, number, number, number];

// ─── Constants ──────────────────────────────────────────────────────────────

const BRAND_TEAL = '#06d6a0';
const TEXT_DARK = '#1a1a2e';
const TEXT_MUTED = '#6b7280';
const BORDER_COLOR = '#e5e7eb';

/**
 * Font sizes for each pdfmake named heading style.
 *
 * Exported so that tests can assert the visual heading hierarchy against the
 * actual production values rather than duplicating magic numbers locally.
 *
 *   PDF_HEADING_FONT_SIZES.title       — H1 equivalent (document title)
 *   PDF_HEADING_FONT_SIZES.sectionTitle — H2 equivalent (major section headings)
 *   PDF_HEADING_FONT_SIZES.sectionHeader — H3 equivalent (subsection headings)
 */
export const PDF_HEADING_FONT_SIZES = {
  /** H1 equivalent — document title. */
  title: 22,
  /** H2 equivalent — major section headings (e.g., "Carrier Screening Results"). */
  sectionTitle: 16,
  /** H3 equivalent — subsection headings (e.g., "Report Details"). */
  sectionHeader: 14,
} as const;

// ─── Common Table Layout ────────────────────────────────────────────────────

/** Shared table layout used across all data section tables in the PDF. */
const DATA_TABLE_LAYOUT = {
  hLineWidth: (i: number, node: { table: { body: TableCell[][] } }): number =>
    i === 0 || i === 1 || i === node.table.body.length ? 1 : 0.5,
  vLineWidth: (): number => 0.5,
  hLineColor: (i: number): string => (i <= 1 ? BRAND_TEAL : BORDER_COLOR),
  vLineColor: (): string => BORDER_COLOR,
  paddingLeft: (): number => 6,
  paddingRight: (): number => 6,
  paddingTop: (): number => 4,
  paddingBottom: (): number => 4,
  fillColor: (i: number): string | null => (i === 0 ? '#f0fdf4' : i % 2 === 0 ? '#fafafa' : null),
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(isoString: string): string {
  if (!isoString) return 'N/A';
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─── Section Builders ───────────────────────────────────────────────────────

function buildTitle(): Content {
  return {
    text: 'Mergenix Genetic Analysis Report',
    style: 'title',
    alignment: 'center' as const,
    margin: [0, 0, 0, 4] as Margin,
  };
}

function buildSubtitle(): Content {
  return {
    text: 'Comprehensive genetic offspring analysis report',
    style: 'subtitle',
    alignment: 'center' as const,
    margin: [0, 0, 0, 20] as Margin,
  };
}

function buildMetadataSection(result: FullAnalysisResult): Content {
  return {
    margin: [0, 0, 0, 20] as Margin,
    table: {
      widths: ['*', '*'],
      body: [
        [
          {
            text: 'Report Details',
            style: 'sectionHeader',
            colSpan: 2,
            border: [false, false, false, true] as [boolean, boolean, boolean, boolean],
          },
          {},
        ],
        [
          { text: 'Generated', style: 'label' },
          { text: formatDate(result.metadata.analysisTimestamp), style: 'value' },
        ],
        [
          { text: 'Parent 1 Format', style: 'label' },
          { text: result.metadata.parent1Format, style: 'value' },
        ],
        [
          { text: 'Parent 2 Format', style: 'label' },
          { text: result.metadata.parent2Format, style: 'value' },
        ],
        [
          { text: 'Parent 1 SNPs', style: 'label' },
          { text: result.metadata.parent1SnpCount.toLocaleString(), style: 'value' },
        ],
        [
          { text: 'Parent 2 SNPs', style: 'label' },
          { text: result.metadata.parent2SnpCount.toLocaleString(), style: 'value' },
        ],
        [
          { text: 'Engine Version', style: 'label' },
          { text: result.metadata.engineVersion, style: 'value' },
        ],
        [
          { text: 'Genome Build', style: 'label' },
          { text: result.genomeBuild, style: 'value' },
        ],
        [
          { text: 'Analysis Tier', style: 'label' },
          { text: capitalize(result.metadata.tier), style: 'value' },
        ],
      ],
    },
    layout: {
      hLineWidth: (i: number, _node: { table: { body: TableCell[][] } }): number =>
        i === 1 ? 1 : 0,
      vLineWidth: (): number => 0,
      hLineColor: (): string => BORDER_COLOR,
      paddingLeft: (): number => 8,
      paddingRight: (): number => 8,
      paddingTop: (): number => 4,
      paddingBottom: (): number => 4,
    },
  };
}

function buildCarrierSection(carrierResults: CarrierResult[]): Content[] {
  const sections: Content[] = [
    {
      text: 'Carrier Screening Results',
      style: 'sectionTitle',
      margin: [0, 10, 0, 8] as Margin,
    },
  ];

  if (carrierResults.length === 0) {
    sections.push({
      text: 'No carrier results to display.',
      style: 'body',
      margin: [0, 0, 0, 12] as Margin,
    });
    return sections;
  }

  sections.push({
    text: `${carrierResults.length} condition${carrierResults.length !== 1 ? 's' : ''} analyzed`,
    style: 'body',
    margin: [0, 0, 0, 8] as Margin,
  });

  const tableBody: TableCell[][] = [
    [
      { text: 'Condition', style: 'tableHeader' },
      { text: 'Gene', style: 'tableHeader' },
      { text: 'Severity', style: 'tableHeader' },
      { text: 'Risk Level', style: 'tableHeader' },
      { text: 'Parent A', style: 'tableHeader' },
      { text: 'Parent B', style: 'tableHeader' },
      { text: 'Offspring Risk', style: 'tableHeader' },
    ],
  ];

  for (const r of carrierResults) {
    const riskText = 'affected' in r.offspringRisk ? `${r.offspringRisk.affected}%` : 'N/A';

    tableBody.push([
      { text: r.condition, style: 'tableCell' },
      { text: r.gene, style: 'tableCell' },
      { text: r.severity, style: 'tableCell' },
      { text: RISK_LABELS[r.riskLevel] ?? r.riskLevel, style: 'tableCell' },
      { text: capitalize(r.parentAStatus), style: 'tableCell' },
      { text: capitalize(r.parentBStatus), style: 'tableCell' },
      { text: riskText, style: 'tableCell' },
    ]);
  }

  sections.push({
    margin: [0, 0, 0, 16] as Margin,
    table: {
      headerRows: 1,
      widths: ['*', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto'],
      body: tableBody,
    },
    layout: DATA_TABLE_LAYOUT,
  });

  return sections;
}

function buildTraitsSection(traits: TraitResult[]): Content[] {
  const sections: Content[] = [
    {
      text: 'Trait Predictions',
      style: 'sectionTitle',
      margin: [0, 10, 0, 8] as Margin,
    },
  ];

  if (traits.length === 0) {
    sections.push({
      text: 'No trait predictions to display.',
      style: 'body',
      margin: [0, 0, 0, 12] as Margin,
    });
    return sections;
  }

  const tableBody: TableCell[][] = [
    [
      { text: 'Trait', style: 'tableHeader' },
      { text: 'Gene', style: 'tableHeader' },
      { text: 'Confidence', style: 'tableHeader' },
      { text: 'Predictions', style: 'tableHeader' },
    ],
  ];

  for (const t of traits) {
    const predictions = Object.entries(t.offspringProbabilities)
      .map(([phenotype, pct]) => `${phenotype}: ${pct}%`)
      .join(', ');

    tableBody.push([
      { text: t.trait, style: 'tableCell' },
      { text: t.gene, style: 'tableCell' },
      { text: capitalize(t.confidence), style: 'tableCell' },
      { text: predictions || 'N/A', style: 'tableCell' },
    ]);
  }

  sections.push({
    margin: [0, 0, 0, 16] as Margin,
    table: {
      headerRows: 1,
      widths: ['auto', 'auto', 'auto', '*'],
      body: tableBody,
    },
    layout: DATA_TABLE_LAYOUT,
  });

  return sections;
}

function buildPgxSection(pgx: PgxAnalysisResult): Content[] {
  const sections: Content[] = [
    {
      text: 'Pharmacogenomics (PGx) Results',
      style: 'sectionTitle',
      margin: [0, 10, 0, 8] as Margin,
    },
  ];

  const geneResults: PgxGeneResult[] = Object.values(pgx.results);

  if (geneResults.length === 0) {
    sections.push({
      text: 'No pharmacogenomic results to display.',
      style: 'body',
      margin: [0, 0, 0, 12] as Margin,
    });
    return sections;
  }

  sections.push({
    text: `${pgx.genesAnalyzed} gene${pgx.genesAnalyzed !== 1 ? 's' : ''} analyzed`,
    style: 'body',
    margin: [0, 0, 0, 8] as Margin,
  });

  const tableBody: TableCell[][] = [
    [
      { text: 'Gene', style: 'tableHeader' },
      { text: 'Parent A Diplotype', style: 'tableHeader' },
      { text: 'Parent A Metabolizer', style: 'tableHeader' },
      { text: 'Parent B Diplotype', style: 'tableHeader' },
      { text: 'Parent B Metabolizer', style: 'tableHeader' },
      { text: 'Key Drugs', style: 'tableHeader' },
    ],
  ];

  for (const g of geneResults) {
    const drugs =
      g.parentA.drugRecommendations
        .map((d) => d.drug)
        .slice(0, 3)
        .join(', ') || 'N/A';

    tableBody.push([
      { text: g.gene, style: 'tableCell' },
      { text: g.parentA.diplotype, style: 'tableCell' },
      { text: capitalize(g.parentA.metabolizerStatus.status), style: 'tableCell' },
      { text: g.parentB.diplotype, style: 'tableCell' },
      { text: capitalize(g.parentB.metabolizerStatus.status), style: 'tableCell' },
      { text: drugs, style: 'tableCell' },
    ]);
  }

  sections.push({
    margin: [0, 0, 0, 16] as Margin,
    table: {
      headerRows: 1,
      widths: ['auto', 'auto', 'auto', 'auto', 'auto', '*'],
      body: tableBody,
    },
    layout: DATA_TABLE_LAYOUT,
  });

  return sections;
}

function buildPrsSection(prs: PrsAnalysisResult): Content[] {
  const sections: Content[] = [
    {
      text: 'Polygenic Risk Scores (PRS)',
      style: 'sectionTitle',
      margin: [0, 10, 0, 8] as Margin,
    },
  ];

  const conditionResults: [string, PrsConditionResult][] = Object.entries(prs.conditions);

  if (conditionResults.length === 0) {
    sections.push({
      text: 'No polygenic risk score results to display.',
      style: 'body',
      margin: [0, 0, 0, 12] as Margin,
    });
    return sections;
  }

  // Prominent ancestry warning at the top of the PRS section
  sections.push({
    text: 'Important: Polygenic risk scores are derived primarily from genome-wide association studies (GWAS) conducted in populations of European ancestry. Predictive accuracy may be reduced for individuals of non-European descent.',
    fontSize: 9,
    bold: true,
    color: '#92400E',
    margin: [0, 4, 0, 8] as Margin,
  } as Content);

  sections.push({
    text: `${conditionResults.length} condition${conditionResults.length !== 1 ? 's' : ''} evaluated`,
    style: 'body',
    margin: [0, 0, 0, 8] as Margin,
  });

  const tableBody: TableCell[][] = [
    [
      { text: 'Condition', style: 'tableHeader' },
      { text: 'Parent A Percentile', style: 'tableHeader' },
      { text: 'Parent A Risk', style: 'tableHeader' },
      { text: 'Parent B Percentile', style: 'tableHeader' },
      { text: 'Parent B Risk', style: 'tableHeader' },
      { text: 'Offspring Percentile', style: 'tableHeader' },
    ],
  ];

  for (const [, c] of conditionResults) {
    tableBody.push([
      { text: c.name, style: 'tableCell' },
      { text: `${c.parentA.percentile.toFixed(0)}%`, style: 'tableCell' },
      {
        text: RISK_CATEGORY_LABELS[c.parentA.riskCategory] ?? capitalize(c.parentA.riskCategory),
        style: 'tableCell',
      },
      { text: `${c.parentB.percentile.toFixed(0)}%`, style: 'tableCell' },
      {
        text: RISK_CATEGORY_LABELS[c.parentB.riskCategory] ?? capitalize(c.parentB.riskCategory),
        style: 'tableCell',
      },
      { text: `${c.offspring.expectedPercentile.toFixed(0)}%`, style: 'tableCell' },
    ]);

    // Add ancestry note as an italicized footnote row if present
    if (c.ancestryNote) {
      tableBody.push([
        {
          text: c.ancestryNote,
          style: 'tableCell',
          italics: true,
          fontSize: 7,
          color: TEXT_MUTED,
          colSpan: 6,
        },
        {},
        {},
        {},
        {},
        {},
      ]);
    }
  }

  sections.push({
    margin: [0, 0, 0, 16] as Margin,
    table: {
      headerRows: 1,
      widths: ['*', 'auto', 'auto', 'auto', 'auto', 'auto'],
      body: tableBody,
    },
    layout: DATA_TABLE_LAYOUT,
  });

  return sections;
}

function buildCounselingSection(counseling: CounselingResult): Content[] {
  const sections: Content[] = [
    {
      text: 'Genetic Counseling Recommendations',
      style: 'sectionTitle',
      margin: [0, 10, 0, 8] as Margin,
    },
  ];

  if (!counseling.recommend) {
    sections.push({
      text: 'No genetic counseling is indicated based on the current analysis.',
      style: 'body',
      margin: [0, 0, 0, 12] as Margin,
    });
    return sections;
  }

  // Urgency and summary
  sections.push({
    text: `Urgency: ${capitalize(counseling.urgency)}`,
    style: 'body',
    bold: true,
    margin: [0, 0, 0, 4] as Margin,
  } as Content);

  if (counseling.summaryText) {
    sections.push({
      text: counseling.summaryText,
      style: 'body',
      margin: [0, 0, 0, 8] as Margin,
    });
  }

  // Reasons
  if (counseling.reasons.length > 0) {
    sections.push({
      text: 'Reasons for Referral:',
      style: 'body',
      bold: true,
      margin: [0, 4, 0, 4] as Margin,
    } as Content);

    sections.push({
      ul: counseling.reasons,
      style: 'body',
      margin: [0, 0, 0, 8] as Margin,
    } as Content);
  }

  // Key findings table
  if (counseling.keyFindings && counseling.keyFindings.length > 0) {
    const findingsBody: TableCell[][] = [
      [
        { text: 'Condition', style: 'tableHeader' },
        { text: 'Gene', style: 'tableHeader' },
        { text: 'Risk Level', style: 'tableHeader' },
        { text: 'Inheritance', style: 'tableHeader' },
      ],
    ];

    for (const f of counseling.keyFindings) {
      findingsBody.push([
        { text: f.condition, style: 'tableCell' },
        { text: f.gene, style: 'tableCell' },
        { text: RISK_LABELS[f.riskLevel] ?? f.riskLevel, style: 'tableCell' },
        { text: capitalize(f.inheritance), style: 'tableCell' },
      ]);
    }

    sections.push({
      text: 'Key Findings:',
      style: 'body',
      bold: true,
      margin: [0, 4, 0, 4] as Margin,
    } as Content);

    sections.push({
      margin: [0, 0, 0, 12] as Margin,
      table: {
        headerRows: 1,
        widths: ['*', 'auto', 'auto', 'auto'],
        body: findingsBody,
      },
      layout: DATA_TABLE_LAYOUT,
    });
  }

  // Recommended specialties
  if (counseling.recommendedSpecialties && counseling.recommendedSpecialties.length > 0) {
    sections.push({
      text: `Recommended Specialties: ${counseling.recommendedSpecialties.map(capitalize).join(', ')}`,
      style: 'body',
      margin: [0, 0, 0, 8] as Margin,
    });
  }

  // NSGC link
  sections.push({
    text: `Find a counselor: ${counseling.nsgcUrl}`,
    style: 'body',
    color: BRAND_TEAL,
    margin: [0, 0, 0, 16] as Margin,
  } as Content);

  return sections;
}

function buildDisclaimer(): Content {
  return {
    stack: [
      {
        text: 'Medical Disclaimer',
        style: 'sectionTitle',
        margin: [0, 20, 0, 8] as Margin,
      },
      {
        text: [
          'This report is for informational and educational purposes only. ',
          'It is NOT a substitute for professional medical advice, clinical genetic testing, ',
          'or genetic counseling. Results are based on consumer-grade genotyping data and may ',
          'not reflect all known pathogenic variants. ',
          'Do not make medical decisions based solely on this report. ',
          'Always consult a qualified healthcare provider or certified genetic counselor ',
          'for clinical interpretation and guidance. ',
          'Mergenix does not provide medical diagnoses.',
        ],
        style: 'disclaimer',
        margin: [0, 0, 0, 12] as Margin,
      },
    ],
  };
}

// ─── Main Builder ───────────────────────────────────────────────────────────

/**
 * Converts a FullAnalysisResult into a pdfmake TDocumentDefinitions object.
 *
 * This is a pure function with no side effects — it only transforms data
 * into a PDF document definition. The actual PDF generation is done by
 * pdfmake in the hook.
 */
export function buildPdfDocument(result: FullAnalysisResult): TDocumentDefinitions {
  const content: Content[] = [
    buildTitle(),
    buildSubtitle(),
    buildMetadataSection(result),
    ...buildCarrierSection(result.carrier),
    ...buildTraitsSection(result.traits),
    ...buildPgxSection(result.pgx),
    ...buildPrsSection(result.prs),
    ...buildCounselingSection(result.counseling),
    buildDisclaimer(),
  ];

  return {
    content,
    defaultStyle: {
      font: 'Roboto',
      fontSize: 10,
      color: TEXT_DARK,
    },
    styles: {
      title: {
        fontSize: PDF_HEADING_FONT_SIZES.title,
        bold: true,
        color: TEXT_DARK,
      },
      subtitle: {
        fontSize: 12,
        color: TEXT_MUTED,
      },
      sectionHeader: {
        fontSize: PDF_HEADING_FONT_SIZES.sectionHeader,
        bold: true,
        color: BRAND_TEAL,
      },
      sectionTitle: {
        fontSize: PDF_HEADING_FONT_SIZES.sectionTitle,
        bold: true,
        color: TEXT_DARK,
      },
      label: {
        fontSize: 10,
        color: TEXT_MUTED,
        bold: true,
      },
      value: {
        fontSize: 10,
        color: TEXT_DARK,
      },
      body: {
        fontSize: 10,
        color: TEXT_DARK,
        lineHeight: 1.4,
      },
      tableHeader: {
        fontSize: 9,
        bold: true,
        color: TEXT_DARK,
      },
      tableCell: {
        fontSize: 9,
        color: TEXT_DARK,
      },
      disclaimer: {
        fontSize: 8,
        color: TEXT_MUTED,
        italics: true,
        lineHeight: 1.5,
      },
    },
    pageMargins: [40, 40, 40, 40] as Margin,
    footer: (currentPage: number, pageCount: number) => ({
      columns: [
        {
          text: 'Mergenix Genetic Analysis Report',
          alignment: 'left' as const,
          fontSize: 7,
          color: TEXT_MUTED,
          margin: [40, 10, 0, 0] as Margin,
        },
        {
          text: `Page ${currentPage} of ${pageCount}`,
          alignment: 'right' as const,
          fontSize: 7,
          color: TEXT_MUTED,
          margin: [0, 10, 40, 0] as Margin,
        },
      ],
    }),
  };
}
