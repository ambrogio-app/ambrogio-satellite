# Elements

### Adapter audio con Decibri

La prima versione usa Decibri 5.8.0, fissato esattamente nel lockfile, negli adapter tecnici del processo Node.js per acquisire audio dal microfono e riprodurre le risposte sullo speaker. Se il JSON indica un selettore `audio.microphone` o `audio.speaker`, l'adapter usa il dispositivo corrispondente; in assenza del selettore usa il dispositivo predefinito del sistema. Una selezione esplicita non deve essere sostituita silenziosamente dal dispositivo predefinito. La stessa selezione logica vale su host e nel container; gli identificatori fisici disponibili possono differire tra macchine. Domain e Application vedono soltanto le porte audio, senza importare tipi o oggetti Decibri.

L'adapter di uscita conserva l'ordine dei blocchi audio e considera completata una risposta soltanto dopo che i campioni accodati sono stati effettivamente riprodotti. Chiude o rilascia lo speaker quando non serve più; lo spike ha osservato errori ricorrenti lasciando un'uscita ALSA inattiva aperta. Errori di apertura, disconnessione o riproduzione attraversano le porte come esiti o guasti appropriati secondo le regole del satellite.

Decibri fornisce binari nativi per Linux x64 e arm64 e richiede la libreria runtime ALSA `libasound.so.2`; il comportamento reale va provato su entrambe le architetture, su host e in Docker. API e dipendenze documentate: https://decibri.com/docs/apis/node .

#### Metadata
  * type: specification

#### Relations
  * define: [Configurazione JSON unica](../Requirements/VoiceSatellite.md#configurazione-json-unica)
---

### Attivazione e riserva audio

La famiglia può pronunciare Hey Jarvis e la richiesta nella stessa frase. La prima versione conserva in memoria una riserva scorrevole di 1500 ms di audio a 16 kHz durante il riconoscimento locale e l'apertura del canale. Usa la riserva di Micdrop per consegnare l'inizio della richiesta quando la WebSocket si apre; non trasmette audio al backend prima dell'ammissione della conversazione. Se la connessione non si apre entro il limite del client Micdrop o la riserva non basta, il satellite segnala il fallimento e torna alla wake word senza reinvio automatico. Il modello della wake word può essere diverso se selezionato dal catalogo distribuito. La prova su x86_64 e arm64 deve misurare se 1500 ms bastano per la frase continua.

#### Metadata
  * type: behavior

#### Relations
  * define: [Conservazione della richiesta continua](../Requirements/VoiceSatellite.md#conservazione-della-richiesta-continua)
---

### Catalogo e selezione dei modelli

Il file JSON seleziona con `wakeWord.model` un solo identificatore disponibile. L'identificatore predefinito per Hey Jarvis è `hey_jarvis`. La distribuzione contiene `hey_jarvis`, `hey_mycroft` e `alexa`, associati rispettivamente a `hey_jarvis_v0.1.onnx`, `hey_mycroft_v0.1.onnx` e `alexa_v0.1.onnx` della release openWakeWord v0.5.1, con `melspectrogram.onnx` e `embedding_model.onnx` della stessa release. Origine, hash SHA-256, attribuzione e licenza dei file distribuiti sono registrati in `models/wakeword/README.md`; la licenza CC BY-NC-SA 4.0 accompagna i file. L'immagine container include questa directory; un mount in sola lettura su `/app/models/wakeword` la sostituisce. Un file personalizzato `<identificatore>.onnx` nella directory montata aggiunge quell'identificatore al catalogo disponibile, purché il nome sia composto solo da lettere minuscole ASCII, cifre, trattino o sottolineatura, inizi con una lettera o cifra e non sia riservato ai modelli comuni. Il file deve essere un classificatore openWakeWord compatibile; la directory montata deve contenere anche `melspectrogram.onnx` e `embedding_model.onnx`. Un identificatore non disponibile è una configurazione invalida; non si accettano percorsi arbitrari o separatori di directory nella configurazione. La provenienza e la licenza dei modelli personalizzati sono responsabilità di chi li installa.

La frase selezionata per `alexa` è «Alexa», senza «Hey». Il modello openWakeWord è addestrato per questa parola; la documentazione segnala più mancati riconoscimenti possibili per «Hey Alexa» (https://github.com/dscripka/openWakeWord/blob/main/docs/models/alexa.md). Il file ONNX è stato caricato dalla pipeline locale e ha riconosciuto il campione `tests/data/alexa_test.wav` del progetto upstream con la soglia iniziale 0,5. La prova sul microfono reale, la misura delle attivazioni spurie e l'affidabilità finale restano da eseguire su Linux x86_64 e arm64 prima di dichiarare la verifica operativa completa.

#### Metadata
  * type: specification

#### Relations
  * define: [Selezione della wake word configurata](../Requirements/VoiceSatellite.md#selezione-della-wake-word-configurata)
---

### Ciclo di arresto e rilascio delle risorse

Politica concordata: SIGINT e SIGTERM bloccano nuovi eventi, annullano timer e riproduzione (compreso l'avviso locale), chiudono il canale e l'acquisizione e rilasciano le sessioni ONNX. Non si attende la risposta completa del backend. La normale attesa della risposta resta valida fuori dall'arresto.

La composition root possiede il ciclo di vita delle risorse. Tutte le chiusure indipendenti sono tentate anche in presenza di errori. Le operazioni native in corso vengono terminate o attese quanto necessario per un rilascio sicuro; il lavoro accodato viene scartato e nessuna chiamata viene riaperta. Risorse acquisite dopo una richiesta di arresto durante l'avvio vengono subito rilasciate. Un avvio parziale fallito conserva il guasto originale e gli eventuali guasti di pulizia. Richieste concorrenti condividono lo stesso arresto, anche se fallisce; nessun doppio rilascio nativo. I guasti raggiungono il confine di processo per una diagnosi sicura e un codice di uscita non riuscito.

#### Metadata
  * type: specification
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

Un solo file JSON contiene le sezioni `backend`, `audio`, `wakeWord` e `interaction`. `backend.baseUrl` è obbligatorio: è un URL assoluto HTTP o HTTPS senza credenziali, query o frammento e non ha valore predefinito. Il satellite deriva il canale WebSocket vocale aggiungendo `/api/voice` al prefisso di percorso dell'URL base, usando `ws:` per `http:` e `wss:` per `https:`; la configurazione non contiene un percorso WebSocket separato.

La sezione `audio` è facoltativa e può contenere `microphone` e `speaker` come selettori stringa non vuoti. Un selettore presente viene passato a Decibri e deve identificare il dispositivo richiesto; un selettore assente usa il dispositivo predefinito del sistema. La sezione `wakeWord` è facoltativa e può indicare `model`, identificatore di un modello distribuito o personalizzato disponibile nella directory dei modelli; il valore predefinito è il modello Hey Jarvis. La sezione `interaction` è facoltativa e può indicare `replyTimeoutMs`, intero positivo con valore predefinito di 15000. Sezioni, campi e tipi non previsti sono rifiutati per evitare errori di configurazione silenziosi.

L'opzione di avvio `--config` seleziona esplicitamente il file JSON. I valori non sono sovrascritti dalle variabili d'ambiente. Il file e i modelli selezionati vengono validati prima dell'avvio operativo e una configurazione invalida produce un errore comprensibile. Host e container usano lo stesso schema. Impostazioni aggiuntive richiedono una nuova specificazione.

#### Metadata
  * type: specification

#### Relations
  * define: [Configurazione JSON unica](../Requirements/VoiceSatellite.md#configurazione-json-unica)
---

### Contratto osservabile della sessione vocale

VoiceSession espone un evento Application per wake word riconosciuta, inizio/fine parlato, indicazione della replica attesa e risposta riprodotta. Il flag expectsReply è booleano oppure assente: l'adapter Micdrop converte qualsiasi valore non booleano in assenza di indicazione, preservando la politica di chiusura sicura. Gli eventi tecnici di apertura/chiusura della porta e scadenza dei timer restano privati del caso d'uso.

Lo stato osservabile è una proiezione Application immutabile per tipo, restituita come nuovo oggetto: acceptsWakeWord indica se inoltrare frame al riconoscimento, acceptsSpeechEnd se completare il parlato in corso, interactionActive se una disconnessione costituisce un guasto dell'interazione. Il primo valore corrisponde all'attesa della wake word, il secondo alla registrazione; interactionActive è falso durante attesa iniziale e chiusura. Non si espongono phase, enum o riferimenti allo stato Domain. Nessuna duplicazione della macchina a stati: Domain mantiene regole e transizioni, Application traduce gli eventi e proietta i soli dati necessari agli ingressi. Fail e stop conservano il comportamento concordato.

#### Metadata
  * type: specification
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

### Convenzione TypeScript di porte e dati

Decisione adottata dal backend nel modello autonomo del satellite: interface per contratti Application a oggetto che espongono capacità tramite operazioni nominate; type per dati, unioni di eventi/esiti e contratti callable. La classificazione dipende dalla responsabilità del contratto e comprende le capacità restituite da una porta.

VoiceSessionPorts e DeadlineScheduler sono porte a oggetto; ScheduledDeadline è la capacità di cancellazione restituita dallo scheduler e usa anch'essa interface. VoiceSessionEvent e VoiceSessionStatus descrivono eventi e dati, quindi restano type. La callback dello scheduler resta una firma callable. Le proprietà callable readonly nelle interface possono conservare l'immutabilità delle precedenti dichiarazioni Readonly. Questa convenzione non impone classi agli adapter, non aggiunge operazioni e non cambia la semantica dei contratti.

#### Metadata
  * type: specification
---

### Convenzione dei nomi di casi d'uso e adapter

Decisione di progetto concordata: usare suffissi di ruolo per i casi d'uso e gli adapter, mantenendo nel nome la funzione concreta del componente. Questa convenzione appartiene a questo repository; non richiede un modello multirepository.

Un file che realizza un caso d'uso Application si chiama `<azione>.use-case.ts`, con un nome che descrive l'operazione offerta, per esempio `start-voice-conversation.use-case.ts`. Il criterio vale anche per casi d'uso che non espongono rifiuti previsti.

Un file che realizza un adapter si chiama `<funzione-o-integrazione>.adapter.ts`. Sono adapter di ingresso i componenti che traducono eventi o richieste esterne in invocazioni di Application; sono adapter di uscita i componenti che realizzano una porta Application tramite una tecnologia concreta. La realizzazione può essere una classe, una funzione o un oggetto fornito dalla composition root: non dipende dalla presenza della parola TypeScript `implements`. Per esempio, un'implementazione SQLite di una porta di lettura si chiama `sqlite-conversation-history-read.adapter.ts`.

La collocazione in `adapters/` non rende automaticamente adapter ogni file contenuto. Mapper, schemi, cataloghi, validatori, driver di libreria e funzioni tecniche di supporto mantengono nomi descrittivi senza aggiungere `.adapter`, salvo che realizzino essi stessi un ingresso o una porta Application. Un coordinatore con stato non riceve o evita `.use-case` per il solo fatto di essere una classe: occorre identificarne la responsabilità e stabilire se offre un caso d'uso oppure supporta altri casi d'uso. In caso di ruolo ambiguo, documentare l'esito della classificazione nell'ispezione prima di rinominare.

La regola riguarda i nomi dei file di produzione. Non impone il suffisso `Adapter` o `UseCase` a ogni simbolo TypeScript, non introduce un suffisso obbligatorio per le porte e non modifica le regole sui confini dei layer. Le regole preesistenti sulla dichiarazione di firme, factory ed esiti restano applicabili nel loro ambito.

Motivazione: Martin Fowler sostiene una politica coerente dei nomi dei ruoli e l'uso dei nomi dei pattern quando chiariscono la responsabilità, senza proporre una convenzione universale: https://martinfowler.com/articles/refactoring-external-service.html . Robert C. Martin evidenzia la riconoscibilità dei casi d'uso nella struttura: https://blog.cleancoder.com/uncle-bob/2011/09/30/Screaming-Architecture.html . Gli esempi di Alistair Cockburn non impongono il termine Adapter nei nomi: https://alistair.cockburn.us/hexagonal-architecture . Il suffisso obbligatorio qui adottato è una scelta locale, non una prescrizione attribuita a questi autori.

#### Metadata
  * type: specification

#### Relations
  * define: [Nomi dei file secondo il ruolo architetturale](../Requirements/VoiceSatellite.md#nomi-dei-file-secondo-il-ruolo-architetturale)
---

### Esecuzione host e container

L'applicazione TypeScript compilata in JavaScript ESM usa Node.js 24 o successivo, come il backend, e funziona direttamente su Linux x86_64 e arm64 con dipendenze e modelli installati. Docker è una modalità facoltativa che confeziona la stessa applicazione per linux/amd64 e linux/arm64. La configurazione ha lo stesso significato in entrambe le modalità. L'adapter audio usa Decibri 5.8.0, fissato nel lockfile, e richiede il proprio binario nativo per la piattaforma e la libreria runtime ALSA `libasound.so.2`; il pacchetto host documenta la dipendenza e l'immagine container la include con accesso esplicito alle periferiche. ONNX Runtime richiede il proprio pacchetto nativo per la piattaforma. Le prove su periferiche reali devono coprire entrambe le architetture.

L'installazione usa pnpm 12.11.2 e il lockfile fissato. La regola di attesa di 24 ore per le nuove versioni resta attiva; poiché Vitest 5.0.5 e i pacchetti `@vitest/mocker` e `@vitest/spy` 5.0.5 sono già stati deliberatamente fissati prima del compimento dell'attesa, `pnpm-workspace.yaml` ammette solo queste tre versioni come eccezioni. La build Docker deve eseguire l'installazione congelata con la patch Micdrop e i build script nativi previsti. Il supporto dell'architettura non dimostra compatibilità con ogni distribuzione o periferica.

#### Metadata
  * type: specification

#### Relations
  * define: [Distribuzione Docker facoltativa](../Requirements/VoiceSatellite.md#distribuzione-docker-facoltativa)
---

### Esiti e diagnostica del satellite

Il tipo locale è `type Result<T, E> = Readonly<{ ok: true; value: T }> | Readonly<{ ok: false; error: E }>`. I rifiuti previsti sono tipi nominati immutabili, distinti mediante `kind`, senza classi o instanceof. Ogni porta e caso d’uso dichiara i propri rifiuti; non esiste un catalogo globale. Application interpreta gli esiti delle porte e restituisce le proprie varianti, gestite esaustivamente dagli adapter inbound. I guasti inattesi sono Error; un nuovo Error aggiunge contesto soltanto quando utile, preservando l’originale con cause. Il confine tecnico responsabile produce la diagnosi definitiva; i passaggi intermedi propagano senza log duplicati. Gli esiti previsti non producono automaticamente log di errore. Il messaggio pubblico resta separato dalla diagnosi tecnica. Il logger tecnico è Pino. Le varianti concrete e le politiche di recupero ancora aperte restano da specificare.

#### Metadata
  * type: specification

#### Relations
  * define: [Esiti previsti come valori tipizzati](../Requirements/VoiceSatellite.md#esiti-previsti-come-valori-tipizzati)
---

### Motore locale della wake word con ONNX

La prima versione esegue nel processo TypeScript/Node.js del satellite la pipeline di riconoscimento openWakeWord con modelli ONNX, usando `onnxruntime-node` 1.30.0 fissato nel lockfile. Il riconoscimento della wake word rimane locale al satellite. I modelli e le risorse condivise necessari alla pipeline sono caricati dai file distribuiti con l'applicazione; il satellite non richiede un servizio Wyoming per questa funzione.

I valori iniziali da tarare con prove su Linux x86_64 e arm64 sono soglia di riconoscimento 0,5, intervallo minimo fra rilevamenti 2000 ms e al massimo 32 blocchi da 80 ms accodati per l'inferenza. Il superamento del limite è un guasto diagnosticato, non un accumulo illimitato. Lo spike in `/home/adriano/projects/ambrogio-spike/satellite/spike/` dimostra la fattibilità iniziale su Raspberry Pi con Hey Jarvis, ma non costituisce una prova di affidabilità o prestazioni delle distribuzioni finali. Il supporto dei binari Node.js per Linux x64 e arm64 è documentato da ONNX Runtime: https://onnxruntime.ai/docs/get-started/with-javascript/node.html .

#### Metadata
  * type: specification

#### Relations
  * define: [Ascolto locale della wake word](../Requirements/VoiceSatellite.md#ascolto-locale-della-wake-word)
---

### Porta di programmazione delle scadenze

Application dichiara una capacità DeadlineScheduler: schedule(delayMs, callback) programma una singola esecuzione futura e restituisce un controllo cancel() idempotente. Il callback non è sincrono alla programmazione, non viene invocato prima dell'intervallo e non viene più invocato dopo cancellazione prima della scadenza. La cancellazione dopo esecuzione non ha effetti. Nessun handle o tipo Node.js attraversa la porta.

La composition root fornisce l'adapter Node.js; nei test Application una implementazione controllata permette di avanzare il tempo senza timer globali. L'adapter usa i timer Node.js e conserva la normale semantica del loro event loop, senza garantire puntualità assoluta. Durate, transizioni e criteri di chiusura già concordati restano invariati. Arresto, guasto e sostituzione di una scadenza annullano le registrazioni non più necessarie.

#### Metadata
  * type: specification
---

### Profilo CI del satellite

GitHub Actions esegue il job stabile `Satellite checks` su ogni pull request, sui push a main e su richiesta manuale, senza filtri sui percorsi. Runner Linux Ubuntu 24.04 x86_64, Node.js 24, pnpm 12.11.2 e installazione con lockfile congelato. Reqvire 1.3.2 valida il modello e produce il lint JSON: sia rilievi automatici sia rilievi manuali fanno fallire il controllo. Seguono pnpm typecheck (compreso tsconfig.core.json), pnpm test e pnpm build. Permessi di sola lettura sui contenuti, nessuna credenziale personale richiesta. Le prove audio con periferiche e la compatibilità arm64 restano verifiche separate prima del rilascio.

#### Metadata
  * type: specification

#### Relations
  * define: [Controlli CI delle modifiche del satellite](../Requirements/VoiceSatellite.md#controlli-ci-delle-modifiche-del-satellite)
---

### Profilo di pubblicazione Docker del satellite

GitHub Actions pubblica ghcr.io/adrianofoschi/ambrogio-satellite al push di un tag vMAJOR.MINOR.PATCH, con versione corrispondente a package.json. Il tag immagine finale coincide con il tag Git; nessun latest. Prima della pubblicazione si esegue la CI del medesimo commit, poi si costruiscono e verificano entrambe le immagini linux/amd64 e linux/arm64. Le immagini verificate ricevono i tag tecnici <versione>-amd64 e <versione>-arm64; il tag di release riunisce entrambe in un manifest. Nessun push avviene prima che entrambe le verifiche locali siano riuscite. GITHUB_TOKEN usa packages:write per GHCR; un push ordinario su main non pubblica. L’emulazione è ammessa per build e smoke test arm64, ma non dimostra audio o prestazioni su hardware reale. Docker resta facoltativo. Il workflow non cambia la visibilità del pacchetto nel registro.

#### Metadata
  * type: specification

#### Relations
  * define: [Pubblicazione delle immagini Docker del satellite](../Requirements/VoiceSatellite.md#pubblicazione-delle-immagini-docker-del-satellite)
---

### Profilo diagnostico Pino

Pino emette una riga JSON su stdout, con livello testuale, timestamp ed event costante. Nessuna acquisizione automatica di configurazione, audio, messaggi, hostname o dati ricevuti. I rifiuti previsti di avvio sono eventi informativi, senza err; i guasti di processo, interazione e riproduzione dell’avviso hanno eventi distinti. La normalizzazione al confine conserva l’identità di Error e incapsula gli altri valori con messaggio costante e cause originale, senza conversione a stringa. La vista JSON di err usa descrizioni costanti, nasconde name, message, stack, code e proprietà aggiuntive; conserva soltanto la struttura delle cause e degli AggregateError con limiti di profondità e numerosità, senza invocare getter o modificare gli originali. Il messaggio parlato resta l’asset locale indipendente dalla diagnosi. Domain e Application non importano logger.

#### Details
Decisione concordata il 2026-10-16: non estendere la patch locale di Micdrop per il logging. Proporre upstream un logger configurabile che copra anche le emissioni dirette console.error/console.warn. Fino a una soluzione verificata, la protezione dei log della dipendenza resta aperta; debugLog=false non è sufficiente. Questa decisione non attesta conformità completa ai requisiti di riservatezza e formato dei log.

Bozza upstream, non pubblicata: «Allow a configurable logger in @micdrop/client. In version 3.4.0, several console.error/console.warn calls bypass debugLog and may include received payloads or raw errors. Please provide an optional logger covering all diagnostic output, with a way to disable it. Error events and call behavior should remain independent of logger configuration. This would let applications apply their own structured logging and privacy policies without patching the package.»

#### Metadata
  * type: specification

#### Relations
  * define: [Serializzazione protetta dei guasti](../Requirements/VoiceSatellite.md#serializzazione-protetta-dei-guasti)
---

### Profilo iniziale di osservabilità

La diagnostica iniziale usa i log JSON applicativi già previsti. Non sono introdotti contatori o API applicative di metriche, exporter di tracing distribuito o registri di audit. I log non costituiscono un registro di audit garantito. Eventuali estensioni, per esempio conteggi delle attivazioni o tempi di risposta, richiedono un bisogno concreto concordato, requisiti e contratti propri, protezioni dei dati e verifiche dedicate. La raccolta esterna dei log resta responsabilità del deployment. Il profilo non introduce identificativi di correlazione o modifiche al protocollo vocale. La lacuna nota dei log diretti Micdrop resta aperta e non è risolta da questa delimitazione.

#### Metadata
  * type: specification

#### Relations
  * define: [Perimetro iniziale dei segnali di osservabilità](../Requirements/VoiceSatellite.md#perimetro-iniziale-dei-segnali-di-osservabilità)
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

Il messaggio di fallimento è una registrazione audio PCM16 mono a 16 kHz disponibile localmente nella distribuzione, riproducibile anche quando il backend non risponde. Il testo pronunciato nella prima versione è «Non riesco a contattare Ambrogio. Riprova tra poco.». La registrazione è sintetizzata una volta con la voce Piper italiana Riccardo x_low e distribuita come file audio, senza includere il modello TTS; origine e licenza della voce sono documentate insieme all'asset. Dopo il messaggio il processo resta attivo e torna ad attendere la wake word. Una nuova attivazione tenta una nuova interazione. Non si conserva la richiesta fallita per reinviarla automaticamente. Il medesimo recupero si applica a disconnessione e guasto tecnico durante un'interazione, dopo aver fermato la chiamata corrente.

#### Metadata
  * type: behavior

#### Relations
  * define: [Ripristino dopo backend irraggiungibile](../Requirements/VoiceSatellite.md#ripristino-dopo-backend-irraggiungibile)
---

### Regole della replica vocale

Il backend determina e comunica se la risposta attende una replica. Durante la stessa generazione della risposta l'agente produce il booleano strutturato `expectsReply`, senza una seconda chiamata al modello dedicata alla classificazione. Il backend lo invia nel campo `metadata.expectsReply` del messaggio Micdrop `Message` con `role: "assistant"`. Se il caso d'uso condiviso rifiuta un turno vocale, il backend produce una risposta parlata sicura nella lingua configurata, con `metadata.expectsReply: false`; il satellite la tratta come una risposta conclusiva.

Il satellite associa il messaggio alla risposta corrente della chiamata Micdrop. Per una risposta parlata attende il primo avvio della riproduzione, poi osserva `StateChange.isAssistantSpeaking` e la coda del driver Decibri: considera completata la risposta quando la riproduzione è inattiva per 1000 ms consecutivi. Un nuovo blocco audio durante l'intervallo lo azzera. Lo stato può tornare inattivo fra due blocchi della stessa risposta: l'intervallo è una stima della fine e una pausa TTS più lunga può causare chiusura prematura. La prova di integrazione deve misurare questo rischio. Se la riproduzione non inizia o non termina entro 60 secondi dalla fine della richiesta, il satellite chiude senza aprire una replica. Non si modifica il protocollo backend per un segnale aggiuntivo di fine audio.

Soltanto dopo questa attesa e un messaggio con booleano valido, `true` apre una finestra locale di inattività di 15 secondi predefiniti e ammette una replica senza wake word sulla stessa chiamata; `false` chiude la chiamata e torna alla wake word. Se manca un valore booleano, non apre una replica: attende al massimo l'intervallo locale configurato per un messaggio valido tardivo, poi chiude. Ignora messaggi arrivati dopo la chiusura. L'intervallo ricomincia dopo ogni nuova risposta riprodotta. Il backend rilascia la sessione quando la WebSocket si chiude; non serve un comando `Played`.

Chiarimento dall'integrazione del 16 ottobre 2026: Micdrop 3.4.0 non emette sempre StateChange alla fine della riproduzione con microfono muted e interruzioni disabilitate. L'adapter osserva anche gli eventi locali Speaker.StartPlaying e Speaker.StopPlaying, emessi dal driver dopo lo svuotamento della coda; questi aggiornano lo stesso stato di riproduzione e la stessa finestra di 1000 ms, senza modificare il protocollo.

#### Metadata
  * type: behavior

#### Relations
  * define: [Replica richiesta dal backend](../Requirements/VoiceSatellite.md#replica-richiesta-dal-backend)
---

### Regole di importazione dei test

I test Domain importano codice di produzione soltanto da Domain. I test Application importano soltanto Application e Domain. I test inbound importano il proprio adapter inbound e Application, senza Domain. I test outbound importano il proprio adapter outbound, Application e Domain, senza adapter inbound. Le regole valgono anche per i soli tipi. Le prove di integrazione della composition root possono attraversare i layer; non sono test unitari di un layer. Nei test Application le porte permettono di simulare audio, riconoscimento e backend senza dispositivi reali. Il progetto usa Vitest per i test, in coerenza con il backend.

#### Metadata
  * type: constraint

#### Relations
  * define: [Confini degli import nei test](../Requirements/VoiceSatellite.md#confini-degli-import-nei-test)
---

### Responsabilità della raccolta dei log

Il processo satellite emette i log applicativi JSON su stdout. Nell’esecuzione container, raccolta, durata di conservazione, rotazione ed eventuale inoltro sono configurati nel runtime Docker o nell’infrastruttura dell’installazione. Nell’esecuzione diretta, l’installatore può usare un gestore di servizi, per esempio systemd con journald, oppure un collettore esterno. Nessun percorso di file log, credenziale di raccolta o endpoint di logging entra nella configurazione applicativa. Non è imposto un prodotto di raccolta né un periodo di conservazione predefinito. L’avvio diretto da terminale non garantisce conservazione. La raccolta esterna non risolve il problema aperto dei log grezzi della dipendenza Micdrop.

#### Metadata
  * type: specification

#### Relations
  * define: [Gestione dei log affidata al deployment](../Requirements/VoiceSatellite.md#gestione-dei-log-affidata-al-deployment)
---

### Responsabilità interne del satellite

Domain contiene stati e regole dell’interazione locale. Application coordina i casi d’uso e dichiara porte nei termini delle capacità richieste. Gli adapter inbound invocano Application; gli adapter outbound realizzano le porte. Audio, wake word e trasporto restano negli adapter; Domain e Application non importano librerie tecniche, neppure soltanto per i tipi. La composition root costruisce risorse e collega le porte. Il satellite resta un solo progetto nel proprio repository, senza workspace multipackage, e usa pnpm per installazione e lockfile. Non si introducono contenitori generici shared, common o utils senza una decisione esplicita. Nomi delle cartelle, versioni e librerie restano da scegliere.

#### Metadata
  * type: specification

#### Relations
  * define: [Separazione Domain Application e adapter](../Requirements/VoiceSatellite.md#separazione-domain-application-e-adapter)
---

### Riapertura dell'ascolto dopo la chiusura Micdrop

Con `@micdrop/client` 3.4.0, l'evento di chiusura di una WebSocket già chiusa volontariamente può arrivare dopo l'avvio dell'ascolto successivo: il client richiama allora `stop()` e interrompe la nuova apertura del microfono. La patch locale ignora gli eventi di chiusura che non appartengono alla WebSocket corrente. Controlla versione e punto modificato, fa fallire la preparazione del pacchetto se il codice atteso cambia e va riesaminata a ogni aggiornamento della dipendenza.

#### Metadata
  * type: specification

#### Relations
  * define: [Riapertura sicura dopo la chiusura vocale](../Requirements/VoiceSatellite.md#riapertura-sicura-dopo-la-chiusura-vocale)
---

### Segmentazione dei turni con Silero ONNX

La prima versione usa Silero VAD in formato ONNX nel processo Node.js del satellite per individuare i tratti di parlato durante un'interazione ammessa. L'adapter audio/VAD esegue il modello con `onnxruntime-node` 1.30.0 e segnala al client Micdrop l'inizio, i frame e la fine di ciascun turno. MicdropClient trasporta `StartSpeaking`, audio PCM16 mono a 16 kHz e `StopSpeaking` secondo il contratto vocale del backend. Durante la riproduzione della risposta il satellite non ammette nuovi turni né interrompe l'audio in uscita.

La distribuzione usa il file `models/silero_vad.onnx` incluso nel pacchetto Decibri 5.8.0, senza una seconda copia; ne registra origine, hash e licenza nel documento dei modelli. Il valore iniziale `redemptionFrames` è 20, pari a circa 640 ms di silenzio per finestre da 32 ms. Le altre soglie rimangono quelle predefinite del client Micdrop 3.4.0; durata, CPU e riconoscimento di risposte brevi e frasi con pause interne vanno verificati su Linux x86_64 e arm64. Fonte del modello: https://github.com/snakers4/silero-vad .

#### Metadata
  * type: behavior

#### Relations
  * define: [Delimitazione locale dei turni vocali](../Requirements/VoiceSatellite.md#delimitazione-locale-dei-turni-vocali)
---

### Segnale locale di ascolto

L'apertura dell'ascolto segue una sola regola, sia dopo la wake word sia dopo una risposta che attende replica: quando la chiamata è pronta a ricevere il turno, il satellite riproduce una volta un breve tono PCM16 mono a 16 kHz sullo speaker configurato e riattiva il microfono solo quando il tono è terminato. Alla prima attivazione attende l'apertura della chiamata prima del tono; `Micdrop.start()` azzera il proprio stato muted, quindi l'adapter lo ripristina subito per non acquisire il bip come parlato. Il bip indica che si può davvero parlare. Per una risposta completata con `metadata.expectsReply: true`, applica la stessa regola nella chiamata già aperta e avvia la finestra di inattività della replica dopo il tono. Non emette il tono dopo una risposta conclusiva o con metadato non valido. Il tono è generato localmente, non inviato al backend e non deve sovrapporsi alla risposta parlata. Se lo speaker non riproduce il tono, il satellite registra `satellite_ready_cue_failed` e apre comunque l'ascolto. L'arresto annulla il tono in corso.

#### Metadata
  * type: behavior

#### Relations
  * define: [Segnale acustico di disponibilità](../Requirements/VoiceSatellite.md#segnale-acustico-di-disponibilità)
---

### Trasporto vocale con Micdrop

La prima versione usa `@micdrop/client` 3.4.0 nell'adapter outbound, con i driver Decibri per ingresso e uscita e Silero ONNX per il rilevamento del parlato. `MicdropClient` delimita e trasporta i turni vocali standard; Domain e Application dipendono soltanto dalle porte del satellite. Il backend ammette la conversazione prima dell'upgrade WebSocket, così il client può iniziare a trasmettere dopo l'apertura senza attendere un comando aggiuntivo. Il satellite usa i messaggi Micdrop `Message` con `metadata.expectsReply`, l'audio in streaming e gli stati `isAssistantSpeaking` ed `Error`; non richiede `Ready`, `TurnRejected` o `Played`.

Una nuova WebSocket crea una nuova conversazione backend. Il client non deve quindi riprendere automaticamente una vecchia interazione su una connessione nuova; il ricongiungimento richiederebbe un contratto separato. L'adapter disabilita i tentativi automatici di riconnessione di Micdrop e torna alla gestione locale del fallimento e della wake word. La revisione backend compatibile è quella registrata nel «Contratto vocale backend di riferimento» e richiede una prova reale prima di essere dichiarata compatibile. Fonte del protocollo Micdrop: https://micdrop.dev/docs/server/protocol .

#### Metadata
  * type: specification

#### Relations
  * define: [Compatibilità con il canale vocale backend](../Requirements/VoiceSatellite.md#compatibilità-con-il-canale-vocale-backend)
---
