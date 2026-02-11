import type { Metadata } from "next";
import { AccountContent } from "./_components/account-content";

export const metadata: Metadata = {
  title: "Account Settings | Mergenix",
  description: "Manage your Mergenix account profile, security settings, and active sessions.",
};

export default function AccountPage() {
  return <AccountContent />;
}
