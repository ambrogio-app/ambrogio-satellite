# Elements

### Ascolto locale della wake word

Mentre attende una nuova interazione, il satellite deve acquisire continuamente il segnale del microfono e riconoscere la wake word esclusivamente in locale.

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

### Attesa della fine della risposta

Mentre riproduce la risposta di Ambrogio, il satellite deve attendere la fine della riproduzione senza consentire interruzioni vocali né ammettere nuovi turni.

#### Metadata
  * type: requirement

#### Relations
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Avvio dopo la wake word

Quando riconosce la wake word mentre attende una nuova interazione, il satellite deve aprire il canale vocale pubblico del backend.

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

Il satellite deve mettere a disposizione più modelli di wake word distribuiti e supportati dal progetto, includendo Hey Jarvis come modello predefinito.

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

### Configurazione JSON unica

Il satellite deve leggere da un file JSON la configurazione del backend, dei dispositivi audio e della wake word, usando gli stessi significati sull’host e nel container.

#### Metadata
  * type: requirement

#### Relations
  * specify: [Interazione vocale dal satellite](../Capabilities/VoiceSatellite.md#interazione-vocale-dal-satellite)
---

### Conservazione della richiesta continua

Quando la famiglia pronuncia la wake word e la richiesta senza pausa, il satellite deve conservare temporaneamente in memoria il parlato necessario a non perdere l’inizio della richiesta durante il riconoscimento e l’apertura della connessione.

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

### Modello autonomo del satellite

Il satellite deve mantenere il proprio codice e modello Reqvire in un repository autonomo, registrando la dipendenza dal contratto pubblico posseduto dal backend.

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

### Replica richiesta dal backend

Quando termina la riproduzione di una risposta per cui il backend segnala di attendere una replica, il satellite deve permettere alla famiglia di rispondere senza wake word nella stessa interazione, finché essa resta attiva.

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

