"use client";

import { useState, useCallback } from "react";
import { m, AnimatePresence } from "framer-motion";
import { Shield, Key, Smartphone } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/lib/stores/auth-store";
import { TwoFactorSetupModal } from "./two-factor-setup-modal";
import { ChangePasswordModal } from "./change-password-modal";

export function SecuritySection() {
  const user = useAuthStore((s) => s.user);
  const disable2FA = useAuthStore((s) => s.disable2FA);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [showDisable2FA, setShowDisable2FA] = useState(false);
  const [disableCode, setDisableCode] = useState("");
  const [disableError, setDisableError] = useState<string | null>(null);
  const [isDisabling, setIsDisabling] = useState(false);

  const is2FAEnabled = user?.totpEnabled ?? false;

  const handleDisable2FA = useCallback(async () => {
    if (disableCode.length !== 6) {
      setDisableError("Please enter a 6-digit code");
      return;
    }
    setIsDisabling(true);
    setDisableError(null);
    try {
      await disable2FA(disableCode);
      setShowDisable2FA(false);
      setDisableCode("");
    } catch (err) {
      setDisableError(err instanceof Error ? err.message : "Failed to disable 2FA");
    } finally {
      setIsDisabling(false);
    }
  }, [disableCode, disable2FA]);

  return (
    <>
      <GlassCard variant="medium" hover="none" className="p-7">
        <div className="mb-5 flex items-center gap-3">
          <Shield className="h-5 w-5 text-[var(--accent-teal)]" />
          <h2 className="font-heading text-lg font-bold text-[var(--text-heading)]">
            Security
          </h2>
        </div>

        <div className="space-y-4">
          {/* Password */}
          <div className="flex items-center justify-between rounded-xl border border-[var(--border-subtle)] p-4">
            <div className="flex items-center gap-3">
              <Key className="h-5 w-5 text-[var(--text-dim)]" />
              <div>
                <p className="font-heading text-sm font-medium text-[var(--text-heading)]">
                  Password
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  Keep your account secure with a strong password
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPasswordModal(true)}
            >
              Change
            </Button>
          </div>

          {/* 2FA */}
          <div className="flex items-center justify-between rounded-xl border border-[var(--border-subtle)] p-4">
            <div className="flex items-center gap-3">
              <Smartphone className="h-5 w-5 text-[var(--text-dim)]" />
              <div>
                <p className="font-heading text-sm font-medium text-[var(--text-heading)]">
                  Two-Factor Authentication
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  {is2FAEnabled
                    ? "2FA is enabled — your account has an extra layer of security"
                    : "Add an extra layer of security to your account"}
                </p>
              </div>
            </div>
            {is2FAEnabled ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDisable2FA(!showDisable2FA)}
              >
                Disable
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShow2FASetup(true)}
              >
                Enable
              </Button>
            )}
          </div>

          {/* Inline disable 2FA form with animation */}
          <AnimatePresence>
            {showDisable2FA && (
              <m.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="rounded-xl border border-[rgba(244,63,94,0.15)] bg-[rgba(244,63,94,0.03)] p-4">
                  <p className="mb-3 text-sm text-[var(--text-muted)]">
                    Enter your authenticator code to disable 2FA:
                  </p>
                  <div className="flex gap-3">
                    <Input
                      placeholder="000000"
                      value={disableCode}
                      onChange={(e) => {
                        setDisableCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                        setDisableError(null);
                      }}
                      error={disableError ?? undefined}
                      maxLength={6}
                      inputMode="numeric"
                      className="font-mono tracking-widest"
                    />
                    <Button
                      variant="destructive"
                      size="md"
                      onClick={handleDisable2FA}
                      isLoading={isDisabling}
                      disabled={disableCode.length !== 6}
                    >
                      Confirm
                    </Button>
                  </div>
                </div>
              </m.div>
            )}
          </AnimatePresence>
        </div>
      </GlassCard>

      {/* Modals */}
      <ChangePasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />
      <TwoFactorSetupModal
        isOpen={show2FASetup}
        onClose={() => setShow2FASetup(false)}
      />
    </>
  );
}
