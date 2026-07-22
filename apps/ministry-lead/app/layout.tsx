import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AuthAccessProvider } from "@kcl/firebase";
import { SupportReporter } from "@kcl/ui";
import "@kcl/ui/support-report.css";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "KidsChurchLog · Every child known",
    template: "%s · KidsChurchLog"
  },
  description: "Role-based family registration, Sunday attendance, safe checkout, and children’s-ministry oversight.",
  applicationName: "KidsChurchLog"
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body><AuthAccessProvider>{children}</AuthAccessProvider><SupportReporter appName="Ministry Lead" /></body>
    </html>
  );
}
