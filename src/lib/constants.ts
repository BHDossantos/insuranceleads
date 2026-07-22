// Platform-level constants. In production these would come from agency config.

export const PLATFORM_NAME = "Insurance Lead Engine";

// The specific named seller/agency shown in the TCPA one-to-one disclosure.
// One-to-one consent requires naming the exact business that will contact the
// consumer — not a vague "and our marketing partners".
export const DEFAULT_AGENCY_NAME = "Beacon Insurance Group";

export const PRIVACY_POLICY_VERSION = "2026-01";
export const TERMS_VERSION = "2026-01";
export const TCPA_VERSION = "2026-01";

export function buildConsentText(agencyName: string): string {
  return (
    `By checking this box and clicking submit, I give my prior express written consent for ` +
    `${agencyName} (a licensed insurance agency) to contact me about insurance products at the ` +
    `phone number and email I provided, including by autodialed or prerecorded calls and text ` +
    `messages, even if my number is on a Do Not Call list. Consent is not a condition of purchase. ` +
    `Message and data rates may apply. I can reply STOP to opt out of texts or unsubscribe from ` +
    `emails at any time. I agree to the Privacy Policy and Terms of Use.`
  );
}

export const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME",
  "MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA",
  "RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC",
];
