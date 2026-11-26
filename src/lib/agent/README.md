# Business agent (ported from Jennifer)

This folder is Jennifer's agent core, copied so this app can run the same business agent Jennifer runs. Source: github.com/BHDossantos/jennifer. Change it there first, then copy it here again.

- `core.ts`: the department agents, Jennifer's agent rules, the strict output envelope and `runBusinessTask`, which works one business task the way Jennifer's department shift does.
- `charter.ts`: this business's agent, with its tasks, guardrails, measures and the daily Claude routine it works alongside.
- `untrusted.ts`, `redaction.ts`, `claims.ts`: Jennifer's guards. Outside text is wrapped as untrusted data. Secrets are redacted from errors. Claims that something was paid, sent or signed are flagged.

The agent can only propose. Nothing here sends, posts, pays or writes. Every proposal comes back with `needsApproval: true`.

## Turning it on

This app has no admin sign-in yet, so the agent is not exposed on the web. `provider.ts` wires it to Claude and `scripts/business-agent.ts` runs it from your own computer:

```
BUSINESS_AGENT_ENABLED=true ANTHROPIC_API_KEY=... npm run agent -- prospects notes.txt
```

It reads lead counts from the database (never names or contact details), adds the notes file if you give one (treated as untrusted) and prints the proposals. Nothing is stored or sent. Without the flag or the key it prints the reason and stops. `BUSINESS_AGENT_MODEL` overrides the model.
