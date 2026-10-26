# Elements

### Modelli sherpa-onnx distribuiti con il satellite

Fonte: le release `kws-models` e `asr-models` di k2-fsa/sherpa-onnx, https://github.com/k2-fsa/sherpa-onnx/releases/tag/kws-models e https://github.com/k2-fsa/sherpa-onnx/releases/tag/asr-models . Le due release non hanno versioni: ogni archivio e ogni file sono identificati dal nome e dall'impronta SHA-256. Il satellite distribuisce in `models/` i file seguenti, copiati senza modifiche:

| File | Uso | Origine | SHA-256 |
|---|---|---|---|
| `kws/encoder-epoch-12-avg-2-chunk-16-left-64.int8.onnx` | Encoder del keyword spotting | archivio `sherpa-onnx-kws-zipformer-gigaspeech-3.3M-2024-01-01.tar.bz2` della release `kws-models` | `1e721676515bcd42a186979733981213c66c80db680e1cc582dfedf3be76e678` |
| `kws/decoder-epoch-12-avg-2-chunk-16-left-64.int8.onnx` | Decoder del keyword spotting | stesso archivio | `e40ff43297abe815e8898494c17e71bba2152d9d40fa3eb803f75d0f7533329a` |
| `kws/joiner-epoch-12-avg-2-chunk-16-left-64.int8.onnx` | Joiner del keyword spotting | stesso archivio | `eae9da0c7e1e6c6a3f4cc42d167899c388f6c6701b94cb96320e4f55df79624c` |
| `kws/tokens.txt` | Token del keyword spotting | stesso archivio | `fd2ded4050a55d2b1578870ba8697d02371980217806b7558bd0a5cc60f3ba53` |
| `kws/bpe.model` | Vocabolario SentencePiece per la scomposizione della wake word | stesso archivio | `c8a2a0129c4ab8e463164c142f82d25649661b122c8cd0b7aab5c9e80b90ad24` |
| `vad/silero_vad.onnx` | Rilevatore Silero dell'attività vocale | file `silero_vad.onnx` della release `asr-models` | `9e2449e1087496d8d4caba907f23e0bd3f78d91fa552479bb9c23ac09cbb1fd6` |

L'archivio del keyword spotting ha impronta SHA-256 `f170013b4716e41b62b9bfd809687c207cef798ef9bc6534d524e17af9b6561a`; contiene un transducer zipformer di circa 3,3 milioni di parametri addestrato su GigaSpeech, parlato inglese, con unità SentencePiece unigram. Il satellite ne distribuisce soltanto le varianti int8 di encoder, decoder e joiner.

Licenze: il modello di keyword spotting è rilasciato con licenza Apache-2.0, dichiarata nel `README.md` dell'archivio; il modello Silero VAD è rilasciato da Silero Team con licenza MIT, https://github.com/snakers4/silero-vad/blob/master/LICENSE . Le licenze dei modelli sono separate dalla licenza MIT del codice del satellite; i testi accompagnano i file in `models/kws/LICENSE` e `models/vad/LICENSE`.

Fonti dell'informazione: gli asset delle due release, le cui impronte coincidono con quelle della tabella, la documentazione dei modelli di keyword spotting, https://k2-fsa.github.io/sherpa/onnx/kws/pretrained_models/index.html , e `models/README.md` del satellite.

Prova d'integrazione: «Prova dei modelli sherpa-onnx registrati» confronta le impronte dei file distribuiti con questa tabella e con `models/README.md` e carica i modelli con `sherpa-onnx-node`; «Prova software delle immagini del satellite» ne ripete il caricamento in ogni immagine; «Dimostrazione della attivazione locale» e «Dimostrazione della segmentazione vocale» li provano con un microfono reale.

#### Metadata
  * type: source

#### Relations
  * define: [Condizioni di distribuzione dei modelli vocali del satellite](../Requirements/VoiceSatellite.md#condizioni-di-distribuzione-dei-modelli-vocali-del-satellite)
---
