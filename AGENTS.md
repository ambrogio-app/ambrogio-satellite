# Istruzioni per gli agenti

Questo repository contiene il client satellite vocale di Ambrogio. Il workspace Reqvire canonico è la radice di questo repository e il modello è in `system-model/`. Il backend e il contratto pubblico della voce appartengono al repository separato `ambrogio-backend`.

Prima di usare Reqvire, verificare radice Git, branch e workspace interessato. Non trattare i modelli o le sessioni MCP di repository diversi come un unico grafo. Usare una porta MCP distinta da quelle del backend e di `ambrogio-cli`; la porta locale prevista per questo repository è `8084`.

Prima di introdurre una scelta tecnica o architetturale nuova, presentare alternative e conseguenze, concordare la decisione con la persona e registrarla nel modello prima del codice. Seguire per le modifiche funzionali l'ordine: capability, concetti e ontologie se utili, requisiti, contratti, contratti semantici se necessari, verifiche, test e implementazione, validazione e revisione.

Consultare la documentazione ufficiale di Reqvire su https://reqvire.org/ e verificare i comandi della versione installata. Preferire MCP per l'authoring e CLI per i controlli ripetibili. Non modificare direttamente il modello mentre una sessione MCP con mutazioni ne possiede lo snapshot.

Il modello del satellite deve registrare la versione compatibile del contratto vocale posseduto dal backend e le proprie obbligazioni. Dopo modifiche significative, eseguire `validate`, `lint`, `coverage` e `change-impact` e interpretare i risultati. Un collegamento a un test non ne certifica l'esito. Valutare l'impatto su sito e documentazione utente nei rispettivi repository esterni quando cambia un comportamento pubblico.

Segreti: il repository usa gitleaks 8.30.1, in CI su tutta la storia (`.github/workflows/secret-scan.yml`, richiesto anche dalla pubblicazione delle immagini) e in locale con l'hook `.githooks/pre-commit`, da attivare in ogni clone con `git config core.hooksPath .githooks` e con `gitleaks` nel `PATH`. Non aggirare l'hook con `--no-verify`; un ritrovamento si risolve rimuovendo il segreto, e ruotandolo se è già stato committato. Un falso positivo richiede un'eccezione concordata con la persona e registrata nel modello. Esempi e test usano solo valori segnaposto.
