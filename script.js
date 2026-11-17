import { scoreOnTwenty, weeklyGradeAverages } from './grade-statistics.js';

(() => {
  const apiBaseUrl = (() => {
    const configured = typeof window !== 'undefined' ? window.__PRONOTE_API_URL__ : '';
    if (typeof configured === 'string' && configured.trim()) return configured.trim().replace(/\/+$/, '');
    return '';
  })();
  const apiUrl = (path) => `${apiBaseUrl || ''}${path}`;

  const readApiResponse = async (response, fallbackMessage) => {
    let rawBody = '';
    try {
      rawBody = await response.text();
    } catch {
      const responseMessage = response.ok
        ? 'Le serveur n’a pas renvoyé une réponse JSON valide.'
        : `Le serveur a renvoyé une réponse vide ou non JSON (HTTP ${response.status}).`;
      throw new Error(`${fallbackMessage} ${responseMessage} Vérifie que le serveur de l’application est démarré, puis réessaie.`);
    }

    let result = null;
    if (rawBody && rawBody.trim()) {
      try {
        result = JSON.parse(rawBody);
      } catch {
        const responseMessage = response.ok
          ? 'Le serveur n’a pas renvoyé une réponse JSON valide.'
          : `Le serveur a renvoyé une réponse vide ou non JSON (HTTP ${response.status}).`;
        throw new Error(`${fallbackMessage} ${responseMessage} Vérifie que le serveur de l’application est démarré, puis réessaie.`);
      }
    }

    if (!response.ok) {
      throw new Error(typeof result?.error === 'string' ? result.error : `${fallbackMessage} (HTTP ${response.status}).`);
    }
    if (!result || typeof result !== 'object' || Array.isArray(result)) {
      throw new Error(`${fallbackMessage} Le serveur a renvoyé une réponse invalide.`);
    }
    return result;
  };
