"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, FileCheck, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GeneticFileFormat } from "@/lib/stores/analysis-store";

interface FileDropzoneProps {
  label: string;
  onFileSelect: (file: File, format: GeneticFileFormat) => void;
  selectedFile?: { name: string; format: GeneticFileFormat } | null;
  className?: string;
}

const SUPPORTED_FORMATS = [
  { name: "23andMe", ext: ".txt", desc: "23andMe raw data" },
  { name: "AncestryDNA", ext: ".txt", desc: "AncestryDNA raw data" },
  { name: "MyHeritage", ext: ".csv", desc: "MyHeritage raw data" },
  { name: "VCF", ext: ".vcf", desc: "Variant Call Format" },
] as const;

function detectFormat(file: File): GeneticFileFormat {
  const name = file.name.toLowerCase();
  if (name.endsWith(".vcf") || name.endsWith(".vcf.gz")) return "vcf";
  if (name.includes("ancestry")) return "ancestrydna";
  if (name.includes("myheritage") || name.endsWith(".csv")) return "myheritage";
  if (name.endsWith(".txt")) return "23andme";
  return "unknown";
}

export function FileDropzone({
  label,
  onFileSelect,
  selectedFile,
  className,
}: FileDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      setError(null);
      const format = detectFormat(file);
      if (format === "unknown") {
        setError(
          "Unsupported file format. Please upload a 23andMe, AncestryDNA, MyHeritage, or VCF file.",
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
    <div className={cn("w-full", className)}>
      <label className="mb-2 block font-heading text-sm font-semibold text-[var(--text-primary)]">
        {label}
      </label>

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label={`${label} - Drop genetic file or click to browse`}
        className={cn(
          "group relative cursor-pointer overflow-hidden rounded-[20px] border-2 border-dashed p-8 text-center transition-all duration-300",
          "bg-[var(--bg-glass)] [backdrop-filter:blur(12px)] [-webkit-backdrop-filter:blur(12px)]",
          selectedFile
            ? "border-[rgba(6,214,160,0.3)] shadow-[0_0_20px_rgba(6,214,160,0.1)]"
            : "border-[rgba(6,214,160,0.18)]",
          isDragOver &&
            "border-[rgba(6,214,160,0.6)] bg-[rgba(6,214,160,0.05)] shadow-[0_0_40px_rgba(6,214,160,0.15)]",
          !selectedFile &&
            !isDragOver &&
            "hover:border-[rgba(6,214,160,0.45)] hover:shadow-[0_0_30px_rgba(6,214,160,0.08)]",
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
            <motion.div
              key="selected"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center gap-3"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[rgba(6,214,160,0.15)]">
                <FileCheck className="h-7 w-7 text-[var(--accent-teal)]" />
              </div>
              <div>
                <p className="font-heading text-base font-semibold text-[var(--text-heading)]">
                  {selectedFile.name}
                </p>
                <p className="mt-0.5 text-sm text-[var(--accent-teal)]">
                  Detected: {selectedFile.format}
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4"
            >
              {/* DNA helix animation */}
              <div className="relative flex items-center justify-center">
                <div className="absolute h-20 w-20 rounded-full bg-[var(--glow-teal)] opacity-40 blur-xl group-hover:opacity-60" />
                <div className="relative flex gap-1.5">
                  {[0, 0.2, 0.4, 0.6, 0.8].map((delay, i) => (
                    <motion.div
                      key={i}
                      className="h-3 w-3 rounded-full"
                      style={{
                        background:
                          i % 2 === 0
                            ? "linear-gradient(135deg, #06d6a0, #06b6d4)"
                            : "linear-gradient(135deg, #8b5cf6, #a78bfa)",
                        boxShadow:
                          i % 2 === 0
                            ? "0 0 10px rgba(6, 214, 160, 0.4)"
                            : "0 0 10px rgba(139, 92, 246, 0.4)",
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
                        ease: "easeInOut",
                      }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <p className="font-heading text-base font-semibold text-[var(--text-heading)]">
                  {isDragOver
                    ? "Release to upload"
                    : "Drop your genetic file here"}
                </p>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  or{" "}
                  <span className="font-medium text-[var(--accent-teal)]">
                    click to browse
                  </span>
                </p>
              </div>

              {/* Supported formats */}
              <div className="flex flex-wrap justify-center gap-2">
                {SUPPORTED_FORMATS.map((fmt) => (
                  <span
                    key={fmt.name}
                    className="rounded-lg border border-[var(--glass-border)] bg-[rgba(148,163,184,0.06)] px-2.5 py-1 text-xs text-[var(--text-muted)] backdrop-blur-sm"
                  >
                    {fmt.name}
                  </span>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Privacy badge */}
        <div className="mt-5 inline-flex items-center gap-1.5 rounded-lg border border-[rgba(6,214,160,0.12)] bg-[rgba(6,214,160,0.05)] px-3 py-1.5">
          <Shield className="h-3.5 w-3.5 text-[var(--accent-teal)]" />
          <span className="text-xs text-[var(--text-muted)]">
            Files never leave your device
          </span>
        </div>
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="mt-2 flex items-center gap-2 text-sm text-[var(--accent-rose)]"
            role="alert"
          >
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
