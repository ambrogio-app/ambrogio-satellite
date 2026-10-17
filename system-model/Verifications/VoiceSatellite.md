# Elements

### Verifica del satellite vocale

Organizzare le dimostrazioni operative, le ispezioni e le prove automatiche della prima versione. Ogni verifica concreta registra il proprio metodo, l'esito osservato e ciò che resta da provare.

#### Metadata
  * type: verification-objective
---

### Dimostrazione degli esiti e della diagnostica

Verifica parziale del 2026-10-16: mapping dei due rifiuti di configurazione esplicito nel bootstrap con default assertNever. In una copia temporanea dei sorgenti è stata aggiunta la variante audit_probe: compilazione rifiutata in main.ts con TS2345 verso never. I sorgenti di lavoro non contengono la variante. Suite di 89 test, typecheck e build PASS; le prove Pino e Application conservano le evidenze su unicità e cause. La lacuna dei log diretti Micdrop, aperta allora, è chiusa dalla rimozione della dipendenza decisa il 17 ottobre 2026; la verifica va ripetuta sul trasporto `ambrogio.v1` e nessuna nuova prova vocale reale è stata eseguita.

#### Details
Esaminare firme Result e mapping esaustivi dei rifiuti; introdurre una nuova variante in una prova controllata e verificare che il mapping incompleto sia rilevato. Iniettare un guasto attraverso più componenti: una sola diagnosi definitiva al confine, causa originale conservata e nessun logger nei layer interni. Acquisire stdout e verificare una riga JSON per evento. Un rifiuto previsto non diventa automaticamente un log di errore e il messaggio pubblico non contiene dettagli tecnici.

#### Metadata
  * type: demonstration-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * verify: [Assenza di logger nei layer interni](../Requirements/VoiceSatellite.md#assenza-di-logger-nei-layer-interni)
  * verify: [Conservazione della causa dei guasti](../Requirements/VoiceSatellite.md#conservazione-della-causa-dei-guasti)
  * verify: [Gestione esaustiva dei rifiuti previsti](../Requirements/VoiceSatellite.md#gestione-esaustiva-dei-rifiuti-previsti)
  * verify: [Log tecnici JSON su stdout](../Requirements/VoiceSatellite.md#log-tecnici-json-su-stdout)
  * verify: [Unicità della diagnosi definitiva](../Requirements/VoiceSatellite.md#unicità-della-diagnosi-definitiva)
---

### Dimostrazione del recupero locale

Verifica pianificata; nessuna esecuzione o evidenza positiva è ancora disponibile.

#### Details
Rendere irraggiungibile il backend e attivare il satellite: si ascolta il file locale «Non riesco a contattare Ambrogio. Riprova tra poco.» e il processo torna in attesa. Verificare formato PCM16 mono 16 kHz, integrità SHA-256 e attribuzione dell'asset. Ripristinare il backend: senza una nuova attivazione non viene reinviata la richiesta fallita; con una nuova wake word viene tentata una nuova interazione. Ripetere con una disconnessione durante la chiamata.

#### Metadata
  * type: demonstration-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * verify: [Avviso parlato di backend irraggiungibile](../Requirements/VoiceSatellite.md#avviso-parlato-di-backend-irraggiungibile)
  * verify: [Nuova attivazione dopo il fallimento](../Requirements/VoiceSatellite.md#nuova-attivazione-dopo-il-fallimento)
  * verify: [Riapertura sicura dopo la chiusura vocale](../Requirements/VoiceSatellite.md#riapertura-sicura-dopo-la-chiusura-vocale)
  * verify: [Ripristino dopo backend irraggiungibile](../Requirements/VoiceSatellite.md#ripristino-dopo-backend-irraggiungibile)
---

### Dimostrazione del segnale di ascolto

Verifica parziale: sul Raspberry sono confermati il bip iniziale, una risposta conclusiva senza nuovo bip e la prova di una replica senza nuova wake word dopo il bip. Restano da provare più repliche consecutive, il timeout e il guasto dello speaker.

#### Details
Su Raspberry con speaker e microfono reali, pronunciare «Hey Jarvis», attendere il bip che indica l'apertura effettiva dell'ascolto e formulare la richiesta. Verificare che la richiesta venga ricevuta. Con una risposta che attende replica, verificare che, finita la risposta, si senta lo stesso bip e che una nuova frase pronunciata dopo il bip venga ricevuta senza wake word. Ripetere dopo un altro turno e verificare l'assenza del bip dopo la risposta conclusiva. Controllare che il bip non venga acquisito come parlato, che la finestra di inattività parta dopo il bip e che un errore dello speaker non impedisca di parlare.

Esito parziale del 17 ottobre 2026 riferito dalla persona sul Raspberry: dopo «Hey Jarvis» si è sentito il bip, la domanda «Quanto fa due più due?» ha ricevuto la risposta «4» e non è seguito un altro bip. L'assenza del secondo bip è coerente con una risposta conclusiva. Nella prova successiva, con la richiesta di fare una domanda e aspettare la risposta della persona, la persona ha confermato che il bip e la replica senza nuova wake word hanno funzionato. I valori effettivi del metadato `expectsReply` non sono stati letti direttamente; le prove di durata della finestra di inattività, errore dello speaker e più repliche consecutive restano aperte.

#### Metadata
  * type: demonstration-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * verify: [Segnale acustico di disponibilità](../Requirements/VoiceSatellite.md#segnale-acustico-di-disponibilità)
---

### Dimostrazione del trasporto ambrogio.v1

Verifica pianificata; nessuna esecuzione o evidenza positiva è ancora disponibile per il protocollo `ambrogio.v1`. Le evidenze raccolte in precedenza con il trasporto Micdrop non valgono per questa verifica.

#### Details
Contro la revisione backend registrata nel «Contratto vocale backend di riferimento», avviare il satellite e verificare che apra una sola sessione su `api/session` con il sottoprotocollo `ambrogio.v1`, invii `session.hello` con l'identità configurata e trasmetta soltanto dopo `session.ready`. Completare un'interazione con la wake word e una replica senza wake word: la prima richiesta non contiene `conversationId`, la replica usa il `conversationId` ricevuto in `turn.accepted`; una nuova attivazione con la wake word inizia una nuova conversazione. Verificare `input.start` audio a 16 kHz con `reply: "audio"`, frame binari con il numero `stream` big-endian e `input.end` alla fine del parlato; osservare trasmissioni audio di risposta, `turn.completed` con `expectsReply`, un turno rifiutato con il messaggio parlato e il ritorno alla wake word.

Chiudere la sessione lato backend mentre il satellite attende la wake word e verificare che la successiva attivazione la riapra senza avvisi; chiuderla durante un'interazione e verificare il recupero locale senza riprendere la richiesta sulla nuova sessione. Inviare un messaggio del server non legato a un turno con `id` e verificare `client.result` con `reason: "unsupported"`. Conservare versioni dei pacchetti, esiti e log della prova.

#### Metadata
  * type: demonstration-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * verify: [Compatibilità con il canale vocale backend](../Requirements/VoiceSatellite.md#compatibilità-con-il-canale-vocale-backend)
  * verify: [Invio soltanto su sessione pronta](../Requirements/VoiceSatellite.md#invio-soltanto-su-sessione-pronta)
  * verify: [Nuova conversazione a ogni attivazione](../Requirements/VoiceSatellite.md#nuova-conversazione-a-ogni-attivazione)
  * verify: [Sessione conversazionale persistente](../Requirements/VoiceSatellite.md#sessione-conversazionale-persistente)
---

### Dimostrazione della attivazione locale

Verifica operativa pianificata; la sola prova sul campione upstream descritta nei dettagli è stata eseguita.

#### Details
Con ogni modello distribuito dimostrare che la pipeline ONNX riconosce localmente la wake word senza servizio esterno. Prima della wake word non si apre la chiamata backend. Con soglia iniziale 0,5 e cooldown 2000 ms, misurare attivazioni corrette e spurie. Provare Hey Jarvis, Hey Mycroft e Alexa su x86_64 e arm64. Pronunciare la wake word e la richiesta senza pausa, verificando che la riserva scorrevole di 1500 ms consegni l'inizio della richiesta dopo la connessione. Saturare la coda d'inferenza di 32 blocchi e verificare un guasto diagnostico senza crescita illimitata.

Evidenza parziale del 17 ottobre 2026: `alexa_v0.1.onnx` della release openWakeWord v0.5.1 si carica con le risorse ONNX condivise. La pipeline del satellite, con soglia 0,5, ha riconosciuto `tests/data/alexa_test.wav` upstream (16 kHz mono, parola «Alexa») dopo un secondo di silenzio iniziale sia su x86_64 sia sul Raspberry arm64: 15 rilevamenti, picco 0,99999988, nessun errore su entrambe le macchine. Il campione non è incluso nel repository. Dopo la selezione di `alexa` nel Raspberry, la persona ha riferito una prova riuscita con il microfono reale. Questa osservazione non misura affidabilità, rumore, accenti o attivazioni spurie; le prove operative sistematiche restano aperte.

#### Metadata
  * type: demonstration-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * verify: [Ascolto locale della wake word](../Requirements/VoiceSatellite.md#ascolto-locale-della-wake-word)
  * verify: [Avvio dopo la wake word](../Requirements/VoiceSatellite.md#avvio-dopo-la-wake-word)
  * verify: [Catalogo distribuito delle wake word](../Requirements/VoiceSatellite.md#catalogo-distribuito-delle-wake-word)
  * verify: [Conservazione della richiesta continua](../Requirements/VoiceSatellite.md#conservazione-della-richiesta-continua)
  * verify: [Selezione della wake word configurata](../Requirements/VoiceSatellite.md#selezione-della-wake-word-configurata)
---

### Dimostrazione della configurazione

Verifica pianificata; nessuna esecuzione o evidenza positiva è ancora disponibile.

#### Details
Avviare usando un file JSON valido selezionato con `--config` e verificare `backend.baseUrl`, identità del client, modello scelto e intervallo locale di inattività. Verificare che l'URL base HTTP diventi `ws:` e HTTPS diventi `wss:`, preservando l'eventuale prefisso di percorso e aggiungendo una sola volta `api/session`. Omettere `client` e verificare i valori predefiniti ricavati dal nome host; poi indicare `client.id` e `client.name`. Omettere `audio` e verificare l'uso dei dispositivi predefiniti; poi indicare `audio.microphone` e `audio.speaker` e verificare tramite Decibri che siano usati quelli richiesti, senza ripiego silenzioso sul predefinito. Verificare il modello Hey Jarvis predefinito, un modello distribuito alternativo, il timeout predefinito di 15 secondi e un valore personalizzato. Impostare variabili d'ambiente contrastanti e verificare che non modifichino i valori. Ripetere con JSON invalido, campi sconosciuti, URL non HTTP(S), timeout non positivo, selettore audio vuoto, identità vuota e modello non presente nel catalogo disponibile: l’avvio operativo è impedito con errore comprensibile. Eseguire i casi sia sull’host sia nel container dopo la disponibilità delle rispettive risorse.

#### Metadata
  * type: demonstration-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * verify: [Assenza di override da ambiente](../Requirements/VoiceSatellite.md#assenza-di-override-da-ambiente)
  * verify: [Configurazione JSON unica](../Requirements/VoiceSatellite.md#configurazione-json-unica)
  * verify: [Rifiuto della configurazione invalida](../Requirements/VoiceSatellite.md#rifiuto-della-configurazione-invalida)
  * verify: [Selezione del file di configurazione](../Requirements/VoiceSatellite.md#selezione-del-file-di-configurazione)
---

### Dimostrazione della conversazione e delle repliche

Verifica da ripetere con il protocollo `ambrogio.v1`: le prove parziali registrate sotto, eseguite con il trasporto Micdrop, non valgono come evidenza per la versione attuale.

#### Details
Contro la revisione backend compatibile fissata nel contratto, riprodurre una risposta completa; parlare durante la riproduzione e verificare che non la interrompa né apra un turno. Provare `turn.completed` con `expectsReply` uguale a `true` e `false`, con l'esito arrivato sia prima sia dopo la fine della riproduzione: la replica senza wake word si apre soltanto con `true`, dopo che lo speaker ha riprodotto tutte le trasmissioni chiuse da `output.end`, e appartiene alla stessa conversazione. Con una risposta in più trasmissioni e con pause lunghe nella sintesi, la conclusione non deve anticipare la fine dell'audio. Se l'esito non arriva entro 60 secondi dalla fine della richiesta, concludere con il recupero locale senza aprire la replica.

Con `expectsReply` non booleano non aprire la replica. Provare un turno rifiutato e uno fallito dopo l'ammissione: l'audio del messaggio pubblico è riprodotto e il satellite torna alla wake word. Dopo inattività occorre una nuova wake word.

Prova parziale del 16 ottobre 2026 su Raspberry ARM64 con ReSpeaker e backend v0.1.1, con il trasporto Micdrop: wake word riconosciuta, richiesta trasmessa e risposta parlata udita dalla persona; rilevato mancato completamento locale della riproduzione con Micdrop muted.

Prova parziale del 17 ottobre 2026 sullo stesso Raspberry, con il trasporto Micdrop: una risposta iniziale e una replica senza wake word sono state riprodotte, con circa 1,1 e 2,2 secondi fra la fine del parlato e l'inizio dell'audio; un terzo turno è rimasto senza risposta per 60 secondi e il recupero è fallito per la chiusura tardiva della WebSocket Micdrop. Dopo la distribuzione dello stesso giorno, con `alexa` selezionata sul Raspberry dell'installazione di riferimento e backend sul server dell'installazione di riferimento, la persona ha confermato che la prova vocale successiva ha funzionato.

#### Metadata
  * type: demonstration-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * verify: [Attesa della fine della risposta](../Requirements/VoiceSatellite.md#attesa-della-fine-della-risposta)
  * verify: [Compatibilità con il canale vocale backend](../Requirements/VoiceSatellite.md#compatibilità-con-il-canale-vocale-backend)
  * verify: [Replica richiesta dal backend](../Requirements/VoiceSatellite.md#replica-richiesta-dal-backend)
  * verify: [Riproduzione della risposta vocale](../Requirements/VoiceSatellite.md#riproduzione-della-risposta-vocale)
  * verify: [Ritorno alla wake word dopo la risposta](../Requirements/VoiceSatellite.md#ritorno-alla-wake-word-dopo-la-risposta)
  * verify: [Ritorno alla wake word per inattività](../Requirements/VoiceSatellite.md#ritorno-alla-wake-word-per-inattività)
---

### Dimostrazione della distribuzione Linux

Verifica pianificata; nessuna esecuzione o evidenza positiva è ancora disponibile.

#### Details
Su host Linux x86_64 e arm64 dotati di microfono e speaker, installare ed eseguire la stessa versione sia direttamente sia in Docker; completare un’interazione vocale in ciascuna combinazione usando lo stesso schema di configurazione. Registrare sistema operativo, periferiche, versioni e dipendenze native, inclusi Decibri, `libasound.so.2`, ONNX Runtime e i file dei modelli caricati. Acquisire dal microfono e riprodurre fino alla fine una risposta sullo speaker configurato in tutte le combinazioni. Accertare che il rilevamento funzioni nel processo satellite sia su host sia nel container. Una build riuscita o una prova sotto emulazione non sostituisce la dimostrazione audio sulle due architetture.

#### Metadata
  * type: demonstration-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * verify: [Distribuzione Docker facoltativa](../Requirements/VoiceSatellite.md#distribuzione-docker-facoltativa)
  * verify: [Esecuzione diretta sul sistema host](../Requirements/VoiceSatellite.md#esecuzione-diretta-sul-sistema-host)
  * verify: [Supporto Linux su due architetture](../Requirements/VoiceSatellite.md#supporto-linux-su-due-architetture)
---

### Dimostrazione della protezione dei dati locali

Verifica operativa ancora aperta. Ispezione parziale del 2026-10-16: Dockerfile usa COPY espliciti per artefatti, dipendenze, modelli e avviso; .dockerignore esclude config.json e *.local.json; config.example.json contiene solo valori dimostrativi senza credenziali. Il test software dell’immagine amd64 ha già verificato assenza della configurazione personale nei percorsi di avvio. Nessuna nuova misura delle scritture durante interazioni reali. La protezione dei log Micdrop, aperta allora, non è più pertinente dopo la rimozione della dipendenza.

#### Details
Durante interazioni riuscite e fallite controllare scritture su disco e log usando audio, testo e credenziali riconoscibili: non devono comparire registrazioni persistenti né contenuti o credenziali nei log. Ispezionare gli artefatti host e container e gli esempi per escludere configurazioni personali. Le registrazioni preregistrate distribuite per gli avvisi locali restano ammesse.

#### Metadata
  * type: demonstration-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * verify: [Assenza di registrazioni audio persistenti](../Requirements/VoiceSatellite.md#assenza-di-registrazioni-audio-persistenti)
  * verify: [Esclusione delle configurazioni personali dagli artefatti](../Requirements/VoiceSatellite.md#esclusione-delle-configurazioni-personali-dagli-artefatti)
  * verify: [Selezione esplicita dei dati diagnostici](../Requirements/VoiceSatellite.md#selezione-esplicita-dei-dati-diagnostici)
---

### Dimostrazione della segmentazione vocale

Verifica da ripetere con l'adapter Silero del satellite: le osservazioni registrate sotto sono state raccolte con la segmentazione di Micdrop.

#### Details
Su Linux x86_64 e arm64, con audio acquisito e con file di prova, usare il modello Silero ONNX incluso in Decibri 5.8.0, verificando hash e licenza. Con le soglie del contratto, 0,18 e 0,11, `minSpeechFrames` 4 e `redemptionFrames` 20, provare una richiesta continua dopo la wake word, una replica breve come «sì» e una frase con una pausa interna. Accertare che ogni turno ammesso produca un solo `input.start` alla conferma del parlato, la riserva e i frame PCM16 mono a 16 kHz e un solo `input.end`, senza perdere la replica breve né spezzare la frase alla pausa; un rumore breve non confermato non deve aprire una richiesta. Durante la riproduzione della risposta non devono partire nuovi turni. Registrare tempi di delimitazione e consumo di CPU su entrambe le architetture.

Il 17 ottobre 2026 la diagnostica temporanea sul Raspberry, con il trasporto Micdrop, ha osservato il primo turno da 27,516 a 29,528 secondi e la replica da 34,907 a 36,392 secondi dall'avvio; Micdrop ha segnalato circa 19.950 campioni al secondo ricevuti da un microfono dichiarato a 16 kHz. È un'osservazione singola da verificare con una misura indipendente prima di modificare configurazione o driver.

#### Metadata
  * type: demonstration-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * verify: [Delimitazione locale dei turni vocali](../Requirements/VoiceSatellite.md#delimitazione-locale-dei-turni-vocali)
---

### Ispezione dei confini interni

Esaminare manifest, import di produzione e di soli tipi, composition root e test. Accertare un solo progetto, assemblaggio delle porte nella composition root e rispetto della matrice di importazione nei test. I test Application devono poter usare porte simulate senza hardware.

#### Details
2026-10-16: PASS. Ispezionati import statici, dinamici, di soli tipi e vi.mock in test/domain, test/application, test/adapters/in, test/adapters/out, test/runtime, test/composition e test/support. Domain importa produzione Domain; Application importa Application; inbound usa il proprio ingresso e Application; outbound usa integrazioni outbound, senza ingressi. I test di composition sono integrazione esplicita. ManualDeadlines dipende dalla porta Application. Nessun workspace/package business separato. Typecheck completo e core, 89 test in 19 file e build PASS. Non attestate periferiche reali.

#### Metadata
  * type: inspection-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * verify: [Assemblaggio delle risorse nella composition root](../Requirements/VoiceSatellite.md#assemblaggio-delle-risorse-nella-composition-root)
  * verify: [Confini degli import nei test](../Requirements/VoiceSatellite.md#confini-degli-import-nei-test)
  * verify: [Progetto unico del satellite](../Requirements/VoiceSatellite.md#progetto-unico-del-satellite)
---

### Ispezione dei nomi secondo le responsabilità

#### Details
Partire dall'elenco completo dei file di produzione, dalle porte Application e dai punti di ingresso; non limitare la ricerca ai nomi che contengono già `.adapter` o `.use-case`. Per ciascun componente interessato registrare percorso, responsabilità, eventuale porta implementata o caso d'uso invocato, classificazione e nome atteso.

L'ispezione passa se tutti i casi d'uso hanno il suffisso `.use-case.ts`, tutti gli adapter di ingresso e di uscita hanno il suffisso `.adapter.ts` e i file di supporto non sono classificati come adapter soltanto per la cartella che li contiene. Considerare anche le implementazioni strutturali di porte a oggetto o callable; non affidarsi al solo `implements`. I ruoli ambigui devono essere risolti con motivazione documentata. L'ispezione fallisce se manca un suffisso richiesto o se un suffisso descrive un ruolo non realizzato.

Per ogni rinomina controllare import, export pubblici, riferimenti nei test e collegamenti Reqvire. La compilazione e i test pertinenti devono continuare a passare. Registrare revisione Git esaminata, elenco dei file classificati, difetti ed esito; la presenza di una relazione `satisfiedBy` e il successo di `validate` o `lint` non sostituiscono questa ispezione.

#### Esito dell'ispezione del 16 ottobre 2026
Esito: PASS sul worktree successivo alla revisione base `cf91098f0504b947913e82e883ece157c5b6525c`. Esaminati tutti i 17 file TypeScript di produzione, comprese le implementazioni strutturali delle porte e i punti di ingresso. Nessuna non conformità residua di naming nel perimetro esaminato.

Identificazione riproducibile dei sorgenti esaminati: SHA-256 `a82690bb206e72c594037bc6f27731f8e8b5bbd895850b42ae094fa98aa2241f`, calcolato concatenando, in ordine lessicografico, percorso relativo UTF-8, byte NUL, contenuto del file, byte NUL, per tutti i file dell'inventario. Il risultato riguarda questo stato del worktree, non attesta modifiche successive.

Rinominato VoiceSession in `voice-session.use-case.ts`: lo stato e la forma a classe non ne cambiano il ruolo. Estratte dalla composition root la traduzione degli eventi inbound e l'implementazione outbound di VoiceSessionPorts. Il loader dell'avviso WAV è un supporto tecnico separato. Driver ONNX, Silero e Decibri restano senza suffisso perché realizzano contratti di libreria e non porte Application.

#### Inventario completo
Il percorso in tabella è anche il nome atteso. Classificazione basata su responsabilità, porte e chiamate esaminate; la cartella non determina il ruolo.

| File di produzione e nome atteso | Responsabilità e classificazione | Controllo |
| --- | --- | --- |
| `src/adapters/in/config-arguments.ts` | Supporto CLI: parsing argomenti, nessun caso d'uso invocato. | Nome descrittivo, nessun suffisso richiesto |
| `src/adapters/in/micdrop-events.adapter.ts` | Adapter inbound: eventi microfono, wake word, Micdrop e playback → VoiceSession. | Suffisso richiesto presente |
| `src/adapters/out/backend-url.ts` | Supporto configurazione: costruzione URL. | Nome descrittivo, nessun suffisso richiesto |
| `src/adapters/out/config-file.ts` | Supporto bootstrap: lettura configurazione. | Nome descrittivo, nessun suffisso richiesto |
| `src/adapters/out/configuration.ts` | Supporto: schema e validazione configurazione. | Nome descrittivo, nessun suffisso richiesto |
| `src/adapters/out/decibri-audio.ts` | Driver audio tecnico; non implementa una porta Application. | Nome descrittivo, nessun suffisso richiesto |
| `src/adapters/out/local-notice.ts` | Supporto: caricamento WAV e formattazione diagnostica. | Nome descrittivo, nessun suffisso richiesto |
| `src/adapters/out/micdrop-call.adapter.ts` | Adapter outbound: implementa VoiceSessionPorts (chiamata, mute, chiusura e avviso). | Suffisso richiesto presente |
| `src/adapters/out/micdrop-decibri-drivers.ts` | Driver microfono/speaker di Micdrop; non implementano porte Application. | Nome descrittivo, nessun suffisso richiesto |
| `src/adapters/out/micdrop-playback.ts` | Supporto tecnico: rilevamento della fine riproduzione. | Nome descrittivo, nessun suffisso richiesto |
| `src/adapters/out/onnx-wake-word.ts` | Driver inferenza ONNX; segnala callback all'adapter inbound. | Nome descrittivo, nessun suffisso richiesto |
| `src/adapters/out/silero-node.ts` | Driver VAD di Micdrop; non implementa una porta Application. | Nome descrittivo, nessun suffisso richiesto |
| `src/adapters/out/wake-word-catalog.ts` | Supporto: catalogo e percorsi modelli. | Nome descrittivo, nessun suffisso richiesto |
| `src/application/voice-session.use-case.ts` | Caso d'uso: interazione vocale con stato, timeout e VoiceSessionPorts. | Suffisso richiesto presente |
| `src/composition/satellite.ts` | Composition root: costruisce e collega risorse, casi d'uso e adapter. | Nome descrittivo, nessun suffisso richiesto |
| `src/domain/voice-turn.ts` | Domain: macchina a stati pura del turno. | Nome descrittivo, nessun suffisso richiesto |
| `src/main.ts` | Bootstrap del processo e arresto delle risorse. | Nome descrittivo, nessun suffisso richiesto |

#### Evidenze eseguite
`./node_modules/.bin/tsc --noEmit` e `./node_modules/.bin/tsc -p tsconfig.build.json`: PASS. `./node_modules/.bin/vitest run`: 12 file di test, 52 test PASS. Il nuovo `test/adapters/in/micdrop-events.test.ts` controlla un turno e la replica senza altra wake word, il filtro dei frame e la rimozione dei listener. Caricamento WAV dal modulo compilato spostato: PASS, 48384 campioni.

Riesaminati import relativi, export, riferimenti dei test e collegamenti del modello aggiornati dalle rinomine MCP. Questa ispezione attesta la convenzione dei nomi e la regressione software pertinente; non sostituisce le dimostrazioni audio su hardware o la validazione generale del prodotto.

#### Revisione della tracciabilità
Revisione successiva al commit di implementazione `4f82100`: aggiornati i collegamenti alle implementazioni estratte. Reqvire validate: PASS; lint: nessun rilievo. Coverage: tutti i 43 requisiti foglia hanno una verifica collegata; questo dato non attesta l'esecuzione di tutte le verifiche. Traces conferma il percorso requisito dei nomi → questa ispezione.

Change-impact rispetto alla revisione base propaga la modifica della capability e dell'obiettivo a 14 verifiche. Riesaminato il perimetro della modifica: nomi, import/export e spostamento dei confini voce; non cambiano contratti pubblici, porte Application, regole Domain, configurazione o dipendenze. Eseguite l'ispezione e la regressione software sopra registrate. Le altre verifiche pianificate e le dimostrazioni hardware mantengono il loro stato; non sono dichiarate superate da questo refactoring. La copertura implementativa complessiva resta parziale (79.07%), con lacune ulteriori fuori dal requisito dei nomi.

#### Metadata
  * type: inspection-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * verify: [Nomi dei file secondo il ruolo architetturale](../Requirements/VoiceSatellite.md#nomi-dei-file-secondo-il-ruolo-architetturale)
---

### Ispezione del bootstrap della configurazione

Verifica pianificata; nessuna evidenza di esecuzione disponibile.

#### Details
Usare una configurazione invalida e osservare che nessuna risorsa audio, wake word o connessione operativa viene costruita. Con configurazione valida verificare che ogni componente riceva soltanto i dati necessari e che Domain e casi d’uso non leggano file o ambiente.

#### Metadata
  * type: inspection-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * verify: [Distribuzione mirata della configurazione](../Requirements/VoiceSatellite.md#distribuzione-mirata-della-configurazione)
  * verify: [Validazione prima della costruzione delle risorse](../Requirements/VoiceSatellite.md#validazione-prima-della-costruzione-delle-risorse)
---

### Ispezione del perimetro iniziale di osservabilità

Ispezionare dipendenze, bootstrap, composition root, configurazione e logger: devono essere presenti soltanto i segnali diagnostici applicativi previsti, senza attivazione di sistemi separati di metriche, tracing distribuito o audit. Controllare che la documentazione non presenti i log come registro di audit garantito.

#### Details
2026-10-16: ispezione PASS sulla base 50f0329200b433f22132d3cd0c5dcc372ebc6986. Esaminati package.json, src/main.ts, src/composition/satellite.ts, src/adapters/out/diagnostics.ts, config.example.json e Dockerfile; ricerca dei riferimenti nei sorgenti senza integrazioni di metriche, tracing o audit. Il logger applicativo usa Pino su stdout. Il bootstrap imposta ORT_DISABLE_TELEMETRY prima dell’import dinamico della composition root; l’ispezione non è una misura del traffico delle librerie native. Modifica solo di modello e documentazione, senza nuove prove software o hardware. La protezione dei log diretti Micdrop resta una verifica separata aperta.

#### Metadata
  * type: inspection-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * verify: [Perimetro iniziale dei segnali di osservabilità](../Requirements/VoiceSatellite.md#perimetro-iniziale-dei-segnali-di-osservabilità)
---

### Ispezione del workflow CI del satellite

Verificare eventi di attivazione, versioni, lockfile congelato, sequenza dei cinque controlli e fallimento del job senza continue-on-error. Eseguire localmente i comandi compatibili; una prova locale non attesta un’esecuzione GitHub Actions. Per la prova remota richiedere una run del workflow sul commit pubblicato.

#### Details
2026-10-16: actionlint 1.7.12 senza rilievi (shellcheck non disponibile); installazione pnpm 12.11.2 con frozen-lockfile PASS su Node.js 24; typecheck completo e core, 89 test in 19 file e build PASS su Node.js 24. Validazione Reqvire PASS. Workflow ispezionato: nessun filtro per percorsi, nessun continue-on-error, controllo esplicito di entrambe le liste di rilievi lint, permessi contents:read. Esecuzione remota PASS: https://github.com/adrianofoschi/ambrogio-satellite/actions/runs/38908867632 sul commit 4583a41a20dd6c3ff2dddc49801bfaa6a2f9dfa1. Job Satellite checks riuscito: installazione congelata, validate e lint Reqvire, typecheck/core, test e build; nessuno step di controllo saltato. Nessuna attestazione delle prove audio hardware o arm64.

#### Metadata
  * type: inspection-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * verify: [Controlli CI delle modifiche del satellite](../Requirements/VoiceSatellite.md#controlli-ci-delle-modifiche-del-satellite)
---

### Ispezione della architettura e degli esiti

Revisione del 2026-10-16: repository Git autonomo, namespace dei concetti e ontologia appartenenti al satellite, contratto backend registrato localmente. Export MCP Turtle di ontologie e concetti riuscito; validazione strutturale verificata separatamente. Separazione e tipi già coperti dalle prove Application e core; 89 test, typecheck e build PASS. Questa ispezione non attesta la compatibilità operativa con il backend né chiude le lacune dei log Micdrop.

#### Details
Esaminare codice, import e firme: TypeScript eseguito da Node.js; stati e regole in Domain; coordinamento e porte in Application; librerie audio, wake word e trasporto negli adapter. Per ogni esito negativo dichiarato verificare la rappresentazione tipizzata; per i guasti inattesi verificare propagazione e gestione diagnostica al confine tecnico. Accertare repository e modello autonomi con riferimento esplicito al contratto backend, senza grafi fusi. Controllare che il lessico e l'ontologia locali definiscano i termini e le relazioni essenziali senza dipendere dal modello backend, che i riferimenti ai concetti risolvano e che le esportazioni semantiche e la validazione Reqvire abbiano esito corretto.

#### Metadata
  * type: inspection-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * verify: [Esiti previsti come valori tipizzati](../Requirements/VoiceSatellite.md#esiti-previsti-come-valori-tipizzati)
  * verify: [Gestione dei guasti inattesi](../Requirements/VoiceSatellite.md#gestione-dei-guasti-inattesi)
  * verify: [Modello autonomo del satellite](../Requirements/VoiceSatellite.md#modello-autonomo-del-satellite)
  * verify: [Separazione Domain Application e adapter](../Requirements/VoiceSatellite.md#separazione-domain-application-e-adapter)
  * verify: [Stack TypeScript e Node.js](../Requirements/VoiceSatellite.md#stack-typescript-e-nodejs)
---

### Ispezione della forma TypeScript dei contratti

#### Details
Inventariare tutte le dichiarazioni Application, incluse capacità restituite e callable. Passa se le porte a oggetto sono interface e dati, unioni e callable usano type o firme callable inline, senza cambiare operazioni o significato. Verificare anche le dichiarazioni generate, typecheck completo e core, build e suite esistente. Non aggiungere test che controllano soltanto la parola interface.

#### Esito del 16 ottobre 2026
PASS sul worktree derivato da f27987ddf166c01aed6ed95a15fb17c0b0c4dee3. Inventario completo dei contratti nei due file Application:

| File | Dichiarazione | Ruolo | Forma verificata |
| --- | --- | --- | --- |
| src/application/voice-session.use-case.ts | VoiceSessionPorts | Porta a oggetto: chiamata, parlato e segnalazione guasti | interface |
| src/application/voice-session.use-case.ts | VoiceSessionEvent | Unione di eventi Application | type |
| src/application/voice-session.use-case.ts | VoiceSessionStatus | Dati osservabili | type Readonly |
| src/application/deadline-scheduler.ts | DeadlineScheduler | Porta di programmazione | interface |
| src/application/deadline-scheduler.ts | ScheduledDeadline | Capacità restituita per cancellare | interface |
| src/application/deadline-scheduler.ts | callback di schedule | Callable senza stato | Firma inline () => void |

VoiceSession è l'implementazione del caso d'uso e rimane una classe: la convenzione riguarda le dichiarazioni dei contratti. Convertiti VoiceSessionPorts e ScheduledDeadline, conservando readonly sulle operazioni precedentemente racchiuse in Readonly. Nessuna modifica a parametri, risultati o comportamento. DeadlineScheduler era già conforme.

Controllate le dichiarazioni rigenerate voice-session.use-case.d.ts e deadline-scheduler.d.ts. Typecheck completo e core senza tipi ambientali: PASS. Build ESM: PASS. Vitest: 83 test in 18 file, tutti superati. Nessun test artificiale aggiunto per controllare soltanto la sintassi delle dichiarazioni. Il cambiamento è interno e non modifica il contratto vocale pubblico o la documentazione operativa.

#### Metadata
  * type: inspection-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * verify: [Forma TypeScript dei contratti Application](../Requirements/VoiceSatellite.md#forma-typescript-dei-contratti-application)
---

### Ispezione della protezione del merge

Controllare via GitHub che main richieda il check `Satellite checks` e impedisca il merge con check fallito o mancante.

#### Details
2026-10-16: controllo remoto NON superato. Il repository è privato; gli endpoint rulesets e branch protection restituiscono HTTP 403 con richiesta di GitHub Pro o repository pubblico. Non sono state cambiate visibilità o sottoscrizione. Il requisito resta aperto fino alla disponibilità e attivazione della protezione.

#### Metadata
  * type: inspection-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * verify: [Controlli obbligatori prima del merge](../Requirements/VoiceSatellite.md#controlli-obbligatori-prima-del-merge)
---

### Ispezione della raccolta esterna dei log

Ispezionare costruzione del logger, call site, configurazione, dipendenze e avvio container: nessuna destinazione file o remota applicativa, nessun meccanismo di rotazione interno, nessun servizio di logging richiesto per avviare il satellite. Verificare che la documentazione assegni conservazione, rotazione e inoltro all’installazione.

#### Details
2026-10-16: ispezione PASS su base 2a2aa358d51b731cc3b77722e6108123610326ab. diagnostics.ts costruisce l’istanza di produzione con process.stdout; la destinazione alternativa è usata dai test per acquisire le righe. Nessun transport Pino o backend di raccolta nelle dipendenze e nei sorgenti. Dockerfile avvia direttamente Node senza redirezioni verso file. Non sono state configurate o provate politiche reali di conservazione nel deployment. I log diretti di Micdrop rimangono una lacuna separata.

#### Metadata
  * type: inspection-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * verify: [Gestione dei log affidata al deployment](../Requirements/VoiceSatellite.md#gestione-dei-log-affidata-al-deployment)
---

### Ispezione delle licenze dei modelli distribuiti

Verifica pianificata; nessuna esecuzione o evidenza positiva è ancora disponibile.

#### Details
Per ogni modello presente nel catalogo confrontare file, origine, versione, licenza, condizioni di redistribuzione e attribuzioni con le fonti del titolare. Verificare che le informazioni necessarie accompagnino sia il pacchetto host sia l'immagine container e che la licenza del codice sia presentata separatamente. Fallire l'ispezione se un modello distribuito non ha condizioni verificabili o manca una delle informazioni richieste.

#### Metadata
  * type: inspection-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * verify: [Condizioni di distribuzione dei modelli wake word](../Requirements/VoiceSatellite.md#condizioni-di-distribuzione-dei-modelli-wake-word)
---

### Prova degli eventi tardivi dopo la fine dell'interazione

Con una sessione controllata, concludere un'interazione per risposta conclusiva, per scadenza dell'esito e per perdita della sessione; poi consegnare trasmissioni, frame audio, esiti e un evento di chiusura appartenenti alla richiesta o alla sessione precedente mentre il satellite ha già riaperto l'ascolto o avviato una nuova interazione.

#### Details
La prova passa se gli eventi tardivi non interrompono l'acquisizione del microfono, non vengono riprodotti e non sono attribuiti alla nuova interazione, e se l'evento di chiusura della sessione corrente conserva la gestione ordinaria. Fallisce se un esito o un frame della richiesta precedente apre una replica, chiude la nuova interazione o arresta l'ascolto. La regressione registrata il 17 ottobre 2026 riguardava la patch del client Micdrop 3.4.0 e non vale per il trasporto `ambrogio.v1`.

#### Metadata
  * type: test-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * verify: [Riapertura sicura dopo la chiusura vocale](../Requirements/VoiceSatellite.md#riapertura-sicura-dopo-la-chiusura-vocale)
---

### Prova del catalogo wake word montato

Preparare una directory di modelli con le risorse comuni openWakeWord e un classificatore compatibile chiamato `personalizzato.onnx`. Montarla in sola lettura su `/app/models/wakeword` nell'immagine satellite, scegliere `wakeWord.model: "personalizzato"` e caricare il classificatore. Provare anche identificatori inesistenti, nomi dei modelli comuni e tentativi di attraversamento della directory.

#### Details
La prova passa se il modello personalizzato è scoperto e caricato dal mount senza ricostruire l'immagine, le wake word distribuite continuano a funzionare senza mount e i nomi assenti o non sicuri sono rifiutati. Fallisce se il mount è ignorato, la configurazione accetta un percorso fuori directory o un modello comune come classificatore. La prova non dimostra l'accuratezza acustica di un modello personalizzato.

Eseguita il 17 ottobre 2026 su immagine `linux/amd64` locale: i modelli distribuiti sono stati caricati, il mount ha sostituito la directory inclusa e un classificatore ONNX copiato come `personalizzato.onnx` è stato scoperto e caricato. La suite di 103 test e il typecheck sono passati. La prova Docker `arm64` e l'accuratezza di un modello personalizzato effettivo restano da verificare.

#### Metadata
  * type: test-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * satisfiedBy: [verify-docker-image.mjs](../../scripts/verify-docker-image.mjs)
  * satisfiedBy: [wake-word-catalog.test.ts](../../test/adapters/out/wake-word-catalog.test.ts)
  * verify: [Selezione della wake word configurata](../Requirements/VoiceSatellite.md#selezione-della-wake-word-configurata)
---

### Prova del ciclo di arresto del satellite

#### Details
Iniettare risorse controllate e fallimenti: durante ascolto, chiamata e riproduzione, l'arresto deve bloccare nuovi eventi e interrompere i dispositivi senza attendere una risposta. Chiamare stop ripetutamente e in parallelo: una sola chiusura nativa per risorsa, stesso esito. Far fallire una chiusura: tutte le altre devono essere tentate e l'errore originale deve restare disponibile. Fallire l'avvio dopo acquisizioni parziali e interrompere un'acquisizione pendente: tutte le risorse ottenute devono essere rilasciate. Provare rilascio ONNX parziale e inferenza in corso, cancellazione avviso locale e SIGINT/SIGTERM nel confine di processo. I test automatici usano risorse simulate; non attestano periferiche reali.

#### Evidenze del 16 ottobre 2026
Esito: PASS per la verifica automatica del ciclo di vita sul worktree derivato da d79775c13fc31c7ab7eb0071d9e0803bb7d18b11. Eseguiti Vitest (67 test, 17 file, tutti superati), typecheck TypeScript e build ESM, entrambi superati.

La prova di composition root inietta guasti di avvio e chiusura, controlla il rilascio delle risorse indipendenti e l'identità dell'operazione di arresto ripetuta. La prova del processo esercita SIGINT e SIGTERM tramite un emettitore controllato anche durante l'avvio; verifica la rimozione degli handler e la propagazione del guasto al chiamante. La prova Micdrop copre un'apertura che termina dopo l'arresto e impedisce il riavvio dell'ascolto. Le prove Decibri coprono acquisizione tardiva del microfono, errore di stop senza doppio rilascio e interruzione della riproduzione dell'avviso con drain pendente. Le prove ONNX coprono caricamento parziale fallito, rilascio di tutte le sessioni nonostante un errore, scarto della coda e rifiuto di nuovi frame. La prova Silero attende l'inferenza già in corso, rilascia una sola volta e conserva un errore di release anche se Micdrop non attende il rilascio.

Limiti: dispositivi, segnali e guasti sono simulati nelle nuove prove; la suite comprende anche il caricamento reale dei modelli distribuiti su questa macchina. Non sono attestate prove di terminazione con periferiche fisiche né su arm64. La durata di un'operazione nativa non cancellabile resta vincolata alla libreria; non è stata concordata una scadenza di arresto forzato.

Revisione di impatto: interessati assemblaggio, ingressi eventi, recupero locale, audio e inferenza; resta invariata la normale attesa della risposta. La regressione completa è stata eseguita. Il README descrive ora SIGINT/SIGTERM; eventuali guide esterne di installazione dovranno riportare la stessa politica.

#### Metadata
  * type: test-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * satisfiedBy: [decibri-audio.test.ts](../../test/adapters/out/decibri-audio.test.ts)
  * satisfiedBy: [onnx-lifecycle.test.ts](../../test/adapters/out/onnx-lifecycle.test.ts)
  * satisfiedBy: [silero-vad.test.ts](../../test/adapters/out/silero-vad.test.ts)
  * satisfiedBy: [satellite-lifecycle.test.ts](../../test/composition/satellite-lifecycle.test.ts)
  * satisfiedBy: [satellite-process.test.ts](../../test/runtime/satellite-process.test.ts)
  * verify: [Arresto immediato del processo satellite](../Requirements/VoiceSatellite.md#arresto-immediato-del-processo-satellite)
  * verify: [Idempotenza dell'arresto del satellite](../Requirements/VoiceSatellite.md#idempotenza-dellarresto-del-satellite)
  * verify: [Rilascio completo delle risorse del satellite](../Requirements/VoiceSatellite.md#rilascio-completo-delle-risorse-del-satellite)
---

### Prova del confine Application della sessione

#### Details
Controllare proiezioni osservabili durante attesa, apertura, registrazione, risposta, replica, chiusura e guasto; una fotografia precedente non cambia con le transizioni e la sua mutazione non modifica lo stato interno. Verificare che gli eventi di timeout e completamento delle porte non siano ammessi dall'API pubblica. L'adapter legge solo il contratto Application, converte metadati non booleani in indicazione assente e conserva filtro dei frame, conclusione del parlato e gestione delle disconnessioni. Eseguire typecheck, build e regressione completa senza cambiare le regole Domain.

#### Evidenze del 16 ottobre 2026
Esito: PASS sul worktree derivato da b1142bbd08d72c3780a1259729052b6b232233e4. Eseguiti typecheck completo, controllo core senza tipi ambientali, build ESM e suite Vitest: 83 test in 18 file, tutti superati.

VoiceSessionEvent e VoiceSessionStatus sono dichiarati in Application, senza alias o riesportazioni Domain. dispatch traduce esplicitamente i cinque eventi esterni; applyEvent è privato e gestisce anche completamenti delle porte e timeout. Il getter status restituisce una nuova proiezione dei tre indicatori necessari all'adapter. Nessun cambio al sorgente Domain o alle sue transizioni.

Le prove Application attraversano attesa, apertura, registrazione, risposta e chiusura, verificano il contratto durante recupero dal guasto e controllano fotografie distaccate dallo stato interno. Le asserzioni di tipo escludono state dall'API e timeout/call_opened/call_closed dagli eventi pubblici. I test preesistenti continuano a controllare replica, scadenze e arresto. Le prove inbound esercitano true, false, stringa, null e campo assente per expectsReply; controllano inoltre filtro dei frame, fine del parlato, rimozione dei listener e disconnessione inattiva rispetto ad attiva.

Ispezionata la dichiarazione generata dist/application/voice-session.use-case.d.ts: nessun import o tipo Domain, nessuna fase interna esposta. Ricerca negli ingressi e nella composition root: nessun riferimento a state.phase, VoiceTurn o import Domain. Il cambiamento riguarda un confine interno: contratto vocale pubblico, durate e comportamento operativo restano invariati. Le dimostrazioni hardware non sono sostituite dalla regressione software.

#### Metadata
  * type: test-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * satisfiedBy: [voice-session.test.ts](../../test/application/voice-session.test.ts)
  * verify: [Contratti Application indipendenti dal Domain](../Requirements/VoiceSatellite.md#contratti-application-indipendenti-dal-domain)
---

### Prova dell'avviso di voce non disponibile

Con una sessione controllata, rispondere a un turno vocale con una trasmissione testuale seguita da `turn.rejected` con `reason: "audio_unavailable"`; ripetere con una trasmissione testuale in un turno ammesso. Verificare anche l'asset distribuito.

#### Details
La prova passa se il satellite non tenta di pronunciare il testo, riproduce la registrazione locale «La voce non è disponibile.» sullo speaker configurato, non apre una replica e torna in attesa della wake word, senza reinviare la richiesta. L'asset è un WAV PCM16 mono a 16 kHz con origine e licenza documentate. Fallisce se il satellite resta in attesa, apre una replica o riproduce l'avviso di backend irraggiungibile al suo posto.

#### Metadata
  * type: test-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * verify: [Avviso parlato di voce non disponibile](../Requirements/VoiceSatellite.md#avviso-parlato-di-voce-non-disponibile)
---

### Prova dell'identità del satellite nella sessione

Con una sessione controllata, avviare il satellite senza sezione `client`, poi con `client.id` e `client.name`, e osservare `session.hello`. Ripetere con valori vuoti o di tipo diverso.

#### Details
La prova passa se senza configurazione `clientId` vale `satellite-<nome host>` e `name` vale il nome host, se i valori configurati li sostituiscono senza effetto delle variabili d'ambiente, e se valori vuoti o di tipo diverso rendono invalida la configurazione prima dell'avvio operativo. Fallisce se il satellite apre una sessione con un identificativo vuoto o diverso da quello configurato.

#### Metadata
  * type: test-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * verify: [Identificazione del satellite nella sessione](../Requirements/VoiceSatellite.md#identificazione-del-satellite-nella-sessione)
---

### Prova della diagnostica Pino

Acquisire le righe reali di Pino: JSON, event stabili, nessun dato sensibile da message, name, stack, code, cause o proprietà aggiuntive. Controllare identità e immutabilità degli originali, valori lanciati non Error, cause cicliche, getter e aggregati. Iniettare un guasto di interazione e uno di riproduzione: un evento distinto per ciascun guasto e avviso parlato indipendente. Verificare avvio e rifiuti di configurazione senza log automatici di errore. Con il trasporto `ambrogio.v1`, verificare che nessun componente emetta su console messaggi ricevuti o errori grezzi fuori dal logger applicativo.

#### Details
Esecuzione del 2026-10-16: npm run typecheck, npm test (89 test, 19 file) e npm run build PASS. Prova CLI dei rifiuti per argomenti e configurazione assente: singola riga JSON info su stdout, uscita 2. Le prove automatiche coprono il logger applicativo, la propagazione del valore originale e gli eventi distinti di interazione e avviso. La lacuna allora aperta sui log diretti di Micdrop 3.4.0 è chiusa dalla rimozione della dipendenza decisa il 17 ottobre 2026; la prova va ripetuta sul nuovo trasporto. Le dimostrazioni su backend e periferiche reali restano da eseguire.

#### Metadata
  * type: test-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * satisfiedBy: [diagnostics.test.ts](../../test/adapters/out/diagnostics.test.ts)
  * satisfiedBy: [voice-session.test.ts](../../test/application/voice-session.test.ts)
  * verify: [Conservazione della causa dei guasti](../Requirements/VoiceSatellite.md#conservazione-della-causa-dei-guasti)
  * verify: [Eventi diagnostici stabili](../Requirements/VoiceSatellite.md#eventi-diagnostici-stabili)
  * verify: [Log tecnici JSON su stdout](../Requirements/VoiceSatellite.md#log-tecnici-json-su-stdout)
  * verify: [Selezione esplicita dei dati diagnostici](../Requirements/VoiceSatellite.md#selezione-esplicita-dei-dati-diagnostici)
  * verify: [Serializzazione protetta dei guasti](../Requirements/VoiceSatellite.md#serializzazione-protetta-dei-guasti)
  * verify: [Unicità della diagnosi definitiva](../Requirements/VoiceSatellite.md#unicità-della-diagnosi-definitiva)
  * verify: [Uso di Pino per la diagnostica](../Requirements/VoiceSatellite.md#uso-di-pino-per-la-diagnostica)
---

### Prova della sessione e delle conversazioni del satellite

Con un backend `ambrogio.v1` controllato, avviare il satellite e completare due attivazioni con la wake word e una replica senza wake word; chiudere la sessione lato backend mentre il satellite attende la wake word e durante un'interazione; ritardare `session.ready`.

#### Details
La prova passa se all'avvio esiste una sola sessione pronta, se ogni attivazione con la wake word apre una richiesta senza `conversationId` e la replica usa il `conversationId` di `turn.accepted`, se nessun messaggio o frame è inviato prima di `session.ready`, se la sessione chiusa durante l'attesa viene riaperta alla successiva attivazione senza avvisi e se la chiusura durante un'interazione produce il recupero locale senza riprendere la richiesta sulla nuova sessione. Fallisce se una richiesta, una trasmissione o un turno vengono ripresi su una sessione diversa da quella in cui sono iniziati.

#### Metadata
  * type: test-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * verify: [Invio soltanto su sessione pronta](../Requirements/VoiceSatellite.md#invio-soltanto-su-sessione-pronta)
  * verify: [Nuova conversazione a ogni attivazione](../Requirements/VoiceSatellite.md#nuova-conversazione-a-ogni-attivazione)
  * verify: [Sessione conversazionale persistente](../Requirements/VoiceSatellite.md#sessione-conversazionale-persistente)
---

### Prova delle scadenze indipendenti dal runtime

#### Details
Con una porta controllata verificare scadenza della risposta e della replica ai limiti concordati, cancellazione alla replica, sostituzione dopo un nuovo turno, arresto e guasto senza callback residui. I test Application non devono usare fake timer globali né importare l'adapter Node.js. Provare separatamente l'adapter: esecuzione singola differita, cancellazione ripetuta e cancellazione dopo esecuzione. Riesaminare tutti i file Domain e Application, inclusi import di soli tipi, per escludere API e tipi dell'ambiente; eseguire compilazione e regressione.

#### Evidenze del 16 ottobre 2026
Esito: PASS sul worktree derivato da 33bdc28450057c48501893aa3c687e45481aa042. Suite Vitest: 75 test in 18 file, tutti superati. Typecheck completo, compilazione dei layer interni con tsconfig.core.json (lib ES2024, types vuoto) e build ESM superati.

VoiceSession riceve DeadlineScheduler dalla composition root; ScheduledDeadline espone solo cancel() senza handle runtime. Riesaminati tutti i sorgenti interni: domain/voice-turn.ts, application/voice-session.use-case.ts e application/deadline-scheduler.ts. Gli import puntano soltanto a Domain o Application; non sono presenti API o tipi Node.js, DOM, timer globali o dipendenze tecniche. Il nuovo node-deadline-scheduler.adapter.ts implementa la porta e rispetta la convenzione dei nomi; la dichiarazione della porta non è un adapter.

I test Application usano ManualDeadlines: timeout di risposta a 60000 ms, finestra di replica a 15000 ms, cancellazione alla ripresa del parlato e nuova scadenza per il turno successivo; arresto e guasto annullano entrambe le categorie di scadenza senza chiusure tardive. I test dell'adapter usano timer Node.js reali per verificare esecuzione differita singola, cancellazione ripetuta, indipendenza fra registrazioni e ritardo zero asincrono. Il tentativo iniziale con fake timer globali non intercettava gli import node:timers ed è stato sostituito da queste prove reali.

La revisione non cambia durate o protocollo pubblico; README aggiornato per il nuovo controllo architetturale. La compilazione senza tipi ambientali integra la revisione degli import, ma non sostituisce un controllo contro ogni possibile dipendenza tecnica futura. La regressione comprende i test di arresto e degli ingressi Micdrop; le dimostrazioni audio hardware rimangono fuori da questa verifica.

#### Metadata
  * type: test-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * satisfiedBy: [node-deadline-scheduler.test.ts](../../test/adapters/out/node-deadline-scheduler.test.ts)
  * satisfiedBy: [voice-session.test.ts](../../test/application/voice-session.test.ts)
  * satisfiedBy: [tsconfig.core.json](../../tsconfig.core.json)
  * verify: [Indipendenza tecnica di Domain e Application](../Requirements/VoiceSatellite.md#indipendenza-tecnica-di-domain-e-application)
  * verify: [Programmazione delle scadenze tramite porta Application](../Requirements/VoiceSatellite.md#programmazione-delle-scadenze-tramite-porta-application)
---

### Prova software delle immagini del satellite

Su ciascuna immagine verificare architettura, import delle dipendenze native Decibri e ONNX, caricamento e inferenza silenziosa dei modelli wake word distribuiti, caricamento Silero e asset dell’avviso. Eseguire il processo senza configurazione: uscita 2 e JSON informativo, nessun avvio audio. Verificare assenza della configurazione personale. Le prove devono funzionare senza rete né periferiche e fallire se manca un artefatto necessario; non sostituiscono le prove audio reali.

#### Details
2026-10-16: build Docker linux/amd64 e scripts/verify-docker-image.mjs sull’immagine ambrogio-satellite:release-check (ID c7081aca3a0b) PASS. Verificati import nativi, inferenza silenziosa di entrambi i modelli wake word, caricamento Silero, avviso locale, assenza della configurazione e rifiuto di avvio con uscita 2 e JSON informativo. La prova usa --network none e nessuna periferica. Arm64 NON eseguito localmente: Buildx ed emulazione assenti; il workflow li prepara e blocca la pubblicazione finché entrambe le prove non riescono. Non attestate periferiche audio reali.

#### Metadata
  * type: test-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * satisfiedBy: [verify-docker-image.mjs](../../scripts/verify-docker-image.mjs)
  * verify: [Pubblicazione delle immagini Docker del satellite](../Requirements/VoiceSatellite.md#pubblicazione-delle-immagini-docker-del-satellite)
---

### Regressione del segnale di ascolto

Alla wake word, la prova Domain e Application accerta che il tono parta quando la sessione è pronta, prima che il parlato sia ammesso. Con una risposta che attende replica, la stessa azione apre l'ascolto: il VAD resta inattivo e il timer non parte finché il bip non termina. Verificare che una risposta conclusiva non emetta il bip e che un arresto durante il segnale non riapra l'ascolto. La prova dell'adapter controlla durata, livello e uscita configurata del tono, cancellazione all'arresto e continuità dell'ascolto se la riproduzione locale fallisce.

Il 17 ottobre 2026 la suite locale ha superato 96 test, typecheck e build con il trasporto Micdrop; sul Raspberry ARM64 la persona ha confermato il bip iniziale, una risposta conclusiva senza nuovo bip e una replica dopo il bip nella stessa interazione. La prova dell'adapter va ripetuta sul trasporto `ambrogio.v1`; la verifica automatica e la dimostrazione acustica sono evidenze distinte.

#### Metadata
  * type: test-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * satisfiedBy: [voice-session.test.ts](../../test/application/voice-session.test.ts)
  * verify: [Segnale acustico di disponibilità](../Requirements/VoiceSatellite.md#segnale-acustico-di-disponibilità)
---

### Verifica della pubblicazione Docker del satellite

Ispezionare trigger, formato versione, corrispondenza package.json, dipendenza dalla CI e assenza di latest. Controllare che la pubblicazione segua le verifiche di entrambe le immagini, che il manifest riporti amd64 e arm64 e che le credenziali siano fornite dal workflow. La verifica effettiva di pubblicazione richiede una release autorizzata; nessuna release viene creata per questa preparazione.

#### Details
2026-10-16: ispezione del workflow e actionlint 1.7.12 PASS (shellcheck non disponibile). Tag validato e confrontato con package.json; job di pubblicazione dipendente dalla CI riutilizzabile; entrambe le verifiche precedono login e push; manifest controllato per amd64 e arm64. Nessun tag latest. Build e smoke amd64 locali PASS. Run GitHub, prova arm64 e pubblicazione/lettura del manifest remoto NON eseguite: richiedono pubblicazione del workflow e una release autorizzata. Nessun tag di release creato e nessuna immagine pubblicata.

#### Metadata
  * type: inspection-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * verify: [Pubblicazione delle immagini Docker del satellite](../Requirements/VoiceSatellite.md#pubblicazione-delle-immagini-docker-del-satellite)
---

