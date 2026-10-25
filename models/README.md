# Speech models

The satellite runs these models with [sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx) through `sherpa-onnx-node`. The files are copied unchanged from the sherpa-onnx releases below. The model licenses are separate from the MIT license of the satellite source code.

| File | Source | SHA-256 |
| --- | --- | --- |
| `kws/encoder-epoch-12-avg-2-chunk-16-left-64.int8.onnx` | `sherpa-onnx-kws-zipformer-gigaspeech-3.3M-2024-01-01.tar.bz2`, release [`kws-models`](https://github.com/k2-fsa/sherpa-onnx/releases/tag/kws-models) | `1e721676515bcd42a186979733981213c66c80db680e1cc582dfedf3be76e678` |
| `kws/decoder-epoch-12-avg-2-chunk-16-left-64.int8.onnx` | same archive | `e40ff43297abe815e8898494c17e71bba2152d9d40fa3eb803f75d0f7533329a` |
| `kws/joiner-epoch-12-avg-2-chunk-16-left-64.int8.onnx` | same archive | `eae9da0c7e1e6c6a3f4cc42d167899c388f6c6701b94cb96320e4f55df79624c` |
| `kws/tokens.txt` | same archive | `fd2ded4050a55d2b1578870ba8697d02371980217806b7558bd0a5cc60f3ba53` |
| `kws/bpe.model` | same archive | `c8a2a0129c4ab8e463164c142f82d25649661b122c8cd0b7aab5c9e80b90ad24` |
| `vad/silero_vad.onnx` | `silero_vad.onnx`, release [`asr-models`](https://github.com/k2-fsa/sherpa-onnx/releases/tag/asr-models) | `9e2449e1087496d8d4caba907f23e0bd3f78d91fa552479bb9c23ac09cbb1fd6` |

The keyword spotting archive has SHA-256 `f170013b4716e41b62b9bfd809687c207cef798ef9bc6534d524e17af9b6561a`. It contains a zipformer transducer of about 3.3 million parameters trained on GigaSpeech, English speech, with SentencePiece units; only the int8 encoder, decoder and joiner are distributed here. It is released under the Apache License 2.0, declared in the `README.md` of the archive; the license text is in [kws/LICENSE](kws/LICENSE). See the [keyword spotting models](https://k2-fsa.github.io/sherpa/onnx/kws/pretrained_models/index.html).

Silero VAD is released by Silero Team under the [MIT license](https://github.com/snakers4/silero-vad/blob/master/LICENSE); the license text is in [vad/LICENSE](vad/LICENSE). Source: [snakers4/silero-vad](https://github.com/snakers4/silero-vad).

The Docker image copies this directory to `/app/models`. A read-only mount at `/app/models/kws` replaces the keyword spotting model with another sherpa-onnx keyword spotting transducer with a SentencePiece vocabulary: the directory needs exactly one `encoder*.onnx`, one `decoder*.onnx` and one `joiner*.onnx`, plus `tokens.txt` and `bpe.model`. Record provenance and license for a mounted model separately.
