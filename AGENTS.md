# Istruzioni per gli agenti

Questo repository contiene il client satellite vocale di Ambrogio. Le regole comuni a tutti i repository sono in `ambrogio-model/AGENTS.md` e valgono anche qui; questo file aggiunge soltanto le indicazioni proprie del satellite.

## Un solo modello

- Il modello Reqvire di Ambrogio è uno solo: la cartella `system-model/` di questo repository ne è una parte, insieme a quelle di `ambrogio-model` e degli altri repository di prodotto affiancati nella stessa cartella di lavoro. Il modello si legge, si modifica e si valida dalla cartella di lavoro, mai da questo repository da solo.
- Prima di lavorare, controllare `git rev-parse --show-toplevel` e il branch di ogni repository interessato. Un cambiamento che tocca più repository usa lo stesso nome di branch in ciascuno.
- La capability «Interazione vocale dal satellite» deriva da «Conversazione a voce» di `ambrogio-model`. I requisiti locali che raffinano una decisione comune la collegano con `derivedFrom`; i requisiti che dipendono dal protocollo `ambrogio.v1` collegano direttamente con Contract References i contratti posseduti da `ambrogio-backend`. Il satellite non fissa una revisione del backend: la compatibilità fra release segue le versioni d'interfaccia, come indicato in `ambrogio-model/AGENTS.md`.
- I termini condivisi del prodotto, come satellite vocale, interazione vocale, turno vocale, risposta parlata e backend, appartengono al «Lessico Ambrogio» di `ambrogio-model`; il lessico e l'ontologia di questo repository descrivono soltanto i termini propri del satellite e si collegano a quelli condivisi.
- Il codice di produzione del satellite non importa codice del backend. Le prove di integrazione usano il backend affiancato nella cartella di lavoro, compilato, tramite il suo ingresso di prova pubblico.

## Reqvire

- Usare soltanto la CLI Reqvire, alla versione scritta in `ambrogio-model/.reqvire-version`, eseguita sulla cartella di lavoro; non si usano server MCP Reqvire. La documentazione ufficiale di Reqvire, <https://reqvire.org/>, è il riferimento per il metodo e per i comandi disponibili nella versione adottata.
- Quando la CLI non offre l'operazione, modificare direttamente il file Markdown del modello e poi eseguire `format`, `validate` e `lint` sulla cartella di lavoro.
- Prima di un push eseguire `pnpm verify` in questo repository, che ripete in locale i controlli della CI nello stesso ordine: controlli dell'intero modello con `ambrogio-model/scripts/model-checks`, installazione congelata, audit delle dipendenze, preparazione del backend affiancato, `pnpm typecheck`, `pnpm test`, `pnpm build` e `pnpm test:backend`; per le modifiche significative eseguire anche `ambrogio-model/scripts/change-impact-composite`. Interpretare i risultati: il collegamento a un test non ne certifica il successo.
- pnpm si usa alla versione di `packageManager` di `package.json`; CI e `Dockerfile` la attivano con Corepack.
- Le regole di architettura sugli import hanno un nome stabile e stanno in `test/architecture/architecture-rules.ts`; un'eccezione si aggiunge soltanto nell'elenco `exceptions`, con il motivo, e nel contratto «Regole di architettura del satellite».

## Ordine di lavoro

Prima di introdurre una scelta tecnica o architetturale nuova, presentare alternative e conseguenze, concordare la decisione con la persona e registrarla nel modello prima del codice. Le decisioni già prese non richiedono nuova conferma. Per nuove capacità o modifiche funzionali seguire l'ordine di `ambrogio-model/AGENTS.md`; leggere requisiti, contratti e verifiche prima di cambiare il comportamento pubblico.

Le prove con microfono, speaker e hardware reali sono verifiche manuali del modello: registrarne l'esito nel messaggio del commit o nella pull request, descrivendo l'ambiente in termini generici. Quando cambiano un comportamento pubblico, la configurazione del satellite o un evento diagnostico, aggiornare nello stesso lavoro le pagine interessate di `ambrogio-docs`. Al termine, riportare modifiche, controlli e attività ancora aperte.

## Segreti e dati di installazione

Il repository usa gitleaks secondo le regole di `ambrogio-model/AGENTS.md`: in CI su tutta la storia (`.github/workflows/secret-scan.yml`, richiesto anche dalla pubblicazione delle immagini) e in locale con l'hook `.githooks/pre-commit`, da attivare in ogni clone con `git config core.hooksPath .githooks` e con `gitleaks` nel `PATH`. Dopo la scansione l'hook esegue i controlli dell'intero modello con `../ambrogio-model/scripts/model-checks`: `ambrogio-model` deve essere affiancato al repository, altrimenti il commit è bloccato. Non aggirare l'hook con `--no-verify`. Esempi e test usano solo valori segnaposto e nessun dato di una specifica installazione, come nomi di dispositivi audio, nomi host o nomi di stanze.
