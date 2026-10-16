# ambrogio-satellite

Client satellite per l'interazione vocale con Ambrogio. Il repository possiede il proprio modello Reqvire in `system-model/`; `ambrogio-backend` possiede il contratto pubblico del canale vocale.

## Stato

Modello salvato tramite MCP Reqvire: una capability, un lessico locale con 14 concetti, un’ontologia strutturale, requisiti, contratti, verifiche pianificate ed evidenze automatiche. È disponibile il processo vocale eseguibile: configurazione JSON, wake word ONNX locale, Silero, client Micdrop, audio Decibri, repliche e recupero parlato. I modelli Hey Jarvis e Hey Mycroft sono distribuiti con licenza e checksum. La verifica audio contro backend e periferiche reali su Linux x86_64 e arm64 è ancora necessaria prima del rilascio. Il modello è il riferimento autorevole; questo README ne riepiloga le decisioni.

## Decisioni concordate il 16 ottobre 2026

- Linux su x86_64 e arm64, senza un dispositivo hardware obbligatorio.
- TypeScript ESM e Node.js 24 o successivo, con pnpm e Vitest; esecuzione diretta sull'host con le dipendenze installate e Docker facoltativo, con stessa applicazione e configurazione.
- Separazione Domain, Application e adapter in un solo progetto nel repository, senza workspace multipackage. Domain possiede stati e regole dell'interazione; Application coordina i casi d'uso e definisce le porte; gli adapter integrano audio, riconoscimento e backend. Domain e Application usano solo API ECMAScript indipendenti dall’ambiente; la programmazione delle scadenze passa dalla porta Application `DeadlineScheduler` a un adapter Node.js. Il comando `pnpm typecheck` compila anche questi layer senza tipi Node.js o DOM.
- Rifiuti ed esiti previsti come valori tipizzati; guasti inattesi come eccezioni, gestiti e diagnosticati ai confini tecnici.
- File JSON a sezioni `backend`, `audio`, `wakeWord` e `interaction`, validato all'avvio. `backend.baseUrl` è l'URL base HTTP(S) da cui il satellite ricava il canale WebSocket `/api/voice`; `wakeWord.model` sceglie un modello distribuito e `interaction.replyTimeoutMs` ha il valore predefinito di 15 secondi. `--config` seleziona il file; le variabili d'ambiente non sovrascrivono i valori. `audio.microphone` e `audio.speaker` sono selettori facoltativi: se assenti si usano i dispositivi di sistema, mentre un selettore esplicito non ricade silenziosamente sul dispositivo predefinito.
- Ascolto continuo con riconoscimento della wake word esclusivamente sul satellite; la connessione per l'interazione vocale si apre dopo l'attivazione.
- Catalogo previsto delle wake word: «Hey Jarvis» (predefinita), «Hey Mycroft» e «Hey Alexa». I primi due modelli sono inclusi e selezionabili; «Hey Alexa» richiede ancora una verifica della frase esatta prima di essere aggiunta. La prima versione non accetta modelli personalizzati esterni.
- Il riconoscimento locale della wake word usa modelli openWakeWord ONNX nel processo Node.js, tramite `onnxruntime-node` 1.30.0. Non richiede un servizio Wyoming separato. Lo spike ne mostra la fattibilità iniziale, ma la distribuzione finale va provata su x86_64 e arm64.
- La delimitazione dei turni vocali usa il modello Silero VAD ONNX incluso in Decibri 5.8.0. Il valore iniziale di `redemptionFrames` è 20; risposte brevi, pause, latenza e CPU richiedono prove sulle due architetture.
- Gli adapter audio usano Decibri 5.8.0, fissato nel lockfile, per microfono e speaker. Il satellite attende lo svuotamento della coda di riproduzione; l'esecuzione Linux deve includere la libreria runtime ALSA e l'accesso ai dispositivi configurati.
- Il trasporto vocale usa `@micdrop/client` 3.4.0 e i messaggi standard Micdrop. Una patch locale temporanea protegge gli invii durante l'apertura della WebSocket; una prova deve coprire il difetto e la compatibilità con il backend. La riconnessione automatica è disabilitata, perché ogni nuova connessione crea una nuova conversazione. La fine della riproduzione e l'intervallo di inattività sono gestiti localmente; non serve inviare `Played`.
- I modelli wake word distribuiti sono destinati all'uso non commerciale; ogni modello incluso deve avere origine, licenza, condizioni di redistribuzione e attribuzioni verificate e consegnate con i pacchetti host e container. La licenza dei modelli è distinta da quella del codice del satellite.
- È possibile pronunciare «Hey Jarvis» e la richiesta senza una pausa obbligatoria. Micdrop conserva inizialmente 1,5 secondi di audio in memoria durante riconoscimento e apertura della connessione. I valori iniziali della wake word sono soglia 0,5, pausa fra attivazioni 2 secondi e coda massima di 32 blocchi da 80 ms.
- La prima versione non permette di interrompere la risposta con la voce. Stima la fine della risposta con lo stato `isAssistantSpeaking` di Micdrop: dopo il primo audio attende 1000 ms consecutivi di inattività e lo svuotamento della coda Decibri. Una pausa del TTS più lunga può essere scambiata per la fine; serve una prova contro il backend reale prima del rilascio.
- Quando l'assistente richiede una replica, la persona risponde senza ripetere la wake word nella stessa interazione. Il backend stabilisce e segnala esplicitamente se attende una replica. Altrimenti il satellite torna in attesa della wake word.
- Se il caso d'uso condiviso del backend rifiuta un turno vocale, il backend invia una risposta parlata sicura con `Message.metadata.expectsReply: false`; il satellite la riproduce completamente e torna alla wake word.
- Se il backend non è raggiungibile, il satellite riproduce «Non riesco a contattare Ambrogio. Riprova tra poco.» da un file locale e torna in attesa della wake word. Una nuova attivazione tenta una nuova interazione; la richiesta fallita non viene conservata per un reinvio automatico.

## Avvio sull'host Linux

Servono Node.js 24 o successivo, pnpm 12.11.2, `libasound.so.2`, la libreria OpenMP `libgomp.so.1`, un microfono e uno speaker accessibili dal processo. La distribuzione include i modelli wake word e l'avviso locale; `pnpm install` recupera i binari nativi per l'architettura.

```sh
pnpm install --frozen-lockfile
pnpm build
cp config.example.json config.json
node dist/main.js --config config.json
```

Impostare `backend.baseUrl` all'URL HTTP(S) raggiungibile del backend. Il satellite ricava automaticamente `/api/voice`. `wakeWord.model` accetta per ora `hey_jarvis` o `hey_mycroft`; gli identificatori dei dispositivi in `audio.microphone` e `audio.speaker` sono facoltativi. `interaction.replyTimeoutMs` controlla l'attesa della replica dell'utente. La risposta del backend ha un limite di 60 secondi; il termine della riproduzione è stimato dopo 1 secondo senza audio Micdrop.

## Arresto

`SIGINT` (Ctrl+C) e `SIGTERM` interrompono l'interazione e la riproduzione correnti senza aspettare la risposta completa. Il processo blocca nuove attivazioni, chiude audio e connessione e rilascia i modelli ONNX. Richieste ripetute condividono lo stesso arresto. Anche dopo un avvio parziale fallito o un errore di chiusura vengono tentati tutti i rilasci; un guasto produce una diagnosi JSON e un codice di uscita non riuscito. Le operazioni native già in corso vengono attese quanto necessario al rilascio sicuro.

## Avvio con Docker

```sh
docker build -t ambrogio-satellite:local .
docker run --rm --network host --device /dev/snd \
  -v "$PWD/config.json:/config/satellite.json:ro" \
  ambrogio-satellite:local
```

L'immagine contiene l'applicazione, i modelli, l'avviso parlato e `libasound2`; la configurazione rimane sul sistema host. Su un host che usa PipeWire o PulseAudio può essere necessaria una configurazione audio specifica del sistema. Docker resta facoltativo. Un'installazione x86_64 e una arm64 richiedono immagini costruite o pubblicate per la rispettiva architettura; questa macchina ha verificato soltanto la build amd64.

Sono state recepite anche le regole del backend su composition root, confini degli import nei test, Result ed esiti esaustivi, conservazione delle cause, diagnosi unica al confine tecnico, log JSON su stdout, esclusione dei contenuti sensibili dai log e delle registrazioni audio persistenti, configurazione validata prima della costruzione delle risorse e distribuita ai soli componenti interessati. Vitest è il runner dei test; Pino 10.4.0 emette i log applicativi JSON su stdout con eventi stabili. Il campo `err` conserva una vista limitata delle cause senza messaggi, stack o proprietà grezze; gli originali restano intatti in memoria. I rifiuti previsti di avvio sono eventi informativi, mentre i guasti di processo, interazione e riproduzione dell’avviso sono eventi di errore distinti. I log diretti della dipendenza Micdrop richiedono ancora una protezione separata.

## Modello e lavoro ancora aperto

### Raccolta dei log

Nella prima versione l'osservabilità applicativa usa i log strutturati. Metriche, tracing distribuito e registri di audit richiedono un'esigenza concordata e requisiti e verifiche dedicati prima di essere introdotti. I log non costituiscono un registro di audit garantito.

Il satellite scrive i log applicativi JSON su stdout. Conservazione, rotazione ed eventuale inoltro centralizzato sono responsabilità dell'installazione: configurarle nel runtime Docker oppure nel gestore del servizio host, per esempio systemd/journald. L'applicazione non richiede un servizio di logging e non configura file, credenziali o endpoint di raccolta. L'avvio diretto da terminale non garantisce la conservazione dei log. La raccolta esterna non risolve la protezione ancora aperta dei log diretti di Micdrop.

### Pubblicazione Docker

Il workflow `publish-image.yml` pubblica su `ghcr.io/adrianofoschi/ambrogio-satellite` al push di un tag `vMAJOR.MINOR.PATCH` corrispondente alla versione in `package.json`. Esegue prima la CI del commit, poi costruisce e verifica le immagini amd64 e arm64. Dopo il successo di entrambe pubblica i tag tecnici `<versione>-amd64` e `<versione>-arm64` e il tag unico `<versione>` con entrambe le piattaforme. Non pubblica `latest`; i push ordinari a `main` non creano release. Il workflow non modifica la visibilità del pacchetto GHCR.

La verifica delle immagini carica dipendenze native, modelli wake word e Silero e avviso parlato, e controlla il rifiuto sicuro dell'avvio senza configurazione. Si può ripetere con `node scripts/verify-docker-image.mjs <immagine> <amd64|arm64>`. La prova arm64 può usare emulazione; le prove audio su hardware reale restano necessarie prima del rilascio. La modalità host rimane supportata.

### Controlli CI

Il workflow `.github/workflows/ci.yml` definisce il check `Satellite checks` per ogni pull request, push a `main` e avvio manuale. Su Ubuntu 24.04 con Node.js 24 e pnpm 12.11.2 installa dal lockfile congelato ed esegue validazione e lint Reqvire 1.3.2, typecheck completo e dei layer interni, Vitest e build. Anche i rilievi del lint che richiedono revisione manuale fanno fallire il job. Le prove con periferiche audio e su arm64 restano separate.

Il blocco del merge richiede inoltre una protezione di `main` che renda obbligatorio `Satellite checks`. Al controllo del 16 ottobre 2026 GitHub restituisce HTTP 403: per questo repository privato il piano attuale richiede GitHub Pro. La protezione non è attiva; la presenza del workflow da sola non impedisce il merge. Il workflow è stato eseguito con successo su GitHub sul commit `4583a41`: [run CI](https://github.com/adrianofoschi/ambrogio-satellite/actions/runs/38908867632), con tutti i controlli superati.

### Stato del modello

Le decisioni sono registrate in [lessico](system-model/Thesaurus/Lessico.md), [ontologia](system-model/Ontologies/VoiceSatellite.md), [requisiti](system-model/Requirements/VoiceSatellite.md), [contratti](system-model/Contracts/VoiceSatellite.md) e [verifiche](system-model/Verifications/VoiceSatellite.md). Lessico e ontologia appartengono al satellite e definiscono i suoi termini e le sue relazioni senza dipendere dal modello backend. Il backend produce durante la generazione il booleano strutturato `expectsReply`, senza una seconda chiamata al modello dedicata alla classificazione, e lo invia in `Message.metadata.expectsReply` di Micdrop. La compatibilità con il satellite resta da verificare con il client reale.

È implementata e verificata nel backend l’elaborazione parallela di conversazioni diverse, con al massimo un turno attivo per ciascuna conversazione. Eventuali limiti globali di capacità restano da concordare.

Le verifiche pianificate coprono frase continua, riconoscimento locale, catalogo distribuito, repliche richieste dal backend, assenza di interruzioni vocali, recupero con messaggio locale, configurazione, architettura ed esecuzione su entrambe le architetture con e senza Docker. I collegamenti di verifica non indicano prove eseguite. Per le funzionalità ancora aperte occorre completare i contratti e preparare i test pertinenti secondo `AGENTS.md`.

Lo spike in `/home/adriano/projects/ambrogio-spike/satellite/spike/` è una fonte di evidenze e limiti tecnici, non un vincolo sul protocollo o sul codice definitivo. Decibri 5.8.0 e ONNX Runtime 1.30.0 si caricano su Linux x86_64, anche nell'immagine Docker; acquisizione e riproduzione con periferiche reali, anche su arm64, restano da provare. La voce «Hey Alexa» richiede una prova affidabile della frase esatta prima di essere selezionabile.

Il contratto vocale da esaminare è «Protocollo vocale del prodotto» in `ambrogio-backend/system-model/Contracts/FamilyConversation.md`, al commit candidato `512317c9e93b4e6ab7a1e32dd9c210436b7b5c06`. L'integrazione va verificata contro questa revisione con il client satellite reale.

## Modello

Eseguire Reqvire dalla radice di questo repository. L'MCP del satellite deve usare una porta diversa dagli MCP degli altri repository, così ogni sessione resta legata al proprio modello.
