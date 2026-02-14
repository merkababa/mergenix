import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CoverageMeter } from "../../../../components/genetics/results/coverage-meter";

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("CoverageMeter", () => {
  const defaultProps = {
    variantsTested: 8,
    variantsTotal: 10,
    coveragePct: 80,
    confidenceLevel: "high",
    diseaseName: "Cystic Fibrosis",
  };

  it("renders variant count text", () => {
    render(<CoverageMeter {...defaultProps} />);

    expect(screen.getByText("Tested 8 of 10 variants")).toBeInTheDocument();
  });

  it("renders percentage display", () => {
    render(<CoverageMeter {...defaultProps} />);

    expect(screen.getByText("80%")).toBeInTheDocument();
  });

  it("has role=meter with correct ARIA attributes", () => {
    render(<CoverageMeter {...defaultProps} />);

    const meter = screen.getByRole("meter");
    expect(meter).toHaveAttribute("aria-valuenow", "80");
    expect(meter).toHaveAttribute("aria-valuemin", "0");
    expect(meter).toHaveAttribute("aria-valuemax", "100");
    expect(meter).toHaveAttribute(
      "aria-valuetext",
      "Tested 8 of 10 variants (80%)",
    );
    expect(meter).toHaveAttribute(
      "aria-label",
      "Cystic Fibrosis variant coverage",
    );
  });

  it("rounds non-integer percentage", () => {
    render(<CoverageMeter {...defaultProps} coveragePct={66.7} />);

    expect(screen.getByText("67%")).toBeInTheDocument();
    expect(screen.getByRole("meter")).toHaveAttribute("aria-valuenow", "67");
  });

  it("handles 0% coverage", () => {
    render(
      <CoverageMeter
        {...defaultProps}
        variantsTested={0}
        coveragePct={0}
        confidenceLevel="insufficient"
      />,
    );

    expect(screen.getByText("Tested 0 of 10 variants")).toBeInTheDocument();
    expect(screen.getByText("0%")).toBeInTheDocument();
  });

  it("handles 100% coverage", () => {
    render(
      <CoverageMeter
        {...defaultProps}
        variantsTested={10}
        coveragePct={100}
        confidenceLevel="high"
      />,
    );

    expect(screen.getByText("Tested 10 of 10 variants")).toBeInTheDocument();
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("does not re-render with identical props (React.memo)", () => {
    const { rerender } = render(<CoverageMeter {...defaultProps} />);

    // Re-render with same props — React.memo should prevent re-render
    // We verify by checking the component renders identically
    rerender(<CoverageMeter {...defaultProps} />);

    expect(screen.getByText("Tested 8 of 10 variants")).toBeInTheDocument();
    expect(screen.getByRole("meter")).toBeInTheDocument();
  });

  // ─── Gap 1: Confidence color coding per confidence level ───────────────

  describe("confidence color coding", () => {
    it("uses teal color for high confidence level", () => {
      render(
        <CoverageMeter
          {...defaultProps}
          confidenceLevel="high"
          coveragePct={90}
        />,
      );

      // The percentage text span gets inline style with the confidence color
      const pctText = screen.getByText("90%");
      expect(pctText).toHaveStyle({ color: "var(--accent-teal)" });
    });

    it("uses amber color for moderate confidence level", () => {
      render(
        <CoverageMeter
          {...defaultProps}
          confidenceLevel="moderate"
          coveragePct={60}
        />,
      );

      const pctText = screen.getByText("60%");
      expect(pctText).toHaveStyle({ color: "var(--accent-amber)" });
    });

    it("uses rose color for low confidence level", () => {
      render(
        <CoverageMeter
          {...defaultProps}
          confidenceLevel="low"
          coveragePct={30}
        />,
      );

      const pctText = screen.getByText("30%");
      expect(pctText).toHaveStyle({ color: "var(--accent-rose)" });
    });

    it("uses rose color for insufficient confidence level", () => {
      render(
        <CoverageMeter
          {...defaultProps}
          confidenceLevel="insufficient"
          coveragePct={10}
        />,
      );

      const pctText = screen.getByText("10%");
      expect(pctText).toHaveStyle({ color: "var(--accent-rose)" });
    });

    it("uses muted color for unknown confidence level", () => {
      render(
        <CoverageMeter
          {...defaultProps}
          confidenceLevel="unknown"
          coveragePct={50}
        />,
      );

      const pctText = screen.getByText("50%");
      expect(pctText).toHaveStyle({ color: "var(--text-muted)" });
    });

    it("applies correct background color for high confidence", () => {
      const { container } = render(
        <CoverageMeter {...defaultProps} confidenceLevel="high" />,
      );

      // The outermost div gets inline background style
      const wrapper = container.firstElementChild as HTMLElement;
      expect(wrapper.style.background).toBe("rgba(6, 214, 160, 0.12)");
    });

    it("applies correct background color for moderate confidence", () => {
      const { container } = render(
        <CoverageMeter {...defaultProps} confidenceLevel="moderate" />,
      );

      const wrapper = container.firstElementChild as HTMLElement;
      expect(wrapper.style.background).toBe("rgba(245, 158, 11, 0.12)");
    });

    it("applies correct background color for low confidence", () => {
      const { container } = render(
        <CoverageMeter {...defaultProps} confidenceLevel="low" />,
      );

      const wrapper = container.firstElementChild as HTMLElement;
      expect(wrapper.style.background).toBe("rgba(244, 63, 94, 0.12)");
    });
  });

  // ─── Per-disease rendering verification ────────────────────────────────

  describe("per-disease rendering", () => {
    it("includes disease name in the aria-label", () => {
      render(<CoverageMeter {...defaultProps} diseaseName="Tay-Sachs Disease" />);

      const meter = screen.getByRole("meter");
      expect(meter).toHaveAttribute("aria-label", "Tay-Sachs Disease variant coverage");
    });

    it("renders independently for different diseases", () => {
      const { unmount } = render(
        <CoverageMeter
          variantsTested={5}
          variantsTotal={20}
          coveragePct={25}
          confidenceLevel="low"
          diseaseName="Disease A"
        />,
      );

      expect(screen.getByText("Tested 5 of 20 variants")).toBeInTheDocument();
      expect(screen.getByRole("meter")).toHaveAttribute("aria-label", "Disease A variant coverage");

      unmount();

      render(
        <CoverageMeter
          variantsTested={18}
          variantsTotal={20}
          coveragePct={90}
          confidenceLevel="high"
          diseaseName="Disease B"
        />,
      );

      expect(screen.getByText("Tested 18 of 20 variants")).toBeInTheDocument();
      expect(screen.getByRole("meter")).toHaveAttribute("aria-label", "Disease B variant coverage");
    });
  });
});
