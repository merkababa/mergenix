import type { Metadata } from "next";
import { ForgotPasswordContent } from "./_components/forgot-password-content";

export const metadata: Metadata = {
  title: "Forgot Password | Mergenix",
  description: "Reset your Mergenix password.",
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordContent />;
}
