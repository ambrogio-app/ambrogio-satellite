# Local notices

`backend-unavailable.wav` is PCM16 mono, 16 kHz. It says: “Non riesco a contattare Ambrogio. Riprova tra poco.” The satellite plays it when a voice interaction fails, including when the backend cannot be reached.

The file was generated with the [Piper Riccardo x_low voice](https://huggingface.co/rhasspy/piper-voices/blob/main/it/it_IT/riccardo/x_low/MODEL_CARD), from the local model `it_IT-riccardo-x_low.onnx`. The [Piper voices repository](https://huggingface.co/rhasspy/piper-voices) identifies its license as MIT. The TTS model is not included in this repository or the satellite image.

SHA-256: `3e3dbedc845dae063bd4a93bb863ccd9452647de6512178830d6415e51859b88`.

`voice-unavailable.wav` is PCM16 mono, 16 kHz. It says: “La voce non è disponibile.” The satellite plays it when the backend answers a turn only in text, which happens when voice is not enabled on the backend. It was generated on 17 October 2026 with the same Piper Riccardo x_low voice (`it_IT-riccardo-x_low.onnx`) and the Piper binary of the backend image; the same license notes apply.

SHA-256: `b729c18df502215a5c2cca6c65cf2e1c02e2e7cff9a71930a146f61b511c3087`.
