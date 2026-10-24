# Elements

### Arresto immediato del processo satellite

Quando riceve SIGINT o SIGTERM, il satellite deve impedire nuove attivazioni e interrompere l'interazione e la riproduzione correnti senza attendere la risposta completa.

#### Details
Origine: baseline Reqvire «Interruption of active operations on shutdown», adottata; «New work refused on shutdown», adottata.

#### Metadata
  * type: requirement

#### Contract References
  * [Ciclo di arresto e rilascio delle risorse](../Contracts/VoiceSatellite.md#ciclo-di-arresto-e-rilascio-delle-risorse)

#### Relations
  * satisfiedBy: [satellite.ts](../../src/composition/satellite.ts)
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Ascolto locale della wake word

Mentre attende una nuova interazione, il satellite deve acquisire continuamente il segnale del microfono e riconoscere la wake word esclusivamente in locale.

#### Concept References
  * [Wake word](../Thesaurus/Lessico.md#wake-word)
  * [Attivazione locale](../Thesaurus/Lessico.md#attivazione-locale)
  * [Dispositivo audio](../Thesaurus/Lessico.md#dispositivo-audio)

#### Metadata
  * type: requirement

#### Contract References
  * [Adapter audio con Decibri](../Contracts/VoiceSatellite.md#adapter-audio-con-decibri)
  * [Configurazione del processo satellite](../Contracts/VoiceSatellite.md#configurazione-del-processo-satellite)

#### Relations
  * satisfiedBy: [satellite.ts](../../src/composition/satellite.ts)
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Assemblaggio delle risorse nella composition root

Il satellite deve assemblare le porte e le risorse tecniche nella composition root del processo.

#### Details
Origine: baseline Reqvire «Explicit wiring without service locator», adottata.

#### Metadata
  * type: requirement

#### Relations
  * derivedFrom: [Capacità dell'ambiente fornite dalla composition root](../../../ambrogio-model/system-model/Requirements/CodeArchitecture.md#capacità-dellambiente-fornite-dalla-composition-root)
  * satisfiedBy: [satellite.ts](../../src/composition/satellite.ts)
  * specify: [Architettura del codice](../../../ambrogio-model/system-model/Capabilities/Engineering.md#architettura-del-codice)
---

### Assenza di logger nei layer interni

Domain e casi d’uso Application del satellite devono restare indipendenti dal logger.

#### Details
Origine: baseline Reqvire «Diagnostics of unexpected failures in technical components», adottata.

#### Metadata
  * type: requirement

#### Relations
  * derivedFrom: [Domain e casi d'uso senza logger](../../../ambrogio-model/system-model/Requirements/CodeArchitecture.md#domain-e-casi-duso-senza-logger)
  * satisfiedBy: [voice-session.use-case.ts](../../src/application/voice-session.use-case.ts)
  * specify: [Architettura del codice](../../../ambrogio-model/system-model/Capabilities/Engineering.md#architettura-del-codice)
---

### Assenza di registrazioni audio persistenti

Il satellite non deve conservare su memoria persistente l’audio acquisito dalle persone o ricevuto come risposta durante le interazioni.

#### Metadata
  * type: requirement

#### Relations
  * satisfiedBy: [satellite.ts](../../src/composition/satellite.ts)
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Attenuazione dell'audio locale durante l'interazione

Dove la configurazione indica un controllo di attenuazione, quando riconosce la wake word il satellite deve portare quel controllo al livello configurato prima del segnale acustico di disponibilità e riportarlo al livello pieno quando torna in attesa della wake word, qualunque sia la conclusione dell'interazione.

#### Details
L'interazione comprende le repliche richieste dal backend: l'attenuazione resta attiva finché il satellite non torna in attesa della wake word, dopo la risposta, per inattività, dopo un fallimento o per la perdita della sessione durante l'interazione. Il controllo attenua soltanto gli altri flussi audio locali che lo attraversano, come un player musicale; la voce del satellite non lo attraversa.

#### Concept References
  * [Interazione vocale](../../../ambrogio-model/system-model/Thesaurus/Lessico.md#interazione-vocale)
  * [Dispositivo audio](../Thesaurus/Lessico.md#dispositivo-audio)

#### Metadata
  * type: requirement

#### Relations
  * satisfiedBy: [local-attenuation.ts](../../src/application/local-attenuation.ts)
  * satisfiedBy: [voice-session.use-case.ts](../../src/application/voice-session.use-case.ts)
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Attesa della fine della risposta

Mentre riproduce la risposta di Ambrogio, il satellite deve impedire interruzioni vocali e nuovi turni, e deve considerare conclusa la risposta soltanto quando ha ricevuto l'esito del turno e ha riprodotto tutti i campioni delle trasmissioni del turno chiuse da `output.end`. La riapertura della replica o il ritorno alla wake word avvengono soltanto dopo questa conclusione. Se l'esito non arriva entro 60 secondi dalla fine della richiesta, il satellite conclude l'interazione con il recupero locale.

#### Details
Origine: baseline Reqvire «Time limit with cancellation of remote work», adottata.

#### Metadata
  * type: requirement

#### Contract References
  * [Esiti del turno nel protocollo Ambrogio v1](../../../ambrogio-backend/system-model/Contracts/ConversationProtocol.md#esiti-del-turno-nel-protocollo-ambrogio-v1)
  * [Adapter audio con Decibri](../Contracts/VoiceSatellite.md#adapter-audio-con-decibri)
  * [Regole della replica vocale](../Contracts/VoiceSatellite.md#regole-della-replica-vocale)

#### Relations
  * derivedFrom: [Riconoscimento dell'esito riuscito del turno da parte del client](../../../ambrogio-backend/system-model/Requirements/ConversationProtocol.md#riconoscimento-dellesito-riuscito-del-turno-da-parte-del-client)
  * satisfiedBy: [conversation-events.adapter.ts](../../src/adapters/in/conversation-events.adapter.ts)
  * satisfiedBy: [response-playback.ts](../../src/adapters/out/response-playback.ts)
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Audit delle dipendenze nella CI del satellite

Quando la CI del satellite controlla una modifica, il job `Satellite checks` deve eseguire l'audit delle dipendenze del satellite subito dopo la loro installazione congelata e deve fallire se trova un avviso di gravità alta o critica non elencato fra le eccezioni accettate.

#### Details
Il satellite non ha eccezioni accettate: `pnpm-workspace.yaml` non dichiara `auditConfig`.

#### Metadata
  * type: requirement

#### Contract References
  * [Audit delle dipendenze con pnpm](../../../ambrogio-model/system-model/Contracts/ModelDrivenDevelopment.md#audit-delle-dipendenze-con-pnpm)

#### Relations
  * derivedFrom: [Audit delle vulnerabilità delle dipendenze](../../../ambrogio-model/system-model/Requirements/ModelDrivenDevelopment.md#audit-delle-vulnerabilità-delle-dipendenze)
  * satisfiedBy: [ci.yml](../../.github/workflows/ci.yml)
  * satisfiedBy: [pnpm-workspace.yaml](../../pnpm-workspace.yaml)
  * specify: [Sviluppo governato dal modello](../../../ambrogio-model/system-model/Capabilities/Engineering.md#sviluppo-governato-dal-modello)
---

### Avvio dopo la wake word

Quando riconosce la wake word mentre attende una nuova interazione, il satellite deve avviare una nuova interazione sulla sessione conversazionale pubblica del backend, riaprendo la sessione se non è pronta.

#### Concept References
  * [Attivazione locale](../Thesaurus/Lessico.md#attivazione-locale)
  * [Interazione vocale](../../../ambrogio-model/system-model/Thesaurus/Lessico.md#interazione-vocale)
  * [Backend](../../../ambrogio-model/system-model/Thesaurus/Lessico.md#backend)

#### Metadata
  * type: requirement

#### Contract References
  * [Sessione del protocollo Ambrogio v1](../../../ambrogio-backend/system-model/Contracts/ConversationProtocol.md#sessione-del-protocollo-ambrogio-v1)
  * [Trasmissione in ingresso del protocollo Ambrogio v1](../../../ambrogio-backend/system-model/Contracts/ConversationProtocol.md#trasmissione-in-ingresso-del-protocollo-ambrogio-v1)
  * [Trasporto conversazionale ambrogio.v1](../Contracts/VoiceSatellite.md#trasporto-conversazionale-ambrogiov1)

#### Relations
  * satisfiedBy: [voice-session.use-case.ts](../../src/application/voice-session.use-case.ts)
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Catalogo distribuito delle wake word

Il satellite deve mettere a disposizione modelli di wake word distribuiti e supportati per le frasi «Hey Jarvis», «Hey Mycroft» e «Alexa», con «Hey Jarvis» come scelta predefinita. La configurazione seleziona una sola wake word alla volta.

#### Concept References
  * [Catalogo delle wake word](../Thesaurus/Lessico.md#catalogo-delle-wake-word)
  * [Modello di wake word](../Thesaurus/Lessico.md#modello-di-wake-word)

#### Metadata
  * type: requirement

#### Relations
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Comando di verifica completo del satellite

Il satellite deve offrire il comando `pnpm verify`, che esegue in locale i controlli del job `Satellite checks` secondo «Comando di verifica completo con pnpm» e termina con esito non riuscito al primo controllo fallito.

#### Details
I comandi successivi all'installazione e all'audit, nell'ordine del job della CI, sono `pnpm typecheck`, `pnpm test`, `pnpm build` e `pnpm test:backend`; prima di essi `pnpm verify` prepara il backend affiancato con `pnpm install --frozen-lockfile` e `pnpm build` in `../ambrogio-backend`.

#### Metadata
  * type: requirement

#### Contract References
  * [Comando di verifica completo con pnpm](../../../ambrogio-model/system-model/Contracts/ModelDrivenDevelopment.md#comando-di-verifica-completo-con-pnpm)
  * [Profilo CI del satellite](../Contracts/VoiceSatellite.md#profilo-ci-del-satellite)

#### Relations
  * derivedFrom: [Comando di verifica completo](../../../ambrogio-model/system-model/Requirements/ModelDrivenDevelopment.md#comando-di-verifica-completo)
  * satisfiedBy: [package.json](../../package.json)
  * specify: [Sviluppo governato dal modello](../../../ambrogio-model/system-model/Capabilities/Engineering.md#sviluppo-governato-dal-modello)
---

### Condizioni di distribuzione dei modelli wake word

Il satellite deve distribuire nel proprio catalogo soltanto modelli wake word la cui redistribuzione per l'uso non commerciale previsto è consentita, accompagnando ciascun modello con fonte, licenza e attribuzioni richieste. La licenza dei modelli deve essere indicata separatamente da quella del codice del satellite.

#### Concept References
  * [Catalogo delle wake word](../Thesaurus/Lessico.md#catalogo-delle-wake-word)
  * [Modello di wake word](../Thesaurus/Lessico.md#modello-di-wake-word)

#### Metadata
  * type: requirement

#### Relations
  * satisfiedBy: [README.md](../../models/wakeword/README.md)
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Conferma della wake word su blocchi consecutivi

Quando il punteggio di riconoscimento della wake word raggiunge la soglia configurata, il satellite deve avviare l'attivazione locale soltanto se la soglia è stata raggiunta nel numero configurato di blocchi audio consecutivi.

#### Concept References
  * [Wake word](../Thesaurus/Lessico.md#wake-word)
  * [Attivazione locale](../Thesaurus/Lessico.md#attivazione-locale)

#### Metadata
  * type: requirement

#### Contract References
  * [Configurazione del processo satellite](../Contracts/VoiceSatellite.md#configurazione-del-processo-satellite)
  * [Motore locale della wake word con ONNX](../Contracts/VoiceSatellite.md#motore-locale-della-wake-word-con-onnx)

#### Relations
  * satisfiedBy: [configuration.ts](../../src/adapters/out/configuration.ts)
  * satisfiedBy: [onnx-wake-word.ts](../../src/adapters/out/onnx-wake-word.ts)
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Configurazione TypeScript unica

Il satellite deve caricare da un modulo TypeScript la configurazione del backend, dell'identità del client, dei dispositivi audio, della wake word e dell'intervallo locale di inattività, usando gli stessi significati sull'host e nel container.

#### Concept References
  * [Configurazione del satellite](../Thesaurus/Lessico.md#configurazione-del-satellite)
  * [Dispositivo audio](../Thesaurus/Lessico.md#dispositivo-audio)
  * [Modello di wake word](../Thesaurus/Lessico.md#modello-di-wake-word)

#### Metadata
  * type: requirement

#### Contract References
  * [Adapter audio con Decibri](../Contracts/VoiceSatellite.md#adapter-audio-con-decibri)
  * [Attenuazione locale con softvol e amixer](../Contracts/VoiceSatellite.md#attenuazione-locale-con-softvol-e-amixer)
  * [Catalogo e selezione dei modelli](../Contracts/VoiceSatellite.md#catalogo-e-selezione-dei-modelli)
  * [Identità del satellite nella sessione](../Contracts/VoiceSatellite.md#identità-del-satellite-nella-sessione)

#### Relations
  * satisfiedBy: [config-file.ts](../../src/adapters/out/config-file.ts)
  * satisfiedBy: [configuration.ts](../../src/adapters/out/configuration.ts)
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Confini degli import nei test

I test del satellite devono rispettare le regole comuni di import per layer secondo le esclusioni del contratto «Regole di importazione dei test».

#### Metadata
  * type: requirement

#### Relations
  * derivedFrom: [Import del codice di produzione nei test per layer](../../../ambrogio-model/system-model/Requirements/CodeArchitecture.md#import-del-codice-di-produzione-nei-test-per-layer)
  * satisfiedBy: [voice-session.test.ts](../../test/application/voice-session.test.ts)
  * satisfiedBy: [voice-turn.test.ts](../../test/domain/voice-turn.test.ts)
  * specify: [Architettura del codice](../../../ambrogio-model/system-model/Capabilities/Engineering.md#architettura-del-codice)
---

### Conservazione della causa dei guasti

Quando aggiunge contesto a un guasto inatteso, il satellite deve conservare l’errore originale nella catena delle cause.

#### Metadata
  * type: requirement

#### Relations
  * derivedFrom: [Guasti inattesi propagati come eccezioni](../../../ambrogio-model/system-model/Requirements/CodeArchitecture.md#guasti-inattesi-propagati-come-eccezioni)
  * satisfiedBy: [diagnostics.ts](../../src/adapters/out/diagnostics.ts)
  * specify: [Architettura del codice](../../../ambrogio-model/system-model/Capabilities/Engineering.md#architettura-del-codice)
---

### Conservazione della richiesta continua

Quando la famiglia pronuncia la wake word e la richiesta senza pausa, il satellite deve conservare temporaneamente in memoria il parlato necessario a non perdere l’inizio della richiesta durante il riconoscimento, il segnale di ascolto e la conferma del parlato, e trasmetterlo all'inizio della richiesta.

#### Concept References
  * [Riserva audio](../Thesaurus/Lessico.md#riserva-audio)
  * [Turno vocale](../../../ambrogio-model/system-model/Thesaurus/Lessico.md#turno-vocale)

#### Metadata
  * type: requirement

#### Relations
  * satisfiedBy: [satellite.ts](../../src/composition/satellite.ts)
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Contratti Application indipendenti dal Domain

Quando gli adapter interagiscono con i casi d'uso del satellite, devono usare dati di ingresso e stato osservabile definiti in Application, senza esporre tipi, oggetti o nomi degli stati interni del Domain attraverso il contratto pubblico del caso d'uso.

#### Metadata
  * type: requirement

#### Relations
  * definedBy: [Contratto osservabile della sessione vocale](../Contracts/VoiceSatellite.md#contratto-osservabile-della-sessione-vocale)
  * derivedFrom: [Contratti Application nei termini del componente](../../../ambrogio-model/system-model/Requirements/CodeArchitecture.md#contratti-application-nei-termini-del-componente)
  * satisfiedBy: [voice-session.use-case.ts](../../src/application/voice-session.use-case.ts)
  * specify: [Architettura del codice](../../../ambrogio-model/system-model/Capabilities/Engineering.md#architettura-del-codice)
---

### Controlli CI delle modifiche del satellite

Quando una modifica viene inviata al branch main o proposta tramite pull request, quando la CI viene avviata manualmente e quando un altro workflow la richiama, la CI del satellite deve eseguire, dopo il checkout affiancato dei repository del modello, i controlli dell'intero modello, l'installazione congelata delle dipendenze con pnpm attivato da Corepack, l'audit delle dipendenze, il controllo TypeScript completo e dei layer interni, la suite Vitest, la prova di integrazione con il backend affiancato e la build, segnalando il fallimento se uno dei controlli fallisce.

#### Metadata
  * type: requirement

#### Contract References
  * [Ingresso di prova del server conversazionale](../../../ambrogio-backend/system-model/Contracts/ServerFoundation.md#ingresso-di-prova-del-server-conversazionale)
  * [Audit delle dipendenze con pnpm](../../../ambrogio-model/system-model/Contracts/ModelDrivenDevelopment.md#audit-delle-dipendenze-con-pnpm)
  * [Checkout affiancato dello spazio di lavoro](../../../ambrogio-model/system-model/Contracts/ModelDrivenDevelopment.md#checkout-affiancato-dello-spazio-di-lavoro)
  * [Controlli del modello dello spazio di lavoro](../../../ambrogio-model/system-model/Contracts/ModelDrivenDevelopment.md#controlli-del-modello-dello-spazio-di-lavoro)
  * [Profilo di installazione con pnpm e Corepack](../../../ambrogio-model/system-model/Contracts/ModelDrivenDevelopment.md#profilo-di-installazione-con-pnpm-e-corepack)
  * [Profilo di scansione dei segreti con gitleaks](../../../ambrogio-model/system-model/Contracts/ModelDrivenDevelopment.md#profilo-di-scansione-dei-segreti-con-gitleaks)
  * [Risoluzione della versione di Reqvire](../../../ambrogio-model/system-model/Contracts/ModelDrivenDevelopment.md#risoluzione-della-versione-di-reqvire)
  * [Profilo della scansione dei segreti del satellite](../Contracts/VoiceSatellite.md#profilo-della-scansione-dei-segreti-del-satellite)
  * [Protezioni dei workflow GitHub Actions](../Contracts/VoiceSatellite.md#protezioni-dei-workflow-github-actions)

#### Relations
  * derivedFrom: [Controlli CI dei repository di Ambrogio](../../../ambrogio-model/system-model/Requirements/ModelDrivenDevelopment.md#controlli-ci-dei-repository-di-ambrogio)
  * satisfiedBy: [ci.yml](../../.github/workflows/ci.yml)
  * specify: [Sviluppo governato dal modello](../../../ambrogio-model/system-model/Capabilities/Engineering.md#sviluppo-governato-dal-modello)
---

### Controlli del modello prima del commit del satellite

Quando si crea un commit in un clone del satellite con l'hook versionato attivo, l'hook `.githooks/pre-commit` deve eseguire, dopo la scansione dei segreti, i controlli dell'intero modello con `scripts/model-checks` di `ambrogio-model` affiancato e deve impedire il commit se questi controlli falliscono o se `ambrogio-model` non è affiancato al repository.

#### Metadata
  * type: requirement

#### Contract References
  * [Controlli del modello dello spazio di lavoro](../../../ambrogio-model/system-model/Contracts/ModelDrivenDevelopment.md#controlli-del-modello-dello-spazio-di-lavoro)
  * [Controlli del modello nell'hook pre-commit](../../../ambrogio-model/system-model/Contracts/ModelDrivenDevelopment.md#controlli-del-modello-nellhook-pre-commit)

#### Relations
  * derivedFrom: [Controlli del modello prima del commit](../../../ambrogio-model/system-model/Requirements/ModelDrivenDevelopment.md#controlli-del-modello-prima-del-commit)
  * satisfiedBy: [pre-commit](../../.githooks/pre-commit)
  * specify: [Sviluppo governato dal modello](../../../ambrogio-model/system-model/Capabilities/Engineering.md#sviluppo-governato-dal-modello)
---

### Controlli obbligatori prima del merge del satellite

Quando una modifica viene integrata nel branch principale del repository del satellite, il ruleset del repository deve richiedere i controlli `Satellite checks` e `Secret scan`.

#### Metadata
  * type: requirement

#### Contract References
  * [Ruleset del branch principale](../../../ambrogio-model/system-model/Contracts/ModelDrivenDevelopment.md#ruleset-del-branch-principale)

#### Relations
  * derivedFrom: [Controlli obbligatori prima del merge](../../../ambrogio-model/system-model/Requirements/ModelDrivenDevelopment.md#controlli-obbligatori-prima-del-merge)
  * specify: [Sviluppo governato dal modello](../../../ambrogio-model/system-model/Capabilities/Engineering.md#sviluppo-governato-dal-modello)
---

### Controllo dei segreti prima del commit locale

Quando si crea un commit in un clone del satellite che ha abilitato l'hook versionato del repository, l'hook `.githooks/pre-commit` del satellite deve applicare il controllo comune dei segreti prima del commit secondo il contratto «Hook pre-commit dei segreti con gitleaks».

#### Metadata
  * type: requirement

#### Contract References
  * [Profilo di scansione dei segreti con gitleaks](../../../ambrogio-model/system-model/Contracts/ModelDrivenDevelopment.md#profilo-di-scansione-dei-segreti-con-gitleaks)

#### Relations
  * derivedFrom: [Controllo dei segreti prima del commit](../../../ambrogio-model/system-model/Requirements/ModelDrivenDevelopment.md#controllo-dei-segreti-prima-del-commit)
  * satisfiedBy: [pre-commit](../../.githooks/pre-commit)
  * specify: [Sviluppo governato dal modello](../../../ambrogio-model/system-model/Capabilities/Engineering.md#sviluppo-governato-dal-modello)
---

### Delimitazione locale dei turni vocali

Durante un'interazione vocale attiva, il satellite deve riconoscere localmente l'inizio e la fine del parlato della famiglia e consegnare al backend il turno risultante, preservando anche le risposte brevi e le richieste con pause interne.

#### Concept References
  * [Rilevamento dell'attività vocale](../Thesaurus/Lessico.md#rilevamento-dellattività-vocale)
  * [Turno vocale](../../../ambrogio-model/system-model/Thesaurus/Lessico.md#turno-vocale)

#### Metadata
  * type: requirement

#### Contract References
  * [Adapter audio con Decibri](../Contracts/VoiceSatellite.md#adapter-audio-con-decibri)

#### Relations
  * satisfiedBy: [satellite.ts](../../src/composition/satellite.ts)
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Distribuzione Docker facoltativa

Il satellite deve offrire una distribuzione Docker facoltativa per Linux x86_64 e arm64 che esegua la stessa applicazione con lo stesso contratto di configurazione dell’esecuzione diretta.

#### Details
Origine: baseline Reqvire «Server distributed as a container image», adottata.

#### Metadata
  * type: requirement

#### Contract References
  * [Adapter audio con Decibri](../Contracts/VoiceSatellite.md#adapter-audio-con-decibri)
  * [Attenuazione locale con softvol e amixer](../Contracts/VoiceSatellite.md#attenuazione-locale-con-softvol-e-amixer)
  * [Configurazione del processo satellite](../Contracts/VoiceSatellite.md#configurazione-del-processo-satellite)
  * [Profilo di installazione delle dipendenze del satellite](../Contracts/VoiceSatellite.md#profilo-di-installazione-delle-dipendenze-del-satellite)

#### Relations
  * satisfiedBy: [Dockerfile](../../Dockerfile)
  * satisfiedBy: [compose.example.yaml](../../compose.example.yaml)
  * satisfiedBy: [pnpm-workspace.yaml](../../pnpm-workspace.yaml)
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Distribuzione mirata della configurazione

La composition root del satellite deve fornire a ciascun componente soltanto i valori validati necessari, senza letture dirette della configurazione di processo da Domain e casi d’uso Application.

#### Metadata
  * type: requirement

#### Relations
  * derivedFrom: [Validazione della configurazione prima delle risorse](../../../ambrogio-model/system-model/Requirements/HomelabInstallation.md#validazione-della-configurazione-prima-delle-risorse)
  * satisfiedBy: [satellite.ts](../../src/composition/satellite.ts)
  * specify: [Installazione nell'homelab](../../../ambrogio-model/system-model/Capabilities/Engineering.md#installazione-nellhomelab)
---

### Esclusione delle configurazioni personali dagli artefatti

Il satellite deve escludere configurazioni personali e credenziali dagli artefatti distribuiti e dagli esempi di configurazione.

#### Metadata
  * type: requirement

#### Contract References
  * [Esecuzione host e container](../Contracts/VoiceSatellite.md#esecuzione-host-e-container)

#### Relations
  * derivedFrom: [Configurazioni effettive escluse dagli artefatti](../../../ambrogio-model/system-model/Requirements/HomelabInstallation.md#configurazioni-effettive-escluse-dagli-artefatti)
  * satisfiedBy: [.dockerignore](../../.dockerignore)
  * satisfiedBy: [.gitignore](../../.gitignore)
  * satisfiedBy: [Dockerfile](../../Dockerfile)
  * satisfiedBy: [config.example.ts](../../config.example.ts)
  * specify: [Installazione nell'homelab](../../../ambrogio-model/system-model/Capabilities/Engineering.md#installazione-nellhomelab)
---

### Esecuzione diretta sul sistema host

Il satellite deve essere installabile ed eseguibile direttamente sul sistema host con runtime, dipendenze e modelli necessari, senza richiedere Docker.

#### Metadata
  * type: requirement

#### Contract References
  * [Esecuzione host e container](../Contracts/VoiceSatellite.md#esecuzione-host-e-container)

#### Relations
  * satisfiedBy: [main.ts](../../src/main.ts)
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Esiti previsti come valori tipizzati nel satellite

Quando Domain, Application o una porta prevedono un esito negativo nel proprio contratto, il satellite deve rappresentarlo come valore tipizzato distinguibile dal successo.

#### Metadata
  * type: requirement

#### Relations
  * derivedFrom: [Esiti previsti come valori tipizzati](../../../ambrogio-model/system-model/Requirements/CodeArchitecture.md#esiti-previsti-come-valori-tipizzati)
  * satisfiedBy: [configuration.ts](../../src/adapters/out/configuration.ts)
  * specify: [Architettura del codice](../../../ambrogio-model/system-model/Capabilities/Engineering.md#architettura-del-codice)
---

### Eventi diagnostici stabili

Quando emette un log tecnico, il satellite deve includere un nome event stabile indipendente dai dati ricevuti.

#### Metadata
  * type: requirement

#### Relations
  * derivedFrom: [Log tecnici JSON con Pino](../../../ambrogio-model/system-model/Requirements/CodeArchitecture.md#log-tecnici-json-con-pino)
  * satisfiedBy: [diagnostics.ts](../../src/adapters/out/diagnostics.ts)
  * specify: [Architettura del codice](../../../ambrogio-model/system-model/Capabilities/Engineering.md#architettura-del-codice)
---

### Forma TypeScript dei contratti Application nel satellite

Quando Application del satellite dichiara una porta a oggetto, deve dichiararne le operazioni come proprietà callable `readonly`.

#### Metadata
  * type: requirement

#### Relations
  * definedBy: [Convenzione TypeScript di porte e dati](../Contracts/VoiceSatellite.md#convenzione-typescript-di-porte-e-dati)
  * derivedFrom: [Forma TypeScript dei contratti Application](../../../ambrogio-model/system-model/Requirements/CodeArchitecture.md#forma-typescript-dei-contratti-application)
  * satisfiedBy: [deadline-scheduler.ts](../../src/application/deadline-scheduler.ts)
  * satisfiedBy: [voice-session.use-case.ts](../../src/application/voice-session.use-case.ts)
  * specify: [Architettura del codice](../../../ambrogio-model/system-model/Capabilities/Engineering.md#architettura-del-codice)
---

### Gestione dei guasti inattesi

Quando si verifica un guasto inatteso, il satellite deve propagarlo come eccezione fino al confine tecnico responsabile della gestione e della diagnostica.

#### Details
Origine: baseline Reqvire «Diagnostics of unexpected failures in technical components», adottata.

#### Metadata
  * type: requirement

#### Relations
  * derivedFrom: [Guasti inattesi propagati come eccezioni](../../../ambrogio-model/system-model/Requirements/CodeArchitecture.md#guasti-inattesi-propagati-come-eccezioni)
  * satisfiedBy: [voice-session.use-case.ts](../../src/application/voice-session.use-case.ts)
  * specify: [Architettura del codice](../../../ambrogio-model/system-model/Capabilities/Engineering.md#architettura-del-codice)
---

### Gestione dei log affidata al deployment

Quando l’installazione richiede conservazione, rotazione o inoltro dei log tecnici, tali funzioni devono essere gestite dal deployment; il satellite deve continuare a emettere su stdout senza integrare archivi o servizi di raccolta specifici.

#### Metadata
  * type: requirement

#### Relations
  * derivedFrom: [Log affidati al deployment](../../../ambrogio-model/system-model/Requirements/CodeArchitecture.md#log-affidati-al-deployment)
  * satisfiedBy: [diagnostics.ts](../../src/adapters/out/diagnostics.ts)
  * specify: [Architettura del codice](../../../ambrogio-model/system-model/Capabilities/Engineering.md#architettura-del-codice)
---

### Gestione esaustiva dei rifiuti previsti

I chiamanti delle porte e dei casi d’uso devono gestire esplicitamente tutte le varianti dei rifiuti previsti dai rispettivi contratti.

#### Metadata
  * type: requirement

#### Relations
  * derivedFrom: [Gestione esplicita dei rifiuti previsti](../../../ambrogio-model/system-model/Requirements/CodeArchitecture.md#gestione-esplicita-dei-rifiuti-previsti)
  * satisfiedBy: [main.ts](../../src/main.ts)
  * specify: [Architettura del codice](../../../ambrogio-model/system-model/Capabilities/Engineering.md#architettura-del-codice)
---

### Idempotenza dell'arresto del satellite

Quando riceve richieste ripetute o concorrenti di arresto, il satellite deve condividere la stessa operazione di arresto senza duplicare il rilascio delle risorse native.

#### Details
Origine: baseline Reqvire «Single ordered shutdown», adattata: le risorse indipendenti si chiudono in parallelo invece che in ordine inverso di acquisizione.

#### Metadata
  * type: requirement

#### Contract References
  * [Ciclo di arresto e rilascio delle risorse](../Contracts/VoiceSatellite.md#ciclo-di-arresto-e-rilascio-delle-risorse)

#### Relations
  * satisfiedBy: [satellite.ts](../../src/composition/satellite.ts)
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Identificazione del satellite nella sessione

Quando apre la sessione conversazionale con il backend, il satellite deve presentarsi con un identificativo di client stabile e un nome leggibile dalla famiglia, configurabili nel modulo TypeScript e con valori predefiniti ricavati dal nome host.

#### Metadata
  * type: requirement

#### Relations
  * satisfiedBy: [ambrogio-session.ts](../../src/adapters/out/ambrogio-session.ts)
  * satisfiedBy: [configuration.ts](../../src/adapters/out/configuration.ts)
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Indipendenza tecnica di Domain e Application nel satellite

Il controllo TypeScript del satellite deve compilare Domain e Application con la sola libreria standard ECMAScript e senza tipi dell'ambiente, così che un import di API Node.js, anche di soli tipi, faccia fallire il controllo.

#### Metadata
  * type: requirement

#### Relations
  * derivedFrom: [Indipendenza tecnica di Domain e Application](../../../ambrogio-model/system-model/Requirements/CodeArchitecture.md#indipendenza-tecnica-di-domain-e-application)
  * satisfiedBy: [voice-session.use-case.ts](../../src/application/voice-session.use-case.ts)
  * satisfiedBy: [tsconfig.core.json](../../tsconfig.core.json)
  * specify: [Architettura del codice](../../../ambrogio-model/system-model/Capabilities/Engineering.md#architettura-del-codice)
---

### Installazione delle dipendenze del satellite con pnpm e Corepack

Quando si installano le dipendenze del satellite, nella CI o nella build dell'immagine, l'installazione deve usare pnpm alla versione di `packageManager` attivata con Corepack, dal lockfile versionato senza modificarlo, con le sole eccezioni all'attesa per le nuove versioni e i soli script di build ammessi dal contratto «Profilo di installazione delle dipendenze del satellite».

#### Metadata
  * type: requirement

#### Contract References
  * [Profilo di installazione con pnpm e Corepack](../../../ambrogio-model/system-model/Contracts/ModelDrivenDevelopment.md#profilo-di-installazione-con-pnpm-e-corepack)

#### Relations
  * derivedFrom: [Installazione delle dipendenze con pnpm attivato da Corepack](../../../ambrogio-model/system-model/Requirements/ModelDrivenDevelopment.md#installazione-delle-dipendenze-con-pnpm-attivato-da-corepack)
  * satisfiedBy: [ci.yml](../../.github/workflows/ci.yml)
  * satisfiedBy: [Dockerfile](../../Dockerfile)
  * satisfiedBy: [package.json](../../package.json)
  * satisfiedBy: [pnpm-lock.yaml](../../pnpm-lock.yaml)
  * satisfiedBy: [pnpm-workspace.yaml](../../pnpm-workspace.yaml)
  * specify: [Sviluppo governato dal modello](../../../ambrogio-model/system-model/Capabilities/Engineering.md#sviluppo-governato-dal-modello)
---

### Interazione indipendente dall'attenuazione

Se la regolazione del controllo di attenuazione non riesce, il satellite deve proseguire l'interazione o l'attesa della wake word senza interromperla e registrare un evento diagnostico del guasto.

#### Metadata
  * type: requirement

#### Contract Bindings
  * [Attenuazione locale con softvol e amixer](../Contracts/VoiceSatellite.md#attenuazione-locale-con-softvol-e-amixer)

#### Relations
  * satisfiedBy: [amixer-attenuation.adapter.ts](../../src/adapters/out/amixer-attenuation.adapter.ts)
  * satisfiedBy: [diagnostics.ts](../../src/adapters/out/diagnostics.ts)
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Invio soltanto su sessione pronta

Il satellite deve inviare messaggi e frame audio soltanto su una sessione conversazionale pronta, senza terminare il processo per un errore di stato della connessione, e non deve mai riprendere su una nuova sessione una richiesta o una trasmissione iniziata su quella precedente. Il ripristino dell'interazione e l'eventuale perdita di un turno seguono le regole di recupero del satellite, senza reinvio automatico di audio già acquisito.

#### Metadata
  * type: requirement

#### Contract References
  * [Trasporto conversazionale ambrogio.v1](../Contracts/VoiceSatellite.md#trasporto-conversazionale-ambrogiov1)

#### Relations
  * satisfiedBy: [ambrogio-session.ts](../../src/adapters/out/ambrogio-session.ts)
  * satisfiedBy: [conversation-channel.ts](../../src/adapters/out/conversation-channel.ts)
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Istruzioni per gli agenti del satellite

Le istruzioni per gli agenti del repository del satellite devono applicare al lavoro nel repository le regole di processo di `ambrogio-model`, rimandando a `ambrogio-model/AGENTS.md` per le regole comuni e aggiungendo soltanto le indicazioni proprie del repository.

#### Metadata
  * type: requirement

#### Relations
  * derivedFrom: [Ordine di lavoro guidato dal modello](../../../ambrogio-model/system-model/Requirements/ModelDrivenDevelopment.md#ordine-di-lavoro-guidato-dal-modello)
  * satisfiedBy: [AGENTS.md](../../AGENTS.md)
  * specify: [Sviluppo governato dal modello](../../../ambrogio-model/system-model/Capabilities/Engineering.md#sviluppo-governato-dal-modello)
---

### Log tecnici JSON su stdout

Il satellite deve emettere ogni evento diagnostico tecnico su stdout.

#### Metadata
  * type: requirement

#### Relations
  * derivedFrom: [Log tecnici JSON con Pino](../../../ambrogio-model/system-model/Requirements/CodeArchitecture.md#log-tecnici-json-con-pino)
  * satisfiedBy: [diagnostics.ts](../../src/adapters/out/diagnostics.ts)
  * satisfiedBy: [main.ts](../../src/main.ts)
  * specify: [Architettura del codice](../../../ambrogio-model/system-model/Capabilities/Engineering.md#architettura-del-codice)
---

### Nomi dei file secondo il ruolo architetturale nel satellite

I file di produzione del satellite devono seguire la «Convenzione dei nomi di casi d'uso e adapter» di `ambrogio-model`.

#### Details
Per esempio, un caso d'uso che avvia una conversazione vocale si chiama `start-voice-conversation.use-case.ts`.

#### Metadata
  * type: requirement

#### Contract References
  * [Convenzione dei nomi di casi d'uso e adapter](../../../ambrogio-model/system-model/Contracts/CodeArchitecture.md#convenzione-dei-nomi-di-casi-duso-e-adapter)

#### Relations
  * derivedFrom: [Nomi dei file secondo il ruolo architetturale](../../../ambrogio-model/system-model/Requirements/CodeArchitecture.md#nomi-dei-file-secondo-il-ruolo-architetturale)
  * satisfiedBy: [voice-session.use-case.ts](../../src/application/voice-session.use-case.ts)
  * specify: [Architettura del codice](../../../ambrogio-model/system-model/Capabilities/Engineering.md#architettura-del-codice)
---

### Nuova attivazione dopo il fallimento

Quando la famiglia attiva nuovamente il satellite dopo un fallimento per backend irraggiungibile, il satellite deve tentare una nuova interazione senza conservare la richiesta fallita per un reinvio automatico.

#### Metadata
  * type: requirement

#### Contract References
  * [Recupero locale da backend irraggiungibile](../Contracts/VoiceSatellite.md#recupero-locale-da-backend-irraggiungibile)

#### Relations
  * satisfiedBy: [voice-session.use-case.ts](../../src/application/voice-session.use-case.ts)
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Nuova conversazione a ogni attivazione

Quando la famiglia attiva il satellite con la wake word, il satellite deve iniziare una nuova conversazione; quando la famiglia risponde senza wake word a una risposta che attende replica, deve continuare la conversazione del turno precedente.

#### Concept References
  * [Interazione vocale](../../../ambrogio-model/system-model/Thesaurus/Lessico.md#interazione-vocale)
  * [Indicazione di replica attesa](../../../ambrogio-model/system-model/Thesaurus/Lessico.md#indicazione-di-replica-attesa)

#### Metadata
  * type: requirement

#### Contract References
  * [Regole della replica vocale](../Contracts/VoiceSatellite.md#regole-della-replica-vocale)
  * [Trasporto conversazionale ambrogio.v1](../Contracts/VoiceSatellite.md#trasporto-conversazionale-ambrogiov1)

#### Relations
  * satisfiedBy: [conversation-call.adapter.ts](../../src/adapters/out/conversation-call.adapter.ts)
  * satisfiedBy: [conversation-channel.ts](../../src/adapters/out/conversation-channel.ts)
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Perimetro iniziale dei segnali di osservabilità del satellite

Nella prima versione, il satellite deve limitare i propri segnali di osservabilità ai log tecnici JSON, senza identificativi di correlazione propri.

#### Metadata
  * type: requirement

#### Relations
  * derivedFrom: [Perimetro iniziale dei segnali di osservabilità](../../../ambrogio-model/system-model/Requirements/CodeArchitecture.md#perimetro-iniziale-dei-segnali-di-osservabilità)
  * satisfiedBy: [diagnostics.ts](../../src/adapters/out/diagnostics.ts)
  * satisfiedBy: [satellite.ts](../../src/composition/satellite.ts)
  * specify: [Architettura del codice](../../../ambrogio-model/system-model/Capabilities/Engineering.md#architettura-del-codice)
---

### Privilegi e durata limitati dei workflow GitHub Actions

I workflow GitHub Actions del satellite devono applicare il profilo comune dei workflow con i tempi massimi, le azioni aggiuntive e le protezioni della pubblicazione propri del satellite.

#### Metadata
  * type: requirement

#### Contract References
  * [Profilo comune dei workflow GitHub Actions](../../../ambrogio-model/system-model/Contracts/ModelDrivenDevelopment.md#profilo-comune-dei-workflow-github-actions)

#### Relations
  * derivedFrom: [Workflow GitHub Actions con privilegi e durata limitati](../../../ambrogio-model/system-model/Requirements/ModelDrivenDevelopment.md#workflow-github-actions-con-privilegi-e-durata-limitati)
  * satisfiedBy: [ci.yml](../../.github/workflows/ci.yml)
  * satisfiedBy: [publish-image.yml](../../.github/workflows/publish-image.yml)
  * satisfiedBy: [secret-scan.yml](../../.github/workflows/secret-scan.yml)
  * specify: [Sviluppo governato dal modello](../../../ambrogio-model/system-model/Capabilities/Engineering.md#sviluppo-governato-dal-modello)
---

### Progetto unico del satellite

Il satellite deve organizzare Domain, Application e adapter in un solo progetto, senza suddivisione in package di workspace.

#### Metadata
  * type: requirement

#### Relations
  * satisfiedBy: [package.json](../../package.json)
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Programmazione delle scadenze tramite porta Application

Quando programma o annulla una scadenza dell'interazione vocale, Application deve usare una capacità fornita dalla composition root, senza invocare direttamente timer dell'ambiente di esecuzione.

#### Metadata
  * type: requirement

#### Relations
  * definedBy: [Porta di programmazione delle scadenze](../Contracts/VoiceSatellite.md#porta-di-programmazione-delle-scadenze)
  * derivedFrom: [Capacità dell'ambiente fornite dalla composition root](../../../ambrogio-model/system-model/Requirements/CodeArchitecture.md#capacità-dellambiente-fornite-dalla-composition-root)
  * satisfiedBy: [node-deadline-scheduler.adapter.ts](../../src/adapters/out/node-deadline-scheduler.adapter.ts)
  * satisfiedBy: [deadline-scheduler.ts](../../src/application/deadline-scheduler.ts)
  * satisfiedBy: [voice-session.use-case.ts](../../src/application/voice-session.use-case.ts)
  * specify: [Architettura del codice](../../../ambrogio-model/system-model/Capabilities/Engineering.md#architettura-del-codice)
---

### Pubblicazione delle immagini Docker del satellite

Quando viene creato un tag di release valido, il satellite deve pubblicare su GHCR l'immagine `ghcr.io/ambrogio-app/ambrogio-satellite` per Linux amd64 e arm64 soltanto dopo il superamento dei controlli software e delle verifiche delle immagini di entrambe le architetture, e deve scrivere il riferimento dell'immagine pubblicata nel riepilogo del job di pubblicazione.

#### Metadata
  * type: requirement

#### Contract References
  * [Profilo CI del satellite](../Contracts/VoiceSatellite.md#profilo-ci-del-satellite)
  * [Profilo della scansione dei segreti del satellite](../Contracts/VoiceSatellite.md#profilo-della-scansione-dei-segreti-del-satellite)
  * [Protezioni dei workflow GitHub Actions](../Contracts/VoiceSatellite.md#protezioni-dei-workflow-github-actions)

#### Relations
  * derivedFrom: [Pubblicazione delle immagini di release](../../../ambrogio-model/system-model/Requirements/HomelabInstallation.md#pubblicazione-delle-immagini-di-release)
  * satisfiedBy: [publish-image.yml](../../.github/workflows/publish-image.yml)
  * specify: [Installazione nell'homelab](../../../ambrogio-model/system-model/Capabilities/Engineering.md#installazione-nellhomelab)
---

### Registrazione delle attivazioni locali

Quando riconosce la wake word, il satellite deve registrare un evento diagnostico informativo con il punteggio di riconoscimento e il numero di blocchi audio consecutivi sopra soglia.

#### Concept References
  * [Wake word](../Thesaurus/Lessico.md#wake-word)
  * [Attivazione locale](../Thesaurus/Lessico.md#attivazione-locale)

#### Metadata
  * type: requirement

#### Relations
  * satisfiedBy: [diagnostics.ts](../../src/adapters/out/diagnostics.ts)
  * satisfiedBy: [satellite.ts](../../src/composition/satellite.ts)
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Regole di architettura centrali del satellite

Il satellite deve controllare a ogni esecuzione della suite di test le proprie regole di architettura sugli import dalla fonte centrale e con le eccezioni del contratto «Regole di architettura del satellite», e la suite deve fallire su ogni violazione non eccettuata.

#### Metadata
  * type: requirement

#### Relations
  * derivedFrom: [Regole di architettura centrali e bloccanti](../../../ambrogio-model/system-model/Requirements/CodeArchitecture.md#regole-di-architettura-centrali-e-bloccanti)
  * satisfiedBy: [architecture-rules.ts](../../test/architecture/architecture-rules.ts)
  * specify: [Architettura del codice](../../../ambrogio-model/system-model/Capabilities/Engineering.md#architettura-del-codice)
---

### Replica richiesta dal backend

Quando termina la riproduzione di una risposta per cui il backend segnala di attendere una replica, il satellite deve permettere alla famiglia di rispondere senza wake word nella stessa interazione, finché essa resta attiva.

#### Concept References
  * [Indicazione di replica attesa](../../../ambrogio-model/system-model/Thesaurus/Lessico.md#indicazione-di-replica-attesa)
  * [Interazione vocale](../../../ambrogio-model/system-model/Thesaurus/Lessico.md#interazione-vocale)
  * [Turno vocale](../../../ambrogio-model/system-model/Thesaurus/Lessico.md#turno-vocale)

#### Metadata
  * type: requirement

#### Contract References
  * [Esiti del turno nel protocollo Ambrogio v1](../../../ambrogio-backend/system-model/Contracts/ConversationProtocol.md#esiti-del-turno-nel-protocollo-ambrogio-v1)

#### Relations
  * satisfiedBy: [voice-turn.ts](../../src/domain/voice-turn.ts)
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Riapertura sicura dopo la chiusura vocale

Quando un'interazione termina per risposta conclusiva, inattività, esito mancante, perdita della sessione o guasto, il satellite deve tornare ad ascoltare la wake word senza che trasmissioni, esiti o eventi di chiusura tardivi dell'interazione o della sessione precedente interrompano la nuova acquisizione del microfono o vengano attribuiti a una nuova interazione.

#### Metadata
  * type: requirement

#### Contract References
  * [Trasporto conversazionale ambrogio.v1](../Contracts/VoiceSatellite.md#trasporto-conversazionale-ambrogiov1)

#### Relations
  * satisfiedBy: [conversation-events.adapter.ts](../../src/adapters/in/conversation-events.adapter.ts)
  * satisfiedBy: [conversation-channel.ts](../../src/adapters/out/conversation-channel.ts)
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Rifiuto della configurazione invalida

Quando la configurazione è invalida, il satellite deve impedirne l’avvio operativo e comunicare un errore comprensibile.

#### Metadata
  * type: requirement

#### Contract References
  * [Configurazione del processo satellite](../Contracts/VoiceSatellite.md#configurazione-del-processo-satellite)

#### Relations
  * derivedFrom: [Validazione della configurazione prima delle risorse](../../../ambrogio-model/system-model/Requirements/HomelabInstallation.md#validazione-della-configurazione-prima-delle-risorse)
  * satisfiedBy: [diagnostics.ts](../../src/adapters/out/diagnostics.ts)
  * satisfiedBy: [main.ts](../../src/main.ts)
  * specify: [Installazione nell'homelab](../../../ambrogio-model/system-model/Capabilities/Engineering.md#installazione-nellhomelab)
---

### Rilascio completo delle risorse del satellite

Quando termina o fallisce durante un avvio parziale, il satellite deve tentare il rilascio di tutte le risorse già acquisite, anche se una chiusura fallisce, conservando i guasti per la diagnosi al confine responsabile.

#### Details
Origine: baseline Reqvire «Lifecycle outcome preserved across failures», adottata; «Ordered startup before accepting work», adottata; «Single ordered shutdown», adattata: le risorse indipendenti si chiudono in parallelo invece che in ordine inverso di acquisizione.

#### Metadata
  * type: requirement

#### Relations
  * definedBy: [Ciclo di arresto e rilascio delle risorse](../Contracts/VoiceSatellite.md#ciclo-di-arresto-e-rilascio-delle-risorse)
  * satisfiedBy: [satellite.ts](../../src/composition/satellite.ts)
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Ripristino dell'attenuazione all'avvio e all'arresto

Dove la configurazione indica un controllo di attenuazione, il satellite deve portare quel controllo al livello pieno all'avvio, prima di attendere la wake word, e durante l'arresto controllato.

#### Details
Il ripristino all'avvio corregge un'attenuazione rimasta attiva dopo un'interruzione improvvisa del processo, senza conservare il livello precedente.

#### Metadata
  * type: requirement

#### Contract Bindings
  * [Attenuazione locale con softvol e amixer](../Contracts/VoiceSatellite.md#attenuazione-locale-con-softvol-e-amixer)

#### Relations
  * satisfiedBy: [voice-session.use-case.ts](../../src/application/voice-session.use-case.ts)
  * satisfiedBy: [satellite.ts](../../src/composition/satellite.ts)
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Ripristino dopo backend irraggiungibile

Quando ha segnalato il fallimento di un’interazione per backend irraggiungibile, il satellite deve tornare in attesa della wake word senza richiedere il riavvio del processo.

#### Metadata
  * type: requirement

#### Relations
  * satisfiedBy: [voice-session.use-case.ts](../../src/application/voice-session.use-case.ts)
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Riproduzione della risposta vocale

Quando riceve una trasmissione audio della risposta dal backend, il satellite deve riprodurla sul dispositivo di uscita configurato alla frequenza di campionamento dichiarata dalla trasmissione, rispettando l'ordine delle trasmissioni del turno.

#### Concept References
  * [Risposta parlata](../../../ambrogio-model/system-model/Thesaurus/Lessico.md#risposta-parlata)
  * [Dispositivo audio](../Thesaurus/Lessico.md#dispositivo-audio)

#### Metadata
  * type: requirement

#### Contract References
  * [Esiti del turno nel protocollo Ambrogio v1](../../../ambrogio-backend/system-model/Contracts/ConversationProtocol.md#esiti-del-turno-nel-protocollo-ambrogio-v1)
  * [Trasmissione in uscita del protocollo Ambrogio v1](../../../ambrogio-backend/system-model/Contracts/ConversationProtocol.md#trasmissione-in-uscita-del-protocollo-ambrogio-v1)
  * [Adapter audio con Decibri](../Contracts/VoiceSatellite.md#adapter-audio-con-decibri)

#### Relations
  * satisfiedBy: [response-playback.ts](../../src/adapters/out/response-playback.ts)
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Ritorno alla wake word dopo la risposta

Quando termina la riproduzione di una risposta per cui il backend segnala di non attendere una replica, il satellite deve tornare in attesa della wake word.

#### Metadata
  * type: requirement

#### Contract References
  * [Regole della replica vocale](../Contracts/VoiceSatellite.md#regole-della-replica-vocale)

#### Relations
  * satisfiedBy: [voice-turn.ts](../../src/domain/voice-turn.ts)
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Ritorno alla wake word per inattività

Quando dopo una risposta che attende replica scade l'intervallo locale di inattività senza un nuovo turno, il satellite deve concludere l'interazione e tornare in attesa della wake word, mantenendo aperta la sessione conversazionale.

#### Metadata
  * type: requirement

#### Contract References
  * [Esiti del turno nel protocollo Ambrogio v1](../../../ambrogio-backend/system-model/Contracts/ConversationProtocol.md#esiti-del-turno-nel-protocollo-ambrogio-v1)
  * [Regole della replica vocale](../Contracts/VoiceSatellite.md#regole-della-replica-vocale)

#### Relations
  * satisfiedBy: [voice-turn.ts](../../src/domain/voice-turn.ts)
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Scansione dei segreti nella storia del repository

Quando una modifica viene inviata a qualunque branch del repository del satellite o proposta tramite pull request, il job `Secret scan` del satellite deve eseguire la scansione comune dei segreti sull'intera storia del repository.

#### Metadata
  * type: requirement

#### Contract References
  * [Profilo di scansione dei segreti con gitleaks](../../../ambrogio-model/system-model/Contracts/ModelDrivenDevelopment.md#profilo-di-scansione-dei-segreti-con-gitleaks)
  * [Protezioni dei workflow GitHub Actions](../Contracts/VoiceSatellite.md#protezioni-dei-workflow-github-actions)

#### Relations
  * derivedFrom: [Scansione dei segreti nella CI](../../../ambrogio-model/system-model/Requirements/ModelDrivenDevelopment.md#scansione-dei-segreti-nella-ci)
  * satisfiedBy: [secret-scan.yml](../../.github/workflows/secret-scan.yml)
  * specify: [Sviluppo governato dal modello](../../../ambrogio-model/system-model/Capabilities/Engineering.md#sviluppo-governato-dal-modello)
---

### Scansione dei segreti prima della pubblicazione

Quando viene creato un tag di release valido, il progetto non deve pubblicare immagini del satellite se la scansione dei segreti della stessa revisione non è superata.

#### Details
Origine: baseline Reqvire «Full-history secret scan in CI», adottata.

#### Metadata
  * type: requirement

#### Contract References
  * [Profilo della scansione dei segreti del satellite](../Contracts/VoiceSatellite.md#profilo-della-scansione-dei-segreti-del-satellite)
  * [Profilo di pubblicazione Docker del satellite](../Contracts/VoiceSatellite.md#profilo-di-pubblicazione-docker-del-satellite)

#### Relations
  * derivedFrom: [Pubblicazione delle immagini di release](../../../ambrogio-model/system-model/Requirements/HomelabInstallation.md#pubblicazione-delle-immagini-di-release)
  * satisfiedBy: [publish-image.yml](../../.github/workflows/publish-image.yml)
  * specify: [Installazione nell'homelab](../../../ambrogio-model/system-model/Capabilities/Engineering.md#installazione-nellhomelab)
---

### Segnale acustico di disponibilità

Ogni volta che sta per aprire il microfono per un turno della persona, il satellite deve emettere un breve segnale acustico locale e ammettere il parlato soltanto dopo il segnale, così la persona sa da quando il satellite la ascolta.

#### Metadata
  * type: requirement

#### Relations
  * satisfiedBy: [ready-cue.ts](../../src/adapters/out/ready-cue.ts)
  * satisfiedBy: [voice-session.use-case.ts](../../src/application/voice-session.use-case.ts)
  * satisfiedBy: [voice-turn.ts](../../src/domain/voice-turn.ts)
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Selezione dei dispositivi audio

Quando la configurazione indica `audio.microphone` o `audio.speaker`, il satellite deve acquisire l'audio dal microfono selezionato e riprodurlo sullo speaker selezionato; in assenza del selettore deve usare il dispositivo predefinito del sistema, e se il dispositivo selezionato non è disponibile deve segnalarne il guasto senza sostituirlo con il dispositivo predefinito.

#### Concept References
  * [Dispositivo audio](../Thesaurus/Lessico.md#dispositivo-audio)
  * [Configurazione del satellite](../Thesaurus/Lessico.md#configurazione-del-satellite)

#### Metadata
  * type: requirement

#### Relations
  * satisfiedBy: [decibri-audio.ts](../../src/adapters/out/decibri-audio.ts)
  * satisfiedBy: [microphone-input.ts](../../src/adapters/out/microphone-input.ts)
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Selezione del file di configurazione

Il satellite deve leggere la configurazione dal percorso indicato con un’opzione di avvio.

#### Metadata
  * type: requirement

#### Contract References
  * [Configurazione del processo satellite](../Contracts/VoiceSatellite.md#configurazione-del-processo-satellite)

#### Relations
  * satisfiedBy: [main.ts](../../src/main.ts)
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Selezione della wake word configurata

Quando carica la configurazione, il satellite deve selezionare il modello di wake word richiesto dal catalogo distribuito oppure da un file ONNX compatibile presente nella directory dei modelli montata sull'installazione. Deve rifiutare identificatori sconosciuti o che escono dalla directory dei modelli.

#### Metadata
  * type: requirement

#### Relations
  * satisfiedBy: [wake-word-catalog.ts](../../src/adapters/out/wake-word-catalog.ts)
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Selezione esplicita dei dati diagnostici

Il satellite deve includere nei log soltanto campi diagnostici selezionati esplicitamente, escludendo audio, contenuti conversazionali e credenziali.

#### Metadata
  * type: requirement

#### Relations
  * derivedFrom: [Log tecnici JSON con Pino](../../../ambrogio-model/system-model/Requirements/CodeArchitecture.md#log-tecnici-json-con-pino)
  * satisfiedBy: [diagnostics.ts](../../src/adapters/out/diagnostics.ts)
  * satisfiedBy: [main.ts](../../src/main.ts)
  * specify: [Architettura del codice](../../../ambrogio-model/system-model/Capabilities/Engineering.md#architettura-del-codice)
---

### Separazione Domain Application e adapter

Il satellite deve separare regole e stati in Domain, coordinamento e porte in Application e integrazioni tecniche negli adapter, mantenendo Domain e Application indipendenti dalle librerie tecniche.

#### Metadata
  * type: requirement

#### Relations
  * derivedFrom: [Struttura in layer dei componenti](../../../ambrogio-model/system-model/Requirements/CodeArchitecture.md#struttura-in-layer-dei-componenti)
  * satisfiedBy: [voice-session.use-case.ts](../../src/application/voice-session.use-case.ts)
  * specify: [Architettura del codice](../../../ambrogio-model/system-model/Capabilities/Engineering.md#architettura-del-codice)
---

### Serializzazione protetta dei guasti

Quando registra un guasto inatteso, il satellite deve passare al logger il campo err con l’Error originale o un Error con causa originale per valori diversi, serializzando soltanto una vista sicura senza modificare il guasto in memoria.

#### Metadata
  * type: requirement

#### Relations
  * derivedFrom: [Diagnosi definitiva unica dei guasti inattesi](../../../ambrogio-model/system-model/Requirements/CodeArchitecture.md#diagnosi-definitiva-unica-dei-guasti-inattesi)
  * satisfiedBy: [diagnostics.ts](../../src/adapters/out/diagnostics.ts)
  * specify: [Architettura del codice](../../../ambrogio-model/system-model/Capabilities/Engineering.md#architettura-del-codice)
---

### Sessione conversazionale persistente

Mentre il processo è attivo, il satellite deve mantenere una sola sessione conversazionale con il backend, aperta all'avvio e riaperta alla successiva attivazione con la wake word quando risulta chiusa, senza riprendere su una nuova sessione richieste o trasmissioni di quella precedente.

#### Metadata
  * type: requirement

#### Contract References
  * [Trasporto conversazionale ambrogio.v1](../Contracts/VoiceSatellite.md#trasporto-conversazionale-ambrogiov1)

#### Relations
  * satisfiedBy: [conversation-channel.ts](../../src/adapters/out/conversation-channel.ts)
  * satisfiedBy: [satellite.ts](../../src/composition/satellite.ts)
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Stack TypeScript e Node.js

Il satellite deve essere implementato in TypeScript ed eseguito su Node.js.

#### Metadata
  * type: requirement

#### Relations
  * satisfiedBy: [package.json](../../package.json)
  * satisfiedBy: [tsconfig.build.json](../../tsconfig.build.json)
  * satisfiedBy: [tsconfig.json](../../tsconfig.json)
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Supporto Linux su due architetture

Il satellite deve essere eseguibile su Linux x86_64 e arm64 senza richiedere uno specifico modello di dispositivo hardware.

#### Metadata
  * type: requirement

#### Contract References
  * [Esecuzione host e container](../Contracts/VoiceSatellite.md#esecuzione-host-e-container)

#### Relations
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Tempo massimo dell'arresto del processo

Se l'arresto ordinato avviato da SIGINT o SIGTERM non termina entro il tempo massimo di arresto, il satellite deve registrare un evento diagnostico e terminare il processo con stato di uscita non riuscito.

#### Details
Una chiusura nativa che non restituisce mai il controllo non deve lasciare attivo il processo: il gestore dei servizi o il runtime dei container attende la sua terminazione.

Origine: baseline Reqvire «Bounded shutdown window», adattata: allo scadere il satellite registra soltanto `timeoutMs`, senza i guasti già osservati, e la finestra del supervisore non è dichiarata.

#### Metadata
  * type: requirement

#### Contract References
  * [Ciclo di arresto e rilascio delle risorse](../Contracts/VoiceSatellite.md#ciclo-di-arresto-e-rilascio-delle-risorse)
  * [Profilo diagnostico Pino](../Contracts/VoiceSatellite.md#profilo-diagnostico-pino)

#### Relations
  * satisfiedBy: [main.ts](../../src/main.ts)
  * satisfiedBy: [satellite-process.ts](../../src/runtime/satellite-process.ts)
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Tono di errore per backend irraggiungibile

Quando non riesce ad avviare un’interazione perché il backend non è raggiungibile, il satellite deve segnalare il fallimento riproducendo il tono di errore locale generato dal programma, senza messaggi parlati.

#### Details
Origine: baseline Reqvire «Error log at the public fallback», adottata.

#### Metadata
  * type: requirement

#### Contract References
  * [Recupero locale da backend irraggiungibile](../Contracts/VoiceSatellite.md#recupero-locale-da-backend-irraggiungibile)

#### Relations
  * satisfiedBy: [conversation-call.adapter.ts](../../src/adapters/out/conversation-call.adapter.ts)
  * satisfiedBy: [ready-cue.ts](../../src/adapters/out/ready-cue.ts)
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Tono di errore per voce non disponibile

Quando il backend risponde a un turno vocale soltanto in testo perché la voce non è disponibile, il satellite non deve pronunciare il testo, deve riprodurre il tono di errore locale generato dal programma e deve tornare in attesa della wake word.

#### Metadata
  * type: requirement

#### Contract References
  * [Motivi di rifiuto del turno](../../../ambrogio-backend/system-model/Contracts/ConversationProtocol.md#motivi-di-rifiuto-del-turno)
  * [Tono locale di errore](../Contracts/VoiceSatellite.md#tono-locale-di-errore)

#### Relations
  * satisfiedBy: [ready-cue.ts](../../src/adapters/out/ready-cue.ts)
  * satisfiedBy: [response-playback.ts](../../src/adapters/out/response-playback.ts)
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Unicità della diagnosi definitiva

Quando un guasto raggiunge il confine tecnico responsabile della sua gestione, il satellite deve emettere una sola diagnosi definitiva senza duplicarla nei componenti intermedi.

#### Details
Origine: baseline Reqvire «Propagation of unexpected failures as exceptions», adottata.

#### Metadata
  * type: requirement

#### Relations
  * derivedFrom: [Diagnosi definitiva unica dei guasti inattesi](../../../ambrogio-model/system-model/Requirements/CodeArchitecture.md#diagnosi-definitiva-unica-dei-guasti-inattesi)
  * satisfiedBy: [voice-session.use-case.ts](../../src/application/voice-session.use-case.ts)
  * specify: [Architettura del codice](../../../ambrogio-model/system-model/Capabilities/Engineering.md#architettura-del-codice)
---

### Uso delle sole interfacce pubbliche del backend nel satellite

Il satellite deve scambiare audio ed eventi con il backend secondo i contratti del protocollo conversazionale `ambrogio.v1` posseduti dal backend, e il suo codice di produzione non deve importare codice del backend.

#### Details
Le prove di integrazione del satellite avviano il backend affiancato soltanto tramite il suo ingresso di prova pubblico. La compatibilità fra release segue la versione del protocollo dichiarata da ciascuna release.

#### Concept References
  * [Backend](../../../ambrogio-model/system-model/Thesaurus/Lessico.md#backend)
  * [Sessione conversazionale](../../../ambrogio-model/system-model/Thesaurus/Lessico.md#sessione-conversazionale)

#### Metadata
  * type: requirement

#### Contract References
  * [Correlazione diagnostica della sessione Ambrogio v1](../../../ambrogio-backend/system-model/Contracts/ConversationProtocol.md#correlazione-diagnostica-della-sessione-ambrogio-v1)
  * [Errori ed estensioni del protocollo Ambrogio v1](../../../ambrogio-backend/system-model/Contracts/ConversationProtocol.md#errori-ed-estensioni-del-protocollo-ambrogio-v1)
  * [Esiti del turno nel protocollo Ambrogio v1](../../../ambrogio-backend/system-model/Contracts/ConversationProtocol.md#esiti-del-turno-nel-protocollo-ambrogio-v1)
  * [Motivi di rifiuto del turno](../../../ambrogio-backend/system-model/Contracts/ConversationProtocol.md#motivi-di-rifiuto-del-turno)
  * [Schema JSON del protocollo Ambrogio v1](../../../ambrogio-backend/system-model/Contracts/ConversationProtocol.md#schema-json-del-protocollo-ambrogio-v1)
  * [Sessione del protocollo Ambrogio v1](../../../ambrogio-backend/system-model/Contracts/ConversationProtocol.md#sessione-del-protocollo-ambrogio-v1)
  * [Trasmissione in ingresso del protocollo Ambrogio v1](../../../ambrogio-backend/system-model/Contracts/ConversationProtocol.md#trasmissione-in-ingresso-del-protocollo-ambrogio-v1)
  * [Trasmissione in uscita del protocollo Ambrogio v1](../../../ambrogio-backend/system-model/Contracts/ConversationProtocol.md#trasmissione-in-uscita-del-protocollo-ambrogio-v1)
  * [Occupazione della conversazione e ammissione dei turni](../../../ambrogio-backend/system-model/Contracts/FamilyConversation.md#occupazione-della-conversazione-e-ammissione-dei-turni)
  * [Ingresso di prova del server conversazionale](../../../ambrogio-backend/system-model/Contracts/ServerFoundation.md#ingresso-di-prova-del-server-conversazionale)
  * [Regole della replica vocale](../Contracts/VoiceSatellite.md#regole-della-replica-vocale)

#### Relations
  * derivedFrom: [Uso delle sole interfacce pubbliche del backend](../../../ambrogio-model/system-model/Requirements/CodeArchitecture.md#uso-delle-sole-interfacce-pubbliche-del-backend)
  * satisfiedBy: [ambrogio-session.ts](../../src/adapters/out/ambrogio-session.ts)
  * specify: [Architettura del codice](../../../ambrogio-model/system-model/Capabilities/Engineering.md#architettura-del-codice)
---

### Uso di Pino per la diagnostica

Il satellite deve emettere i propri log tecnici mediante Pino al confine responsabile della diagnosi.

#### Metadata
  * type: requirement

#### Relations
  * derivedFrom: [Log tecnici JSON con Pino](../../../ambrogio-model/system-model/Requirements/CodeArchitecture.md#log-tecnici-json-con-pino)
  * satisfiedBy: [diagnostics.ts](../../src/adapters/out/diagnostics.ts)
  * specify: [Architettura del codice](../../../ambrogio-model/system-model/Capabilities/Engineering.md#architettura-del-codice)
---

### Validazione prima della costruzione delle risorse

Il satellite deve caricare e validare la configurazione prima di costruire le risorse operative.

#### Details
Origine: baseline Reqvire «One-time configuration load at startup», adottata; «Ordered startup before accepting work», adottata.

#### Metadata
  * type: requirement

#### Relations
  * derivedFrom: [Validazione della configurazione prima delle risorse](../../../ambrogio-model/system-model/Requirements/HomelabInstallation.md#validazione-della-configurazione-prima-delle-risorse)
  * satisfiedBy: [main.ts](../../src/main.ts)
  * specify: [Installazione nell'homelab](../../../ambrogio-model/system-model/Capabilities/Engineering.md#installazione-nellhomelab)
---

### Valori di configurazione da ambiente

Il satellite deve consentire al modulo TypeScript di configurazione di ricavare tutti i valori dalle variabili d'ambiente del processo, mantenendo la validazione prima dell'avvio operativo.

#### Metadata
  * type: requirement

#### Contract References
  * [Configurazione del processo satellite](../Contracts/VoiceSatellite.md#configurazione-del-processo-satellite)

#### Relations
  * satisfiedBy: [config.example.ts](../../config.example.ts)
  * satisfiedBy: [config-file.ts](../../src/adapters/out/config-file.ts)
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---
