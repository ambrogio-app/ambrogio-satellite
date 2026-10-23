# Elements

### Verifica del satellite vocale

Organizzare le dimostrazioni operative, le ispezioni e le prove automatiche della prima versione. Ogni verifica concreta registra il proprio metodo e i criteri con cui passa o fallisce.

#### Metadata
  * type: verification-objective
---

### Dimostrazione degli esiti e della diagnostica

#### Details
Esaminare firme Result e mapping esaustivi dei rifiuti; introdurre una nuova variante in una prova controllata e verificare che il mapping incompleto sia rilevato. Iniettare un guasto attraverso più componenti: una sola diagnosi definitiva al confine, causa originale conservata e nessun logger nei layer interni. Acquisire stdout e verificare una riga JSON per evento. Un rifiuto previsto non diventa automaticamente un log di errore e il messaggio pubblico non contiene dettagli tecnici. Non automatizzabile: nella forma attuale la prova del mapping incompleto richiede di introdurre una variante in una copia dei sorgenti e osservare il rifiuto del compilatore; una prova di tipo con `@ts-expect-error` la renderebbe automatica. Le parti ripetibili sono coperte dalla «Prova della diagnostica Pino».

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

#### Details
Rendere irraggiungibile il backend e attivare il satellite: si sente il tono di errore locale, due toni discendenti distinguibili dal bip di ascolto, nessun messaggio parlato, e il processo torna in attesa. Ripristinare il backend: senza una nuova attivazione non viene reinviata la richiesta fallita; con una nuova wake word viene tentata una nuova interazione. Ripetere con una disconnessione durante la chiamata. La prova passa se in ogni caso si sente soltanto il tono di errore e il satellite torna disponibile senza riavvio; fallisce se resta muto senza log `satellite_failure`, se pronuncia un messaggio, se reinvia la richiesta o se richiede un riavvio. Non automatizzabile: richiede di ascoltare il tono sullo speaker reale e di rendere irraggiungibile un backend installato; la logica di recupero con sessioni controllate è coperta dalle prove automatiche.

#### Metadata
  * type: demonstration-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * verify: [Nuova attivazione dopo il fallimento](../Requirements/VoiceSatellite.md#nuova-attivazione-dopo-il-fallimento)
  * verify: [Riapertura sicura dopo la chiusura vocale](../Requirements/VoiceSatellite.md#riapertura-sicura-dopo-la-chiusura-vocale)
  * verify: [Ripristino dopo backend irraggiungibile](../Requirements/VoiceSatellite.md#ripristino-dopo-backend-irraggiungibile)
  * verify: [Tono di errore per backend irraggiungibile](../Requirements/VoiceSatellite.md#tono-di-errore-per-backend-irraggiungibile)
---

### Dimostrazione del segnale di ascolto

#### Details
Con speaker e microfono reali, pronunciare la wake word configurata, attendere il bip che indica l'apertura effettiva dell'ascolto e formulare la richiesta. Verificare che la richiesta venga ricevuta. Con una risposta che attende replica, verificare che, finita la risposta, si senta lo stesso bip e che una nuova frase pronunciata dopo il bip venga ricevuta senza wake word. Ripetere dopo un altro turno e verificare l'assenza del bip dopo la risposta conclusiva. Controllare che il bip non venga acquisito come parlato, che la finestra di inattività parta dopo il bip e che un errore dello speaker non impedisca di parlare. Non automatizzabile: richiede microfono e speaker reali e l'ascolto della persona; l'ordine fra tono, VAD e finestra di inattività è coperto dalla «Regressione del segnale di ascolto».

#### Metadata
  * type: demonstration-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * verify: [Segnale acustico di disponibilità](../Requirements/VoiceSatellite.md#segnale-acustico-di-disponibilità)
---

### Dimostrazione del trasporto ambrogio.v1

#### Details
Contro la revisione backend registrata nel «Contratto vocale backend di riferimento», avviare il satellite e verificare che apra una sola sessione su `api/session` con il sottoprotocollo `ambrogio.v1`, invii `session.hello` con l'identità configurata e trasmetta soltanto dopo `session.ready`. Completare un'interazione con la wake word e una replica senza wake word: la prima richiesta non contiene `conversationId`, la replica usa il `conversationId` ricevuto in `turn.accepted`; una nuova attivazione con la wake word inizia una nuova conversazione. Verificare `input.start` audio a 16 kHz con `reply: "audio"`, frame binari con il numero `stream` big-endian e `input.end` alla fine del parlato; osservare trasmissioni audio di risposta, `turn.completed` con `expectsReply`, un turno rifiutato con il messaggio parlato e il ritorno alla wake word.

Chiudere la sessione lato backend mentre il satellite attende la wake word e verificare che la successiva attivazione la riapra senza avvisi; chiuderla durante un'interazione e verificare il recupero locale senza riprendere la richiesta sulla nuova sessione. Inviare un messaggio del server non legato a un turno con `id` e verificare `client.result` con `reason: "unsupported"`. Registrare le versioni dei pacchetti e i log della prova. Non automatizzabile: richiede il backend installato con trascrizione e sintesi reali e la voce della persona al microfono del satellite; lo scambio dei messaggi con componenti vocali deterministici è provato da `scripts/verify-pinned-backend.mjs` nella «Prova della sessione e delle conversazioni del satellite».

#### Metadata
  * type: demonstration-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * verify: [Compatibilità con il canale vocale backend](../Requirements/VoiceSatellite.md#compatibilità-con-il-canale-vocale-backend)
  * verify: [Invio soltanto su sessione pronta](../Requirements/VoiceSatellite.md#invio-soltanto-su-sessione-pronta)
  * verify: [Nuova conversazione a ogni attivazione](../Requirements/VoiceSatellite.md#nuova-conversazione-a-ogni-attivazione)
  * verify: [Sessione conversazionale persistente](../Requirements/VoiceSatellite.md#sessione-conversazionale-persistente)
---

### Dimostrazione dell'attenuazione sul dispositivo

Sull'installazione di riferimento, con il satellite in container e un player musicale che suona attraverso un dispositivo ALSA `softvol` sulla stessa uscita, pronunciare la wake word durante la riproduzione, porre una domanda e attendere la risposta; ripetere con una replica richiesta dal backend e con un'interazione conclusa per inattività. Durante ogni interazione leggere il controllo con `amixer` e ascoltare il volume della musica.

#### Details
La prova passa se la musica si abbassa prima del segnale di ascolto, resta abbassata durante il parlato e la risposta, comprese le repliche, e torna al volume precedente al ritorno in attesa della wake word, mentre la voce del satellite resta al volume pieno. Registrare architettura, hardware e versione usati, senza dati dell'installazione. Non automatizzabile: richiede un dispositivo ALSA `softvol` reale, un player in riproduzione e l'ascolto del volume della musica; la sequenza delle regolazioni è coperta dalla «Prova dell'attenuazione dell'audio locale».

#### Metadata
  * type: demonstration-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * verify: [Attenuazione dell'audio locale durante l'interazione](../Requirements/VoiceSatellite.md#attenuazione-dellaudio-locale-durante-linterazione)
---

### Dimostrazione dell'hook dei segreti

In un clone con `core.hooksPath` impostato a `.githooks`, mettere in staging un file con una credenziale fittizia nel formato di un fornitore noto e tentare il commit: il commit è bloccato e il valore non compare nell'output. Ripetere con modifiche prive di segreti: il commit riesce. Ripetere con `gitleaks` assente dal `PATH`: il commit è bloccato con il messaggio che indica installazione e attivazione. Annullare le modifiche di prova senza lasciarle nella storia.

#### Details
Non automatizzabile: nella forma attuale la prova usa il gitleaks installato nel clone e commit reali; uno script che esegua l'hook in un repository temporaneo con gitleaks 8.30.1 la renderebbe automatica.

#### Metadata
  * type: demonstration-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * verify: [Controllo dei segreti prima del commit locale](../Requirements/VoiceSatellite.md#controllo-dei-segreti-prima-del-commit-locale)
---

### Dimostrazione della attivazione locale

#### Details
Con ogni modello distribuito dimostrare che la pipeline ONNX riconosce localmente la wake word senza servizio esterno. Prima della wake word non si apre la chiamata backend. Con soglia iniziale 0,5, conferma su 2 blocchi consecutivi e cooldown 2000 ms, misurare attivazioni corrette e spurie, comprese quelle provocate da colpi di tosse e rumori impulsivi, e confrontarle con la conferma su un solo blocco. Provare Hey Jarvis, Hey Mycroft e Alexa su x86_64 e arm64. Pronunciare la wake word e la richiesta senza pausa, verificando che la riserva scorrevole di 1500 ms consegni l'inizio della richiesta dopo la connessione. Saturare la coda d'inferenza di 32 blocchi e verificare un guasto diagnostico senza crescita illimitata. Non automatizzabile: attivazioni corrette e spurie dipendono da voce, rumore e microfono reali su ciascuna architettura; la saturazione della coda e il caricamento dei modelli sono coperti anche dalle prove automatiche ONNX.

#### Metadata
  * type: demonstration-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * verify: [Ascolto locale della wake word](../Requirements/VoiceSatellite.md#ascolto-locale-della-wake-word)
  * verify: [Avvio dopo la wake word](../Requirements/VoiceSatellite.md#avvio-dopo-la-wake-word)
  * verify: [Catalogo distribuito delle wake word](../Requirements/VoiceSatellite.md#catalogo-distribuito-delle-wake-word)
  * verify: [Conferma della wake word su blocchi consecutivi](../Requirements/VoiceSatellite.md#conferma-della-wake-word-su-blocchi-consecutivi)
  * verify: [Conservazione della richiesta continua](../Requirements/VoiceSatellite.md#conservazione-della-richiesta-continua)
  * verify: [Selezione della wake word configurata](../Requirements/VoiceSatellite.md#selezione-della-wake-word-configurata)
---

### Dimostrazione della configurazione

#### Details
Avviare usando un modulo TypeScript valido selezionato con `--config` e verificare `backend.baseUrl`, identità del client, modello scelto e intervallo locale di inattività. Verificare che l'URL base HTTP diventi `ws:` e HTTPS diventi `wss:`, preservando l'eventuale prefisso di percorso e aggiungendo una sola volta `api/session`. Omettere `client` e verificare i valori predefiniti ricavati dal nome host; poi indicare `client.id` e `client.name`. Omettere `audio` e verificare l'uso dei dispositivi predefiniti; poi indicare `audio.microphone` e `audio.speaker` e verificare tramite Decibri che siano usati quelli richiesti, senza ripiego silenzioso sul predefinito. Verificare il modello Hey Jarvis predefinito, un modello distribuito alternativo, il timeout predefinito di 15 secondi e un valore personalizzato. Cambiare le variabili d'ambiente lette dal modulo e verificare che i valori validati cambino al successivo avvio. Ripetere con modulo TypeScript non importabile, campi sconosciuti, URL non HTTP(S), timeout non positivo, selettore audio vuoto, identità vuota e modello non presente nel catalogo disponibile: l’avvio operativo è impedito con errore comprensibile. Eseguire i casi sia sull’host sia nel container dopo la disponibilità delle rispettive risorse. Non automatizzabile: la selezione dei dispositivi richiede periferiche audio reali sull'host e nel container; validazione dei campi, valori predefiniti e rifiuti sono candidati a una prova automatica e in parte già coperti da `configuration.test.ts` e `diagnostics.test.ts`.

#### Metadata
  * type: demonstration-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * verify: [Configurazione TypeScript unica](../Requirements/VoiceSatellite.md#configurazione-typescript-unica)
  * verify: [Rifiuto della configurazione invalida](../Requirements/VoiceSatellite.md#rifiuto-della-configurazione-invalida)
  * verify: [Selezione dei dispositivi audio](../Requirements/VoiceSatellite.md#selezione-dei-dispositivi-audio)
  * verify: [Selezione del file di configurazione](../Requirements/VoiceSatellite.md#selezione-del-file-di-configurazione)
  * verify: [Valori di configurazione da ambiente](../Requirements/VoiceSatellite.md#valori-di-configurazione-da-ambiente)
---

### Dimostrazione della conversazione e delle repliche

#### Details
Contro la revisione backend compatibile fissata nel contratto, riprodurre una risposta completa; parlare durante la riproduzione e verificare che non la interrompa né apra un turno. Provare `turn.completed` con `expectsReply` uguale a `true` e `false`, con l'esito arrivato sia prima sia dopo la fine della riproduzione: la replica senza wake word si apre soltanto con `true`, dopo che lo speaker ha riprodotto tutte le trasmissioni chiuse da `output.end`, e appartiene alla stessa conversazione. Con una risposta in più trasmissioni e con pause lunghe nella sintesi, la conclusione non deve anticipare la fine dell'audio. Se l'esito non arriva entro 60 secondi dalla fine della richiesta, concludere con il recupero locale senza aprire la replica.

Con `expectsReply` non booleano non aprire la replica. Provare un turno rifiutato e uno fallito dopo l'ammissione: l'audio del messaggio pubblico è riprodotto e il satellite torna alla wake word. Dopo inattività occorre una nuova wake word. Non automatizzabile: la conclusione della risposta dipende dalla riproduzione effettiva sullo speaker reale e da sintesi reali con pause; le regole con sessioni e speaker controllati sono coperte dalle prove automatiche.

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

#### Details
Su host Linux x86_64 e arm64 dotati di microfono e speaker, installare ed eseguire la stessa versione sia direttamente sia in Docker; completare un’interazione vocale in ciascuna combinazione usando lo stesso schema di configurazione. Controllare che `package.json` dichiari ogni dipendenza, di esecuzione e di sviluppo, con la versione esatta risolta in `pnpm-lock.yaml`, senza intervalli di versione. Registrare sistema operativo, periferiche, versioni e dipendenze native, inclusi Decibri, `libasound.so.2`, ONNX Runtime e i file dei modelli caricati. Acquisire dal microfono e riprodurre fino alla fine una risposta sullo speaker configurato in tutte le combinazioni. Accertare che il rilevamento funzioni nel processo satellite sia su host sia nel container. Una build riuscita o una prova sotto emulazione non sostituisce la dimostrazione audio sulle due architetture. Non automatizzabile: richiede host fisici x86_64 e arm64 con microfono e speaker; la CI dispone soltanto di runner x86_64 senza periferiche audio.

#### Metadata
  * type: demonstration-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * verify: [Distribuzione Docker facoltativa](../Requirements/VoiceSatellite.md#distribuzione-docker-facoltativa)
  * verify: [Esecuzione diretta sul sistema host](../Requirements/VoiceSatellite.md#esecuzione-diretta-sul-sistema-host)
  * verify: [Supporto Linux su due architetture](../Requirements/VoiceSatellite.md#supporto-linux-su-due-architetture)
---

### Dimostrazione della protezione dei dati locali

#### Details
Durante interazioni riuscite e fallite controllare scritture su disco e log usando audio, testo e credenziali riconoscibili: non devono comparire registrazioni persistenti né contenuti o credenziali nei log. Ispezionare gli artefatti host e container e gli esempi per escludere configurazioni personali; controllare che `.dockerignore` escluda dal contesto di build i moduli e i file JSON di configurazione locali, i file d'ambiente `*.env` e `*.env.*` e `node_modules` a ogni livello, come richiede il contratto «Esecuzione host e container». Non automatizzabile: richiede di osservare le scritture su disco durante interazioni reali con audio e credenziali riconoscibili; l'assenza della configurazione personale nell'immagine è controllata da `scripts/verify-docker-image.mjs`.

#### Metadata
  * type: demonstration-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * verify: [Assenza di registrazioni audio persistenti](../Requirements/VoiceSatellite.md#assenza-di-registrazioni-audio-persistenti)
  * verify: [Esclusione delle configurazioni personali dagli artefatti](../Requirements/VoiceSatellite.md#esclusione-delle-configurazioni-personali-dagli-artefatti)
  * verify: [Selezione esplicita dei dati diagnostici](../Requirements/VoiceSatellite.md#selezione-esplicita-dei-dati-diagnostici)
---

### Dimostrazione della segmentazione vocale

#### Details
Su Linux x86_64 e arm64, con audio acquisito e con file di prova, usare il modello Silero ONNX incluso in Decibri 5.8.0, verificando hash e licenza. Con le soglie del contratto, 0,18 e 0,11, `minSpeechFrames` 4 e `redemptionFrames` 20, provare una richiesta continua dopo la wake word, una replica breve come «sì» e una frase con una pausa interna. Accertare che ogni turno ammesso produca un solo `input.start` alla conferma del parlato, la riserva e i frame PCM16 mono a 16 kHz e un solo `input.end`, senza perdere la replica breve né spezzare la frase alla pausa; un rumore breve non confermato non deve aprire una richiesta. Durante la riproduzione della risposta non devono partire nuovi turni. Registrare tempi di delimitazione e consumo di CPU su entrambe le architetture. Non automatizzabile: la delimitazione di repliche brevi e frasi con pause dipende da parlato reale, e il consumo di CPU va misurato sull'hardware di ciascuna architettura; le soglie con probabilità simulate sono coperte da `silero-vad.test.ts`.

#### Metadata
  * type: demonstration-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * verify: [Delimitazione locale dei turni vocali](../Requirements/VoiceSatellite.md#delimitazione-locale-dei-turni-vocali)
---

### Ispezione dei confini interni

Esaminare manifest, import di produzione e di soli tipi, composition root e test. Accertare un solo progetto, assemblaggio delle porte nella composition root e rispetto della matrice di importazione nei test. I test Application devono poter usare porte simulate senza hardware. Non automatizzabile: il modello non ha adottato uno strumento di analisi degli import, quindi occorre leggere gli import di ogni file di test e classificarli per layer. Candidata a una prova automatica con un controllo degli import.

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

Per ogni rinomina controllare import, export pubblici, riferimenti nei test e collegamenti Reqvire. La compilazione e i test pertinenti devono continuare a passare. Non automatizzabile: classificare un file come caso d'uso, adapter o supporto richiede di leggerne la responsabilità; il nome da solo non la determina. La presenza di una relazione `satisfiedBy` e il successo di `validate` o `lint` non sostituiscono questa ispezione.

#### Metadata
  * type: inspection-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * verify: [Nomi dei file secondo il ruolo architetturale](../Requirements/VoiceSatellite.md#nomi-dei-file-secondo-il-ruolo-architetturale)
---

### Ispezione del bootstrap della configurazione

#### Details
Usare una configurazione invalida e osservare che nessuna risorsa audio, wake word o connessione operativa viene costruita. Con configurazione valida verificare che ogni componente riceva soltanto i dati necessari e che Domain e casi d’uso non leggano file o ambiente. Non automatizzabile: stabilire quali dati sono necessari a ciascun componente richiede di leggere la composition root; l'assenza di risorse costruite con configurazione invalida è candidata a una prova automatica del processo.

#### Metadata
  * type: inspection-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * verify: [Distribuzione mirata della configurazione](../Requirements/VoiceSatellite.md#distribuzione-mirata-della-configurazione)
  * verify: [Validazione prima della costruzione delle risorse](../Requirements/VoiceSatellite.md#validazione-prima-della-costruzione-delle-risorse)
---

### Ispezione del perimetro iniziale di osservabilità

Ispezionare dipendenze, bootstrap, composition root, configurazione e logger: devono essere presenti soltanto i segnali diagnostici applicativi previsti, senza attivazione di sistemi separati di metriche, tracing distribuito o audit. Controllare che la documentazione non presenti i log come registro di audit garantito. Non automatizzabile: riconoscere un sistema di metriche, tracing o audit e il modo in cui la documentazione presenta i log richiede di leggere dipendenze, sorgenti e documenti.

#### Metadata
  * type: inspection-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * verify: [Perimetro iniziale dei segnali di osservabilità](../Requirements/VoiceSatellite.md#perimetro-iniziale-dei-segnali-di-osservabilità)
---

### Ispezione del workflow CI del satellite

Verificare eventi di attivazione, versioni, lockfile congelato, sequenza dei controlli e fallimento del job senza continue-on-error. Eseguire localmente i comandi compatibili; una prova locale non attesta un’esecuzione GitHub Actions. Per la prova remota richiedere una run del workflow sul commit pubblicato. Non automatizzabile: attesta la configurazione del workflow e l'esito di un'esecuzione GitHub Actions, che i test del repository non osservano.

#### Metadata
  * type: inspection-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * verify: [Controlli CI delle modifiche del satellite](../Requirements/VoiceSatellite.md#controlli-ci-delle-modifiche-del-satellite)
---

### Ispezione della architettura e degli esiti

#### Details
Esaminare codice, import e firme: TypeScript eseguito da Node.js; stati e regole in Domain; coordinamento e porte in Application; librerie audio, wake word e trasporto negli adapter. Per ogni esito negativo dichiarato verificare la rappresentazione tipizzata; per i guasti inattesi verificare propagazione e gestione diagnostica al confine tecnico. Accertare repository e modello autonomi con riferimento esplicito al contratto backend, senza grafi fusi. Controllare che il lessico e l'ontologia locali definiscano i termini e le relazioni essenziali senza dipendere dal modello backend, che i riferimenti ai concetti risolvano e che le esportazioni semantiche e la validazione Reqvire abbiano esito corretto. Non automatizzabile: attribuire stati, regole e integrazioni al layer corretto e giudicare l'autonomia del lessico richiede di leggere codice e modello.

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
Inventariare tutte le dichiarazioni Application, incluse capacità restituite e callable. Passa se le porte a oggetto sono interface e dati, unioni e callable usano type o firme callable inline, senza cambiare operazioni o significato. Verificare anche le dichiarazioni generate, typecheck completo e core, build e suite esistente. Non aggiungere test che controllano soltanto la parola interface. Non automatizzabile: distinguere una porta a oggetto da dati o callable richiede di leggerne la responsabilità.

#### Metadata
  * type: inspection-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * verify: [Forma TypeScript dei contratti Application](../Requirements/VoiceSatellite.md#forma-typescript-dei-contratti-application)
---

### Ispezione della protezione del merge

Leggere con `gh api repos/<proprietario>/<repository>/rulesets` e con il dettaglio del ruleset `main` le regole attive sul branch principale.

#### Details
L'ispezione passa se il ruleset corrisponde al contratto: applicazione attiva sul branch predefinito, nessun attore escluso, integrazione solo tramite pull request, controlli richiesti con i nomi del contratto, riscrittura forzata e cancellazione vietate; e se un push diretto sul branch principale viene rifiutato. Fallisce se il ruleset manca, è disattivato, ha attori esclusi o differisce dal contratto. Non automatizzabile: il ruleset è un'impostazione del repository GitHub e non un file del repository, e leggerlo richiede credenziali con accesso amministrativo che la CI non possiede.

#### Metadata
  * type: inspection-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * verify: [Controlli obbligatori prima del merge](../Requirements/VoiceSatellite.md#controlli-obbligatori-prima-del-merge)
---

### Ispezione della raccolta esterna dei log

Ispezionare costruzione del logger, call site, configurazione, dipendenze e avvio container: nessuna destinazione file o remota applicativa, nessun meccanismo di rotazione interno, nessun servizio di logging richiesto per avviare il satellite. Verificare che la documentazione assegni conservazione, rotazione e inoltro all’installazione. Non automatizzabile: richiede di leggere call site, dipendenze e documentazione per escludere destinazioni e meccanismi di raccolta.

#### Metadata
  * type: inspection-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * verify: [Gestione dei log affidata al deployment](../Requirements/VoiceSatellite.md#gestione-dei-log-affidata-al-deployment)
---

### Ispezione della scansione dei segreti in CI

Verificare in `.github/workflows/secret-scan.yml` gli eventi di attivazione (push su ogni branch, pull request, richiesta manuale, chiamata da altri workflow), il checkout fissato per commit con l'intera storia e senza credenziali conservate, il download di gitleaks 8.30.1 con verifica dello SHA-256 prima dell'estrazione, il comando `gitleaks git --redact --no-banner --exit-code 1 .`, i permessi di sola lettura e l'assenza di continue-on-error. Verificare che `publish-image.yml` richiami il workflow e che il job di pubblicazione dipenda sia dai controlli CI sia dalla scansione. Eseguire localmente la stessa scansione sulla storia del repository; una prova locale non attesta un'esecuzione GitHub Actions, per la quale serve una run del workflow sul commit pubblicato. Non automatizzabile: attesta la configurazione dei workflow e l'esito di esecuzioni GitHub Actions, che i test del repository non osservano.

#### Metadata
  * type: inspection-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * verify: [Scansione dei segreti nella storia del repository](../Requirements/VoiceSatellite.md#scansione-dei-segreti-nella-storia-del-repository)
  * verify: [Scansione dei segreti prima della pubblicazione](../Requirements/VoiceSatellite.md#scansione-dei-segreti-prima-della-pubblicazione)
---

### Ispezione delle decisioni sostituite

Durante la revisione di ogni modifica che registra una decisione in sostituzione di un'altra, cercare nel modello gli elementi che affermano la decisione sostituita, con `change-impact` e con una ricerca testuale dei suoi termini chiave.

#### Details
L'ispezione passa se, dopo la modifica, nessun requisito, contratto o verifica afferma ancora la decisione sostituita. Fallisce se un elemento la afferma ancora. Non automatizzabile: riconoscere che un testo afferma una decisione sostituita richiede di leggerlo; lo script copre soltanto date e formule di storia.

#### Metadata
  * type: inspection-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * verify: [Decisioni sostituite rimosse nella stessa modifica](../Requirements/VoiceSatellite.md#decisioni-sostituite-rimosse-nella-stessa-modifica)
---

### Ispezione delle dipendenze fra contratti

Durante la revisione di ogni modifica che aggiunge o modifica un contratto, leggere il contratto e i contratti dei requisiti da cui dipende, ed eseguire `change-impact` sulla modifica.

#### Details
L'ispezione passa se il contratto afferma soltanto la decisione del proprio requisito e ogni dipendenza da un contratto posseduto da un altro requisito è dichiarata come Contract Reference dal requisito proprietario del contratto dipendente, così che `change-impact` la segnali. Fallisce se un contratto ripete contenuto posseduto da un altro requisito o se una dipendenza non è dichiarata. Non automatizzabile: stabilire se due testi affermano lo stesso fatto richiede di leggerli.

#### Metadata
  * type: inspection-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * verify: [Dipendenze fra contratti dichiarate come riferimenti](../Requirements/VoiceSatellite.md#dipendenze-fra-contratti-dichiarate-come-riferimenti)
---

### Ispezione delle licenze dei modelli distribuiti

#### Details
Per ogni modello presente nel catalogo confrontare file, origine, versione, licenza, condizioni di redistribuzione e attribuzioni con le fonti del titolare. Verificare che le informazioni necessarie accompagnino sia il pacchetto host sia l'immagine container e che la licenza del codice sia presentata separatamente. Fallire l'ispezione se un modello distribuito non ha condizioni verificabili o manca una delle informazioni richieste. Non automatizzabile: richiede di confrontare licenze e condizioni di redistribuzione con le fonti dei titolari.

#### Metadata
  * type: inspection-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * verify: [Condizioni di distribuzione dei modelli wake word](../Requirements/VoiceSatellite.md#condizioni-di-distribuzione-dei-modelli-wake-word)
---

### Ispezione delle protezioni dei workflow

Esaminare `.github/workflows/ci.yml`, `.github/workflows/secret-scan.yml` e `.github/workflows/publish-image.yml` e confrontarli con il contratto «Protezioni dei workflow GitHub Actions»: azioni esterne fissate per SHA e corrispondenti alla versione in commento, `persist-credentials: false` in ogni checkout, `package-manager-cache: false`, `timeout-minutes` di ogni job, permessi predefiniti `contents: read`, `packages: write` soltanto nel job `publish`, `workflow_call` nei workflow riutilizzati, gruppo di concorrenza, login con stdin e logout incondizionato.

#### Details
L'ispezione passa se ogni workflow corrisponde al contratto e nessun job riceve permessi di scrittura diversi da `packages: write` nel job `publish`. Fallisce se un'azione è indicata per tag, se lo SHA non corrisponde alla versione dichiarata, se un checkout conserva le credenziali o se un job non ha tempo massimo. Non automatizzabile: stabilire che lo SHA fissato corrisponde alla versione dichiarata dell'azione e che i permessi concessi sono i minimi necessari richiede di confrontare i workflow con i repository e la documentazione delle azioni; l'effetto dei permessi si osserva soltanto nelle esecuzioni GitHub Actions.

#### Metadata
  * type: inspection-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * verify: [Privilegi e durata limitati dei workflow GitHub Actions](../Requirements/VoiceSatellite.md#privilegi-e-durata-limitati-dei-workflow-github-actions)
---

### Prova degli eventi tardivi dopo la fine dell'interazione

Con una sessione controllata, concludere un'interazione per risposta conclusiva, per scadenza dell'esito e per perdita della sessione; poi consegnare trasmissioni, frame audio, esiti e un evento di chiusura appartenenti alla richiesta o alla sessione precedente mentre il satellite ha già riaperto l'ascolto o avviato una nuova interazione.

#### Details
La prova passa se gli eventi tardivi non interrompono l'acquisizione del microfono, non vengono riprodotti e non sono attribuiti alla nuova interazione, e se l'evento di chiusura della sessione corrente conserva la gestione ordinaria. Fallisce se un esito o un frame della richiesta precedente apre una replica, chiude la nuova interazione o arresta l'ascolto.

#### Metadata
  * type: test-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * satisfiedBy: [conversation-events.test.ts](../../test/adapters/in/conversation-events.test.ts)
  * satisfiedBy: [conversation-channel.test.ts](../../test/adapters/out/conversation-channel.test.ts)
  * verify: [Riapertura sicura dopo la chiusura vocale](../Requirements/VoiceSatellite.md#riapertura-sicura-dopo-la-chiusura-vocale)
---

### Prova del catalogo wake word montato

Preparare una directory di modelli con le risorse comuni openWakeWord e un classificatore compatibile chiamato `personalizzato.onnx`. Montarla in sola lettura su `/app/models/wakeword` nell'immagine satellite, scegliere `wakeWord.model: "personalizzato"` e caricare il classificatore. Provare anche identificatori inesistenti, nomi dei modelli comuni e tentativi di attraversamento della directory.

#### Details
La prova passa se il modello personalizzato è scoperto e caricato dal mount senza ricostruire l'immagine, le wake word distribuite continuano a funzionare senza mount e i nomi assenti o non sicuri sono rifiutati. Fallisce se il mount è ignorato, la configurazione accetta un percorso fuori directory o un modello comune come classificatore. La prova non dimostra l'accuratezza acustica di un modello personalizzato.

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
Iniettare risorse controllate e fallimenti: durante ascolto, chiamata e riproduzione, l'arresto deve bloccare nuovi eventi e interrompere i dispositivi senza attendere una risposta. Chiamare stop ripetutamente e in parallelo: una sola chiusura nativa per risorsa, stesso esito. Far fallire una chiusura: tutte le altre devono essere tentate e l'errore originale deve restare disponibile. Fallire l'avvio dopo acquisizioni parziali e interrompere un'acquisizione pendente: tutte le risorse ottenute devono essere rilasciate. Provare rilascio ONNX parziale e inferenza in corso, cancellazione del tono di errore e SIGINT/SIGTERM nel confine di processo. I test automatici usano risorse simulate; non attestano periferiche reali.

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

#### Metadata
  * type: test-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * satisfiedBy: [voice-session.test.ts](../../test/application/voice-session.test.ts)
  * verify: [Contratti Application indipendenti dal Domain](../Requirements/VoiceSatellite.md#contratti-application-indipendenti-dal-domain)
---

### Prova del tono di errore per voce non disponibile

Con una sessione controllata, rispondere a un turno vocale con una trasmissione testuale seguita da `turn.rejected` con `reason: "audio_unavailable"`; ripetere con una trasmissione testuale in un turno ammesso.

#### Details
La prova passa se il satellite non tenta di pronunciare il testo, registra `satellite_voice_unavailable`, riproduce sullo speaker configurato i campioni del tono di errore locale al posto della trasmissione, non apre una replica e torna in attesa della wake word, senza reinviare la richiesta. Fallisce se il satellite resta in attesa, apre una replica, riproduce campioni diversi dal tono di errore o non registra l'evento.

#### Metadata
  * type: test-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * satisfiedBy: [response-playback.test.ts](../../test/adapters/out/response-playback.test.ts)
  * verify: [Tono di errore per voce non disponibile](../Requirements/VoiceSatellite.md#tono-di-errore-per-voce-non-disponibile)
---

### Prova del tono locale di errore

Generare i campioni del tono di errore e del segnale di ascolto e confrontarli. Con l'adapter della chiamata e uno speaker controllato, provocare il fallimento di un'interazione; ripetere con una riproduzione che fallisce e con un arresto durante il tono.

#### Details
La prova passa se il tono di errore è PCM16 mono a 16 kHz di 5600 campioni (350 ms): 2400 campioni a 660 Hz, 800 campioni di silenzio, 2400 campioni a 440 Hz, con picco non superiore a 0,18 del fondo scala e bordi di ciascun tono a zero; se differisce dal segnale di ascolto per durata e campioni; se al fallimento dell'interazione viene registrato `satellite_failure` e lo speaker configurato riceve esattamente quei campioni; se una riproduzione fallita registra `satellite_error_tone_failed` senza interrompere il recupero; e se l'arresto annulla il tono senza un nuovo evento di guasto. Fallisce se manca il tono, se i campioni o la durata differiscono, se il tono coincide con il segnale di ascolto o se il guasto di riproduzione blocca il ritorno in attesa.

#### Metadata
  * type: test-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * satisfiedBy: [local-tones.test.ts](../../test/adapters/out/local-tones.test.ts)
  * verify: [Tono di errore per backend irraggiungibile](../Requirements/VoiceSatellite.md#tono-di-errore-per-backend-irraggiungibile)
---

### Prova dell'attenuazione dell'audio locale

Con una porta di attenuazione registrata nei test, avviare il satellite con e senza `audio.attenuation`, riconoscere la wake word e concludere l'interazione dopo la risposta, dopo una replica richiesta dal backend, per inattività, per backend irraggiungibile e per perdita della sessione; arrestare poi il processo. Con un esecutore di processi registrato, provare l'adapter `amixer` con esito riuscito, controllo inesistente, codice di uscita diverso da zero e scadenza del tempo massimo. Validare la configurazione con valori corretti, campi mancanti, `level` fuori da 0-100 e campi non previsti.

#### Details
La prova passa se senza configurazione non avviene alcuna regolazione; se con la configurazione il satellite porta il controllo al 100% all'avvio, al livello configurato alla wake word prima del segnale acustico di disponibilità e di nuovo al 100% al ritorno in attesa della wake word in ogni conclusione, mantenendolo attenuato durante le repliche; se lo porta al 100% durante l'arresto controllato; se l'adapter esegue `amixer -D <device> -q sset <control> <livello>%` senza shell; se il controllo inesistente non produce eventi di guasto mentre gli altri errori e la scadenza producono `satellite_attenuation_failed` senza interrompere l'interazione o l'attesa; e se la configurazione invalida è rifiutata prima dell'avvio operativo.

#### Metadata
  * type: test-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * satisfiedBy: [amixer-attenuation.test.ts](../../test/adapters/out/amixer-attenuation.test.ts)
  * satisfiedBy: [configuration.test.ts](../../test/adapters/out/configuration.test.ts)
  * satisfiedBy: [voice-session-attenuation.test.ts](../../test/application/voice-session-attenuation.test.ts)
  * verify: [Attenuazione dell'audio locale durante l'interazione](../Requirements/VoiceSatellite.md#attenuazione-dellaudio-locale-durante-linterazione)
  * verify: [Interazione indipendente dall'attenuazione](../Requirements/VoiceSatellite.md#interazione-indipendente-dallattenuazione)
  * verify: [Ripristino dell'attenuazione all'avvio e all'arresto](../Requirements/VoiceSatellite.md#ripristino-dellattenuazione-allavvio-e-allarresto)
---

### Prova dell'evento di attivazione locale

Acquisire la riga reale di Pino prodotta dal rilevamento: livello `info`, `event: "satellite_wake_detected"`, `score` arrotondato a tre decimali e `chunks` intero, con le sole chiavi `level`, `time`, `event`, `score` e `chunks`. Con sessioni ONNX simulate, il riconoscitore consegna al rilevamento il punteggio e il numero di blocchi consecutivi sopra soglia; la composition root registra l'evento e poi inoltra l'attivazione alla sessione vocale.

#### Metadata
  * type: test-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * satisfiedBy: [diagnostics.test.ts](../../test/adapters/out/diagnostics.test.ts)
  * satisfiedBy: [onnx-lifecycle.test.ts](../../test/adapters/out/onnx-lifecycle.test.ts)
  * satisfiedBy: [satellite-lifecycle.test.ts](../../test/composition/satellite-lifecycle.test.ts)
  * verify: [Registrazione delle attivazioni locali](../Requirements/VoiceSatellite.md#registrazione-delle-attivazioni-locali)
---

### Prova dell'evento di configurazione rifiutata

Acquisire le righe reali di Pino prodotte dal rifiuto della configurazione. Per un file assente o illeggibile: una sola riga `info` con `event: "invalid_configuration"` e `reason: "configuration_unavailable"`, senza `field`. Per modulo TypeScript non importabile, sezione sconosciuta e per ciascun campo invalido (`backend.baseUrl`, `client.id`, `client.name`, `audio.microphone`, `audio.speaker`, `audio.attenuation`, `wakeWord.model`, `wakeWord.threshold`, `wakeWord.patience`, `interaction.replyTimeoutMs`): `reason: "invalid_configuration"` e il `field` atteso, `config` per modulo non importabile o sezione non prevista. Le righe non contengono valori del file, percorsi né `err`, e hanno soltanto le chiavi `level`, `time`, `event`, `reason` ed eventualmente `field`. Avviando il processo compilato con un file invalido, l'uscita è 2 e la riga è quella attesa.

#### Metadata
  * type: test-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * satisfiedBy: [diagnostics.test.ts](../../test/adapters/out/diagnostics.test.ts)
  * verify: [Rifiuto della configurazione invalida](../Requirements/VoiceSatellite.md#rifiuto-della-configurazione-invalida)
---

### Prova dell'identità del satellite nella sessione

Con una sessione controllata, avviare il satellite senza sezione `client`, poi con `client.id` e `client.name`, e osservare `session.hello`. Ripetere con valori vuoti o di tipo diverso.

#### Details
La prova passa se senza configurazione `clientId` vale `satellite-<nome host>` e `name` vale il nome host, se i valori configurati li sostituiscono e se valori vuoti o di tipo diverso rendono invalida la configurazione prima dell'avvio operativo. Fallisce se il satellite apre una sessione con un identificativo vuoto o diverso da quello configurato.

#### Metadata
  * type: test-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * satisfiedBy: [configuration.test.ts](../../test/adapters/out/configuration.test.ts)
  * satisfiedBy: [conversation-channel.test.ts](../../test/adapters/out/conversation-channel.test.ts)
  * verify: [Identificazione del satellite nella sessione](../Requirements/VoiceSatellite.md#identificazione-del-satellite-nella-sessione)
---

### Prova dell'integrità del modello

Eseguire `node scripts/check-model.mjs` nella radice del repository, come fa la CI dopo la validazione e il lint del modello.

#### Details
La prova passa se lo script non segnala storia delle decisioni, formule non normative, verifiche manuali senza «Non automatizzabile:» né file di governo non riferiti dal modello, e termina con stato 0. Fallisce se lo script segnala una violazione o non riesce a eseguire.

#### Metadata
  * type: test-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * satisfiedBy: [check-model.mjs](../../scripts/check-model.mjs)
  * verify: [Controllo automatico dell'integrità del modello](../Requirements/VoiceSatellite.md#controllo-automatico-dellintegrità-del-modello)
  * verify: [Decisioni sostituite rimosse nella stessa modifica](../Requirements/VoiceSatellite.md#decisioni-sostituite-rimosse-nella-stessa-modifica)
  * verify: [File di governo collegati al modello](../Requirements/VoiceSatellite.md#file-di-governo-collegati-al-modello)
  * verify: [Formulazione normativa degli obblighi](../Requirements/VoiceSatellite.md#formulazione-normativa-degli-obblighi)
  * verify: [Verifiche manuali giustificate](../Requirements/VoiceSatellite.md#verifiche-manuali-giustificate)
---

### Prova della conferma su blocchi consecutivi

Con sessioni ONNX simulate che restituiscono una sequenza controllata di punteggi del classificatore, uno per blocco da 80 ms, e soglia 0,5: con `patience` 2 un solo blocco sopra soglia seguito da uno sotto soglia non produce rilevamenti; due blocchi consecutivi sopra soglia producono un solo rilevamento, sul secondo blocco; due blocchi sopra soglia separati da uno sotto soglia non producono rilevamenti; con `patience` 1 un solo blocco sopra soglia produce un rilevamento. Dopo l'azzeramento della pipeline un blocco sopra soglia non completa un conteggio iniziato prima. Opzioni con `patience` non intero o minore di 1 sono rifiutate all'apertura. La configurazione senza `wakeWord.patience` produce il valore 2, accetta 1 e 10 e rifiuta 0, 11, valori non interi e stringhe con `field: "wakeWord.patience"`; la composition root passa il valore configurato al riconoscitore.

#### Details
La prova usa punteggi simulati: non misura attivazioni spurie né parole mancate con il microfono reale, affidate alla «Dimostrazione della attivazione locale».

#### Metadata
  * type: test-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * satisfiedBy: [configuration.test.ts](../../test/adapters/out/configuration.test.ts)
  * satisfiedBy: [onnx-lifecycle.test.ts](../../test/adapters/out/onnx-lifecycle.test.ts)
  * satisfiedBy: [satellite-lifecycle.test.ts](../../test/composition/satellite-lifecycle.test.ts)
  * verify: [Conferma della wake word su blocchi consecutivi](../Requirements/VoiceSatellite.md#conferma-della-wake-word-su-blocchi-consecutivi)
---

### Prova della diagnostica Pino

Acquisire le righe reali di Pino: JSON, event stabili, nessun dato sensibile da message, name, stack, code, cause o proprietà aggiuntive. Controllare identità e immutabilità degli originali, valori lanciati non Error, cause cicliche, getter e aggregati. Iniettare un guasto di interazione e uno di riproduzione del tono di errore: un evento distinto per ciascun guasto e tono di errore indipendente dalla diagnosi. Verificare avvio e rifiuti di configurazione senza log automatici di errore. Con il trasporto `ambrogio.v1`, verificare che nessun componente emetta su console messaggi ricevuti o errori grezzi fuori dal logger applicativo.

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

### Prova della selezione dei dispositivi audio

Con Decibri sostituito da aperture controllate, aprire il microfono e lo speaker senza selettore, con un selettore che inizia con `alsa:` e con un selettore per nome; poi far fallire l'apertura del dispositivo selezionato. Con risorse controllate, far fallire l'avvio del microfono durante l'avvio del satellite e la riproduzione di una trasmissione sullo speaker.

#### Details
La prova passa se senza selettore l'apertura non indica alcun dispositivo, così che Decibri usi il predefinito del sistema; se un selettore `alsa:` è passato come identificatore `{ id }` e un altro selettore come nome; se un'apertura fallita del dispositivo selezionato è tentata una sola volta e ne propaga l'errore senza una seconda apertura sul dispositivo predefinito; se il fallimento del microfono all'avvio rilascia le risorse acquisite e fa fallire l'avvio; e se il fallimento dello speaker è segnalato come guasto dell'interazione. Fallisce se una selezione esplicita viene ignorata o sostituita dal dispositivo predefinito. La prova non dimostra la selezione su periferiche reali, affidata alla «Dimostrazione della configurazione».

#### Metadata
  * type: test-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * satisfiedBy: [decibri-audio.test.ts](../../test/adapters/out/decibri-audio.test.ts)
  * satisfiedBy: [response-playback.test.ts](../../test/adapters/out/response-playback.test.ts)
  * satisfiedBy: [satellite-lifecycle.test.ts](../../test/composition/satellite-lifecycle.test.ts)
  * verify: [Selezione dei dispositivi audio](../Requirements/VoiceSatellite.md#selezione-dei-dispositivi-audio)
---

### Prova della sessione e delle conversazioni del satellite

Con un backend `ambrogio.v1` controllato, avviare il satellite e completare due attivazioni con la wake word e una replica senza wake word; chiudere la sessione lato backend mentre il satellite attende la wake word e durante un'interazione; ritardare `session.ready`.

#### Details
La prova passa se all'avvio esiste una sola sessione pronta, se ogni attivazione con la wake word apre una richiesta senza `conversationId` e la replica usa il `conversationId` di `turn.accepted`, se nessun messaggio o frame è inviato prima di `session.ready`, se la sessione chiusa durante l'attesa viene riaperta alla successiva attivazione senza avvisi e se la chiusura durante un'interazione produce il recupero locale senza riprendere la richiesta sulla nuova sessione. Fallisce se una richiesta, una trasmissione o un turno vengono ripresi su una sessione diversa da quella in cui sono iniziati.

#### Metadata
  * type: test-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * satisfiedBy: [verify-pinned-backend.mjs](../../scripts/verify-pinned-backend.mjs)
  * satisfiedBy: [conversation-channel.test.ts](../../test/adapters/out/conversation-channel.test.ts)
  * verify: [Invio soltanto su sessione pronta](../Requirements/VoiceSatellite.md#invio-soltanto-su-sessione-pronta)
  * verify: [Nuova conversazione a ogni attivazione](../Requirements/VoiceSatellite.md#nuova-conversazione-a-ogni-attivazione)
  * verify: [Sessione conversazionale persistente](../Requirements/VoiceSatellite.md#sessione-conversazionale-persistente)
---

### Prova delle scadenze indipendenti dal runtime

#### Details
Con una porta controllata verificare scadenza della risposta e della replica ai limiti concordati, cancellazione alla replica, sostituzione dopo un nuovo turno, arresto e guasto senza callback residui. I test Application non devono usare fake timer globali né importare l'adapter Node.js. Provare separatamente l'adapter: esecuzione singola differita, cancellazione ripetuta e cancellazione dopo esecuzione. Riesaminare tutti i file Domain e Application, inclusi import di soli tipi, per escludere API e tipi dell'ambiente; eseguire compilazione e regressione.

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

Su ciascuna immagine verificare architettura, import delle dipendenze native Decibri e ONNX, caricamento e inferenza silenziosa dei modelli wake word distribuiti, caricamento Silero e generazione del tono di errore. Eseguire il processo senza configurazione: uscita 2 e JSON informativo, nessun avvio audio. Verificare assenza della configurazione personale e le etichette dell'immagine: `org.opencontainers.image.source` con l'URL del repository e `org.opencontainers.image.licenses` con `MIT`. Le prove devono funzionare senza rete né periferiche e fallire se manca un artefatto necessario; non sostituiscono le prove audio reali.

#### Metadata
  * type: test-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * satisfiedBy: [verify-docker-image.mjs](../../scripts/verify-docker-image.mjs)
  * verify: [Distribuzione Docker facoltativa](../Requirements/VoiceSatellite.md#distribuzione-docker-facoltativa)
  * verify: [Pubblicazione delle immagini Docker del satellite](../Requirements/VoiceSatellite.md#pubblicazione-delle-immagini-docker-del-satellite)
---

### Regressione del segnale di ascolto

Alla wake word, la prova Domain e Application accerta che il tono parta quando la sessione è pronta, prima che il parlato sia ammesso. Con una risposta che attende replica, la stessa azione apre l'ascolto: il VAD resta inattivo e il timer non parte finché il bip non termina. Verificare che una risposta conclusiva non emetta il bip e che un arresto durante il segnale non riapra l'ascolto. La prova dell'adapter controlla durata, livello e uscita configurata del tono, cancellazione all'arresto e continuità dell'ascolto se la riproduzione locale fallisce.

#### Metadata
  * type: test-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * satisfiedBy: [voice-session.test.ts](../../test/application/voice-session.test.ts)
  * verify: [Segnale acustico di disponibilità](../Requirements/VoiceSatellite.md#segnale-acustico-di-disponibilità)
---

### Verifica della pubblicazione Docker del satellite

Ispezionare trigger, formato versione, corrispondenza package.json, dipendenza dalla CI e assenza di latest. Controllare che la pubblicazione segua le verifiche di entrambe le immagini, che il manifest riporti amd64 e arm64 e che le credenziali siano fornite dal workflow. La verifica effettiva di pubblicazione richiede una release autorizzata. Non automatizzabile: la pubblicazione avviene soltanto al push di un tag di release e il manifest remoto si legge nel registro GHCR, fuori dai test del repository.

#### Metadata
  * type: inspection-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * verify: [Pubblicazione delle immagini Docker del satellite](../Requirements/VoiceSatellite.md#pubblicazione-delle-immagini-docker-del-satellite)
---

