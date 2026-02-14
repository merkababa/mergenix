import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  VariantCard,
  type VariantCardProps,
} from "../../../../components/genetics/results/variant-card";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const baseDrugs = [
  { name: "Clopidogrel", recommendation: "Use alternative antiplatelet", level: "strong" },
  { name: "Omeprazole", recommendation: "Consider dose adjustment", level: "moderate" },
];

const defaultProps: VariantCardProps = {
  geneName: "CYP2C19",
  diplotype: "*1/*2",
  phenotype: "Intermediate Metabolizer",
  drugs: baseDrugs,
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("VariantCard", () => {
  it("renders the gene name as a heading", () => {
    render(<VariantCard {...defaultProps} />);
    expect(screen.getByText("CYP2C19")).toBeInTheDocument();
  });

  it("renders the diplotype in a code element", () => {
    render(<VariantCard {...defaultProps} />);
    expect(screen.getByText("*1/*2")).toBeInTheDocument();
  });

  it("renders the phenotype text", () => {
    render(<VariantCard {...defaultProps} />);
    expect(screen.getByText("Intermediate Metabolizer")).toBeInTheDocument();
  });

  it("renders all drug names", () => {
    render(<VariantCard {...defaultProps} />);
    expect(screen.getByText("Clopidogrel")).toBeInTheDocument();
    expect(screen.getByText("Omeprazole")).toBeInTheDocument();
  });

  it("renders drug recommendations", () => {
    render(<VariantCard {...defaultProps} />);
    expect(
      screen.getByText("Use alternative antiplatelet"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Consider dose adjustment"),
    ).toBeInTheDocument();
  });

  it("renders evidence level badges", () => {
    render(<VariantCard {...defaultProps} />);
    expect(screen.getByText("strong")).toBeInTheDocument();
    expect(screen.getByText("moderate")).toBeInTheDocument();
  });

  it("renders nothing special when drugs array is empty", () => {
    render(
      <VariantCard {...defaultProps} drugs={[]} />,
    );
    expect(screen.getByText("CYP2C19")).toBeInTheDocument();
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(
      <VariantCard {...defaultProps} className="test-class" />,
    );
    const card = container.firstElementChild!;
    expect(card.className).toContain("test-class");
  });
});
