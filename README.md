# ambrogio-satellite

Client satellite per l'interazione vocale con Ambrogio. Il repository possiede il proprio modello Reqvire in `system-model/`; `ambrogio-backend` possiede il contratto pubblico del canale vocale.

## Stato

Repository inizializzato. Piattaforma, dispositivo, stack, struttura interna e comportamento locale del satellite sono ancora da decidere e registrare nel modello prima di implementare il client.

Il contratto vocale da esaminare è «Protocollo vocale del prodotto» in `ambrogio-backend/system-model/Contracts/FamilyConversation.md`, al commit `76e656f08f2e6675762bd93f28208b3ac3fe299d`. Il backend avverte che il satellite dello spike potrebbe richiedere un aggiornamento: l'integrazione va verificata contro la versione scelta.

## Modello

Eseguire Reqvire dalla radice di questo repository. L'MCP del satellite deve usare una porta diversa dagli MCP degli altri repository, così ogni sessione resta legata al proprio modello.
