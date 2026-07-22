import { Suspense } from "react";
import QuoteForm from "./QuoteForm";

export default function QuotePage() {
  return (
    <Suspense fallback={<div className="card">Loading…</div>}>
      <QuoteForm />
    </Suspense>
  );
}
