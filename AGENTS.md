# Istruzioni per gli agenti

Questo repository contiene il client satellite vocale di Ambrogio. Il workspace Reqvire canonico è la radice di questo repository e il modello è in `system-model/`. Il backend e il contratto pubblico della voce appartengono al repository separato `ambrogio-backend`.

Prima di usare Reqvire, verificare radice Git, branch e workspace interessato. Non trattare i modelli di repository diversi come un unico grafo.

Prima di introdurre una scelta tecnica o architetturale nuova, presentare alternative e conseguenze, concordare la decisione con la persona e registrarla nel modello prima del codice. Seguire per le modifiche funzionali l'ordine: capability, concetti e ontologie se utili, requisiti, contratti, contratti semantici se necessari, verifiche, test e implementazione, validazione e revisione.

Consultare la documentazione ufficiale di Reqvire su https://reqvire.org/ e verificare i comandi della versione installata. Usare soltanto la CLI Reqvire 1.3.2, per l'authoring come per i controlli ripetibili; non si usano server MCP Reqvire. Quando la CLI non offre l'operazione, modificare direttamente il file Markdown del modello e poi eseguire `format`, `validate` e `lint`.

Il modello del satellite deve registrare la versione compatibile del contratto vocale posseduto dal backend e le proprie obbligazioni. Dopo modifiche significative, eseguire `validate`, `lint`, `coverage` e `change-impact` e interpretare i risultati. Un collegamento a un test non ne certifica l'esito. Valutare l'impatto su sito e documentazione utente nei rispettivi repository esterni quando cambia un comportamento pubblico.

Segreti: il repository usa gitleaks 8.30.1, in CI su tutta la storia (`.github/workflows/secret-scan.yml`, richiesto anche dalla pubblicazione delle immagini) e in locale con l'hook `.githooks/pre-commit`, da attivare in ogni clone con `git config core.hooksPath .githooks` e con `gitleaks` nel `PATH`. Non aggirare l'hook con `--no-verify`; un ritrovamento si risolve rimuovendo il segreto, e ruotandolo se è già stato committato. Un falso positivo richiede un'eccezione concordata con la persona e registrata nel modello. Esempi e test usano solo valori segnaposto.

Dati di installazione: il modello Reqvire registra obblighi e decisioni del prodotto, non dati di una specifica installazione. Non riportare in modelli, codice, test, commit o documentazione indirizzi IP, nomi host, domini, percorsi personali, credenziali, identificativi di dispositivi o entità, nomi di stanze, né la configurazione effettiva di chi usa il prodotto. Le evidenze di prove su installazioni reali descrivono l'ambiente in termini generici: per esempio «l'installazione di riferimento», l'architettura, l'hardware o la versione usata. Gli esempi usano valori segnaposto o indirizzi di esempio.
