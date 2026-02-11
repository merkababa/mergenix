"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Heart,
  Search,
  MapPin,
  Star,
  Phone,
  Globe,
  ChevronRight,
  Shield,
} from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const SPECIALTIES = [
  "All Specialties",
  "Prenatal / Reproductive",
  "Pediatric",
  "Cancer",
  "Cardiovascular",
  "Neurological",
] as const;

const COUNSELORS = [
  {
    name: "Dr. Sarah Chen, MS, CGC",
    specialty: "Prenatal / Reproductive",
    location: "New York, NY",
    rating: 4.9,
    reviewCount: 127,
    languages: ["English", "Mandarin"],
    virtual: true,
    email: "sarah.chen@example.com",
    description:
      "Board-certified genetic counselor specializing in reproductive genetics and carrier screening counseling.",
  },
  {
    name: "Dr. Michael Torres, MS, CGC",
    specialty: "Pediatric",
    location: "Los Angeles, CA",
    rating: 4.8,
    reviewCount: 95,
    languages: ["English", "Spanish"],
    virtual: true,
    email: "michael.torres@example.com",
    description:
      "Experienced pediatric genetic counselor helping families understand genetic conditions in children.",
  },
  {
    name: "Dr. Emily Goldstein, MS, CGC",
    specialty: "Cancer",
    location: "Boston, MA",
    rating: 4.9,
    reviewCount: 143,
    languages: ["English"],
    virtual: true,
    email: "emily.goldstein@example.com",
    description:
      "Cancer genetic counselor focusing on hereditary cancer syndromes and risk assessment.",
  },
] as const;

export default function CounselingPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>("All Specialties");

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value);
    },
    [],
  );

  const handleSpecialtyChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedSpecialty(e.target.value);
    },
    [],
  );

  const filteredCounselors = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return COUNSELORS.filter((counselor) => {
      // Filter by specialty
      if (
        selectedSpecialty !== "All Specialties" &&
        counselor.specialty !== selectedSpecialty
      ) {
        return false;
      }
      // Filter by search query (name, specialty, location)
      if (query) {
        return (
          counselor.name.toLowerCase().includes(query) ||
          counselor.specialty.toLowerCase().includes(query) ||
          counselor.location.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [searchQuery, selectedSpecialty]);

  return (
    <>
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[rgba(6,214,160,0.1)]">
          <Heart className="h-7 w-7 text-[var(--accent-teal)]" />
        </div>
        <h1 className="gradient-text font-heading text-3xl font-extrabold md:text-4xl">
          Find a Genetic Counselor
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-[var(--text-muted)]">
          Connect with board-certified genetic counselors who can help you understand your results
        </p>
      </div>

      {/* ── Info banner ── */}
      <GlassCard
        variant="medium"
        hover="none"
        className="mb-8 flex items-start gap-4 border-[rgba(6,214,160,0.15)] p-6"
      >
        <Shield className="mt-0.5 h-5 w-5 flex-shrink-0 text-[var(--accent-teal)]" />
        <div>
          <p className="text-sm leading-relaxed text-[var(--text-body)]">
            Genetic counselors are healthcare professionals trained to help individuals and
            families understand and adapt to the medical, psychological, and familial implications
            of genetic contributions to disease. Meeting with one is a routine part of family planning.
          </p>
        </div>
      </GlassCard>

      {/* ── Search & Filter ── */}
      <GlassCard variant="subtle" hover="none" className="mb-8 p-5">
        <div className="flex flex-col gap-4 md:flex-row">
          <div className="flex-1">
            <Input
              placeholder="Search by name, specialty, or location..."
              icon={<Search className="h-4 w-4" />}
              value={searchQuery}
              onChange={handleSearchChange}
              aria-label="Search counselors by name, specialty, or location"
            />
          </div>
          <select
            className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 font-body text-sm text-[var(--text-primary)] focus:border-[rgba(6,214,160,0.4)] focus:outline-none"
            aria-label="Filter by specialty"
            value={selectedSpecialty}
            onChange={handleSpecialtyChange}
          >
            {SPECIALTIES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </GlassCard>

      {/* ── Counselor Cards ── */}
      <div className="space-y-4" role="list" aria-label="Counselor results">
        {filteredCounselors.length === 0 ? (
          <GlassCard variant="subtle" hover="none" className="p-8 text-center">
            <p className="text-sm text-[var(--text-muted)]">
              No counselors match your search. Try adjusting your filters.
            </p>
          </GlassCard>
        ) : (
          filteredCounselors.map((counselor) => (
            <GlassCard
              key={counselor.name}
              variant="medium"
              hover="glow"
              className="p-6"
              role="listitem"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#06d6a0] to-[#06b6d4]">
                      <span className="font-heading text-sm font-bold text-[#050810]">
                        {counselor.name
                          .split(" ")
                          .slice(1, 3)
                          .map((n) => n[0])
                          .join("")}
                      </span>
                    </div>
                    <div>
                      <h2 className="font-heading text-base font-bold text-[var(--text-heading)]">
                        {counselor.name}
                      </h2>
                      <div className="mt-0.5 flex items-center gap-2">
                        <Badge variant="default">{counselor.specialty}</Badge>
                        {counselor.virtual && (
                          <Badge variant="pro">Virtual</Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <p className="mt-3 text-sm leading-relaxed text-[var(--text-muted)]">
                    {counselor.description}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-[var(--text-dim)]">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {counselor.location}
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 text-[var(--accent-amber)]" />
                      {counselor.rating} ({counselor.reviewCount} reviews)
                    </div>
                    <div className="flex items-center gap-1">
                      <Globe className="h-3.5 w-3.5" />
                      {counselor.languages.join(", ")}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 sm:flex-col">
                  <a
                    href={`mailto:${counselor.email}?subject=${encodeURIComponent("Mergenix Consultation Request")}`}
                    aria-label={`Book consultation with ${counselor.name}`}
                    className={cn(buttonVariants({ variant: "primary", size: "sm" }))}
                  >
                    <Phone className="h-3.5 w-3.5" />
                    Book Consultation
                  </a>
                  <a
                    href="https://www.nsgc.org/findageneticcounselor"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`View profile for ${counselor.name} on NSGC`}
                    className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
                  >
                    View Profile
                  </a>
                </div>
              </div>
            </GlassCard>
          ))
        )}
      </div>

      {/* ── Curated note ── */}
      <p className="mt-4 text-center text-xs text-[var(--text-dim)]">
        Counselor directory is curated. Contact us to be listed.
      </p>

      {/* ── External link ── */}
      <div className="mt-8 text-center">
        <a
          href="https://www.nsgc.org/findageneticcounselor"
          target="_blank"
          rel="noopener noreferrer"
          className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
        >
          Browse NSGC Directory
          <ChevronRight className="h-4 w-4" />
        </a>
        <p className="mt-2 text-xs text-[var(--text-dim)]">
          National Society of Genetic Counselors - Official Directory
        </p>
      </div>
    </>
  );
}
