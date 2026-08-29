# Electron Desktop App Setup

Pour un contrôle à distance réel du système (curseur système + contrôle des applications), utilisez l'application Electron.

## Installation

1. Installer les dépendances Electron et robot.js :
```bash
npm install
```

2. Démarrer le serveur :
```bash
npm start
```

3. Dans un autre terminal, lancer l'application Electron :
```bash
npm run electron
```

## Fonctionnalités

- **Contrôle système réel** : robot.js permet de contrôler le curseur système et les applications
- **Souris** : Déplacement, clic gauche/droit/milieu
- **Clavier** : Simulation de frappe clavier
- **Compatible browser** : Fallback vers événements DOM si utilisé dans navigateur

## Utilisation

1. Lancer l'application Electron sur la machine hôte
2. Créer une room et partager l'écran
3. Le spectateur peut rejoindre et contrôler réellement le système hôte
4. Activer le contrôle via le bouton "Control On" sur l'hôte

## Différences Browser vs Electron

**Browser (version actuelle sur Render) :**
- Contrôle limité aux éléments dans la page web
- Ne peut pas contrôler les applications système
- Curseur visuel seulement

**Electron Desktop App :**
- Contrôle système complet avec robot.js
- Peut lancer et contrôler des applications
- Curseur système réel

## Note

La version browser continue de fonctionner pour le partage d'écran, mais pour un vrai contrôle à distance, l'application Electron est nécessaire.
