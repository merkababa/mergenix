const { spawnSync } = require('child_process');
const fs = require('fs');
const basedir = 'C:/Users/t2tec/Tortit/docs/research/agent-logs/2026-02-26-pr111-r2-review';
const env = { ...process.env, PATH: process.env.PATH + ';C:\\Users\\t2tec\\AppData\\Roaming\\npm' };

// Shorter, focused legal prompt to reduce timeout risk
const prompt = `You are a privacy attorney and data protection officer reviewing genetic data additions for a consumer genetics platform (Mergenix).

Grade A+ through F: A+ = zero issues, A = 1-2 minor, A- = 3+ minor, B = moderate, C = significant, D/F = blocking.

## What this PR adds
64 new trait entries to a STATIC REFERENCE JSON file (trait-snps.json). This is a lookup table with scientific descriptions of SNP associations — it does NOT store user data.

## Context
- Platform is pre-launch alpha, ZERO existing users (no GDPR re-consent obligation)
- User genetic data is processed client-side; this JSON never directly stores personal data
- Processing purpose is unchanged: genetic trait analysis

## New entries with legal concerns

1. Reproductive/Hormonal (6 traits): Puberty Onset Timing (KISS1), Estrogen Receptor Beta (ESR2), Estrogen Clearance Rate (COMT), LH Receptor Sensitivity (LHCGR), Progesterone Receptor Sensitivity (PGR), Prostaglandin Synthesis/Fertility (PTGS2)

2. Health-adjacent notes with disease mentions:
   - rs4633 (COMT/Estrogen Clearance): notes mention "studied in hormone-receptor-positive breast cancer risk"
   - rs1800932 (PGR): sources list "Progesterone receptor polymorphism and endometrial cancer"
   - rs5743708 (TLR2/Periodontal): PMID cited is a tuberculosis paper
   - rs2853676 (TERT/Dental Pulp): dental pulp stem cells, aging

3. Medical disclaimers present:
   - 8 entries have: "This is a risk modifier, not a diagnosis. Consult a healthcare provider."
   - Reproductive entries have: "Not a diagnosis — consult a [specialist] for [concern]."

## Evaluate these specific concerns:
1. GINA compliance: Are health-adjacent traits (fertility, hormones, dental health) adequately disclaimed against employment/insurance discrimination use?
2. Medical disclaimer adequacy: Is "Not a diagnosis" sufficient for reproductive/hormonal traits that mention cancer risk in notes?
3. GDPR Article 9: Does adding new trait definitions to a static reference file constitute new genetic data processing requiring consent?
4. Any regulatory concern with "Puberty Onset Timing" trait being available to all users (no age gate)?

Grade A+ through F with specific evidence. Keep response concise (under 500 words).`;

console.log(`Running legal review (prompt: ${prompt.length} chars)...`);
const result = spawnSync('cmd', ['/c', 'gemini', '--model', 'gemini-3.1-pro-preview'], {
  input: prompt,
  timeout: 250000,
  maxBuffer: 10 * 1024 * 1024,
  encoding: 'utf8',
  env,
});
if (result.stdout && result.stdout.length > 100) {
  fs.writeFileSync(basedir + '/legal.md', result.stdout);
  console.log('SAVED: ' + result.stdout.length + ' chars');
  console.log(result.stdout);
} else {
  console.log('Failed. status: ' + result.status);
  console.log('stderr: ' + (result.stderr || '').substring(0, 200));
  if (result.error) console.log('error: ' + result.error.message.substring(0, 100));
}
