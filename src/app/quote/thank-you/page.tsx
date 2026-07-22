import Link from "next/link";
import { Suspense } from "react";
import { DEFAULT_AGENCY_NAME } from "@/lib/constants";

function Content({ searchParams }: { searchParams: { agency?: string } }) {
  const agency = searchParams.agency || DEFAULT_AGENCY_NAME;
  return (
    <div className="mx-auto max-w-xl">
      <div className="card space-y-4 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-green-100 text-2xl">✓</div>
        <h1 className="text-2xl font-bold">Your request has been received.</h1>
        <p className="text-slate-600">
          A licensed insurance professional from <strong>{agency}</strong> may contact you shortly using
          the channels you approved. You can reply STOP to texts or unsubscribe from emails at any time.
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <Link href="/" className="btn-secondary">Back to home</Link>
          <Link href="/quote" className="btn-primary">Request another quote</Link>
        </div>
      </div>
    </div>
  );
}

export default function ThankYouPage({ searchParams }: { searchParams: { agency?: string } }) {
  return (
    <Suspense>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}
