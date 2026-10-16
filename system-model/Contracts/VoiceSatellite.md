# Elements

### Attivazione e riserva audio

La famiglia può pronunciare Hey Jarvis e la richiesta nella stessa frase. L’audio necessario è conservato temporaneamente in memoria durante il riconoscimento locale e l’apertura del canale; la trasmissione del turno comincia soltanto dopo l’ammissione prevista dal backend. Il modello della wake word può essere diverso se selezionato dal catalogo distribuito. Capacità della riserva, limite di attesa della connessione e comportamento al superamento dei limiti restano da concordare: non si assume una memoria illimitata né una garanzia in presenza di una connessione che non si apre.

#### Metadata
  * type: behavior

#### Relations
  * define: [Conservazione della richiesta continua](../Requirements/VoiceSatellite.md#conservazione-della-richiesta-continua)
---

### Catalogo e selezione dei modelli

Il file JSON seleziona un modello del catalogo fornito dal progetto. Hey Jarvis è il predefinito. La prima versione non carica percorsi di modelli personalizzati esterni. Il catalogo deve includere più modelli openWakeWord in formato ONNX utilizzabili dal motore locale nel processo Node.js. I modelli aggiuntivi, i loro identificatori, le versioni e le soglie di rilevamento saranno definiti dopo la verifica delle risorse candidabili e delle relative licenze. Un identificatore non disponibile è una configurazione invalida.

#### Metadata
  * type: specification

#### Relations
  * define: [Selezione della wake word configurata](../Requirements/VoiceSatellite.md#selezione-della-wake-word-configurata)
---

### Condizioni del catalogo non commerciale

La distribuzione dei modelli wake word del satellite è destinata all'uso non commerciale. Prima di includere un modello nel catalogo, registrare origine e versione del file, condizioni di redistribuzione, licenza e attribuzioni richieste; consegnare tali informazioni sia con l'installazione host sia con l'immagine container. Non dedurre la licenza del codice del satellite da quella dei modelli.

Il progetto openWakeWord dichiara il proprio codice Apache-2.0 e i modelli preaddestrati inclusi CC BY-NC-SA 4.0: https://github.com/dscripka/openWakeWord#license . Questa è una fonte per valutare i modelli candidati, non una scelta già compiuta del motore o dei file da distribuire. La licenza e la provenienza di ciascun file effettivamente selezionato vanno verificate prima del confezionamento.

#### Metadata
  * type: specification

#### Relations
  * define: [Condizioni di distribuzione dei modelli wake word](../Requirements/VoiceSatellite.md#condizioni-di-distribuzione-dei-modelli-wake-word)
---

### Configurazione del processo satellite

Un solo file JSON configura indirizzo del backend, dispositivi di ingresso e uscita audio e modello della wake word. Un’opzione di avvio seleziona il file; i valori non sono sovrascritti dalle variabili d’ambiente. La configurazione viene validata prima dell’avvio operativo e una configurazione invalida produce un errore comprensibile. Host e container usano lo stesso schema. Nomi dei campi, nome dell’opzione, schema completo e impostazioni aggiuntive richiedono ancora specificazione; non sono definiti URL predefiniti del backend.

#### Metadata
  * type: specification

#### Relations
  * define: [Configurazione JSON unica](../Requirements/VoiceSatellite.md#configurazione-json-unica)
---

### Contratto vocale backend di riferimento

La revisione backend candidata per il satellite è ambrogio-backend al commit 1e7c9fbc7a91876f53aae98f4c1fc41f6400472e: https://github.com/adrianofoschi/ambrogio-backend/blob/1e7c9fbc7a91876f53aae98f4c1fc41f6400472e/system-model/Contracts/FamilyConversation.md . I contratti pertinenti sono Protocollo vocale del prodotto, Conferma della fine della risposta parlata, Stati dell'interazione vocale e Indicazione di attesa della replica vocale. Questa revisione implementa la concorrenza per conversazione e consegna `metadata.expectsReply` nei messaggi Micdrop dell'assistente. Le verifiche automatiche backend coprono la generazione strutturata, il messaggio vocale e la chiusura dell'interazione. La compatibilità della prima versione del satellite non è ancora dimostrata: occorrono il client e prove di integrazione contro questa revisione prima di dichiararla compatibile. Le relazioni Reqvire restano interne a ciascun repository; il riferimento esterno non fonde i grafi.

#### Evoluzione della concorrenza
Decisione concordata e implementata nel backend: sono ammessi turni in parallelo tra conversazioni diverse e al massimo un turno attivo per ciascuna conversazione. Il conflitto riguarda la stessa conversazione, indipendentemente dal client o dal canale; i turni rifiutati non sono accodati. Ogni satellite mantiene il proprio ciclo locale e le interazioni degli altri client non ne sostituiscono lo stato. Le verifiche automatiche backend coprono il comportamento HTTP, le connessioni vocali simultanee e la migrazione dell'occupazione SQLite. Eventuali limiti globali di capacità restano da concordare.

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

Il tipo locale è `type Result<T, E> = Readonly<{ ok: true; value: T }> | Readonly<{ ok: false; error: E }>`. I rifiuti previsti sono tipi nominati immutabili, distinti mediante `kind`, senza classi o instanceof. Ogni porta e caso d’uso dichiara i propri rifiuti; non esiste un catalogo globale. Application interpreta gli esiti delle porte e restituisce le proprie varianti, gestite esaustivamente dagli adapter inbound. I guasti inattesi sono Error; un nuovo Error aggiunge contesto soltanto quando utile, preservando l’originale con cause. Il confine tecnico responsabile produce la diagnosi definitiva; i passaggi intermedi propagano senza log duplicati. Gli esiti previsti non producono automaticamente log di errore. Il messaggio pubblico resta separato dalla diagnosi tecnica. Le varianti concrete, le politiche di recupero ancora aperte e la libreria di logging restano da specificare.

#### Metadata
  * type: specification

#### Relations
  * define: [Esiti previsti come valori tipizzati](../Requirements/VoiceSatellite.md#esiti-previsti-come-valori-tipizzati)
---

### Motore locale della wake word con ONNX

La prima versione esegue nel processo TypeScript/Node.js del satellite la pipeline di riconoscimento openWakeWord con modelli ONNX, usando il binding Node.js di ONNX Runtime. Il riconoscimento della wake word rimane locale al satellite. I modelli e le risorse condivise necessari alla pipeline sono caricati dai file distribuiti con l'applicazione; il satellite non richiede un servizio Wyoming per questa funzione.

Lo spike in `/home/adriano/projects/ambrogio-spike/satellite/spike/` dimostra la fattibilità iniziale su Raspberry Pi con Hey Jarvis, ma non costituisce una prova di affidabilità o prestazioni delle distribuzioni finali. Versioni dei pacchetti, soglie di rilevamento, catalogo dei modelli e limiti di risorse richiedono ancora specificazione e verifiche su Linux x86_64 e arm64, in esecuzione host e container. Il supporto dei binari Node.js per Linux x64 e arm64 è documentato da ONNX Runtime: https://onnxruntime.ai/docs/get-started/with-javascript/node.html .

#### Metadata
  * type: specification

#### Relations
  * define: [Ascolto locale della wake word](../Requirements/VoiceSatellite.md#ascolto-locale-della-wake-word)
---

### Recupero locale da backend irraggiungibile

Il messaggio di fallimento è una registrazione audio disponibile localmente nella distribuzione, riproducibile anche quando il backend non risponde. Dopo il messaggio il processo resta attivo e torna ad attendere la wake word. Una nuova attivazione tenta una nuova interazione. Non si conserva la richiesta fallita per reinviarla automaticamente. Il testo della registrazione e il comportamento per disconnessioni a turno già avviato restano da definire.

#### Metadata
  * type: behavior

#### Relations
  * define: [Ripristino dopo backend irraggiungibile](../Requirements/VoiceSatellite.md#ripristino-dopo-backend-irraggiungibile)
---

### Regole della replica vocale

Il backend è l'autorità che determina e comunica se la risposta attende una replica. Durante la generazione della risposta l'agente produce insieme al testo il booleano strutturato `expectsReply`, senza una seconda chiamata al modello dedicata alla classificazione. Il backend lo invia nel campo `metadata.expectsReply` del messaggio Micdrop `Message` con `role: "assistant"`; non introduce un evento WebSocket separato. Il satellite non decide osservando un punto interrogativo o classificando localmente il testo.

Il satellite associa il messaggio alla risposta corrente sulla stessa WebSocket, dove è attivo un solo turno per conversazione. Attende sia il messaggio dell'assistente con booleano valido sia la fine effettiva della riproduzione prima di decidere; invia `Played` alla fine della riproduzione. Se il valore è `true`, la replica usa l'interazione corrente entro la finestra di inattività; se è `false`, torna alla wake word. Se il valore manca o non è booleano, non apre una replica: dopo la riproduzione attende al massimo l'intervallo di inattività configurato per un messaggio valido tardivo, poi chiude l'interazione e torna alla wake word. Ignora un messaggio arrivato dopo la chiusura e non usa la punteggiatura come ripiego.

#### Metadata
  * type: behavior

#### Relations
  * define: [Replica richiesta dal backend](../Requirements/VoiceSatellite.md#replica-richiesta-dal-backend)
---

### Regole di importazione dei test

I test Domain importano codice di produzione soltanto da Domain. I test Application importano soltanto Application e Domain. I test inbound importano il proprio adapter inbound e Application, senza Domain. I test outbound importano il proprio adapter outbound, Application e Domain, senza adapter inbound. Le regole valgono anche per i soli tipi. Le prove di integrazione della composition root possono attraversare i layer; non sono test unitari di un layer. Nei test Application le porte permettono di simulare audio, riconoscimento e backend senza dispositivi reali. Il runner resta da scegliere.

#### Metadata
  * type: constraint

#### Relations
  * define: [Confini degli import nei test](../Requirements/VoiceSatellite.md#confini-degli-import-nei-test)
---

### Responsabilità interne del satellite

Domain contiene stati e regole dell’interazione locale. Application coordina i casi d’uso e dichiara porte nei termini delle capacità richieste. Gli adapter inbound invocano Application; gli adapter outbound realizzano le porte. Audio, wake word e trasporto restano negli adapter; Domain e Application non importano librerie tecniche, neppure soltanto per i tipi. La composition root costruisce risorse e collega le porte. Il satellite resta un solo progetto nel proprio repository, senza workspace multipackage. Non si introducono contenitori generici shared, common o utils senza una decisione esplicita. Nomi delle cartelle, versioni e librerie restano da scegliere.

#### Metadata
  * type: specification

#### Relations
  * define: [Separazione Domain Application e adapter](../Requirements/VoiceSatellite.md#separazione-domain-application-e-adapter)
---

