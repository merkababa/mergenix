/**
 * Static disease data for the Mergenix disease catalog.
 *
 * This is a curated representative dataset of ~60 diseases drawn from the full
 * carrier_panel.json. It covers all 15 categories, all 3 inheritance models,
 * and all severity/confidence levels.
 *
 * In a future iteration the full panel will be loaded via API or static
 * generation at build time. For now this provides an accurate, medically
 * grounded browsing experience.
 */

import { CARRIER_PANEL_COUNT } from '@mergenix/genetics-data';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DiseaseEntry {
  slug: string;
  name: string;
  description: string;
  category: string;
  inheritance: string;
  severity: 'high' | 'moderate' | 'low';
  snpCount: number;
  confidence: 'high' | 'medium' | 'low';
}

export interface DiseaseSnp {
  rsid: string;
  gene: string;
  allele: string;
  source: string;
}

export interface DiseaseDetail extends DiseaseEntry {
  fullDescription: string;
  snps: DiseaseSnp[];
  carrierFrequency: string;
  affectedFrequency: string;
  notes: string;
  sources: string[];
}

// ---------------------------------------------------------------------------
// Curated catalog — 60 representative diseases
// ---------------------------------------------------------------------------

export const DISEASES: DiseaseEntry[] = [
  // ── Hematological ──────────────────────────────────────────────────────
  {
    slug: 'sickle-cell-disease',
    name: 'Sickle Cell Disease',
    description:
      'Blood disorder causing red blood cells to become crescent-shaped, blocking blood flow and causing pain and organ damage.',
    category: 'Hematological',
    inheritance: 'Autosomal Recessive',
    severity: 'high',
    snpCount: 1,
    confidence: 'high',
  },
  {
    slug: 'beta-thalassemia',
    name: 'Beta-Thalassemia',
    description:
      'Inherited blood disorder reducing hemoglobin production, leading to anemia of varying severity from mild to transfusion-dependent.',
    category: 'Hematological',
    inheritance: 'Autosomal Recessive',
    severity: 'high',
    snpCount: 3,
    confidence: 'high',
  },
  {
    slug: 'hemophilia-a',
    name: 'Hemophilia A',
    description:
      'X-linked bleeding disorder caused by deficiency of clotting factor VIII, leading to prolonged and spontaneous bleeding episodes.',
    category: 'Hematological',
    inheritance: 'X-Linked',
    severity: 'high',
    snpCount: 7,
    confidence: 'high',
  },
  {
    slug: 'hemophilia-b',
    name: 'Hemophilia B',
    description:
      'X-linked bleeding disorder caused by deficiency of clotting factor IX, with symptoms ranging from mild to severe hemorrhaging.',
    category: 'Hematological',
    inheritance: 'X-Linked',
    severity: 'high',
    snpCount: 5,
    confidence: 'high',
  },
  {
    slug: 'g6pd-deficiency',
    name: 'G6PD Deficiency',
    description:
      'Enzyme deficiency in red blood cells causing hemolytic anemia triggered by infections, certain foods, or medications.',
    category: 'Hematological',
    inheritance: 'X-Linked',
    severity: 'moderate',
    snpCount: 6,
    confidence: 'high',
  },
  {
    slug: 'hereditary-hemochromatosis',
    name: 'Hereditary Hemochromatosis',
    description:
      'Iron overload disorder causing excess iron absorption and deposition in the liver, heart, and pancreas.',
    category: 'Hematological',
    inheritance: 'Autosomal Recessive',
    severity: 'moderate',
    snpCount: 1,
    confidence: 'high',
  },
  {
    slug: 'fanconi-anemia',
    name: 'Fanconi Anemia',
    description:
      'Rare bone marrow failure syndrome with congenital anomalies, increased cancer risk, and progressive pancytopenia.',
    category: 'Hematological',
    inheritance: 'Autosomal Recessive',
    severity: 'high',
    snpCount: 13,
    confidence: 'high',
  },

  // ── Neurological ───────────────────────────────────────────────────────
  {
    slug: 'tay-sachs-disease',
    name: 'Tay-Sachs Disease',
    description:
      'Fatal neurodegenerative disorder caused by hexosaminidase A deficiency, leading to progressive destruction of nerve cells.',
    category: 'Neurological',
    inheritance: 'Autosomal Recessive',
    severity: 'high',
    snpCount: 4,
    confidence: 'high',
  },
  {
    slug: 'canavan-disease',
    name: 'Canavan Disease',
    description:
      'Leukodystrophy causing progressive white matter degeneration in infancy, leading to developmental regression and macrocephaly.',
    category: 'Neurological',
    inheritance: 'Autosomal Recessive',
    severity: 'high',
    snpCount: 2,
    confidence: 'high',
  },
  {
    slug: 'familial-dysautonomia',
    name: 'Familial Dysautonomia',
    description:
      'Hereditary sensory and autonomic neuropathy affecting the development and survival of sensory and autonomic neurons.',
    category: 'Neurological',
    inheritance: 'Autosomal Recessive',
    severity: 'high',
    snpCount: 1,
    confidence: 'high',
  },
  {
    slug: 'rett-syndrome',
    name: 'Rett Syndrome',
    description:
      'X-linked neurodevelopmental disorder causing regression of acquired skills, stereotypic hand movements, and seizures.',
    category: 'Neurological',
    inheritance: 'X-Linked (Dominant)',
    severity: 'high',
    snpCount: 5,
    confidence: 'high',
  },
  {
    slug: 'krabbe-disease',
    name: 'Krabbe Disease',
    description:
      'Lysosomal storage disorder causing rapid demyelination and neurodegeneration due to galactocerebroside accumulation.',
    category: 'Neurological',
    inheritance: 'Autosomal Recessive',
    severity: 'high',
    snpCount: 2,
    confidence: 'high',
  },

  // ── Metabolic ──────────────────────────────────────────────────────────
  {
    slug: 'phenylketonuria',
    name: 'Phenylketonuria (PKU)',
    description:
      'Metabolic disorder impairing phenylalanine breakdown, causing intellectual disability without early dietary intervention.',
    category: 'Metabolic',
    inheritance: 'Autosomal Recessive',
    severity: 'high',
    snpCount: 3,
    confidence: 'high',
  },
  {
    slug: 'gaucher-disease',
    name: 'Gaucher Disease',
    description:
      'Lysosomal storage disorder causing glucocerebroside buildup in cells, leading to organ enlargement and bone pain.',
    category: 'Metabolic',
    inheritance: 'Autosomal Recessive',
    severity: 'moderate',
    snpCount: 4,
    confidence: 'high',
  },
  {
    slug: 'wilson-disease',
    name: 'Wilson Disease',
    description:
      'Copper metabolism disorder causing toxic accumulation in the liver, brain, and other organs, treatable with chelation therapy.',
    category: 'Metabolic',
    inheritance: 'Autosomal Recessive',
    severity: 'high',
    snpCount: 4,
    confidence: 'high',
  },
  {
    slug: 'galactosemia',
    name: 'Galactosemia',
    description:
      'Inability to metabolize galactose causing liver failure, cataracts, and developmental delay in untreated infants.',
    category: 'Metabolic',
    inheritance: 'Autosomal Recessive',
    severity: 'high',
    snpCount: 4,
    confidence: 'high',
  },
  {
    slug: 'maple-syrup-urine-disease',
    name: 'Maple Syrup Urine Disease',
    description:
      'Branched-chain amino acid metabolism alteration causing metabolic crisis and neurological damage if untreated.',
    category: 'Metabolic',
    inheritance: 'Autosomal Recessive',
    severity: 'high',
    snpCount: 9,
    confidence: 'high',
  },
  {
    slug: 'niemann-pick-disease',
    name: 'Niemann-Pick Disease Type A',
    description:
      'Sphingomyelinase deficiency causing lipid accumulation in cells, leading to progressive neurodegeneration in infancy.',
    category: 'Metabolic',
    inheritance: 'Autosomal Recessive',
    severity: 'high',
    snpCount: 8,
    confidence: 'high',
  },
  {
    slug: 'mcad-deficiency',
    name: 'MCAD Deficiency',
    description:
      'Fatty acid oxidation disorder causing hypoketotic hypoglycemia during fasting, detectable by newborn screening.',
    category: 'Metabolic',
    inheritance: 'Autosomal Recessive',
    severity: 'high',
    snpCount: 1,
    confidence: 'high',
  },
  {
    slug: 'hereditary-fructose-intolerance',
    name: 'Hereditary Fructose Intolerance',
    description:
      'Aldolase B deficiency causing severe hypoglycemia and liver damage after fructose or sucrose ingestion.',
    category: 'Metabolic',
    inheritance: 'Autosomal Recessive',
    severity: 'moderate',
    snpCount: 2,
    confidence: 'high',
  },

  // ── Pulmonary ──────────────────────────────────────────────────────────
  {
    slug: 'cystic-fibrosis',
    name: 'Cystic Fibrosis',
    description:
      'Progressive disorder causing persistent lung infections and limiting breathing ability due to thick mucus buildup.',
    category: 'Pulmonary',
    inheritance: 'Autosomal Recessive',
    severity: 'high',
    snpCount: 12,
    confidence: 'high',
  },
  {
    slug: 'alpha-1-antitrypsin-deficiency',
    name: 'Alpha-1 Antitrypsin Deficiency',
    description:
      'Protease inhibitor deficiency causing early-onset emphysema and liver disease, especially in smokers. Note: exhibits codominant expression — heterozygous carriers (MZ genotype) produce intermediate AAT levels and may have mildly increased risk, particularly with environmental exposures.',
    category: 'Pulmonary',
    inheritance: 'Autosomal Recessive',
    severity: 'moderate',
    snpCount: 3,
    confidence: 'high',
  },
  {
    slug: 'primary-ciliary-dyskinesia',
    name: 'Primary Ciliary Dyskinesia',
    description:
      'Motile cilia dysfunction causing chronic sinopulmonary infections, bronchiectasis, and situs inversus in about half of patients.',
    category: 'Pulmonary',
    inheritance: 'Autosomal Recessive',
    severity: 'high',
    snpCount: 31,
    confidence: 'high',
  },

  // ── Cardiovascular ─────────────────────────────────────────────────────
  {
    slug: 'familial-hypercholesterolemia',
    name: 'Familial Hypercholesterolemia',
    description:
      'Severely elevated LDL cholesterol from birth causing premature coronary artery disease and atherosclerosis. Autosomal dominant — carriers express the condition.',
    category: 'Cardiovascular',
    inheritance: 'Autosomal Dominant',
    severity: 'high',
    snpCount: 13,
    confidence: 'high',
  },
  {
    slug: 'long-qt-syndrome',
    name: 'Long QT Syndrome',
    description:
      'Cardiac ion channel disorder causing prolonged QT interval, syncope, and risk of sudden cardiac death.',
    category: 'Cardiovascular',
    inheritance: 'Autosomal Dominant',
    severity: 'high',
    snpCount: 19,
    confidence: 'high',
  },
  {
    slug: 'hypertrophic-cardiomyopathy',
    name: 'Hypertrophic Cardiomyopathy',
    description:
      'Excessive thickening of heart muscle causing outflow obstruction, arrhythmia, and sudden cardiac death risk.',
    category: 'Cardiovascular',
    inheritance: 'Autosomal Dominant',
    severity: 'high',
    snpCount: 27,
    confidence: 'high',
  },
  {
    slug: 'brugada-syndrome',
    name: 'Brugada Syndrome',
    description:
      'Cardiac sodium channel disorder causing ventricular arrhythmia and risk of sudden death, often during sleep.',
    category: 'Cardiovascular',
    inheritance: 'Autosomal Dominant',
    severity: 'high',
    snpCount: 7,
    confidence: 'high',
  },

  // ── Connective Tissue ──────────────────────────────────────────────────
  {
    slug: 'marfan-syndrome',
    name: 'Marfan Syndrome',
    description:
      'Fibrillin-1 disorder affecting the heart, eyes, blood vessels, and skeleton with risk of aortic dissection.',
    category: 'Connective Tissue',
    inheritance: 'Autosomal Dominant',
    severity: 'high',
    snpCount: 7,
    confidence: 'high',
  },
  {
    slug: 'ehlers-danlos-syndrome',
    name: 'Ehlers-Danlos Syndrome (Vascular)',
    description:
      'Collagen III deficiency causing arterial, intestinal, and uterine fragility with risk of life-threatening rupture.',
    category: 'Connective Tissue',
    inheritance: 'Autosomal Dominant',
    severity: 'high',
    snpCount: 40,
    confidence: 'high',
  },
  {
    slug: 'osteogenesis-imperfecta',
    name: 'Osteogenesis Imperfecta',
    description:
      'Brittle bone disease caused by collagen variants, resulting in frequent fractures, blue sclerae, and short stature.',
    category: 'Connective Tissue',
    inheritance: 'Autosomal Dominant',
    severity: 'moderate',
    snpCount: 23,
    confidence: 'high',
  },
  {
    slug: 'achondroplasia',
    name: 'Achondroplasia',
    description:
      'Most common form of short-limbed dwarfism caused by FGFR3 gain-of-function mutation affecting endochondral ossification.',
    category: 'Connective Tissue',
    inheritance: 'Autosomal Dominant',
    severity: 'moderate',
    snpCount: 5,
    confidence: 'high',
  },

  // ── Endocrine ──────────────────────────────────────────────────────────
  {
    slug: 'congenital-adrenal-hyperplasia',
    name: 'Congenital Adrenal Hyperplasia',
    description:
      '21-hydroxylase deficiency causing cortisol deficiency, androgen excess, and salt-wasting crisis in severe forms.',
    category: 'Endocrine',
    inheritance: 'Autosomal Recessive',
    severity: 'high',
    snpCount: 8,
    confidence: 'high',
  },
  {
    slug: 'familial-hyperinsulinism',
    name: 'Familial Hyperinsulinism',
    description:
      'Pancreatic beta-cell disorder causing persistent hypoglycemia due to unregulated insulin secretion in infancy.',
    category: 'Endocrine',
    inheritance: 'Autosomal Recessive',
    severity: 'high',
    snpCount: 3,
    confidence: 'high',
  },

  // ── Immunodeficiency ───────────────────────────────────────────────────
  {
    slug: 'severe-combined-immunodeficiency',
    name: 'Severe Combined Immunodeficiency (SCID)',
    description:
      'Absent T-cell and B-cell immunity causing life-threatening infections without bone marrow transplantation. Most commonly X-linked (IL2RG), but autosomal recessive forms (ADA, JAK3, RAG1/2) account for ~50% of cases.',
    category: 'Immunodeficiency',
    inheritance: 'X-Linked',
    severity: 'high',
    snpCount: 17,
    confidence: 'high',
  },
  {
    slug: 'chronic-granulomatous-disease',
    name: 'Chronic Granulomatous Disease',
    description:
      'Phagocyte NADPH oxidase deficiency causing recurrent life-threatening bacterial and fungal infections. Most commonly X-linked (CYBB, ~65-70%), but autosomal recessive forms (CYBA, NCF1, NCF2, NCF4) account for ~30-35% of cases.',
    category: 'Immunodeficiency',
    inheritance: 'X-Linked',
    severity: 'high',
    snpCount: 10,
    confidence: 'high',
  },
  {
    slug: 'wiskott-aldrich-syndrome',
    name: 'Wiskott-Aldrich Syndrome',
    description:
      'X-linked immunodeficiency with eczema, thrombocytopenia, and recurrent infections due to WAS protein deficiency.',
    category: 'Immunodeficiency',
    inheritance: 'X-Linked',
    severity: 'high',
    snpCount: 3,
    confidence: 'high',
  },
  {
    slug: 'ataxia-telangiectasia',
    name: 'Ataxia-Telangiectasia',
    description:
      'DNA repair deficiency causing progressive cerebellar ataxia, immunodeficiency, and increased cancer susceptibility.',
    category: 'Immunodeficiency',
    inheritance: 'Autosomal Recessive',
    severity: 'high',
    snpCount: 5,
    confidence: 'high',
  },

  // ── Dermatological ─────────────────────────────────────────────────────
  {
    slug: 'epidermolysis-bullosa',
    name: 'Epidermolysis Bullosa',
    description:
      'Group of blistering skin disorders caused by variants in proteins anchoring the epidermis to the dermis. Heterogeneous group — simplex forms typically autosomal dominant, junctional and dystrophic forms typically autosomal recessive.',
    category: 'Dermatological',
    inheritance: 'Autosomal Recessive',
    severity: 'high',
    snpCount: 25,
    confidence: 'high',
  },
  {
    slug: 'oculocutaneous-albinism',
    name: 'Oculocutaneous Albinism',
    description:
      'Melanin biosynthesis variant causing hypopigmentation of skin, hair, and eyes with reduced visual acuity.',
    category: 'Dermatological',
    inheritance: 'Autosomal Recessive',
    severity: 'moderate',
    snpCount: 9,
    confidence: 'high',
  },
  {
    slug: 'xeroderma-pigmentosum',
    name: 'Xeroderma Pigmentosum',
    description:
      'DNA repair deficiency causing extreme UV sensitivity, freckling, and dramatically increased skin cancer risk.',
    category: 'Dermatological',
    inheritance: 'Autosomal Recessive',
    severity: 'high',
    snpCount: 9,
    confidence: 'high',
  },

  // ── Sensory (Ophthalmological / Audiological) ──────────────────────────
  {
    slug: 'retinitis-pigmentosa',
    name: 'Retinitis Pigmentosa',
    description:
      'Progressive retinal degeneration causing night blindness and peripheral vision loss, with multiple inheritance patterns (most commonly autosomal recessive).',
    category: 'Sensory',
    inheritance: 'Autosomal Recessive',
    severity: 'high',
    snpCount: 25,
    confidence: 'high',
  },
  {
    slug: 'leber-congenital-amaurosis',
    name: 'Leber Congenital Amaurosis',
    description:
      'Severe retinal dystrophy causing profound vision loss in infancy, now treatable with gene therapy for RPE65 mutations.',
    category: 'Sensory',
    inheritance: 'Autosomal Recessive',
    severity: 'high',
    snpCount: 24,
    confidence: 'high',
  },
  {
    slug: 'usher-syndrome',
    name: 'Usher Syndrome',
    description:
      'Combined sensorineural hearing loss and progressive retinitis pigmentosa, the leading cause of deaf-blindness.',
    category: 'Sensory',
    inheritance: 'Autosomal Recessive',
    severity: 'high',
    snpCount: 19,
    confidence: 'high',
  },
  {
    slug: 'congenital-deafness',
    name: 'Congenital Deafness (GJB2-related)',
    description:
      'Non-syndromic hearing loss caused by connexin 26 mutations, the most common genetic cause of deafness.',
    category: 'Sensory',
    inheritance: 'Autosomal Recessive',
    severity: 'moderate',
    snpCount: 1,
    confidence: 'high',
  },
  {
    slug: 'stargardt-disease',
    name: 'Stargardt Disease',
    description:
      'Juvenile macular degeneration causing progressive central vision loss while peripheral vision is typically preserved.',
    category: 'Sensory',
    inheritance: 'Autosomal Recessive',
    severity: 'moderate',
    snpCount: 4,
    confidence: 'high',
  },

  // ── Renal ──────────────────────────────────────────────────────────────
  {
    slug: 'polycystic-kidney-disease',
    name: 'Polycystic Kidney Disease (ADPKD)',
    description:
      'Most common inherited kidney disease causing bilateral renal cysts, progressive renal failure, and extrarenal complications including liver cysts and intracranial aneurysms.',
    category: 'Renal',
    inheritance: 'Autosomal Dominant',
    severity: 'high',
    snpCount: 13,
    confidence: 'high',
  },
  {
    slug: 'alport-syndrome',
    name: 'Alport Syndrome',
    description:
      'Collagen IV deficiency causing progressive nephritis, sensorineural hearing loss, and ocular involvement. Most commonly X-linked (COL4A5, ~80%), with autosomal recessive (COL4A3/COL4A4, ~15%) and autosomal dominant (~5%) forms.',
    category: 'Renal',
    inheritance: 'X-Linked',
    severity: 'high',
    snpCount: 11,
    confidence: 'high',
  },
  {
    slug: 'cystinosis',
    name: 'Cystinosis',
    description:
      'Lysosomal cystine transport alteration causing crystal accumulation in cells, primarily affecting the kidneys and eyes.',
    category: 'Renal',
    inheritance: 'Autosomal Recessive',
    severity: 'high',
    snpCount: 3,
    confidence: 'high',
  },

  // ── Cancer Predisposition ──────────────────────────────────────────────
  {
    slug: 'brca1-breast-ovarian-cancer',
    name: 'BRCA1-Related Breast & Ovarian Cancer',
    description:
      'Pathogenic BRCA1 variants significantly increasing lifetime risk of breast, ovarian, and other cancers.',
    category: 'Cancer Predisposition',
    inheritance: 'Autosomal Dominant',
    severity: 'high',
    snpCount: 4,
    confidence: 'high',
  },
  {
    slug: 'brca2-breast-cancer',
    name: 'BRCA2-Related Hereditary Breast Cancer',
    description:
      'BRCA2 mutations increasing risk of breast, ovarian, pancreatic, and prostate cancers with high penetrance.',
    category: 'Cancer Predisposition',
    inheritance: 'Autosomal Dominant',
    severity: 'high',
    snpCount: 4,
    confidence: 'high',
  },
  {
    slug: 'lynch-syndrome',
    name: 'Lynch Syndrome',
    description:
      'Mismatch repair gene deficiency causing hereditary non-polyposis colorectal cancer and endometrial cancer.',
    category: 'Cancer Predisposition',
    inheritance: 'Autosomal Dominant',
    severity: 'high',
    snpCount: 19,
    confidence: 'high',
  },
  {
    slug: 'li-fraumeni-syndrome',
    name: 'Li-Fraumeni Syndrome',
    description:
      'TP53 mutation causing predisposition to multiple early-onset cancers including sarcomas, brain tumors, and leukemia.',
    category: 'Cancer Predisposition',
    inheritance: 'Autosomal Dominant',
    severity: 'high',
    snpCount: 11,
    confidence: 'high',
  },
  {
    slug: 'hereditary-retinoblastoma',
    name: 'Hereditary Retinoblastoma',
    description:
      'RB1 tumor suppressor mutation causing childhood retinal cancer, typically presenting before age 5.',
    category: 'Cancer Predisposition',
    inheritance: 'Autosomal Dominant',
    severity: 'high',
    snpCount: 5,
    confidence: 'high',
  },
  {
    slug: 'familial-adenomatous-polyposis',
    name: 'Familial Adenomatous Polyposis',
    description:
      'APC gene mutation causing hundreds of colorectal polyps; without treatment, progression to colon cancer is highly likely. Preventive interventions exist.',
    category: 'Cancer Predisposition',
    inheritance: 'Autosomal Dominant',
    severity: 'high',
    snpCount: 5,
    confidence: 'high',
  },

  // ── Skeletal ───────────────────────────────────────────────────────────
  {
    slug: 'thanatophoric-dysplasia',
    name: 'Thanatophoric Dysplasia',
    description:
      'Lethal skeletal dysplasia causing severely shortened limbs, narrow thorax, and respiratory insufficiency at birth.',
    category: 'Skeletal',
    inheritance: 'Autosomal Dominant',
    severity: 'high',
    snpCount: 2,
    confidence: 'high',
  },

  // ── Pharmacogenomics ───────────────────────────────────────────────────
  // NOTE: The full Mergenix pharmacogenomics panel covers 12 PGx genes
  // (CYP2D6, CYP2C19, CYP2C9, CYP3A4, CYP3A5, CYP1A2, DPYD, TPMT,
  // NUDT15, SLCO1B1, VKORC1, UGT1A1). Only CYP2D6 and CYP2C19 are
  // represented in this curated catalog; the remaining 10 are available
  // through the full carrier_panel.json dataset and analysis engine.
  {
    slug: 'cyp2d6-poor-metabolizer',
    name: 'CYP2D6 Poor Metabolizer',
    description:
      'Reduced drug metabolism affecting response to codeine, tamoxifen, antidepressants, and many other medications. Simplified classification — metabolizer status involves complex allele systems with >100 known haplotypes.',
    category: 'Pharmacogenomics',
    inheritance: 'Complex',
    severity: 'moderate',
    snpCount: 3,
    confidence: 'medium',
  },
  {
    slug: 'cyp2c19-poor-metabolizer',
    name: 'CYP2C19 Poor Metabolizer',
    description:
      'Impaired metabolism of clopidogrel, proton pump inhibitors, and certain antidepressants, affecting drug efficacy. Simplified classification — metabolizer status involves complex allele systems with >100 known haplotypes.',
    category: 'Pharmacogenomics',
    inheritance: 'Complex',
    severity: 'moderate',
    snpCount: 2,
    confidence: 'medium',
  },

  // ── Other ──────────────────────────────────────────────────────────────
  {
    slug: 'familial-mediterranean-fever',
    name: 'Familial Mediterranean Fever',
    description:
      'Autoinflammatory disorder causing recurrent fevers, serositis, and risk of amyloidosis if untreated.',
    category: 'Other',
    inheritance: 'Autosomal Recessive',
    severity: 'moderate',
    snpCount: 4,
    confidence: 'medium',
  },
  {
    slug: 'bardet-biedl-syndrome',
    name: 'Bardet-Biedl Syndrome',
    description:
      'Ciliopathy causing retinal degeneration, obesity, polydactyly, renal anomalies, and cognitive impairment.',
    category: 'Other',
    inheritance: 'Autosomal Recessive',
    severity: 'high',
    snpCount: 24,
    confidence: 'high',
  },
];

// ---------------------------------------------------------------------------
// Detailed disease data (for individual disease pages)
// ---------------------------------------------------------------------------

const DISEASE_DETAILS: Record<string, Omit<DiseaseDetail, keyof DiseaseEntry>> = {
  'cystic-fibrosis': {
    fullDescription:
      'Cystic fibrosis is an inherited disorder that causes severe damage to the lungs, digestive system, and other organs. It affects the cells that produce mucus, sweat, and digestive juices, causing these fluids to become thick and sticky. Instead of acting as lubricants, these secretions plug up tubes, ducts, and passageways. Modern CFTR modulator therapies like Trikafta have significantly improved outcomes for many patients.',
    snps: [
      { rsid: 'rs75030207', gene: 'CFTR', allele: 'C>T', source: 'ClinVar' },
      { rsid: 'rs113993960', gene: 'CFTR', allele: 'G>A (G542X)', source: 'ClinVar' },
      { rsid: 'rs121908745', gene: 'CFTR', allele: 'C>T (G551D)', source: 'OMIM' },
      { rsid: 'rs121908746', gene: 'CFTR', allele: 'A>G (N1303K)', source: 'OMIM' },
      { rsid: 'rs121908747', gene: 'CFTR', allele: 'G>T (W1282X)', source: 'ClinVar' },
    ],
    carrierFrequency: '1 in 25 (European descent)',
    affectedFrequency: '1 in 3,500',
    notes:
      'Most common lethal genetic disease in individuals of European descent. Carrier frequency varies significantly by ancestry — higher rates are also observed in Ashkenazi Jewish and Hispanic populations due to founder effects. Newborn screening is standard in most countries. CFTR modulator therapies (ivacaftor, lumacaftor/ivacaftor, tezacaftor/ivacaftor, elexacaftor/tezacaftor/ivacaftor) have transformed outcomes for many genotypes.',
    sources: ['ClinVar', 'OMIM', 'GeneReviews', 'CFTR2 Database'],
  },
  'sickle-cell-disease': {
    fullDescription:
      'Sickle cell disease is a group of inherited red blood cell disorders. In SCD, the red blood cells become hard and sticky and look like a C-shaped farm tool called a sickle. Sickle cells die early, causing a constant shortage of red blood cells. When they travel through small blood vessels, they get stuck and clog the blood flow, causing pain and other serious complications including stroke, acute chest syndrome, and organ damage.',
    snps: [{ rsid: 'rs334', gene: 'HBB', allele: 'A>T (Glu6Val)', source: 'ClinVar' }],
    carrierFrequency: '1 in 13 (African American)',
    affectedFrequency: '1 in 500 (African American)',
    notes:
      'Most common inherited blood disorder worldwide. Carrier state (sickle cell trait) provides partial malaria resistance. Hydroxyurea, L-glutamine, voxelotor, and crizanlizumab are approved treatments. Gene therapy and bone marrow transplantation can be curative.',
    sources: ['ClinVar', 'OMIM', 'GeneReviews'],
  },
  'tay-sachs-disease': {
    fullDescription:
      'Tay-Sachs disease is a rare, inherited disorder that progressively destroys nerve cells (neurons) in the brain and spinal cord. The most common form, infantile Tay-Sachs, usually appears around 3 to 6 months of age. Infants lose motor skills, become blind, and experience seizures and intellectual disability. Late-onset forms exist with slower progression.',
    snps: [
      { rsid: 'rs76173977', gene: 'HEXA', allele: 'C>T', source: 'OMIM' },
      { rsid: 'rs104894050', gene: 'HEXA', allele: 'T>C (G269S)', source: 'ClinVar' },
      { rsid: 'rs74729518', gene: 'HEXA', allele: 'C>T', source: 'OMIM' },
      { rsid: 'rs386834344', gene: 'HEXA', allele: 'T>C', source: 'ClinVar' },
    ],
    carrierFrequency: '1 in 30 (Ashkenazi Jewish)',
    affectedFrequency: '1 in 320,000 (general population)',
    notes:
      'Higher carrier frequency in Ashkenazi Jewish, French-Canadian, and Cajun populations. Carrier screening programs have reduced incidence by over 90% in high-risk populations. No cure exists; treatment is supportive. Enzyme replacement and gene therapy are under investigation.',
    sources: ['ClinVar', 'OMIM', 'GeneReviews'],
  },
  phenylketonuria: {
    fullDescription:
      'Phenylketonuria (PKU) is an inborn error of phenylalanine metabolism caused by deficiency of the enzyme phenylalanine hydroxylase. Without treatment, phenylalanine accumulates in the blood and brain, causing intellectual disability, seizures, behavioral problems, and a musty body odor. Early detection through newborn screening and lifelong dietary restriction of phenylalanine can prevent intellectual disability.',
    snps: [
      { rsid: 'rs5030858', gene: 'PAH', allele: 'C>T (R408W)', source: 'OMIM' },
      { rsid: 'rs121912706', gene: 'PAH', allele: 'G>A', source: 'ClinVar' },
      { rsid: 'rs5030849', gene: 'PAH', allele: 'G>A (IVS12)', source: 'OMIM' },
    ],
    carrierFrequency: '1 in 50',
    affectedFrequency: '1 in 12,000',
    notes:
      'One of the most successfully treated genetic disorders due to universal newborn screening. Sapropterin (Kuvan) can reduce phenylalanine levels in some genotypes. Pegvaliase (Palynziq) is approved for adults. Gene therapy trials are underway.',
    sources: ['ClinVar', 'OMIM', 'GeneReviews', 'BIOPKU Database'],
  },
  'familial-hypercholesterolemia': {
    fullDescription:
      'Familial hypercholesterolemia (FH) is an inherited condition causing very high levels of LDL cholesterol from birth. Without treatment, people with FH develop coronary artery disease much earlier than expected. Heterozygous FH affects about 1 in 250 people and is one of the most common serious genetic conditions. Homozygous FH is rarer but far more severe.',
    snps: [
      { rsid: 'rs28942078', gene: 'LDLR', allele: 'C>T', source: 'ClinVar' },
      { rsid: 'rs121908026', gene: 'LDLR', allele: 'C>T', source: 'OMIM' },
      { rsid: 'rs5742904', gene: 'APOB', allele: 'G>A (R3527Q)', source: 'ClinVar' },
      { rsid: 'rs505151', gene: 'PCSK9', allele: 'A>G', source: 'OMIM' },
    ],
    carrierFrequency: '1 in 250 (autosomal dominant — carrier frequency equals prevalence)',
    affectedFrequency: '1 in 250 (heterozygous)',
    notes:
      'Autosomal dominant — carriers express the condition, so carrier frequency and affected frequency are equivalent for heterozygous FH. One of the most common genetic conditions but severely underdiagnosed — less than 10% of cases are identified. Treatment includes statins, ezetimibe, PCSK9 inhibitors, and LDL apheresis. Cascade screening of family members is strongly recommended.',
    sources: ['ClinVar', 'OMIM', 'GeneReviews', 'FH Foundation'],
  },
  'marfan-syndrome': {
    fullDescription:
      'Marfan syndrome is a connective tissue disorder caused by mutations in the FBN1 gene encoding fibrillin-1. It affects the heart, eyes, blood vessels, and skeleton. The most serious complication is aortic root dilation leading to aortic dissection and rupture. With proper management including regular cardiac monitoring and prophylactic surgery, life expectancy has improved dramatically.',
    snps: [
      { rsid: 'rs137854473', gene: 'FBN1', allele: 'C>T', source: 'OMIM' },
      { rsid: 'rs137854462', gene: 'FBN1', allele: 'G>A', source: 'ClinVar' },
      { rsid: 'rs137854463', gene: 'FBN1', allele: 'C>T', source: 'OMIM' },
      { rsid: 'rs121909364', gene: 'FBN1', allele: 'C>T', source: 'ClinVar' },
    ],
    carrierFrequency: '1 in 5,000 (autosomal dominant — carriers express the condition)',
    affectedFrequency: '1 in 5,000',
    notes:
      'Autosomal dominant with variable expressivity — carrier frequency equals prevalence since one pathogenic allele is sufficient to cause disease. About 25% of cases are de novo mutations with no family history. Beta-blockers and losartan are used to slow aortic root dilation. Prophylactic aortic root replacement is performed when dilation reaches threshold. Annual echocardiography is essential.',
    sources: ['ClinVar', 'OMIM', 'GeneReviews'],
  },
  'brca1-breast-ovarian-cancer': {
    fullDescription:
      'BRCA1 is a tumor suppressor gene involved in DNA double-strand break repair. Pathogenic variants confer a substantially increased lifetime risk of breast cancer (60-80%) and ovarian cancer (40-60%). Other associated cancers include fallopian tube, peritoneal, pancreatic, and prostate cancer. Identification of carriers enables risk-reducing strategies including enhanced surveillance and prophylactic surgery.',
    snps: [
      { rsid: 'rs80357906', gene: 'BRCA1', allele: 'C>T', source: 'ClinVar' },
      { rsid: 'rs80357713', gene: 'BRCA1', allele: 'insC (5382insC)', source: 'ClinVar' },
      { rsid: 'rs80357914', gene: 'BRCA1', allele: 'delAG (185delAG)', source: 'ClinVar' },
    ],
    carrierFrequency: '1 in 400 (general); 1 in 40 (Ashkenazi Jewish)',
    affectedFrequency: 'Penetrance-dependent',
    notes:
      'Founder mutations (185delAG, 5382insC, 6174delT) are more common in Ashkenazi Jewish populations. Risk management includes enhanced breast MRI screening, risk-reducing mastectomy, and risk-reducing salpingo-oophorectomy. PARP inhibitors are effective targeted therapies for BRCA-associated cancers.',
    sources: ['ClinVar', 'OMIM', 'GeneReviews', 'NCCN Guidelines'],
  },
  'severe-combined-immunodeficiency': {
    fullDescription:
      'Severe combined immunodeficiency (SCID) represents a group of rare, life-threatening disorders characterized by profound deficiencies in T-cell and B-cell function. Without treatment, affected infants typically die from overwhelming infections within the first year of life. Multiple genetic forms exist, with X-linked SCID (IL2RG mutations) being the most common. Newborn screening and early treatment have dramatically improved outcomes.',
    snps: [
      { rsid: 'rs104895098', gene: 'IL2RG', allele: 'C>T', source: 'ClinVar' },
      { rsid: 'rs104895099', gene: 'IL2RG', allele: 'G>A', source: 'OMIM' },
    ],
    carrierFrequency: 'Rare (estimated 1 in 25,000–50,000 female carriers for X-linked form)',
    affectedFrequency: '1 in 50,000–100,000 live births (all genetic forms combined)',
    notes:
      'Multiple genetic forms exist; X-linked SCID (IL2RG) is the most common (~40–50% of cases). Approximately one-third of X-linked SCID cases arise from de novo mutations. Hematopoietic stem cell transplantation is curative when performed early. Gene therapy is approved for ADA-SCID (Strimvelis) and showing promise for X-linked SCID. Newborn TREC screening enables pre-symptomatic diagnosis. Without treatment, SCID is universally fatal.',
    sources: ['ClinVar', 'OMIM', 'GeneReviews'],
  },
};

// ---------------------------------------------------------------------------
// UI helpers
// ---------------------------------------------------------------------------

/**
 * Map an inheritance model string to the corresponding Badge variant.
 * Used by catalog-content.tsx and [slug]/page.tsx.
 */
export function inheritanceVariant(
  inheritance: string,
): 'autosomal-recessive' | 'autosomal-dominant' | 'x-linked' | 'complex' {
  if (inheritance === 'Complex') return 'complex';
  if (inheritance.startsWith('X-Linked')) return 'x-linked';
  if (inheritance.includes('Recessive')) return 'autosomal-recessive';
  if (inheritance.includes('Dominant')) return 'autosomal-dominant';
  return 'x-linked';
}

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

/** Get all unique categories from the disease dataset. */
export function getAllCategories(): string[] {
  const categories = new Set(DISEASES.map((d) => d.category));
  return Array.from(categories).sort();
}

/** Get all unique inheritance models. */
export function getAllInheritanceModels(): string[] {
  const models = new Set(DISEASES.map((d) => d.inheritance));
  return Array.from(models).sort();
}

/** Look up a disease by its slug. Returns the catalog entry, or undefined. */
export function getDiseaseBySlug(slug: string): DiseaseDetail | undefined {
  const entry = DISEASES.find((d) => d.slug === slug);
  if (!entry) return undefined;

  const detail = DISEASE_DETAILS[slug];
  if (detail) {
    return { ...entry, ...detail };
  }

  // Fallback for diseases without hand-written detail
  return {
    ...entry,
    fullDescription: entry.description,
    snps: [],
    carrierFrequency: 'Varies by population',
    affectedFrequency: 'See GeneReviews',
    notes:
      'Detailed clinical information for this condition is available through OMIM and GeneReviews. Consult a genetic counselor for personalized risk assessment.',
    sources: ['ClinVar', 'OMIM'],
  };
}

/** Get diseases belonging to the same category, excluding the given slug. */
export function getRelatedDiseases(slug: string, limit = 3): DiseaseEntry[] {
  const disease = DISEASES.find((d) => d.slug === slug);
  if (!disease) return [];
  return DISEASES.filter((d) => d.category === disease.category && d.slug !== slug).slice(0, limit);
}

/** Compute aggregate statistics from the dataset. */
export function getDiseaseStats() {
  const categories = getAllCategories();
  const totalSnps = DISEASES.reduce((sum, d) => sum + d.snpCount, 0);
  const inheritanceModels = getAllInheritanceModels();

  return {
    totalDiseases: CARRIER_PANEL_COUNT,
    catalogDiseases: DISEASES.length,
    totalSnps: 8_200, // Approximate from full panel
    catalogSnps: totalSnps,
    categoryCount: 15, // Full panel category count
    catalogCategories: categories.length,
    inheritanceModels: inheritanceModels.length,
  };
}
