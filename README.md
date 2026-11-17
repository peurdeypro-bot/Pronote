# Pronote

## Générateur de widgets

Le générateur utilise l’API `generateContent` de Gemini côté serveur, sans recherche Web. Il essaie Gemini 3.8 Flash puis Gemini 3.5 Flash-Lite si le premier modèle est temporairement indisponible. Ajoute une clé API Google AI Studio au secret d’environnement `GEMINI_API_KEY` du Codespace; ne l’écris pas dans le code, dans le navigateur ou dans un fichier versionné. Redémarre le serveur après avoir ajouté le secret.

La description du widget est envoyée au service Gemini via un appel `contents` avec une instruction système. Le widget apparaît d’abord dans un aperçu temporaire isolé; l’utilisateur peut ensuite l’ajouter au tableau de bord. Si la génération échoue, le serveur fournit un widget de secours pertinent pour les demandes reconnues (comme un compte à rebours des vacances), ou conserve l’aperçu existant pour l’améliorer.

Lorsque le service Gemini est indisponible, le serveur fournit un widget de secours pertinent pour les demandes reconnues (comme un compte à rebours des vacances), ou conserve l’aperçu existant pour l’améliorer.

Chaque adresse IP peut demander au maximum 2 générations ou améliorations sur une période glissante d’une minute et 10 par jour UTC. Les tentatives acceptées comptent même si Gemini échoue, pour éviter de bloquer les utilisateurs à cause d’un service distant instable.

## Tableau de bord

L’emploi du temps peut être redimensionné en largeur et en hauteur pendant la personnalisation; son contenu défile si nécessaire pour rester lisible. La courbe de progression affiche la moyenne générale sur 20 et garde la même échelle quel que soit le nombre de notes. Les widgets personnels restent hors ligne dans le navigateur, sans stockage serveur.

## Déploiement

Le dépôt n’est pas prévu pour être servi directement par GitHub Pages. La commande `npm start` démarre le serveur Node qui expose `/api/pronote-data`, `/api/widget-preview` et `/api/generate-widget` ; ces points d’entrée ne sont pas disponibles sur une simple page statique GitHub Pages.

Pour déployer le projet dans un environnement en ligne, il faut héberger le serveur Node séparément (par exemple Render, Railway, Fly.io, ou un VPS), puis définir l’URL backend dans une variable globale avant le chargement du script :

```html
<script>
  window.__PRONOTE_API_URL__ = 'https://votre-backend.example.com';
</script>
<script src="./script.js" type="module"></script>
```

Si le backend n’est pas démarré, la cible `/api/*` renvoie une erreur HTTP 405/404, ce qui est normal. Le message d’erreur de l’interface est alors une aide pour vérifier qu’un serveur backend est bien en ligne.
