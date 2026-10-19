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

La famiglia può pronunciare Hey Jarvis e la richiesta nella stessa frase. Il satellite conserva in memoria una riserva scorrevole di 1500 ms di audio a 16 kHz durante il riconoscimento locale, il segnale di ascolto e la conferma del parlato. Quando Silero conferma l'inizio del parlato, la trasmissione della richiesta comincia con la riserva che precede il parlato, seguita dai frame acquisiti fino alla fine del parlato; la riserva non viene inviata se il parlato non è confermato. Il satellite non trasmette audio al backend prima della conferma del parlato né prima che la sessione sia pronta. Se la sessione non è pronta, la richiesta non è trasmessa: il satellite segnala il fallimento e torna alla wake word senza reinvio automatico. Il modello della wake word può essere diverso se selezionato dal catalogo distribuito. La prova su x86_64 e arm64 deve misurare se 1500 ms bastano per la frase continua.

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

Politica concordata: SIGINT e SIGTERM bloccano nuovi eventi, annullano timer e riproduzione (compresi il segnale di ascolto e il tono di errore), chiudono il canale e l'acquisizione e rilasciano le sessioni ONNX. Non si attende la risposta completa del backend. La normale attesa della risposta resta valida fuori dall'arresto.

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

Un solo file JSON contiene le sezioni `backend`, `client`, `audio`, `wakeWord` e `interaction`. `backend.baseUrl` è obbligatorio: è un URL assoluto HTTP o HTTPS senza credenziali, query o frammento e non ha valore predefinito. Il satellite deriva il canale conversazionale WebSocket aggiungendo `api/session` al prefisso di percorso dell'URL base, usando `ws:` per `http:` e `wss:` per `https:`; la configurazione non contiene un percorso WebSocket separato.

La sezione `client` è facoltativa e può contenere `id` e `name`, stringhe non vuote che identificano il satellite nella sessione secondo il contratto «Identità del satellite nella sessione»; i valori predefiniti derivano dal nome host. La sezione `audio` è facoltativa e può contenere `microphone` e `speaker` come selettori stringa non vuoti. Un selettore presente viene passato a Decibri e deve identificare il dispositivo richiesto; un selettore assente usa il dispositivo predefinito del sistema. La sezione `wakeWord` è facoltativa e può indicare `model`, identificatore di un modello distribuito o personalizzato disponibile nella directory dei modelli, con valore predefinito il modello Hey Jarvis; `threshold`, numero maggiore di 0 e non superiore a 1 con valore predefinito 0,5, che è la soglia di riconoscimento; e `patience`, intero da 1 a 10 con valore predefinito 2, che è il numero di blocchi consecutivi da 80 ms in cui il punteggio deve raggiungere la soglia. La sezione `interaction` è facoltativa e può indicare `replyTimeoutMs`, intero positivo con valore predefinito di 15000. Sezioni, campi e tipi non previsti sono rifiutati per evitare errori di configurazione silenziosi.

L'opzione di avvio `--config` seleziona esplicitamente il file JSON. I valori non sono sovrascritti dalle variabili d'ambiente. Il file e i modelli selezionati vengono validati prima dell'avvio operativo e una configurazione invalida produce un errore comprensibile. Host e container usano lo stesso schema. Impostazioni aggiuntive richiedono una nuova specificazione.

#### Metadata
  * type: specification

#### Relations
  * define: [Configurazione JSON unica](../Requirements/VoiceSatellite.md#configurazione-json-unica)
---

### Contratto osservabile della sessione vocale

VoiceSession espone un evento Application per wake word riconosciuta, inizio/fine parlato, esito del turno e risposta riprodotta. L'esito del turno porta l'indicazione della replica attesa, booleana oppure assente: per `turn.completed` l'adapter del canale conversazionale consegna `expectsReply`, convertendo un valore non booleano in assenza di indicazione per preservare la politica di chiusura sicura; `turn.failed`, `turn.rejected` e `turn.interrupted` sono consegnati come esiti conclusivi, equivalenti a `expectsReply: false`. La risposta riprodotta è segnalata dall'adapter soltanto quando l'esito è arrivato e la riproduzione di tutte le trasmissioni del turno è terminata, cioè dopo `output.end` e lo svuotamento della coda dello speaker. La conversazione da continuare in una replica resta un dato dell'adapter del canale e non entra nello stato Domain. Gli eventi tecnici di apertura/chiusura della porta e scadenza dei timer restano privati del caso d'uso.

Lo stato osservabile è una proiezione Application immutabile per tipo, restituita come nuovo oggetto: acceptsWakeWord indica se inoltrare frame al riconoscimento, acceptsSpeechEnd se completare il parlato in corso, interactionActive se una perdita della sessione costituisce un guasto dell'interazione. Il primo valore corrisponde all'attesa della wake word, il secondo alla registrazione; interactionActive è falso durante attesa iniziale e chiusura. Non si espongono phase, enum o riferimenti allo stato Domain. Nessuna duplicazione della macchina a stati: Domain mantiene regole e transizioni, Application traduce gli eventi e proietta i soli dati necessari agli ingressi. Fail e stop conservano il comportamento concordato.

#### Metadata
  * type: specification
---

### Contratto vocale backend di riferimento

La revisione backend di riferimento per il satellite è ambrogio-backend al commit `58b0df420aee7c08280afd818ffcd0e82b060029`. I contratti pertinenti sono `Sessione del protocollo Ambrogio v1`, `Trasmissione in ingresso del protocollo Ambrogio v1`, `Trasmissione in uscita del protocollo Ambrogio v1`, `Esiti del turno nel protocollo Ambrogio v1`, `Motivi di rifiuto del turno`, `Errori ed estensioni del protocollo Ambrogio v1` e `Correlazione diagnostica della sessione Ambrogio v1` in https://github.com/ambrogio-app/ambrogio-backend/blob/58b0df420aee7c08280afd818ffcd0e82b060029/system-model/Contracts/ConversationProtocol.md ; la forma dei messaggi è definita da https://github.com/ambrogio-app/ambrogio-backend/blob/58b0df420aee7c08280afd818ffcd0e82b060029/protocol/ambrogio-v1.schema.json alla stessa revisione. Questa revisione sostituisce la precedente `512317c9e93b4e6ab7a1e32dd9c210436b7b5c06` e il protocollo vocale Micdrop su `/api/voice`, rimossi dal backend.

Il backend possiede trascrizione, sintesi, ammissione dei turni, `expectsReply` e motivi di rifiuto; ogni messaggio per la famiglia, compresi rifiuti ed errori, arriva come trasmissione nel formato chiesto con `reply`, salvo il rifiuto `audio_unavailable` trasmesso sempre in testo. Il satellite possiede la regola delle conversazioni per attivazione, la decisione di aprire una replica dopo la riproduzione e l'intervallo locale di inattività. La compatibilità non è ancora dimostrata: occorrono prove di integrazione del client reale contro questa revisione. Le relazioni Reqvire restano interne a ciascun repository; il riferimento esterno non fonde i grafi.

#### Evoluzione della concorrenza
Decisione concordata e implementata nel backend: sono ammessi turni in parallelo tra conversazioni diverse e al massimo un turno attivo per ciascuna conversazione. Il conflitto riguarda la stessa conversazione, indipendentemente dal client o dal canale; i turni rifiutati non sono accodati. Ogni satellite mantiene il proprio ciclo locale e le interazioni degli altri client non ne sostituiscono lo stato. Eventuali limiti globali di capacità restano da concordare.

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

L'installazione usa pnpm 12.11.2 e il lockfile fissato. La regola di attesa di 24 ore per le nuove versioni resta attiva; poiché Vitest 5.0.5 e i pacchetti `@vitest/mocker` e `@vitest/spy` 5.0.5 sono già stati deliberatamente fissati prima del compimento dell'attesa, `pnpm-workspace.yaml` ammette solo queste tre versioni come eccezioni. La build Docker deve eseguire l'installazione congelata con i build script nativi previsti; dopo la rimozione di `@micdrop/client` non è più applicata alcuna patch locale alle dipendenze. Il supporto dell'architettura non dimostra compatibilità con ogni distribuzione o periferica.

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

### Evento diagnostico della configurazione rifiutata

Decisione concordata con la persona il 18 ottobre 2026, per rendere comprensibile il rifiuto della configurazione: quando il file JSON selezionato con `--config` viene rifiutato, il satellite emette una sola riga Pino di livello `info` con `event: "invalid_configuration"` e il campo `reason`, che vale il `kind` del rifiuto previsto. Con `reason: "configuration_unavailable"` il file non esiste o non è leggibile e la riga non contiene altri campi diagnostici. Con `reason: "invalid_configuration"` la riga contiene anche `field`, il nome del campo rifiutato tra `backend.baseUrl`, `client.id`, `client.name`, `audio.microphone`, `audio.speaker`, `wakeWord.model`, `wakeWord.threshold`, `wakeWord.patience` e `interaction.replyTimeoutMs`, oppure `config` quando il contenuto non è JSON o la struttura del documento contiene sezioni o campi non previsti. Il processo termina con codice 2 senza costruire risorse audio o di rete.

La riga non riporta valori letti dal file, percorsi, nome host o messaggi di librerie: `reason` e `field` sono costanti scelte dal satellite. Il rifiuto degli argomenti di avvio resta l'evento `invalid_arguments` senza campi aggiuntivi.

#### Metadata
  * type: input-output

#### Relations
  * define: [Rifiuto della configurazione invalida](../Requirements/VoiceSatellite.md#rifiuto-della-configurazione-invalida)
---

### Hook pre-commit dei segreti con gitleaks

Decisione concordata con la persona il 18 ottobre 2026, insieme alla scansione in CI: il repository versiona l'hook `.githooks/pre-commit`, script POSIX `sh` eseguibile. Ogni clone lo abilita una volta con `git config core.hooksPath .githooks`; Git non attiva automaticamente gli hook versionati. Se il comando `gitleaks` non è nel `PATH`, l'hook stampa su stderr un messaggio che indica come installare gitleaks 8.30.1 e abilitare l'hook, ed esce con stato diverso da zero, bloccando il commit. Altrimenti esegue `gitleaks git --pre-commit --staged --redact --no-banner .`: analizza soltanto le modifiche in staging, blocca il commit quando trova un segreto e non stampa i valori trovati. La versione attesa è la stessa fissata per la CI. Aggirare l'hook con `--no-verify` non è una procedura prevista; la scansione in CI resta la garanzia sul repository remoto.

#### Metadata
  * type: specification

#### Relations
  * define: [Controllo dei segreti prima del commit locale](../Requirements/VoiceSatellite.md#controllo-dei-segreti-prima-del-commit-locale)
---

### Identità del satellite nella sessione

Decisione concordata il 17 ottobre 2026: il file JSON può contenere la sezione facoltativa `client` con `id` e `name`, stringhe non vuote. In assenza, `id` vale `satellite-<nome host>` e `name` vale il nome host. Il satellite invia questi valori come `clientId` e `name` di `session.hello`. L'identificativo resta stabile tra un avvio e l'altro sulla stessa macchina finché la configurazione non cambia; il nome serve alla famiglia per riconoscere il satellite, per esempio «Cucina». Un valore vuoto o di tipo diverso rende invalida la configurazione.

#### Metadata
  * type: specification

#### Relations
  * define: [Identificazione del satellite nella sessione](../Requirements/VoiceSatellite.md#identificazione-del-satellite-nella-sessione)
---

### Motore locale della wake word con ONNX

La prima versione esegue nel processo TypeScript/Node.js del satellite la pipeline di riconoscimento openWakeWord con modelli ONNX, usando `onnxruntime-node` 1.30.0 fissato nel lockfile. Il riconoscimento della wake word rimane locale al satellite. I modelli e le risorse condivise necessari alla pipeline sono caricati dai file distribuiti con l'applicazione; il satellite non richiede un servizio Wyoming per questa funzione.

I valori iniziali da tarare con prove su Linux x86_64 e arm64 sono soglia di riconoscimento 0,5, intervallo minimo fra rilevamenti 2000 ms e al massimo 32 blocchi da 80 ms accodati per l'inferenza. Il superamento del limite è un guasto diagnosticato, non un accumulo illimitato. Lo spike iniziale del satellite ha dimostrato la fattibilità su Raspberry Pi con Hey Jarvis, ma non costituisce una prova di affidabilità o prestazioni delle distribuzioni finali. Il supporto dei binari Node.js per Linux x64 e arm64 è documentato da ONNX Runtime: https://onnxruntime.ai/docs/get-started/with-javascript/node.html .

Decisione concordata il 17 ottobre 2026, dopo attivazioni spontanee di «Alexa» sul Raspberry dell'installazione di riferimento, anche senza che la parola fosse pronunciata: la soglia di riconoscimento è configurabile con `wakeWord.threshold`. Il valore predefinito resta 0,5; l'installazione di riferimento parte da 0,7. Una soglia più alta riduce le attivazioni spontanee e può aumentare le parole non riconosciute; la taratura resta affidata alle prove con il microfono reale.

Decisione concordata con la persona il 19 ottobre 2026, perché con «Alexa» l'installazione di riferimento continuava ad attivarsi con colpi di tosse o senza causa evidente: un rilevamento richiede che il punteggio del classificatore raggiunga la soglia in `wakeWord.patience` blocchi consecutivi da 80 ms, come il parametro `patience` di `Model.predict` di openWakeWord (https://github.com/dscripka/openWakeWord/blob/main/openwakeword/model.py). Un blocco sotto soglia azzera il conteggio; anche l'azzeramento della pipeline al ritorno in attesa della wake word lo azzera. Il valore predefinito è 2, quindi un impulso sonoro che supera la soglia in un solo blocco non attiva il satellite; il valore 1 ripristina il comportamento precedente. Ogni blocco richiesto in più aggiunge circa 80 ms al riconoscimento e può aumentare le parole non riconosciute se la wake word è pronunciata in fretta. L'intervallo minimo fra rilevamenti si applica al rilevamento confermato. Non si introducono il filtro VAD sui punteggi né la soppressione del rumore di openWakeWord.

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

### Profilo della scansione dei segreti con gitleaks

Decisione concordata con la persona il 18 ottobre 2026: il repository del satellite usa gitleaks 8.30.1 per individuare segreti, sia in CI sia prima di ogni commit locale.

Il workflow riutilizzabile `.github/workflows/secret-scan.yml` si attiva al push su qualunque branch, su ogni pull request, su richiesta manuale e quando un altro workflow lo richiama. Esegue il checkout con la stessa azione fissata per commit usata dalla CI, con l'intera storia (`fetch-depth: 0`) e senza conservare le credenziali. Scarica dalla release ufficiale `gitleaks_8.30.1_linux_x64.tar.gz`, ne verifica lo SHA-256 `551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb` prima di estrarlo e interrompe il job se l'impronta non corrisponde. Esegue `gitleaks git --redact --no-banner --exit-code 1 .` sull'intera storia: un ritrovamento fa fallire il job e i valori trovati non compaiono nel log. Permessi di sola lettura sui contenuti, nessuna credenziale personale. Il workflow di pubblicazione delle immagini richiama questo workflow e il job di pubblicazione dipende sia dai controlli della CI sia dalla scansione dei segreti.

Un falso positivo si risolve con un'eccezione esplicita concordata con la persona e registrata in questo modello, non disattivando la scansione.

#### Alternative e conseguenze
Sono state considerate l'azione ufficiale `gitleaks/gitleaks-action`, che è gratuita per gli account personali ma richiede una licenza quando il repository appartiene a un'organizzazione, il solo controllo in CI, che lascia entrare un segreto nella storia locale fino al push, e il solo hook locale, che dipende dall'attivazione in ogni clone e non protegge il repository remoto. Il binario fissato per versione e impronta non dipende da licenze né da azioni di terze parti; l'aggiornamento di versione richiede di aggiornare insieme versione e impronta.

#### Metadata
  * type: specification

#### Relations
  * define: [Scansione dei segreti nella storia del repository](../Requirements/VoiceSatellite.md#scansione-dei-segreti-nella-storia-del-repository)
---

### Profilo di pubblicazione Docker del satellite

GitHub Actions pubblica ghcr.io/ambrogio-app/ambrogio-satellite al push di un tag vMAJOR.MINOR.PATCH, con versione corrispondente a package.json. Il tag immagine finale coincide con il tag Git; nessun latest. Prima della pubblicazione si esegue la CI del medesimo commit, poi si costruiscono e verificano entrambe le immagini linux/amd64 e linux/arm64. Le immagini verificate ricevono i tag tecnici <versione>-amd64 e <versione>-arm64; il tag di release riunisce entrambe in un manifest. Nessun push avviene prima che entrambe le verifiche locali siano riuscite. GITHUB_TOKEN usa packages:write per GHCR; un push ordinario su main non pubblica. L’emulazione è ammessa per build e smoke test arm64, ma non dimostra audio o prestazioni su hardware reale. Docker resta facoltativo. Il workflow non cambia la visibilità del pacchetto nel registro.

Decisione concordata con la persona il 18 ottobre 2026, che sostituisce lo spazio dei nomi personale: il repository appartiene all'organizzazione GitHub `ambrogio-app` e le immagini sono pubblicate come `ghcr.io/ambrogio-app/ambrogio-satellite`. Il pacchetto nello spazio dei nomi personale è cancellato dopo la prima pubblicazione nell'organizzazione.

#### Metadata
  * type: specification

#### Relations
  * define: [Pubblicazione delle immagini Docker del satellite](../Requirements/VoiceSatellite.md#pubblicazione-delle-immagini-docker-del-satellite)
---

### Profilo diagnostico Pino

Pino emette una riga JSON su stdout, con livello testuale, timestamp ed event costante. Nessuna acquisizione automatica di configurazione, audio, messaggi, hostname o dati ricevuti. I rifiuti previsti di avvio sono eventi informativi, senza err; i guasti di processo, interazione e riproduzione del tono di errore hanno eventi distinti. La normalizzazione al confine conserva l’identità di Error e incapsula gli altri valori con messaggio costante e cause originale, senza conversione a stringa. La vista JSON di err usa descrizioni costanti, nasconde name, message, stack, code e proprietà aggiuntive; conserva soltanto la struttura delle cause e degli AggregateError con limiti di profondità e numerosità, senza invocare getter o modificare gli originali. Il tono di errore resta indipendente dalla diagnosi. Domain e Application non importano logger.

#### Details
Con la rimozione di `@micdrop/client`, decisa il 17 ottobre 2026, non restano dipendenze di trasporto che emettono direttamente su console i messaggi ricevuti o gli errori grezzi: la lacuna aperta il 16 ottobre 2026 sui log diretti di Micdrop è chiusa senza patch né proposta upstream. Il trasporto `ambrogio.v1` diagnostica i propri guasti soltanto attraverso il logger applicativo.

#### Metadata
  * type: specification

#### Relations
  * define: [Serializzazione protetta dei guasti](../Requirements/VoiceSatellite.md#serializzazione-protetta-dei-guasti)
---

### Profilo iniziale di osservabilità

La diagnostica iniziale usa i log JSON applicativi già previsti. Non sono introdotti contatori o API applicative di metriche, exporter di tracing distribuito o registri di audit. I log non costituiscono un registro di audit garantito. Eventuali estensioni, per esempio conteggi delle attivazioni o tempi di risposta, richiedono un bisogno concreto concordato, requisiti e contratti propri, protezioni dei dati e verifiche dedicate. La raccolta esterna dei log resta responsabilità del deployment. Il profilo non introduce identificativi di correlazione nel satellite né modifiche al protocollo conversazionale; la correlazione diagnostica delle sessioni appartiene al backend. Con la rimozione di Micdrop non restano log diretti di dipendenze di trasporto fuori dal logger applicativo.

#### Metadata
  * type: specification

#### Relations
  * define: [Perimetro iniziale dei segnali di osservabilità](../Requirements/VoiceSatellite.md#perimetro-iniziale-dei-segnali-di-osservabilità)
---

### Recupero locale da backend irraggiungibile

Il fallimento è segnalato con il tono definito in «Tono locale di errore», generato localmente e quindi riproducibile anche quando il backend non risponde; dal 18 ottobre 2026 sostituisce la registrazione «Non riesco a contattare Ambrogio. Riprova tra poco.». Dopo il tono il processo resta attivo e torna ad attendere la wake word. Una nuova attivazione tenta una nuova interazione, riaprendo la sessione se necessario. Non si conserva la richiesta fallita per reinviarla automaticamente. Il medesimo recupero si applica alla sessione che non si apre o si chiude durante un'interazione, a un `session.error` riferito alla richiesta corrente, all'esito mancante entro 60 secondi dalla fine della richiesta e ai guasti tecnici durante un'interazione, dopo aver interrotto la trasmissione e la riproduzione correnti.

#### Metadata
  * type: behavior

#### Relations
  * define: [Ripristino dopo backend irraggiungibile](../Requirements/VoiceSatellite.md#ripristino-dopo-backend-irraggiungibile)
---

### Regole della replica vocale

Il backend determina e comunica se la risposta attende una replica: durante la stessa generazione della risposta l'agente produce il booleano strutturato `expectsReply`, che il backend invia in `turn.completed`. I turni conclusi con `turn.failed`, `turn.rejected` o `turn.interrupted` non comunicano `expectsReply` e il satellite li tratta come conclusivi, dopo aver riprodotto l'eventuale audio del messaggio pubblico.

Il satellite associa esiti e trasmissioni alla richiesta corrente tramite `requestId` e `turnId`. Riproduce in ordine le trasmissioni audio del turno e considera completata la risposta quando ha ricevuto l'esito del turno e lo speaker ha riprodotto tutti i campioni accodati dopo l'ultimo `output.end`. Questa regola sostituisce la stima precedente basata su 1000 ms di inattività di Micdrop. Se l'esito non arriva entro 60 secondi dalla fine della richiesta, il satellite chiude l'interazione con il recupero locale senza aprire una replica.

Soltanto dopo la riproduzione completa e un `turn.completed` con `expectsReply: true`, il satellite apre una finestra locale di inattività di 15 secondi predefiniti e ammette una replica senza wake word nella stessa conversazione, usando il `conversationId` ricevuto in `turn.accepted`; con `false`, valore mancante o esito conclusivo torna alla wake word. Ignora esiti e trasmissioni che non appartengono alla richiesta corrente. L'intervallo ricomincia dopo ogni nuova risposta riprodotta. Il satellite non invia al backend segnali sulla fine della riproduzione.

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

Il processo satellite emette i log applicativi JSON su stdout. Nell’esecuzione container, raccolta, durata di conservazione, rotazione ed eventuale inoltro sono configurati nel runtime Docker o nell’infrastruttura dell’installazione. Nell’esecuzione diretta, l’installatore può usare un gestore di servizi, per esempio systemd con journald, oppure un collettore esterno. Nessun percorso di file log, credenziale di raccolta o endpoint di logging entra nella configurazione applicativa. Non è imposto un prodotto di raccolta né un periodo di conservazione predefinito. L’avvio diretto da terminale non garantisce conservazione.

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

### Segmentazione dei turni con Silero ONNX

La prima versione usa Silero VAD in formato ONNX nel processo Node.js del satellite per individuare i tratti di parlato durante un'interazione ammessa. Un adapter proprio del satellite esegue il modello con `onnxruntime-node` 1.30.0 e applica lo stesso algoritmo usato in precedenza da `@micdrop/client` 3.4.0: finestre di 512 campioni a 16 kHz (32 ms), valutate in sequenza; una finestra con probabilità almeno 0,18 (`positiveSpeechThreshold`) è parlato, una sotto 0,11 (`negativeSpeechThreshold`) è silenzio; il parlato è confermato dopo 4 finestre di parlato (`minSpeechFrames`) e termina dopo 20 finestre consecutive di silenzio (`redemptionFrames`, circa 640 ms). Alla conferma l'adapter apre la trasmissione della richiesta con la riserva audio; alla fine del parlato invia `input.end`. Un tratto che termina prima della conferma viene scartato senza inviare nulla, perché il protocollo non consente di annullare una richiesta aperta. Durante la riproduzione della risposta il satellite non ammette nuovi turni né interrompe l'audio in uscita.

La distribuzione usa il file `models/silero_vad.onnx` incluso nel pacchetto Decibri 5.8.0, senza una seconda copia; ne registra origine, hash e licenza nel documento dei modelli. Durata, CPU e riconoscimento di risposte brevi e frasi con pause interne vanno verificati su Linux x86_64 e arm64. Fonte del modello: https://github.com/snakers4/silero-vad .

#### Metadata
  * type: behavior

#### Relations
  * define: [Delimitazione locale dei turni vocali](../Requirements/VoiceSatellite.md#delimitazione-locale-dei-turni-vocali)
---

### Segnalazione locale di voce non disponibile

Quando una trasmissione del server per il turno corrente dichiara contenuto testuale, come nel rifiuto `audio_unavailable` di un backend senza voce configurata, il satellite non la pronuncia: registra l'evento informativo `satellite_voice_unavailable` e riproduce al suo posto il tono definito in «Tono locale di errore», che dal 18 ottobre 2026 sostituisce la registrazione locale «La voce non è disponibile.» decisa il 17 ottobre 2026. Dopo il tono e l'esito del turno il satellite torna ad attendere la wake word senza aprire una replica e senza reinviare la richiesta.

#### Metadata
  * type: specification

#### Relations
  * define: [Tono di errore per voce non disponibile](../Requirements/VoiceSatellite.md#tono-di-errore-per-voce-non-disponibile)
---

### Segnale locale di ascolto

L'apertura dell'ascolto segue una sola regola, sia dopo la wake word sia dopo una risposta che attende replica: quando la sessione conversazionale è pronta a ricevere il turno, il satellite riproduce una volta un breve tono PCM16 mono a 16 kHz sullo speaker configurato e ammette il parlato solo quando il tono è terminato. Il tono è una sinusoide di 880 Hz lunga 100 ms, con ampiezza pari a 0,18 del fondo scala e dissolvenze lineari di 10 ms ai bordi. Alla prima attivazione attende che la sessione sia pronta, riaprendola se necessario, prima del tono; il VAD resta inattivo durante il tono per non acquisire il bip come parlato. Il bip indica che si può davvero parlare. Per un `turn.completed` con `expectsReply: true`, applica la stessa regola nella sessione già aperta e avvia la finestra di inattività della replica dopo il tono. Non emette il tono dopo una risposta conclusiva o con indicazione non valida. Il tono è generato localmente, non inviato al backend e non deve sovrapporsi alla risposta parlata. Se lo speaker non riproduce il tono, il satellite registra `satellite_ready_cue_failed` e apre comunque l'ascolto. L'arresto annulla il tono in corso.

#### Metadata
  * type: behavior

#### Relations
  * define: [Segnale acustico di disponibilità](../Requirements/VoiceSatellite.md#segnale-acustico-di-disponibilità)
---

### Tono locale di errore

Decisione concordata con la persona il 18 ottobre 2026: il satellite non distribuisce né riproduce messaggi parlati preregistrati. Le registrazioni «Non riesco a contattare Ambrogio. Riprova tra poco.» e «La voce non è disponibile.», sintetizzate con la voce Piper Riccardo x_low e distribuite come `assets/backend-unavailable.wav` e `assets/voice-unavailable.wav`, sono sostituite da un unico tono di errore generato dal programma. La decisione sostituisce le scelte delle registrazioni nei contratti «Recupero locale da backend irraggiungibile» e «Segnalazione locale di voce non disponibile», compresa quella del 17 ottobre 2026. Motivazione: un tono non dipende dalla lingua né dalla voce scelta nel backend, non richiede asset né licenze, e la famiglia può controllare il dettaglio del problema dalla chat testuale.

Il tono è lo stesso nei due casi, backend irraggiungibile e risposta soltanto testuale a un turno vocale. È audio PCM16 mono a 16 kHz composto da due toni sinusoidali discendenti: 660 Hz per 150 ms, 50 ms di silenzio, 440 Hz per 150 ms, per una durata complessiva di 350 ms. Ampiezza e dissolvenze lineari di 10 ms ai bordi di ciascun tono sono quelle del segnale di ascolto. La sequenza discendente e la durata lo distinguono dal segnale di ascolto. Il tono è riprodotto sullo speaker configurato, non è inviato al backend e l'arresto lo annulla. Se lo speaker non lo riproduce, il satellite registra `satellite_error_tone_failed` e prosegue come se il tono fosse terminato. I log distinguono la causa: `satellite_failure` per il fallimento dell'interazione e `satellite_voice_unavailable` per la risposta soltanto testuale.

#### Metadata
  * type: behavior

#### Relations
  * define: [Tono di errore per backend irraggiungibile](../Requirements/VoiceSatellite.md#tono-di-errore-per-backend-irraggiungibile)
---

### Trasporto conversazionale ambrogio.v1

Decisione concordata il 17 ottobre 2026: il satellite comunica con il backend con il protocollo conversazionale `ambrogio.v1`, comune a testo e voce, e non usa più `@micdrop/client` né la sua patch locale. L'adapter outbound usa il `WebSocket` integrato in Node.js, la stessa scelta del client terminale, senza dipendenze aggiuntive per il trasporto. Si connette a `api/session` sotto `backend.baseUrl`, con schema `ws:` per `http:` e `wss:` per `https:`, offrendo il sottoprotocollo `ambrogio.v1`; invia `session.hello` con l'identità configurata e considera la sessione pronta soltanto dopo `session.ready`. Domain e Application dipendono soltanto dalle porte del satellite.

La sessione è persistente: viene aperta all'avvio, resta aperta finché il backend la mantiene con i propri ping e, se risulta chiusa, viene riaperta alla successiva attivazione con la wake word. Il satellite invia messaggi e frame soltanto su una sessione pronta e non riprende mai su una nuova sessione una richiesta, una trasmissione o un turno della sessione precedente. Una sessione persa durante un'interazione attiva segue il recupero locale; la sua perdita mentre il satellite attende la wake word non produce avvisi.

Ogni richiesta è una trasmissione audio: `input.start` con `requestId` e `stream` nuovi, `content` `{"type":"audio","sampleRate":16000}`, `reply` `"audio"` e `conversationId` soltanto per una replica senza wake word, il `conversationId` ricevuto in `turn.accepted` per il turno precedente; poi frame binari con i 4 byte big-endian del numero `stream` seguiti da PCM16 mono a 16 kHz; infine `input.end` alla fine del parlato rilevata localmente. Ogni attivazione con la wake word inizia una nuova conversazione senza `conversationId`. La durata della richiesta resta entro i 60 secondi del contratto backend.

Le risposte arrivano come trasmissioni `output.start`, frame audio alla frequenza dichiarata e `output.end`; l'esito del turno è `turn.completed` con `expectsReply`, `turn.failed`, `turn.rejected` o `turn.interrupted`. Un `session.error` riferito alla richiesta corrente equivale a un guasto dell'interazione. A un messaggio del server non legato a un turno che contiene `id` il satellite risponde con `client.result`, `ok: false` e `reason: "unsupported"`. La revisione backend compatibile è quella registrata nel «Contratto vocale backend di riferimento» e richiede prove di integrazione prima di essere dichiarata compatibile. Le evidenze raccolte in precedenza con il trasporto Micdrop non valgono per questo contratto.

#### Metadata
  * type: specification

#### Relations
  * define: [Compatibilità con il canale vocale backend](../Requirements/VoiceSatellite.md#compatibilità-con-il-canale-vocale-backend)
---

