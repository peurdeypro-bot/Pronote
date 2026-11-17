# Pronote

## Générateur de widgets

Le générateur utilise l’API `generateContent` de Gemini côté serveur, sans recherche Web. Il essaie Gemini 3.8 Flash puis Gemini 3.5 Flash-Lite si le premier modèle est temporairement indisponible. Ajoute une clé API Google AI Studio au secret d’environnement `GEMINI_API_KEY` du Codespace; ne l’écris pas dans le code, dans le navigateur ou dans un fichier versionné. Redémarre le serveur après avoir ajouté le secret.

La description du widget est envoyée au service Gemini via un appel `contents` avec une instruction système. Le widget apparaît d’abord dans un aperçu temporaire isolé; l’utilisateur peut demander des améliorations avant de l’ajouter. Seuls les widgets confirmés sont conservés dans le stockage local du navigateur. Les aperçus et widgets sont affichés dans une iframe sandboxée sans accès réseau, stockage local ni accès au tableau de bord. Le mode développeur utilise la même iframe isolée.

Lorsque le service Gemini est indisponible, le serveur fournit un widget de secours pertinent pour les demandes reconnues (comme un compte à rebours des vacances), ou conserve l’aperçu existant pendant une amélioration. Un aperçu générique de secours est signalé comme tel et ne peut pas être ajouté au tableau de bord. Sans `GEMINI_API_KEY`, la génération explicite une configuration manquante. Les tests du connecteur se lancent avec `npm run test:ai`.

Chaque adresse IP peut demander au maximum 2 générations ou améliorations sur une période glissante d’une minute et 10 par jour UTC. Les tentatives acceptées comptent même si Gemini échoue, pour éviter de contourner la limite et consommer inutilement le quota du service. Les compteurs sont en mémoire : ils sont partagés par les personnes derrière la même adresse IP et sont réinitialisés au redémarrage du serveur. Des comptes et un stockage persistant seront nécessaires pour des quotas individuels et durables.

## Tableau de bord

L’emploi du temps peut être redimensionné en largeur et en hauteur pendant la personnalisation; son contenu défile si nécessaire pour rester lisible. La courbe de progression affiche la moyenne des notes regroupées par période hebdomadaire, avec des dates sur l’axe horizontal.