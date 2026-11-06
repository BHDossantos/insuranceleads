import { createHmac, timingSafeEqual } from "node:crypto";

// Twilio's documented form algorithm; preserve all values, reject duplicate keys.
// https://www.twilio.com/docs/usage/security#validating-requests-are-coming-from-twilio
export function validTwilioSignature(token: string, url: string, fields: URLSearchParams, signature: string) {
  const keys = Array.from(fields.keys());
  if (new Set(keys).size !== keys.length) return false;
  const payload = url + keys.sort().map(key => key + fields.get(key)).join("");
  const expected = createHmac("sha1", token).update(payload).digest("base64");
  const supplied = Buffer.from(signature);
  return supplied.length === expected.length && timingSafeEqual(supplied, Buffer.from(expected));
}
