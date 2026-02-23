"use client";

// PRIVACY: This file MUST remain client-side. DNA data must NEVER reach the server.

import { useCallback, useRef, useState } from "react";
import { Upload, File as FileIcon, X, ArrowRight } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { PartnerConsentCheckbox } from "@/components/legal/partner-consent-checkbox";
import { cn } from "@/lib/utils";
import { MAX_GENETIC_FILE_SIZE } from "@/lib/genetics-constants";

// ── Constants ────────────────────────────────────────────────────────────────

const ACCEPTED_EXTENSIONS = [".txt", ".csv", ".vcf", ".gz"];
const ACCEPT_STRING = ".txt,.csv,.vcf,.gz";

// ── Types ────────────────────────────────────────────────────────────────────

export interface CoupleUploadCardProps {
  parentAFile: File | null;
  parentBFile: File | null;
  onFileSelectA: (file: File | null) => void;
  onFileSelectB: (file: File | null) => void;
  disabled?: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Format bytes into a human-readable string (KB or MB). */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Check if the file has an accepted extension. */
function hasValidExtension(file: File): boolean {
  const name = file.name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext));
}

/** Check if two files appear to be the same (identical name and size). */
function isSameFile(a: File, b: File): boolean {
  return a.name === b.name && a.size === b.size;
}

// ── Upload Zone Sub-Component ────────────────────────────────────────────────

interface UploadZoneProps {
  person: "A" | "B";
  file: File | null;
  otherFile: File | null;
  onFileSelect: (file: File | null) => void;
  disabled?: boolean;
  onSameFileError: () => void;
  clearSameFileError: () => void;
}

function UploadZone({
  person,
  file,
  otherFile,
  onFileSelect,
  disabled,
  onSameFileError,
  clearSameFileError,
}: UploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const label = `Person ${person}`;
  const ariaLabel = `Upload Person ${person} DNA file`;

  const validateAndAccept = useCallback(
    (incoming: File) => {
      setError(null);
      clearSameFileError();

      if (!hasValidExtension(incoming)) {
        setError(
          "Unsupported file format. Accepted: .txt, .csv, .vcf, .gz",
        );
        return;
      }

      if (incoming.size > MAX_GENETIC_FILE_SIZE) {
        setError(
          `File exceeds 200 MB limit (${formatFileSize(incoming.size)}).`,
        );
        return;
      }

      if (otherFile && isSameFile(incoming, otherFile)) {
        onSameFileError();
        return;
      }

      onFileSelect(incoming);
    },
    [otherFile, onFileSelect, onSameFileError, clearSameFileError],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (disabled) return;
      const dropped = e.dataTransfer.files[0];
      if (dropped) validateAndAccept(dropped);
    },
    [disabled, validateAndAccept],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled) setIsDragOver(true);
    },
    [disabled],
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0];
      if (selected) validateAndAccept(selected);
      // Reset the input so the same file can be re-selected
      if (inputRef.current) inputRef.current.value = "";
    },
    [validateAndAccept],
  );

  const handleRemove = useCallback(() => {
    setError(null);
    clearSameFileError();
    onFileSelect(null);
    if (inputRef.current) inputRef.current.value = "";
  }, [onFileSelect, clearSameFileError]);

  const handleBrowseClick = useCallback(() => {
    if (!disabled) inputRef.current?.click();
  }, [disabled]);

  const formatDescriptionId = `formats-${person}`;

  return (
    <div>
      <p className="mb-2 font-heading text-sm font-semibold text-[var(--text-primary)]">
        {label}
      </p>

      {file ? (
        /* ── File Selected State ── */
        <div
          aria-label={ariaLabel}
          className="flex min-h-[120px] items-center justify-between gap-3 rounded-[16px] border border-[rgba(6,214,160,0.3)] bg-[rgba(6,214,160,0.04)] p-4 shadow-[0_0_20px_rgba(6,214,160,0.08)]"
        >
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[rgba(6,214,160,0.15)]">
              <FileIcon className="h-5 w-5 text-[var(--accent-teal)]" />
            </div>
            <div className="min-w-0">
              <p
                className="truncate font-heading text-sm font-semibold text-[var(--text-heading)]"
                data-testid={`filename-${person}`}
              >
                {file.name}
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                {formatFileSize(file.size)}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            aria-label={`Remove Person ${person} file`}
            className="h-11 w-11 shrink-0 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        /* ── Empty Drop Zone State ── */
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          aria-label={ariaLabel}
          aria-describedby={formatDescriptionId}
          className={cn(
            "flex min-h-[120px] cursor-pointer flex-col items-center justify-center gap-3 rounded-[16px] border-2 border-dashed p-6 text-center transition-all duration-200",
            "bg-[var(--bg-glass)] [backdrop-filter:blur(8px)] [-webkit-backdrop-filter:blur(8px)]",
            isDragOver
              ? "border-[rgba(6,214,160,0.6)] bg-[rgba(6,214,160,0.06)]"
              : "border-[rgba(148,163,184,0.15)] hover:border-[rgba(6,214,160,0.4)]",
            disabled && "pointer-events-none opacity-50",
          )}
        >
          <Upload className="h-6 w-6 text-[var(--text-muted)]" />

          <div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleBrowseClick}
              disabled={disabled}
              className="min-h-[44px]"
            >
              Browse Files
            </Button>
          </div>

          <p
            id={formatDescriptionId}
            className="text-xs text-[var(--text-dim)]"
          >
            .txt, .csv, .vcf, .gz &mdash; max 200 MB
          </p>

          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept={ACCEPT_STRING}
            onChange={handleInputChange}
            aria-hidden="true"
            tabIndex={-1}
          />
        </div>
      )}

      {/* ── Error message ── */}
      {error && (
        <p
          role="alert"
          className="mt-2 text-sm text-[var(--accent-rose)]"
        >
          {error}
        </p>
      )}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export function CoupleUploadCard({
  parentAFile,
  parentBFile,
  onFileSelectA,
  onFileSelectB,
  disabled,
}: CoupleUploadCardProps) {
  const [sameFileError, setSameFileError] = useState(false);

  const handleSameFileError = useCallback(() => {
    setSameFileError(true);
  }, []);

  const clearSameFileError = useCallback(() => {
    setSameFileError(false);
  }, []);

  return (
    <GlassCard
      variant="medium"
      hover="none"
      role="group"
      aria-labelledby="couple-upload-heading"
      data-privacy-mask="true"
      className="p-6"
    >
      {/* ── Heading ── */}
      <h2
        id="couple-upload-heading"
        className="mb-6 font-heading text-lg font-bold text-[var(--text-heading)]"
      >
        Upload DNA Files
      </h2>

      {/* ── Upload Zones Grid ── */}
      <div className="relative grid grid-cols-1 gap-6 md:grid-cols-2">
        <UploadZone
          person="A"
          file={parentAFile}
          otherFile={parentBFile}
          onFileSelect={onFileSelectA}
          disabled={disabled}
          onSameFileError={handleSameFileError}
          clearSameFileError={clearSameFileError}
        />

        {/* ── Desktop Arrow Connector ── */}
        <div className="pointer-events-none absolute inset-0 hidden items-center justify-center md:flex" aria-hidden="true">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[rgba(6,214,160,0.1)]">
            <ArrowRight className="h-4 w-4 text-[var(--accent-teal)]" />
          </div>
        </div>

        <UploadZone
          person="B"
          file={parentBFile}
          otherFile={parentAFile}
          onFileSelect={onFileSelectB}
          disabled={disabled}
          onSameFileError={handleSameFileError}
          clearSameFileError={clearSameFileError}
        />
      </div>

      {/* ── Same-file error ── */}
      {sameFileError && (
        <p
          role="alert"
          className="mt-4 text-center text-sm text-[var(--accent-rose)]"
        >
          Please upload files from two different individuals
        </p>
      )}

      {/* ── Partner Consent ── */}
      <div className="mt-6">
        <PartnerConsentCheckbox
          filesChanged={parentBFile?.name}
        />
      </div>
    </GlassCard>
  );
}
