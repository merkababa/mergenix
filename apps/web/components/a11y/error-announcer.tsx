"use client";

import { useAnnouncerStore } from "@/lib/stores/announcer-store";

/**
 * Globally-mounted aria-live regions for screen reader announcements.
 *
 * Renders two visually-hidden divs:
 * - assertive: for errors and urgent messages
 * - polite: for status updates and non-critical info
 *
 * Content is driven by the announcer Zustand store.
 * Mount once in the root layout, before the Navbar.
 */
export function ErrorAnnouncer() {
  const assertiveMessage = useAnnouncerStore((s) => s.assertiveMessage);
  const politeMessage = useAnnouncerStore((s) => s.politeMessage);

  const srOnlyStyle: React.CSSProperties = {
    position: "absolute",
    width: "1px",
    height: "1px",
    overflow: "hidden",
    clip: "rect(0, 0, 0, 0)",
    whiteSpace: "nowrap",
  };

  return (
    <>
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        style={srOnlyStyle}
        data-testid="announcer-assertive"
      >
        {assertiveMessage}
      </div>
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        style={srOnlyStyle}
        data-testid="announcer-polite"
      >
        {politeMessage}
      </div>
    </>
  );
}
