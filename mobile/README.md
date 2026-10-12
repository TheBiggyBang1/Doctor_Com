# Doctor Com Mobile

The Expo SDK 57 / React Native app displays the existing Doctor Com website in
a native WebView. This keeps the mobile app's design and questionnaire
behavior in sync with the website without copying or changing the website
code. Use a current Expo Go version that supports SDK 57.

## Run locally

1. In a terminal at the project root, start the website and API:

   ```cmd
   cd C:\Users\ASUS\Desktop\DoctorCom
   npm run dev
   ```

   Keep this terminal open. The website runs on port `5173` and its `/api`
   requests are proxied to the API on port `3001`.

2. In a second terminal, install and start Expo:

   ```cmd
   cd C:\Users\ASUS\Desktop\DoctorCom\mobile
   npm install
   npm start
   ```

   `npm install` is only needed the first time. For an Android emulator,
   `http://10.0.2.2:5173` is used automatically; for an iOS simulator,
   `http://localhost:5173` is used automatically. For a physical phone, follow
   the LAN setup below before starting Expo.

   Once Expo starts, scan its QR code in Expo Go, or press `a` to open a
   configured Android emulator. Press `w` to run the web build.

## Use a physical phone

The phone needs a website URL reachable over your local network. Keep the
`npm run dev` terminal open, then open another terminal at the project root and
start a LAN-accessible Vite server on a separate port:

   ```cmd
   cd C:\Users\ASUS\Desktop\DoctorCom
   npx vite --config client/vite.config.ts --host 0.0.0.0 --port 5174
   ```

Then, in the Expo terminal, stop Expo with `Ctrl+C` if it is running, set the
computer's LAN IP as the website URL, and restart it:

   ```cmd
   set "EXPO_PUBLIC_WEB_URL=http://192.168.0.249:5174"
   npx expo start --clear
   ```

Replace `192.168.0.249` with the computer's current Wi-Fi IPv4 address if it
has changed; check it with `ipconfig`. Keep the `set` and `npm start` commands
in the same Command Prompt window, in the `mobile` directory. Before opening
Expo Go, verify that `http://192.168.0.249:5174` opens in the phone's browser.
Allow Node.js through the Windows firewall if prompted, and make sure the
phone and computer are on the same network. Then scan the Expo QR code.

The website and API remain the source of truth: the native app loads both from
the same origin, so draft cookies, questionnaire submissions, and reports keep
working without exposing server credentials in the mobile bundle.

On Android, the app replaces the built-in PDF iframe with an authenticated
viewer so the report renders in WebView without opening a separate browser.

## Build for device testing or release

The EAS profiles use `https://doctorcomtunis.com` for preview and production
builds. They are separate from the root website package and lockfile.

1. In a terminal, link this app to your Expo account and EAS project:

   ```cmd
   cd C:\Users\ASUS\Desktop\DoctorCom\mobile
   npx eas-cli@latest login
   npx eas-cli@latest init
   ```

   `eas init` creates/links the EAS project and writes its project ID into
   `app.json`. Keep that generated ID in the app configuration.

2. Build an installable Android APK for internal testing:

   ```cmd
   npx eas-cli@latest build --platform android --profile preview
   ```

   For an iOS internal build, use `--platform ios --profile preview`; Apple
   account/device provisioning may be required.

3. Build store-ready binaries:

   ```cmd
   npx eas-cli@latest build --platform all --profile production
   ```

   EAS will prompt you to configure signing credentials. Publishing to Google
   Play or the Apple App Store is a separate submission step and requires the
   corresponding developer accounts:

   ```cmd
   npx eas-cli@latest submit --platform android
   npx eas-cli@latest submit --platform ios
   ```

The `development` profile is for a development client and does not set a
production website URL. Test the preview build on physical Android/iOS devices
before submitting it to either store.
