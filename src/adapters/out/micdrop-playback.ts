/** Estimates the end of one spoken answer using Micdrop's playback state. */
export class MicdropPlaybackBoundary {
  private active = false;
  private hasPlayed = false;
  private playing = false;
  private completed = false;
  private quietTimer?: ReturnType<typeof setTimeout>;

  constructor(
    private readonly quietMs: number,
    private readonly onComplete: () => void,
  ) {
    if (!Number.isSafeInteger(quietMs) || quietMs <= 0) {
      throw new Error('Invalid playback quiet interval');
    }
  }

  begin(): void {
    this.cancel();
    this.active = true;
  }

  /** Feed StateChange.isAssistantSpeaking; a new playback burst resets quiet time. */
  update(isAssistantSpeaking: boolean): void {
    if (!this.active || this.completed) return;
    if (isAssistantSpeaking) {
      this.hasPlayed = true;
      this.playing = true;
      this.clearQuietTimer();
      return;
    }
    if (!this.hasPlayed || !this.playing) return;
    this.playing = false;
    this.quietTimer = setTimeout(() => {
      this.quietTimer = undefined;
      if (!this.active || this.playing || this.completed) return;
      this.completed = true;
      this.onComplete();
    }, this.quietMs);
  }

  cancel(): void {
    this.clearQuietTimer();
    this.active = false;
    this.hasPlayed = false;
    this.playing = false;
    this.completed = false;
  }

  private clearQuietTimer(): void {
    if (this.quietTimer !== undefined) clearTimeout(this.quietTimer);
    this.quietTimer = undefined;
  }
}
