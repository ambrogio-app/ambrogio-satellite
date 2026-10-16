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
Rendere irraggiungibile il backend e attivare il satellite: si ascolta un messaggio preregistrato locale e il processo torna in attesa. Ripristinare il backend: senza una nuova attivazione non viene reinviata la richiesta fallita; con una nuova wake word viene tentata una nuova interazione.

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
Con ogni modello del catalogo, dimostrare che la pipeline ONNX nel processo Node.js riconosce localmente la wake word e apre successivamente il canale, senza un servizio esterno di rilevamento. Prima della wake word osservare che non viene aperta l’interazione vocale backend. Con una frase continua nota controllare l’audio consegnato al backend e accertare che l’inizio della richiesta non sia perso. Ripetere su entrambe le architetture con latenza entro i limiti della riserva che saranno concordati. Verificare Hey Jarvis come scelta predefinita e provare separatamente le frasi esatte «Hey Jarvis», «Hey Mycroft» e «Hey Alexa», anche seguite senza pausa da una richiesta. La voce «Hey Alexa» non supera la verifica se il modello candidato riconosce soltanto «Alexa» in modo affidabile. Registrare i mancati riconoscimenti e le attivazioni spurie osservati; le soglie statistiche di accettazione restano da concordare.

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
Contro la revisione backend compatibile fissata nel contratto, riprodurre una risposta completa; parlare durante la riproduzione e verificare che non la interrompa né apra un turno. Provare `Message` Micdrop dell'assistente con `metadata.expectsReply` uguale a `true` e `false`, sia prima sia dopo la fine dell'audio: solo nel primo caso una replica senza wake word appartiene alla stessa interazione. Con audio controllato, inserire pause inferiori, uguali e superiori a 1000 ms fra i blocchi: la riproduzione e la finestra di stabilità devono ripartire a ogni nuovo blocco, e va registrato il rischio di chiusura prematura per le pause più lunghe. Provare messaggio prima del primo audio e audio prima del messaggio, senza chiusura prima del primo audio. Decibri deve svuotare la propria coda prima del completamento stimato. Se l'audio non inizia o non termina, il timeout chiude la chiamata senza aprire la replica.

Con metadati assenti, valore non booleano o messaggio che non arriva, il satellite non inferisce una risposta dalla punteggiatura né apre una replica; dopo al massimo l'intervallo di inattività configurato chiude e torna alla wake word. Provare anche un rifiuto vocale parlato con `expectsReply: false`: la chiamata termina solo dopo la riproduzione, senza conservare il turno rifiutato. Dopo la chiusura per inattività occorre una nuova wake word. Non è richiesto un nuovo segnale backend; registrare l'esito della prova con i soli stati standard Micdrop.

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
Su Linux x86_64 e arm64, con audio acquisito e con file di prova, usare Silero ONNX per una richiesta continua dopo la wake word, una replica breve come «sì» e una frase con una pausa interna. Accertare che ogni turno ammesso produca un solo `StartSpeaking`, i frame PCM16 mono a 16 kHz e un solo `StopSpeaking`, senza perdere la replica breve né spezzare la frase alla pausa. Durante la riproduzione della risposta non devono partire nuovi turni. Registrare tempi di delimitazione e consumo di CPU; soglie quantitative di accettazione restano da definire prima della prova finale.

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

