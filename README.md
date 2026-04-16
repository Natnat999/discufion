# Discufion

Une application de chat P2P minimaliste et moderne pour les réseaux LAN. Communication véritablement sans serveur utilisant WebRTC (via PeerJS).

## Fonctionnalités
- **Peer-to-Peer :** Communication directe de navigateur à navigateur.
- **Design Minimaliste :** Interface épurée et moderne centrée sur l'essentiel.
- **Sans Serveur :** Pas de stockage de messages ni d'autorité centrale.

## Technologies
- React + TypeScript + Vite
- PeerJS (WebRTC)
- Lucide React (Icônes)
- CSS Vanilla

## Déploiement (GitHub Pages)

Pour déployer ce projet sur GitHub Pages :

1. Assurez-vous que le nom de votre dépôt sur GitHub correspond au chemin `base` dans `vite.config.ts` (par défaut `/discufion/`).
2. Lancez la commande suivante :
   ```bash
   npm run deploy
   ```

## Développement

```bash
# Installer les dépendances
npm install

# Lancer le serveur de développement
npm run dev

# Construire pour la production
npm run build
```

## Comment l'utiliser
1. Ouvrez l'application.
2. Partagez votre ID Peer avec un ami.
3. Votre ami entre votre ID et clique sur "Rejoindre le salon".
4. Discutez !
