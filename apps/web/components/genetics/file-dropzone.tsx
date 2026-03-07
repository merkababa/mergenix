'use client';

// PRIVACY: This file MUST remain client-side. DNA data must NEVER reach the server.

import { useState, useCallback, useRef } from 'react';
import { m, AnimatePresence } from 'motion/react';
import { Shield, FileCheck, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GeneticFileFormat } from '@/lib/stores/analysis-store';
// NOTE: GinaNotice should be rendered once by the parent page, not inside each FileDropzone

interface FileDropzoneProps {
  label: string;
  onFileSelect: (file: File, format: GeneticFileFormat) => void;
  selectedFile?: { name: string; format: GeneticFileFormat } | null;
  className?: string;
}

const SUPPORTED_FORMATS = [
  { name: '23andMe', ext: '.txt', desc: '23andMe raw data' },
  { name: 'AncestryDNA', ext: '.txt', desc: 'AncestryDNA raw data' },
  { name: 'MyHeritage', ext: '.csv', desc: 'MyHeritage raw data' },
  { name: 'VCF', ext: '.vcf', desc: 'Variant Call Format' },
] as const;

function detectFormat(file: File): GeneticFileFormat {
  const name = file.name.toLowerCase();
  if (name.endsWith('.vcf') || name.endsWith('.vcf.gz')) return 'vcf';
  if (name.includes('ancestry')) return 'ancestrydna';
  if (name.includes('myheritage') || name.endsWith('.csv')) return 'myheritage';
  if (name.endsWith('.txt')) return '23andme';
  return 'unknown';
}

export function FileDropzone({ label, onFileSelect, selectedFile, className }: FileDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      setError(null);
      const format = detectFormat(file);
      if (format === 'unknown') {
        setError(
          'Unsupported file format. Please upload a 23andMe, AncestryDNA, MyHeritage, or VCF file.',
        );
        return;
      }
      onFileSelect(file, format);
    },
    [onFileSelect],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  return (
    <div className={cn('w-full', className)}>
      <label className="font-heading text-(--text-primary) mb-2 block text-sm font-semibold">
        {label}
      </label>

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label={`${label} - Drop genetic file or click to browse`}
        aria-roledescription="File upload dropzone"
        className={cn(
          'rounded-glass group relative cursor-pointer overflow-hidden border-2 border-dashed p-8 text-center transition-all duration-300',
          'bg-(--bg-glass) [-webkit-backdrop-filter:blur(12px)] [backdrop-filter:blur(12px)]',
          'focus-visible:border-(--accent-teal) focus-visible:outline-hidden focus-visible:border-solid focus-visible:shadow-[0_0_0_3px_rgba(6,214,160,0.25)]',
          selectedFile
            ? 'border-[rgba(6,214,160,0.3)] shadow-[0_0_20px_rgba(6,214,160,0.1)]'
            : 'border-[rgba(6,214,160,0.18)]',
          isDragOver &&
            'border-[rgba(6,214,160,0.6)] bg-[rgba(6,214,160,0.05)] shadow-[0_0_40px_rgba(6,214,160,0.15)]',
          !selectedFile &&
            !isDragOver &&
            'hover:border-[rgba(6,214,160,0.45)] hover:shadow-[0_0_30px_rgba(6,214,160,0.08)]',
        )}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".txt,.csv,.vcf,.vcf.gz"
          onChange={handleInputChange}
          aria-hidden="true"
        />

        <AnimatePresence mode="wait">
          {selectedFile ? (
            <m.div
              key="selected"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center gap-3"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[rgba(6,214,160,0.15)]">
                <FileCheck className="text-(--accent-teal) h-7 w-7" />
              </div>
              <div>
                <p className="font-heading text-(--text-heading) text-base font-semibold">
                  {selectedFile.name}
                </p>
                <p className="text-(--accent-teal) mt-0.5 text-sm">
                  Detected: {selectedFile.format}
                </p>
              </div>
            </m.div>
          ) : (
            <m.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4"
            >
              {/* DNA helix animation */}
              <div className="relative flex items-center justify-center">
                <div className="bg-(--glow-teal) absolute h-20 w-20 rounded-full opacity-40 blur-xl group-hover:opacity-60" />
                <div className="relative flex gap-1.5">
                  {[0, 0.2, 0.4, 0.6, 0.8].map((delay, i) => (
                    <m.div
                      key={i}
                      className="h-3 w-3 rounded-full"
                      style={{
                        background:
                          i % 2 === 0
                            ? 'linear-gradient(135deg, #06d6a0, #06b6d4)'
                            : 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
                        boxShadow:
                          i % 2 === 0
                            ? '0 0 10px rgba(6, 214, 160, 0.4)'
                            : '0 0 10px rgba(139, 92, 246, 0.4)',
                      }}
                      animate={{
                        y: [0, -10, 0],
                        rotate: [0, 180, 360],
                        opacity: [0.7, 1, 0.7],
                      }}
                      transition={{
                        duration: 2.2,
                        repeat: Infinity,
                        delay,
                        ease: 'easeInOut' as const,
                      }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <p className="font-heading text-(--text-heading) text-base font-semibold">
                  {isDragOver ? 'Release to upload' : 'Drop your genetic file here'}
                </p>
                <p className="text-(--text-muted) mt-1 text-sm">
                  or <span className="text-(--accent-teal) font-medium">click to browse</span>
                </p>
              </div>

              {/* Supported formats */}
              <div className="flex flex-wrap justify-center gap-2">
                {SUPPORTED_FORMATS.map((fmt) => (
                  <span
                    key={fmt.name}
                    className="border-(--glass-border) text-(--text-muted) backdrop-blur-xs rounded-lg border bg-[rgba(148,163,184,0.06)] px-2.5 py-1 text-xs"
                  >
                    {fmt.name}
                  </span>
                ))}
              </div>
            </m.div>
          )}
        </AnimatePresence>

        {/* Privacy badge */}
        <div className="mt-5 inline-flex items-center gap-1.5 rounded-lg border border-[rgba(6,214,160,0.12)] bg-[rgba(6,214,160,0.05)] px-3 py-1.5">
          <Shield className="text-(--accent-teal) h-3.5 w-3.5" />
          <span className="text-(--text-muted) text-xs">Files never leave your device</span>
        </div>
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <m.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="text-(--accent-rose) mt-2 flex items-center gap-2 text-sm"
            role="alert"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
