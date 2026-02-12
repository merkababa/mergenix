"use client";

import { type ReactNode, useState, useCallback, useId } from "react";
import { cn } from "@/lib/utils";
import { GlassCard } from "@/components/ui/glass-card";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface AccordionItem {
  question: string;
  answer: ReactNode;
}

interface AccordionProps {
  items: AccordionItem[];
  className?: string;
}

/**
 * Interactive FAQ accordion component with smooth Framer Motion
 * open/close animations. Only one item can be open at a time.
 * Fully accessible with ARIA attributes and keyboard support.
 */
export function Accordion({ items, className }: AccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const baseId = useId();

  const toggle = useCallback(
    (index: number) => {
      setOpenIndex((prev) => (prev === index ? null : index));
    },
    [],
  );

  return (
    <div className={cn("flex flex-col gap-3", className)} role="region" aria-label="Frequently asked questions">
      {items.map((item, index) => {
        const isOpen = openIndex === index;
        const triggerId = `${baseId}-trigger-${index}`;
        const panelId = `${baseId}-panel-${index}`;

        return (
          <GlassCard key={item.question} variant="subtle" hover="none" className="overflow-hidden">
            <button
              id={triggerId}
              type="button"
              className={cn(
                "flex w-full items-center justify-between gap-4 px-6 py-5 text-left",
                "font-heading text-base font-semibold text-[var(--text-heading)]",
                "transition-colors duration-200",
                "hover:text-[var(--accent-teal)]",
                "focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--accent-teal)]",
              )}
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => toggle(index)}
            >
              <span>{item.question}</span>
              <motion.span
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="shrink-0 text-[var(--text-muted)]"
              >
                <ChevronDown className="h-5 w-5" aria-hidden="true" />
              </motion.span>
            </button>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  id={panelId}
                  role="region"
                  aria-labelledby={triggerId}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="px-6 pb-5 text-sm leading-relaxed text-[var(--text-body)]">
                    {item.answer}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Hidden panel for aria-controls reference when closed */}
            {!isOpen && (
              <div
                id={panelId}
                role="region"
                aria-labelledby={triggerId}
                hidden
              />
            )}
          </GlassCard>
        );
      })}
    </div>
  );
}
