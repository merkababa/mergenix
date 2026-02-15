"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { FullAnalysisResult } from "@mergenix/shared-types";
import { buildPdfDocument } from "@/lib/pdf/pdf-document-builder";

interface PdfExportState {
  isGenerating: boolean;
  progress: number;
  error: string | null;
  blobUrl: string | null;
  generatePdf: (result: FullAnalysisResult) => Promise<void>;
  reset: () => void;
}

/**
 * React hook for generating PDF reports from analysis results.
 *
 * Uses pdfmake to build and generate a PDF blob from a FullAnalysisResult.
 * Manages generation state (progress, errors, blob URL) and provides
 * cleanup via reset().
 */
export function usePdfExport(): PdfExportState {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  // Keep a ref to the current blob URL so we can revoke it on regeneration
  const blobUrlRef = useRef<string | null>(null);

  // Cleanup blob URL on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
      }
    };
  }, []);

  const generatePdf = useCallback(async (result: FullAnalysisResult) => {
    // Low-memory mobile fallback: if the device reports < 2 GB of memory,
    // skip pdfmake (which is heavy) and fall back to the browser print dialog.
    const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    if (typeof deviceMemory === "number" && deviceMemory < 2) {
      window.print();
      return;
    }

    // Revoke previous blob URL if exists
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }

    setIsGenerating(true);
    setProgress(0);
    setError(null);
    setBlobUrl(null);

    try {
      setProgress(10);

      // Build the pdfmake document definition
      const docDefinition = buildPdfDocument(result);
      setProgress(30);

      // Import pdfmake
      const pdfMakeModule = await import("pdfmake/build/pdfmake");
      const pdfFontsModule = await import("pdfmake/build/vfs_fonts");
      setProgress(50);

      // Set up virtual file system for fonts
      // pdfmake types don't expose vfs — runtime API requires it
      const pdfMake = pdfMakeModule.default;
      const pdfFonts = pdfFontsModule.default as Record<string, unknown>;
      if (pdfFonts?.pdfMake) {
        (pdfMake as Record<string, unknown>).vfs = (pdfFonts.pdfMake as Record<string, unknown>).vfs;
      }

      setProgress(70);

      // Create the PDF and get blob
      const pdfDoc = pdfMake.createPdf(docDefinition);

      const blob = await new Promise<Blob>((resolve, reject) => {
        try {
          // pdfmake types don't include getBlob callback signature
          (pdfDoc as unknown as { getBlob: (cb: (b: Blob) => void) => void }).getBlob((b: Blob) => {
            resolve(b);
          });
        } catch (err) {
          reject(err);
        }
      });

      setProgress(90);

      // Create blob URL
      const url = URL.createObjectURL(blob);
      blobUrlRef.current = url;
      setBlobUrl(url);

      setProgress(100);
      setIsGenerating(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "PDF generation failed";
      setError(message);
      setIsGenerating(false);
      setBlobUrl(null);
    }
  }, []);

  const reset = useCallback(() => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    setIsGenerating(false);
    setProgress(0);
    setError(null);
    setBlobUrl(null);
  }, []);

  return {
    isGenerating,
    progress,
    error,
    blobUrl,
    generatePdf,
    reset,
  };
}
