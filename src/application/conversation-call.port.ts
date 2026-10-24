/** What the voice session needs to drive the conversation call and the local signals of an interaction. */
export interface VoiceSessionPorts {
  readonly openCall: () => Promise<void>;
  readonly closeCall: () => Promise<void>;
  readonly setSpeechEnabled: (enabled: boolean) => void;
  readonly playReadyCue: () => Promise<void>;
  readonly reportFailure: (error: unknown) => Promise<void>;
}
