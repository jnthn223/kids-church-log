"use client";

import { SupportErrorFallback } from "@kcl/ui";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset(): void }) {
  return <SupportErrorFallback error={error} reset={reset} />;
}
