import React, { useState } from 'react';
import Scene from './components/Scene';
import Chatbot from './components/Chatbot';

function App() {
  const [chatbotOpen, setChatbotOpen] = useState(false);
  // Compteur de séquences d'intro : chaque clic sur la case Départ
  // l'incrémente, ce qui relance la lecture de infoPerso.md par le chatbot.
  const [chatbotIntroRequest, setChatbotIntroRequest] = useState(0);

  // Appelé par Scene quand le zoom sur la case Départ se termine : on ouvre
  // le panneau du chatbot et on lance sa présentation personnelle.
  const openChatbotWithIntro = () => {
    setChatbotOpen(true);
    setChatbotIntroRequest((n) => n + 1);
  };

  return (
    <>
      <Scene onOpenChatbot={openChatbotWithIntro} />
      <Chatbot
        open={chatbotOpen}
        onToggle={() => setChatbotOpen((v) => !v)}
        introRequest={chatbotIntroRequest}
        onIntroDone={() => setChatbotIntroRequest(0)}
      />
    </>
  );
}

export default App;
