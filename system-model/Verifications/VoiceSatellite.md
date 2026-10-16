# Elements

### Verifica del satellite vocale

Organizzare le dimostrazioni operative e le ispezioni della prima versione. Le attività qui descritte sono pianificate, non eseguite; non esistono ancora evidenze di implementazione o test automatici.

#### Metadata
  * type: verification-objective
---

### Dimostrazione degli esiti e della diagnostica

Verifica pianificata; nessuna evidenza di esecuzione disponibile.

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
  * verify: [Ripristino dopo backend irraggiungibile](../Requirements/VoiceSatellite.md#ripristino-dopo-backend-irraggiungibile)
---

### Dimostrazione del trasporto Micdrop

Verifica pianificata; nessuna esecuzione o evidenza positiva è ancora disponibile.

#### Details
Con una WebSocket controllata verificare che `MicdropClient` invii `StartSpeaking`, frame PCM16 mono a 16 kHz e `StopSpeaking` soltanto dopo l'apertura della connessione. In `CONNECTING`, dopo la chiusura e durante una nuova apertura non deve inviare né riprodurre audio residuo del turno precedente. Disabilitare la riconnessione automatica, poiché una nuova connessione crea una nuova conversazione backend. Verificare il collegamento con i driver Decibri e Silero ONNX. La patch temporanea di Micdrop 3.4.0 deve proteggere gli invii in `CONNECTING` e avere una prova di regressione; riesaminare la sua necessità a ogni aggiornamento.

Contro la revisione backend di riferimento completare un'interazione e una replica: osservare `Message.metadata.expectsReply`, audio di risposta, una risposta parlata conclusiva per un turno rifiutato e la chiusura dell'interazione dopo la riproduzione. Non devono essere richiesti `Ready`, `TurnRejected` o `Played`. Conservare versioni dei pacchetti, esiti e log della prova.

#### Metadata
  * type: demonstration-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * verify: [Compatibilità con il canale vocale backend](../Requirements/VoiceSatellite.md#compatibilità-con-il-canale-vocale-backend)
  * verify: [Invio sicuro durante connessione e riconnessione](../Requirements/VoiceSatellite.md#invio-sicuro-durante-connessione-e-riconnessione)
---

### Dimostrazione della attivazione locale

Verifica pianificata; nessuna esecuzione o evidenza positiva è ancora disponibile.

#### Details
Con ogni modello distribuito dimostrare che la pipeline ONNX riconosce localmente la wake word senza servizio esterno. Prima della wake word non si apre la chiamata backend. Con soglia iniziale 0,5 e cooldown 2000 ms, misurare attivazioni corrette e spurie. Provare Hey Jarvis e Hey Mycroft su x86_64 e arm64. La voce Hey Alexa rimane fuori dal catalogo fino alla prova della frase esatta; il modello Alexa addestrato per la sola parola non basta senza evidenza. Pronunciare la wake word e la richiesta senza pausa, verificando che la riserva scorrevole di 1500 ms consegni l'inizio della richiesta dopo la connessione. Saturare la coda d'inferenza di 32 blocchi e verificare un guasto diagnostico senza crescita illimitata.

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
Avviare usando un file JSON valido selezionato con `--config` e verificare `backend.baseUrl`, modello scelto e intervallo locale di inattività. Verificare che l'URL base HTTP diventi `ws:` e HTTPS diventi `wss:`, preservando l'eventuale prefisso di percorso e aggiungendo una sola volta `/api/voice`. Omettere `audio` e verificare l'uso dei dispositivi predefiniti; poi indicare `audio.microphone` e `audio.speaker` e verificare tramite Decibri che siano usati quelli richiesti, senza ripiego silenzioso sul predefinito. Verificare il modello Hey Jarvis predefinito, un modello distribuito alternativo, il timeout predefinito di 15 secondi e un valore personalizzato. Impostare variabili d'ambiente contrastanti e verificare che non modifichino i valori. Ripetere con JSON invalido, campi sconosciuti, URL non HTTP(S), timeout non positivo, selettore audio vuoto e modello non distribuito: l’avvio operativo è impedito con errore comprensibile. Eseguire i casi sia sull’host sia nel container dopo la disponibilità delle rispettive risorse.

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

Verifica pianificata; nessuna esecuzione o evidenza positiva è ancora disponibile.

#### Details
Contro la revisione backend compatibile fissata nel contratto, riprodurre una risposta completa; parlare durante la riproduzione e verificare che non la interrompa né apra un turno. Provare `Message` Micdrop dell'assistente con `metadata.expectsReply` uguale a `true` e `false`, sia prima sia dopo la fine dell'audio: solo nel primo caso una replica senza wake word appartiene alla stessa interazione. Con audio controllato, inserire pause inferiori, uguali e superiori a 1000 ms fra i blocchi: la finestra di stabilità deve ripartire a ogni nuovo blocco e va registrato il rischio di chiusura prematura per le pause più lunghe. Provare messaggio prima del primo audio e audio prima del messaggio; Decibri deve svuotare la coda prima del completamento stimato. Se l'audio non inizia o non termina entro 60 secondi dalla fine della richiesta, chiudere senza aprire la replica.

Con metadati assenti, valore non booleano o messaggio assente, non inferire dal testo e chiudere dopo l'intervallo locale. Provare un rifiuto vocale parlato con `expectsReply: false`. Dopo inattività occorre una nuova wake word. Non è richiesto un nuovo segnale backend.

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

Verifica pianificata; nessuna evidenza di esecuzione disponibile.

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

Verifica pianificata; nessuna esecuzione o evidenza positiva è ancora disponibile.

#### Details
Su Linux x86_64 e arm64, con audio acquisito e con file di prova, usare il modello Silero ONNX incluso in Decibri 5.8.0, verificando hash e licenza. Con redemptionFrames 20 provare una richiesta continua dopo la wake word, una replica breve come «sì» e una frase con una pausa interna. Accertare che ogni turno ammesso produca un solo StartSpeaking, i frame PCM16 mono a 16 kHz e un solo StopSpeaking, senza perdere la replica breve né spezzare la frase alla pausa. Durante la riproduzione della risposta non devono partire nuovi turni. Registrare tempi di delimitazione e consumo di CPU su entrambe le architetture.

#### Metadata
  * type: demonstration-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * verify: [Delimitazione locale dei turni vocali](../Requirements/VoiceSatellite.md#delimitazione-locale-dei-turni-vocali)
---

### Ispezione dei confini interni

Verifica pianificata; nessuna evidenza di esecuzione disponibile.

#### Details
Esaminare manifest, import di produzione e di soli tipi, composition root e test. Accertare un solo progetto, assemblaggio delle porte nella composition root e rispetto della matrice di importazione nei test. I test Application devono poter usare porte simulate senza hardware.

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

### Ispezione della architettura e degli esiti

Verifica pianificata; nessuna esecuzione o evidenza positiva è ancora disponibile.

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
