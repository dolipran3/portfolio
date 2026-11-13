# Portfolio — Eldoliprano (Baptiste Le Bail)

## Présentation

Ce portfolio est une scène 3D interactive construite avec React, Three.js (react-three-fiber et drei) et GSAP pour les animations. Les projets sont présentés sous forme de cases 3D posées sur un plateau ; on navigue entre les cases avec des flèches, ce qui fait glisser les descriptions.

## Contenu de la scène

- Cases projets : **FlappyIa**, **Memory**, **Sentillement**, **Curation**.
- Cases pratiques : **CV** (téléchargement du CV PDF), **LinkedIn**, **GitHub**.
- Une case de départ et un panneau de tutoriel expliquant la navigation.

## Assistant

Un assistant conversationnel (chatbot) répond aux questions sur le portfolio et les projets. Il s'appuie sur une recherche RAG (embeddings + similarité cosinus) sur les fiches des différents projets et ne répond qu'aux questions en lien avec le portfolio.

## Technologies

React 19, react-three-fiber, drei, Three.js, GSAP, Tailwind CSS, Vite. Les modèles 3D au format GLB (compression Draco) sont optimisés pour le web.
