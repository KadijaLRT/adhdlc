/**
 * A tiny hook point between the AI client (core) and the Pro feature
 * (features/pro). The AI client only asks "may I make this call?",
 * "which license key goes with it?" and "that call worked"; the Pro
 * feature registers the answers. Core never imports a feature, so
 * there's no import cycle, and if nothing is registered every call is
 * simply allowed (the app's original behavior).
 */
export interface AiAccessGate {
  /** Return false to block the call and show the upgrade screen instead. */
  canMakeRequest(): boolean;
  /** Sent as the X-Pro-Token header so the server can confirm this is a Pro customer. */
  proToken(): string | null;
  /** Called after a call succeeds, to count free-tier use. */
  recordSuccess(): void;
  /** Called when the call was blocked, on the device or by the server. */
  onProRequired(): void;
}

let gate: AiAccessGate | null = null;

export function registerAiAccessGate(next: AiAccessGate | null): void {
  gate = next;
}

export function getAiAccessGate(): AiAccessGate | null {
  return gate;
}
