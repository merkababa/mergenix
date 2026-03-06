"use client";

// PRIVACY: This file MUST remain client-side. DNA data must NEVER reach the server.

import { memo } from "react";
import { m } from "motion/react";
import { cn } from "@/lib/utils";

interface PrsGaugeProps {
  percentile: number;
  condition: string;
  className?: string;
}

function getRiskInfo(percentile: number): { color: string; label: string; glowColor: string; patternClass: string } {
  if (percentile < 20)
    return { color: "#06d6a0", label: "Low", glowColor: "rgba(6, 214, 160, 0.4)", patternClass: "risk-pattern-low" };
  if (percentile < 40)
    return { color: "#14b8a6", label: "Below Average", glowColor: "rgba(20, 184, 166, 0.4)", patternClass: "risk-pattern-below-avg" };
  if (percentile < 60)
    return { color: "#06b6d4", label: "Average", glowColor: "rgba(6, 182, 212, 0.4)", patternClass: "risk-pattern-average" };
  if (percentile < 80)
    return { color: "#f59e0b", label: "Above Average", glowColor: "rgba(245, 158, 11, 0.4)", patternClass: "risk-pattern-above-avg" };
  if (percentile < 95)
    return { color: "#f97316", label: "Elevated", glowColor: "rgba(249, 115, 22, 0.4)", patternClass: "risk-pattern-elevated" };
  return { color: "#f43f5e", label: "High", glowColor: "rgba(244, 63, 94, 0.4)", patternClass: "risk-pattern-high" };
}

export const PrsGauge = memo(function PrsGauge({ percentile, condition, className }: PrsGaugeProps) {
  const clamped = Math.min(Math.max(percentile, 0), 100);
  const { color, label, patternClass } = getRiskInfo(clamped);

  // SVG gauge math
  const radius = 80;
  const strokeWidth = 12;
  const cx = 100;
  const cy = 100;
  // Semi-circle from 180 to 0 degrees (left to right)
  const circumference = Math.PI * radius;
  const fillLength = (clamped / 100) * circumference;
  const dashArray = `${fillLength} ${circumference - fillLength}`;

  // Needle angle: -180 (left) to 0 (right), with 0% = -180 and 100% = 0
  const needleAngle = -180 + (clamped / 100) * 180;

  const safeId = condition.replace(/[^a-zA-Z0-9]/g, "-");
  const valueText = `PRS score: ${Math.round(clamped)} (${Math.round(clamped)}th percentile, ${label} risk level)`;

  return (
    <div
      className={cn("text-center", className)}
      role="meter"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuetext={valueText}
      aria-label={`${condition} polygenic risk score`}
    >
      <span className="sr-only">
        {condition}: {Math.round(clamped)}th percentile, {label} risk
      </span>
      <div className="relative mx-auto w-[200px]">
        <svg viewBox="0 0 200 120" className="w-full" aria-hidden="true">
          {/* Background track */}
          <path
            d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
            fill="none"
            stroke="var(--border-subtle)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />

          {/* Color gradient track (background) */}
          <defs>
            <linearGradient id={`gauge-grad-${safeId}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#06d6a0" stopOpacity="0.3" />
              <stop offset="40%" stopColor="#06b6d4" stopOpacity="0.3" />
              <stop offset="65%" stopColor="#f59e0b" stopOpacity="0.3" />
              <stop offset="82%" stopColor="#f97316" stopOpacity="0.3" />
              <stop offset="95%" stopColor="#f43f5e" stopOpacity="0.3" />
            </linearGradient>
          </defs>
          <path
            d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
            fill="none"
            stroke={`url(#gauge-grad-${safeId})`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />

          {/* Filled portion */}
          <m.path
            d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={dashArray}
            initial={{ strokeDasharray: `0 ${circumference}` }}
            animate={{ strokeDasharray: dashArray }}
            transition={{ duration: 1.2, ease: "easeOut" as const }}
          />

          {/* Needle */}
          <m.g
            initial={{ rotate: -180 }}
            animate={{ rotate: needleAngle }}
            transition={{ duration: 1.2, ease: "easeOut" as const, delay: 0.2 }}
            style={{ transformOrigin: `${cx}px ${cy}px` }}
          >
            <line
              x1={cx}
              y1={cy}
              x2={cx - radius + 8}
              y2={cy}
              stroke={color}
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <circle cx={cx} cy={cy} r="4" fill={color} />
          </m.g>

          {/* Scale labels */}
          <text x="16" y="115" className="fill-(--text-dim) text-[9px] font-body">
            Low
          </text>
          <text x="85" y="22" className="fill-(--text-dim) text-[9px] font-body">
            Avg
          </text>
          <text x="170" y="115" className="fill-(--text-dim) text-[9px] font-body">
            High
          </text>
        </svg>

        {/* Center text */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
          <m.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8, duration: 0.3 }}
            className="text-center"
          >
            <span
              className="font-heading text-2xl font-extrabold"
              style={{ color }}
            >
              {Math.round(clamped)}
            </span>
            <span className="ml-0.5 text-xs text-(--text-dim)">th</span>
          </m.div>
        </div>
      </div>

      {/* Condition label */}
      <p className="mt-2 font-heading text-sm font-semibold text-(--text-heading)">
        {condition}
      </p>
      {/* Risk level with text label and high-contrast pattern marker */}
      <p className={cn("text-xs font-medium", patternClass)} style={{ color }}>
        {label} Risk
      </p>
    </div>
  );
});
