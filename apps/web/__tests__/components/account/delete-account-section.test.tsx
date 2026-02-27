import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("framer-motion", () => ({
  m: {
    div: ({ children, ...props }: any) => {
      const {
        initial,
        animate,
        exit,
        transition,
        variants,
        whileHover,
        whileTap,
        ...htmlProps
      } = props;
      return <div {...htmlProps}>{children}</div>;
    },
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock("lucide-react", () => ({
  Trash2: (props: any) => <svg data-testid="icon-trash" {...props} />,
  AlertTriangle: (props: any) => (
    <svg data-testid="icon-alert-triangle" {...props} />
  ),
  X: (props: any) => <svg data-testid="icon-x" {...props} />,
}));

vi.mock("@/components/ui/glass-card", () => ({
  GlassCard: ({ children, ...props }: any) => (
    <div data-testid="glass-card" {...props}>
      {children}
    </div>
  ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    isLoading,
    className,
    ...props
  }: any) => (
    <button
      onClick={onClick}
      disabled={disabled || isLoading}
      className={className}
      {...props}
    >
      {isLoading && <span data-testid="loader">Loading...</span>}
      {children}
    </button>
  ),
}));

vi.mock("@/hooks/use-focus-trap", () => ({
  useFocusTrap: vi.fn(),
}));

vi.mock("@/hooks/use-modal-manager", () => ({
  useModalManager: Object.assign(() => ({}), {
    getState: () => ({
      openModal: vi.fn(),
      closeModal: vi.fn(),
    }),
    setState: vi.fn(),
  }),
}));

vi.mock("@/lib/animations/modal-variants", () => ({
  overlayVariants: {},
  modalVariants: {},
}));

// ─── Import component after mocks ─────────────────────────────────────────────

import { DeleteAccountSection } from "../../../components/account/delete-account-section";

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("DeleteAccountSection", () => {
  const defaultProps = {
    onDeleteConfirmed: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.style.overflow = "";
  });

  it("renders delete button", () => {
    render(<DeleteAccountSection {...defaultProps} />);

    expect(
      screen.getByRole("button", { name: /delete my account/i }),
    ).toBeInTheDocument();
  });

  it("click opens confirmation modal", () => {
    render(<DeleteAccountSection {...defaultProps} />);

    // Modal should not be visible initially
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();

    // Click the delete button
    fireEvent.click(
      screen.getByRole("button", { name: /delete my account/i }),
    );

    // Modal should now be visible
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(screen.getByText("Are you sure?")).toBeInTheDocument();
  });

  it('"Delete Everything" button is disabled without typing "DELETE"', () => {
    render(<DeleteAccountSection {...defaultProps} />);

    fireEvent.click(
      screen.getByRole("button", { name: /delete my account/i }),
    );

    const deleteEverythingButton = screen.getByRole("button", {
      name: /delete everything/i,
    });
    expect(deleteEverythingButton).toBeDisabled();
  });

  it('typing "DELETE" enables the button', () => {
    render(<DeleteAccountSection {...defaultProps} />);

    fireEvent.click(
      screen.getByRole("button", { name: /delete my account/i }),
    );

    const input = screen.getByLabelText(
      "Type DELETE to confirm account deletion",
    );
    fireEvent.change(input, { target: { value: "DELETE" } });

    const deleteEverythingButton = screen.getByRole("button", {
      name: /delete everything/i,
    });
    expect(deleteEverythingButton).not.toBeDisabled();
  });

  it('typing "delete" (lowercase) does NOT enable the button', () => {
    render(<DeleteAccountSection {...defaultProps} />);

    fireEvent.click(
      screen.getByRole("button", { name: /delete my account/i }),
    );

    const input = screen.getByLabelText(
      "Type DELETE to confirm account deletion",
    );
    fireEvent.change(input, { target: { value: "delete" } });

    const deleteEverythingButton = screen.getByRole("button", {
      name: /delete everything/i,
    });
    expect(deleteEverythingButton).toBeDisabled();
  });

  it('clicking "Delete Everything" calls onDeleteConfirmed', async () => {
    const onDeleteConfirmed = vi.fn().mockResolvedValue(undefined);
    render(
      <DeleteAccountSection onDeleteConfirmed={onDeleteConfirmed} />,
    );

    // Open modal
    fireEvent.click(
      screen.getByRole("button", { name: /delete my account/i }),
    );

    // Type DELETE
    const input = screen.getByLabelText(
      "Type DELETE to confirm account deletion",
    );
    fireEvent.change(input, { target: { value: "DELETE" } });

    // Click delete everything
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: /delete everything/i }),
      );
    });

    expect(onDeleteConfirmed).toHaveBeenCalledTimes(1);
  });

  it("shows loading state during deletion", async () => {
    // Create a promise we control to keep the loading state active
    let resolveDelete: () => void;
    const deletePromise = new Promise<void>((resolve) => {
      resolveDelete = resolve;
    });
    const onDeleteConfirmed = vi.fn().mockReturnValue(deletePromise);

    render(
      <DeleteAccountSection onDeleteConfirmed={onDeleteConfirmed} />,
    );

    // Open modal
    fireEvent.click(
      screen.getByRole("button", { name: /delete my account/i }),
    );

    // Type DELETE
    const input = screen.getByLabelText(
      "Type DELETE to confirm account deletion",
    );
    fireEvent.change(input, { target: { value: "DELETE" } });

    // Click delete everything — don't await so we can check loading state
    act(() => {
      fireEvent.click(
        screen.getByRole("button", { name: /delete everything/i }),
      );
    });

    // Loading state should be visible
    await waitFor(() => {
      expect(screen.getByTestId("loader")).toBeInTheDocument();
    });

    // Resolve the promise to clean up
    await act(async () => {
      resolveDelete!();
    });
  });

  it("shows error message on API failure", async () => {
    const onDeleteConfirmed = vi
      .fn()
      .mockRejectedValue(new Error("Network error"));

    render(
      <DeleteAccountSection onDeleteConfirmed={onDeleteConfirmed} />,
    );

    // Open modal
    fireEvent.click(
      screen.getByRole("button", { name: /delete my account/i }),
    );

    // Type DELETE
    const input = screen.getByLabelText(
      "Type DELETE to confirm account deletion",
    );
    fireEvent.change(input, { target: { value: "DELETE" } });

    // Click delete everything
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: /delete everything/i }),
      );
    });

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });
  });

  it("Cancel closes modal", () => {
    render(<DeleteAccountSection {...defaultProps} />);

    // Open modal
    fireEvent.click(
      screen.getByRole("button", { name: /delete my account/i }),
    );
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();

    // Click cancel
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    // Modal should be gone
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it('has role="alertdialog" on confirmation modal', () => {
    render(<DeleteAccountSection {...defaultProps} />);

    // Open modal
    fireEvent.click(
      screen.getByRole("button", { name: /delete my account/i }),
    );

    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  it("Escape key closes confirmation modal", () => {
    render(<DeleteAccountSection {...defaultProps} />);

    // Open modal
    fireEvent.click(
      screen.getByRole("button", { name: /delete my account/i }),
    );
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();

    // Press Escape
    act(() => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape" }),
      );
    });

    // Modal should be gone
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("has aria-describedby linking to warning text", () => {
    render(<DeleteAccountSection {...defaultProps} />);

    // Open modal
    fireEvent.click(
      screen.getByRole("button", { name: /delete my account/i }),
    );

    const dialog = screen.getByRole("alertdialog");
    const describedById = dialog.getAttribute("aria-describedby");
    expect(describedById).toBeTruthy();

    const warningElement = document.getElementById(describedById!);
    expect(warningElement).toBeInTheDocument();
    expect(warningElement).toHaveTextContent("This will permanently delete");
    expect(warningElement).toHaveTextContent("This cannot be undone");
  });

  it("resets confirmation text when modal is closed and reopened", () => {
    render(<DeleteAccountSection {...defaultProps} />);

    // Open modal, type something
    fireEvent.click(
      screen.getByRole("button", { name: /delete my account/i }),
    );
    const input = screen.getByLabelText(
      "Type DELETE to confirm account deletion",
    );
    fireEvent.change(input, { target: { value: "DEL" } });
    expect(input).toHaveValue("DEL");

    // Close modal
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    // Reopen modal
    fireEvent.click(
      screen.getByRole("button", { name: /delete my account/i }),
    );
    const newInput = screen.getByLabelText(
      "Type DELETE to confirm account deletion",
    );
    expect(newInput).toHaveValue("");
  });
});
