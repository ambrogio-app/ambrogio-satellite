# Elements

### Adapter audio con Decibri

Il satellite usa Decibri 5.8.0, fissato esattamente nel lockfile, negli adapter tecnici del processo Node.js per acquisire audio dal microfono e riprodurre le risposte sullo speaker. Se la configurazione indica un selettore `AMBROGIO_MICROPHONE` o `AMBROGIO_SPEAKER`, l'adapter usa il dispositivo corrispondente; in assenza del selettore usa il dispositivo predefinito del sistema. Un selettore che inizia con `alsa:` è passato a Decibri come identificatore stabile del dispositivo; ogni altro selettore è passato come nome, che Decibri confronta come parte del nome del dispositivo senza distinguere maiuscole e minuscole. Una selezione esplicita non è mai sostituita dal dispositivo predefinito: se il dispositivo selezionato non è disponibile, l'apertura fallisce. Un microfono non disponibile impedisce l'avvio del processo, che rilascia le risorse acquisite, registra `satellite_startup_failed` con il messaggio `Microphone could not be started` e termina con stato 1; uno speaker non disponibile fa fallire la riproduzione come guasto dell'interazione secondo le regole del satellite. La stessa selezione logica vale su host e nel container; gli identificatori fisici disponibili dipendono dalla macchina. Domain e Application vedono soltanto le porte audio, senza importare tipi o oggetti Decibri.

L'adapter di uscita conserva l'ordine dei blocchi audio e considera completata una risposta soltanto dopo che i campioni accodati sono stati effettivamente riprodotti. Chiude o rilascia lo speaker al termine di ogni riproduzione, senza lasciare aperta un'uscita ALSA inattiva. Errori di apertura, disconnessione o riproduzione attraversano le porte come esiti o guasti appropriati secondo le regole del satellite.

Decibri fornisce binari nativi per Linux x64 e arm64 e richiede la libreria runtime ALSA `libasound.so.2`: il pacchetto host la documenta come dipendenza e l'immagine container la include. Il pacchetto Decibri contiene anche il modello `models/silero_vad.onnx`. API e dipendenze documentate: https://decibri.com/docs/apis/node .

#### Metadata
  * type: specification

#### Relations
  * define: [Selezione dei dispositivi audio](../Requirements/VoiceSatellite.md#selezione-dei-dispositivi-audio)
---

### Attenuazione locale con softvol e amixer

Il satellite attenua gli altri flussi audio locali durante l'interazione regolando un controllo ALSA di attenuazione con `amixer`. Il controllo appartiene al satellite ed è separato dal volume dei player: a riposo vale il livello pieno, il 100%, e durante l'interazione il livello configurato. Il volume della musica resta deciso dal player e dal suo server.

L'attenuazione si configura con tre variabili, tutte presenti o tutte assenti: `AMBROGIO_ATTENUATION_DEVICE`, che identifica il dispositivo di controllo ALSA, per esempio `hw:CARD=<scheda>`; `AMBROGIO_ATTENUATION_CONTROL`, con il nome del controllo semplice; `AMBROGIO_ATTENUATION_LEVEL`, intero da 0 a 100, percentuale del controllo durante l'interazione. Senza le tre variabili il satellite non regola alcun controllo. L'installazione crea il controllo con un dispositivo ALSA `softvol` davanti all'uscita dei player da attenuare; la voce del satellite non attraversa quel dispositivo.

L'adapter esegue `amixer -D <device> -q sset <control> <livello>%` con l'esecuzione diretta del programma, senza shell, e un tempo massimo di 2 secondi: con il livello di `AMBROGIO_ATTENUATION_LEVEL` alla wake word, prima del segnale acustico di disponibilità, e con `100` al ritorno in attesa della wake word, all'avvio e durante l'arresto controllato. ALSA crea il controllo `softvol` alla prima apertura del dispositivo che lo usa: se `amixer` segnala che il controllo non esiste, nessun flusso lo ha ancora attraversato e non c'è nulla da attenuare, senza evento di guasto. Ogni altro errore, l'uscita con codice diverso da zero o la scadenza del tempo massimo producono l'evento diagnostico `satellite_attenuation_failed` con l'operazione, attenuazione o ripristino, e il motivo selezionato; l'interazione e l'attesa proseguono. L'immagine container include `amixer` dal pacchetto `alsa-utils`; per l'esecuzione sull'host è una dipendenza documentata.

#### Metadata
  * type: behavior

#### Relations
  * define: [Attenuazione dell'audio locale durante l'interazione](../Requirements/VoiceSatellite.md#attenuazione-dellaudio-locale-durante-linterazione)
---

### Attivazione e riserva audio

Il satellite deve accettare la wake word e la richiesta pronunciate nella stessa frase. Il satellite conserva in memoria una riserva scorrevole di 1500 ms di audio a 16 kHz durante il riconoscimento locale, il segnale di ascolto e la conferma del parlato. Quando Silero conferma l'inizio del parlato, la trasmissione della richiesta comincia con la riserva che precede il parlato, seguita dai frame acquisiti fino alla fine del parlato; la riserva non viene inviata se il parlato non è confermato. Il satellite non trasmette audio al backend prima della conferma del parlato né prima che la sessione sia pronta. Se la sessione non è pronta, la richiesta non è trasmessa: il satellite segnala il fallimento e torna alla wake word senza reinvio automatico. La regola vale per qualunque modello della wake word selezionato dal catalogo. La prova su x86_64 e arm64 deve misurare se 1500 ms bastano per la frase continua.

#### Metadata
  * type: behavior

#### Relations
  * define: [Conservazione della richiesta continua](../Requirements/VoiceSatellite.md#conservazione-della-richiesta-continua)
---

### Catalogo e selezione dei modelli

La variabile `AMBROGIO_WAKE_WORD_MODEL` seleziona un solo identificatore disponibile. L'identificatore predefinito per Hey Jarvis è `hey_jarvis`. La distribuzione contiene `hey_jarvis`, `hey_mycroft` e `alexa`, associati rispettivamente a `hey_jarvis_v0.1.onnx`, `hey_mycroft_v0.1.onnx` e `alexa_v0.1.onnx` della release openWakeWord v0.5.1, con `melspectrogram.onnx` e `embedding_model.onnx` della stessa release. Origine, hash SHA-256, attribuzione e licenza dei file distribuiti sono registrati in `models/wakeword/README.md`; la licenza CC BY-NC-SA 4.0 accompagna i file. L'immagine container include questa directory; un mount in sola lettura su `/app/models/wakeword` la sostituisce. Un file personalizzato `<identificatore>.onnx` nella directory montata aggiunge quell'identificatore al catalogo disponibile, purché il nome sia composto solo da lettere minuscole ASCII, cifre, trattino o sottolineatura, inizi con una lettera o cifra e non sia riservato ai modelli comuni. Il file deve essere un classificatore openWakeWord compatibile; la directory montata deve contenere anche `melspectrogram.onnx` e `embedding_model.onnx`. Un identificatore non disponibile è una configurazione invalida; non si accettano percorsi arbitrari o separatori di directory nella configurazione. La provenienza e la licenza dei modelli personalizzati sono responsabilità di chi li installa.

La frase selezionata per `alexa` è «Alexa», senza «Hey». Il modello openWakeWord è addestrato per questa parola; la documentazione segnala più mancati riconoscimenti possibili per «Hey Alexa» (https://github.com/dscripka/openWakeWord/blob/main/docs/models/alexa.md). L'accuratezza del riconoscimento, attivazioni corrette e spurie comprese, dipende dal modello e dalla soglia scelti da chi installa; il satellite non la misura.

#### Metadata
  * type: specification

#### Relations
  * define: [Selezione della wake word configurata](../Requirements/VoiceSatellite.md#selezione-della-wake-word-configurata)
---

### Ciclo di arresto e rilascio delle risorse

SIGINT e SIGTERM bloccano nuovi eventi, annullano timer e riproduzione (compresi il segnale di ascolto e il tono di errore), chiudono l'acquisizione e il canale e rilasciano le sessioni ONNX. Non si attende la risposta completa del backend. La normale attesa della risposta resta valida fuori dall'arresto.

La composition root possiede il ciclo di vita delle risorse e ne registra la chiusura subito dopo l'acquisizione: modello della wake word, rilevatore di attività vocale, chiamata conversazionale con il suo canale, sessione vocale e, all'attivazione, acquisizione dal microfono. All'arresto, dopo aver annullato la riproduzione, le chiude in ordine inverso: microfono, sessione vocale, chiamata e canale, rilevatore di attività vocale, modello della wake word. Ogni chiusura è tentata anche quando una precedente fallisce, e il suo guasto è incapsulato in un `ProjectError` che nomina la risorsa: `Microphone could not be closed`, `Voice session could not be stopped`, `Conversation channel could not be closed`, `Voice activity model could not be closed`, `Wake word model could not be closed`; l'annullamento della riproduzione fallito diventa `Playback could not be cancelled`. Le operazioni native in corso vengono terminate o attese quanto necessario per un rilascio sicuro; il lavoro accodato viene scartato e nessuna chiamata viene riaperta. Risorse acquisite dopo una richiesta di arresto durante l'avvio vengono subito rilasciate. Un avvio parziale fallito conserva il guasto originale e gli eventuali guasti di pulizia in un `LifecycleError`, con il guasto dell'avvio al primo posto. Richieste concorrenti condividono lo stesso arresto, anche se fallisce; nessun doppio rilascio nativo. Un arresto fallito produce una sola riga `satellite_process_failed` di livello `error` con `err` e codice di uscita 1; un arresto riuscito termina con codice 0.

#### Metadata
  * type: specification

#### Relations
  * define: [Rilascio completo delle risorse del satellite](../Requirements/VoiceSatellite.md#rilascio-completo-delle-risorse-del-satellite)
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

Il satellite ha un solo modulo di configurazione, `src/runtime/configuration.ts`, compreso nella build. All'avvio `src/main.ts` gli consegna l'ambiente del processo; il modulo legge le variabili seguenti una sola volta, prima di costruire risorse audio o di rete, applica i valori predefiniti di cui è l'unico proprietario e restituisce la configurazione validata, che la composition root distribuisce ai componenti. Una variabile vuota equivale a una variabile assente. Ogni valore predefinito vale in tutti e tre gli ambienti di esecuzione; il satellite non ha valori predefiniti di solo sviluppo.

| Variabile | Valore ammesso | Valore predefinito |
|---|---|---|
| `AMBROGIO_ENV` | `development`, `test` o `production` | nessuno: obbligatoria |
| `AMBROGIO_BACKEND_URL` | URL assoluto HTTP o HTTPS senza credenziali, query o frammento, senza spazi iniziali o finali | nessuno: obbligatoria |
| `AMBROGIO_CLIENT_ID` | testo non fatto di soli spazi, secondo «Identità del satellite nella sessione» | `satellite-<nome host>` |
| `AMBROGIO_CLIENT_NAME` | testo non fatto di soli spazi | il nome host |
| `AMBROGIO_MICROPHONE`, `AMBROGIO_SPEAKER` | selettore senza spazi iniziali o finali, secondo «Adapter audio con Decibri» | nessuno: si usa il dispositivo predefinito del sistema |
| `AMBROGIO_ATTENUATION_DEVICE`, `AMBROGIO_ATTENUATION_CONTROL`, `AMBROGIO_ATTENUATION_LEVEL` | secondo «Attenuazione locale con softvol e amixer», tutte presenti o tutte assenti | nessuno: senza le tre variabili non si regola alcun controllo |
| `AMBROGIO_WAKE_WORD_MODEL` | identificatore disponibile secondo «Catalogo e selezione dei modelli» | `hey_jarvis` |
| `AMBROGIO_WAKE_WORD_THRESHOLD` | numero decimale maggiore di 0 e non superiore a 1, la soglia di riconoscimento | `0.5` |
| `AMBROGIO_WAKE_WORD_PATIENCE` | intero da 1 a 10, il numero di blocchi consecutivi da 80 ms in cui il punteggio deve raggiungere la soglia | `2` |
| `AMBROGIO_REPLY_TIMEOUT_MS` | intero positivo in millisecondi, l'intervallo locale di inattività della replica | `15000` |

I numeri sono scritti in cifre decimali, senza segno né unità. Il satellite deriva il canale conversazionale WebSocket aggiungendo `api/session` al prefisso di percorso di `AMBROGIO_BACKEND_URL`, usando `ws:` per `http:` e `wss:` per `https:`; la configurazione non contiene un percorso WebSocket separato. Il modulo non contiene valori effettivi di un'installazione. Le altre variabili dell'ambiente non sono lette dal modulo; impostazioni aggiuntive richiedono una nuova specificazione.

Il processo si avvia senza argomenti, sull'host con `node dist/main.js` e nel container con il comando dell'immagine: un argomento qualsiasi, compreso `--config`, è rifiutato secondo «Evento diagnostico della configurazione rifiutata» prima di leggere la configurazione. Il primo valore mancante o invalido, nell'ordine della tabella, impedisce l'avvio operativo. Host e container usano le stesse variabili con lo stesso significato.

In sviluppo il comando `pnpm dev` esegue `node --env-file=.env dist/main.js`. `.env.example` elenca tutte le variabili della tabella con valore vuoto, salvo `AMBROGIO_ENV=development`. `compose.example.yaml` imposta soltanto `AMBROGIO_ENV: production` e `AMBROGIO_BACKEND_URL`, senza ripetere valori predefiniti.

#### Metadata
  * type: specification

#### Relations
  * define: [Configurazione del satellite dalle variabili d'ambiente](../Requirements/VoiceSatellite.md#configurazione-del-satellite-dalle-variabili-dambiente)
---

### Contratto osservabile della sessione vocale

VoiceSession espone un evento Application per wake word riconosciuta, inizio/fine parlato, esito del turno e risposta riprodotta. L'esito del turno porta l'indicazione della replica attesa, booleana oppure assente: per `turn.completed` l'adapter del canale conversazionale consegna `expectsReply`, convertendo un valore non booleano in assenza di indicazione per preservare la politica di chiusura sicura; `turn.failed`, `turn.rejected` e `turn.interrupted` sono consegnati come esiti conclusivi, equivalenti a `expectsReply: false`. La risposta riprodotta è segnalata dall'adapter soltanto quando l'esito è arrivato e la riproduzione di tutte le trasmissioni del turno è terminata, cioè dopo `output.end` e lo svuotamento della coda dello speaker. La conversazione da continuare in una replica resta un dato dell'adapter del canale e non entra nello stato Domain. Gli eventi tecnici di apertura/chiusura della porta e scadenza dei timer restano privati del caso d'uso.

Lo stato osservabile è una proiezione Application immutabile per tipo, restituita come nuovo oggetto: acceptsWakeWord indica se inoltrare frame al riconoscimento, acceptsSpeechEnd se completare il parlato in corso, interactionActive se una perdita della sessione costituisce un guasto dell'interazione. Il primo valore corrisponde all'attesa della wake word, il secondo alla registrazione; interactionActive è falso durante attesa iniziale e chiusura. Non si espongono phase, enum o riferimenti allo stato Domain. Nessuna duplicazione della macchina a stati: Domain mantiene regole e transizioni, Application traduce gli eventi e proietta i soli dati necessari agli ingressi. Fail e stop conservano il comportamento concordato.

#### Metadata
  * type: specification
---

### Convenzione TypeScript di porte e dati

Il satellite usa interface per contratti Application a oggetto che espongono capacità tramite operazioni nominate; type per dati, unioni di eventi/esiti e contratti callable. La classificazione dipende dalla responsabilità del contratto e comprende le capacità restituite da una porta.

VoiceSessionPorts e DeadlineScheduler sono porte a oggetto; ScheduledDeadline è la capacità di cancellazione restituita dallo scheduler e usa anch'essa interface. VoiceSessionEvent e VoiceSessionStatus descrivono eventi e dati, quindi restano type. La callback dello scheduler resta una firma callable. Le operazioni delle porte a oggetto sono proprietà callable `readonly`, per conservarne l'immutabilità. Questa convenzione non impone classi agli adapter, non aggiunge operazioni e non cambia la semantica dei contratti.

#### Metadata
  * type: specification
---

### Esecuzione host e container

L'applicazione TypeScript compilata in JavaScript ESM usa Node.js 24 o successivo, come il backend, e funziona direttamente su Linux x86_64 e arm64 con dipendenze e modelli installati. Docker è una modalità facoltativa che confeziona la stessa applicazione per linux/amd64 e linux/arm64. La configurazione ha lo stesso significato in entrambe le modalità. L'immagine container include le dipendenze native richieste dai contratti «Adapter audio con Decibri» e «Attenuazione locale con softvol e amixer» e accede alle periferiche audio soltanto se chi installa le espone esplicitamente al container. ONNX Runtime richiede il proprio pacchetto nativo per la piattaforma.

Nel container il processo si avvia con `node dist/main.js`, senza argomenti: chi installa fornisce la configurazione soltanto come variabili d'ambiente del container. L'immagine non imposta variabili `AMBROGIO_*`, `AMBROGIO_ENV` compresa, e non contiene file di configurazione né file d'ambiente. Il file `.dockerignore` esclude dal contesto di build la storia Git, `node_modules` a ogni livello, `dist`, il modello, i test, i file di database e i file d'ambiente `.env`, `*.env` e `*.env.*`. L'immagine finale dichiara le etichette OCI `org.opencontainers.image.source` con l'URL del repository `https://github.com/ambrogio-app/ambrogio-satellite` e `org.opencontainers.image.licenses` con `MIT`, la licenza del codice nel file `LICENSE`. L'immagine si avvia con il solo runtime dei container, per esempio con `docker run`; l'esempio `compose.example.yaml` fornisce le variabili secondo «Configurazione del processo satellite», usa la rete dell'host ed espone `/dev/snd`. Le prove su periferiche reali devono coprire entrambe le architetture.

La fase di build dell'immagine installa le dipendenze secondo «Profilo di installazione delle dipendenze del satellite». Il supporto dell'architettura non dimostra compatibilità con ogni distribuzione o periferica.

#### Metadata
  * type: specification

#### Relations
  * define: [Distribuzione Docker facoltativa](../Requirements/VoiceSatellite.md#distribuzione-docker-facoltativa)
---

### Esiti e diagnostica del satellite

Il tipo locale è `type Result<T, E> = Readonly<{ ok: true; value: T }> | Readonly<{ ok: false; error: E }>`. I rifiuti previsti sono tipi nominati immutabili, distinti mediante `kind`, senza classi o instanceof. Ogni porta e caso d’uso dichiara i propri rifiuti; non esiste un catalogo globale. Application interpreta gli esiti delle porte e restituisce le proprie varianti, gestite esaustivamente dagli adapter inbound. I guasti inattesi sono Error; un nuovo Error aggiunge contesto soltanto quando utile, preservando l’originale con cause. Il confine tecnico responsabile produce la diagnosi definitiva; i passaggi intermedi propagano senza log duplicati. Gli esiti previsti non producono automaticamente log di errore. Il messaggio pubblico resta separato dalla diagnosi tecnica. Il logger tecnico è Pino.

#### Metadata
  * type: specification

#### Relations
  * define: [Esiti previsti come valori tipizzati nel satellite](../Requirements/VoiceSatellite.md#esiti-previsti-come-valori-tipizzati-nel-satellite)
---

### Evento diagnostico del mancato avvio del satellite

Il runner del processo satellite è il confine definitivo dei guasti avvenuti prima che il satellite attenda la wake word: quando il caricamento dei modelli o l'attivazione falliscono, emette una sola riga JSON su `stdout` con livello `error`, `event: "satellite_startup_failed"`, il messaggio fisso `Satellite startup failed` e il campo `err`, poi scrive su `stderr` la propria riga invariata `Unable to start Ambrogio satellite.` e termina con codice di uscita `1` senza emettere `satellite_ready`. Il satellite non resta attivo e non emette altri log definitivi per lo stesso guasto.

Il campo `err` segue il profilo controllato di serializzazione. Le fasi incapsulano i guasti esterni in un `ProjectError` con un messaggio fisso che nomina la fase e conserva l'originale come `cause`: `Wake word model could not be loaded` per i modelli della wake word, `Voice activity model could not be loaded` per il modello dell'attività vocale e `Microphone could not be started` per l'acquisizione dal microfono. Se anche la pulizia delle risorse già acquisite fallisce, `err` è un `LifecycleError` con il messaggio fisso `Satellite startup failed` e `faults` che elenca il guasto dell'avvio seguito dai guasti di pulizia. I messaggi non contengono valori letti dall'ambiente, percorsi, nomi di dispositivi, URL o messaggi di librerie. Le righe che le librerie native scrivono da sé su `stderr`, come gli avvisi di ONNX Runtime che iniziano con un timestamp seguito da `[W:onnxruntime` o `[E:onnxruntime`, non sono righe del satellite.

#### Metadata
  * type: input-output

#### Relations
  * define: [Diagnostica del mancato avvio del satellite](../Requirements/VoiceSatellite.md#diagnostica-del-mancato-avvio-del-satellite)
---

### Evento diagnostico dell'attivazione locale

Per rendere tracciabili le attivazioni spontanee, a ogni rilevamento confermato della wake word il satellite emette una sola riga Pino di livello `info` con `event: "satellite_wake_detected"`, `score`, il punteggio del classificatore nel blocco che conferma il rilevamento arrotondato a tre decimali, e `chunks`, il numero di blocchi consecutivi da 80 ms che hanno raggiunto la soglia fino a quel blocco. L'ora è quella del campo `time` di Pino. La riga non contiene audio, identificatori del modello, configurazione o dati della sessione. Un rilevamento ignorato per l'intervallo minimo fra rilevamenti non produce la riga.

#### Metadata
  * type: input-output

#### Relations
  * define: [Registrazione delle attivazioni locali](../Requirements/VoiceSatellite.md#registrazione-delle-attivazioni-locali)
---

### Evento diagnostico della configurazione rifiutata

Per rendere comprensibile il rifiuto della configurazione, quando una variabile del contratto «Configurazione del processo satellite» manca o non è valida il satellite emette una sola riga Pino di livello `info` con `event: "invalid_configuration"`, `variable`, il nome della prima variabile rifiutata, e `condition`, che vale `missing` quando una variabile obbligatoria manca o è vuota, compresa una variabile dell'attenuazione assente mentre un'altra è presente, e `invalid` quando il valore non è ammesso. Il processo termina con codice 2 senza costruire risorse audio o di rete.

La riga non riporta valori letti dall'ambiente, percorsi, nome host o messaggi di librerie: `variable` e `condition` sono costanti scelte dal satellite, e la riga contiene soltanto le chiavi `level`, `time`, `event`, `variable` e `condition`. Il rifiuto degli argomenti di avvio resta l'evento `invalid_arguments` senza campi aggiuntivi, con lo stesso codice di uscita 2.

#### Metadata
  * type: input-output

#### Relations
  * define: [Rifiuto della configurazione invalida](../Requirements/VoiceSatellite.md#rifiuto-della-configurazione-invalida)
---

### Hook pre-commit dei segreti con gitleaks

L'hook `.githooks/pre-commit` del satellite realizza l'hook locale del «Profilo di scansione dei segreti con gitleaks» di `ambrogio-model` come script POSIX `sh` eseguibile. Il messaggio stampato quando `gitleaks` non è nel `PATH` va su stderr e indica, oltre alla versione da installare, come abilitare l'hook con `git config core.hooksPath .githooks`. La scansione in CI resta la garanzia sul repository remoto.

#### Metadata
  * type: specification

#### Relations
  * define: [Controllo dei segreti prima del commit locale](../Requirements/VoiceSatellite.md#controllo-dei-segreti-prima-del-commit-locale)
---

### Identità del satellite nella sessione

Le variabili facoltative `AMBROGIO_CLIENT_ID` e `AMBROGIO_CLIENT_NAME` contengono testo non fatto di soli spazi. In assenza, il modulo di configurazione applica a `AMBROGIO_CLIENT_ID` il valore `satellite-<nome host>` e a `AMBROGIO_CLIENT_NAME` il nome host. Il satellite invia questi valori come `clientId` e `name` di `session.hello`. L'identificativo resta stabile tra un avvio e l'altro sulla stessa macchina finché la configurazione non cambia; il nome serve alla famiglia per riconoscere il satellite, per esempio «Cucina». Un valore fatto di soli spazi rende invalida la configurazione; un valore vuoto equivale a una variabile assente.

#### Metadata
  * type: specification

#### Relations
  * define: [Identificazione del satellite nella sessione](../Requirements/VoiceSatellite.md#identificazione-del-satellite-nella-sessione)
---

### Motore locale della wake word con ONNX

La prima versione esegue nel processo TypeScript/Node.js del satellite la pipeline di riconoscimento openWakeWord con modelli ONNX, usando `onnxruntime-node` 1.30.0 fissato nel lockfile. Il riconoscimento della wake word rimane locale al satellite. I modelli e le risorse condivise necessari alla pipeline sono caricati dai file distribuiti con l'applicazione; il satellite non richiede un servizio Wyoming per questa funzione.

I valori predefiniti sono la soglia di riconoscimento e il numero di blocchi consecutivi definiti dal contratto «Configurazione del processo satellite», l'intervallo minimo fra rilevamenti di 2000 ms e al massimo 32 blocchi da 80 ms accodati per l'inferenza. Il superamento del limite è un guasto diagnosticato, non un accumulo illimitato. Il supporto dei binari Node.js per Linux x64 e arm64 è documentato da ONNX Runtime: https://onnxruntime.ai/docs/get-started/with-javascript/node.html .

La soglia di riconoscimento è configurabile con `AMBROGIO_WAKE_WORD_THRESHOLD`, perché un modello attiva il satellite anche senza che la parola sia pronunciata. Una soglia più alta riduce le attivazioni spontanee e aumenta il rischio di parole non riconosciute; la scelta del modello e della soglia, e quindi l'accuratezza del riconoscimento, è responsabilità di chi installa.

Un rilevamento richiede che il punteggio del classificatore raggiunga la soglia nel numero di blocchi consecutivi da 80 ms indicato da `AMBROGIO_WAKE_WORD_PATIENCE` da 80 ms, come il parametro `patience` di `Model.predict` di openWakeWord (https://github.com/dscripka/openWakeWord/blob/main/openwakeword/model.py). Un blocco sotto soglia azzera il conteggio; anche l'azzeramento della pipeline al ritorno in attesa della wake word lo azzera. Con 2 blocchi richiesti un impulso sonoro, come un colpo di tosse, che supera la soglia in un solo blocco non attiva il satellite; con 1 basta un solo blocco. Ogni blocco richiesto in più aggiunge circa 80 ms al riconoscimento e aumenta il rischio di parole non riconosciute se la wake word è pronunciata in fretta. L'intervallo minimo fra rilevamenti si applica al rilevamento confermato. Non si introducono il filtro VAD sui punteggi né la soppressione del rumore di openWakeWord.

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

GitHub Actions esegue il job stabile `Satellite checks` del workflow `.github/workflows/ci.yml` su ogni pull request, sui push a main, su richiesta manuale e quando un altro workflow lo richiama come workflow riutilizzabile, senza filtri sui percorsi, con la variabile `BRANCH` uguale a `github.head_ref` per una pull request e altrimenti a `github.ref_name`. Runner Linux Ubuntu 24.04 x86_64 e Node.js 24. Il job esegue il checkout del repository in `workspace/ambrogio-satellite` con `fetch-depth: 0`, scarica `ambrogio-model` in `workspace/ambrogio-model` sul branch `BRANCH` se esiste sul remoto e altrimenti su `main`, ed esegue `workspace/ambrogio-model/scripts/checkout-workspace workspace "$BRANCH"` secondo «Checkout affiancato dello spazio di lavoro», poi `workspace/ambrogio-model/scripts/model-checks --workspace workspace` secondo «Controlli del modello dello spazio di lavoro», con la versione di Reqvire di «Risoluzione della versione di Reqvire». Il job dichiara nel proprio ambiente `COREPACK_ENABLE_DOWNLOAD_PROMPT: '0'` ed esegue poi `corepack enable` secondo «Profilo di installazione con pnpm e Corepack», e prepara il backend affiancato in `workspace/ambrogio-backend` con `pnpm install --frozen-lockfile` e `pnpm build`, alla versione di pnpm dichiarata dal backend. I passi successivi girano in `workspace/ambrogio-satellite`: installazione con lockfile congelato, senza scaricare i binari di ONNX Runtime durante l'installazione e con la telemetria di ONNX Runtime disattivata; `pnpm audit --audit-level high` secondo «Audit delle dipendenze con pnpm»; pnpm typecheck (compreso tsconfig.core.json); installazione di gitleaks; pnpm test; `pnpm test:e2e`; pnpm build; `pnpm test:backend`, la prova di integrazione con il backend affiancato compilato nel job, che avvia il backend soltanto tramite «Ingresso di prova del server conversazionale» e stampa il commit del backend usato. Il job installa la versione di gitleaks del «Profilo di scansione dei segreti con gitleaks» di `ambrogio-model` con lo stesso archivio della release ufficiale e la stessa impronta SHA-256, verificata prima dell'estrazione, perché la suite esegue l'hook pre-commit; se l'impronta non corrisponde il job fallisce. Nessuna credenziale personale è richiesta; permessi, tempo massimo e azioni fissate seguono il contratto «Protezioni dei workflow GitHub Actions». Le prove audio con periferiche e la compatibilità arm64 restano verifiche separate prima del rilascio.

#### Metadata
  * type: specification

#### Relations
  * define: [Controlli CI delle modifiche del satellite](../Requirements/VoiceSatellite.md#controlli-ci-delle-modifiche-del-satellite)
---

### Profilo della scansione dei segreti del satellite

Il workflow `.github/workflows/secret-scan.yml` del satellite realizza nel job `Secret scan` la scansione in CI del «Profilo di scansione dei segreti con gitleaks» di `ambrogio-model`, con la versione, l'archivio, l'impronta e il comando di quel profilo. Un aggiornamento di gitleaks aggiorna insieme versione e impronta. Permessi, tempo massimo e azioni fissate seguono il contratto «Protezioni dei workflow GitHub Actions».

#### Metadata
  * type: specification

#### Relations
  * define: [Scansione dei segreti nella storia del repository](../Requirements/VoiceSatellite.md#scansione-dei-segreti-nella-storia-del-repository)
---

### Profilo di installazione delle dipendenze del satellite

Il `package.json` del satellite dichiara `"packageManager": "pnpm@12.11.2"` e ogni dipendenza, di esecuzione e di sviluppo, con la versione esatta risolta in `pnpm-lock.yaml`, senza intervalli di versione. Il job `Satellite checks` e la fase di build del `Dockerfile`, che parte da `node:24-bookworm-slim`, attivano quella versione con Corepack secondo «Profilo di installazione con pnpm e Corepack» e installano con `pnpm install --frozen-lockfile`, con `ONNXRUNTIME_NODE_INSTALL=skip`. La regola di attesa di 24 ore per le nuove versioni è attiva; `pnpm-workspace.yaml` ammette come sole eccezioni Vitest 5.0.5 e i pacchetti `@vitest/mocker` e `@vitest/spy` 5.0.5, fissati prima del compimento dell'attesa, e consente gli script di build soltanto a `onnxruntime-node`. La build Docker esegue l'installazione congelata con i build script nativi previsti, senza patch locali alle dipendenze.

#### Metadata
  * type: specification

#### Relations
  * define: [Installazione delle dipendenze del satellite con pnpm e Corepack](../Requirements/VoiceSatellite.md#installazione-delle-dipendenze-del-satellite-con-pnpm-e-corepack)
---

### Profilo di pubblicazione Docker del satellite

Il workflow `.github/workflows/publish-image.yml` pubblica `ghcr.io/ambrogio-app/ambrogio-satellite` al push di un tag vMAJOR.MINOR.PATCH, con versione corrispondente a package.json; il repository appartiene all'organizzazione GitHub `ambrogio-app`. Il tag immagine finale coincide con il tag Git; nessun latest. Il workflow richiama sul medesimo commit, come workflow riutilizzabili, la CI del contratto «Profilo CI del satellite» e la scansione del contratto «Profilo della scansione dei segreti del satellite»; il job di pubblicazione dipende da entrambi e non viene eseguito se uno dei due fallisce. Il job costruisce poi e verifica entrambe le immagini linux/amd64 e linux/arm64. Le immagini verificate ricevono i tag tecnici <versione>-amd64 e <versione>-arm64; il tag di release riunisce entrambe in un manifest. Nessun push avviene prima che entrambe le verifiche locali siano riuscite. Il job di pubblicazione accede a GHCR con `GITHUB_TOKEN` e il permesso `packages: write`, secondo il contratto «Protezioni dei workflow GitHub Actions»; un push ordinario su main non pubblica. L’emulazione è ammessa per build e smoke test arm64, ma non dimostra audio o prestazioni su hardware reale. Dopo il push del manifest il job scrive nel riepilogo del job, con `$GITHUB_STEP_SUMMARY`, il riferimento dell'immagine pubblicata `ghcr.io/ambrogio-app/ambrogio-satellite:<tag Git>` e le sue piattaforme. Docker resta facoltativo. Il workflow non cambia la visibilità del pacchetto nel registro.

#### Metadata
  * type: specification

#### Relations
  * define: [Pubblicazione delle immagini Docker del satellite](../Requirements/VoiceSatellite.md#pubblicazione-delle-immagini-docker-del-satellite)
---

### Profilo diagnostico Pino

Il logger di base del satellite emette con Pino una riga JSON su stdout, con livello testuale, timestamp ed event costante, senza i campi `pid` e `hostname`. Nessuna acquisizione automatica di configurazione, audio, messaggi, hostname o dati ricevuti. I rifiuti previsti di avvio sono eventi informativi, senza err; il mancato avvio, il guasto dell'arresto, i guasti dell'interazione e della riproduzione del tono di errore hanno eventi distinti. La normalizzazione al confine conserva l'identità di Error e incapsula gli altri valori con il messaggio costante `Unexpected satellite failure` e cause originale, senza conversione a stringa. La vista JSON di err segue il profilo controllato di serializzazione: `ProjectError` e `LifecycleError` sono le classi del progetto in `src/runtime/project-error.ts`, e ogni altro valore riceve la descrizione costante `Unexpected satellite failure`. Il tono di errore resta indipendente dalla diagnosi. Domain e Application non importano logger.

#### Details
Nessuna dipendenza di trasporto emette direttamente su console i messaggi ricevuti o gli errori grezzi: il trasporto `ambrogio.v1` usa il `WebSocket` integrato in Node.js e diagnostica i propri guasti soltanto attraverso il logger applicativo.

#### Metadata
  * type: specification

#### Relations
  * define: [Serializzazione protetta dei guasti](../Requirements/VoiceSatellite.md#serializzazione-protetta-dei-guasti)
---

### Profilo iniziale di osservabilità del satellite

La diagnostica iniziale usa i log JSON applicativi già previsti. Non sono introdotti contatori o API applicative di metriche, exporter di tracing distribuito o registri di audit. I log non costituiscono un registro di audit garantito. Ogni estensione, per esempio conteggi delle attivazioni o tempi di risposta, richiede un bisogno concreto concordato, requisiti e contratti propri, protezioni dei dati e verifiche dedicate. La raccolta esterna dei log resta responsabilità del deployment. Il profilo non introduce identificativi di correlazione nel satellite né modifiche al protocollo conversazionale; la correlazione diagnostica delle sessioni appartiene al backend.

#### Metadata
  * type: specification

#### Relations
  * define: [Perimetro iniziale dei segnali di osservabilità del satellite](../Requirements/VoiceSatellite.md#perimetro-iniziale-dei-segnali-di-osservabilità-del-satellite)
---

### Protezioni dei workflow GitHub Actions

I workflow `.github/workflows/ci.yml`, `.github/workflows/secret-scan.yml` e `.github/workflows/publish-image.yml` applicano il «Profilo comune dei workflow GitHub Actions» di `ambrogio-model` con questi valori propri del satellite:

- azioni esterne aggiuntive, fissate allo stesso modo: `docker/setup-qemu-action@c7c53464625b32c7a7e944ae62b3e17d2b600130` (v3) e `docker/setup-buildx-action@8d2750c68a42422c14e847fe6c8ac0403b4cbd6f` (v3);
- `actions/setup-node` con `package-manager-cache: false`, senza cache condivise fra esecuzioni;
- tempo massimo per job: `timeout-minutes: 15` per `Satellite checks`, `10` per `Secret scan` e `60` per il job `publish`, che è l'unico a ricevere `packages: write`;
- il workflow di pubblicazione usa il gruppo di concorrenza `satellite-release-<ref>` senza annullare un'esecuzione in corso, passa `GITHUB_TOKEN` a `docker login` tramite stdin ed esegue `docker logout ghcr.io` anche quando un passo precedente fallisce.

#### Metadata
  * type: specification

#### Relations
  * define: [Privilegi e durata limitati dei workflow GitHub Actions](../Requirements/VoiceSatellite.md#privilegi-e-durata-limitati-dei-workflow-github-actions)
---

### Recupero locale da backend irraggiungibile

Il fallimento è segnalato con il tono definito in «Tono locale di errore», generato localmente e quindi riproducibile anche quando il backend non risponde. Dopo il tono il processo resta attivo e torna ad attendere la wake word. Una nuova attivazione tenta una nuova interazione, riaprendo la sessione se necessario. Non si conserva la richiesta fallita per reinviarla automaticamente. Il medesimo recupero si applica alla sessione che non si apre o si chiude durante un'interazione, a un `session.error` riferito alla richiesta corrente, all'esito mancante entro 60 secondi dalla fine della richiesta e ai guasti tecnici durante un'interazione, dopo aver interrotto la trasmissione e la riproduzione correnti.

#### Metadata
  * type: behavior

#### Relations
  * define: [Ripristino dopo backend irraggiungibile](../Requirements/VoiceSatellite.md#ripristino-dopo-backend-irraggiungibile)
---

### Regole della replica vocale

Il satellite riceve l'indicazione `expectsReply` in `turn.completed`, secondo «Esiti del turno nel protocollo Ambrogio v1» del backend. I turni conclusi con `turn.failed`, `turn.rejected` o `turn.interrupted` non comunicano `expectsReply` e il satellite li tratta come conclusivi, dopo aver riprodotto l'eventuale audio del messaggio pubblico.

Il satellite associa esiti e trasmissioni alla richiesta corrente tramite `requestId` e `turnId`. Riproduce in ordine le trasmissioni audio del turno e considera completata la risposta quando ha ricevuto l'esito del turno e lo speaker ha riprodotto tutti i campioni accodati dopo l'ultimo `output.end`. Se l'esito non arriva entro 60 secondi dalla fine della richiesta, il satellite chiude l'interazione con il recupero locale senza aprire una replica.

Soltanto dopo la riproduzione completa e un `turn.completed` con `expectsReply: true`, il satellite apre una finestra locale di inattività di 15 secondi predefiniti e ammette una replica senza wake word nella stessa conversazione, usando il `conversationId` ricevuto in `turn.accepted`; con `false`, valore mancante o esito conclusivo torna alla wake word. Ignora esiti e trasmissioni che non appartengono alla richiesta corrente. L'intervallo ricomincia dopo ogni nuova risposta riprodotta. Il satellite non invia al backend segnali sulla fine della riproduzione.

#### Metadata
  * type: behavior

#### Relations
  * define: [Replica richiesta dal backend](../Requirements/VoiceSatellite.md#replica-richiesta-dal-backend)
---

### Regole di architettura del satellite

La fonte centrale delle regole è `test/repository/architecture-rules.ts`: ogni regola ha il nome stabile indicato qui, analizza tutti i file TypeScript di `src` e `test` che Git vede, tracciati oppure nuovi e non ignorati, con ogni import letto dal testo, compresi gli import di soli tipi, e riporta ogni violazione con il proprio nome. La suite Vitest fallisce se l'analisi del repository riporta una violazione non eccettuata e se la fixture negativa di una regola non fallisce con il nome di quella regola.

Sono file di produzione i file di `src` che non terminano con `.spec.ts`; i file `*.spec.ts` di `src` sono test e prendono il layer del file che verificano, accanto al quale risiedono secondo «Suite di test con Vitest».

- `production-layer-classification`: ogni file di `src` appartiene a Domain, Application, adapter inbound o outbound, composition root, runtime o è `src/main.ts`, oppure è un test `*.spec.ts` accanto a uno di quei file; serve «Separazione Domain Application e adapter».
- `core-layer-imports`: il codice di produzione Domain importa soltanto Domain, quello Application soltanto Application e Domain, senza moduli esterni né moduli `node:`; serve «Separazione Domain Application e adapter» e «Distribuzione mirata della configurazione».
- `composition-root-assembly`: fra il codice di produzione, soltanto la composition root importa come valore i file `*.use-case.ts` e `*.adapter.ts`; serve «Assemblaggio delle risorse nella composition root».
- `technical-factory-imports`: le factory tecniche del runtime, `src/runtime/fatal-path.ts`, `src/runtime/lifecycle.ts`, `src/runtime/logger.ts` e `src/runtime/satellite-process.ts`, importano fra i file di `src` soltanto file di `src/runtime/`; serve «Factory tecniche del satellite senza conoscenza business».
- `no-dependency-container`: nessun file di `src` o `test` importa un container di dependency injection: `awilix`, `inversify`, `tsyringe`, `typedi`, `injection-js` o `@nestjs/core`; serve «Assemblaggio delle risorse nella composition root».
- `layer-test-imports`: ogni file di test di `src` e `test` si chiama `*.spec.ts`, e ogni test di `src` ha accanto il file che verifica; fra il codice di produzione, i test accanto a un file Domain importano soltanto Domain, quelli accanto a un file Application soltanto Application e Domain, quelli accanto a un adapter inbound soltanto l'adapter che verificano e Application, quelli accanto a un adapter outbound soltanto il proprio adapter, cioè il file che verificano e i file degli adapter outbound che quel file importa direttamente, Application e Domain; serve «Confini degli import nei test».
- `no-backend-imports`: ogni import del codice di produzione si risolve dentro `src`, in un modulo Node.js o in una dipendenza di esecuzione del satellite; serve «Uso delle sole interfacce pubbliche del backend nel satellite».
- `pino-only-in-logger`: fra il codice di produzione, soltanto `src/runtime/logger.ts` importa `pino`; serve «Logger minimo del satellite».

Un'eccezione è una voce dell'elenco `exceptions` del modulo centrale con il nome della regola, il file, lo specificatore dell'import ammesso e il motivo, e corrisponde a una voce di questo contratto. L'elenco è vuoto: il satellite non ha eccezioni alle regole di architettura.

#### Metadata
  * type: specification

#### Relations
  * define: [Regole di architettura centrali del satellite](../Requirements/VoiceSatellite.md#regole-di-architettura-centrali-del-satellite)
---

### Regole di importazione dei test

Ai test del satellite si applicano le regole di import per layer del requisito comune «Import del codice di produzione nei test per layer», anche per i soli tipi; il layer di un test è quello del file accanto al quale risiede e che verifica. Le prove di integrazione della composition root e del confine di processo attraversano i layer e restano escluse da quelle regole. Nei test Application le porte permettono di simulare audio, riconoscimento e backend senza dispositivi reali. Il progetto usa Vitest per i test.

#### Metadata
  * type: constraint

#### Relations
  * define: [Confini degli import nei test](../Requirements/VoiceSatellite.md#confini-degli-import-nei-test)
---

### Responsabilità della raccolta dei log

Il processo satellite emette i log applicativi JSON su stdout. Nell’esecuzione container, raccolta, durata di conservazione, rotazione ed eventuale inoltro sono configurati nel runtime Docker o nell’infrastruttura dell’installazione. Nell’esecuzione diretta, l’installatore sceglie un gestore di servizi, per esempio systemd con journald, oppure un collettore esterno. Nessun percorso di file log, credenziale di raccolta o endpoint di logging entra nella configurazione applicativa. Non è imposto un prodotto di raccolta né un periodo di conservazione predefinito. L’avvio diretto da terminale non garantisce conservazione.

#### Metadata
  * type: specification

#### Relations
  * define: [Gestione dei log affidata al deployment](../Requirements/VoiceSatellite.md#gestione-dei-log-affidata-al-deployment)
---

### Responsabilità interne del satellite

Domain contiene stati e regole dell’interazione locale. Application coordina i casi d’uso e dichiara porte nei termini delle capacità richieste. Gli adapter inbound invocano Application; gli adapter outbound realizzano le porte. Audio, wake word e trasporto restano negli adapter; Domain e Application non importano librerie tecniche, neppure soltanto per i tipi. La composition root costruisce risorse e collega le porte. Il satellite resta un solo progetto nel proprio repository, senza workspace multipackage, e usa pnpm per installazione e lockfile. Non si introducono contenitori generici shared, common o utils senza una decisione esplicita.

#### Metadata
  * type: specification

#### Relations
  * define: [Separazione Domain Application e adapter](../Requirements/VoiceSatellite.md#separazione-domain-application-e-adapter)
---

### Ruleset del branch principale del satellite

Il ruleset `main` del repository del satellite segue il «Ruleset del branch principale» di `ambrogio-model`; i controlli richiesti sono `Satellite checks` e `Secret scan`.

#### Metadata
  * type: specification

#### Relations
  * define: [Controlli obbligatori prima del merge del satellite](../Requirements/VoiceSatellite.md#controlli-obbligatori-prima-del-merge-del-satellite)
---

### Scadenza dell'arresto del processo

Al primo SIGINT o SIGTERM il confine di processo avvia, insieme all'arresto ordinato del contratto «Ciclo di arresto e rilascio delle risorse», un tempo massimo di 5000 ms. I segnali successivi non lo riavviano né lo prolungano. Se l'arresto ordinato, compresa l'interruzione di un avvio in corso, non è terminato alla scadenza, per esempio perché una chiusura nativa non restituisce mai il controllo, il satellite emette una sola riga Pino di livello `error` con `event: "satellite_shutdown_timeout"` e `timeoutMs: 5000` e, quando l'arresto ha già osservato guasti di chiusura, `err` con quei guasti secondo il profilo controllato di serializzazione, e termina subito il processo con codice di uscita 1 senza attendere le chiusure pendenti. La riga contiene soltanto le chiavi `level`, `time`, `event`, `timeoutMs` e, soltanto in quel caso, `err`: nessun messaggio di librerie, configurazione, percorso o dato della sessione.

Se l'arresto ordinato termina prima della scadenza, il tempo massimo è annullato, non trattiene il processo e non produce la riga; il codice di uscita resta quello dell'arresto ordinato.

L'esempio Compose del repository dichiara `stop_grace_period: 10s`, così che il runtime dei container non termini il processo con `SIGKILL` prima della scadenza; con `docker run` lo stesso periodo si indica con `--stop-timeout 10`.

#### Metadata
  * type: behavior

#### Relations
  * define: [Tempo massimo dell'arresto del processo](../Requirements/VoiceSatellite.md#tempo-massimo-dellarresto-del-processo)
---

### Segmentazione dei turni con Silero ONNX

La prima versione usa Silero VAD in formato ONNX nel processo Node.js del satellite per individuare i tratti di parlato durante un'interazione ammessa. Un adapter proprio del satellite esegue il modello con `onnxruntime-node` 1.30.0 e applica questo algoritmo: finestre di 512 campioni a 16 kHz (32 ms), valutate in sequenza; una finestra con probabilità almeno 0,18 (`positiveSpeechThreshold`) è parlato, una sotto 0,11 (`negativeSpeechThreshold`) è silenzio; il parlato è confermato dopo 4 finestre di parlato (`minSpeechFrames`) e termina dopo 20 finestre consecutive di silenzio (`redemptionFrames`, circa 640 ms). Alla conferma l'adapter apre la trasmissione della richiesta con la riserva audio; alla fine del parlato invia `input.end`. Un tratto che termina prima della conferma viene scartato senza inviare nulla, perché il protocollo non consente di annullare una richiesta aperta. Durante la riproduzione della risposta il satellite non ammette nuovi turni né interrompe l'audio in uscita.

La distribuzione usa il file `models/silero_vad.onnx` incluso nel pacchetto Decibri del contratto «Adapter audio con Decibri», senza una seconda copia; ne registra origine, hash e licenza nel documento dei modelli. Durata, CPU e riconoscimento di risposte brevi e frasi con pause interne vanno verificati su Linux x86_64 e arm64. Fonte del modello: https://github.com/snakers4/silero-vad .

#### Metadata
  * type: behavior

#### Relations
  * define: [Delimitazione locale dei turni vocali](../Requirements/VoiceSatellite.md#delimitazione-locale-dei-turni-vocali)
---

### Segnalazione locale di voce non disponibile

Quando una trasmissione del server per il turno corrente dichiara contenuto testuale, come nel rifiuto `audio_unavailable` previsto dai «Motivi di rifiuto del turno» del backend, il satellite non la pronuncia: registra l'evento informativo `satellite_voice_unavailable` e riproduce al suo posto il tono definito in «Tono locale di errore». Dopo il tono e l'esito del turno il satellite torna ad attendere la wake word senza aprire una replica e senza reinviare la richiesta.

#### Metadata
  * type: specification

#### Relations
  * define: [Tono di errore per voce non disponibile](../Requirements/VoiceSatellite.md#tono-di-errore-per-voce-non-disponibile)
---

### Segnale locale di ascolto

L'apertura dell'ascolto segue una sola regola, sia dopo la wake word sia dopo una risposta che attende replica: quando la sessione conversazionale è pronta a ricevere il turno, il satellite riproduce una volta un breve tono PCM16 mono a 16 kHz sullo speaker configurato e ammette il parlato solo quando il tono è terminato. Il tono è una sinusoide di 880 Hz lunga 100 ms, con ampiezza pari a 0,18 del fondo scala e dissolvenze lineari di 10 ms ai bordi. Alla prima attivazione attende che la sessione sia pronta, riaprendola se necessario, prima del tono; il VAD resta inattivo durante il tono per non acquisire il bip come parlato. Il bip indica che il satellite sta ascoltando. Per un `turn.completed` con `expectsReply: true`, applica la stessa regola nella sessione già aperta e avvia la finestra di inattività della replica dopo il tono. Non emette il tono dopo una risposta conclusiva o con indicazione non valida. Il tono è generato localmente, non inviato al backend e non deve sovrapporsi alla risposta parlata. Se lo speaker non riproduce il tono, il satellite registra `satellite_ready_cue_failed` e apre comunque l'ascolto. L'arresto annulla il tono in corso.

#### Metadata
  * type: behavior

#### Relations
  * define: [Segnale acustico di disponibilità](../Requirements/VoiceSatellite.md#segnale-acustico-di-disponibilità)
---

### Suite di test del satellite

Il satellite applica «Suite di test con Vitest» con questi valori.

Il satellite è una sola unità: i suoi test risiedono in `src/` accanto ai file che verificano. Le cartelle `test/` dedicate sono `test/support/`, con il server di sessione simulato e le scadenze manuali condivisi dai test, e `test/repository/`, con i test dell'intero repository: regole di architettura con le loro fixture negative e il campione dell'estrazione degli import, assenza di codice del backend, mappatura esaustiva dei rifiuti del punto d'ingresso, file d'ambiente, dipendenze, contesto di build dell'immagine, workflow e hook pre-commit.

La selezione `e2e` contiene `src/main.e2e.spec.ts`, che compila il satellite in una cartella temporanea e ne avvia il punto d'ingresso compilato con Node.js in un processo figlio. Il satellite non ha file `*.integration.spec.ts` e non dichiara lo script `test:integration`.

Gli script sono `test`, `vitest run --project fast`, e `test:e2e`, `vitest run --project e2e`. `tsconfig.json`, usato da `pnpm typecheck`, comprende `src/**/*.ts`, `test/**/*.ts` e `vitest.config.ts`; `tsconfig.core.json` e `tsconfig.build.json` escludono `src/**/*.spec.ts`, e `.dockerignore` esclude `**/*.spec.ts` e `test`.

#### Metadata
  * type: specification

#### Relations
  * define: [Vitest come runner del satellite](../Requirements/VoiceSatellite.md#vitest-come-runner-del-satellite)
---

### Tono locale di errore

Il satellite non distribuisce né riproduce messaggi parlati preregistrati: segnala i fallimenti con un unico tono di errore generato dal programma. Motivazione: un tono non dipende dalla lingua né dalla voce scelta nel backend, non richiede asset né licenze, e la famiglia controlla il dettaglio del problema dalla chat testuale.

Il tono è lo stesso nei due casi, backend irraggiungibile e risposta soltanto testuale a un turno vocale. È audio PCM16 mono a 16 kHz composto da due toni sinusoidali discendenti: 660 Hz per 150 ms, 50 ms di silenzio, 440 Hz per 150 ms, per una durata complessiva di 350 ms. Ampiezza e dissolvenze lineari di 10 ms ai bordi di ciascun tono sono quelle del segnale di ascolto. La sequenza discendente e la durata lo distinguono dal segnale di ascolto. Il tono è riprodotto sullo speaker configurato, non è inviato al backend e l'arresto lo annulla. Se lo speaker non lo riproduce, il satellite registra `satellite_error_tone_failed` e prosegue come se il tono fosse terminato. I log distinguono la causa: `satellite_failure` per il fallimento dell'interazione e `satellite_voice_unavailable` per la risposta soltanto testuale.

#### Metadata
  * type: behavior

#### Relations
  * define: [Tono di errore per backend irraggiungibile](../Requirements/VoiceSatellite.md#tono-di-errore-per-backend-irraggiungibile)
---

### Trasporto conversazionale ambrogio.v1

Il satellite comunica con il backend con il protocollo conversazionale `ambrogio.v1`, comune a testo e voce. L'adapter outbound usa il `WebSocket` integrato in Node.js, la stessa scelta del client terminale, senza dipendenze aggiuntive per il trasporto. Si connette a `api/session` sotto `backend.baseUrl`, con schema `ws:` per `http:` e `wss:` per `https:`, offrendo il sottoprotocollo `ambrogio.v1`; invia `session.hello` con l'identità configurata e considera la sessione pronta soltanto dopo `session.ready`. Domain e Application dipendono soltanto dalle porte del satellite.

La sessione è persistente: viene aperta all'avvio, resta aperta finché il backend la mantiene con i propri ping e, se risulta chiusa, viene riaperta alla successiva attivazione con la wake word. Il satellite invia messaggi e frame soltanto su una sessione pronta e non riprende mai su una nuova sessione una richiesta, una trasmissione o un turno della sessione precedente. Una sessione persa durante un'interazione attiva segue il recupero locale; la sua perdita mentre il satellite attende la wake word non produce avvisi.

Ogni richiesta è una trasmissione audio: `input.start` con `requestId` e `stream` nuovi, `content` `{"type":"audio","sampleRate":16000}`, `reply` `"audio"` e `conversationId` soltanto per una replica senza wake word, il `conversationId` ricevuto in `turn.accepted` per il turno precedente; poi frame binari con i 4 byte big-endian del numero `stream` seguiti da PCM16 mono a 16 kHz; infine `input.end` alla fine del parlato rilevata localmente. Ogni attivazione con la wake word inizia una nuova conversazione senza `conversationId`. La durata della richiesta resta entro il limite di trasmissione del backend.

Le risposte arrivano come trasmissioni `output.start`, frame audio alla frequenza dichiarata e `output.end`; l'esito del turno è `turn.completed` con `expectsReply`, `turn.failed`, `turn.rejected` o `turn.interrupted`. Un `session.error` riferito alla richiesta corrente equivale a un guasto dell'interazione. A un messaggio del server non legato a un turno che contiene `id` il satellite risponde con `client.result`, `ok: false` e `reason: "unsupported"`.

Trascrizione, sintesi, ammissione dei turni, `expectsReply` e motivi di rifiuto appartengono al backend, secondo i contratti del protocollo `ambrogio.v1` e «Occupazione della conversazione e ammissione dei turni» del backend. Il satellite possiede la regola delle conversazioni per attivazione, la decisione di aprire una replica dopo la riproduzione e l'intervallo locale di inattività, definiti in «Regole della replica vocale». Ogni satellite mantiene il proprio ciclo locale: le interazioni degli altri client sulla stessa installazione non ne sostituiscono lo stato.

#### Metadata
  * type: specification

#### Relations
  * define: [Uso delle sole interfacce pubbliche del backend nel satellite](../Requirements/VoiceSatellite.md#uso-delle-sole-interfacce-pubbliche-del-backend-nel-satellite)
---
