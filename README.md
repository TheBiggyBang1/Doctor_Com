# Doctor Com

Questionnaire bilingue de qualification des prospects, construit avec React/Vite et Node/Express.

## Prérequis

- Node.js 20 ou supérieur
- MySQL 8 sur le port `3306`

## Configuration locale

1. Copier `.env.example` vers `.env`, puis renseigner l’utilisateur et le mot de passe MySQL ainsi que `ANTHROPIC_API_KEY`. Garder la clé Claude dans `.env`, jamais dans le frontend.
2. Créer la base et la table :

   ```powershell
   npm run db:setup
   ```

   L’utilisateur configuré doit pouvoir créer la base `doctor_com` et la table `questionnaire_submissions`.

3. Lancer le frontend et l’API :

   ```powershell
   npm run dev
   ```

4. Ouvrir l’URL affichée par Vite, généralement `http://localhost:5173`.

Le service Windows déjà installé peut être démarré depuis un terminal administrateur avec `Start-Service MySQL80`.

## Déploiement Docker

1. Sur un hôte Linux avec Docker, créer `.env` à partir de `.env.example`. Définir les identifiants d'un utilisateur MySQL dédié avec les droits de création et de modification du schéma. `MYSQL_HOST` doit être l'adresse réseau du serveur MySQL, pas `127.0.0.1` sauf si MySQL tourne sur le même hôte et est accessible depuis le conteneur.
2. Construire et lancer l'image :

   ```sh
   docker build -t doctor-com .
   docker run -d --name doctor-com --restart unless-stopped --publish 127.0.0.1:3001:3001 --env-file .env doctor-com
   ```

   Le conteneur construit le frontend et le serveur TypeScript en JavaScript, applique la migration idempotente au démarrage, puis sert les deux depuis le port `3001`. La clé Claude peut rester vide jusqu'à son ajout; la génération de plans échouera jusque-là.
3. Placer un reverse proxy HTTPS devant `127.0.0.1:3001`, diriger le domaine vers ce proxy, et autoriser l'accès HTTPS uniquement. Le endpoint de santé `/api/health` renvoie `200` lorsque MySQL répond et `503` sinon.
4. Configurer les sauvegardes MySQL et tester une restauration avant l'ouverture publique. Ne publier jamais le port `3306` sur Internet.

## Contrôles

```powershell
npm test
npm run build
```

Les tests de l’appel Claude utilisent un serveur HTTP local simulé; aucun appel Anthropic réel n’est effectué par la suite de tests.

Les brouillons sont repris grâce à un cookie `HttpOnly`; seul le hash du jeton est stocké en base. Les brouillons non soumis sont supprimés automatiquement après `DRAFT_TTL_DAYS` (30 jours par défaut). La durée de conservation des demandes soumises et le texte/URL définitifs de la politique de confidentialité restent à définir avant mise en production.

À la soumission, le serveur calcule le score sur 100, enregistre les points et la catégorie A/B/C, puis génère un plan avec Claude selon cette catégorie. Le score ne quitte jamais le serveur. Le plan Markdown est conservé dans MySQL; son PDF est construit en mémoire et servi uniquement au client porteur du cookie de reprise. Définir `HIGH_VALUE_SECTORS` comme une liste de slugs séparés par des virgules si certains secteurs doivent obtenir les 34 points du critère entreprise. Sans clé Claude valide, la demande et son score sont conservés mais le rapport passe à l’état `failed`; le client peut relancer après configuration de la clé et redémarrage de l’API.

## Périmètre

Les emails de confirmation, les protections anti-bot, les notifications et la synchronisation Odoo ne sont pas inclus.

La politique de confidentialité doit être finalisée avant tout déploiement public.
