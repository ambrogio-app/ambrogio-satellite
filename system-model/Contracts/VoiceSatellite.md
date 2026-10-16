# Elements

### Attivazione e riserva audio

La famiglia può pronunciare Hey Jarvis e la richiesta nella stessa frase. L’audio necessario è conservato temporaneamente in memoria durante il riconoscimento locale e l’apertura del canale; la trasmissione del turno comincia soltanto dopo l’ammissione prevista dal backend. Il modello della wake word può essere diverso se selezionato dal catalogo distribuito. Capacità della riserva, limite di attesa della connessione e comportamento al superamento dei limiti restano da concordare: non si assume una memoria illimitata né una garanzia in presenza di una connessione che non si apre.

#### Metadata
  * type: behavior

#### Relations
  * define: [Conservazione della richiesta continua](../Requirements/VoiceSatellite.md#conservazione-della-richiesta-continua)
---

### Catalogo e selezione dei modelli

Il file JSON seleziona un modello del catalogo fornito dal progetto. Hey Jarvis è il predefinito. La prima versione non carica percorsi di modelli personalizzati esterni. Il catalogo deve includere più modelli; i modelli aggiuntivi, i loro identificatori e il formato dei file saranno definiti dopo la scelta e la verifica del motore di riconoscimento. Un identificatore non disponibile è una configurazione invalida.

#### Metadata
  * type: specification

#### Relations
  * define: [Selezione della wake word configurata](../Requirements/VoiceSatellite.md#selezione-della-wake-word-configurata)
---

### Configurazione del processo satellite

Un solo file JSON configura indirizzo del backend, dispositivi di ingresso e uscita audio e modello della wake word. Un’opzione di avvio seleziona il file; i valori non sono sovrascritti dalle variabili d’ambiente. La configurazione viene validata prima dell’avvio operativo e una configurazione invalida produce un errore comprensibile. Host e container usano lo stesso schema. Nomi dei campi, nome dell’opzione, schema completo e impostazioni aggiuntive richiedono ancora specificazione; non sono definiti URL predefiniti del backend.

#### Metadata
  * type: specification

#### Relations
  * define: [Configurazione JSON unica](../Requirements/VoiceSatellite.md#configurazione-json-unica)
---

### Contratto vocale backend di riferimento

La base pubblicata da esaminare è ambrogio-backend al commit 76e656f08f2e6675762bd93f28208b3ac3fe299d: https://github.com/adrianofoschi/ambrogio-backend/blob/76e656f08f2e6675762bd93f28208b3ac3fe299d/system-model/Contracts/FamilyConversation.md . I contratti pertinenti sono Protocollo vocale del prodotto, Conferma della fine della risposta parlata e Stati dell’interazione vocale. Tale revisione NON contiene ancora il segnale esplicito di attesa di replica deciso per il satellite. La compatibilità della prima versione del satellite non è quindi dimostrata né dichiarata rispetto a quel commit: occorre una revisione backend che realizzi Segnalazione della replica vocale attesa e il relativo contratto Indicazione di attesa della replica vocale. Dopo la sua implementazione si fisserà la revisione compatibile e si eseguiranno prove di integrazione. Le relazioni Reqvire restano interne a ciascun repository; il riferimento esterno non fonde i grafi.

#### Metadata
  * type: source

#### Relations
  * define: [Compatibilità con il canale vocale backend](../Requirements/VoiceSatellite.md#compatibilità-con-il-canale-vocale-backend)
---

### Esecuzione host e container

L’applicazione TypeScript su Node.js funziona direttamente su Linux x86_64 e arm64 con dipendenze e modelli installati. Docker è una modalità facoltativa che confeziona la stessa applicazione per linux/amd64 e linux/arm64. La configurazione ha lo stesso significato in entrambe le modalità. La baseline Linux, le dipendenze native, l’accesso audio e le istruzioni di installazione devono essere definiti e verificati; il solo supporto dell’architettura non dimostra compatibilità con ogni distribuzione o periferica.

#### Metadata
  * type: specification

#### Relations
  * define: [Distribuzione Docker facoltativa](../Requirements/VoiceSatellite.md#distribuzione-docker-facoltativa)
---

### Esiti e diagnostica del satellite

Gli esiti negativi previsti dai contratti di Domain, Application e porte sono valori tipizzati distinguibili dal successo, coerentemente con l’approccio Result del backend. I guasti inattesi risalgono come eccezioni fino al confine tecnico che li gestisce e ne cura la diagnostica. I rifiuti del protocollo backend vengono interpretati dall’adapter secondo il loro significato pubblico. Le varianti concrete degli esiti, le politiche di recupero non ancora concordate e la libreria di logging restano da specificare.

#### Metadata
  * type: specification

#### Relations
  * define: [Esiti previsti come valori tipizzati](../Requirements/VoiceSatellite.md#esiti-previsti-come-valori-tipizzati)
---

### Recupero locale da backend irraggiungibile

Il messaggio di fallimento è una registrazione audio disponibile localmente nella distribuzione, riproducibile anche quando il backend non risponde. Dopo il messaggio il processo resta attivo e torna ad attendere la wake word. Una nuova attivazione tenta una nuova interazione. Non si conserva la richiesta fallita per reinviarla automaticamente. Il testo della registrazione e il comportamento per disconnessioni a turno già avviato restano da definire.

#### Metadata
  * type: behavior

#### Relations
  * define: [Ripristino dopo backend irraggiungibile](../Requirements/VoiceSatellite.md#ripristino-dopo-backend-irraggiungibile)
---

### Regole della replica vocale

Il backend è l’autorità che determina e comunica se la risposta attende una replica. Il satellite non decide osservando un punto interrogativo o classificando localmente il testo. La finestra di replica segue l’interazione vocale del backend e decorre dalla fine effettiva della risposta parlata, secondo il contratto di conferma della riproduzione. Quando il backend attende una replica, questa usa l’interazione corrente; altrimenti il satellite torna alla wake word. La forma del segnale e la sua gestione quando assente o tardivo restano da specificare insieme al backend.

#### Metadata
  * type: behavior

#### Relations
  * define: [Replica richiesta dal backend](../Requirements/VoiceSatellite.md#replica-richiesta-dal-backend)
---

### Responsabilità interne del satellite

Domain contiene gli stati e le regole dell’interazione locale. Application coordina i casi d’uso attraverso porte che ne esprimono i bisogni. Gli adapter integrano acquisizione e riproduzione audio, motore wake word e trasporto verso il backend. Le dipendenze tecniche non entrano in Domain e Application. La suddivisione vive in un unico repository e non impone un monorepo. Il processo usa TypeScript e Node.js; versioni, librerie e organizzazione fisica dei package restano da scegliere.

#### Metadata
  * type: specification

#### Relations
  * define: [Separazione Domain Application e adapter](../Requirements/VoiceSatellite.md#separazione-domain-application-e-adapter)
---

