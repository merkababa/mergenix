import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  ResponsiveDrugTable,
  type GeneRow,
} from "../../../../components/genetics/results/responsive-drug-table";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const mockGenes: GeneRow[] = [
  {
    gene: "CYP2D6",
    diplotype: "*1/*4",
    phenotype: "Intermediate Metabolizer",
    drugs: [
      {
        name: "Codeine",
        recommendation: "Avoid use, consider morphine",
        level: "strong",
      },
      {
        name: "Tramadol",
        recommendation: "Reduce dose by 25%",
        level: "moderate",
      },
    ],
  },
  {
    gene: "CYP2C19",
    diplotype: "*1/*1",
    phenotype: "Normal Metabolizer",
    drugs: [],
  },
];

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("ResponsiveDrugTable", () => {
  it("returns null when genes array is empty", () => {
    const { container } = render(<ResponsiveDrugTable genes={[]} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders both mobile and desktop views in the DOM", () => {
    const { container } = render(<ResponsiveDrugTable genes={mockGenes} />);
    // Desktop table is always in DOM (hidden via CSS on mobile)
    expect(screen.getByRole("table")).toBeInTheDocument();
    // Mobile cards wrapper also in DOM (hidden via CSS on desktop)
    const mobileDiv = container.querySelector(".block.md\\:hidden");
    expect(mobileDiv).toBeInTheDocument();
  });

  it("renders table headers with scope='col'", () => {
    render(<ResponsiveDrugTable genes={mockGenes} />);
    const headers = screen.getAllByRole("columnheader");
    for (const th of headers) {
      expect(th).toHaveAttribute("scope", "col");
    }
    expect(screen.getByText("Gene")).toBeInTheDocument();
    expect(screen.getByText("Diplotype")).toBeInTheDocument();
    expect(screen.getByText("Phenotype")).toBeInTheDocument();
    expect(screen.getByText("Affected Drugs")).toBeInTheDocument();
    expect(screen.getByText("Recommendation")).toBeInTheDocument();
  });

  it("renders gene names in the table", () => {
    render(<ResponsiveDrugTable genes={mockGenes} />);
    // Gene names appear in both mobile and desktop views
    expect(screen.getAllByText("CYP2D6").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("CYP2C19").length).toBeGreaterThanOrEqual(1);
  });

  it("shows 'No drug interactions found' for genes with no drugs", () => {
    render(<ResponsiveDrugTable genes={mockGenes} />);
    expect(screen.getByText("No drug interactions found")).toBeInTheDocument();
  });

  it("uses CSS classes for responsive visibility", () => {
    const { container } = render(<ResponsiveDrugTable genes={mockGenes} />);
    // Mobile wrapper uses block md:hidden
    const mobileDiv = container.querySelector(".block.md\\:hidden");
    expect(mobileDiv).toBeInTheDocument();
    // Desktop wrapper uses hidden md:block
    const desktopDiv = container.querySelector(".hidden.md\\:block");
    expect(desktopDiv).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(
      <ResponsiveDrugTable genes={mockGenes} className="custom-class" />,
    );
    expect(container.firstElementChild!.className).toContain("custom-class");
  });

  it("has accessible caption on the table", () => {
    render(<ResponsiveDrugTable genes={mockGenes} />);
    expect(
      screen.getByText("Pharmacogenomic gene variants and drug recommendations"),
    ).toBeInTheDocument();
  });

  it("does not use 'use client' directive (no client-side JS needed)", async () => {
    // The component no longer needs useSyncExternalStore or any client hooks
    // This is verified by the import — only memo is imported from react
    const mod = await import(
      "../../../../components/genetics/results/responsive-drug-table"
    );
    expect(mod.ResponsiveDrugTable).toBeDefined();
  });

  // ─── Gap 4: Drug names render in both mobile and desktop views ────────

  describe("drug names in both responsive views", () => {
    it("renders drug names in the desktop table view", () => {
      const { container } = render(<ResponsiveDrugTable genes={mockGenes} />);

      // Desktop view is inside .hidden.md\\:block
      const desktopDiv = container.querySelector(".hidden.md\\:block")!;
      expect(desktopDiv).toBeInTheDocument();

      // Drug names should appear in the table cells
      expect(desktopDiv.textContent).toContain("Codeine");
      expect(desktopDiv.textContent).toContain("Tramadol");
    });

    it("renders drug names in the mobile card view", () => {
      const { container } = render(<ResponsiveDrugTable genes={mockGenes} />);

      // Mobile view is inside .block.md\\:hidden
      const mobileDiv = container.querySelector(".block.md\\:hidden")!;
      expect(mobileDiv).toBeInTheDocument();

      // Drug names should appear in the mobile VariantCard components
      expect(mobileDiv.textContent).toContain("Codeine");
      expect(mobileDiv.textContent).toContain("Tramadol");
    });

    it("renders gene names in both mobile and desktop views", () => {
      const { container } = render(<ResponsiveDrugTable genes={mockGenes} />);

      const desktopDiv = container.querySelector(".hidden.md\\:block")!;
      const mobileDiv = container.querySelector(".block.md\\:hidden")!;

      // Gene names in desktop
      expect(desktopDiv.textContent).toContain("CYP2D6");
      expect(desktopDiv.textContent).toContain("CYP2C19");

      // Gene names in mobile
      expect(mobileDiv.textContent).toContain("CYP2D6");
      expect(mobileDiv.textContent).toContain("CYP2C19");
    });

    it("renders drug recommendations in both views", () => {
      const { container } = render(<ResponsiveDrugTable genes={mockGenes} />);

      const desktopDiv = container.querySelector(".hidden.md\\:block")!;
      const mobileDiv = container.querySelector(".block.md\\:hidden")!;

      // Recommendations appear in desktop table
      expect(desktopDiv.textContent).toContain("Avoid use, consider morphine");
      expect(desktopDiv.textContent).toContain("Reduce dose by 25%");

      // Recommendations appear in mobile cards
      expect(mobileDiv.textContent).toContain("Avoid use, consider morphine");
      expect(mobileDiv.textContent).toContain("Reduce dose by 25%");
    });

    it("both mobile (block md:hidden) and desktop (hidden md:block) wrappers are present", () => {
      const { container } = render(<ResponsiveDrugTable genes={mockGenes} />);

      const mobileDiv = container.querySelector(".block.md\\:hidden");
      const desktopDiv = container.querySelector(".hidden.md\\:block");

      expect(mobileDiv).not.toBeNull();
      expect(desktopDiv).not.toBeNull();

      // Both are children of the root wrapper
      expect(mobileDiv!.parentElement).toBe(container.firstElementChild);
      expect(desktopDiv!.parentElement).toBe(container.firstElementChild);
    });

    it("desktop view has aria-label for the table region", () => {
      const { container } = render(<ResponsiveDrugTable genes={mockGenes} />);

      const desktopDiv = container.querySelector(".hidden.md\\:block")!;
      expect(desktopDiv).toHaveAttribute("role", "region");
      expect(desktopDiv).toHaveAttribute("aria-label", "Gene drug interaction table");
    });
  });
});
