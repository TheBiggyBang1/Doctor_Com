# Doctor Com

Questionnaire bilingue de qualification des prospects, construit avec React/Vite et Node/Express.

## Prérequis

- Node.js 20 ou supérieur
- Chromium pour Playwright (`npx playwright install chromium` après `npm install`)
- Aucun serveur de base de données; les demandes finalisées sont enregistrées dans Google Sheets

## Configuration locale

1. Copier `.env.example` vers `.env`, puis renseigner `ANTHROPIC_API_KEY` et les identifiants du compte de service Google Sheets. Garder ces clés dans `.env`, jamais dans le frontend.
2. Partager la feuille Google avec l'adresse du compte de service et activer l'API Google Sheets.
3. Installer Chromium pour Playwright (une seule fois) :

   ```powershell
   npx playwright install chromium
   ```

4. Lancer le frontend et l’API :

   ```powershell
   npm run dev
   ```

5. Ouvrir l’URL affichée par Vite, généralement `http://localhost:5173`.

## Déploiement Docker

1. Sur un hôte Linux avec Docker, créer `.env` à partir de `.env.example`.
2. Construire et lancer l'image :

   ```sh
   docker build -t doctor-com .
   docker run -d --name doctor-com --restart unless-stopped --publish 127.0.0.1:3001:3001 --volume doctor-com-data:/app/data --env-file .env doctor-com
   ```

   Le conteneur construit le frontend et le serveur TypeScript en JavaScript, installe Chromium, puis sert les deux depuis le port `3001`. Les réponses finalisées sont ajoutées à Google Sheets. Les brouillons et l'état/PDF du rapport restent en mémoire et disparaissent au redémarrage du service. Claude renvoie un fragment HTML sémantique; le serveur l'assainit et le compile en PDF.
3. Placer un reverse proxy HTTPS devant `127.0.0.1:3001`, diriger le domaine vers ce proxy, et autoriser l'accès HTTPS uniquement. Le endpoint de santé `/api/health` confirme que le serveur HTTP répond.

## Contrôles

```powershell
npm test
npm run build
```

Les tests de l’appel Claude utilisent un serveur HTTP local simulé; aucun appel Anthropic réel n’est effectué par la suite de tests.

Les brouillons sont repris grâce à un cookie `HttpOnly` et restent uniquement en mémoire du processus. Ils ne survivent pas à un redémarrage. Seules les demandes finalisées sont ajoutées à Google Sheets. La durée de conservation des réponses et le texte/URL définitifs de la politique de confidentialité restent à définir avant mise en production.

À la soumission, le serveur calcule le score sur 100, l'ajoute avec les réponses à Google Sheets, puis génère un plan HTML avec Claude selon la catégorie. Le PDF est conservé en mémoire du processus et servi uniquement au client porteur du cookie de reprise; il n'est pas enregistré dans Google Sheets. Définir `HIGH_VALUE_SECTORS` comme une liste de slugs séparés par des virgules si certains secteurs doivent obtenir les 34 points du critère entreprise. Sans clé Claude valide ou si la compilation échoue, la demande reste dans la feuille et le rapport passe à l'état `failed`; le client peut relancer sa génération tant que le processus est actif.

## Périmètre

Les emails de confirmation, les protections anti-bot, les notifications et la synchronisation Odoo ne sont pas inclus.

La politique de confidentialité doit être finalisée avant tout déploiement public.
