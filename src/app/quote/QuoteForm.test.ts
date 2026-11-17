import { beforeEach, expect, it, vi } from "vitest";
import QuoteForm from "./QuoteForm";

const hooks = vi.hoisted(() => ({ states: [] as any[], cursor: 0, product: "auto" }));
vi.mock("react", async (original) => ({
  ...await original<typeof import("react")>(),
  useMemo: (fn: () => unknown) => fn(),
  useState: (initial: unknown) => {
    const slot = hooks.cursor++;
    if (!(slot in hooks.states)) hooks.states[slot] = initial;
    return [hooks.states[slot], (value: any) => {
      hooks.states[slot] = typeof value === "function" ? value(hooks.states[slot]) : value;
    }];
  },
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams({ product: hooks.product }),
  useRouter: () => ({ push: vi.fn() }),
}));
function render() { hooks.cursor = 0; return QuoteForm(); }
function nodes(tree: any): any[] {
  if (!tree || typeof tree !== "object") return [];
  return [tree, ...[tree.props?.children].flat(Infinity).flatMap(nodes)];
}
function text(tree: any): string {
  if (typeof tree === "string" || typeof tree === "number") return String(tree);
  return [tree?.props?.children].flat(Infinity).filter(v => v != null).map(text).join("");
}
function click(label: string) {
  const button = nodes(render()).find(n => n.type === "button" && text(n) === label);
  expect(button, `button ${label}`).toBeTruthy();
  button.props.onClick();
}
beforeEach(() => {
  hooks.states = []; hooks.cursor = 0; hooks.product = "auto";
  vi.stubGlobal("fetch", vi.fn(() => { throw Error("Unexpected submission"); }));
});
it("reviews and edits the request without submitting or preselecting consent", () => {
  render();
  hooks.states[2] = { firstName: "Test", lastName: "Visitor", email: "visitor@example.test", phone: "6175550123", state: "MA", zip: "02110" };
  click("Continue");
  const vehicle = nodes(render()).find(n => n.type === "input" && n.props.type === "number");
  vehicle.props.onChange({ target: { value: "2" } });
  click("Continue");
  expect(text(render())).toContain("Review your request");
  expect(text(render())).toContain("visitor@example.test");
  expect(text(render())).toContain("Number of vehicles2");
  click("Edit contact");
  expect(nodes(render()).some(n => n.type === "input" && n.props.value === "visitor@example.test")).toBe(true);
  click("Continue"); click("Continue"); click("Continue to consent");
  expect(nodes(render()).filter(n => n.type === "input" && n.props.type === "checkbox").every(n => n.props.checked === false)).toBe(true);
  click("Submit request");
  expect(text(render())).toContain("You must provide consent");
  expect(fetch).not.toHaveBeenCalled();
});
it("unknown product URLs return to product selection instead of a dead end", () => {
  hooks.product = "constructor";
  expect(text(render())).toContain("What do you want to insure?");
  expect(fetch).not.toHaveBeenCalled();
});
