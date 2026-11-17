# Chatbot du portfolio

L'assistant conversationnel passe par un mini-serveur Node (`server/index.mjs`, zéro dépendance) qui :

- garde la **clé API OpenAI** côté serveur (elle n'apparaît jamais dans le bundle front) ;
- fait la **recherche RAG** sur les fiches projets de [`server/rag/`](server/rag) : découpage des `.md` par sections, embeddings `text-embedding-3-small`, similarité cosinus, top-k morceaux injectés dans le prompt ;
- **restreint le périmètre** du modèle aux questions sur le portfolio et les projets ;
- applique des garde-fous : limite de débit par IP, plafonnement de l'historique et des tokens.

## En développement

```sh
bun run server   # serveur chatbot sur http://localhost:8787
bun run dev      # front Vite (le proxy /api → 8787 est déjà configuré)
```

Renseigner la clé API dans `server/.env` (copier `server/.env.example`).

Mode debug : renseigner la clé API dans l'interface du chatbot ⇒ les requêtes vont directement à OpenAI, en contournant le serveur.

## En production

Builder le front (`bun run build`), le servir derrière `nginx.conf` qui proxifie `/api/` vers le serveur Node (cf. `nginx.conf`). Puis lancer le serveur sur la machine (ou conteneur) de prod avec `server/.env` renseigné.

## Ajouter un projet au RAG

Créer un fichier `server/rag/<projet>.md` (titre `#`, sections `##`), puis redémarrer le serveur : les embeddings sont (re)calculés au démarrage. Voir `server/rag/memory.md` pour le format attendu.

