# Elements

### Ontologia del satellite vocale

Schema strutturale autonomo del sistema satellite. Il backend è un sistema esterno: qui si rappresenta il suo ruolo al confine vocale, senza importare la sua ontologia o la sua storia conversazionale.

Domande a cui il grafo deve poter rispondere: quale configurazione e quali dispositivi usa il satellite? Quale modello distribuito può essere selezionato? Quale attivazione apre un'interazione con il backend? Quali turni e risposte appartengono alla stessa interazione? Quale risposta segnala che attende una replica? Dove si trova la riserva audio temporanea?

#### Ontology
```turtle
@prefix sat: <https://github.com/adrianofoschi/ambrogio-satellite/ontology/voice-satellite#> .
@prefix concept: <https://github.com/adrianofoschi/ambrogio-satellite/concepts#> .
@prefix reqvire: <https://www.reqvire.org/ontology#> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

<https://github.com/adrianofoschi/ambrogio-satellite/ontology/voice-satellite> a owl:Ontology ;
  rdfs:comment "Vocabolario strutturale autonomo del satellite vocale Ambrogio." .

sat:VoiceSatellite a owl:Class ;
  rdfs:comment "Sistema di interesse che acquisisce e riproduce audio, riconosce la wake word in locale e dialoga con il backend." ;
  reqvire:mapsToConcept concept:SatelliteVocale .

sat:VoiceBackend a owl:Class ;
  rdfs:comment "Sistema esterno responsabile del canale vocale e dell'esito conversazionale." ;
  reqvire:mapsToConcept concept:BackendVocale .

sat:AudioDevice a owl:Class ;
  rdfs:comment "Periferica audio usata dal satellite." ;
  reqvire:mapsToConcept concept:DispositivoAudio .

sat:AudioInputDevice a owl:Class ;
  rdfs:subClassOf sat:AudioDevice ;
  rdfs:comment "Periferica che acquisisce la voce della famiglia." .

sat:AudioOutputDevice a owl:Class ;
  rdfs:subClassOf sat:AudioDevice ;
  rdfs:comment "Periferica che riproduce audio per la famiglia." .

sat:SatelliteConfiguration a owl:Class ;
  rdfs:comment "Selezione delle risorse e del backend usati dal processo satellite." ;
  reqvire:mapsToConcept concept:ConfigurazioneDelSatellite .

sat:WakeWordCatalog a owl:Class ;
  rdfs:comment "Insieme dei modelli di wake word distribuiti con il satellite." ;
  reqvire:mapsToConcept concept:CatalogoDelleWakeWord .

sat:WakeWordModel a owl:Class ;
  rdfs:comment "Risorsa distribuita per riconoscere localmente una wake word." ;
  reqvire:mapsToConcept concept:ModelloDiWakeWord .

sat:LocalActivation a owl:Class ;
  rdfs:comment "Riconoscimento locale della wake word che tenta di aprire un'interazione." ;
  reqvire:mapsToConcept concept:AttivazioneLocale .

sat:AudioBuffer a owl:Class ;
  rdfs:comment "Riserva temporanea in memoria dell'audio acquisito durante l'attivazione." ;
  reqvire:mapsToConcept concept:RiservaAudio .

sat:VoiceInteraction a owl:Class ;
  rdfs:comment "Sessione temporanea tra satellite e backend che può contenere più turni." ;
  reqvire:mapsToConcept concept:InterazioneVocale .

sat:VoiceTurn a owl:Class ;
  rdfs:comment "Richiesta pronunciata durante un'interazione vocale." ;
  reqvire:mapsToConcept concept:TurnoVocale .

sat:SpokenResponse a owl:Class ;
  rdfs:comment "Risposta vocale del backend riprodotta dal satellite per un turno." ;
  reqvire:mapsToConcept concept:RispostaParlata .

sat:hasConfiguration a owl:ObjectProperty ;
  rdfs:domain sat:VoiceSatellite ;
  rdfs:range sat:SatelliteConfiguration .

sat:usesInputDevice a owl:ObjectProperty ;
  rdfs:domain sat:VoiceSatellite ;
  rdfs:range sat:AudioInputDevice .

sat:usesOutputDevice a owl:ObjectProperty ;
  rdfs:domain sat:VoiceSatellite ;
  rdfs:range sat:AudioOutputDevice .

sat:hasCatalog a owl:ObjectProperty ;
  rdfs:domain sat:VoiceSatellite ;
  rdfs:range sat:WakeWordCatalog .

sat:offersModel a owl:ObjectProperty ;
  rdfs:domain sat:WakeWordCatalog ;
  rdfs:range sat:WakeWordModel .

sat:selectsModel a owl:ObjectProperty ;
  rdfs:domain sat:SatelliteConfiguration ;
  rdfs:range sat:WakeWordModel .

sat:opensInteraction a owl:ObjectProperty ;
  rdfs:domain sat:LocalActivation ;
  rdfs:range sat:VoiceInteraction .

sat:usesAudioBuffer a owl:ObjectProperty ;
  rdfs:domain sat:LocalActivation ;
  rdfs:range sat:AudioBuffer .

sat:connectsToBackend a owl:ObjectProperty ;
  rdfs:domain sat:VoiceInteraction ;
  rdfs:range sat:VoiceBackend .

sat:hasTurn a owl:ObjectProperty ;
  rdfs:domain sat:VoiceInteraction ;
  rdfs:range sat:VoiceTurn .

sat:hasSpokenResponse a owl:ObjectProperty ;
  rdfs:domain sat:VoiceTurn ;
  rdfs:range sat:SpokenResponse .

sat:expectsReply a owl:DatatypeProperty ;
  rdfs:domain sat:SpokenResponse ;
  rdfs:range xsd:boolean ;
  rdfs:comment "Valore comunicato dal backend che indica se la risposta attende un ulteriore turno nella stessa interazione." ;
  reqvire:mapsToConcept concept:IndicazioneDiReplicaAttesa .

sat:theSatellite a owl:NamedIndividual, sat:VoiceSatellite ;
  rdfs:comment "Il sistema di interesse descritto da questo repository." .
```

#### Metadata
  * type: ontology
  * ontology_base: https://github.com/adrianofoschi/ambrogio-satellite/ontology/voice-satellite
  * ontology_prefix: sat
---
