<p align="right">
  <a href="README.md"><img src="https://img.shields.io/badge/lang-English-2b6cb0?style=flat-square" alt="English"></a>
  <a href="README.fr.md"><img src="https://img.shields.io/badge/lang-Fran%C3%A7ais-9e9e9e?style=flat-square" alt="Français"></a>
</p>

# Doctor Com

<p align="center">
  <img src="./client/assets/Logo_doctorcom_powered.png" alt="Doctor Com" width="250">
</p>

A questionnaire that helps business owners figure out the next step to take in their marketing strategy. Built with React/Vite and Node/Express.

**Website:** [doctorcomtunis.com](https://doctorcomtunis.com/)

## Requirements

- Node.js 20 or later
- Chromium for Playwright (`npx playwright install chromium` after `npm install`)
- No database server; completed submissions are saved to Google Sheets

## Local setup

1. Copy `.env.example` to `.env`, then fill in the Anthropic, Google Sheets and Resend keys. Set `LEAD_ALERT_EMAIL` to the address that should receive alerts for category A leads. Keep these keys in `.env`, never in the frontend. `EMAIL_CODE_SECRET` must be a random string of at least 32 bytes.
2. Share the Google Sheet with the service account address and enable the Google Sheets API.
3. Verify a sending domain in Resend and publish its exact SPF/DKIM DNS records before using `RESEND_FROM` with that domain.
4. Install Chromium for Playwright (only once):

   ```powershell
   npx playwright install chromium
   ```

5. Start the frontend and the API:

   ```powershell
   npm run dev
   ```

6. Open the URL shown by Vite, usually `http://localhost:5173`.

## Docker deployment

1. On a Linux host with Docker, create `.env` from `.env.example`.
2. Build and run the image:

   ```sh
   docker build -t doctor-com .
   docker run -d --name doctor-com --restart unless-stopped --publish 127.0.0.1:3001:3001 --env-file .env doctor-com
   ```

   The container compiles the frontend and the TypeScript server to JavaScript, installs Chromium, then serves both on port `3001`. Completed responses are appended to Google Sheets. Drafts, email verifications, daily limits, and the report state/PDF stay in memory and are lost when the service restarts. Claude returns a semantic HTML fragment; the server sanitizes it and compiles it into a PDF. Keep a single Render instance running: in-memory sessions and limits are not shared between instances.
3. Put an HTTPS reverse proxy in front of `127.0.0.1:3001`, point the domain to that proxy, and allow HTTPS access only. The `/api/health` endpoint confirms the HTTP server is responding.

## Expo mobile app

The React Native app lives in [`mobile/`](./mobile/). It displays the existing website in a WebView so it keeps exactly the same mobile interface and questionnaire flow. It has its own dependencies; the website build and the Docker image do not build it.

The public privacy policy is available at `https://doctorcomtunis.com/privacy-policy` and is linked from the form.

See [`mobile/README.md`](./mobile/README.md) to start the website, then the Expo app on a simulator or device.

## Checks

```powershell
npm test
npm run build
```

Tests for the Claude call use a mocked local HTTP server; the test suite makes no real Anthropic calls.

Drafts are resumed through an `HttpOnly` cookie and are kept only in process memory. They do not survive a restart. Only completed submissions are appended to Google Sheets. Completed submissions must be deleted manually no later than six months after they are sent, in line with the public privacy policy.

On submission, the server computes a score out of 100, appends it with the answers to Google Sheets, then generates an HTML plan with Claude based on the category. The PDF is kept in process memory and served only to the client holding the resume cookie; it is not saved to Google Sheets. Set `HIGH_VALUE_SECTORS` to a comma-separated list of slugs if some sectors should get the 34 points of the company criterion. Without a valid Claude key, or if compilation fails, the submission stays in the sheet and the report moves to the `failed` state; the client can retry generation as long as the process is running.
