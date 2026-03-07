/**
 * Tests for the chip version/density detection module.
 *
 * Covers: chip profile detection for each provider, unknown SNP counts,
 * VCF format (no detection), confidence levels, chip notes, and
 * ENGINE_VERSION availability.
 */

import { describe, it, expect } from 'vitest';
import { detectChipVersion, getChipNotes, ENGINE_VERSION } from '../src/chip-detection';

// ─── ENGINE_VERSION ──────────────────────────────────────────────────────────

describe('ENGINE_VERSION', () => {
  it('should be a non-empty string', () => {
    expect(typeof ENGINE_VERSION).toBe('string');
    expect(ENGINE_VERSION.length).toBeGreaterThan(0);
  });

  it('should follow semver format', () => {
    expect(ENGINE_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('should be 3.1.0 for Stream E', () => {
    expect(ENGINE_VERSION).toBe('3.1.0');
  });
});

// ─── 23andMe Chip Detection ─────────────────────────────────────────────────

describe('detectChipVersion — 23andMe', () => {
  it('should detect v3 from high SNP count (960K)', () => {
    const result = detectChipVersion('23andme', 960000);
    expect(result).not.toBeNull();
    expect(result!.provider).toBe('23andMe');
    expect(result!.version).toBe('v3');
    expect(result!.snpCount).toBe(960000);
    expect(result!.confidence).toBeGreaterThan(0);
  });

  it('should detect v3 with higher confidence when markers present', () => {
    const genotypes = {
      rs4851251: 'AG',
      rs2296442: 'CT',
      rs2032582: 'GG',
    };
    const result = detectChipVersion('23andme', 960000, genotypes);
    expect(result).not.toBeNull();
    expect(result!.version).toBe('v3');
    expect(result!.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it('should detect v4 from ~570K SNP count', () => {
    const result = detectChipVersion('23andme', 570000);
    expect(result).not.toBeNull();
    expect(result!.provider).toBe('23andMe');
    expect(result!.version).toBe('v4');
  });

  it('should detect v5 from ~640K SNP count with markers', () => {
    const genotypes = {
      rs548049170: 'AG',
      rs13354714: 'CT',
      rs2298108: 'AA',
    };
    const result = detectChipVersion('23andme', 640000, genotypes);
    expect(result).not.toBeNull();
    expect(result!.provider).toBe('23andMe');
    expect(result!.version).toBe('v5');
    expect(result!.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it('should distinguish v4 from v5 in overlapping range using markers', () => {
    // 610K is in the overlap zone between v4 and v5
    const v5Markers = {
      rs548049170: 'AG',
      rs13354714: 'CT',
      rs2298108: 'AA',
    };
    const result = detectChipVersion('23andme', 610000, v5Markers);
    expect(result).not.toBeNull();
    expect(result!.version).toBe('v5');
  });

  it('should return unknown version for out-of-range SNP count', () => {
    const result = detectChipVersion('23andme', 100000);
    expect(result).not.toBeNull();
    expect(result!.provider).toBe('23andMe');
    expect(result!.version).toBe('unknown');
    expect(result!.confidence).toBe(0);
  });
});

// ─── AncestryDNA Chip Detection ──────────────────────────────────────────────

describe('detectChipVersion — AncestryDNA', () => {
  it('should detect v1 from ~700K SNP count', () => {
    const result = detectChipVersion('ancestrydna', 700000);
    expect(result).not.toBeNull();
    expect(result!.provider).toBe('AncestryDNA');
    expect(result!.version).toBe('v1');
  });

  it('should detect v2 from ~650K SNP count', () => {
    const result = detectChipVersion('ancestrydna', 650000);
    expect(result).not.toBeNull();
    expect(result!.provider).toBe('AncestryDNA');
    expect(result!.version).toBe('v2');
  });

  it('should use markers to increase v2 confidence', () => {
    const genotypes = {
      rs548049170: 'AG',
      rs13354714: 'CT',
    };
    const result = detectChipVersion('ancestrydna', 650000, genotypes);
    expect(result).not.toBeNull();
    expect(result!.version).toBe('v2');
    expect(result!.confidence).toBeGreaterThanOrEqual(0.8);
  });

  it('should return unknown for very low SNP count', () => {
    const result = detectChipVersion('ancestrydna', 50000);
    expect(result).not.toBeNull();
    expect(result!.provider).toBe('AncestryDNA');
    expect(result!.version).toBe('unknown');
    expect(result!.confidence).toBe(0);
  });
});

// ─── MyHeritage Chip Detection ───────────────────────────────────────────────

describe('detectChipVersion — MyHeritage', () => {
  it('should detect v1 from ~700K SNP count', () => {
    const result = detectChipVersion('myheritage', 700000);
    expect(result).not.toBeNull();
    expect(result!.provider).toBe('MyHeritage');
    expect(result!.version).toBe('v1');
  });

  it('should detect v1 at lower boundary', () => {
    const result = detectChipVersion('myheritage', 600000);
    expect(result).not.toBeNull();
    expect(result!.version).toBe('v1');
  });

  it('should detect v1 at upper boundary', () => {
    const result = detectChipVersion('myheritage', 800000);
    expect(result).not.toBeNull();
    expect(result!.version).toBe('v1');
  });

  it('should return unknown for out-of-range SNP count', () => {
    const result = detectChipVersion('myheritage', 100000);
    expect(result).not.toBeNull();
    expect(result!.provider).toBe('MyHeritage');
    expect(result!.version).toBe('unknown');
    expect(result!.confidence).toBe(0);
  });
});

// ─── VCF (No Chip Detection) ─────────────────────────────────────────────────

describe('detectChipVersion — VCF', () => {
  it('should return null for VCF format', () => {
    const result = detectChipVersion('vcf', 4000000);
    expect(result).toBeNull();
  });

  it('should return null for VCF even with genotypes provided', () => {
    const result = detectChipVersion('vcf', 4000000, { rs1234: 'AG' });
    expect(result).toBeNull();
  });
});

// ─── Unknown Format ──────────────────────────────────────────────────────────

describe('detectChipVersion — unknown/unsupported formats', () => {
  it('should return null for unknown format', () => {
    const result = detectChipVersion('unknown', 500000);
    expect(result).toBeNull();
  });

  it('should return null for unsupported format strings', () => {
    const result = detectChipVersion('illumina_idat', 500000);
    expect(result).toBeNull();
  });
});

// ─── Confidence Levels ───────────────────────────────────────────────────────

describe('detectChipVersion — confidence scoring', () => {
  it('should return confidence between 0 and 1', () => {
    const result = detectChipVersion('23andme', 640000);
    expect(result).not.toBeNull();
    expect(result!.confidence).toBeGreaterThanOrEqual(0);
    expect(result!.confidence).toBeLessThanOrEqual(1);
  });

  it('should have higher confidence with markers than without', () => {
    const withoutMarkers = detectChipVersion('23andme', 960000);
    const withMarkers = detectChipVersion('23andme', 960000, {
      rs4851251: 'AG',
      rs2296442: 'CT',
      rs2032582: 'GG',
    });
    expect(withoutMarkers).not.toBeNull();
    expect(withMarkers).not.toBeNull();
    expect(withMarkers!.confidence).toBeGreaterThanOrEqual(withoutMarkers!.confidence);
  });

  it('should have lower confidence when markers are absent', () => {
    // Provide genotypes that do NOT include v3 markers
    const result = detectChipVersion('23andme', 960000, { rs9999999: 'AG' });
    expect(result).not.toBeNull();
    // Missing markers should lower confidence compared to finding them
    expect(result!.confidence).toBeLessThan(0.9);
  });

  it('should return 0 confidence for unknown versions', () => {
    const result = detectChipVersion('23andme', 50000);
    expect(result).not.toBeNull();
    expect(result!.confidence).toBe(0);
  });
});

// ─── SNP Count on Result ─────────────────────────────────────────────────────

describe('detectChipVersion — snpCount passthrough', () => {
  it('should include the input snpCount in the result', () => {
    const result = detectChipVersion('23andme', 642789);
    expect(result).not.toBeNull();
    expect(result!.snpCount).toBe(642789);
  });

  it('should include snpCount even for unknown versions', () => {
    const result = detectChipVersion('23andme', 12345);
    expect(result).not.toBeNull();
    expect(result!.snpCount).toBe(12345);
  });
});

// ─── Chip Notes ──────────────────────────────────────────────────────────────

describe('getChipNotes', () => {
  it('should return notes for 23andMe v3', () => {
    const notes = getChipNotes({
      provider: '23andMe',
      version: 'v3',
      snpCount: 960000,
      confidence: 0.9,
    });
    expect(notes).toContain('23andMe v3');
    expect(notes).toContain('structural variants');
  });

  it('should return notes for 23andMe v4', () => {
    const notes = getChipNotes({
      provider: '23andMe',
      version: 'v4',
      snpCount: 570000,
      confidence: 0.8,
    });
    expect(notes).toContain('23andMe v4');
    expect(notes).toContain('reduced coverage');
  });

  it('should return notes for 23andMe v5', () => {
    const notes = getChipNotes({
      provider: '23andMe',
      version: 'v5',
      snpCount: 640000,
      confidence: 0.9,
    });
    expect(notes).toContain('23andMe v5');
    expect(notes).toContain('GSA');
  });

  it('should return notes for AncestryDNA v1', () => {
    const notes = getChipNotes({
      provider: 'AncestryDNA',
      version: 'v1',
      snpCount: 700000,
      confidence: 0.75,
    });
    expect(notes).toContain('AncestryDNA v1');
  });

  it('should return notes for AncestryDNA v2', () => {
    const notes = getChipNotes({
      provider: 'AncestryDNA',
      version: 'v2',
      snpCount: 670000,
      confidence: 0.8,
    });
    expect(notes).toContain('AncestryDNA v2');
    expect(notes).toContain('GSA');
  });

  it('should return notes for MyHeritage v1', () => {
    const notes = getChipNotes({
      provider: 'MyHeritage',
      version: 'v1',
      snpCount: 700000,
      confidence: 0.7,
    });
    expect(notes).toContain('MyHeritage v1');
  });

  it('should return generic notes for unknown version', () => {
    const notes = getChipNotes({
      provider: '23andMe',
      version: 'unknown',
      snpCount: 100000,
      confidence: 0,
    });
    expect(notes).toContain('could not be determined');
    expect(notes).toContain('structural variants');
  });

  it('should return fallback notes for novel version', () => {
    const notes = getChipNotes({
      provider: '23andMe',
      version: 'v6',
      snpCount: 800000,
      confidence: 0.5,
    });
    expect(notes).toContain('23andMe v6');
    expect(notes).toContain('structural variants');
  });

  it('should always mention structural variant limitations', () => {
    const chipVersions = [
      { provider: '23andMe', version: 'v3', snpCount: 960000, confidence: 0.9 },
      { provider: '23andMe', version: 'v4', snpCount: 570000, confidence: 0.8 },
      { provider: 'AncestryDNA', version: 'v1', snpCount: 700000, confidence: 0.7 },
      { provider: 'MyHeritage', version: 'v1', snpCount: 700000, confidence: 0.7 },
      { provider: '23andMe', version: 'unknown', snpCount: 100000, confidence: 0 },
    ];
    for (const chip of chipVersions) {
      const notes = getChipNotes(chip);
      // All notes should mention structural variant or CNV limitations
      const mentionsLimitations =
        notes.includes('structural variants') ||
        notes.includes('CNV') ||
        notes.includes('deletions/duplications');
      expect(mentionsLimitations).toBe(true);
    }
  });
});
