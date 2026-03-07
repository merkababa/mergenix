/**
 * Golden Standard Dataset — VCF format (Q1a)
 *
 * Hand-curated, small (~100 variant) VCF file with KNOWN expected parse
 * results. Serves as a regression anchor for the VCF parser.
 *
 * Included pathogenic variants:
 * - rs334        : Sickle Cell Disease, HBB, GT=0/1 → 'AT'
 * - rs113993960  : Cystic Fibrosis (G542X), CFTR, GT=0/1 → 'GA'
 *
 * Edge cases covered:
 * - Phased variant (GT uses | separator): rs3094315 GT=0|1 → 'AG'
 * - Multi-allelic variant (comma in ALT): rs12124819, ALT=C,T, GT=0/2 → 'AT'
 * - No-call line (GT=./.) — must NOT appear in output
 * - Variant without rsID (ID='.') — must NOT appear in output
 *
 * Zero PII — all data is synthetic.
 */

import type { GoldenDataset } from './golden-types';

/**
 * Golden VCF dataset.
 *
 * ~100 variants including:
 * - rs334 (Sickle Cell): heterozygous — REF=A, ALT=T, GT=0/1 → genotype 'AT'
 * - rs113993960 (CF G542X): heterozygous — REF=G, ALT=A, GT=0/1 → genotype 'GA'
 * - One phased variant (GT uses | separator): rs3094315 GT=0|1 → 'AG'
 * - One multi-allelic variant (comma in ALT): rs12124819, ALT=C,T, GT=0/2 → REF+T='AT'
 * - One no-call line (GT=./.) that must NOT appear in output
 * - One variant without rsID (ID='.') that must NOT appear in output
 * - Standard VCFv4.1 format with ##fileformat, ##FORMAT, #CHROM header
 */
export const GOLDEN_VCF: GoldenDataset = {
  name: 'VCF Golden',
  content: [
    '##fileformat=VCFv4.1',
    '##FILTER=<ID=PASS,Description="All filters passed">',
    '##FORMAT=<ID=GT,Number=1,Type=String,Description="Genotype">',
    '##FORMAT=<ID=DP,Number=1,Type=Integer,Description="Read Depth">',
    '#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\tSAMPLE1',
    // Standard SNP: homozygous ref
    '1\t82154\trs4477212\tA\tG\t100\tPASS\t.\tGT:DP\t0/0:30',
    // Standard SNP: heterozygous (unphased)
    '1\t752566\trs3094315\tA\tG\t100\tPASS\t.\tGT:DP\t0|1:25',
    // Standard SNP: homozygous alt
    '1\t752721\trs3131972\tA\tG\t100\tPASS\t.\tGT:DP\t1/1:20',
    // Multi-allelic: REF=A, ALT=C,T, GT=0/2 → allele index 2 = 'T' → genotype 'AT'
    '1\t776546\trs12124819\tA\tC,T\t100\tPASS\t.\tGT:DP\t0/2:28',
    // Pathogenic variants
    '11\t5246696\trs334\tA\tT\t100\tPASS\t.\tGT:DP\t0/1:35',
    '7\t117227832\trs113993960\tG\tA\t100\tPASS\t.\tGT:DP\t0/1:40',
    // No-call — must NOT appear in output
    '1\t999999\trs999999996\tA\tG\t100\tPASS\t.\tGT:DP\t./.:30',
    // No rsID (dot) — must NOT appear in output
    '1\t888888\t.\tC\tT\t100\tPASS\t.\tGT:DP\t0/1:20',
    // More data
    '2\t234668\trs1110052\tC\tT\t100\tPASS\t.\tGT:DP\t0/0:30',
    '2\t337674\trs2272756\tG\tA\t100\tPASS\t.\tGT:DP\t0/0:30',
    '2\t423345\trs1372726\tA\tC\t100\tPASS\t.\tGT:DP\t0/0:30',
    '2\t543236\trs1390716\tC\tG\t100\tPASS\t.\tGT:DP\t0/0:30',
    '2\t644457\trs2312724\tA\tG\t100\tPASS\t.\tGT:DP\t0/1:25',
    '2\t745678\trs1011721\tG\tT\t100\tPASS\t.\tGT:DP\t0/0:30',
    '3\t234678\trs3772319\tA\tC\t100\tPASS\t.\tGT:DP\t0/0:30',
    '3\t345789\trs2304390\tC\tT\t100\tPASS\t.\tGT:DP\t0/0:30',
    '3\t456890\trs1048990\tG\tA\t100\tPASS\t.\tGT:DP\t0/0:30',
    '3\t567901\trs2067690\tA\tT\t100\tPASS\t.\tGT:DP\t0/0:30',
    '3\t679012\trs4678023\tC\tG\t100\tPASS\t.\tGT:DP\t0/0:30',
    '3\t780123\trs1874290\tG\tC\t100\tPASS\t.\tGT:DP\t0/0:30',
    '4\t123456\trs3812704\tA\tG\t100\tPASS\t.\tGT:DP\t0/0:30',
    '4\t234567\trs2761230\tC\tT\t100\tPASS\t.\tGT:DP\t0/0:30',
    '4\t345678\trs4901934\tG\tA\t100\tPASS\t.\tGT:DP\t0/0:30',
    '4\t456789\trs1236780\tA\tC\t100\tPASS\t.\tGT:DP\t0/0:30',
    '4\t567890\trs5678901\tC\tG\t100\tPASS\t.\tGT:DP\t0/0:30',
    '4\t678901\trs6789012\tG\tT\t100\tPASS\t.\tGT:DP\t0/0:30',
    '5\t789012\trs7890123\tA\tG\t100\tPASS\t.\tGT:DP\t0/0:30',
    '5\t890123\trs8901234\tC\tT\t100\tPASS\t.\tGT:DP\t0/0:30',
    '5\t901234\trs9012345\tG\tA\t100\tPASS\t.\tGT:DP\t0/0:30',
    '5\t1023456\trs1023456\tA\tC\t100\tPASS\t.\tGT:DP\t0/0:30',
    '5\t234567\trs2034567\tC\tG\t100\tPASS\t.\tGT:DP\t0/0:30',
    '5\t345678\trs3045678\tG\tT\t100\tPASS\t.\tGT:DP\t0/0:30',
    '6\t456789\trs4056789\tA\tG\t100\tPASS\t.\tGT:DP\t0/0:30',
    '6\t567890\trs5067890\tC\tT\t100\tPASS\t.\tGT:DP\t0/0:30',
    '6\t678901\trs6078901\tG\tA\t100\tPASS\t.\tGT:DP\t0/0:30',
    '6\t789012\trs7089012\tA\tC\t100\tPASS\t.\tGT:DP\t0/0:30',
    '6\t890123\trs8090123\tC\tG\t100\tPASS\t.\tGT:DP\t0/0:30',
    '6\t901234\trs9001234\tG\tT\t100\tPASS\t.\tGT:DP\t0/0:30',
    '7\t112345\trs1112345\tA\tG\t100\tPASS\t.\tGT:DP\t0/0:30',
    '7\t223456\trs2223456\tC\tT\t100\tPASS\t.\tGT:DP\t0/0:30',
    '7\t334567\trs3334567\tG\tA\t100\tPASS\t.\tGT:DP\t0/0:30',
    '7\t445678\trs4445678\tA\tC\t100\tPASS\t.\tGT:DP\t0/0:30',
    '7\t556789\trs5556789\tC\tG\t100\tPASS\t.\tGT:DP\t0/0:30',
    '7\t667890\trs6667890\tG\tT\t100\tPASS\t.\tGT:DP\t0/0:30',
    '8\t778901\trs7778901\tA\tG\t100\tPASS\t.\tGT:DP\t0/0:30',
    '8\t889012\trs8889012\tC\tT\t100\tPASS\t.\tGT:DP\t0/0:30',
    '8\t990123\trs9990123\tG\tA\t100\tPASS\t.\tGT:DP\t0/0:30',
    '8\t101234\trs1101234\tA\tC\t100\tPASS\t.\tGT:DP\t0/0:30',
    '8\t212345\trs2212345\tC\tG\t100\tPASS\t.\tGT:DP\t0/0:30',
    '8\t323456\trs3323456\tG\tT\t100\tPASS\t.\tGT:DP\t0/0:30',
    '9\t434567\trs4434567\tA\tG\t100\tPASS\t.\tGT:DP\t0/0:30',
    '9\t545678\trs5545678\tC\tT\t100\tPASS\t.\tGT:DP\t0/0:30',
    '9\t656789\trs6656789\tG\tA\t100\tPASS\t.\tGT:DP\t0/0:30',
    '9\t767890\trs7767890\tA\tC\t100\tPASS\t.\tGT:DP\t0/0:30',
    '9\t878901\trs8878901\tC\tG\t100\tPASS\t.\tGT:DP\t0/0:30',
    '9\t989012\trs9989012\tG\tT\t100\tPASS\t.\tGT:DP\t0/0:30',
    '10\t100123\trs1100123\tA\tG\t100\tPASS\t.\tGT:DP\t0/0:30',
    '10\t211234\trs2211234\tC\tT\t100\tPASS\t.\tGT:DP\t0/0:30',
    '10\t322345\trs3322345\tG\tA\t100\tPASS\t.\tGT:DP\t0/0:30',
    '10\t433456\trs4433456\tA\tC\t100\tPASS\t.\tGT:DP\t0/0:30',
    '10\t544567\trs5544567\tC\tG\t100\tPASS\t.\tGT:DP\t0/0:30',
    '10\t655678\trs6655678\tG\tT\t100\tPASS\t.\tGT:DP\t0/0:30',
    '11\t766789\trs7766789\tA\tG\t100\tPASS\t.\tGT:DP\t0/0:30',
    '11\t877890\trs8877890\tC\tT\t100\tPASS\t.\tGT:DP\t0/0:30',
    '11\t988901\trs9988901\tG\tA\t100\tPASS\t.\tGT:DP\t0/0:30',
    '11\t99012\trs1099012\tA\tC\t100\tPASS\t.\tGT:DP\t0/0:30',
    '11\t210123\trs2210123\tC\tG\t100\tPASS\t.\tGT:DP\t0/0:30',
    '11\t321234\trs3321234\tG\tT\t100\tPASS\t.\tGT:DP\t0/0:30',
    '12\t432345\trs4432345\tA\tG\t100\tPASS\t.\tGT:DP\t0/0:30',
    '12\t543456\trs5543456\tC\tT\t100\tPASS\t.\tGT:DP\t0/0:30',
    '12\t654567\trs6654567\tG\tA\t100\tPASS\t.\tGT:DP\t0/0:30',
    '12\t765678\trs7765678\tA\tC\t100\tPASS\t.\tGT:DP\t0/0:30',
    '12\t876789\trs8876789\tC\tG\t100\tPASS\t.\tGT:DP\t0/0:30',
    '12\t987890\trs9987890\tG\tT\t100\tPASS\t.\tGT:DP\t0/0:30',
    '13\t98901\trs1098901\tA\tG\t100\tPASS\t.\tGT:DP\t0/0:30',
    '13\t209012\trs2209012\tC\tT\t100\tPASS\t.\tGT:DP\t0/0:30',
    '13\t320123\trs3320123\tG\tA\t100\tPASS\t.\tGT:DP\t0/0:30',
    '14\t431234\trs4431234\tA\tC\t100\tPASS\t.\tGT:DP\t0/0:30',
    '14\t542345\trs5542345\tC\tG\t100\tPASS\t.\tGT:DP\t0/0:30',
    '14\t653456\trs6653456\tG\tT\t100\tPASS\t.\tGT:DP\t0/0:30',
    '15\t764567\trs7764567\tA\tG\t100\tPASS\t.\tGT:DP\t0/0:30',
    '16\t875678\trs8875678\tC\tT\t100\tPASS\t.\tGT:DP\t0/0:30',
    '17\t986789\trs9986789\tG\tA\t100\tPASS\t.\tGT:DP\t0/0:30',
    '18\t97890\trs1097890\tA\tC\t100\tPASS\t.\tGT:DP\t0/0:30',
    'X\t208901\trs2208901\tC\tG\t100\tPASS\t.\tGT:DP\t0/0:30',
    'Y\t319012\trs3319012\tG\tT\t100\tPASS\t.\tGT:DP\t0/0:30',
    'MT\t1234\trs4430123\tA\tG\t100\tPASS\t.\tGT:DP\t0/0:30',
  ].join('\n'),

  expectedGenotypes: {
    rs4477212: 'AA', // 0/0 → REF+REF = A+A
    rs3094315: 'AG', // 0|1 (phased) → A+G
    rs3131972: 'GG', // 1/1 → ALT+ALT = G+G
    rs12124819: 'AT', // 0/2 multi-allelic → REF=A + ALT[2]=T
    rs334: 'AT', // 0/1 → A+T (pathogenic Sickle Cell)
    rs113993960: 'GA', // 0/1 → G+A (pathogenic CF G542X)
    // rs999999996 must NOT be present (no-call ./.)
    // '.' ID must NOT be present (no rsID)
    rs1110052: 'CC', // 0/0 → C+C
    rs2272756: 'GG', // 0/0 → REF+REF = G+G
    rs1372726: 'AA', // 0/0 → A+A
    rs1390716: 'CC', // 0/0 → C+C
    rs2312724: 'AG', // 0/1 → A+G
    rs1011721: 'GG', // 0/0 → REF+REF = G+G
    rs3772319: 'AA', // 0/0 → A+A
    rs2304390: 'CC', // 0/0 → C+C
    rs1048990: 'GG', // 0/0 → REF+REF = G+G
    rs2067690: 'AA', // 0/0 → A+A
    rs4678023: 'CC', // 0/0 → C+C
    rs1874290: 'GG', // 1/1 → G+G
    rs3812704: 'AA', // 0/0 → A+A
    rs2761230: 'CC', // 0/0 → C+C
    rs4901934: 'GG', // 1/1 → G+G
    rs1236780: 'AA', // 0/0 → A+A
    rs5678901: 'CC', // 0/0 → C+C
    rs6789012: 'GG', // 1/1 → G+G
    rs7890123: 'AA', // 0/0 → A+A
    rs8901234: 'CC', // 0/0 → C+C
    rs9012345: 'GG', // 1/1 → G+G
    rs1023456: 'AA', // 0/0 → A+A
    rs2034567: 'CC', // 0/0 → C+C
    rs3045678: 'GG', // 1/1 → G+G
    rs4056789: 'AA', // 0/0 → A+A
    rs5067890: 'CC', // 0/0 → C+C
    rs6078901: 'GG', // 1/1 → G+G
    rs7089012: 'AA', // 0/0 → A+A
    rs8090123: 'CC', // 0/0 → C+C
    rs9001234: 'GG', // 1/1 → G+G
    rs1112345: 'AA', // 0/0 → A+A
    rs2223456: 'CC', // 0/0 → C+C
    rs3334567: 'GG', // 1/1 → G+G
    rs4445678: 'AA', // 0/0 → A+A
    rs5556789: 'CC', // 0/0 → C+C
    rs6667890: 'GG', // 1/1 → G+G
    rs7778901: 'AA', // 0/0 → A+A
    rs8889012: 'CC', // 0/0 → C+C
    rs9990123: 'GG', // 1/1 → G+G
    rs1101234: 'AA', // 0/0 → A+A
    rs2212345: 'CC', // 0/0 → C+C
    rs3323456: 'GG', // 1/1 → G+G
    rs4434567: 'AA', // 0/0 → A+A
    rs5545678: 'CC', // 0/0 → C+C
    rs6656789: 'GG', // 1/1 → G+G
    rs7767890: 'AA', // 0/0 → A+A
    rs8878901: 'CC', // 0/0 → C+C
    rs9989012: 'GG', // 1/1 → G+G
    rs1100123: 'AA', // 0/0 → A+A
    rs2211234: 'CC', // 0/0 → C+C
    rs3322345: 'GG', // 1/1 → G+G
    rs4433456: 'AA', // 0/0 → A+A
    rs5544567: 'CC', // 0/0 → C+C
    rs6655678: 'GG', // 1/1 → G+G
    rs7766789: 'AA', // 0/0 → A+A
    rs8877890: 'CC', // 0/0 → C+C
    rs9988901: 'GG', // 1/1 → G+G
    rs1099012: 'AA', // 0/0 → A+A
    rs2210123: 'CC', // 0/0 → C+C
    rs3321234: 'GG', // 1/1 → G+G
    rs4432345: 'AA', // 0/0 → A+A
    rs5543456: 'CC', // 0/0 → C+C
    rs6654567: 'GG', // 1/1 → G+G
    rs7765678: 'AA', // 0/0 → A+A
    rs8876789: 'CC', // 0/0 → C+C
    rs9987890: 'GG', // 1/1 → G+G
    rs1098901: 'AA', // 0/0 → A+A
    rs2209012: 'CC', // 0/0 → C+C
    rs3320123: 'GG', // 1/1 → G+G
    rs4431234: 'AA', // 0/0 → A+A
    rs5542345: 'CC', // 0/0 → C+C
    rs6653456: 'GG', // 1/1 → G+G
    rs7764567: 'AA', // 0/0 → A+A
    rs8875678: 'CC', // 0/0 → C+C
    rs9986789: 'GG', // 1/1 → G+G
    rs1097890: 'AA', // 0/0 → A+A
    rs2208901: 'CC', // 0/0 → C+C
    rs3319012: 'GG', // 1/1 → G+G
    rs4430123: 'AA', // 0/0 → A+A
  },
};
