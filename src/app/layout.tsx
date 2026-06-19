import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Insurance Lead Engine",
  description:
    "Generate exclusive, compliant, high-intent insurance leads and route them to the right agent instantly.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-2 font-bold text-brand-700">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white">IL</span>
              Insurance Lead Engine
            </Link>
            <nav className="flex items-center gap-4 text-sm font-medium text-slate-600">
              <Link href="/quote" className="hover:text-brand-700">
                Get a quote
              </Link>
              <Link href="/agent" className="hover:text-brand-700">
                Agent
              </Link>
              <Link href="/admin" className="hover:text-brand-700">
                Admin
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
        <footer className="border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-6 text-xs text-slate-500">
            Demo platform. Consent records, TCPA one-to-one disclosures, and CAN-SPAM suppression are
            captured for compliance. Not legal advice.
          </div>
        </footer>
      </body>
    </html>
  );
}
