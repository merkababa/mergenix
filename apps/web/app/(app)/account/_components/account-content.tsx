"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuthStore } from "@/lib/stores/auth-store";
import { staggerContainer, staggerItem } from "@/lib/animation-variants";
import { GlassCard } from "@/components/ui/glass-card";
import { ProfileSection } from "./profile-section";
import { SecuritySection } from "./security-section";
import { SessionsSection } from "./sessions-section";
import { DataExportCard } from "@/components/account/data-export-card";
import { DangerZone } from "./danger-zone";

function AccountSkeleton() {
  return (
    <>
      <div className="mb-8 text-center">
        <div className="mx-auto h-9 w-56 animate-pulse rounded-xl bg-[var(--bg-elevated)]" />
        <div className="mx-auto mt-3 h-5 w-80 animate-pulse rounded-lg bg-[var(--bg-elevated)]" />
      </div>
      <div className="mx-auto max-w-2xl space-y-6">
        {[1, 2, 3, 4].map((i) => (
          <GlassCard key={i} variant="medium" hover="none" className="p-7">
            <div className="mb-5 flex items-center gap-3">
              <div className="h-5 w-5 animate-pulse rounded bg-[var(--bg-elevated)]" />
              <div className="h-5 w-24 animate-pulse rounded-lg bg-[var(--bg-elevated)]" />
            </div>
            <div className="space-y-3">
              <div className="h-16 w-full animate-pulse rounded-xl bg-[var(--bg-elevated)]" />
              <div className="h-10 w-full animate-pulse rounded-xl bg-[var(--bg-elevated)]" />
              {i <= 2 && (
                <div className="h-10 w-full animate-pulse rounded-xl bg-[var(--bg-elevated)]" />
              )}
            </div>
          </GlassCard>
        ))}
      </div>
    </>
  );
}

export function AccountContent() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const fetchProfile = useAuthStore((s) => s.fetchProfile);
  const router = useRouter();

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login?returnUrl=/account");
    }
  }, [isAuthenticated, router]);

  // Fetch fresh profile data on mount
  useEffect(() => {
    if (isAuthenticated) {
      fetchProfile();
    }
  }, [isAuthenticated, fetchProfile]);

  if (!isAuthenticated || !user) {
    return <AccountSkeleton />;
  }

  return (
    <>
      <div className="mb-8 text-center">
        <h1 className="gradient-text font-heading text-3xl font-extrabold md:text-4xl">
          Account Settings
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-[var(--text-muted)]">
          Manage your profile, security, and session settings
        </p>
      </div>

      <motion.div
        className="mx-auto max-w-2xl space-y-6"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={staggerItem}>
          <ProfileSection />
        </motion.div>

        <motion.div variants={staggerItem}>
          <SecuritySection />
        </motion.div>

        <motion.div variants={staggerItem}>
          <SessionsSection />
        </motion.div>

        <motion.div variants={staggerItem}>
          <DataExportCard />
        </motion.div>

        <motion.div variants={staggerItem}>
          <DangerZone />
        </motion.div>
      </motion.div>
    </>
  );
}
