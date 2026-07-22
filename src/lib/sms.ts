// Inbound SMS keyword handling for TCPA/CTIA compliance.
//
// Carriers require honoring STOP/UNSUBSCRIBE (opt-out), START (opt-in), and
// HELP. This module is a pure parser so it can be unit-tested without a
// network or database; the webhook route applies the resulting action to the
// suppression list.

export type SmsAction = "opt_out" | "opt_in" | "help" | "none";

// Standard CTIA keywords (case-insensitive, punctuation/whitespace tolerant).
const OPT_OUT = new Set(["stop", "stopall", "unsubscribe", "cancel", "end", "quit"]);
const OPT_IN = new Set(["start", "yes", "unstop"]);
const HELP = new Set(["help", "info"]);

export function parseSmsKeyword(body: string): SmsAction {
  const word = (body ?? "").trim().toLowerCase().replace(/[^a-z]/g, "");
  if (!word) return "none";
  if (OPT_OUT.has(word)) return "opt_out";
  if (OPT_IN.has(word)) return "opt_in";
  if (HELP.has(word)) return "help";
  return "none";
}

export const SMS_REPLIES: Record<Exclude<SmsAction, "none">, string> = {
  opt_out: "You have been unsubscribed and will receive no further messages. Reply START to opt back in.",
  opt_in: "You are subscribed again. Reply STOP to unsubscribe, HELP for help.",
  help: "Insurance Lead Engine alerts. Reply STOP to unsubscribe. Msg & data rates may apply.",
};
