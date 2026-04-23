import type { Metadata } from "next";
import "./globals.css";
import "@near-wallet-selector/modal-ui/styles.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "DAO Staking Console",
  description:
    "Manage a NEAR Sputnik DAO's staking pool rewards: unstake, withdraw, and transfer via proposals.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
