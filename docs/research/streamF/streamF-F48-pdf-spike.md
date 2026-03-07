# F48 — PDF/UA Feasibility Spike

- **Task ID:** F48
- **Delegation:** Gemini (A tier)
- **Date:** 2026-02-14
- **Status:** COMPLETE

## Objective

Evaluate client-side PDF generation libraries for genetic analysis reports. Must run in Web Worker, support PDF/UA accessibility, embed fonts, handle 2,697+ entries.

## Prompt Summary

Gemini read package.json, types, shared-types, existing worker patterns. Compared pdf-lib vs @react-pdf/renderer vs jsPDF vs pdfmake.

## Key Findings

1. **pdf-lib NOT recommended for reports** — no layout engine (manual text wrapping, pagination, table cells), no PDF/UA tag tree
2. **@react-pdf/renderer** — best for React apps (JSX API, good DX) but ~500kB and high memory
3. **pdfmake** — best for PDF/UA compliance (declarative structure enables auto-tagging), stream processing for memory efficiency
4. Mobile OOM risk: ~50-80 pages safe on 2GB RAM device. Need HTML print fallback.
5. Font embedding: Host TTF/OTF in `/public/fonts/`, fetch as ArrayBuffer in Worker. Subset for large Unicode sets.

## Library Comparison

| Criterion          | pdf-lib              | @react-pdf/renderer      | jsPDF              | pdfmake                |
| ------------------ | -------------------- | ------------------------ | ------------------ | ---------------------- |
| PDF/UA             | Low (manual tagging) | Medium (has a11y labels) | Low                | **High** (declarative) |
| Web Worker         | Excellent            | Good                     | Fair (DOM plugins) | **Excellent**          |
| Font embed         | Good (via fontkit)   | Good (easy API)          | Fair               | Good (VFS)             |
| Bundle (gzip)      | ~200kB               | ~500kB                   | ~150kB             | ~300kB                 |
| Memory (2.7k rows) | Medium               | High (React overhead)    | High (DOM)         | **Low/Med** (JSON)     |
| TypeScript         | Native               | Native                   | DefinitelyTyped    | DefinitelyTyped        |

**Recommendation for Sprint 4:** pdfmake (best PDF/UA + memory) or @react-pdf/renderer (best DX). Decision deferred to Sprint 4 implementation.

## Prototype Summary

pdf-lib worker prototype provided as reference:

- Typed PostMessage protocol (generate/cancel/success/error/progress)
- Title page + carrier table + watermark
- Transferable ArrayBuffer for zero-copy
- Progress reporting every 100 entries

## Mobile Safety

- **Safe limit:** ~50-80 pages on 2GB RAM mobile
- **Mitigation:** Chunked generation, aggressive cleanup (null after save)
- **HTML print fallback:** `@media print` CSS + `window.print()` for "Print" action
- **Client PDF only for "Download"** — browser handles "Print" memory

## Action Items

1. Sprint 4: Choose pdfmake or @react-pdf/renderer based on DX preference
2. Create pdf.worker.ts following existing useGeneticsWorker pattern
3. Add HTML print styles as fallback (`@media print`)
4. Test on low-end mobile with full carrier panel

## Impact on Downstream

- Sprint 4 (F21): PDF generation implementation uses this research
- Sprint 4 (F42): Sample report content needs library-specific rendering
- Sprint 2 (F14): PDF report trigger UI can be built with stub worker
