import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  darkMode: ["selector", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        /* ── Dark Mode (Bioluminescent Laboratory) ── */
        bio: {
          deep: "#050810",
          surface: "#0c1220",
          elevated: "#141e33",
          glass: "rgba(12, 18, 32, 0.65)",
        },
        accent: {
          teal: "#06d6a0",
          violet: "#8b5cf6",
          cyan: "#06b6d4",
          amber: "#f59e0b",
          rose: "#f43f5e",
        },
        /* ── Light Mode (Daylight Laboratory) ── */
        day: {
          deep: "#f8fafc",
          surface: "#ffffff",
          elevated: "#f1f5f9",
          glass: "rgba(255, 255, 255, 0.72)",
        },
        "day-accent": {
          teal: "#059669",
          violet: "#7c3aed",
          cyan: "#0891b2",
          amber: "#d97706",
          rose: "#e11d48",
        },
        /* ── Text ── */
        "text-dark": {
          primary: "#e2e8f0",
          heading: "#f1f5f9",
          body: "#cbd5e1",
          muted: "#94a3b8",
          dim: "#7c8db5",
        },
        "text-light": {
          primary: "#0f172a",
          heading: "#0f172a",
          body: "#334155",
          muted: "#475569",
          dim: "#6b7280",
        },
      },
      fontFamily: {
        heading: ["var(--font-sora)", "sans-serif"],
        body: ["var(--font-lexend)", "sans-serif"],
        mono: ["var(--font-jetbrains)", "monospace"],
      },
      borderRadius: {
        glass: "20px",
        card: "18px",
        btn: "14px",
        pill: "9999px",
      },
      boxShadow: {
        glow: "0 0 20px rgba(6, 214, 160, 0.25), 0 4px 30px rgba(0, 0, 0, 0.4)",
        "glow-strong": "0 0 40px rgba(6, 214, 160, 0.35), 0 8px 40px rgba(0, 0, 0, 0.5)",
        "glow-violet": "0 0 30px rgba(139, 92, 246, 0.2), 0 4px 30px rgba(0, 0, 0, 0.4)",
        ambient: "0 4px 30px rgba(0, 0, 0, 0.4)",
        elevated: "0 8px 40px rgba(0, 0, 0, 0.5)",
        "glass-border": "inset 0 1px 0 rgba(255, 255, 255, 0.03)",
        "light-ambient": "0 4px 30px rgba(15, 23, 42, 0.08)",
        "light-elevated": "0 8px 40px rgba(15, 23, 42, 0.12)",
      },
      backdropBlur: {
        glass: "16px",
        "glass-strong": "20px",
      },
      backgroundImage: {
        "gradient-app": "linear-gradient(160deg, #050810 0%, #0c1220 40%, #0f0a24 70%, #050810 100%)",
        "gradient-app-light": "linear-gradient(160deg, #f8fafc 0%, #ffffff 40%, #f1f5f9 70%, #f8fafc 100%)",
        "gradient-teal": "linear-gradient(135deg, #06d6a0, #059669)",
        "gradient-teal-cyan": "linear-gradient(135deg, #06d6a0, #06b6d4)",
        "gradient-violet": "linear-gradient(135deg, #8b5cf6, #a78bfa)",
        "gradient-rainbow-bar": "linear-gradient(90deg, #06d6a0, #8b5cf6, #06b6d4)",
        "gradient-cta": "linear-gradient(135deg, #080c18 0%, #0c1220 40%, #0f0a24 100%)",
        "gradient-card": "linear-gradient(135deg, #0c1220, #1a2236)",
        "gradient-card-light": "linear-gradient(135deg, #ffffff, #f8fafc)",
      },
      keyframes: {
        helixFloat: {
          "0%, 100%": { transform: "translateY(0px) rotate(0deg)", opacity: "0.7" },
          "50%": { transform: "translateY(-10px) rotate(180deg)", opacity: "1" },
        },
        gradientShift: {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
        biolumPulse: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(6, 214, 160, 0.25), 0 4px 30px rgba(0, 0, 0, 0.4)" },
          "50%": { boxShadow: "0 0 40px rgba(6, 214, 160, 0.25), 0 4px 30px rgba(0, 0, 0, 0.4)" },
        },
        fadeSlideUp: {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        cardReveal: {
          from: { opacity: "0", transform: "translateY(24px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        glowPulse: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(6, 214, 160, 0.25), 0 4px 30px rgba(0, 0, 0, 0.4)" },
          "50%": { boxShadow: "0 0 35px rgba(6, 214, 160, 0.25), 0 4px 30px rgba(0, 0, 0, 0.4)" },
        },
        subtleScan: {
          "0%": { backgroundPosition: "0% 0%" },
          "100%": { backgroundPosition: "0% 100%" },
        },
        borderRainbow: {
          "0%": { borderColor: "rgba(6, 214, 160, 0.3)" },
          "33%": { borderColor: "rgba(139, 92, 246, 0.3)" },
          "66%": { borderColor: "rgba(6, 182, 212, 0.3)" },
          "100%": { borderColor: "rgba(6, 214, 160, 0.3)" },
        },
        spinSlow: {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
        scaleIn: {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        slideInLeft: {
          from: { opacity: "0", transform: "translateX(-20px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        slideInRight: {
          from: { opacity: "0", transform: "translateX(20px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
      },
      animation: {
        "helix-float": "helixFloat 2.2s ease-in-out infinite",
        "gradient-shift": "gradientShift 6s ease infinite",
        "biolum-pulse": "biolumPulse 5s ease-in-out infinite",
        "fade-slide-up": "fadeSlideUp 0.6s ease-out",
        shimmer: "shimmer 1.5s linear infinite",
        "card-reveal": "cardReveal 0.5s ease-out both",
        "glow-pulse": "glowPulse 5s ease-in-out infinite",
        "subtle-scan": "subtleScan 30s linear infinite",
        "border-rainbow": "borderRainbow 3s ease infinite",
        "spin-slow": "spinSlow 3s linear infinite",
        "scale-in": "scaleIn 0.4s ease-out",
        "slide-in-left": "slideInLeft 0.5s ease-out",
        "slide-in-right": "slideInRight 0.5s ease-out",
        float: "float 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
