import type { Metadata } from "next";
import { BareShell } from "@/components/BareShell";

export const metadata: Metadata = {
  title: "Logg inn · Tunetrail",
  robots: { index: false, follow: false },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <BareShell>{children}</BareShell>;
}
