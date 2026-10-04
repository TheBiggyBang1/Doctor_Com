# Doctor Com

Questionnaire bilingue de qualification des prospects, construit avec React/Vite et Node/Express.

## Prérequis

- Node.js 20 ou supérieur
- Chromium pour Playwright (`npx playwright install chromium` après `npm install`)
- Aucun serveur de base de données; SQLite stocke les données dans un fichier local

## Configuration locale

1. Copier `.env.example` vers `.env`, puis renseigner `ANTHROPIC_API_KEY`. Garder la clé Claude dans `.env`, jamais dans le frontend. `DATABASE_PATH` peut rester à sa valeur par défaut.
2. Initialiser le fichier SQLite et son schéma :

   ```powershell
   npm run db:setup
   ```

   Le fichier est créé dans `data/doctor_com.sqlite`.

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

   Le conteneur construit le frontend et le serveur TypeScript en JavaScript, installe Chromium, initialise le schéma SQLite au démarrage, puis sert les deux depuis le port `3001`. Claude renvoie un rapport HTML sémantique; le serveur l'assainit et le compile en PDF avant de marquer le rapport comme prêt. Le volume conserve le fichier SQLite entre les redémarrages.
3. Placer un reverse proxy HTTPS devant `127.0.0.1:3001`, diriger le domaine vers ce proxy, et autoriser l'accès HTTPS uniquement. Le endpoint de santé `/api/health` renvoie `200` lorsque SQLite répond et `503` sinon.
4. Sauvegarder régulièrement le volume `doctor-com-data` et tester une restauration avant l'ouverture publique.

## Contrôles

```powershell
npm test
npm run build
```

Les tests de l’appel Claude utilisent un serveur HTTP local simulé; aucun appel Anthropic réel n’est effectué par la suite de tests.

Les brouillons sont repris grâce à un cookie `HttpOnly`; seul le hash du jeton est stocké en base. Les brouillons non soumis sont supprimés automatiquement après `DRAFT_TTL_DAYS` (30 jours par défaut). La durée de conservation des demandes soumises et le texte/URL définitifs de la politique de confidentialité restent à définir avant mise en production.

À la soumission, le serveur calcule le score sur 100, enregistre les points et la catégorie A/B/C, puis génère un plan HTML avec Claude selon cette catégorie. Le score ne quitte jamais le serveur. Le serveur assainit le HTML, compile et conserve le PDF dans SQLite, puis le sert uniquement au client porteur du cookie de reprise. Définir `HIGH_VALUE_SECTORS` comme une liste de slugs séparés par des virgules si certains secteurs doivent obtenir les 34 points du critère entreprise. Sans clé Claude valide ou si la compilation échoue, la demande et son score sont conservés mais le rapport passe à l’état `failed`; le client peut relancer après correction de la configuration.

## Périmètre

Les emails de confirmation, les protections anti-bot, les notifications et la synchronisation Odoo ne sont pas inclus.

La politique de confidentialité doit être finalisée avant tout déploiement public.
