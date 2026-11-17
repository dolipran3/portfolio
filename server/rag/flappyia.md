# Projet FlappyIa : une IA qui apprend à jouer à Flappy Bird

## 1. Présentation générale
FlappyIa est un projet personnel, conçu et réalisé entièrement par moi-même, de la création du jeu à l'entraînement de l'IA. Il comporte deux parties :
1. Une recréation du jeu **Flappy Bird** en Python avec la bibliothèque **Pygame**.
2. Une **IA** qui apprend seule à y jouer, grâce à un petit **réseau de neurones** entraîné par un **algorithme génétique**.

Code source : https://github.com/dolipran3/FlappyIa

**Contexte :** j'ai réalisé ce projet pendant mon temps libre, par curiosité : l'idée m'avait traversé l'esprit et je voulais l'essayer. J'avais déjà un niveau avancé en Python. Le projet m'a pris environ deux semaines de travail cumulé, sans compter les pauses.

**Statut :** le projet est fonctionnel mais pas terminé. Il manque notamment un README complet et une fonction pour sauvegarder les poids du meilleur réseau après l'apprentissage.

## 2. Le jeu (Pygame)
- Un oiseau tombe sous l'effet de la gravité et peut sauter.
- Des tuyaux (haut et bas) défilent avec un espace de passage, et le sol défile aussi.
- Un oiseau est éliminé lorsqu'il touche un tuyau ou le sol, ou qu'il sort par le haut de l'écran.
- Le score augmente à chaque tuyau franchi.
- Fenêtre de 288 × 512 pixels.
- Fichiers : `bird.py` (oiseau), `pipe.py` (tuyaux), `ground.py` (sol), `score.py` (score), `main.py` (jeu jouable), `trainModel.py` (entraînement de l'IA).

Recréer un jeu fidèle à l'original a été un défi, mais cette partie a été relativement rapide.

## 3. Le réseau de neurones (`reseauNeurone.py`)
Chaque oiseau est contrôlé par son propre petit réseau de neurones.
- **Entrées (2) :** la distance horizontale (dX) et la distance verticale (dY) entre l'oiseau et le prochain tuyau. Deux entrées suffisent car il n'y a que deux dangers dans le jeu : le sol et les tuyaux.
- **Couche cachée :** 1 couche de 4 neurones, avec la fonction d'activation **sigmoïde**.
- **Sortie (1) :** un neurone suivi d'un seuil. Si la valeur est supérieure à 0, l'oiseau saute, sinon il ne fait rien.
- **Poids :** initialisés aléatoirement entre -1 et 1, sans biais.
- Le réseau ne fait que de la propagation avant (feedforward). Il n'y a pas de rétropropagation : l'apprentissage vient uniquement de l'algorithme génétique.

## 4. L'algorithme génétique (`algoGenetique.py`)
Principe : faire évoluer une population d'oiseaux, comme dans la sélection naturelle.
- **Population :** 100 oiseaux par génération, aux poids aléatoires au départ.
- **Fitness :** elle augmente de 1 à chaque pas de temps où l'oiseau reste en vie. Plus il survit longtemps, meilleure est sa fitness.
- **Sélection :** les oiseaux sont triés par fitness et les **10 % meilleurs** (élites) sont conservés tels quels.
- **Croisement :** pour compléter la population, on choisit deux parents au hasard parmi les élites. Pour chaque poids, l'enfant reprend celui du parent 1 ou du parent 2 (50/50).
- **Mutation :** chaque poids a 1 % de chance d'être modifié d'une petite valeur aléatoire comprise entre -0,5 et 0,5.
- Quand tous les oiseaux sont morts, une nouvelle génération démarre.

**Pourquoi un algorithme génétique ?** Selon moi, c'était la méthode la plus rapide pour arriver à une solution précise : on génère un grand nombre d'oiseaux en parallèle et on réutilise le meilleur.

## 5. Déroulement de l'entraînement (`trainModel.py`)
1. Création de 100 oiseaux et de leurs 100 réseaux.
2. À chaque image, chaque réseau reçoit (dX, dY) et décide de sauter ou non.
3. Les oiseaux qui touchent un obstacle sont éliminés.
4. Quand plus aucun oiseau n'est en vie, la population évolue (sélection, croisement, mutation) et un nouveau tour commence.
5. La vitesse de la boucle est augmentée pour entraîner plus vite. [vitesse exacte à confirmer] La génération en cours et le meilleur score sont affichés dans la console.

## 6. Technologies
Python, Pygame, NumPy, gestionnaire de projet `uv`.

## 7. Résultats
L'IA parvient à jouer correctement à Flappy Bird. Le meilleur score atteint est d'un peu plus de **1000** (tuyaux franchis). [à préciser : nombre de générations nécessaires pour y arriver]

## 8. Difficultés rencontrées
1. **Recréer le jeu** de façon fidèle à l'original (partie relativement rapide).
2. **Concilier algorithme fonctionnel et affichage graphique** : faire tourner l'apprentissage tout en gardant un rendu Pygame demande des optimisations.

## 9. Limites et pistes d'amélioration
- **Sauvegarde des poids :** ajouter une fonction pour enregistrer le meilleur réseau après l'apprentissage et le recharger sans réentraîner.
- **Mode sans interface graphique :** supprimer l'affichage pour ne garder que le calcul rendrait l'entraînement bien plus rapide.
- **Documentation :** rédiger le README (installation, lancement).
