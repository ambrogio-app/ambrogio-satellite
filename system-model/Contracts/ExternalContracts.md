# Elements

### Modelli openWakeWord distribuiti

Fonte: la release v0.5.1 di openWakeWord, https://github.com/dscripka/openWakeWord/releases/tag/v0.5.1 , di David Scripka e collaboratori. Il satellite distribuisce in `models/wakeword/` i file seguenti di quella release, copiati senza modifiche:

| File | Uso | SHA-256 |
|---|---|---|
| `hey_jarvis_v0.1.onnx` | Classificatore della wake word `hey_jarvis` | `94a13cfe60075b132f6a472e7e462e8123ee70861bc3fb58434a73712ee0d2cb` |
| `hey_mycroft_v0.1.onnx` | Classificatore della wake word `hey_mycroft` | `c2a311e8fa1338de89c31b3b46dc4dffd4af2f9a8d6ddead48893c2d301b1f18` |
| `alexa_v0.1.onnx` | Classificatore della wake word `alexa` | `6ff566a01d12670e8d9e3c59da32651db1575d17272a601b7f8a39283dfbae3e` |
| `melspectrogram.onnx` | Spettrogramma mel comune a tutti i classificatori | `ba2b0e0f8b7b875369a2c89cb13360ff53bac436f2895cced9f479fa65eb176f` |
| `embedding_model.onnx` | Modello di embedding comune a tutti i classificatori | `70d164290c1d095d1d4ee149bc5e00543250a7316b59f31d056cff7bd3075c1f` |

Licenza: i modelli preaddestrati di openWakeWord sono rilasciati con licenza CC BY-NC-SA 4.0, per il solo uso non commerciale, separata dalla licenza Apache-2.0 del codice di openWakeWord e dalla licenza MIT del satellite; il testo della licenza accompagna i file in `models/wakeword/LICENSE-CC-BY-NC-SA-4.0.txt`. Fonte della licenza: https://github.com/dscripka/openWakeWord#license .

Fonti dell'informazione: gli asset della release v0.5.1, le cui impronte coincidono con quelle della tabella, e `models/wakeword/README.md` del satellite.

Prova d'integrazione: «Prova dei modelli openWakeWord registrati» confronta le impronte dei file distribuiti con questa tabella e con `models/wakeword/README.md` e carica ogni classificatore con i file comuni nella pipeline ONNX del satellite; «Prova software delle immagini del satellite» ne ripete il caricamento in ogni immagine; «Dimostrazione della attivazione locale» li prova con un microfono reale.

Il modello Silero VAD non è registrato qui: è il file `models/silero_vad.onnx` del pacchetto npm `decibri`, governato dalla versione esatta del pacchetto nel lockfile.

#### Metadata
  * type: source

#### Relations
  * define: [Condizioni di distribuzione dei modelli wake word](../Requirements/VoiceSatellite.md#condizioni-di-distribuzione-dei-modelli-wake-word)
---
