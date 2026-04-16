# Discufion

A minimalist, modern P2P chat application for LAN networks. Truly serverless communication using WebRTC (via PeerJS).

## Features
- **Peer-to-Peer:** Direct browser-to-browser communication.
- **Minimalist Design:** Clean, modern interface focusing on what matters.
- **No Server:** No message storage or central authority.

## Tech Stack
- React + TypeScript + Vite
- PeerJS (WebRTC)
- Lucide React (Icons)
- Vanilla CSS

## Deployment (GitHub Pages)

To deploy this project to GitHub Pages:

1. Ensure your repository name on GitHub matches the `base` path in `vite.config.ts` (default is `/discufion/`).
2. Run the following command:
   ```bash
   npm run deploy
   ```

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## How to use
1. Open the app.
2. Share your Peer ID with a friend.
3. Your friend enters your ID and clicks "Join Chat".
4. Chat away!
