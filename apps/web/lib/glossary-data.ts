/**
 * Static glossary data for the Mergenix genetic glossary.
 *
 * 26 curated terms drawn from glossary.json, covering the key genetics
 * concepts used throughout the application.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GlossaryTerm {
  term: string;
  definition: string;
}

// ---------------------------------------------------------------------------
// Glossary terms (26 entries, alphabetically ordered)
// ---------------------------------------------------------------------------

export const GLOSSARY_TERMS: GlossaryTerm[] = [
  {
    term: 'Allele',
    definition:
      'One of two or more versions of a gene. Each person inherits two alleles for each gene, one from each parent.',
  },
  {
    term: 'Autosomal Dominant',
    definition:
      'An inheritance pattern where only one copy of a mutated gene (from either parent) is needed to cause the condition.',
  },
  {
    term: 'Autosomal Recessive',
    definition:
      'An inheritance pattern where two copies of a mutated gene (one from each parent) are needed to cause the condition.',
  },
  {
    term: 'Carrier',
    definition:
      "A person who has one copy of a recessive gene variant. Carriers typically don't show symptoms but can pass the variant to children.",
  },
  {
    term: 'ClinVar',
    definition:
      'A public archive of reports about the relationships among human genetic variations and clinical conditions, maintained by NCBI.',
  },
  {
    term: 'Confidence Level',
    definition:
      'An indicator of how well-supported a genetic finding is, based on the quality and quantity of available evidence.',
  },
  {
    term: 'dbSNP',
    definition:
      'A public database maintained by NCBI that catalogs short genetic variations (SNPs, indels) across different species, serving as a central reference for variant identification.',
  },
  {
    term: 'Gene',
    definition:
      'A segment of DNA that contains instructions for making proteins or functional RNA molecules. Genes are the basic units of heredity passed from parents to offspring.',
  },
  {
    term: 'Genome',
    definition:
      'The complete set of DNA in an organism, including all of its genes and non-coding sequences. The human genome contains approximately 3 billion base pairs.',
  },
  {
    term: 'Genotype',
    definition:
      'The genetic makeup of an individual, specifically the combination of alleles at a particular gene locus.',
  },
  {
    term: 'Haplotype',
    definition:
      'A set of DNA variations (polymorphisms) that tend to be inherited together from a single parent. Haplotypes are useful for tracing ancestry and disease associations.',
  },
  {
    term: 'Heterozygous',
    definition:
      'Having two different alleles at a particular gene locus — one from each parent. In recessive conditions, this typically means carrier status.',
  },
  {
    term: 'Homozygous',
    definition:
      'Having two identical alleles at a particular gene locus. Being homozygous for a recessive disease allele typically means being affected.',
  },
  {
    term: 'Locus',
    definition:
      'The specific physical position of a gene or DNA sequence on a chromosome. Each gene occupies a defined locus, and variants at the same locus are called alleles.',
  },
  {
    term: 'Mendelian Inheritance',
    definition:
      "Patterns of inheritance that follow Mendel's laws, including autosomal dominant, autosomal recessive, and X-linked patterns.",
  },
  {
    term: 'OMIM',
    definition:
      'Online Mendelian Inheritance in Man — a comprehensive database cataloging all known human genes and genetic disorders.',
  },
  {
    term: 'Penetrance',
    definition:
      'The proportion of individuals with a given genotype who actually exhibit the associated phenotype. A gene with 80% penetrance means 80% of carriers will show symptoms.',
  },
  {
    term: 'Pharmacogenomics',
    definition:
      "The study of how genes affect a person's response to medications. Used to predict drug metabolism and guide dosing decisions.",
  },
  {
    term: 'Phenotype',
    definition:
      'The observable characteristics of an individual, resulting from the interaction of their genotype with the environment.',
  },
  {
    term: 'Polygenic Risk Score',
    definition:
      'A numerical score that estimates genetic susceptibility to a complex disease by aggregating the effects of many genetic variants.',
  },
  {
    term: 'Punnett Square',
    definition:
      'A diagram used to predict the possible genotypes of offspring based on the genotypes of the parents.',
  },
  {
    term: 'SNP',
    definition:
      'Single Nucleotide Polymorphism — a variation at a single position in a DNA sequence. The most common type of genetic variation.',
  },
  {
    term: 'Variant',
    definition:
      'A change in the DNA sequence compared to a reference. Variants may be benign, pathogenic, or of uncertain significance.',
  },
  {
    term: 'VCF',
    definition:
      'Variant Call Format — a standard file format for storing gene sequence variations, commonly used in bioinformatics.',
  },
  {
    term: 'Wild Type',
    definition:
      'The most common allele or genotype found in a population, considered the standard or normal version. Variants are typically described relative to the wild type.',
  },
  {
    term: 'X-Linked',
    definition:
      'An inheritance pattern where the gene is located on the X chromosome. Males (XY) are more commonly affected since they have only one X.',
  },
];

// ---------------------------------------------------------------------------
// Related terms mapping
// ---------------------------------------------------------------------------

export const RELATED_TERMS: Record<string, string[]> = {
  Allele: ['Gene', 'Genotype', 'Heterozygous', 'Homozygous', 'Wild Type'],
  'Autosomal Dominant': ['Autosomal Recessive', 'Mendelian Inheritance', 'Penetrance'],
  'Autosomal Recessive': ['Autosomal Dominant', 'Carrier', 'Mendelian Inheritance'],
  Carrier: ['Autosomal Recessive', 'Heterozygous', 'Allele'],
  ClinVar: ['Variant', 'SNP', 'dbSNP'],
  'Confidence Level': ['Polygenic Risk Score', 'Pharmacogenomics'],
  dbSNP: ['SNP', 'Variant', 'ClinVar'],
  Gene: ['Allele', 'Genome', 'Locus'],
  Genome: ['Gene', 'Haplotype'],
  Genotype: ['Phenotype', 'Allele', 'Homozygous', 'Heterozygous'],
  Haplotype: ['Genome', 'SNP', 'Allele'],
  Heterozygous: ['Homozygous', 'Carrier', 'Allele'],
  Homozygous: ['Heterozygous', 'Allele', 'Wild Type'],
  Locus: ['Gene', 'Allele'],
  'Mendelian Inheritance': [
    'Autosomal Dominant',
    'Autosomal Recessive',
    'X-Linked',
    'Punnett Square',
  ],
  OMIM: ['ClinVar', 'Mendelian Inheritance'],
  Penetrance: ['Genotype', 'Phenotype', 'Autosomal Dominant'],
  Pharmacogenomics: ['Genotype', 'Phenotype', 'Variant'],
  Phenotype: ['Genotype', 'Penetrance'],
  'Polygenic Risk Score': ['SNP', 'Variant', 'Phenotype'],
  'Punnett Square': ['Genotype', 'Allele', 'Mendelian Inheritance'],
  SNP: ['Variant', 'Allele', 'dbSNP'],
  Variant: ['SNP', 'Allele', 'ClinVar', 'Wild Type'],
  VCF: ['Variant', 'SNP'],
  'Wild Type': ['Allele', 'Variant', 'Homozygous'],
  'X-Linked': ['Mendelian Inheritance', 'Autosomal Dominant', 'Autosomal Recessive'],
};
