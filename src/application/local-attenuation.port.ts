/**
 * Attenuates other local audio streams while an interaction is active. Implementations
 * report their own failures and never reject: attenuation must not interrupt a turn.
 */
export interface LocalAttenuation {
  readonly attenuate: () => Promise<void>;
  readonly restore: () => Promise<void>;
}
