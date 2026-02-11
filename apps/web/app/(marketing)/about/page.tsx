import type { Metadata } from "next";
import { AboutContent } from "./_components/about-content";

export const metadata: Metadata = {
  title: "About",
  description:
    "Learn about Mergenix's mission, science, and privacy-first approach to genetic offspring analysis.",
  openGraph: {
    title: "About Mergenix",
    description:
      "Learn about Mergenix's mission, science, and privacy-first approach to genetic offspring analysis.",
    type: "website",
    siteName: "Mergenix",
  },
  twitter: {
    card: "summary_large_image",
    title: "About Mergenix",
    description:
      "Learn about Mergenix's mission, science, and privacy-first approach to genetic offspring analysis.",
  },
};

export default function AboutPage() {
  return <AboutContent />;
}
