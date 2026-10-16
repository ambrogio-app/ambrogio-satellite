# Elements

### Ascolto locale della wake word

Mentre attende una nuova interazione, il satellite deve acquisire continuamente il segnale del microfono e riconoscere la wake word esclusivamente in locale.

#### Concept References
  * [Wake word](../Thesaurus/Lessico.md#wake-word)
  * [Attivazione locale](../Thesaurus/Lessico.md#attivazione-locale)
  * [Dispositivo audio](../Thesaurus/Lessico.md#dispositivo-audio)

#### Metadata
  * type: requirement

#### Relations
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Assemblaggio delle risorse nella composition root

Il satellite deve assemblare le porte e le risorse tecniche nella composition root del processo.

#### Metadata
  * type: requirement

#### Relations
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Assenza di logger nei layer interni

Domain e casi d’uso Application del satellite devono restare indipendenti dal logger.

#### Metadata
  * type: requirement

#### Relations
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Assenza di override da ambiente

Il satellite deve preservare i valori letti dal file JSON senza sovrascriverli mediante variabili d’ambiente.

#### Metadata
  * type: requirement

#### Contract References
  * [Configurazione del processo satellite](../Contracts/VoiceSatellite.md#configurazione-del-processo-satellite)

#### Relations
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Assenza di registrazioni audio persistenti

Il satellite non deve conservare su memoria persistente l’audio acquisito dalle persone o ricevuto come risposta durante le interazioni.

#### Metadata
  * type: requirement

#### Relations
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Attesa della fine della risposta

Mentre riproduce la risposta di Ambrogio, il satellite deve attendere la fine della riproduzione senza consentire interruzioni vocali né ammettere nuovi turni.

#### Metadata
  * type: requirement

#### Relations
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Avvio dopo la wake word

Quando riconosce la wake word mentre attende una nuova interazione, il satellite deve aprire il canale vocale pubblico del backend.

#### Concept References
  * [Attivazione locale](../Thesaurus/Lessico.md#attivazione-locale)
  * [Interazione vocale](../Thesaurus/Lessico.md#interazione-vocale)
  * [Backend vocale](../Thesaurus/Lessico.md#backend-vocale)

#### Metadata
  * type: requirement

#### Contract References
  * [Contratto vocale backend di riferimento](../Contracts/VoiceSatellite.md#contratto-vocale-backend-di-riferimento)

#### Relations
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Avviso parlato di backend irraggiungibile

Quando non riesce ad avviare un’interazione perché il backend non è raggiungibile, il satellite deve segnalare il fallimento con un messaggio parlato preregistrato locale incluso nella distribuzione.

#### Metadata
  * type: requirement

#### Contract References
  * [Recupero locale da backend irraggiungibile](../Contracts/VoiceSatellite.md#recupero-locale-da-backend-irraggiungibile)

#### Relations
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Catalogo distribuito delle wake word

Il satellite deve mettere a disposizione modelli di wake word distribuiti e supportati per le frasi «Hey Jarvis», «Hey Mycroft» e «Hey Alexa», con «Hey Jarvis» come scelta predefinita.

#### Concept References
  * [Catalogo delle wake word](../Thesaurus/Lessico.md#catalogo-delle-wake-word)
  * [Modello di wake word](../Thesaurus/Lessico.md#modello-di-wake-word)

#### Metadata
  * type: requirement

#### Relations
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Compatibilità con il canale vocale backend

Il satellite deve scambiare audio ed eventi con il backend secondo una versione esplicita del contratto vocale pubblico registrata nel proprio modello.

#### Metadata
  * type: requirement

#### Relations
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
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Configurazione JSON unica

Il satellite deve leggere da un file JSON la configurazione del backend, dei dispositivi audio e della wake word, usando gli stessi significati sull’host e nel container.

#### Concept References
  * [Configurazione del satellite](../Thesaurus/Lessico.md#configurazione-del-satellite)
  * [Dispositivo audio](../Thesaurus/Lessico.md#dispositivo-audio)
  * [Modello di wake word](../Thesaurus/Lessico.md#modello-di-wake-word)

#### Metadata
  * type: requirement

#### Relations
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Confini degli import nei test

I test del satellite devono rispettare i confini di importazione del layer verificato, anche per gli import di soli tipi.

#### Metadata
  * type: requirement

#### Relations
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Conservazione della causa dei guasti

Quando aggiunge contesto a un guasto inatteso, il satellite deve conservare l’errore originale nella catena delle cause.

#### Metadata
  * type: requirement

#### Relations
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Conservazione della richiesta continua

Quando la famiglia pronuncia la wake word e la richiesta senza pausa, il satellite deve conservare temporaneamente in memoria il parlato necessario a non perdere l’inizio della richiesta durante il riconoscimento e l’apertura della connessione.

#### Concept References
  * [Riserva audio](../Thesaurus/Lessico.md#riserva-audio)
  * [Turno vocale](../Thesaurus/Lessico.md#turno-vocale)

#### Metadata
  * type: requirement

#### Relations
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
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Esclusione delle configurazioni personali dagli artefatti

Il satellite deve escludere configurazioni personali e credenziali dagli artefatti distribuiti e dagli esempi di configurazione.

#### Metadata
  * type: requirement

#### Relations
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Esecuzione diretta sul sistema host

Il satellite deve poter essere installato ed eseguito direttamente sul sistema host con runtime, dipendenze e modelli necessari, senza richiedere Docker.

#### Metadata
  * type: requirement

#### Contract References
  * [Esecuzione host e container](../Contracts/VoiceSatellite.md#esecuzione-host-e-container)

#### Relations
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Esiti previsti come valori tipizzati

Quando Domain, Application o una porta prevedono un esito negativo nel proprio contratto, il satellite deve rappresentarlo come valore tipizzato distinguibile dal successo.

#### Metadata
  * type: requirement

#### Relations
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Gestione dei guasti inattesi

Quando si verifica un guasto inatteso, il satellite deve propagarlo come eccezione fino al confine tecnico responsabile della gestione e della diagnostica.

#### Metadata
  * type: requirement

#### Relations
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Gestione esaustiva dei rifiuti previsti

I chiamanti delle porte e dei casi d’uso devono gestire esplicitamente tutte le varianti dei rifiuti previsti dai rispettivi contratti.

#### Metadata
  * type: requirement

#### Relations
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Log tecnici JSON su stdout

Il satellite deve emettere ogni evento diagnostico tecnico come una singola riga JSON su stdout.

#### Metadata
  * type: requirement

#### Relations
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
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Nuova attivazione dopo il fallimento

Quando la famiglia attiva nuovamente il satellite dopo un fallimento per backend irraggiungibile, il satellite deve tentare una nuova interazione senza conservare la richiesta fallita per un reinvio automatico.

#### Metadata
  * type: requirement

#### Contract References
  * [Recupero locale da backend irraggiungibile](../Contracts/VoiceSatellite.md#recupero-locale-da-backend-irraggiungibile)

#### Relations
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Progetto unico del satellite

Il satellite deve organizzare Domain, Application e adapter in un solo progetto, senza suddivisione in package di workspace.

#### Metadata
  * type: requirement

#### Relations
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
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Rifiuto della configurazione invalida

Quando la configurazione è invalida, il satellite deve impedirne l’avvio operativo e comunicare un errore comprensibile.

#### Metadata
  * type: requirement

#### Contract References
  * [Configurazione del processo satellite](../Contracts/VoiceSatellite.md#configurazione-del-processo-satellite)

#### Relations
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Ripristino dopo backend irraggiungibile

Quando ha segnalato il fallimento di un’interazione per backend irraggiungibile, il satellite deve tornare in attesa della wake word senza richiedere il riavvio del processo.

#### Metadata
  * type: requirement

#### Relations
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Riproduzione della risposta vocale

Quando riceve la risposta vocale del backend, il satellite deve riprodurla sul dispositivo di uscita configurato.

#### Concept References
  * [Risposta parlata](../Thesaurus/Lessico.md#risposta-parlata)
  * [Dispositivo audio](../Thesaurus/Lessico.md#dispositivo-audio)

#### Metadata
  * type: requirement

#### Contract References
  * [Contratto vocale backend di riferimento](../Contracts/VoiceSatellite.md#contratto-vocale-backend-di-riferimento)

#### Relations
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Ritorno alla wake word dopo la risposta

Quando termina la riproduzione di una risposta per cui il backend segnala di non attendere una replica, il satellite deve tornare in attesa della wake word.

#### Metadata
  * type: requirement

#### Contract References
  * [Regole della replica vocale](../Contracts/VoiceSatellite.md#regole-della-replica-vocale)

#### Relations
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Ritorno alla wake word per inattività

Quando il backend chiude l’interazione per inattività, il satellite deve tornare in attesa della wake word.

#### Metadata
  * type: requirement

#### Contract References
  * [Contratto vocale backend di riferimento](../Contracts/VoiceSatellite.md#contratto-vocale-backend-di-riferimento)
  * [Regole della replica vocale](../Contracts/VoiceSatellite.md#regole-della-replica-vocale)

#### Relations
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Selezione del file di configurazione

Il satellite deve permettere di selezionare il percorso del file di configurazione mediante un’opzione di avvio.

#### Metadata
  * type: requirement

#### Contract References
  * [Configurazione del processo satellite](../Contracts/VoiceSatellite.md#configurazione-del-processo-satellite)

#### Relations
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Selezione della wake word configurata

Quando carica la configurazione, il satellite deve selezionare il modello di wake word richiesto esclusivamente dal catalogo distribuito.

#### Metadata
  * type: requirement

#### Relations
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Selezione esplicita dei dati diagnostici

Il satellite deve includere nei log soltanto campi diagnostici selezionati esplicitamente, escludendo audio, contenuti conversazionali e credenziali.

#### Metadata
  * type: requirement

#### Relations
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Separazione Domain Application e adapter

Il satellite deve separare regole e stati in Domain, coordinamento e porte in Application e integrazioni tecniche negli adapter, mantenendo Domain e Application indipendenti dalle librerie tecniche.

#### Metadata
  * type: requirement

#### Relations
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Stack TypeScript e Node.js

Il satellite deve essere implementato in TypeScript ed eseguito su Node.js.

#### Metadata
  * type: requirement

#### Relations
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

### Unicità della diagnosi definitiva

Quando un guasto raggiunge il confine tecnico responsabile della sua gestione, il satellite deve emettere una sola diagnosi definitiva senza duplicarla nei componenti intermedi.

#### Metadata
  * type: requirement

#### Relations
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Validazione prima della costruzione delle risorse

Il satellite deve caricare e validare la configurazione prima di costruire le risorse operative.

#### Metadata
  * type: requirement

#### Relations
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

