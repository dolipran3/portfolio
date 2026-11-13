# Projet de fin d'études — Création d'une mémoire pour des modèles de langage

## Contexte

Ce projet de fin d'études a été réalisé chez **Orange Innovation**, au sein de l'équipe **Deskin, Data & IA**, à Lannion, pendant l'année scolaire **2025–2026**. Le projet portait sur la création d'une mémoire persistante pour les assistants conversationnels de la plateforme interne **Dinootoo**.

Un assistant fondé sur un LLM ne conserve pas nécessairement les informations d'une session à l'autre, et sa fenêtre de contexte est limitée. L'objectif était donc d'étudier comment extraire des informations utiles des conversations, les stocker, puis les réutiliser pour personnaliser les réponses.

## Démarche et solution développée

Le travail a été principalement mené en autonomie, avec l'accompagnement d'un co-encadrant d'alternance. Plusieurs travaux de recherche ont été étudiés et des solutions existantes comparées, notamment **Mem0** et **LangMem**. Le projet a été structuré autour de quatre fonctions : **extraction, stockage, réutilisation et évaluation**, avec une concentration sur l'extraction, le stockage et l'évaluation.

La solution développée suit les étapes suivantes :

1. **Constitution d'un corpus synthétique** : génération de personas et de conversations, orientées par une analyse des premières requêtes d'utilisateurs de Dinootoo.
2. **Ingestion des conversations** : filtrage pour ne traiter que les messages de l'utilisateur.
3. **Extraction** : utilisation d'un LLM pour produire des souvenirs structurés au format JSON.
4. **Validation** : définition d'un schéma de mémoire en YAML, utilisé pour valider et normaliser les données extraites.
5. **Stockage** : conservation des souvenirs et de métadonnées, notamment l'identifiant du persona, la date, le caractère global du souvenir et son état de confirmation.
6. **Consolidation** : synthèse des souvenirs non confirmés. Lorsqu'il existe plusieurs valeurs pour un champ, un LLM aide à produire une information plus stable, cohérente et complète.
7. **Réutilisation** : ajout de souvenirs au contexte du LLM afin de personnaliser certaines réponses.

La réutilisation illustre deux comportements : une réponse factuelle reste inchangée, tandis que des recommandations professionnelles ou de repas peuvent être personnalisées à partir de la mémoire.

## Évaluation et résultats

Le corpus décrit comprend **10 personas et 10 conversations par persona**. La comparaison détaillée de Mem0 et LangMem porte sur **un persona et ses 10 conversations**.

Pour comparer les souvenirs extraits, l'évaluation a utilisé **text-embedding-3-small**, la similarité cosinus avec un seuil de **0,85**, ainsi qu'une revue manuelle d'un échantillon. Sur le cas étudié :

- **LangMem Agent** a extrait 20 souvenirs, dont 13 doublons (65 %).
- **LangMem Background** a extrait 13 souvenirs, dont 2 doublons.
- **Mem0** a extrait 100 souvenirs, dont 17 doublons (17 %).

Pour évaluer la couverture des informations attendues, 49 informations du persona ont été vérifiées par mots-clés :

- Solution développée : **17/49 (34,7 %)**
- LangMem Agent : **21/49 (42,9 %)**
- LangMem Background : **20/49 (40,8 %)**
- Mem0 : **25/49 (51,0 %)**

Cette mesure évalue la présence de mots-clés, mais ne garantit pas que le souvenir soit sémantiquement correct, pertinent ou non contradictoire. Les résultats sont limités au cas étudié et ne constituent pas une évaluation globale de la solution.

## Outils et technologies

LLM pour l'extraction et la consolidation, embeddings pour la comparaison des souvenirs, **API de LLM**, **PostgreSQL** et une approche **LLM-as-a-judge**.

## Limites identifiées

- Le schéma prédéfini limite la mémoire aux champs prévus ; un utilisateur ne peut pas facilement faire mémoriser une information hors schéma.
- Certains champs proches peuvent être confondus, par exemple le type de résidence et le lieu de résidence.
- Le corpus synthétique ne remplace pas une évaluation sur des conversations réelles annotées.
- L'évaluation par mots-clés est limitée et peut produire des faux positifs.
- La réutilisation a été illustrée qualitativement, sans mesure chiffrée générale de son effet sur la qualité des réponses.
- Souvenirs parfois trop longs, redondants ou centrés sur les réponses de l'assistant.
