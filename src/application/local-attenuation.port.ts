/**
 * Attenuates other local audio streams while an interaction is active. Implementations
 * report their own failures and never reject: attenuation must not interrupt a turn.
 */
export interface LocalAttenuation {
  attenuate(): Promise<void>;
  restore(): Promise<void>;
}
