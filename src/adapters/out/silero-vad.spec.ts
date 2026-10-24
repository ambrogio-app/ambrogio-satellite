import { afterEach, describe, expect, it, vi } from 'vitest';
import { SILERO_OPTIONS, SILERO_WINDOW_SAMPLES, SileroVad, type SpeechEvents } from './silero-vad.js';

const opened: SileroVad[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(opened.splice(0).map(vad => vad.close()));
});

async function open(): Promise<SileroVad> {
  const vad = await SileroVad.open();
  opened.push(vad);
  return vad;
}

function recorder() {
  const log: string[] = [];
  const events: SpeechEvents = {
    confirmed: () => log.push('confirmed'),
    ended: () => log.push('ended'),
    failed: () => log.push('failed'),
  };
  return { log, events };
}

/** Score each window with the next scripted probability instead of the model. */
function script(probabilities: number[]) {
  const queue = [...probabilities];
  return vi.spyOn(SileroVad.prototype as unknown as { infer(frame: Float32Array): Promise<number> }, 'infer')
    .mockImplementation(async () => queue.shift() ?? 0);
}

async function windows(vad: SileroVad, count: number) {
  vad.push(new Float32Array(count * SILERO_WINDOW_SAMPLES));
  await new Promise(resolve => setTimeout(resolve, 20));
}

describe('Silero VAD', () => {
  it('uses the values previously applied through Micdrop', () => {
    expect(SILERO_OPTIONS).toEqual({ positiveSpeechThreshold: 0.18, negativeSpeechThreshold: 0.11,
      minSpeechFrames: 4, redemptionFrames: 20 });
    expect(SILERO_WINDOW_SAMPLES).toBe(512);
  });

  it('loads the bundled model and reports nothing for silence', async () => {
    const vad = await open();
    const { log, events } = recorder();
    vad.start(events);
    await windows(vad, 30);
    expect(log).toEqual([]);
  });

  it('confirms speech after minSpeechFrames and ends it after redemptionFrames quiet windows', async () => {
    const vad = await open();
    script([0.9, 0.9, 0.9, 0.9, 0.9, ...Array(19).fill(0.05), 0.15, 0.05]);
    const { log, events } = recorder();
    vad.start(events);
    await windows(vad, 5);
    expect(log).toEqual(['confirmed']);
    await windows(vad, 19);
    expect(log).toEqual(['confirmed']);
    // A window between the thresholds neither extends nor ends the speech.
    await windows(vad, 1);
    expect(log).toEqual(['confirmed']);
    await windows(vad, 1);
    expect(log).toEqual(['confirmed', 'ended']);
  });

  it('discards speech that was never confirmed', async () => {
    const vad = await open();
    script([0.9, 0.9, 0.9, ...Array(20).fill(0.05)]);
    const { log, events } = recorder();
    vad.start(events);
    await windows(vad, 23);
    expect(log).toEqual([]);
  });

  it('buffers partial windows until a full window is available', async () => {
    const vad = await open();
    const infer = script([0.9]);
    vad.start(recorder().events);
    vad.push(new Float32Array(SILERO_WINDOW_SAMPLES - 1));
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(infer).not.toHaveBeenCalled();
    vad.push(new Float32Array(1));
    await vi.waitFor(() => expect(infer).toHaveBeenCalledOnce());
  });

  it('stops reporting after reset or before start', async () => {
    const vad = await open();
    script(Array(10).fill(0.9));
    const { log, events } = recorder();
    await windows(vad, 5);
    vad.start(events);
    vad.push(new Float32Array(5 * SILERO_WINDOW_SAMPLES));
    vad.reset();
    await new Promise(resolve => setTimeout(resolve, 20));
    expect(log).toEqual([]);
  });

  it('reports an inference failure once and resets', async () => {
    const vad = await open();
    const failure = new Error('onnx failed');
    vi.spyOn(SileroVad.prototype as unknown as { infer(frame: Float32Array): Promise<number> }, 'infer')
      .mockRejectedValue(failure);
    const failed = vi.fn();
    vad.start({ confirmed() {}, ended() {}, failed });
    await windows(vad, 3);
    expect(failed).toHaveBeenCalledExactlyOnceWith(failure);
  });

  it('releases the model once and ignores audio after close', async () => {
    const vad = await SileroVad.open();
    const infer = script([0.9]);
    vad.start(recorder().events);
    const closed = vad.close();
    expect(vad.close()).toBe(closed);
    await closed;
    vad.push(new Float32Array(SILERO_WINDOW_SAMPLES));
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(infer).not.toHaveBeenCalled();
  });
});
