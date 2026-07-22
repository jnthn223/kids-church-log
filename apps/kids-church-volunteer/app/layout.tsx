import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AuthAccessProvider } from "@kcl/firebase";
import { SupportReporter } from "@kcl/ui";
import "@kcl/ui/support-report.css";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Sunday Team · KidsChurchLog", template: "%s · KidsChurchLog" },
  description: "Safe, fast Kids Church check-in and verified check-out.",
  applicationName: "KidsChurchLog Sunday Team"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
  };
  return (
    <html lang="en">
      <body>
        <AuthAccessProvider
          requiredRole="KIDS_CHURCH_VOLUNTEER"
          firebaseConfig={firebaseConfig}
        >
          {children}
        </AuthAccessProvider>
        <SupportReporter appName="Kids Church Volunteer" />
      </body>
    </html>
  );
}
