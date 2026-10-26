# Elements

### Lessico del satellite vocale

Termini propri del satellite vocale: il dispositivo, la sua configurazione, la wake word e il ciclo locale di attivazione e ascolto. I termini condivisi con il resto del prodotto, come satellite vocale, interazione vocale, turno vocale, risposta parlata e backend, appartengono al «Lessico Ambrogio» di `ambrogio-model`.

#### Metadata
  * type: concept-scheme
  * concept_base: https://github.com/ambrogio-app/ambrogio-satellite/concepts
  * concept_prefix: satellite
---

### Attivazione locale

Riconoscimento della wake word sul satellite che avvia il tentativo di aprire una nuova interazione vocale.

#### Metadata
  * type: concept

#### Relations
  * derivedFrom: [Lessico del satellite vocale](#lessico-del-satellite-vocale)
  * related: [Interazione vocale](../../../ambrogio-model/system-model/Thesaurus/Lessico.md#interazione-vocale)
  * related: [Riserva audio](#riserva-audio)
---

### Configurazione del satellite

Dati scelti dall'installatore, come variabili d'ambiente del processo, per individuare il backend, i dispositivi audio e il modello di wake word usati dal processo satellite.

#### Metadata
  * type: concept

#### Relations
  * derivedFrom: [Lessico del satellite vocale](#lessico-del-satellite-vocale)
  * related: [Backend](../../../ambrogio-model/system-model/Thesaurus/Lessico.md#backend)
  * related: [Dispositivo audio](#dispositivo-audio)
---

### Dispositivo audio

Periferica usata dal satellite per acquisire la voce oppure riprodurre l'audio verso la famiglia.

#### Metadata
  * type: concept

#### Relations
  * derivedFrom: [Lessico del satellite vocale](#lessico-del-satellite-vocale)
---

### Modello di wake word

Modello di keyword spotting, distribuito con il satellite o montato dall'installazione, con cui il rilevatore locale riconosce la wake word indicata come testo nella configurazione.

#### Metadata
  * type: concept

#### Relations
  * derivedFrom: [Lessico del satellite vocale](#lessico-del-satellite-vocale)
---

### Rilevamento dell'attività vocale

Individuazione locale dei tratti di parlato e delle pause che delimitano un turno vocale. È distinta dal riconoscimento della wake word, che avvia l'interazione quando il satellite è in attesa.

#### Labels
  * altLabel: VAD

#### Metadata
  * type: concept

#### Relations
  * derivedFrom: [Lessico del satellite vocale](#lessico-del-satellite-vocale)
  * related: [Turno vocale](../../../ambrogio-model/system-model/Thesaurus/Lessico.md#turno-vocale)
---

### Riserva audio

Porzione temporanea di audio conservata in memoria dal satellite durante il riconoscimento e l'avvio dell'interazione, utile quando la richiesta segue immediatamente la wake word.

#### Metadata
  * type: concept

#### Relations
  * derivedFrom: [Lessico del satellite vocale](#lessico-del-satellite-vocale)
---

### Wake word

Espressione pronunciata dalla famiglia che permette di attivare il satellite quando questo attende una nuova interazione.

#### Metadata
  * type: concept

#### Relations
  * derivedFrom: [Lessico del satellite vocale](#lessico-del-satellite-vocale)
  * related: [Modello di wake word](#modello-di-wake-word)
---
