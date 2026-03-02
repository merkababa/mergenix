import type { Metadata } from "next";
import { SuccessContent } from "./_components/success-content";

export const metadata: Metadata = {
  title: "Payment Successful | Mergenix",
  description: "Your Mergenix purchase was successful.",
};

export default function PaymentSuccessPage() {
  return <SuccessContent />;
}
