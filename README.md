# ambrogio-satellite

Client satellite per l'interazione vocale con Ambrogio. Il repository possiede il proprio modello Reqvire in `system-model/`; `ambrogio-backend` possiede il contratto pubblico del canale vocale.

## Stato

Modello salvato tramite MCP Reqvire: una capability, un lessico locale con 14 concetti, un’ontologia strutturale, 42 requisiti, 16 contratti, un obiettivo di verifica e 13 verifiche pianificate. L'implementazione è iniziata dal progetto TypeScript e dal caricamento e dalla validazione del file di configurazione; la pipeline audio non è ancora disponibile. Il modello è il riferimento autorevole; questo README ne riepiloga le decisioni.

## Decisioni concordate il 16 ottobre 2026

- Linux su x86_64 e arm64, senza un dispositivo hardware obbligatorio.
- TypeScript ESM e Node.js 24 o successivo, con pnpm e Vitest; esecuzione diretta sull'host con le dipendenze installate e Docker facoltativo, con stessa applicazione e configurazione.
- Separazione Domain, Application e adapter in un solo progetto nel repository, senza workspace multipackage. Domain possiede stati e regole dell'interazione; Application coordina i casi d'uso e definisce le porte; gli adapter integrano audio, riconoscimento e backend. Le librerie tecniche restano fuori da Domain e Application.
- Rifiuti ed esiti previsti come valori tipizzati; guasti inattesi come eccezioni, gestiti e diagnosticati ai confini tecnici.
- File JSON a sezioni `backend`, `audio`, `wakeWord` e `interaction`, validato all'avvio. `backend.baseUrl` è l'URL base HTTP(S) da cui il satellite ricava il canale WebSocket `/api/voice`; `wakeWord.model` sceglie un modello distribuito e `interaction.replyTimeoutMs` ha il valore predefinito di 15 secondi. `--config` seleziona il file; le variabili d'ambiente non sovrascrivono i valori. `audio.microphone` e `audio.speaker` sono selettori facoltativi: se assenti si usano i dispositivi di sistema, mentre un selettore esplicito non ricade silenziosamente sul dispositivo predefinito.
- Ascolto continuo con riconoscimento della wake word esclusivamente sul satellite; la connessione per l'interazione vocale si apre dopo l'attivazione.
- Catalogo iniziale delle wake word: «Hey Jarvis» (predefinita), «Hey Mycroft» e «Hey Alexa», selezionabili tramite configurazione fra i modelli distribuiti e supportati dal progetto. La prima versione non accetta modelli personalizzati esterni. Il modello openWakeWord «alexa» è addestrato per «Alexa»: la frase «Hey Alexa» richiede una verifica specifica prima di scegliere il file da distribuire.
- Il riconoscimento locale della wake word usa modelli openWakeWord ONNX nel processo Node.js, tramite ONNX Runtime. Non richiede un servizio Wyoming separato. Lo spike ne mostra la fattibilità iniziale, ma la distribuzione finale va provata su x86_64 e arm64.
- La delimitazione dei turni vocali usa Silero VAD ONNX nel processo Node.js. Deve preservare risposte brevi e richieste con pause interne; versione del modello, soglie, latenza e consumo di CPU saranno fissati dopo prove sulle due architetture.
- Gli adapter audio usano Decibri per microfono e speaker. La fine della risposta coincide con la fine effettiva della riproduzione; l'esecuzione Linux deve includere la libreria runtime ALSA e l'accesso ai dispositivi configurati.
- Il trasporto vocale usa `@micdrop/client` 3.4.0 e i messaggi standard Micdrop. Una patch locale temporanea protegge gli invii durante l'apertura della WebSocket; una prova deve coprire il difetto e la compatibilità con il backend. La riconnessione automatica è disabilitata, perché ogni nuova connessione crea una nuova conversazione. La fine della riproduzione e l'intervallo di inattività sono gestiti localmente; non serve inviare `Played`.
- I modelli wake word distribuiti sono destinati all'uso non commerciale; ogni modello incluso deve avere origine, licenza, condizioni di redistribuzione e attribuzioni verificate e consegnate con i pacchetti host e container. La licenza dei modelli è distinta da quella del codice del satellite.
- È possibile pronunciare «Hey Jarvis» e la richiesta senza una pausa obbligatoria. Una riserva temporanea di audio in memoria evita di perdere l'inizio della richiesta durante riconoscimento e apertura della connessione.
- La prima versione attende la fine della risposta parlata e non permette di interromperla con la voce.
- Quando l'assistente richiede una replica, la persona risponde senza ripetere la wake word nella stessa interazione. Il backend stabilisce e segnala esplicitamente se attende una replica. Altrimenti il satellite torna in attesa della wake word.
- Se il caso d'uso condiviso del backend rifiuta un turno vocale, il backend invia una risposta parlata sicura con `Message.metadata.expectsReply: false`; il satellite la riproduce completamente e torna alla wake word.
- Se il backend non è raggiungibile, il satellite riproduce un messaggio parlato preregistrato locale, incluso nella distribuzione, e torna in attesa della wake word. Una nuova attivazione tenta una nuova interazione; la richiesta fallita non viene conservata per un reinvio automatico.

Sono state recepite anche le regole del backend su composition root, confini degli import nei test, Result ed esiti esaustivi, conservazione delle cause, diagnosi unica al confine tecnico, log JSON su stdout, esclusione dei contenuti sensibili dai log e delle registrazioni audio persistenti, configurazione validata prima della costruzione delle risorse e distribuita ai soli componenti interessati. Vitest è il runner dei test; la libreria di logging resta da scegliere.

## Modello e lavoro ancora aperto

Le decisioni sono registrate in [lessico](system-model/Thesaurus/Lessico.md), [ontologia](system-model/Ontologies/VoiceSatellite.md), [requisiti](system-model/Requirements/VoiceSatellite.md), [contratti](system-model/Contracts/VoiceSatellite.md) e [verifiche](system-model/Verifications/VoiceSatellite.md). Lessico e ontologia appartengono al satellite e definiscono i suoi termini e le sue relazioni senza dipendere dal modello backend. Il backend produce durante la generazione il booleano strutturato `expectsReply`, senza una seconda chiamata al modello dedicata alla classificazione, e lo invia in `Message.metadata.expectsReply` di Micdrop. La compatibilità con il satellite resta da verificare con il client reale.

È implementata e verificata nel backend l’elaborazione parallela di conversazioni diverse, con al massimo un turno attivo per ciascuna conversazione. Eventuali limiti globali di capacità restano da concordare.

Le verifiche pianificate coprono frase continua, riconoscimento locale, catalogo distribuito, repliche richieste dal backend, assenza di interruzioni vocali, recupero con messaggio locale, configurazione, architettura ed esecuzione su entrambe le architetture con e senza Docker. I collegamenti di verifica non indicano prove eseguite. Per le funzionalità ancora aperte occorre completare i contratti e preparare i test pertinenti secondo `AGENTS.md`.

Lo spike in `/home/adriano/projects/ambrogio-spike/satellite/spike/` è una fonte di evidenze e limiti tecnici, non un vincolo sul protocollo o sul codice definitivo. Restano da scegliere le versioni delle altre dipendenze e dei modelli distribuiti. Il testo del messaggio locale, le soglie di riconoscimento, i limiti della riserva audio e la gestione dei guasti durante un'interazione richiedono ancora specificazione.

Il contratto vocale da esaminare è «Protocollo vocale del prodotto» in `ambrogio-backend/system-model/Contracts/FamilyConversation.md`, al commit candidato `512317c9e93b4e6ab7a1e32dd9c210436b7b5c06`. L'integrazione va verificata contro questa revisione con il client satellite reale.

## Modello

Eseguire Reqvire dalla radice di questo repository. L'MCP del satellite deve usare una porta diversa dagli MCP degli altri repository, così ogni sessione resta legata al proprio modello.
