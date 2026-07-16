import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AuthAccessProvider } from "@kcl/firebase";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Ministry Lead · KidsChurchLog",
    template: "%s · KidsChurchLog"
  },
  description: "Safe children’s-ministry oversight and operations.",
  applicationName: "KidsChurchLog Ministry Lead"
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body><AuthAccessProvider>{children}</AuthAccessProvider></body>
    </html>
  );
}
