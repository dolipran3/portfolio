import { useEffect, useRef, useState } from 'react';
import './Chatbot.css';

const WELCOME_MESSAGE = 'Bonjour et bienvenue sur mon portfolio !\nJe suis ton assistant, pose-moi tes questions !';

// Délai (en ms) entre deux messages de la séquence d'intro (case Départ).
const INTRO_DELAY_MS = 2000;

// Cache du contenu de infoPerso.md : la séquence peut être relancée devant
// plusieurs visiteurs/sessions, inutile de refaire un fetch à chaque fois.
let infoPersoCache = null;

// Récupère infoPerso.md et le découpe en un tableau de messages (un par
// paragraphe du fichier). Le fichier contient des "\n" littéraux : on les
// convertit en vrais sauts de ligne avant de découper.
const fetchInfoPerso = async () => {
  if (infoPersoCache) return infoPersoCache;
  const res = await fetch('/infoPerso.md');
  const raw = await res.text();
  infoPersoCache = raw
    .replace(/\\n/g, '\n')
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  return infoPersoCache;
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Sert de prompt de secours UNIQUEMENT en mode debug (clé locale, appel direct
// à OpenAI). En production c'est le serveur qui fournit le prompt (cf.
// server/index.mjs) avec les extraits RAG des fiches projets.
const SYSTEM_PROMPT = "Tu es l'assistant du portfolio d'Eldoliprano, développeur. Réponds en français, de manière concise et amicale. Ton périmètre est strict : répondez UNIQUEMENT aux questions sur le portfolio, ses projets (FlappyIa, Memory, Sentillement, Curation, CV, LinkedIn, GitHub) et le parcours d'Eldoliprano. Toute autre question se solde par un petit rappel courtois que tu es là pour parler du portfolio, sans y répondre sur le fond.";

const DEFAULT_MODEL = 'gpt-4.1';
const API_URL = '/api/chat';

// `open`/`onToggle` : ouverture contrôlée par le parent (App). Quand ils ne
// sont pas fournis, le composant gère son état tout seul comme avant.
// `introRequest` : compteur incrémenté par le parent à chaque clic sur la
// case Départ. Chaque incrémentation relance la séquence d'intro : les
// paragraphes de infoPerso.md apparaissent un par un, comme une réponse de
// l'IA, espacés de INTRO_DELAY_MS.
function Chatbot({ open: openProp, onToggle, introRequest, onIntroDone }) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const toggleOpen = onToggle ?? (() => setInternalOpen((value) => !value));
  // Clé locale = mode debug : appel direct à OpenAI sans passer par le
  // serveur. Vide (cas normal en production) ⇒ requêtes sur /api/chat.
  const [apiKey, setApiKey] = useState(
    () => localStorage.getItem('openai_api_key') || ''
  );
  const [model, setModel] = useState(
    () => localStorage.getItem('openai_model') || DEFAULT_MODEL
  );
  const [messages, setMessages] = useState([
    { role: 'assistant', content: WELCOME_MESSAGE },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // Séquence d'intro en cours : introPlaying désactive la saisie pour ne pas
  // mélanger une vraie question au discours de présentation, introTyping
  // affiche la bulle "En train d'écrire..." entre deux messages.
  const [introPlaying, setIntroPlaying] = useState(false);
  const [introTyping, setIntroTyping] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, introTyping]);

  const saveApiKey = (value) => {
    setApiKey(value);
    try {
      if (value) {
        localStorage.setItem('openai_api_key', value);
      } else {
        localStorage.removeItem('openai_api_key');
      }
    } catch {
      // stockage indisponible : on garde la clé en mémoire pour la session
    }
  };

  const saveModel = (value) => {
    setModel(value);
    try {
      localStorage.setItem('openai_model', value);
    } catch {
      // stockage indisponible : on garde le modèle en mémoire pour la session
    }
  };

  const resetChat = () => {
    setMessages([{ role: 'assistant', content: WELCOME_MESSAGE }]);
    setError(null);
  };

  // Séquence d'intro : relancée à chaque incrémentation de `introRequest`
  // (clic sur la case Départ). Le discours de présentation remplace la
  // conversation en cours, chaque message arrive après INTRO_DELAY_MS sous
  // la bulle "En train d'écrire...". La séquence se poursuit même si le
  // panneau est refermé entre-temps : les messages s'accumulent et sont
  // là quand on rouvre.
  useEffect(() => {
    if (!introRequest) return;
    let cancelled = false;

    (async () => {
      setIntroPlaying(true);
      setMessages([]);
      setError(null);
      try {
        const paragraphs = await fetchInfoPerso();
        for (const paragraph of paragraphs) {
          if (cancelled) return;
          setIntroTyping(true);
          await wait(INTRO_DELAY_MS);
          if (cancelled) return;
          setIntroTyping(false);
          setMessages((prev) => [...prev, { role: 'assistant', content: paragraph }]);
        }
      } finally {
        // Dernier nettoyage : purge de la bulle "En train d'écrire..."
        // et retour à une conversation normale (sauf si une nouvelle
        // séquence a déjà repris la main).
        if (!cancelled) {
          setIntroTyping(false);
          setIntroPlaying(false);
          onIntroDone?.();
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [introRequest, onIntroDone]);

  // Appel direct OpenAI (mode debug uniquement).
  const askOpenAI = async (conversation) => {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...conversation,
        ],
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`Erreur API (${res.status}) : ${detail.slice(0, 150)}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? 'Pas de réponse.';
  };

  // Appel normal : le serveur chatbot fournit la clé, le RAG et le prompt.
  const askServer = async (conversation) => {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: conversation }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error ?? `Erreur serveur (${res.status}).`);
    }
    return data.reply ?? 'Pas de réponse.';
  };

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;
    const userMessage = { role: 'user', content: trimmed };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setError(null);
    setLoading(true);

    try {
      const reply = apiKey
        ? await askOpenAI(updatedMessages)
        : await askServer(updatedMessages);
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      setError(err.message);
      // On retire le message utilisateur réellement envoyé si l'appel a
      // échoué : la conversation reste propre et il peut renvoyer.
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`chatbot ${open ? 'open' : ''}`}>
      <div className="chatbot-panel">
        <header className="chatbot-header">
          <h1>Mon Assistant</h1>
        </header>

        <div className="chatbot-settings">
          <label className="chatbot-label">
            Clé API (mode debug)
            <input
              type="password"
              value={apiKey}
              onChange={(e) => saveApiKey(e.target.value)}
              placeholder="vide = serveur du portfolio"
              autoComplete="off"
            />
          </label>

          {apiKey && (
            <span className="chatbot-saved">
              Debug : clé locale utilisée, serveur bypassé
            </span>
          )}

          <div className="chatbot-row">
            <label className="chatbot-label">
              Modèle
              <select value={model} onChange={(e) => saveModel(e.target.value)}>
                <option value="gpt-4.1">gpt-4.1</option>
                <option value="gpt-4.1">gpt-4.1</option>
                <option value="gpt-4.1">gpt-4.1</option>
              </select>
            </label>

            <button
              className="chatbot-reset"
              onClick={resetChat}
              type="button"
            >
              Nouvelle conversation
            </button>
          </div>
        </div>

        <div className="chatbot-messages">
          {messages.map((message, index) => (
            <div key={index} className={`chatbot-msg ${message.role}`}>
              <div className="chatbot-bubble">{message.content}</div>
            </div>
          ))}

          {loading && (
            <div className="chatbot-msg assistant">
              <div className="chatbot-bubble">En train d&apos;écrire...</div>
            </div>
          )}

          {introTyping && (
            <div className="chatbot-msg assistant">
              <div className="chatbot-bubble">En train d&apos;écrire...</div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {error && <div className="chatbot-error">{error}</div>}

        <form
          className="chatbot-input-row"
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Écris ton message..."
            disabled={loading || introPlaying}
          />
          <button type="submit" disabled={loading || introPlaying || !input.trim()}>
            {loading ? '...' : 'Envoyer'}
          </button>
        </form>

        <button
          className="chatbot-toggle"
          onClick={toggleOpen}
          aria-label={open ? 'Fermer le chatbot' : 'Ouvrir le chatbot'}
          title={open ? 'Fermer' : 'Ouvrir'}
        >
          {open ? '\u203A' : '\u2039'}
        </button>
      </div>
    </div>
  );
}

export default Chatbot;
