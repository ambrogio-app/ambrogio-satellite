# ambrogio-satellite

Client satellite per l'interazione vocale con Ambrogio. Il repository possiede il proprio modello Reqvire in `system-model/`; `ambrogio-backend` possiede il contratto pubblico del canale vocale.

## Stato

Modello iniziale salvato tramite MCP Reqvire: una capability, 39 requisiti, 10 contratti, un obiettivo di verifica e 10 verifiche pianificate. L’implementazione non è ancora iniziata. Il modello è il riferimento autorevole; questo README ne riepiloga le decisioni.

## Decisioni concordate il 16 ottobre 2026

- Linux su x86_64 e arm64, senza un dispositivo hardware obbligatorio.
- TypeScript e Node.js; esecuzione diretta sull'host con le dipendenze installate e Docker facoltativo, con stessa applicazione e configurazione.
- Separazione Domain, Application e adapter in un solo progetto nel repository, senza workspace multipackage. Domain possiede stati e regole dell'interazione; Application coordina i casi d'uso e definisce le porte; gli adapter integrano audio, riconoscimento e backend. Le librerie tecniche restano fuori da Domain e Application.
- Rifiuti ed esiti previsti come valori tipizzati; guasti inattesi come eccezioni, gestiti e diagnosticati ai confini tecnici.
- File JSON validato all'avvio, contenente indirizzo del backend, dispositivi audio e selezione del modello della wake word. Un'opzione seleziona il percorso del file; le variabili d'ambiente non sovrascrivono i valori. Una configurazione invalida impedisce l'avvio.
- Ascolto continuo con riconoscimento della wake word esclusivamente sul satellite; la connessione per l'interazione vocale si apre dopo l'attivazione.
- Wake word predefinita «Hey Jarvis», selezionabile tramite configurazione fra i modelli distribuiti e supportati dal progetto. La prima versione non accetta modelli personalizzati esterni.
- È possibile pronunciare «Hey Jarvis» e la richiesta senza una pausa obbligatoria. Una riserva temporanea di audio in memoria evita di perdere l'inizio della richiesta durante riconoscimento e apertura della connessione.
- La prima versione attende la fine della risposta parlata e non permette di interromperla con la voce.
- Quando l'assistente richiede una replica, la persona risponde senza ripetere la wake word nella stessa interazione. Il backend stabilisce e segnala esplicitamente se attende una replica. Altrimenti il satellite torna in attesa della wake word.
- Se il backend non è raggiungibile, il satellite riproduce un messaggio parlato preregistrato locale, incluso nella distribuzione, e torna in attesa della wake word. Una nuova attivazione tenta una nuova interazione; la richiesta fallita non viene conservata per un reinvio automatico.

Sono state recepite anche le regole del backend su composition root, confini degli import nei test, Result ed esiti esaustivi, conservazione delle cause, diagnosi unica al confine tecnico, log JSON su stdout, esclusione dei contenuti sensibili dai log e delle registrazioni audio persistenti, configurazione validata prima della costruzione delle risorse e distribuita ai soli componenti interessati. La libreria di logging e il runner dei test restano da scegliere.

## Modello e lavoro ancora aperto

Le decisioni sono registrate in [requisiti](system-model/Requirements/VoiceSatellite.md), [contratti](system-model/Contracts/VoiceSatellite.md) e [verifiche](system-model/Verifications/VoiceSatellite.md). Nel modello backend sono stati aggiunti gli obblighi di determinare e segnalare l’attesa di una replica, il relativo contratto e una dimostrazione pianificata. Il codice backend della revisione di riferimento non implementa ancora il segnale: nome, forma e meccanismo di determinazione restano da definire e la compatibilità con il satellite non è ancora dimostrata.

È concordata e registrata nel modello backend l’elaborazione parallela di conversazioni diverse, con al massimo un turno attivo per ciascuna conversazione. Implementazione e verifiche devono ancora essere adeguate; il passaggio ad AI SDK non dimostra da solo la rimozione del blocco globale. Eventuali limiti globali di capacità restano da concordare.

Le verifiche pianificate coprono frase continua, riconoscimento locale, catalogo distribuito, repliche richieste dal backend, assenza di interruzioni vocali, recupero con messaggio locale, configurazione, architettura ed esecuzione su entrambe le architetture con e senza Docker. I collegamenti di verifica non indicano prove eseguite. Prima del codice occorre completare i contratti aperti e preparare i test pertinenti secondo `AGENTS.md`.

Lo spike in `/home/adriano/projects/ambrogio-spike/satellite/spike/` è una fonte di evidenze e limiti tecnici, non un vincolo sulle librerie o sul protocollo. Non sono ancora scelti motore wake word, VAD, libreria audio, libreria di trasporto, versioni delle dipendenze e catalogo aggiuntivo dei modelli distribuiti. Il testo del messaggio locale, i limiti della riserva audio e la gestione dei guasti durante un'interazione richiedono ancora specificazione.

Il contratto vocale da esaminare è «Protocollo vocale del prodotto» in `ambrogio-backend/system-model/Contracts/FamilyConversation.md`, al commit `76e656f08f2e6675762bd93f28208b3ac3fe299d`. Il backend avverte che il satellite dello spike potrebbe richiedere un aggiornamento: l'integrazione va verificata contro la versione scelta.

## Modello

Eseguire Reqvire dalla radice di questo repository. L'MCP del satellite deve usare una porta diversa dagli MCP degli altri repository, così ogni sessione resta legata al proprio modello.
