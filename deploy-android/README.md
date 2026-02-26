# Historique Voiture - Application Android

## Prérequis

- Node.js 18+
- Compte Expo (gratuit) : https://expo.dev

## Installation

```bash
# Installer les dépendances
npm install

# Installer EAS CLI
npm install -g eas-cli

# Se connecter à Expo
eas login
```

## Configuration

L'URL de l'API est configurée dans `eas.json` :

```json
{
  "build": {
    "production": {
      "env": {
        "EXPO_PUBLIC_API_URL": "https://dev-voiture.delgehier.com"
      }
    }
  }
}
```

## Build APK

```bash
# APK de test (preview)
eas build --platform android --profile preview

# APK de production
eas build --platform android --profile production
```

Le build se fait dans le cloud Expo. Vous recevrez un lien pour télécharger l'APK.

## Build local (sans compte Expo)

```bash
# Générer le projet Android natif
npx expo prebuild --platform android

# Builder avec Gradle
cd android
./gradlew assembleRelease

# APK généré dans : android/app/build/outputs/apk/release/
```

## Développement

```bash
# Lancer en mode dev
npm run dev

# Scanner le QR code avec l'app Expo Go sur votre téléphone
```
