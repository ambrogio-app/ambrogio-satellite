# Elements

### Lessico del satellite vocale

Vocabolario autonomo dei termini che descrivono il dispositivo satellite, il suo ciclo di interazione e il confine con il backend. Le definizioni sono leggibili senza consultare il modello del backend.

#### Metadata
  * type: concept-scheme
  * concept_base: https://github.com/adrianofoschi/ambrogio-satellite/concepts
  * concept_prefix: satellite
---

### Attivazione locale

Riconoscimento della wake word sul satellite che avvia il tentativo di aprire una nuova interazione vocale.

#### Metadata
  * type: concept

#### Relations
  * derivedFrom: [Lessico del satellite vocale](#lessico-del-satellite-vocale)
  * related: [Interazione vocale](#interazione-vocale)
  * related: [Riserva audio](#riserva-audio)
---

### Backend vocale

Sistema esterno al satellite che gestisce la conversazione e il canale vocale pubblico, producendo risposte e segnali di controllo per l'interazione.

#### Metadata
  * type: concept

#### Relations
  * derivedFrom: [Lessico del satellite vocale](#lessico-del-satellite-vocale)
---

### Catalogo delle wake word

Insieme dei modelli di wake word supportati e distribuiti dal progetto, tra cui la configurazione può scegliere.

#### Metadata
  * type: concept

#### Relations
  * derivedFrom: [Lessico del satellite vocale](#lessico-del-satellite-vocale)
---

### Configurazione del satellite

Dati scelti dall'installatore per individuare il backend, i dispositivi audio e il modello di wake word usati dal processo satellite.

#### Metadata
  * type: concept

#### Relations
  * derivedFrom: [Lessico del satellite vocale](#lessico-del-satellite-vocale)
  * related: [Dispositivo audio](#dispositivo-audio)
---

### Dispositivo audio

Periferica usata dal satellite per acquisire la voce oppure riprodurre l'audio verso la famiglia.

#### Metadata
  * type: concept

#### Relations
  * derivedFrom: [Lessico del satellite vocale](#lessico-del-satellite-vocale)
---

### Indicazione di replica attesa

Segnale booleano fornito dal backend con una risposta che stabilisce se, dopo la riproduzione, la famiglia può formulare un altro turno nella stessa interazione senza wake word.

#### Metadata
  * type: concept

#### Relations
  * derivedFrom: [Lessico del satellite vocale](#lessico-del-satellite-vocale)
---

### Interazione vocale

Sessione temporanea tra satellite e backend che può contenere più turni consecutivi della famiglia senza ripetere la wake word.

#### Metadata
  * type: concept

#### Relations
  * derivedFrom: [Lessico del satellite vocale](#lessico-del-satellite-vocale)
  * related: [Turno vocale](#turno-vocale)
---

### Modello di wake word

Risorsa distribuita con il satellite che permette al rilevatore locale di riconoscere una specifica wake word.

#### Metadata
  * type: concept

#### Relations
  * derivedFrom: [Lessico del satellite vocale](#lessico-del-satellite-vocale)
  * related: [Catalogo delle wake word](#catalogo-delle-wake-word)
---

### Rilevamento dell'attività vocale

Individuazione locale dei tratti di parlato e delle pause che delimitano un turno vocale. È distinta dal riconoscimento della wake word, che avvia l'interazione quando il satellite è in attesa.

#### Labels
  * altLabel: VAD

#### Metadata
  * type: concept

#### Relations
  * derivedFrom: [Lessico del satellite vocale](#lessico-del-satellite-vocale)
  * related: [Turno vocale](#turno-vocale)
---

### Riserva audio

Porzione temporanea di audio conservata in memoria dal satellite durante il riconoscimento e l'avvio dell'interazione, utile quando la richiesta segue immediatamente la wake word.

#### Metadata
  * type: concept

#### Relations
  * derivedFrom: [Lessico del satellite vocale](#lessico-del-satellite-vocale)
---

### Risposta parlata

Audio prodotto per comunicare alla famiglia l'esito di un turno vocale; termina quando la riproduzione sul satellite è conclusa.

#### Metadata
  * type: concept

#### Relations
  * derivedFrom: [Lessico del satellite vocale](#lessico-del-satellite-vocale)
  * related: [Indicazione di replica attesa](#indicazione-di-replica-attesa)
---

### Satellite vocale

Processo eseguito su un dispositivo Linux che acquisisce e riproduce audio, riconosce localmente una wake word e comunica con il backend vocale.

#### Metadata
  * type: concept

#### Relations
  * derivedFrom: [Lessico del satellite vocale](#lessico-del-satellite-vocale)
---

### Turno vocale

Richiesta pronunciata dalla famiglia durante un'interazione vocale e inviata al backend come unità di elaborazione.

#### Metadata
  * type: concept

#### Relations
  * derivedFrom: [Lessico del satellite vocale](#lessico-del-satellite-vocale)
  * related: [Risposta parlata](#risposta-parlata)
---

### Wake word

Espressione pronunciata dalla famiglia che permette di attivare il satellite quando questo attende una nuova interazione.

#### Metadata
  * type: concept

#### Relations
  * derivedFrom: [Lessico del satellite vocale](#lessico-del-satellite-vocale)
  * related: [Modello di wake word](#modello-di-wake-word)
---
