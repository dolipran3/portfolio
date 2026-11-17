# Vox Bridge

## Présentation

Vox Bridge (écrit aussi « VoxBridge ») est un projet réalisé dans le cadre de ma formation, en binôme. Il s'agit d'une solution de traduction et de transcription en temps réel conçue pour les réunions en visioconférence. Elle convertit les échanges oraux en texte, les traduit, puis les restitue en format audio afin de faciliter le suivi des réunions, notamment lorsque les participants ne parlent pas la même langue.

Le projet est présenté sous forme de case 3D dans le portfolio.

## Contexte du projet

- **Type de projet** : projet scolaire réalisé en duo.
- **Consigne** : mettre en pratique nos compétences techniques en intelligence artificielle, sans aller trop loin, et concevoir une solution commercialisable.
- **Sujet choisi** : avec mon binôme, nous avons décidé de créer une solution de traduction instantanée pour les réunions.
- **Contrainte importante** : le projet est techniquement réalisable sans intelligence artificielle, mais le cahier des charges imposait d'intégrer une composante IA. L'IA est donc un choix de conception répondant à cette exigence.

## Objectif du projet

Permettre à des participants de réunions en ligne de se comprendre malgré la barrière de la langue, en proposant :

1. une transcription en temps réel de ce qui est dit à l'oral,
2. une traduction instantanée de ce texte,
3. une restitution audio du contenu traduit.

L'idée était aussi de répondre à un besoin réel et de proposer un produit potentiellement commercialisable.

## Fonctionnalités

- Transcription de la parole en texte en temps réel (STT, Speech-to-Text).
- Traduction instantanée du texte grâce à un modèle de langage (LLM).
- Restitution des échanges en format audio.
- Conçu pour s'intégrer aux plateformes de visioconférence.

## Technologies utilisées

| Catégorie | Outil / technologie |
|---|---|
| Front-end | React |
| Back-end | FastAPI (Python) |
| Reconnaissance vocale | STT (Speech-to-Text) |
| Intelligence artificielle | LLM (Large Language Model) |
| Versionnement | Git |
| Conteneurisation | Docker |



## Organisation du travail en binôme

Le travail a été réparti selon nos points forts :

- **Moi** : je me suis concentrée sur l'aspect **application commercialisable** : analyse du besoin, étude de ce qui était possible et pertinent de faire, réflexion sur la viabilité du produit.
- **Mon binôme** : il s'est concentré sur la **partie création technique** du projet, c'est-à-dire le développement de la solution.

## Compétences mises en œuvre

- Analyse de marché et réflexion sur la commercialisation d'une solution.
- Intégration d'une brique d'intelligence artificielle (STT et LLM) dans une application.
- Développement web (React, FastAPI).
- Travail collaboratif avec Git et déploiement avec Docker.
- Gestion de projet en binôme.

## Questions fréquentes

**Qu'est-ce que Vox Bridge ?**
Une solution de transcription et de traduction en temps réel pour les réunions en visioconférence, qui convertit la parole en texte, la traduit et la restitue en audio.

**Pourquoi ce projet ?**
C'était un projet scolaire visant à appliquer nos compétences en IA et à concevoir une solution commercialisable.

**L'IA est-elle indispensable au projet ?**
Non, le concept peut être réalisé sans IA. Elle a été intégrée car le cahier des charges l'exigeait, et elle apporte la traduction via un LLM.

**Quelles technologies ont été utilisées ?**
React, FastAPI, un système de reconnaissance vocale (STT), un LLM, Git et Docker.

**Quel a été ton rôle ?**
Je me suis occupée de la dimension commerciale du projet : définir ce qui était faisable et pertinent pour en faire une application commercialisable. Mon binôme a pris en charge la partie création technique.

**Le projet était-il individuel ?**
Non, il a été réalisé en duo.