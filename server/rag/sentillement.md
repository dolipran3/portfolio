# Sentillement

## Présentation

Sentillement est un projet présenté sous forme de case 3D dans le portfolio.

Il s'agit d'un modèle d'analyse de sentiment capable de prédire si une phrase en français exprime un sentiment plus ou moins positif. Ce projet a été réalisé chez Orange, au sein de l'équipe Deskin, dans le cadre de ma première année d'alternance. La solution a été développée pour être intégrée à un outil interne.

## Objectif du projet

L'objectif était de créer un modèle de machine learning capable de déterminer automatiquement la polarité d'un texte (positif ou négatif) afin de permettre à un outil interne d'Orange d'exploiter cette information.

Un enjeu central du projet : obtenir un bon équilibre entre la **précision** et le **rappel**. Il ne suffisait pas d'avoir un modèle très précis mais qui rate beaucoup de cas (rappel faible), ni l'inverse. Les deux métriques devaient être à peu près égales en pourcentage.

## Contexte

- **Entreprise** : Orange
- **Équipe** : Deskin
- **Cadre** : alternance, première année
- **Destination** : outil interne à Orange

## Fonctionnement

Le pipeline suit les étapes suivantes :

1. **Gestion des données** : les données sont chargées et manipulées avec Pandas.
2. **Normalisation du texte** : le texte français est nettoyé et normalisé avec spaCy (ex. lemmatisation, traitement des mots vides, etc.) 
3. **Représentation du texte** : utilisation du principe du **sac de mots** (bag of words). Chaque texte est transformé en vecteur à partir d'un tableau des mots les plus présents dans le corpus.
4. **Classification** : un modèle **SVM** (Support Vector Machine) est entraîné avec scikit-learn pour prédire le sentiment de la phrase.
5. **Évaluation et ajustement** : les performances sont mesurées via la précision et le rappel, et le modèle est ajusté pour équilibrer ces deux métriques.

## Technologies utilisées

| Technologie | Rôle dans le projet |
|---|---|
| **Python** | Langage principal Francais |
| **Pandas** | Gestion et manipulation de la base de données |
| **spaCy** | Normalisation du texte en français |
| **scikit-learn** | Création, entraînement et évaluation du modèle |
| **SVM (Support Vector Machine)** | Modèle de classification pour l'analyse de sentiment |
| **Sac de mots (Bag of Words)** | Représentation du texte sous forme numérique |

## Difficultés rencontrées

**Équilibrer précision et rappel** : la principale difficulté était d'éviter un déséquilibre entre ces deux métriques. Un modèle avec une bonne précision mais un mauvais rappel (ou inversement) n'aurait pas été satisfaisant pour l'usage prévu. L'objectif était d'obtenir des pourcentages à peu près égaux pour les deux.

## Ce que ce projet démontre

- Une maîtrise des étapes d'un projet de **NLP** (traitement automatique du langage) : nettoyage, normalisation, vectorisation, classification.
- La capacité à utiliser des bibliothèques standard de la data science (Pandas, scikit-learn, spaCy).
- Une compréhension des **métriques d'évaluation** (précision, rappel) et de la nécessité de les équilibrer.
- La capacité à livrer une solution concrète pour un **besoin réel en entreprise** (outil interne chez Orange).

## Questions fréquentes

**Qu'est-ce que Sentillement ?**
Un modèle d'analyse de sentiment qui prédit si une phrase en français est plus ou moins positive.

**Où et dans quel cadre a-t-il été réalisé ?**
Chez Orange, dans l'équipe Deskin, pendant la première année de mon alternance.

**À quoi sert-il ?**
Il a été développé pour un outil interne d'Orange.

**Quel modèle de machine learning est utilisé ?**
Un SVM (Support Vector Machine), implémenté avec scikit-learn.

**Comment le texte est-il préparé pour le modèle ?**
Il est d'abord normalisé avec spaCy (adapté au français), puis transformé en vecteurs grâce à la méthode du sac de mots.

**Pourquoi le sac de mots ?**
C'est une méthode simple et efficace pour représenter un texte sous forme numérique : on construit un tableau des mots les plus présents et on compte leur présence dans chaque phrase.

**Quelle a été la principale difficulté ?**
Obtenir une précision et un rappel à peu près égaux, afin d'éviter un modèle déséquilibré.

**Quels outils ont été utilisés ?**
Pandas (données), spaCy (normalisation), scikit-learn (modèle SVM).