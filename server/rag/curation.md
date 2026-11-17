# Curation

## Présentation

Curation est un projet présenté sous forme de case 3D dans le portfolio.
Il a été réalisé en alternance chez Orange Innovation, dans l'équipe Deskin (secteur Data & IA). Il s'agit d'un projet de traitement automatique du langage naturel (NLP) visant à détecter automatiquement les thématiques présentes dans des retours utilisateurs.

## Contexte

Le projet s'inscrivait dans l'amélioration d'une **solution interne déjà existante** chez Orange. Cette solution analyse des retours textuels d'utilisateurs (par exemple des commentaires laissés sur une application). Ces retours sont trop nombreux pour être lus et classés manuellement : l'objectif était donc d'améliorer la détection automatique des thématiques qu'ils abordent.

- **Entreprise** : Orange (Orange Innovation)
- **Équipe** : Deskin, secteur Data & IA
- **Statut** : alternance
- **Nature de la mission** : amélioration d'une solution interne existante

## Objectif du projet

Trouver ou créer un modèle capable de détecter les thématiques présentes dans un texte.

Particularité importante : il s'agit d'une **classification multi-label**. Une même phrase ou un même commentaire peut aborder plusieurs thématiques à la fois. Le modèle doit donc pouvoir associer plusieurs classes à un seul texte, et pas seulement une.

## Données

- Un jeu de données comportant différents paramètres (colonnes) et des classes associées. Ces classes correspondent à des **thématiques**.
- Les textes sont **multilingues** : plus de cinq langues étaient présentes (français, anglais, polonais, et d'autres). J'ai travaillé principalement sur les textes en **français**.

### Prétraitement

Plusieurs analyses du jeu de données ont été menées avant la modélisation, ce qui a conduit à :
- **Supprimer certaines colonnes de thématiques** qui n'avaient plus lieu d'être ou qui ne décrivaient pas grand-chose (thématiques peu informatives ou obsolètes).
- **Normaliser le texte** pour chaque langue, à l'aide de la bibliothèque **spaCy**.

## Démarche et technologies

### Étape 1 : modèle de référence avec XGBoost

J'ai commencé par un modèle **XGBoost** (gradient boosting).
- Pour représenter le texte, nous avons construit un tableau des **mots les plus fréquemment cités** (approche par fréquence de mots).
- Avantage : XGBoost est léger et peut tourner sur un simple **CPU**, ce qui le rend facile à déployer et peu énergivore.

### Étape 2 : fine-tuning d'un modèle BERT

J'ai ensuite **fine-tuné un modèle BERT** pour la classification multi-label des thématiques.
- Par souci d'**optimisation**, nous avons retenu **DistilBERT**, une version allégée et plus rapide de BERT. D'autres variantes de BERT ont également été testées pour comparaison.
- Avantage : de meilleures performances, notamment sur des textes **multilingues**.
- Inconvénient : plus complexe à mettre en place et plus gourmand en ressources de calcul et en énergie qu'un modèle XGBoost.

### Technologies utilisées

Python, Hugging Face (Transformers), PyTorch, scikit-learn, spaCy, XGBoost, DistilBERT.

## Résultats

- Le modèle **BERT fine-tuné** a obtenu de **meilleurs résultats** que XGBoost, en particulier sur les données multilingues.
- C'est **l'approche retenue** à l'issue du projet.
- Les métriques chiffrées ne sont pas communiquées pour des raisons de confidentialité propres à Orange.

## Comparaison XGBoost vs BERT

| Critère | XGBoost | BERT fine-tuné (DistilBERT) |
|---|---|---|
| Performance globale | Correcte | Meilleure |
| Multilingue | Limité | Très bon |
| Ressources nécessaires | CPU suffisant | Plus lourd (GPU conseillé) |
| Consommation d'énergie | Faible | Plus élevée |
| Facilité de mise en place | Simple | Plus complexe |

## Ce que j'ai appris

Le principal enseignement du projet : il est possible d'**utiliser des modèles qui n'ont pas été conçus à l'origine pour une tâche précise et de les adapter** à celle-ci grâce au **fine-tuning**. Un modèle de langage pré-entraîné comme BERT peut ainsi être spécialisé pour une problématique métier précise (ici, la détection multi-label de thématiques), sans repartir de zéro.

J'ai également appris à arbitrer entre performance et coût de mise en œuvre : XGBoost est plus simple et économe, tandis que BERT est plus performant mais plus exigeant en ressources.

## Confidentialité

Ce projet a été réalisé dans le cadre d'Orange. Les données, les chiffres de performance et les détails internes de la solution ne peuvent pas être partagés. Ce document décrit uniquement la démarche et les choix techniques généraux.

## Questions fréquentes (FAQ)

**Quel était le but du projet Curation ?**
Améliorer une solution interne d'Orange en détectant automatiquement les thématiques présentes dans des retours utilisateurs, avec la possibilité d'en attribuer plusieurs à un même texte.

**Dans quel cadre le projet a-t-il été réalisé ?**
En alternance chez Orange Innovation, dans l'équipe Deskin (secteur Data & IA).

**Qu'est-ce que la classification multi-label ?**
C'est le fait qu'un même texte puisse appartenir à plusieurs classes en même temps, par exemple un commentaire qui parle à la fois de performance et d'ergonomie.

**Pourquoi avoir choisi BERT plutôt que XGBoost ?**
BERT, une fois fine-tuné, donnait de meilleurs résultats, surtout sur les textes multilingues, car il comprend mieux le contexte des phrases.

**Pourquoi DistilBERT ?**
Pour des raisons d'optimisation : c'est une version plus légère et plus rapide de BERT, qui limite les besoins en ressources tout en gardant de bonnes performances.

**Quel est l'intérêt de XGBoost alors ?**
Il est plus simple à mettre en place, plus léger, et tourne sur CPU avec une faible consommation d'énergie.

**Quelles langues étaient concernées ?**
Plus de cinq langues, dont le français, l'anglais et le polonais. J'ai principalement travaillé sur le français.

**Comment le texte a-t-il été préparé ?**
Le texte a été normalisé pour chaque langue avec spaCy, et les thématiques peu informatives ont été retirées du jeu de données.

**Quels outils ont été utilisés ?**
Python, Hugging Face, PyTorch, scikit-learn, spaCy et XGBoost.

**Quels sont les résultats chiffrés ?**
Ils ne peuvent pas être communiqués pour des raisons de confidentialité chez Orange. On peut seulement dire que le modèle BERT fine-tuné a surpassé XGBoost, notamment en multilingue.

**Qu'as-tu retenu de ce projet ?**
Qu'on peut adapter par fine-tuning des modèles qui n'ont pas été conçus pour une tâche donnée, au lieu de tout recréer.