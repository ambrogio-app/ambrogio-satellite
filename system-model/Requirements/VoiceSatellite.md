# Elements

### Arresto immediato del processo satellite

Quando riceve SIGINT o SIGTERM, il satellite deve impedire nuove attivazioni e interrompere l'interazione e la riproduzione correnti senza attendere la risposta completa.

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

#### Relations
  * satisfiedBy: [satellite.ts](../../src/composition/satellite.ts)
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Assemblaggio delle risorse nella composition root

Il satellite deve assemblare le porte e le risorse tecniche nella composition root del processo.

#### Metadata
  * type: requirement

#### Relations
  * satisfiedBy: [satellite.ts](../../src/composition/satellite.ts)
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Assenza di logger nei layer interni

Domain e casi d’uso Application del satellite devono restare indipendenti dal logger.

#### Metadata
  * type: requirement

#### Relations
  * satisfiedBy: [voice-session.use-case.ts](../../src/application/voice-session.use-case.ts)
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Assenza di override da ambiente

Il satellite deve preservare i valori letti dal file JSON senza sovrascriverli mediante variabili d’ambiente.

#### Metadata
  * type: requirement

#### Contract References
  * [Configurazione del processo satellite](../Contracts/VoiceSatellite.md#configurazione-del-processo-satellite)

#### Relations
  * satisfiedBy: [config-file.ts](../../src/adapters/out/config-file.ts)
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Assenza di registrazioni audio persistenti

Il satellite non deve conservare su memoria persistente l’audio acquisito dalle persone o ricevuto come risposta durante le interazioni.

#### Metadata
  * type: requirement

#### Relations
  * satisfiedBy: [satellite.ts](../../src/composition/satellite.ts)
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Attesa della fine della risposta

Mentre riproduce la risposta di Ambrogio, il satellite deve impedire interruzioni vocali e nuovi turni, e deve considerare conclusa la risposta soltanto quando ha ricevuto l'esito del turno e ha riprodotto tutti i campioni delle trasmissioni del turno chiuse da `output.end`. La riapertura della replica o il ritorno alla wake word avvengono soltanto dopo questa conclusione. Se l'esito non arriva entro 60 secondi dalla fine della richiesta, il satellite conclude l'interazione con il recupero locale.

#### Metadata
  * type: requirement

#### Contract References
  * [Regole della replica vocale](../Contracts/VoiceSatellite.md#regole-della-replica-vocale)

#### Relations
  * satisfiedBy: [conversation-events.adapter.ts](../../src/adapters/in/conversation-events.adapter.ts)
  * satisfiedBy: [response-playback.ts](../../src/adapters/out/response-playback.ts)
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Avvio dopo la wake word

Quando riconosce la wake word mentre attende una nuova interazione, il satellite deve avviare una nuova interazione sulla sessione conversazionale pubblica del backend, riaprendo la sessione se non è pronta.

#### Concept References
  * [Attivazione locale](../Thesaurus/Lessico.md#attivazione-locale)
  * [Interazione vocale](../Thesaurus/Lessico.md#interazione-vocale)
  * [Backend vocale](../Thesaurus/Lessico.md#backend-vocale)

#### Metadata
  * type: requirement

#### Contract References
  * [Contratto vocale backend di riferimento](../Contracts/VoiceSatellite.md#contratto-vocale-backend-di-riferimento)
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

### Compatibilità con il canale vocale backend

Il satellite deve scambiare audio ed eventi con il backend secondo una revisione esplicita del protocollo conversazionale pubblico `ambrogio.v1` registrata nel proprio modello.

#### Metadata
  * type: requirement

#### Relations
  * satisfiedBy: [ambrogio-session.ts](../../src/adapters/out/ambrogio-session.ts)
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
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

### Configurazione JSON unica

Il satellite deve leggere da un file JSON la configurazione del backend, dell'identità del client, dei dispositivi audio, della wake word e dell'intervallo locale di inattività, usando gli stessi significati sull'host e nel container.

#### Concept References
  * [Configurazione del satellite](../Thesaurus/Lessico.md#configurazione-del-satellite)
  * [Dispositivo audio](../Thesaurus/Lessico.md#dispositivo-audio)
  * [Modello di wake word](../Thesaurus/Lessico.md#modello-di-wake-word)

#### Metadata
  * type: requirement

#### Relations
  * satisfiedBy: [configuration.ts](../../src/adapters/out/configuration.ts)
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Confini degli import nei test

I test del satellite devono rispettare i confini di importazione del layer verificato, anche per gli import di soli tipi.

#### Metadata
  * type: requirement

#### Relations
  * satisfiedBy: [voice-session.test.ts](../../test/application/voice-session.test.ts)
  * satisfiedBy: [voice-turn.test.ts](../../test/domain/voice-turn.test.ts)
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Conservazione della causa dei guasti

Quando aggiunge contesto a un guasto inatteso, il satellite deve conservare l’errore originale nella catena delle cause.

#### Metadata
  * type: requirement

#### Relations
  * satisfiedBy: [diagnostics.ts](../../src/adapters/out/diagnostics.ts)
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Conservazione della richiesta continua

Quando la famiglia pronuncia la wake word e la richiesta senza pausa, il satellite deve conservare temporaneamente in memoria il parlato necessario a non perdere l’inizio della richiesta durante il riconoscimento, il segnale di ascolto e la conferma del parlato, e trasmetterlo all'inizio della richiesta.

#### Concept References
  * [Riserva audio](../Thesaurus/Lessico.md#riserva-audio)
  * [Turno vocale](../Thesaurus/Lessico.md#turno-vocale)

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
  * satisfiedBy: [voice-session.use-case.ts](../../src/application/voice-session.use-case.ts)
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Controlli CI delle modifiche del satellite

Quando una modifica viene proposta tramite pull request, la CI del satellite deve eseguire validazione e lint Reqvire, controllo TypeScript completo e dei layer interni, suite Vitest e build, segnalando il fallimento se uno dei controlli fallisce.

#### Metadata
  * type: requirement

#### Relations
  * satisfiedBy: [ci.yml](../../.github/workflows/ci.yml)
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Controlli obbligatori prima del merge

Quando una pull request viene integrata nel branch principale del satellite, il repository deve impedire il merge se i controlli CI richiesti non sono superati.

#### Metadata
  * type: requirement

#### Relations
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Controllo dei segreti prima del commit locale

Quando si crea un commit in un clone che ha abilitato l'hook versionato del repository, il repository deve bloccare il commit se le modifiche in staging contengono segreti oppure se lo strumento di scansione non è disponibile.

#### Metadata
  * type: requirement

#### Relations
  * satisfiedBy: [pre-commit](../../.githooks/pre-commit)
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Delimitazione locale dei turni vocali

Durante un'interazione vocale attiva, il satellite deve riconoscere localmente l'inizio e la fine del parlato della famiglia e consegnare al backend il turno risultante, preservando anche le risposte brevi e le richieste con pause interne.

#### Concept References
  * [Rilevamento dell'attività vocale](../Thesaurus/Lessico.md#rilevamento-dellattività-vocale)
  * [Turno vocale](../Thesaurus/Lessico.md#turno-vocale)

#### Metadata
  * type: requirement

#### Relations
  * satisfiedBy: [satellite.ts](../../src/composition/satellite.ts)
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Distribuzione Docker facoltativa

Il satellite deve offrire una distribuzione Docker facoltativa per Linux x86_64 e arm64 che esegua la stessa applicazione con lo stesso contratto di configurazione dell’esecuzione diretta.

#### Metadata
  * type: requirement

#### Relations
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Distribuzione mirata della configurazione

La composition root del satellite deve fornire a ciascun componente soltanto i valori validati necessari, senza letture dirette della configurazione di processo da Domain e casi d’uso Application.

#### Metadata
  * type: requirement

#### Relations
  * satisfiedBy: [satellite.ts](../../src/composition/satellite.ts)
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Esclusione delle configurazioni personali dagli artefatti

Il satellite deve escludere configurazioni personali e credenziali dagli artefatti distribuiti e dagli esempi di configurazione.

#### Metadata
  * type: requirement

#### Relations
  * satisfiedBy: [.dockerignore](../../.dockerignore)
  * satisfiedBy: [Dockerfile](../../Dockerfile)
  * satisfiedBy: [config.example.json](../../config.example.json)
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Esecuzione diretta sul sistema host

Il satellite deve poter essere installato ed eseguito direttamente sul sistema host con runtime, dipendenze e modelli necessari, senza richiedere Docker.

#### Metadata
  * type: requirement

#### Contract References
  * [Esecuzione host e container](../Contracts/VoiceSatellite.md#esecuzione-host-e-container)

#### Relations
  * satisfiedBy: [main.ts](../../src/main.ts)
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Esiti previsti come valori tipizzati

Quando Domain, Application o una porta prevedono un esito negativo nel proprio contratto, il satellite deve rappresentarlo come valore tipizzato distinguibile dal successo.

#### Metadata
  * type: requirement

#### Relations
  * satisfiedBy: [configuration.ts](../../src/adapters/out/configuration.ts)
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Eventi diagnostici stabili

Quando emette un log tecnico, il satellite deve includere un nome event stabile indipendente dai dati ricevuti.

#### Metadata
  * type: requirement

#### Relations
  * satisfiedBy: [diagnostics.ts](../../src/adapters/out/diagnostics.ts)
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Forma TypeScript dei contratti Application

Quando Application del satellite dichiara una porta a oggetto con operazioni nominate, deve usare interface; quando dichiara dati, unioni o contratti callable, deve usare type.

#### Metadata
  * type: requirement

#### Relations
  * definedBy: [Convenzione TypeScript di porte e dati](../Contracts/VoiceSatellite.md#convenzione-typescript-di-porte-e-dati)
  * satisfiedBy: [deadline-scheduler.ts](../../src/application/deadline-scheduler.ts)
  * satisfiedBy: [voice-session.use-case.ts](../../src/application/voice-session.use-case.ts)
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Gestione dei guasti inattesi

Quando si verifica un guasto inatteso, il satellite deve propagarlo come eccezione fino al confine tecnico responsabile della gestione e della diagnostica.

#### Metadata
  * type: requirement

#### Relations
  * satisfiedBy: [voice-session.use-case.ts](../../src/application/voice-session.use-case.ts)
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Gestione dei log affidata al deployment

Quando l’installazione richiede conservazione, rotazione o inoltro dei log tecnici, tali funzioni devono essere gestite dal deployment; il satellite deve continuare a emettere su stdout senza integrare archivi o servizi di raccolta specifici.

#### Metadata
  * type: requirement

#### Relations
  * satisfiedBy: [diagnostics.ts](../../src/adapters/out/diagnostics.ts)
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Gestione esaustiva dei rifiuti previsti

I chiamanti delle porte e dei casi d’uso devono gestire esplicitamente tutte le varianti dei rifiuti previsti dai rispettivi contratti.

#### Metadata
  * type: requirement

#### Relations
  * satisfiedBy: [main.ts](../../src/main.ts)
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Idempotenza dell'arresto del satellite

Quando riceve richieste ripetute o concorrenti di arresto, il satellite deve condividere la stessa operazione di arresto senza duplicare il rilascio delle risorse native.

#### Metadata
  * type: requirement

#### Contract References
  * [Ciclo di arresto e rilascio delle risorse](../Contracts/VoiceSatellite.md#ciclo-di-arresto-e-rilascio-delle-risorse)

#### Relations
  * satisfiedBy: [satellite.ts](../../src/composition/satellite.ts)
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Identificazione del satellite nella sessione

Quando apre la sessione conversazionale con il backend, il satellite deve presentarsi con un identificativo di client stabile e un nome leggibile dalla famiglia, configurabili nel file JSON e con valori predefiniti ricavati dal nome host.

#### Metadata
  * type: requirement

#### Relations
  * satisfiedBy: [ambrogio-session.ts](../../src/adapters/out/ambrogio-session.ts)
  * satisfiedBy: [configuration.ts](../../src/adapters/out/configuration.ts)
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Indipendenza tecnica di Domain e Application

Domain e Application del satellite devono usare soltanto API standard ECMAScript indipendenti dall'ambiente, senza dipendere da API Node.js o da librerie tecniche, anche tramite import di soli tipi.

#### Metadata
  * type: requirement

#### Relations
  * satisfiedBy: [voice-session.use-case.ts](../../src/application/voice-session.use-case.ts)
  * satisfiedBy: [tsconfig.core.json](../../tsconfig.core.json)
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

### Log tecnici JSON su stdout

Il satellite deve emettere ogni evento diagnostico tecnico come una singola riga JSON su stdout.

#### Metadata
  * type: requirement

#### Relations
  * satisfiedBy: [diagnostics.ts](../../src/adapters/out/diagnostics.ts)
  * satisfiedBy: [main.ts](../../src/main.ts)
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Modello autonomo del satellite

Il satellite deve mantenere codice, modello Reqvire, lessico dei concetti e ontologia strutturale nel proprio repository autonomo, in modo che i termini e le relazioni del dominio siano comprensibili senza consultare il modello del backend; deve registrare la dipendenza dal contratto pubblico posseduto dal backend.

#### Concept References
  * [Satellite vocale](../Thesaurus/Lessico.md#satellite-vocale)
  * [Backend vocale](../Thesaurus/Lessico.md#backend-vocale)

#### Metadata
  * type: requirement

#### Relations
  * satisfiedBy: [AGENTS.md](../../AGENTS.md)
  * satisfiedBy: [README.md](../../README.md)
  * satisfiedBy: [package.json](../../package.json)
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Nomi dei file secondo il ruolo architetturale

I file del codice di produzione devono seguire una convenzione esplicita e uniforme che renda riconoscibili i casi d'uso e gli adapter secondo la responsabilità effettivamente realizzata.

#### Metadata
  * type: requirement

#### Relations
  * satisfiedBy: [voice-session.use-case.ts](../../src/application/voice-session.use-case.ts)
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
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
  * [Interazione vocale](../Thesaurus/Lessico.md#interazione-vocale)
  * [Indicazione di replica attesa](../Thesaurus/Lessico.md#indicazione-di-replica-attesa)

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

### Perimetro iniziale dei segnali di osservabilità

Nella prima versione, il satellite deve usare i log tecnici strutturati come segnali di osservabilità, senza introdurre sistemi applicativi separati di metriche, tracing distribuito o audit degli eventi.

#### Metadata
  * type: requirement

#### Relations
  * satisfiedBy: [diagnostics.ts](../../src/adapters/out/diagnostics.ts)
  * satisfiedBy: [satellite.ts](../../src/composition/satellite.ts)
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
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
  * satisfiedBy: [node-deadline-scheduler.adapter.ts](../../src/adapters/out/node-deadline-scheduler.adapter.ts)
  * satisfiedBy: [deadline-scheduler.ts](../../src/application/deadline-scheduler.ts)
  * satisfiedBy: [voice-session.use-case.ts](../../src/application/voice-session.use-case.ts)
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Pubblicazione delle immagini Docker del satellite

Quando viene creato un tag di release valido, il progetto deve pubblicare su GHCR un’immagine del satellite per Linux amd64 e arm64 soltanto dopo il superamento dei controlli software e delle verifiche delle immagini di entrambe le architetture.

#### Metadata
  * type: requirement

#### Relations
  * satisfiedBy: [publish-image.yml](../../.github/workflows/publish-image.yml)
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Replica richiesta dal backend

Quando termina la riproduzione di una risposta per cui il backend segnala di attendere una replica, il satellite deve permettere alla famiglia di rispondere senza wake word nella stessa interazione, finché essa resta attiva.

#### Concept References
  * [Indicazione di replica attesa](../Thesaurus/Lessico.md#indicazione-di-replica-attesa)
  * [Interazione vocale](../Thesaurus/Lessico.md#interazione-vocale)
  * [Turno vocale](../Thesaurus/Lessico.md#turno-vocale)

#### Metadata
  * type: requirement

#### Contract References
  * [Contratto vocale backend di riferimento](../Contracts/VoiceSatellite.md#contratto-vocale-backend-di-riferimento)

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
  * satisfiedBy: [diagnostics.ts](../../src/adapters/out/diagnostics.ts)
  * satisfiedBy: [main.ts](../../src/main.ts)
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Rilascio completo delle risorse del satellite

Quando termina o fallisce durante un avvio parziale, il satellite deve tentare il rilascio di tutte le risorse già acquisite, anche se una chiusura fallisce, conservando i guasti per la diagnosi al confine responsabile.

#### Metadata
  * type: requirement

#### Relations
  * definedBy: [Ciclo di arresto e rilascio delle risorse](../Contracts/VoiceSatellite.md#ciclo-di-arresto-e-rilascio-delle-risorse)
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
  * [Risposta parlata](../Thesaurus/Lessico.md#risposta-parlata)
  * [Dispositivo audio](../Thesaurus/Lessico.md#dispositivo-audio)

#### Metadata
  * type: requirement

#### Contract References
  * [Contratto vocale backend di riferimento](../Contracts/VoiceSatellite.md#contratto-vocale-backend-di-riferimento)

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
  * [Contratto vocale backend di riferimento](../Contracts/VoiceSatellite.md#contratto-vocale-backend-di-riferimento)
  * [Regole della replica vocale](../Contracts/VoiceSatellite.md#regole-della-replica-vocale)

#### Relations
  * satisfiedBy: [voice-turn.ts](../../src/domain/voice-turn.ts)
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Scansione dei segreti nella storia del repository

Quando una modifica viene inviata a qualunque branch del repository del satellite o proposta tramite pull request, la CI deve analizzare l'intera storia Git alla ricerca di segreti e segnalare il fallimento se ne trova.

#### Metadata
  * type: requirement

#### Relations
  * satisfiedBy: [secret-scan.yml](../../.github/workflows/secret-scan.yml)
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Scansione dei segreti prima della pubblicazione

Quando viene creato un tag di release valido, il progetto non deve pubblicare immagini del satellite se la scansione dei segreti della stessa revisione non è superata.

#### Metadata
  * type: requirement

#### Contract References
  * [Profilo della scansione dei segreti con gitleaks](../Contracts/VoiceSatellite.md#profilo-della-scansione-dei-segreti-con-gitleaks)

#### Relations
  * satisfiedBy: [publish-image.yml](../../.github/workflows/publish-image.yml)
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Segnale acustico di disponibilità

Ogni volta che sta per aprire il microfono per un turno della persona, il satellite deve emettere un breve segnale acustico locale e ammettere il parlato soltanto dopo il segnale, così la persona sa quando può parlare.

#### Metadata
  * type: requirement

#### Relations
  * satisfiedBy: [ready-cue.ts](../../src/adapters/out/ready-cue.ts)
  * satisfiedBy: [voice-session.use-case.ts](../../src/application/voice-session.use-case.ts)
  * satisfiedBy: [voice-turn.ts](../../src/domain/voice-turn.ts)
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Selezione del file di configurazione

Il satellite deve permettere di selezionare il percorso del file di configurazione mediante un’opzione di avvio.

#### Metadata
  * type: requirement

#### Contract References
  * [Configurazione del processo satellite](../Contracts/VoiceSatellite.md#configurazione-del-processo-satellite)

#### Relations
  * satisfiedBy: [main.ts](../../src/main.ts)
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Selezione della wake word configurata

Quando carica la configurazione, il satellite deve selezionare il modello di wake word richiesto dal catalogo distribuito oppure da un file ONNX compatibile presente nella directory dei modelli montata sull'installazione. Deve rifiutare identificatori sconosciuti o che possano uscire dalla directory dei modelli.

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
  * satisfiedBy: [diagnostics.ts](../../src/adapters/out/diagnostics.ts)
  * satisfiedBy: [main.ts](../../src/main.ts)
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Separazione Domain Application e adapter

Il satellite deve separare regole e stati in Domain, coordinamento e porte in Application e integrazioni tecniche negli adapter, mantenendo Domain e Application indipendenti dalle librerie tecniche.

#### Metadata
  * type: requirement

#### Relations
  * satisfiedBy: [voice-session.use-case.ts](../../src/application/voice-session.use-case.ts)
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Serializzazione protetta dei guasti

Quando registra un guasto inatteso, il satellite deve passare al logger il campo err con l’Error originale o un Error con causa originale per valori diversi, serializzando soltanto una vista sicura senza modificare il guasto in memoria.

#### Metadata
  * type: requirement

#### Relations
  * satisfiedBy: [diagnostics.ts](../../src/adapters/out/diagnostics.ts)
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
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
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Supporto Linux su due architetture

Il satellite deve poter essere eseguito su Linux x86_64 e arm64 senza richiedere uno specifico modello di dispositivo hardware.

#### Metadata
  * type: requirement

#### Contract References
  * [Esecuzione host e container](../Contracts/VoiceSatellite.md#esecuzione-host-e-container)

#### Relations
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Tono di errore per backend irraggiungibile

Quando non riesce ad avviare un’interazione perché il backend non è raggiungibile, il satellite deve segnalare il fallimento riproducendo il tono di errore locale generato dal programma, senza messaggi parlati.

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
  * [Tono locale di errore](../Contracts/VoiceSatellite.md#tono-locale-di-errore)

#### Relations
  * satisfiedBy: [ready-cue.ts](../../src/adapters/out/ready-cue.ts)
  * satisfiedBy: [response-playback.ts](../../src/adapters/out/response-playback.ts)
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Unicità della diagnosi definitiva

Quando un guasto raggiunge il confine tecnico responsabile della sua gestione, il satellite deve emettere una sola diagnosi definitiva senza duplicarla nei componenti intermedi.

#### Metadata
  * type: requirement

#### Relations
  * satisfiedBy: [voice-session.use-case.ts](../../src/application/voice-session.use-case.ts)
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Uso di Pino per la diagnostica

Il satellite deve emettere i propri log tecnici mediante Pino al confine responsabile della diagnosi.

#### Metadata
  * type: requirement

#### Relations
  * satisfiedBy: [diagnostics.ts](../../src/adapters/out/diagnostics.ts)
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Validazione prima della costruzione delle risorse

Il satellite deve caricare e validare la configurazione prima di costruire le risorse operative.

#### Metadata
  * type: requirement

#### Relations
  * satisfiedBy: [main.ts](../../src/main.ts)
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

