import type { Metadata } from "next";
import { PrivacyContent } from "./_components/privacy-content";

export const metadata: Metadata = {
  title: "Privacy Notice",
  description:
    "Mergenix Privacy Notice — GDPR Articles 13 and 14 compliant. Learn how we process your data and your rights.",
  openGraph: {
    title: "Privacy Notice — Mergenix",
    description:
      "Mergenix Privacy Notice — GDPR Articles 13 and 14 compliant. Learn how we process your data and your rights.",
    type: "website",
    siteName: "Mergenix",
  },
  twitter: {
    card: "summary_large_image",
    title: "Privacy Notice — Mergenix",
    description:
      "Mergenix Privacy Notice — GDPR Articles 13 and 14 compliant. Learn how we process your data and your rights.",
  },
};

export default function PrivacyPage() {
  return <PrivacyContent />;
}
