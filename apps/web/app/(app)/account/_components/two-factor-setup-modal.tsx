'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { m, AnimatePresence } from 'motion/react';
import { X, QrCode, KeyRound, ShieldCheck, Copy, Download, Check, Loader2 } from 'lucide-react';
import QRCodeLib from 'qrcode';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/lib/stores/auth-store';

interface TwoFactorSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const STEPS = [
  { label: 'Scan QR Code', icon: QrCode },
  { label: 'Verify Code', icon: KeyRound },
  { label: 'Backup Codes', icon: ShieldCheck },
] as const;

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function TwoFactorSetupModal({ isOpen, onClose }: TwoFactorSetupModalProps) {
  const [step, setStep] = useState(0);
  const [qrUri, setQrUri] = useState('');
  const [secret, setSecret] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  const setup2FA = useAuthStore((s) => s.setup2FA);
  const verify2FA = useAuthStore((s) => s.verify2FA);

  // Body scroll lock when modal is open
  useEffect(() => {
    if (!isOpen) return;
    const scrollY = window.scrollY;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
      window.scrollTo(0, scrollY);
    };
  }, [isOpen]);

  // Initialize: fetch QR code when modal opens
  useEffect(() => {
    if (!isOpen) return;
    setStep(0);
    setCode('');
    setError(null);
    setBackupCodes([]);
    setCopiedSecret(false);
    setCopiedCodes(false);
    setQrDataUrl(null);

    const init = async () => {
      setIsSettingUp(true);
      try {
        const result = await setup2FA();
        setQrUri(result.qrUri);
        setSecret(result.secret);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to start 2FA setup');
      } finally {
        setIsSettingUp(false);
      }
    };
    init();
  }, [isOpen, setup2FA]);

  // Generate QR data URL client-side when qrUri changes
  useEffect(() => {
    if (!qrUri) return;
    QRCodeLib.toDataURL(qrUri, { width: 200, margin: 2 })
      .then(setQrDataUrl)
      .catch(() => {
        // QR generation failed — user can still use manual key entry
        setQrDataUrl(null);
      });
  }, [qrUri]);

  // Focus trap
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;

      const modal = modalRef.current;
      if (!modal) return;

      const focusable = modal.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleVerify = useCallback(async () => {
    if (code.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }
    setIsVerifying(true);
    setError(null);
    try {
      const result = await verify2FA(code);
      setBackupCodes(result.backupCodes);
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setIsVerifying(false);
    }
  }, [code, verify2FA]);

  const handleCopySecret = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(secret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    } catch {
      // Fallback: select text
    }
  }, [secret]);

  const handleCopyCodes = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(backupCodes.join('\n'));
      setCopiedCodes(true);
      setTimeout(() => setCopiedCodes(false), 2000);
    } catch {
      // Fallback
    }
  }, [backupCodes]);

  const handleDownloadCodes = useCallback(() => {
    const content = [
      'Mergenix 2FA Backup Codes',
      '=========================',
      '',
      'Store these codes safely. Each can be used once.',
      '',
      ...backupCodes.map((c, i) => `${i + 1}. ${c}`),
      '',
      `Generated: ${new Date().toISOString()}`,
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mergenix-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  }, [backupCodes]);

  return (
    <AnimatePresence>
      {isOpen && (
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Two-factor authentication setup"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-[rgba(0,0,0,0.6)] backdrop-blur-xs"
            onClick={onClose}
          />

          {/* Modal */}
          <m.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="relative z-10 w-full max-w-md"
          >
            <GlassCard variant="strong" hover="none" className="p-7">
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 rounded-lg p-1.5 text-(--text-dim) transition-colors hover:bg-[rgba(244,63,94,0.1)] hover:text-(--accent-rose) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--accent-teal)"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Step indicator */}
              <div className="mb-6 flex items-center justify-center gap-2">
                {STEPS.map((s, i) => (
                  <div key={s.label} className="flex items-center gap-2">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full transition-all duration-300 ${
                        i === step
                          ? 'bg-linear-to-br from-(--accent-teal) to-(--accent-cyan) text-(--bg-deep)'
                          : i < step
                            ? 'bg-[rgba(6,214,160,0.2)] text-(--accent-teal)'
                            : 'bg-(--bg-elevated) text-(--text-dim)'
                      }`}
                    >
                      <s.icon className="h-4 w-4" />
                    </div>
                    {i < STEPS.length - 1 && (
                      <div
                        className={`h-0.5 w-8 rounded-full transition-colors duration-300 ${
                          i < step ? 'bg-(--accent-teal)' : 'bg-(--border-subtle)'
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Step content with animation */}
              <AnimatePresence mode="wait">
                {step === 0 && (
                  <m.div
                    key="step-0"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <h2 className="font-heading mb-1 text-center text-lg font-bold text-(--text-heading)">
                      Scan QR Code
                    </h2>
                    <p className="mb-5 text-center text-sm text-(--text-muted)">
                      Scan with your authenticator app (Google Authenticator, Authy, etc.)
                    </p>

                    {isSettingUp ? (
                      <div className="flex h-48 items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-(--accent-teal)" />
                      </div>
                    ) : (
                      <>
                        {/* QR Code container — generated client-side */}
                        <div className="mx-auto mb-4 flex h-48 w-48 items-center justify-center rounded-xl bg-white p-3">
                          {qrDataUrl ? (
                            <img
                              src={qrDataUrl}
                              alt="Scan this QR code with your authenticator app"
                              className="h-full w-full"
                              width={168}
                              height={168}
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
                              QR code loading...
                            </div>
                          )}
                        </div>

                        {/* Secret key backup */}
                        <div className="mb-5 rounded-xl border border-(--border-subtle) bg-(--bg-elevated) p-3">
                          <p className="mb-1.5 text-xs font-medium text-(--text-muted)">
                            Or enter this key manually:
                          </p>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 font-mono text-xs break-all text-(--text-primary)">
                              {secret}
                            </code>
                            <button
                              onClick={handleCopySecret}
                              className="shrink-0 rounded-lg p-1.5 text-(--text-dim) transition-colors hover:bg-[rgba(6,214,160,0.1)] hover:text-(--accent-teal)"
                              aria-label="Copy secret key"
                            >
                              {copiedSecret ? (
                                <Check className="h-3.5 w-3.5 text-(--accent-teal)" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      </>
                    )}

                    <Button
                      variant="primary"
                      size="md"
                      className="w-full"
                      onClick={() => setStep(1)}
                      disabled={isSettingUp}
                    >
                      Continue
                    </Button>
                  </m.div>
                )}

                {step === 1 && (
                  <m.div
                    key="step-1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <h2 className="font-heading mb-1 text-center text-lg font-bold text-(--text-heading)">
                      Enter Verification Code
                    </h2>
                    <p className="mb-5 text-center text-sm text-(--text-muted)">
                      Enter the 6-digit code from your authenticator app
                    </p>

                    <div className="mb-5">
                      <Input
                        label="Verification Code"
                        placeholder="000000"
                        value={code}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                          setCode(val);
                          setError(null);
                        }}
                        error={error ?? undefined}
                        maxLength={6}
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        autoFocus
                        className="text-center font-mono text-lg tracking-[0.5em]"
                      />
                    </div>

                    <div className="flex gap-3">
                      <Button
                        variant="secondary"
                        size="md"
                        className="flex-1"
                        onClick={() => {
                          setStep(0);
                          setError(null);
                        }}
                      >
                        Back
                      </Button>
                      <Button
                        variant="primary"
                        size="md"
                        className="flex-1"
                        onClick={handleVerify}
                        isLoading={isVerifying}
                        disabled={code.length !== 6}
                      >
                        Verify
                      </Button>
                    </div>
                  </m.div>
                )}

                {step === 2 && (
                  <m.div
                    key="step-2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <h2 className="font-heading mb-1 text-center text-lg font-bold text-(--text-heading)">
                      Save Backup Codes
                    </h2>
                    <p className="mb-5 text-center text-sm text-(--text-muted)">
                      Save these codes somewhere safe. Each can be used once if you lose access to
                      your authenticator.
                    </p>

                    {/* Backup codes grid */}
                    <div className="mb-4 rounded-xl border border-(--border-subtle) bg-(--bg-elevated) p-4">
                      <div className="grid grid-cols-2 gap-2">
                        {backupCodes.map((bCode) => (
                          <div
                            key={bCode}
                            className="rounded-lg bg-[rgba(6,214,160,0.05)] px-3 py-1.5 text-center font-mono text-sm text-(--text-primary)"
                          >
                            {bCode}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Action buttons for codes */}
                    <div className="mb-5 flex gap-2">
                      <button
                        onClick={handleCopyCodes}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-(--border-subtle) bg-(--bg-elevated) px-3 py-2 text-xs font-medium text-(--text-muted) transition-colors hover:border-[rgba(6,214,160,0.25)] hover:text-(--accent-teal)"
                      >
                        {copiedCodes ? (
                          <Check className="h-3.5 w-3.5 text-(--accent-teal)" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                        {copiedCodes ? 'Copied' : 'Copy All'}
                      </button>
                      <button
                        onClick={handleDownloadCodes}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-(--border-subtle) bg-(--bg-elevated) px-3 py-2 text-xs font-medium text-(--text-muted) transition-colors hover:border-[rgba(6,214,160,0.25)] hover:text-(--accent-teal)"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download
                      </button>
                    </div>

                    <Button variant="primary" size="md" className="w-full" onClick={onClose}>
                      I&apos;ve Saved My Codes
                    </Button>
                  </m.div>
                )}
              </AnimatePresence>
            </GlassCard>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
