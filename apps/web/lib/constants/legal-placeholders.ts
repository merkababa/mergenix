/** Legal text constants for consent gates and disclosures — Stream L finalized. */

/** Current version of the genetic data processing consent form. Bump on any material change. */
export const GENETIC_CONSENT_VERSION = '1.0';

export const CONSENT_TEXT_GENETIC_PROCESSING = `By clicking "I Agree", you give your explicit, freely given, informed consent to the processing of your genetic data for the purpose of generating educational offspring trait predictions, carrier risk estimates, pharmacogenomics insights, and polygenic risk scores. This consent is required under GDPR Article 9(2)(a) because genetic data is a special category of personal data.

How your data is processed: All analysis runs entirely within your browser using Web Workers. Your raw genetic file is never transmitted to our servers. We cannot see, access, or store your DNA data.

What we may store: If you save your results to an account, we store the computed analysis output (variant interpretations and scores) — not your raw genetic file. This is subject to our Privacy Policy and data retention schedule.

Purpose limitation: Your genetic data is used solely to generate the analysis you have requested. It will not be used for research, advertising, or shared with any third party.

Your rights: You may withdraw this consent at any time via Account Settings → Privacy. Withdrawal will trigger deletion of all saved analysis results associated with your account. Withdrawal does not affect the lawfulness of any processing carried out before you withdrew consent. You also have the right to access your data, request correction or erasure, and lodge a complaint with your national data protection authority.

Important: The platform defaults to a "Research Mode" which displays raw genotype data (e.g., "rs123: C/T"). Any interpretation of this data into health risks or carrier status ("Clinical Mode") is an optional feature that you must explicitly activate. Results are for educational and informational purposes only. They do not constitute medical advice, a clinical diagnostic test, or genetic counseling. Please consult a certified genetic counselor or healthcare provider before making any medical decisions.

Emotional preparation: Some results, such as carrier status for serious genetic conditions, may be unexpected or distressing. We recommend having a supportive person available when reviewing results. The National Society of Genetic Counselors can help you find a counselor at nsgc.org/findageneticcounselor. If you are currently pregnant, we strongly recommend reviewing carrier screening results with a genetic counselor rather than alone.

Accuracy and limitations: Our analysis relies on genome-wide association studies (GWAS) that have disproportionately studied European-ancestry populations. If you are of non-European ancestry, risk estimates and trait predictions may be less accurate for you.

Gene-environment interactions: Genetic variants are only one factor among many that influence health and traits. Environmental factors, lifestyle, epigenetics, and chance also play significant roles. A genetic risk score does not determine your outcome.

Legal basis: GDPR Article 9(2)(a) — explicit consent.`;

export const CHIP_LIMITATION_TEXT = `Direct-to-consumer genetic tests analyze approximately 600,000 to 700,000 genetic variants — roughly 0.02% of the 3 billion base pairs in the human genome. Our analysis is limited to the variants present in your uploaded file. Results should not be considered a comprehensive genetic assessment. For clinical-grade genetic testing, consult a certified genetic counselor or healthcare provider.`;

export const PARTNER_CONSENT_LABEL = `I confirm that I have obtained explicit, informed consent from the second individual to upload and analyze their genetic data as part of this couple analysis.`;

export const CPRA_SPI_NOTICE = `California Privacy Rights Act — Limit the Use of My Sensitive Personal Information

Under the California Privacy Rights Act (CPRA), California residents have the right to limit the use and disclosure of their sensitive personal information (SPI).

Your genetic data is classified as sensitive personal information under CPRA. Mergenix already limits the use of your SPI to the minimum necessary by default:

• Client-side processing: Your raw genetic file is analyzed entirely within your browser. It is never transmitted to our servers.
• Planned encryption: Client-side AES-256-GCM encryption of saved results is planned for a future release and is not yet active. Until that feature launches, saved results are protected with standard server-side encryption.
• No sharing: Your genetic data is never shared with third parties, sold, or used for advertising or research beyond the analysis you requested.
• Purpose limitation: Your data is used solely for the genetic analysis service you requested.

You may further restrict our use of your data by:
• Choosing "Essential Only" in your cookie preferences to disable analytics tracking.
• Declining to save analysis results to your account (process everything locally).
• Deleting your account and all associated data at any time via Account Settings → Danger Zone.

For questions or to exercise your CPRA rights, contact: privacy@mergenix.com`;

export const PRE_PAYMENT_DISCLOSURE = `Before purchasing, please understand:
\u2022 DTC genotyping chips analyze approximately 600,000–700,000 of the most well-studied genetic variants — the positions most relevant to health and trait research. This represents roughly 0.02% of the 3+ billion base pairs in the human genome. Coverage varies by chip manufacturer and version.
\u2022 Our carrier screening tool aligns your raw data against a reference panel of 2,697 conditions. Not all variants for each condition may be detectable from your chip data.
\u2022 The "Premium" and "Pro" tiers purchase access to platform features including secure encrypted storage, PDF report generation, and advanced data filtering tools.
\u2022 Trait predictions and polygenic risk scores are probabilistic estimates based on population-level GWAS data. They are not deterministic.
\u2022 Accuracy of trait predictions and polygenic risk scores varies by ancestral background. Most underlying research (GWAS) has disproportionately studied European-ancestry populations. Users of other ancestral backgrounds may receive less precise estimates.
\u2022 Results are for educational and informational purposes only — not clinical diagnostics or medical advice.
\u2022 We offer a 30-day money-back guarantee for technical issues, file format incompatibility, or analysis processing errors. Refunds are not available solely on the basis of dissatisfaction with probabilistic outcomes.`;
