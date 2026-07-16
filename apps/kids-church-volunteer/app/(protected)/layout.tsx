import type { ReactNode } from "react";
import { VolunteerShell } from "@/components/volunteer-shell";
export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return <VolunteerShell>{children}</VolunteerShell>;
}
