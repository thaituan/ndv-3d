## Requirements

- Node.js 18+

## Run locally

```bash
npm install
npm run dev
```

Visit `http://localhost:5173` (or your LAN IP for mobile testing)

## Build

```bash
npm run build
npm run preview
```

## Project Structure

```
src/
├── App.tsx           # Main 3D scene with Three.js setup
├── App.css           # Component styling
├── index.css         # Global styles
├── vite-env.d.ts     # TypeScript declarations for GLB/USDZ
└── assets/
    ├── chair.glb     # 3D chair model
    ├── chair.usdz    # iOS AR chair model
    ├── table.glb     # 3D table model
    └── table.usdz    # iOS AR table model
```
