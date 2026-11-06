import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { operatorAccess } from "./operatorAccess";

// Each page calls this before accessing data. A layout or middleware alone is
// insufficient because page rendering can run independently or in parallel.
export function requireOperatorPage(): void {
  if (operatorAccess(headers(), "GET")) notFound();
}
