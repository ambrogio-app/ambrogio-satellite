# Elements

### Verifica del satellite vocale

Organizzare le dimostrazioni operative, le ispezioni e le prove automatiche della prima versione. Ogni verifica concreta registra il proprio metodo e i criteri con cui passa o fallisce.

#### Metadata
  * type: verification-objective
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
Contro il backend affiancato nella cartella di lavoro, installato con trascrizione e sintesi reali, avviare il satellite e verificare che apra una sola sessione su `api/session` con il sottoprotocollo `ambrogio.v1`, invii `session.hello` con l'identità configurata e trasmetta soltanto dopo `session.ready`. Completare un'interazione con la wake word e una replica senza wake word: la prima richiesta non contiene `conversationId`, la replica usa il `conversationId` ricevuto in `turn.accepted`; una nuova attivazione con la wake word inizia una nuova conversazione. Verificare `input.start` audio a 16 kHz con `reply: "audio"`, frame binari con il numero `stream` big-endian e `input.end` alla fine del parlato; osservare trasmissioni audio di risposta, `turn.completed` con `expectsReply`, un turno rifiutato con il messaggio parlato e il ritorno alla wake word.

Chiudere la sessione lato backend mentre il satellite attende la wake word e verificare che la successiva attivazione la riapra senza avvisi; chiuderla durante un'interazione e verificare il recupero locale senza riprendere la richiesta sulla nuova sessione. Inviare un messaggio del server non legato a un turno con `id` e verificare `client.result` con `reason: "unsupported"`. Registrare il commit del backend, le versioni dei pacchetti e i log della prova nell'evidenza. Non automatizzabile: richiede il backend installato con trascrizione e sintesi reali e la voce della persona al microfono del satellite; lo scambio dei messaggi con componenti vocali deterministici è provato dalla «Prova della sessione e delle conversazioni del satellite».

#### Metadata
  * type: demonstration-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * verify: [Invio soltanto su sessione pronta](../Requirements/VoiceSatellite.md#invio-soltanto-su-sessione-pronta)
  * verify: [Nuova conversazione a ogni attivazione](../Requirements/VoiceSatellite.md#nuova-conversazione-a-ogni-attivazione)
  * verify: [Sessione conversazionale persistente](../Requirements/VoiceSatellite.md#sessione-conversazionale-persistente)
  * verify: [Uso delle sole interfacce pubbliche del backend nel satellite](../Requirements/VoiceSatellite.md#uso-delle-sole-interfacce-pubbliche-del-backend-nel-satellite)
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

### Dimostrazione della attivazione locale

#### Details
Su Linux x86_64 e arm64, con ciascun modello distribuito (Hey Jarvis, Hey Mycroft e Alexa) e microfono reale, pronunciare la wake word e verificare che la pipeline ONNX la riconosca localmente senza servizio esterno e che prima della wake word non si apra alcuna chiamata backend. Pronunciare la wake word e la richiesta senza pausa e verificare che la riserva scorrevole di 1500 ms consegni l'inizio della richiesta dopo la connessione. Saturare la coda d'inferenza di 32 blocchi e verificare un guasto diagnostico senza crescita illimitata. La prova passa se ogni modello attiva il satellite senza servizi esterni, se nessuna chiamata backend precede la wake word, se l'inizio della richiesta arriva al backend e se la coda satura produce un guasto diagnostico; fallisce altrimenti. La prova non misura l'accuratezza del riconoscimento: attivazioni corrette e spurie dipendono dal modello e dalla soglia scelti da chi installa. Non automatizzabile: richiede la voce della persona al microfono reale su ciascuna architettura; la saturazione della coda e il caricamento dei modelli sono coperti anche dalle prove automatiche ONNX.

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

#### Details
Sull'host e nel container, con microfono e speaker reali, avviare con `AMBROGIO_MICROPHONE` e `AMBROGIO_SPEAKER` impostati e verificare tramite Decibri che siano usati i dispositivi richiesti, senza ripiego silenzioso sul predefinito; poi omettere le due variabili e verificare l'uso dei dispositivi predefiniti; infine avviare in entrambe le modalità con una variabile invalida. La prova passa se in entrambe le modalità i dispositivi usati sono quelli selezionati o, senza selettori, i predefiniti, e se la variabile invalida impedisce l'avvio operativo con l'errore comprensibile del contratto; fallisce se una selezione esplicita è ignorata o sostituita dal predefinito o se il significato della configurazione differisce fra host e container. Non automatizzabile: la selezione dei dispositivi richiede periferiche audio reali sull'host e nel container; validazione dei campi, valori predefiniti e rifiuti sono coperti dalla «Prova della configurazione del satellite».

#### Metadata
  * type: demonstration-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * verify: [Configurazione del satellite dalle variabili d'ambiente](../Requirements/VoiceSatellite.md#configurazione-del-satellite-dalle-variabili-dambiente)
  * verify: [Selezione dei dispositivi audio](../Requirements/VoiceSatellite.md#selezione-dei-dispositivi-audio)
---

### Dimostrazione della conversazione e delle repliche

#### Details
Contro il backend affiancato nella cartella di lavoro, riprodurre una risposta completa; parlare durante la riproduzione e verificare che non la interrompa né apra un turno. Provare `turn.completed` con `expectsReply` uguale a `true` e `false`, con l'esito arrivato sia prima sia dopo la fine della riproduzione: la replica senza wake word si apre soltanto con `true`, dopo che lo speaker ha riprodotto tutte le trasmissioni chiuse da `output.end`, e appartiene alla stessa conversazione. Con una risposta in più trasmissioni e con pause lunghe nella sintesi, la conclusione non deve anticipare la fine dell'audio. Se l'esito non arriva entro 60 secondi dalla fine della richiesta, concludere con il recupero locale senza aprire la replica.

Con `expectsReply` non booleano non aprire la replica. Provare un turno rifiutato e uno fallito dopo l'ammissione: l'audio del messaggio pubblico è riprodotto e il satellite torna alla wake word. Dopo inattività occorre una nuova wake word. Non automatizzabile: la conclusione della risposta dipende dalla riproduzione effettiva sullo speaker reale e da sintesi reali con pause; le regole con sessioni e speaker controllati sono coperte dalle prove automatiche.

#### Metadata
  * type: demonstration-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * verify: [Attesa della fine della risposta](../Requirements/VoiceSatellite.md#attesa-della-fine-della-risposta)
  * verify: [Replica richiesta dal backend](../Requirements/VoiceSatellite.md#replica-richiesta-dal-backend)
  * verify: [Riproduzione della risposta vocale](../Requirements/VoiceSatellite.md#riproduzione-della-risposta-vocale)
  * verify: [Ritorno alla wake word dopo la risposta](../Requirements/VoiceSatellite.md#ritorno-alla-wake-word-dopo-la-risposta)
  * verify: [Ritorno alla wake word per inattività](../Requirements/VoiceSatellite.md#ritorno-alla-wake-word-per-inattività)
  * verify: [Uso delle sole interfacce pubbliche del backend nel satellite](../Requirements/VoiceSatellite.md#uso-delle-sole-interfacce-pubbliche-del-backend-nel-satellite)
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
Durante interazioni riuscite e fallite controllare scritture su disco e log usando audio, testo e credenziali riconoscibili: non devono comparire registrazioni persistenti né contenuti o credenziali nei log. Ispezionare gli artefatti host e container e gli esempi per escludere configurazioni personali; controllare che `.dockerignore` escluda dal contesto di build i file d'ambiente `.env`, `*.env` e `*.env.*` e `node_modules` a ogni livello, come richiede il contratto «Esecuzione host e container». Non automatizzabile: richiede di osservare le scritture su disco durante interazioni reali con audio e credenziali riconoscibili; l'assenza della configurazione personale nell'immagine è controllata da `scripts/verify-docker-image.mjs`.

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
Su Linux x86_64 e arm64, con audio acquisito e con file di prova, usare il modello Silero ONNX incluso in Decibri 5.8.0, verificando hash e licenza. Con le soglie del contratto, 0,18 e 0,11, `minSpeechFrames` 4 e `redemptionFrames` 20, provare una richiesta continua dopo la wake word, una replica breve come «sì» e una frase con una pausa interna. Accertare che ogni turno ammesso produca un solo `input.start` alla conferma del parlato, la riserva e i frame PCM16 mono a 16 kHz e un solo `input.end`, senza perdere la replica breve né spezzare la frase alla pausa; un rumore breve non confermato non deve aprire una richiesta. Durante la riproduzione della risposta non devono partire nuovi turni. Registrare tempi di delimitazione e consumo di CPU su entrambe le architetture. Non automatizzabile: la delimitazione di repliche brevi e frasi con pause dipende da parlato reale, e il consumo di CPU va misurato sull'hardware di ciascuna architettura; le soglie con probabilità simulate sono coperte da `silero-vad.spec.ts`.

#### Metadata
  * type: demonstration-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * verify: [Delimitazione locale dei turni vocali](../Requirements/VoiceSatellite.md#delimitazione-locale-dei-turni-vocali)
---

### Ispezione dei nomi secondo le responsabilità nel satellite

#### Details
Partire dall'elenco completo dei file di produzione, dalle porte Application e dai punti di ingresso; non limitare la ricerca ai nomi che contengono già `.adapter`, `.port` o `.use-case`. Per ciascun componente interessato registrare percorso, responsabilità, eventuale porta dichiarata o implementata o caso d'uso invocato, classificazione e nome atteso.

L'ispezione passa se tutti i casi d'uso hanno il suffisso `.use-case.ts`, tutti i file che dichiarano una porta Application hanno il suffisso `.port.ts`, tutti gli adapter di ingresso e di uscita hanno il suffisso `.adapter.ts` e i file di supporto non sono classificati come adapter soltanto per la cartella che li contiene. Considerare anche le implementazioni strutturali di porte a oggetto o callable; non affidarsi al solo `implements`. I ruoli ambigui devono essere risolti con motivazione documentata. L'ispezione fallisce se manca un suffisso richiesto o se un suffisso descrive un ruolo non realizzato.

Per ogni rinomina controllare import, export pubblici, riferimenti nei test e collegamenti Reqvire. La compilazione e i test pertinenti devono continuare a passare. Non automatizzabile: classificare un file come caso d'uso, porta, adapter o supporto richiede di leggerne la responsabilità; il nome da solo non la determina. La presenza di una relazione `satisfiedBy` e il successo di `validate` o `lint` non sostituiscono questa ispezione.

#### Metadata
  * type: inspection-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * verify: [Nomi dei file secondo il ruolo architetturale nel satellite](../Requirements/VoiceSatellite.md#nomi-dei-file-secondo-il-ruolo-architetturale-nel-satellite)
---

### Ispezione dei valori predefiniti del satellite

Per ogni variabile del contratto «Configurazione del processo satellite» che ammette l'assenza, individuare nel codice del satellite il punto in cui si applica il valore predefinito, e rileggere il README, `.env.example` e `compose.example.yaml`.

#### Details
L'ispezione passa se ogni valore predefinito è applicato soltanto dal modulo di configurazione, una volta, come dichiarato dal contratto, e se README ed esempi non impostano né sostituiscono un valore predefinito. Fallisce se un altro modulo, un esempio o il README applica o ripete un valore predefinito. Non automatizzabile: riconoscere un valore predefinito ripetuto in un componente o in un testo, per esempio un intervallo scritto come costante in un adapter, richiede di leggerne il significato.

#### Metadata
  * type: inspection-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * verify: [Valori predefiniti del satellite applicati dal modulo di configurazione](../Requirements/VoiceSatellite.md#valori-predefiniti-del-satellite-applicati-dal-modulo-di-configurazione)
---

### Ispezione del bootstrap della configurazione

#### Details
Con una configurazione valida leggere la composition root e verificare che ogni componente riceva soltanto i valori validati necessari alla propria responsabilità. L'ispezione passa se nessun componente riceve l'intera configurazione o valori che non usa; fallisce altrimenti. L'assenza di letture di file e ambiente in Domain e Application è controllata dalla «Prova dei confini interni» e la validazione prima della costruzione delle risorse dalla «Prova del bootstrap della configurazione». Non automatizzabile: stabilire quali dati sono necessari a ciascun componente richiede di leggere la composition root.

#### Metadata
  * type: inspection-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * verify: [Distribuzione mirata della configurazione](../Requirements/VoiceSatellite.md#distribuzione-mirata-della-configurazione)
---

### Ispezione del perimetro iniziale di osservabilità

Ispezionare dipendenze, bootstrap, composition root, configurazione e logger: devono essere presenti soltanto i segnali diagnostici applicativi previsti, senza attivazione di sistemi separati di metriche, tracing distribuito o audit. Controllare che la documentazione non presenti i log come registro di audit garantito. Non automatizzabile: riconoscere un sistema di metriche, tracing o audit e il modo in cui la documentazione presenta i log richiede di leggere dipendenze, sorgenti e documenti.

#### Metadata
  * type: inspection-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * verify: [Perimetro iniziale dei segnali di osservabilità del satellite](../Requirements/VoiceSatellite.md#perimetro-iniziale-dei-segnali-di-osservabilità-del-satellite)
---

### Ispezione del workflow CI del satellite

Sul commit pubblicato di una pull request o di `main`, aprire l'esecuzione del workflow `Satellite CI` su GitHub Actions.

#### Details
L'ispezione passa se il job `Satellite checks` ha eseguito tutti i passi del contratto «Profilo CI del satellite» e il suo esito corrisponde a quello dei passi. Fallisce se l'esecuzione manca, se un passo non è stato eseguito o se il job risulta riuscito con un passo fallito. La configurazione del workflow è controllata dalla «Prova della configurazione del workflow CI». Non automatizzabile: attesta l'esito di un'esecuzione GitHub Actions, che i test del repository non osservano.

#### Metadata
  * type: inspection-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * verify: [Controlli CI delle modifiche del satellite](../Requirements/VoiceSatellite.md#controlli-ci-delle-modifiche-del-satellite)
---

### Ispezione della architettura e degli esiti

#### Details
Esaminare codice, import e firme: TypeScript eseguito da Node.js; stati e regole in Domain; coordinamento e porte in Application; librerie audio, wake word e trasporto negli adapter. Per ogni esito negativo dichiarato verificare la rappresentazione tipizzata; per i guasti inattesi verificare propagazione e gestione diagnostica al confine tecnico. Controllare che il lessico e l'ontologia del satellite definiscano i termini e le relazioni propri del satellite, che i termini condivisi con il resto del prodotto rimandino al «Lessico Ambrogio» di `ambrogio-model`, che i riferimenti ai concetti risolvano e che le esportazioni semantiche e la validazione Reqvire dell'intero modello abbiano esito corretto. Non automatizzabile: attribuire stati, regole e integrazioni al layer corretto e distinguere i termini propri del satellite da quelli condivisi richiede di leggere codice e modello.

#### Metadata
  * type: inspection-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * verify: [Esiti previsti come valori tipizzati nel satellite](../Requirements/VoiceSatellite.md#esiti-previsti-come-valori-tipizzati-nel-satellite)
  * verify: [Gestione dei guasti inattesi](../Requirements/VoiceSatellite.md#gestione-dei-guasti-inattesi)
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
  * verify: [Forma TypeScript dei contratti Application nel satellite](../Requirements/VoiceSatellite.md#forma-typescript-dei-contratti-application-nel-satellite)
---

### Ispezione della protezione del merge del satellite

Leggere con `gh api repos/<proprietario>/<repository>/rulesets` e con il dettaglio del ruleset `main` le regole attive sul branch principale.

#### Details
L'ispezione passa se il ruleset corrisponde al contratto: applicazione attiva sul branch predefinito, nessun attore escluso, integrazione solo tramite pull request, controlli richiesti con i nomi del contratto, riscrittura forzata e cancellazione vietate; e se un push diretto sul branch principale viene rifiutato. Fallisce se il ruleset manca, è disattivato, ha attori esclusi o differisce dal contratto. Non automatizzabile: il ruleset è un'impostazione del repository GitHub e non un file del repository, e leggerlo richiede credenziali con accesso amministrativo che la CI non possiede.

#### Metadata
  * type: inspection-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * verify: [Controlli obbligatori prima del merge del satellite](../Requirements/VoiceSatellite.md#controlli-obbligatori-prima-del-merge-del-satellite)
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

Eseguire localmente `gitleaks git --redact --no-banner --exit-code 1 .` sulla storia del repository; sul commit pubblicato di una pull request o di un branch, aprire l'esecuzione del workflow `Secret scan` su GitHub Actions.

#### Details
L'ispezione passa se la scansione locale termina senza ritrovamenti e l'esecuzione GitHub Actions ha analizzato l'intera storia con esito corrispondente ai ritrovamenti. Fallisce se la scansione locale trova un segreto, se l'esecuzione manca o se risulta riuscita con un ritrovamento. La configurazione dei workflow è controllata dalla «Prova della configurazione della scansione dei segreti». Non automatizzabile: attesta l'esito di un'esecuzione GitHub Actions, che i test del repository non osservano.

#### Metadata
  * type: inspection-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * verify: [Scansione dei segreti nella storia del repository](../Requirements/VoiceSatellite.md#scansione-dei-segreti-nella-storia-del-repository)
---

### Ispezione delle istruzioni per gli agenti del satellite

Durante la revisione di ogni modifica di `AGENTS.md` del satellite o di `ambrogio-model/AGENTS.md`, leggere le istruzioni del satellite e confrontarle con i requisiti di processo di `ambrogio-model` e con `ambrogio-model/AGENTS.md`.

#### Details
L'ispezione passa se le istruzioni del satellite rimandano a `ambrogio-model/AGENTS.md` per le regole comuni, non contraddicono i requisiti di processo di `ambrogio-model`, non descrivono un modello autonomo del repository né una revisione fissata del backend, eseguono Reqvire sulla cartella di lavoro con la versione di `ambrogio-model/.reqvire-version` e aggiungono soltanto indicazioni proprie del satellite. Fallisce se un'istruzione contraddice un requisito o ripete una regola comune in forma diversa. Non automatizzabile: confrontare istruzioni in prosa con i requisiti richiede di leggerle.

#### Metadata
  * type: inspection-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * verify: [Istruzioni per gli agenti del satellite](../Requirements/VoiceSatellite.md#istruzioni-per-gli-agenti-del-satellite)
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

Per ogni azione esterna fissata in `.github/workflows/ci.yml`, `.github/workflows/secret-scan.yml` e `.github/workflows/publish-image.yml`, confrontare lo SHA con le release della versione maggiore indicata in commento nel repository GitHub dell'azione; nel log di un'esecuzione GitHub Actions di ciascun workflow leggere i permessi concessi al `GITHUB_TOKEN`.

#### Details
L'ispezione passa se ogni SHA è il commit di una release della versione maggiore dichiarata e se i permessi del token nelle esecuzioni corrispondono a quelli del contratto «Protezioni dei workflow GitHub Actions», con `packages: write` soltanto nel job `publish`. Fallisce se uno SHA non appartiene alla versione dichiarata o se un job riceve permessi diversi da quelli dichiarati. I valori statici dei workflow sono controllati dalla «Prova delle protezioni dei workflow». Non automatizzabile: richiede di consultare i repository delle azioni su GitHub e i log delle esecuzioni GitHub Actions, che i test del repository non osservano.

#### Metadata
  * type: inspection-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * verify: [Privilegi e durata limitati dei workflow GitHub Actions](../Requirements/VoiceSatellite.md#privilegi-e-durata-limitati-dei-workflow-github-actions)
---

### Prova degli esiti e della diagnostica

Copiare `src`, `tsconfig.json` e `package.json` in una directory temporanea ed eseguire sulla copia, in un processo separato, il comando `tsc` della dipendenza di sviluppo `typescript` con il `tsconfig.json` copiato, prima senza modifiche e poi dopo aver aggiunto una variante ai rifiuti previsti della configurazione e, separatamente, a quelli degli argomenti di avvio. Iniettare un guasto che attraversa più componenti e acquisire le righe reali di Pino dei guasti e dei rifiuti previsti; controllare gli import di Domain e Application con la «Prova dei confini interni».

#### Details
La prova passa se la copia non modificata compila senza errori e ciascuna variante aggiunta produce un errore del compilatore nel mapping esaustivo di `src/main.ts`; se Domain e casi d'uso Application non importano logger; se un guasto propagato attraverso più componenti produce una sola diagnosi definitiva al confine con la causa originale conservata; se ogni evento è una sola riga JSON; se un rifiuto previsto produce una riga `info` senza `err`; e se il segnale pubblico del fallimento resta il tono di errore, senza dettagli tecnici. Fallisce se una variante aggiunta compila, se la copia non modificata non compila, se un guasto produce più diagnosi definitive o perde la causa originale, se un rifiuto previsto diventa un log di errore o se un dettaglio tecnico raggiunge il segnale pubblico.

#### Metadata
  * type: test-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * satisfiedBy: [conversation-call.adapter.error-tone.spec.ts](../../src/adapters/out/conversation-call.adapter.error-tone.spec.ts)
  * satisfiedBy: [diagnostics.spec.ts](../../src/adapters/out/diagnostics.spec.ts)
  * satisfiedBy: [voice-session.use-case.spec.ts](../../src/application/voice-session.use-case.spec.ts)
  * satisfiedBy: [import-boundaries.spec.ts](../../test/repository/import-boundaries.spec.ts)
  * satisfiedBy: [rejection-mapping.spec.ts](../../test/repository/rejection-mapping.spec.ts)
  * verify: [Assenza di logger nei layer interni](../Requirements/VoiceSatellite.md#assenza-di-logger-nei-layer-interni)
  * verify: [Conservazione della causa dei guasti](../Requirements/VoiceSatellite.md#conservazione-della-causa-dei-guasti)
  * verify: [Gestione esaustiva dei rifiuti previsti](../Requirements/VoiceSatellite.md#gestione-esaustiva-dei-rifiuti-previsti)
  * verify: [Log tecnici JSON su stdout](../Requirements/VoiceSatellite.md#log-tecnici-json-su-stdout)
  * verify: [Unicità della diagnosi definitiva](../Requirements/VoiceSatellite.md#unicità-della-diagnosi-definitiva)
---

### Prova degli eventi tardivi dopo la fine dell'interazione

Con una sessione controllata, concludere un'interazione per risposta conclusiva, per scadenza dell'esito e per perdita della sessione; poi consegnare trasmissioni, frame audio, esiti e un evento di chiusura appartenenti alla richiesta o alla sessione precedente mentre il satellite ha già riaperto l'ascolto o avviato una nuova interazione.

#### Details
La prova passa se gli eventi tardivi non interrompono l'acquisizione del microfono, non vengono riprodotti e non sono attribuiti alla nuova interazione, e se l'evento di chiusura della sessione corrente conserva la gestione ordinaria. Fallisce se un esito o un frame della richiesta precedente apre una replica, chiude la nuova interazione o arresta l'ascolto.

#### Metadata
  * type: test-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * satisfiedBy: [conversation-events.adapter.spec.ts](../../src/adapters/in/conversation-events.adapter.spec.ts)
  * satisfiedBy: [conversation-channel.spec.ts](../../src/adapters/out/conversation-channel.spec.ts)
  * verify: [Riapertura sicura dopo la chiusura vocale](../Requirements/VoiceSatellite.md#riapertura-sicura-dopo-la-chiusura-vocale)
---

### Prova dei confini interni

Leggere come testo tutti i file TypeScript di `src` e `test`: tolti i commenti, estrarre con espressioni regolari gli specificatori di `import … from`, `export … from`, `import` senza binding, `import()` e `require` o `require.resolve` con letterale, compresi quelli di soli tipi, risolvere i percorsi relativi e classificarli per layer; verificare prima la lettura su un file campione con ogni forma, commenti e stringhe che contengono testo simile a un import; leggere `package.json`, `pnpm-workspace.yaml` e l'elenco dei file tracciati da Git.

#### Details
La prova passa se i file Domain importano soltanto Domain; se i file Application importano soltanto Application e Domain; se Domain e Application non importano moduli esterni né moduli `node:`, e quindi né logger né accesso a file o ambiente; se soltanto la composition root importa come valore i casi d'uso Application e i file `*.adapter.ts`; se, fra il codice di produzione, i test Domain importano soltanto Domain, i test Application soltanto Application e Domain, i test inbound soltanto l'adapter inbound con il nome del test e Application, e i test outbound soltanto adapter outbound, Application e Domain; e se il repository traccia un solo `package.json`, senza campo `workspaces`, e `pnpm-workspace.yaml` non dichiara `packages`. Le prove di integrazione della composition root e del confine di processo sono escluse dalle regole dei test, come prevede il contratto «Regole di importazione dei test». Fallisce se la lettura del file campione non produce esattamente gli specificatori attesi, se un import, anche di soli tipi, viola una regola, se un percorso relativo non si risolve in un file del repository o se un layer non contiene file.

#### Metadata
  * type: test-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * satisfiedBy: [architecture-rules.ts](../../test/repository/architecture-rules.ts)
  * satisfiedBy: [import-boundaries.spec.ts](../../test/repository/import-boundaries.spec.ts)
  * verify: [Assemblaggio delle risorse nella composition root](../Requirements/VoiceSatellite.md#assemblaggio-delle-risorse-nella-composition-root)
  * verify: [Confini degli import nei test](../Requirements/VoiceSatellite.md#confini-degli-import-nei-test)
  * verify: [Distribuzione mirata della configurazione](../Requirements/VoiceSatellite.md#distribuzione-mirata-della-configurazione)
  * verify: [Progetto unico del satellite](../Requirements/VoiceSatellite.md#progetto-unico-del-satellite)
---

### Prova dei controlli del modello nell'hook pre-commit del satellite

In una cartella temporanea che contiene un repository Git con una copia di `.githooks/pre-commit` attivata tramite `core.hooksPath` e, accanto, uno script finto `ambrogio-model/scripts/model-checks` che registra ogni esecuzione e riesce o fallisce: tentare un commit privo di segreti con lo script che riesce, poi con lo script che fallisce, poi senza `ambrogio-model` affiancato, e un commit con una credenziale fittizia; leggere l'hook versionato.

#### Details
La prova passa se il commit privo di segreti riesce dopo un'esecuzione dello script; se con lo script che fallisce il commit è rifiutato e l'output riporta il messaggio dello script; se senza `ambrogio-model` affiancato il commit è rifiutato con il messaggio di «Controlli del modello nell'hook pre-commit»; se il commit con la credenziale è rifiutato senza eseguire lo script; e se l'hook versionato esegue `../ambrogio-model/scripts/model-checks` rispetto alla radice del repository. Fallisce se un commit è creato nonostante un controllo fallito o l'assenza di `ambrogio-model`, se lo script non viene eseguito per un commit privo di segreti o se viene eseguito dopo una scansione fallita. Lo script finto sostituisce i controlli reali, che la CI esegue a parte sull'intero modello, perché Reqvire renderebbe lenta la suite.

#### Metadata
  * type: test-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * satisfiedBy: [pre-commit-hook.spec.ts](../../test/repository/pre-commit-hook.spec.ts)
  * verify: [Controlli del modello prima del commit del satellite](../Requirements/VoiceSatellite.md#controlli-del-modello-prima-del-commit-del-satellite)
---

### Prova dei file d'ambiente e degli esempi del satellite

Confrontare `.env.example` con l'elenco delle variabili lette dal modulo di configurazione; esaminare gli script di `package.json` e il testo del codice di produzione di `src`; avviare Node.js con `--env-file` su un file d'ambiente temporaneo e con una variabile dell'ambiente del processo in conflitto; esaminare `.gitignore`, `.dockerignore` e le variabili impostate da `compose.example.yaml`.

#### Details
La prova passa se `.env.example` elenca esattamente le variabili del modulo, tutte con valore vuoto salvo `AMBROGIO_ENV=development`; se soltanto lo script `dev` usa `node --env-file=.env` e il codice di produzione non carica file d'ambiente; se la variabile del processo prevale su quella del file e le altre variabili del file sono lette; se `.env` è escluso da Git e dal contesto di build mentre `.env.example` resta versionato; e se `compose.example.yaml` imposta soltanto `AMBROGIO_ENV: production` e `AMBROGIO_BACKEND_URL`, senza variabili con valore predefinito, valori di ripiego `:-` né riferimenti a moduli o percorsi di configurazione. Fallisce se un esempio ripete un valore predefinito o se una variabile letta dal modulo manca da `.env.example`.

#### Metadata
  * type: test-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * satisfiedBy: [environment-files.spec.ts](../../test/repository/environment-files.spec.ts)
  * verify: [File d'ambiente locale del satellite](../Requirements/VoiceSatellite.md#file-dambiente-locale-del-satellite)
  * verify: [Valori predefiniti del satellite applicati dal modulo di configurazione](../Requirements/VoiceSatellite.md#valori-predefiniti-del-satellite-applicati-dal-modulo-di-configurazione)
---

### Prova del bootstrap della configurazione

Importare il punto di ingresso `src/main.ts` con variabili d'ambiente invalide e poi valide, sostituendo nella prova la composition root, la diagnostica, Decibri e ONNX Runtime con moduli registrati che annotano il proprio caricamento.

#### Details
La prova passa se con le variabili invalide il processo registra il rifiuto, imposta il codice di uscita 2 e non carica la composition root, Decibri né ONNX Runtime; e se con le variabili valide la composition root viene caricata soltanto dopo la validazione e riceve la configurazione validata. Fallisce se una risorsa audio, wake word o di rete viene caricata o costruita con una configurazione invalida o prima della validazione.

#### Metadata
  * type: test-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * satisfiedBy: [main.spec.ts](../../src/main.spec.ts)
  * verify: [Validazione prima della costruzione delle risorse](../Requirements/VoiceSatellite.md#validazione-prima-della-costruzione-delle-risorse)
---

### Prova del catalogo wake word montato

Preparare una directory di modelli con le risorse comuni openWakeWord e un classificatore compatibile chiamato `personalizzato.onnx`. Montarla in sola lettura su `/app/models/wakeword` nell'immagine satellite, impostare `AMBROGIO_WAKE_WORD_MODEL=personalizzato` e caricare il classificatore. Provare anche identificatori inesistenti, nomi dei modelli comuni e tentativi di attraversamento della directory.

#### Details
La prova passa se il modello personalizzato è scoperto e caricato dal mount senza ricostruire l'immagine, le wake word distribuite continuano a funzionare senza mount e i nomi assenti o non sicuri sono rifiutati. Fallisce se il mount è ignorato, la configurazione accetta un percorso fuori directory o un modello comune come classificatore. La prova non dimostra l'accuratezza acustica di un modello personalizzato.

#### Metadata
  * type: test-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * satisfiedBy: [verify-docker-image.mjs](../../scripts/verify-docker-image.mjs)
  * satisfiedBy: [wake-word-catalog.spec.ts](../../src/adapters/out/wake-word-catalog.spec.ts)
  * verify: [Selezione della wake word configurata](../Requirements/VoiceSatellite.md#selezione-della-wake-word-configurata)
---

### Prova del ciclo di arresto del satellite

#### Details
Iniettare risorse controllate e fallimenti: durante ascolto, chiamata e riproduzione, l'arresto deve bloccare nuovi eventi e interrompere i dispositivi senza attendere una risposta. Chiamare la chiusura ripetutamente e in parallelo: una sola chiusura nativa per risorsa, in ordine inverso di acquisizione (microfono, sessione vocale, chiamata e canale, attività vocale, wake word), stesso esito. Far fallire una chiusura: tutte le altre devono essere tentate e il guasto, incapsulato in un errore del progetto che nomina la risorsa, deve conservare l'originale come causa; due guasti devono restare distinti in un `LifecycleError` nell'ordine osservato. Fallire l'avvio dopo acquisizioni parziali e interrompere un'acquisizione pendente: tutte le risorse ottenute devono essere rilasciate. Provare rilascio ONNX parziale e inferenza in corso, cancellazione del tono di errore e SIGINT/SIGTERM nel confine di processo.

Nel confine di processo, con una scadenza controllata dalla prova, inviare SIGINT o SIGTERM a un satellite la cui chiusura non si risolve mai, poi a un avvio che non termina dopo l'interruzione, inviando un secondo segnale durante l'attesa; ripetere con un arresto che termina prima della scadenza. Con il timer predefinito basato su Node.js verificare che la scadenza non trattenga il processo. Ripetere la scadenza dopo che una chiusura è già fallita. Acquisire la riga reale di Pino dell'evento di scadenza e leggere l'esempio Compose del repository.

La prova passa se ogni condizione precedente è rispettata; se, alla scadenza di 5000 ms dal primo segnale, il confine di processo registra una sola volta `satellite_shutdown_timeout` e termina con codice 1; se il secondo segnale non riavvia la scadenza; se un arresto concluso prima annulla la scadenza senza registrare l'evento né forzare l'uscita; se il timer predefinito non mantiene attivo l'event loop; se la riga è di livello `error` con soltanto le chiavi `level`, `time`, `event` e `timeoutMs` uguale a 5000, più `err` con i guasti già osservati quando ve ne sono; se un arresto con una chiusura fallita produce una sola riga `satellite_process_failed` e codice 1; e se l'esempio Compose dichiara `stop_grace_period` di almeno 10 secondi. Fallisce se una risorsa resta aperta, se una chiusura è ripetuta, se l'errore originale si perde, se una chiusura che non si risolve lascia il processo attivo oltre la scadenza, se l'uscita forzata avviene dopo un arresto concluso o con codice diverso da 1, o se la riga contiene altre chiavi. I test automatici usano risorse simulate; non attestano periferiche reali.

#### Metadata
  * type: test-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * satisfiedBy: [decibri-audio.spec.ts](../../src/adapters/out/decibri-audio.spec.ts)
  * satisfiedBy: [diagnostics.spec.ts](../../src/adapters/out/diagnostics.spec.ts)
  * satisfiedBy: [onnx-wake-word.lifecycle.spec.ts](../../src/adapters/out/onnx-wake-word.lifecycle.spec.ts)
  * satisfiedBy: [silero-vad.spec.ts](../../src/adapters/out/silero-vad.spec.ts)
  * satisfiedBy: [satellite.spec.ts](../../src/composition/satellite.spec.ts)
  * satisfiedBy: [lifecycle.spec.ts](../../src/runtime/lifecycle.spec.ts)
  * satisfiedBy: [satellite-process.spec.ts](../../src/runtime/satellite-process.spec.ts)
  * satisfiedBy: [environment-files.spec.ts](../../test/repository/environment-files.spec.ts)
  * verify: [Arresto immediato del processo satellite](../Requirements/VoiceSatellite.md#arresto-immediato-del-processo-satellite)
  * verify: [Arresto unico e ordinato del satellite](../Requirements/VoiceSatellite.md#arresto-unico-e-ordinato-del-satellite)
  * verify: [Rilascio completo delle risorse del satellite](../Requirements/VoiceSatellite.md#rilascio-completo-delle-risorse-del-satellite)
  * verify: [Tempo massimo dell'arresto del processo](../Requirements/VoiceSatellite.md#tempo-massimo-dellarresto-del-processo)
---

### Prova del comando di verifica completo del satellite

Leggere lo script `verify` di `package.json` e i passi del job `Satellite checks` di `.github/workflows/ci.yml`, e ricavare dai passi la sequenza attesa.

#### Details
La prova passa se `verify` è esattamente `../ambrogio-model/scripts/model-checks`, seguito dai comandi `pnpm` del job in `workspace/ambrogio-satellite` per l'installazione congelata e l'audit, dalla preparazione del backend in `../ambrogio-backend` con i comandi del job in `workspace/ambrogio-backend`, e dagli altri comandi `pnpm` del job nello stesso ordine, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, `pnpm build` e `pnpm test:backend`, tutti uniti da `&&`. Fallisce se un comando della CI manca, è in un altro ordine o non interrompe la sequenza quando fallisce.

#### Metadata
  * type: test-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * satisfiedBy: [workflows.spec.ts](../../test/repository/workflows.spec.ts)
  * verify: [Comando di verifica completo del satellite](../Requirements/VoiceSatellite.md#comando-di-verifica-completo-del-satellite)
---

### Prova del confine Application della sessione

#### Details
Controllare proiezioni osservabili durante attesa, apertura, registrazione, risposta, replica, chiusura e guasto; una fotografia precedente non cambia con le transizioni e la sua mutazione non modifica lo stato interno. Verificare che gli eventi di timeout e completamento delle porte non siano ammessi dall'API pubblica. L'adapter legge solo il contratto Application, converte metadati non booleani in indicazione assente e conserva filtro dei frame, conclusione del parlato e gestione delle disconnessioni. Eseguire typecheck, build e regressione completa senza cambiare le regole Domain.

#### Metadata
  * type: test-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * satisfiedBy: [voice-session.use-case.spec.ts](../../src/application/voice-session.use-case.spec.ts)
  * verify: [Contratti Application indipendenti dal Domain](../Requirements/VoiceSatellite.md#contratti-application-indipendenti-dal-domain)
---

### Prova del logger minimo del satellite

Creare il logger di base del satellite su un flusso di prova, derivarne due logger con campi diversi ed emettere eventi con campi sensibili annidati e nomi di variabili delle credenziali; costruire il catalogo degli eventi, la chiamata conversazionale e la riproduzione con un logger di prova che registra le chiamate. Eseguire la regola di architettura che limita Pino al modulo del logger.

#### Details
La prova passa se le righe dei logger derivati contengono ciascuna soltanto i propri campi fissi e il logger di base resta invariato; se i valori dei campi sensibili sono sostituiti da `[redacted]` a ogni profondità senza modificare gli oggetti originali; se gli eventi dei componenti arrivano al logger iniettato; e se nessun file di produzione fuori da `src/runtime/logger.ts` importa Pino. Fallisce se un componente usa un logger globale o un'istanza Pino propria, se un valore sensibile compare in una riga o se un logger derivato altera il logger di base.

#### Metadata
  * type: test-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * satisfiedBy: [diagnostics.spec.ts](../../src/adapters/out/diagnostics.spec.ts)
  * satisfiedBy: [logger.spec.ts](../../src/runtime/logger.spec.ts)
  * satisfiedBy: [import-boundaries.spec.ts](../../test/repository/import-boundaries.spec.ts)
  * verify: [Logger minimo del satellite](../Requirements/VoiceSatellite.md#logger-minimo-del-satellite)
---

### Prova del percorso fatale del satellite

In un processo Node.js figlio che installa il percorso fatale del satellite, provocare separatamente un'eccezione non catturata e un rifiuto di promessa non gestito, entrambi con un messaggio marcatore e una proprietà marcatore; catturare `stdout`, `stderr` e codice di uscita. Leggere `main.ts` del satellite.

#### Details
La prova passa se in entrambi i casi `stderr` contiene soltanto `Ambrogio satellite stopped after a fatal error.`, `stdout` è vuoto, il codice di uscita è 1 e nessun marcatore compare negli output; e se `main.ts` installa il percorso fatale prima di caricare con import dinamici il codice dell'applicazione. Fallisce se il processo continua, termina con successo, serializza il valore sollevato o scrive su `stdout`.

#### Metadata
  * type: test-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * satisfiedBy: [fatal-path.spec.ts](../../src/runtime/fatal-path.spec.ts)
  * verify: [Percorso fatale del satellite](../Requirements/VoiceSatellite.md#percorso-fatale-del-satellite)
---

### Prova del riepilogo della pubblicazione del satellite

Leggere come testo `.github/workflows/publish-image.yml` e confrontarlo con il contratto «Profilo di pubblicazione Docker del satellite».

#### Details
La prova passa se il passo che pubblica le immagini, dopo aver creato il manifest con il tag di release, scrive in `$GITHUB_STEP_SUMMARY` il riferimento `$IMAGE` dell'immagine pubblicata con le sue piattaforme. Fallisce se il riepilogo manca o se è scritto prima della pubblicazione.

#### Metadata
  * type: test-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * satisfiedBy: [workflows.spec.ts](../../test/repository/workflows.spec.ts)
  * verify: [Pubblicazione delle immagini Docker del satellite](../Requirements/VoiceSatellite.md#pubblicazione-delle-immagini-docker-del-satellite)
---

### Prova del runner Vitest del satellite

Esaminare `vitest.config.ts` e gli script `test` e `test:e2e` del `package.json`; avviarli e acquisire il report dei test eseguiti da ciascuno.

#### Details
La prova passa se gli script eseguono con Vitest rispettivamente i progetti `fast` ed `e2e` di «Suite di test del satellite», ciascuno produce un report dei test avviati, nessun file di test compare in entrambi i report e la somma dei file eseguiti è pari al numero dei file `*.spec.ts` del repository. Fallisce se la suite usa un runner diverso, se uno script non può essere avviato tramite Vitest, se un file gira in entrambe le selezioni o se un file di test non appartiene a nessuna.

#### Metadata
  * type: test-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * satisfiedBy: [package.json](../../package.json)
  * satisfiedBy: [vitest.config.ts](../../vitest.config.ts)
  * verify: [Vitest come runner del satellite](../Requirements/VoiceSatellite.md#vitest-come-runner-del-satellite)
---

### Prova del tono di errore per voce non disponibile

Con una sessione controllata, rispondere a un turno vocale con una trasmissione testuale seguita da `turn.rejected` con `reason: "audio_unavailable"`; ripetere con una trasmissione testuale in un turno ammesso.

#### Details
La prova passa se il satellite non tenta di pronunciare il testo, registra `satellite_voice_unavailable`, riproduce sullo speaker configurato i campioni del tono di errore locale al posto della trasmissione, non apre una replica e torna in attesa della wake word, senza reinviare la richiesta. Fallisce se il satellite resta in attesa, apre una replica, riproduce campioni diversi dal tono di errore o non registra l'evento.

#### Metadata
  * type: test-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * satisfiedBy: [response-playback.spec.ts](../../src/adapters/out/response-playback.spec.ts)
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
  * satisfiedBy: [conversation-call.adapter.error-tone.spec.ts](../../src/adapters/out/conversation-call.adapter.error-tone.spec.ts)
  * verify: [Tono di errore per backend irraggiungibile](../Requirements/VoiceSatellite.md#tono-di-errore-per-backend-irraggiungibile)
---

### Prova dell'ambiente di esecuzione del satellite

Leggere con il modulo di configurazione variabili valide senza `AMBROGIO_ENV`, con `AMBROGIO_ENV` vuota, con valori non ammessi come `prod`, `Production` e `staging`, e con ciascuno dei valori `development`, `test` e `production`; avviare il punto di ingresso del processo, sorgente e compilato, senza `AMBROGIO_ENV`.

#### Details
La prova passa se l'assenza e il valore vuoto sono rifiutati con `condition: "missing"`, i valori non ammessi con `condition: "invalid"`, entrambi con `variable: "AMBROGIO_ENV"` e uscita 2 prima di caricare la composition root, e se i tre ambienti ammessi producono la stessa configurazione con gli stessi valori predefiniti. Fallisce se il satellite si avvia senza ambiente dichiarato o se un valore predefinito cambia con l'ambiente.

#### Metadata
  * type: test-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * satisfiedBy: [configuration.spec.ts](../../src/adapters/out/configuration.spec.ts)
  * satisfiedBy: [main.e2e.spec.ts](../../src/main.e2e.spec.ts)
  * satisfiedBy: [main.spec.ts](../../src/main.spec.ts)
  * verify: [Ambiente di esecuzione dichiarato del satellite](../Requirements/VoiceSatellite.md#ambiente-di-esecuzione-dichiarato-del-satellite)
---

### Prova dell'assenza di import del backend nel satellite

Leggere come testo tutti i file TypeScript di `src`, estrarne gli specificatori con la stessa lettura della «Prova dei confini interni» e risolverli.

#### Details
La prova passa se i file di `src` letti non sono vuoti e se ogni specificatore del codice di produzione è un modulo di Node.js, una dipendenza di runtime dichiarata nel `package.json` del satellite o un percorso relativo che resta in `src`; nessuno specificatore deve risolversi in un percorso del repository `ambrogio-backend` o fuori dal repository, né nominare un package del backend, e nessun package del backend deve comparire fra le dipendenze del satellite. Il controllo è la regola `no-backend-imports` di «Regole di architettura del satellite»; l'unico import calcolato a runtime ammesso è la sua eccezione registrata, il caricatore della configurazione in `src/adapters/out/config-file.ts`, che importa il modulo di configurazione dell'installazione. Fallisce se un file di produzione importa codice del backend, anche soltanto per i tipi, o se uno specificatore non può essere risolto.

#### Metadata
  * type: test-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * satisfiedBy: [architecture-rules.ts](../../test/repository/architecture-rules.ts)
  * satisfiedBy: [backend-imports.spec.ts](../../test/repository/backend-imports.spec.ts)
  * verify: [Uso delle sole interfacce pubbliche del backend nel satellite](../Requirements/VoiceSatellite.md#uso-delle-sole-interfacce-pubbliche-del-backend-nel-satellite)
---

### Prova dell'attenuazione dell'audio locale

Con una porta di attenuazione registrata nei test, avviare il satellite con e senza le variabili dell'attenuazione, riconoscere la wake word e concludere l'interazione dopo la risposta, dopo una replica richiesta dal backend, per inattività, per backend irraggiungibile e per perdita della sessione; arrestare poi il processo. Con un esecutore di processi registrato, provare l'adapter `amixer` con esito riuscito, controllo inesistente, codice di uscita diverso da zero e scadenza del tempo massimo. Validare la configurazione con valori corretti, una variabile dell'attenuazione mancante mentre le altre sono presenti, spazi iniziali, e `AMBROGIO_ATTENUATION_LEVEL` fuori da 0-100 o non intero.

#### Details
La prova passa se senza configurazione non avviene alcuna regolazione; se con la configurazione il satellite porta il controllo al 100% all'avvio, al livello configurato alla wake word prima del segnale acustico di disponibilità e di nuovo al 100% al ritorno in attesa della wake word in ogni conclusione, mantenendolo attenuato durante le repliche; se lo porta al 100% durante l'arresto controllato; se l'adapter esegue `amixer -D <device> -q sset <control> <livello>%` senza shell; se il controllo inesistente non produce eventi di guasto mentre gli altri errori e la scadenza producono `satellite_attenuation_failed` senza interrompere l'interazione o l'attesa; e se la configurazione invalida è rifiutata prima dell'avvio operativo.

#### Metadata
  * type: test-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * satisfiedBy: [amixer-attenuation.adapter.spec.ts](../../src/adapters/out/amixer-attenuation.adapter.spec.ts)
  * satisfiedBy: [configuration.spec.ts](../../src/adapters/out/configuration.spec.ts)
  * satisfiedBy: [voice-session.use-case.attenuation.spec.ts](../../src/application/voice-session.use-case.attenuation.spec.ts)
  * verify: [Attenuazione dell'audio locale durante l'interazione](../Requirements/VoiceSatellite.md#attenuazione-dellaudio-locale-durante-linterazione)
  * verify: [Interazione indipendente dall'attenuazione](../Requirements/VoiceSatellite.md#interazione-indipendente-dallattenuazione)
  * verify: [Ripristino dell'attenuazione all'avvio e all'arresto](../Requirements/VoiceSatellite.md#ripristino-dellattenuazione-allavvio-e-allarresto)
---

### Prova dell'audit delle dipendenze del satellite

Leggere come testo `.github/workflows/ci.yml`, gli altri workflow e `pnpm-workspace.yaml` e confrontarli con il contratto «Audit delle dipendenze con pnpm» di `ambrogio-model`.

#### Details
La prova passa se il job `Satellite checks` esegue `pnpm audit --audit-level high` in `workspace/ambrogio-satellite` nel passo immediatamente successivo all'installazione congelata; se nessun comando `pnpm audit` usa `--ignore`, `--ignore-unfixable`, `--ignore-registry-errors`, `--prod` o `--dev`; e se `auditConfig` di `pnpm-workspace.yaml` contiene soltanto `ignoreGhsas` con singoli identificativi GHSA elencati nel contratto comune. Fallisce se l'audit manca, è in un'altra posizione, usa un'opzione che lo indebolisce o se un'eccezione non è un singolo avviso registrato. L'esito dell'audit sugli avvisi del registro è dato dall'esecuzione di `pnpm audit` nella CI e in `pnpm verify`, perché richiede la rete.

#### Metadata
  * type: test-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * satisfiedBy: [workflows.spec.ts](../../test/repository/workflows.spec.ts)
  * verify: [Audit delle dipendenze nella CI del satellite](../Requirements/VoiceSatellite.md#audit-delle-dipendenze-nella-ci-del-satellite)
---

### Prova dell'evento di attivazione locale

Acquisire la riga reale di Pino prodotta dal rilevamento: livello `info`, `event: "satellite_wake_detected"`, `score` arrotondato a tre decimali e `chunks` intero, con le sole chiavi `level`, `time`, `event`, `score` e `chunks`. Con sessioni ONNX simulate, il riconoscitore consegna al rilevamento il punteggio e il numero di blocchi consecutivi sopra soglia; la composition root registra l'evento e poi inoltra l'attivazione alla sessione vocale.

#### Metadata
  * type: test-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * satisfiedBy: [diagnostics.spec.ts](../../src/adapters/out/diagnostics.spec.ts)
  * satisfiedBy: [onnx-wake-word.lifecycle.spec.ts](../../src/adapters/out/onnx-wake-word.lifecycle.spec.ts)
  * satisfiedBy: [satellite.spec.ts](../../src/composition/satellite.spec.ts)
  * verify: [Registrazione delle attivazioni locali](../Requirements/VoiceSatellite.md#registrazione-delle-attivazioni-locali)
---

### Prova dell'evento di configurazione rifiutata

Acquisire le righe reali di Pino prodotte dal rifiuto della configurazione per `AMBROGIO_ENV` assente e non ammessa, `AMBROGIO_BACKEND_URL` assente e invalida e per ciascuna altra variabile invalida del contratto «Configurazione del processo satellite», compresa una variabile dell'attenuazione mancante mentre un'altra è presente, usando valori e nome host che contengono un marcatore segreto. Compilare il punto di ingresso con `tsc` in una directory temporanea e avviare con Node.js il processo compilato con un valore invalido, senza `AMBROGIO_ENV` e con un argomento di avvio.

#### Details
La prova passa se ogni rifiuto produce una sola riga `info` con `event: "invalid_configuration"`, la `variable` attesa e la `condition` attesa, `missing` o `invalid`; se le righe hanno soltanto le chiavi `level`, `time`, `event`, `variable` e `condition` e non contengono il marcatore; e se il processo compilato esce con 2 e lo stdout contiene soltanto la riga attesa, `invalid_arguments` per l'argomento di avvio. Fallisce se una riga riporta un valore, se manca la variabile o se il processo prosegue dopo il rifiuto.

#### Metadata
  * type: test-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * satisfiedBy: [diagnostics.spec.ts](../../src/adapters/out/diagnostics.spec.ts)
  * satisfiedBy: [main.e2e.spec.ts](../../src/main.e2e.spec.ts)
  * satisfiedBy: [main.spec.ts](../../src/main.spec.ts)
  * verify: [Rifiuto della configurazione invalida](../Requirements/VoiceSatellite.md#rifiuto-della-configurazione-invalida)
---

### Prova dell'hook dei segreti

In un repository Git temporaneo con `core.hooksPath` impostato a una copia di `.githooks`, eseguire `git commit` con gitleaks 8.30.1 nel `PATH`: mettere in staging un file con una credenziale fittizia nel formato di un fornitore noto, costruita durante la prova e mai salvata nel repository del satellite, poi un file privo di segreti; infine ripetere con un `PATH` che non contiene `gitleaks`. Il repository temporaneo viene rimosso al termine.

#### Details
La prova passa se l'hook versionato è eseguibile; se il commit con la credenziale è rifiutato, la storia del repository temporaneo resta senza commit e il valore non compare nell'output; se il commit privo di segreti riesce; e se senza `gitleaks` il commit è rifiutato con il messaggio che indica l'installazione di gitleaks 8.30.1 e l'attivazione con `git config core.hooksPath .githooks`. Fallisce se la versione di gitleaks nel `PATH` non è 8.30.1, se la credenziale entra nella storia, se il valore compare nell'output, se il commit privo di segreti è rifiutato o se il commit senza `gitleaks` riesce.

#### Metadata
  * type: test-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * satisfiedBy: [pre-commit-hook.spec.ts](../../test/repository/pre-commit-hook.spec.ts)
  * verify: [Controllo dei segreti prima del commit locale](../Requirements/VoiceSatellite.md#controllo-dei-segreti-prima-del-commit-locale)
---

### Prova dell'identità del satellite nella sessione

Con una sessione controllata, avviare il satellite senza `AMBROGIO_CLIENT_ID` e `AMBROGIO_CLIENT_NAME`, poi con le due variabili, e osservare `session.hello`. Ripetere con valori vuoti e fatti di soli spazi.

#### Details
La prova passa se senza configurazione `clientId` vale `satellite-<nome host>` e `name` vale il nome host, se i valori configurati li sostituiscono se valori vuoti equivalgono a variabili assenti e se valori fatti di soli spazi rendono invalida la configurazione prima dell'avvio operativo. Fallisce se il satellite apre una sessione con un identificativo vuoto o diverso da quello configurato.

#### Metadata
  * type: test-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * satisfiedBy: [configuration.spec.ts](../../src/adapters/out/configuration.spec.ts)
  * satisfiedBy: [conversation-channel.spec.ts](../../src/adapters/out/conversation-channel.spec.ts)
  * verify: [Identificazione del satellite nella sessione](../Requirements/VoiceSatellite.md#identificazione-del-satellite-nella-sessione)
---

### Prova dell'installazione con Corepack del satellite

Leggere come testo `.github/workflows/ci.yml`, gli altri workflow, il `Dockerfile` e `package.json` e confrontarli con il contratto «Profilo di installazione delle dipendenze del satellite»; in CI installare le dipendenze da un checkout pulito.

#### Details
La prova passa se `packageManager` è `pnpm@12.11.2`; se il job `Satellite checks` dichiara `COREPACK_ENABLE_DOWNLOAD_PROMPT: '0'` ed esegue `corepack enable` prima delle installazioni; se la fase di build del `Dockerfile` parte da un'immagine `node` 24, dichiara `ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0` ed esegue `corepack enable` prima di copiare il manifest e di `pnpm install --frozen-lockfile`; se nessun workflow né il `Dockerfile` installano pnpm con `npm install --global` o lo eseguono con `npx`; e se l'installazione congelata in CI riesce. Fallisce se una di queste condizioni manca.

#### Metadata
  * type: test-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * satisfiedBy: [workflows.spec.ts](../../test/repository/workflows.spec.ts)
  * verify: [Installazione delle dipendenze del satellite con pnpm e Corepack](../Requirements/VoiceSatellite.md#installazione-delle-dipendenze-del-satellite-con-pnpm-e-corepack)
---

### Prova della conferma su blocchi consecutivi

Con sessioni ONNX simulate che restituiscono una sequenza controllata di punteggi del classificatore, uno per blocco da 80 ms, e soglia 0,5: con `patience` 2 un solo blocco sopra soglia seguito da uno sotto soglia non produce rilevamenti; due blocchi consecutivi sopra soglia producono un solo rilevamento, sul secondo blocco; due blocchi sopra soglia separati da uno sotto soglia non producono rilevamenti; con `patience` 1 un solo blocco sopra soglia produce un rilevamento. Dopo l'azzeramento della pipeline un blocco sopra soglia non completa un conteggio iniziato prima. Opzioni con `patience` non intero o minore di 1 sono rifiutate all'apertura. La configurazione senza `AMBROGIO_WAKE_WORD_PATIENCE` produce il valore 2, accetta 1 e 10 e rifiuta 0, 11 e valori non interi indicando la variabile `AMBROGIO_WAKE_WORD_PATIENCE`; la composition root passa il valore configurato al riconoscitore.

#### Details
La prova usa punteggi simulati e non misura attivazioni spurie né parole mancate: l'accuratezza del riconoscimento dipende dal modello e dalla soglia scelti da chi installa.

#### Metadata
  * type: test-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * satisfiedBy: [configuration.spec.ts](../../src/adapters/out/configuration.spec.ts)
  * satisfiedBy: [onnx-wake-word.lifecycle.spec.ts](../../src/adapters/out/onnx-wake-word.lifecycle.spec.ts)
  * satisfiedBy: [satellite.spec.ts](../../src/composition/satellite.spec.ts)
  * verify: [Conferma della wake word su blocchi consecutivi](../Requirements/VoiceSatellite.md#conferma-della-wake-word-su-blocchi-consecutivi)
---

### Prova della configurazione del satellite

Leggere con il modulo di configurazione insiemi di variabili d'ambiente validi e invalidi; avviare il punto di ingresso del processo senza argomenti con variabili valide e invalide e con un argomento di avvio.

#### Details
La prova passa se un argomento di avvio, compreso `--config`, è rifiutato prima di leggere la configurazione; se variabili valide producono `AMBROGIO_BACKEND_URL`, identità, dispositivi, attenuazione, modello, soglia, blocchi e intervallo locale di inattività configurati; se l'URL base `http:` diventa `ws:` e `https:` diventa `wss:`, conservando l'eventuale prefisso di percorso e aggiungendo una sola volta `api/session`; se senza variabili facoltative l'identità vale `satellite-<nome host>` con il nome host, nessun selettore audio è indicato, il modello è `hey_jarvis`, la soglia 0,5, i blocchi 2 e l'intervallo di 15000 ms; se una variabile vuota equivale a una variabile assente; e se `AMBROGIO_BACKEND_URL` assente o non HTTP(S), selettori con spazi, identità fatta di soli spazi, modello assente dal catalogo disponibile, soglia, blocchi e intervallo fuori intervallo o non numerici sono rifiutati con la variabile e la condizione attese e il processo termina con codice 2 senza avvio operativo. Fallisce se una configurazione invalida è accettata, se un valore predefinito differisce dal contratto, se un valore configurato è ignorato o se il processo prosegue dopo un rifiuto.

#### Metadata
  * type: test-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * satisfiedBy: [startup-arguments.spec.ts](../../src/adapters/in/startup-arguments.spec.ts)
  * satisfiedBy: [backend-url.spec.ts](../../src/adapters/out/backend-url.spec.ts)
  * satisfiedBy: [configuration.spec.ts](../../src/adapters/out/configuration.spec.ts)
  * satisfiedBy: [main.e2e.spec.ts](../../src/main.e2e.spec.ts)
  * satisfiedBy: [main.spec.ts](../../src/main.spec.ts)
  * verify: [Configurazione del satellite dalle variabili d'ambiente](../Requirements/VoiceSatellite.md#configurazione-del-satellite-dalle-variabili-dambiente)
  * verify: [Rifiuto della configurazione invalida](../Requirements/VoiceSatellite.md#rifiuto-della-configurazione-invalida)
---

### Prova della configurazione del workflow CI

Leggere come testo `.github/workflows/ci.yml` e confrontarlo con il contratto «Profilo CI del satellite», con il contratto «Checkout affiancato dello spazio di lavoro» di `ambrogio-model` e con `.github/workflows/secret-scan.yml`.

#### Details
La prova passa se il workflow si attiva su `pull_request`, sui `push` al solo branch `main`, su `workflow_dispatch` e su `workflow_call`, senza filtri `paths` o `paths-ignore`; se il job `Satellite checks` usa `ubuntu-24.04`, Node.js `24` e `BRANCH: ${{ github.head_ref || github.ref_name }}`; se esegue il checkout del repository con `path: workspace/ambrogio-satellite` e `fetch-depth: 0`, scarica `ambrogio-model` in `workspace/ambrogio-model` sul branch `BRANCH` se esiste e altrimenti su `main`, ed esegue nell'ordine `workspace/ambrogio-model/scripts/checkout-workspace workspace "$BRANCH"` e `workspace/ambrogio-model/scripts/model-checks --workspace workspace`, senza un numero di versione di Reqvire nel workflow; se dichiara `COREPACK_ENABLE_DOWNLOAD_PROMPT: '0'`, esegue `corepack enable` con `packageManager` uguale a `pnpm@12.11.2` nel `package.json` del satellite ed esegue in `workspace/ambrogio-backend` `pnpm install --frozen-lockfile` e `pnpm build`; se i passi del satellite girano in `workspace/ambrogio-satellite` con `pnpm install --frozen-lockfile`, `ONNXRUNTIME_NODE_INSTALL: skip` e `ORT_DISABLE_TELEMETRY: '1'`, seguito da `pnpm audit --audit-level high`; se installa gitleaks con la versione e lo SHA-256 di `.github/workflows/secret-scan.yml`, dallo stesso archivio della release ufficiale, ed esegue `sha256sum --check --strict` prima dell'estrazione; se esegue nell'ordine `pnpm audit --audit-level high`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, `pnpm build` e `pnpm test:backend`, con l'installazione di gitleaks prima di `pnpm test`; e se nessun workflow o passo usa `continue-on-error`. Fallisce se manca un controllo, se l'ordine differisce, se un attivatore manca o è filtrato per percorso, se la versione o l'impronta di gitleaks differiscono dalla scansione dei segreti o se un passo fallito non fa fallire il job.

#### Metadata
  * type: test-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * satisfiedBy: [workflows.spec.ts](../../test/repository/workflows.spec.ts)
  * verify: [Controlli CI delle modifiche del satellite](../Requirements/VoiceSatellite.md#controlli-ci-delle-modifiche-del-satellite)
---

### Prova della configurazione della scansione dei segreti

Leggere come testo `.github/workflows/secret-scan.yml` e `.github/workflows/publish-image.yml` e confrontarli con il «Profilo di scansione dei segreti con gitleaks» di `ambrogio-model` e con i contratti «Profilo della scansione dei segreti del satellite» e «Profilo di pubblicazione Docker del satellite».

#### Details
La prova passa se la scansione si attiva su `push` senza filtri di branch o percorso, su `pull_request`, su `workflow_dispatch` e su `workflow_call`; se il checkout usa `fetch-depth: 0` e `persist-credentials: false`; se `GITLEAKS_VERSION` vale `8.30.1` e `GITLEAKS_SHA256` vale l'impronta del profilo comune; se il passo di installazione scarica `gitleaks_${GITLEAKS_VERSION}_linux_x64.tar.gz` dalla release ufficiale ed esegue `sha256sum --check --strict` prima di `tar`; se il comando di scansione è `gitleaks git --redact --no-banner --exit-code 1 .`; se nessun passo usa `continue-on-error`; e se `publish-image.yml` richiama `./.github/workflows/ci.yml` e `./.github/workflows/secret-scan.yml` e il job `publish` dichiara `needs: [checks, secret-scan]`. Fallisce se un attivatore manca o è filtrato, se l'impronta è verificata dopo l'estrazione o non è verificata, se versione, impronta o comando differiscono dal profilo comune o se il job `publish` non dipende da entrambi i workflow.

#### Metadata
  * type: test-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * satisfiedBy: [workflows.spec.ts](../../test/repository/workflows.spec.ts)
  * verify: [Scansione dei segreti nella storia del repository](../Requirements/VoiceSatellite.md#scansione-dei-segreti-nella-storia-del-repository)
  * verify: [Scansione dei segreti prima della pubblicazione](../Requirements/VoiceSatellite.md#scansione-dei-segreti-prima-della-pubblicazione)
---

### Prova della costruzione separata dall'attivazione del satellite

Costruire il satellite con risorse simulate e controllare che dopo la costruzione microfono, attenuazione e sessione con il backend non siano stati avviati; attivarlo, poi ripetere chiudendolo senza attivarlo. Eseguire il runner del processo con un satellite simulato e un arresto richiesto durante la costruzione.

#### Details
La prova passa se la costruzione carica i modelli e prepara la sessione senza ripristinare l'attenuazione, avviare il microfono o aprire il canale; se questi avvengono soltanto all'attivazione decisa dal runner, che registra `satellite_ready` dopo di essa; se la chiusura senza attivazione rilascia i modelli; e se un arresto richiesto durante la costruzione non attiva il satellite e termina con codice 0. Fallisce se la costruzione attiva un dispositivo o la sessione, o se l'attivazione avviene fuori dal runner.

#### Metadata
  * type: test-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * satisfiedBy: [satellite.spec.ts](../../src/composition/satellite.spec.ts)
  * satisfiedBy: [satellite-process.spec.ts](../../src/runtime/satellite-process.spec.ts)
  * verify: [Costruzione del satellite separata dall'attivazione](../Requirements/VoiceSatellite.md#costruzione-del-satellite-separata-dallattivazione)
---

### Prova della diagnostica Pino

Acquisire le righe reali di Pino del logger di base: JSON, event stabili; per un `ProjectError` con causa esterna la vista contiene tipo, messaggio e stack senza la causa; per errori esterni, valori lanciati non Error, cause cicliche, getter e aggregati la vista è la descrizione costante, senza message, name, stack, code, cause o proprietà aggiuntive di origine; per un `LifecycleError` `faults` elenca nell'ordine le viste dei guasti raccolti. Controllare identità e immutabilità degli originali. Iniettare un guasto di interazione e uno di riproduzione del tono di errore: un evento distinto per ciascun guasto e tono di errore indipendente dalla diagnosi. Verificare avvio e rifiuti di configurazione senza log automatici di errore. Con il trasporto `ambrogio.v1`, verificare che nessun componente emetta su console messaggi ricevuti o errori grezzi fuori dal logger applicativo.

#### Metadata
  * type: test-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * satisfiedBy: [diagnostics.spec.ts](../../src/adapters/out/diagnostics.spec.ts)
  * satisfiedBy: [voice-session.use-case.spec.ts](../../src/application/voice-session.use-case.spec.ts)
  * satisfiedBy: [logger.spec.ts](../../src/runtime/logger.spec.ts)
  * verify: [Conservazione della causa dei guasti](../Requirements/VoiceSatellite.md#conservazione-della-causa-dei-guasti)
  * verify: [Eventi diagnostici stabili](../Requirements/VoiceSatellite.md#eventi-diagnostici-stabili)
  * verify: [Log tecnici JSON su stdout](../Requirements/VoiceSatellite.md#log-tecnici-json-su-stdout)
  * verify: [Selezione esplicita dei dati diagnostici](../Requirements/VoiceSatellite.md#selezione-esplicita-dei-dati-diagnostici)
  * verify: [Serializzazione protetta dei guasti](../Requirements/VoiceSatellite.md#serializzazione-protetta-dei-guasti)
  * verify: [Unicità della diagnosi definitiva](../Requirements/VoiceSatellite.md#unicità-della-diagnosi-definitiva)
  * verify: [Uso di Pino per la diagnostica](../Requirements/VoiceSatellite.md#uso-di-pino-per-la-diagnostica)
---

### Prova della diagnostica del mancato avvio del satellite

Con risorse simulate far fallire separatamente il caricamento del modello della wake word, quello del modello dell'attività vocale e l'avvio del microfono, con un messaggio marcatore nel guasto esterno; ripetere con una chiusura di pulizia che fallisce. Avviare il processo compilato con un modello di wake word presente ma non valido. Catturare `stdout`, `stderr` e codice di uscita.

#### Details
La prova passa se ogni caso produce una sola riga JSON di livello `error` con `event` `satellite_startup_failed`, il messaggio `Satellite startup failed` ed `err` con il messaggio fisso della fase; se con la pulizia fallita `err` è un `LifecycleError` con il guasto dell'avvio al primo posto; se `stderr` contiene `Unable to start Ambrogio satellite.`, il codice di uscita è 1 e `satellite_ready` non compare. Fallisce se manca l'evento o ne compaiono più di uno, se il marcatore del guasto esterno compare in un output, se la fase non è identificabile o se il processo termina con successo.

#### Metadata
  * type: test-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * satisfiedBy: [satellite.spec.ts](../../src/composition/satellite.spec.ts)
  * satisfiedBy: [main.e2e.spec.ts](../../src/main.e2e.spec.ts)
  * satisfiedBy: [satellite-process.spec.ts](../../src/runtime/satellite-process.spec.ts)
  * verify: [Diagnostica del mancato avvio del satellite](../Requirements/VoiceSatellite.md#diagnostica-del-mancato-avvio-del-satellite)
---

### Prova della selezione dei dispositivi audio

Con Decibri sostituito da aperture controllate, aprire il microfono e lo speaker senza selettore, con un selettore che inizia con `alsa:` e con un selettore per nome; poi far fallire l'apertura del dispositivo selezionato. Con risorse controllate, far fallire l'avvio del microfono durante l'avvio del satellite e la riproduzione di una trasmissione sullo speaker.

#### Details
La prova passa se senza selettore l'apertura non indica alcun dispositivo, così che Decibri usi il predefinito del sistema; se un selettore `alsa:` è passato come identificatore `{ id }` e un altro selettore come nome; se un'apertura fallita del dispositivo selezionato è tentata una sola volta e ne propaga l'errore senza una seconda apertura sul dispositivo predefinito; se il fallimento del microfono all'avvio rilascia le risorse acquisite e fa fallire l'avvio; e se il fallimento dello speaker è segnalato come guasto dell'interazione. Fallisce se una selezione esplicita viene ignorata o sostituita dal dispositivo predefinito. La prova non dimostra la selezione su periferiche reali, affidata alla «Dimostrazione della configurazione».

#### Metadata
  * type: test-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * satisfiedBy: [decibri-audio.spec.ts](../../src/adapters/out/decibri-audio.spec.ts)
  * satisfiedBy: [response-playback.spec.ts](../../src/adapters/out/response-playback.spec.ts)
  * satisfiedBy: [satellite.spec.ts](../../src/composition/satellite.spec.ts)
  * verify: [Selezione dei dispositivi audio](../Requirements/VoiceSatellite.md#selezione-dei-dispositivi-audio)
---

### Prova della sessione e delle conversazioni del satellite

Con un backend `ambrogio.v1` controllato, avviare il satellite e completare due attivazioni con la wake word e una replica senza wake word; chiudere la sessione lato backend mentre il satellite attende la wake word e durante un'interazione; ritardare `session.ready`. Ripetere lo scambio contro il backend affiancato nella cartella di lavoro, compilato e avviato soltanto tramite il suo «Ingresso di prova del server conversazionale», con componenti vocali deterministici al posto di trascrizione e sintesi; la prova contro il backend affiancato gira nella CI del satellite dopo il checkout affiancato, senza un commit fissato del backend.

#### Details
La prova passa se all'avvio esiste una sola sessione pronta, se ogni attivazione con la wake word apre una richiesta senza `conversationId` e la replica usa il `conversationId` di `turn.accepted`, se nessun messaggio o frame è inviato prima di `session.ready`, se la sessione chiusa durante l'attesa viene riaperta alla successiva attivazione senza avvisi e se la chiusura durante un'interazione produce il recupero locale senza riprendere la richiesta sulla nuova sessione. Contro il backend affiancato passa inoltre se il backend accetta la sessione, trascrive la richiesta, conserva attivazione e replica nella stessa conversazione e restituisce le trasmissioni audio e gli esiti dei contratti del protocollo. Fallisce se una richiesta, una trasmissione o un turno vengono ripresi su una sessione diversa da quella in cui sono iniziati, se il backend affiancato manca o non è compilato, o se la prova importa codice del backend diverso dal suo ingresso di prova.

#### Metadata
  * type: test-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * satisfiedBy: [verify-backend.mjs](../../scripts/verify-backend.mjs)
  * satisfiedBy: [conversation-channel.spec.ts](../../src/adapters/out/conversation-channel.spec.ts)
  * verify: [Invio soltanto su sessione pronta](../Requirements/VoiceSatellite.md#invio-soltanto-su-sessione-pronta)
  * verify: [Nuova conversazione a ogni attivazione](../Requirements/VoiceSatellite.md#nuova-conversazione-a-ogni-attivazione)
  * verify: [Sessione conversazionale persistente](../Requirements/VoiceSatellite.md#sessione-conversazionale-persistente)
  * verify: [Uso delle sole interfacce pubbliche del backend nel satellite](../Requirements/VoiceSatellite.md#uso-delle-sole-interfacce-pubbliche-del-backend-nel-satellite)
---

### Prova delle protezioni dei workflow

Leggere come testo `.github/workflows/ci.yml`, `.github/workflows/secret-scan.yml` e `.github/workflows/publish-image.yml` e confrontarli con il «Profilo comune dei workflow GitHub Actions» di `ambrogio-model` e con il contratto «Protezioni dei workflow GitHub Actions».

#### Details
La prova passa se ogni `uses:` di un'azione esterna indica uno SHA di 40 caratteri esadecimali seguito dal commento della versione maggiore e la terna di azione, SHA e versione è una di quelle del profilo comune o del contratto del satellite; se ogni checkout ha `persist-credentials: false`; se ogni `actions/setup-node` ha `package-manager-cache: false`; se i job `Satellite checks`, `Secret scan` e `publish` hanno rispettivamente `timeout-minutes` 15, 10 e 60 e ogni job che esegue passi dichiara un tempo massimo; se ogni workflow dichiara come permessi predefiniti soltanto `contents: read`; se soltanto il job `publish` dichiara permessi propri, `contents: read` e `packages: write`; se `ci.yml` e `secret-scan.yml` dichiarano `workflow_call`; e se il workflow di pubblicazione usa il gruppo di concorrenza `satellite-release-${{ github.ref }}` con `cancel-in-progress: false`, passa `GITHUB_TOKEN` a `docker login` con `--password-stdin` ed esegue `docker logout ghcr.io` con `if: always()`. Fallisce se un'azione è indicata per tag o ramo, se SHA e versione non corrispondono al contratto, se un checkout conserva le credenziali, se un job che esegue passi non ha tempo massimo o se un job diverso da `publish` riceve permessi di scrittura.

#### Metadata
  * type: test-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * satisfiedBy: [workflows.spec.ts](../../test/repository/workflows.spec.ts)
  * verify: [Privilegi e durata limitati dei workflow GitHub Actions](../Requirements/VoiceSatellite.md#privilegi-e-durata-limitati-dei-workflow-github-actions)
---

### Prova delle regole di architettura centrali del satellite

Eseguire ogni regola di `test/repository/architecture-rules.ts` sui file TypeScript di `src` e `test` che Git vede, poi sulla fixture negativa di ciascuna regola; leggere l'elenco delle eccezioni e applicarne una a una fixture con due violazioni della stessa regola.

#### Details
La prova passa se l'analisi legge anche gli import di soli tipi e risolve ogni import relativo in un file analizzato, non riporta violazioni non eccettuate nel repository, ogni fixture negativa fallisce soltanto con il nome della propria regola, ogni eccezione nomina una regola esistente, un file, un import e un motivo e corrisponde a una sola violazione reale, e un'eccezione elimina soltanto la propria violazione. Fallisce se una regola non riporta la violazione della propria fixture, se una violazione è riportata con un altro nome, se un'eccezione non corrisponde a una violazione o ne elimina altre.

#### Metadata
  * type: test-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * satisfiedBy: [architecture-rules.ts](../../test/repository/architecture-rules.ts)
  * satisfiedBy: [import-boundaries.spec.ts](../../test/repository/import-boundaries.spec.ts)
  * verify: [Regole di architettura centrali del satellite](../Requirements/VoiceSatellite.md#regole-di-architettura-centrali-del-satellite)
---

### Prova delle scadenze indipendenti dal runtime

#### Details
Con una porta controllata verificare scadenza della risposta e della replica ai limiti concordati, cancellazione alla replica, sostituzione dopo un nuovo turno, arresto e guasto senza callback residui. I test Application non devono usare fake timer globali né importare l'adapter Node.js. Provare separatamente l'adapter: esecuzione singola differita, cancellazione ripetuta e cancellazione dopo esecuzione. Riesaminare tutti i file Domain e Application, inclusi import di soli tipi, per escludere API e tipi dell'ambiente; eseguire compilazione e regressione.

#### Metadata
  * type: test-verification

#### Relations
  * derivedFrom: [Verifica del satellite vocale](#verifica-del-satellite-vocale)
  * satisfiedBy: [node-deadline-scheduler.adapter.spec.ts](../../src/adapters/out/node-deadline-scheduler.adapter.spec.ts)
  * satisfiedBy: [voice-session.use-case.spec.ts](../../src/application/voice-session.use-case.spec.ts)
  * satisfiedBy: [tsconfig.core.json](../../tsconfig.core.json)
  * verify: [Indipendenza tecnica di Domain e Application nel satellite](../Requirements/VoiceSatellite.md#indipendenza-tecnica-di-domain-e-application-nel-satellite)
  * verify: [Programmazione delle scadenze tramite porta Application](../Requirements/VoiceSatellite.md#programmazione-delle-scadenze-tramite-porta-application)
---

### Prova software delle immagini del satellite

Su ciascuna immagine verificare architettura, import delle dipendenze native Decibri e ONNX, caricamento e inferenza silenziosa dei modelli wake word distribuiti, caricamento Silero e generazione del tono di errore. Eseguire il processo senza variabili `AMBROGIO_*` e poi con `AMBROGIO_ENV=production` e un `AMBROGIO_BACKEND_URL` invalido: uscita 2 e una sola riga JSON informativa con la variabile rifiutata, nessun avvio audio. Verificare che l'immagine non imposti variabili `AMBROGIO_*` e non contenga file di configurazione o d'ambiente, e le etichette dell'immagine: `org.opencontainers.image.source` con l'URL del repository e `org.opencontainers.image.licenses` con `MIT`. Le prove devono funzionare senza rete né periferiche e fallire se manca un artefatto necessario; non sostituiscono le prove audio reali.

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
  * satisfiedBy: [voice-session.use-case.spec.ts](../../src/application/voice-session.use-case.spec.ts)
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
