# Elements

### Adapter audio con Decibri

La prima versione usa Decibri negli adapter tecnici del processo Node.js per acquisire audio dal microfono configurato e riprodurre le risposte sul dispositivo di uscita configurato. La stessa selezione logica dei dispositivi vale su host e nel container; gli identificatori fisici disponibili possono differire tra macchine. Domain e Application vedono soltanto le porte audio, senza importare tipi o oggetti Decibri.

L'adapter di uscita conserva l'ordine dei blocchi audio e considera completata una risposta soltanto dopo che i campioni accodati sono stati effettivamente riprodotti. Chiude o rilascia lo speaker quando non serve più; lo spike ha osservato errori ricorrenti lasciando un'uscita ALSA inattiva aperta. Errori di apertura, disconnessione o riproduzione attraversano le porte come esiti o guasti appropriati secondo le regole del satellite.

Decibri fornisce binari nativi per Linux x64 e arm64 e richiede la libreria runtime ALSA `libasound.so.2`; versione da fissare e comportamento reale da provare su entrambe le architetture, su host e in Docker. API e dipendenze documentate: https://decibri.com/docs/apis/node .

#### Metadata
  * type: specification

#### Relations
  * define: [Configurazione JSON unica](../Requirements/VoiceSatellite.md#configurazione-json-unica)
---

### Attivazione e riserva audio

La famiglia può pronunciare Hey Jarvis e la richiesta nella stessa frase. L’audio necessario è conservato temporaneamente in memoria durante il riconoscimento locale e l’apertura del canale; la trasmissione del turno comincia soltanto dopo l’ammissione prevista dal backend. Il modello della wake word può essere diverso se selezionato dal catalogo distribuito. Capacità della riserva, limite di attesa della connessione e comportamento al superamento dei limiti restano da concordare: non si assume una memoria illimitata né una garanzia in presenza di una connessione che non si apre.

#### Metadata
  * type: behavior

#### Relations
  * define: [Conservazione della richiesta continua](../Requirements/VoiceSatellite.md#conservazione-della-richiesta-continua)
---

### Catalogo e selezione dei modelli

Il file JSON seleziona un modello del catalogo fornito dal progetto. Hey Jarvis è il predefinito. La prima versione non carica percorsi di modelli personalizzati esterni. Il catalogo iniziale contiene le frasi «Hey Jarvis», «Hey Mycroft» e «Hey Alexa», ciascuna associata a un modello ONNX distribuito e verificato con il motore locale Node.js. I modelli openWakeWord per Hey Jarvis e Hey Mycroft sono candidati diretti. Il modello openWakeWord denominato «alexa» è addestrato per «Alexa»: la documentazione segnala che «Hey Alexa» può funzionare con più mancati riconoscimenti (https://github.com/dscripka/openWakeWord/blob/main/docs/models/alexa.md). Per la voce «Hey Alexa» occorre quindi dimostrare il riconoscimento della frase esatta con il modello candidato; se non è adeguato, serve un altro modello ONNX verificato prima di dichiarare il catalogo completo. Identificatori della configurazione, versioni dei file e soglie di rilevamento restano da specificare dopo la verifica dei modelli e delle licenze. Un identificatore non disponibile è una configurazione invalida.

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

Un solo file JSON configura indirizzo del backend, dispositivi di ingresso e uscita audio, modello della wake word e intervallo locale di inattività per la replica. Un'opzione di avvio seleziona il file; i valori non sono sovrascritti dalle variabili d'ambiente. L'intervallo è positivo e ha valore predefinito di 15 secondi. La configurazione viene validata prima dell'avvio operativo e una configurazione invalida produce un errore comprensibile. Host e container usano lo stesso schema. Nomi dei campi, nome dell'opzione, schema completo e impostazioni aggiuntive richiedono ancora specificazione; non sono definiti URL predefiniti del backend.

#### Metadata
  * type: specification

#### Relations
  * define: [Configurazione JSON unica](../Requirements/VoiceSatellite.md#configurazione-json-unica)
---

### Contratto vocale backend di riferimento

La revisione backend candidata per il satellite è ambrogio-backend al commit 512317c9e93b4e6ab7a1e32dd9c210436b7b5c06: https://github.com/adrianofoschi/ambrogio-backend/blob/512317c9e93b4e6ab7a1e32dd9c210436b7b5c06/system-model/Contracts/FamilyConversation.md . I contratti pertinenti sono Protocollo vocale del prodotto, Chiusura coordinata con la riproduzione, Stati dell'interazione vocale e Indicazione di attesa della replica vocale. Questa revisione implementa la concorrenza per conversazione, ammette e crea la conversazione prima dell'upgrade WebSocket, consegna `metadata.expectsReply` nei messaggi Micdrop dell'assistente e presenta i rifiuti dei turni vocali come risposte parlate con `expectsReply: false`. Il satellite possiede la decisione di chiusura dopo la riproduzione e l'intervallo locale di inattività. Le verifiche automatiche backend coprono ammissione, generazione strutturata, messaggio vocale e chiusura della sessione. La compatibilità della prima versione del satellite non è ancora dimostrata: occorrono il client e prove di integrazione contro questa revisione prima di dichiararla compatibile. Le relazioni Reqvire restano interne a ciascun repository; il riferimento esterno non fonde i grafi.

#### Evoluzione della concorrenza
Decisione concordata e implementata nel backend: sono ammessi turni in parallelo tra conversazioni diverse e al massimo un turno attivo per ciascuna conversazione. Il conflitto riguarda la stessa conversazione, indipendentemente dal client o dal canale; i turni rifiutati non sono accodati. Ogni satellite mantiene il proprio ciclo locale e le interazioni degli altri client non ne sostituiscono lo stato. Le verifiche automatiche backend coprono il comportamento HTTP, le connessioni vocali simultanee e la migrazione dell'occupazione SQLite. Eventuali limiti globali di capacità restano da concordare.

#### Metadata
  * type: source

#### Relations
  * define: [Compatibilità con il canale vocale backend](../Requirements/VoiceSatellite.md#compatibilità-con-il-canale-vocale-backend)
---

### Esecuzione host e container

L’applicazione TypeScript su Node.js funziona direttamente su Linux x86_64 e arm64 con dipendenze e modelli installati. Docker è una modalità facoltativa che confeziona la stessa applicazione per linux/amd64 e linux/arm64. La configurazione ha lo stesso significato in entrambe le modalità. L'adapter audio Decibri richiede il proprio binario nativo per la piattaforma e la libreria runtime ALSA `libasound.so.2`; il pacchetto host documenta la dipendenza e l'immagine container la include con accesso esplicito alle periferiche. La baseline Linux, la versione di Decibri, le altre dipendenze native e le istruzioni di installazione devono essere definite e verificate; il solo supporto dell’architettura non dimostra compatibilità con ogni distribuzione o periferica.

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

### Protezione degli invii Micdrop

La versione pubblicata di `@micdrop/client` 3.4.0 può chiamare `WebSocket.send` mentre il socket è ancora in `CONNECTING`. Fino a una correzione upstream verificata, la distribuzione applica una patch locale ripetibile che consente gli invii del client soltanto quando il socket è aperto. La patch controlla versione e punti modificati e fa fallire la preparazione del pacchetto se il codice atteso cambia; non modifica silenziosamente una nuova versione.

Il satellite non interpreta la mancata trasmissione durante l'apertura come consegna riuscita del turno. I tentativi automatici di riconnessione sono disabilitati perché una nuova WebSocket creerebbe una nuova conversazione. Quando una versione pubblicata corregge il difetto, la prova di apertura va ripetuta prima di rimuovere la patch.

#### Metadata
  * type: specification

#### Relations
  * define: [Invio sicuro durante connessione e riconnessione](../Requirements/VoiceSatellite.md#invio-sicuro-durante-connessione-e-riconnessione)
---

### Recupero locale da backend irraggiungibile

Il messaggio di fallimento è una registrazione audio disponibile localmente nella distribuzione, riproducibile anche quando il backend non risponde. Dopo il messaggio il processo resta attivo e torna ad attendere la wake word. Una nuova attivazione tenta una nuova interazione. Non si conserva la richiesta fallita per reinviarla automaticamente. Il testo della registrazione e il comportamento per disconnessioni a turno già avviato restano da definire.

#### Metadata
  * type: behavior

#### Relations
  * define: [Ripristino dopo backend irraggiungibile](../Requirements/VoiceSatellite.md#ripristino-dopo-backend-irraggiungibile)
---

### Regole della replica vocale

Il backend determina e comunica se la risposta attende una replica. Durante la stessa generazione della risposta l'agente produce il booleano strutturato `expectsReply`, senza una seconda chiamata al modello dedicata alla classificazione. Il backend lo invia nel campo `metadata.expectsReply` del messaggio Micdrop `Message` con `role: "assistant"`. Se il caso d'uso condiviso rifiuta un turno vocale, il backend produce una risposta parlata sicura nella lingua configurata, con `metadata.expectsReply: false`; il satellite la tratta come una risposta conclusiva.

Il satellite associa il messaggio alla risposta corrente della chiamata Micdrop. Attende sia il messaggio con booleano valido sia la fine effettiva della riproduzione Decibri. Se il valore è `true`, apre una finestra locale di inattività di 15 secondi predefiniti e ammette una replica senza wake word sulla stessa chiamata; il valore configurato deve essere positivo. Se è `false`, chiude la chiamata dopo la riproduzione e torna alla wake word. Se manca un valore booleano, non apre una replica: attende al massimo l'intervallo locale configurato per un messaggio valido tardivo, poi chiude. Ignora messaggi arrivati dopo la chiusura. L'intervallo ricomincia dopo ogni nuova risposta riprodotta. Il backend rilascia la sessione quando la WebSocket si chiude; non serve un comando `Played`.

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

### Segmentazione dei turni con Silero ONNX

La prima versione usa Silero VAD in formato ONNX nel processo Node.js del satellite per individuare i tratti di parlato durante un'interazione ammessa. L'adapter audio/VAD esegue il modello con ONNX Runtime e segnala al client Micdrop l'inizio, i frame e la fine di ciascun turno. MicdropClient trasporta `StartSpeaking`, audio PCM16 mono a 16 kHz e `StopSpeaking` secondo il contratto vocale del backend. Durante la riproduzione della risposta il satellite non ammette nuovi turni né interrompe l'audio in uscita.

Il modello Silero e la sua licenza devono accompagnare la distribuzione: https://github.com/snakers4/silero-vad . Lo spike mostra che Silero gestisce una risposta breve che il rilevamento basato sul volume perdeva, ma non determina ancora la versione del modello, la soglia, la durata del silenzio di chiusura, l'uso di CPU né i limiti di latenza. Tali valori richiedono prove su Linux x86_64 e arm64, comprese risposte brevi e frasi con pause interne.

#### Metadata
  * type: behavior

#### Relations
  * define: [Delimitazione locale dei turni vocali](../Requirements/VoiceSatellite.md#delimitazione-locale-dei-turni-vocali)
---

### Trasporto vocale con Micdrop

La prima versione usa `@micdrop/client` 3.4.0 nell'adapter outbound, con i driver Decibri per ingresso e uscita e Silero ONNX per il rilevamento del parlato. `MicdropClient` delimita e trasporta i turni vocali standard; Domain e Application dipendono soltanto dalle porte del satellite. Il backend ammette la conversazione prima dell'upgrade WebSocket, così il client può iniziare a trasmettere dopo l'apertura senza attendere un comando aggiuntivo. Il satellite usa i messaggi Micdrop `Message` con `metadata.expectsReply`, l'audio in streaming e gli stati `isAssistantSpeaking` ed `Error`; non richiede `Ready`, `TurnRejected` o `Played`.

Una nuova WebSocket crea una nuova conversazione backend. Il client non deve quindi riprendere automaticamente una vecchia interazione su una connessione nuova; il ricongiungimento richiederebbe un contratto separato. L'adapter disabilita i tentativi automatici di riconnessione di Micdrop e torna alla gestione locale del fallimento e della wake word. La revisione backend compatibile è quella registrata nel «Contratto vocale backend di riferimento» e richiede una prova reale prima di essere dichiarata compatibile. Fonte del protocollo Micdrop: https://micdrop.dev/docs/server/protocol .

#### Metadata
  * type: specification

#### Relations
  * define: [Compatibilità con il canale vocale backend](../Requirements/VoiceSatellite.md#compatibilità-con-il-canale-vocale-backend)
---

