# Nitori 3D Interior Simulator

React + Three.js demo inspired by Nitori's 3D Interior Simulator. Place and manipulate furniture in a virtual room with AR support.

## Features

### 🪑 3D Furniture Placement
- Load GLB/GLTF 3D models (chair & table)
- Interactive room environment with realistic lighting
- Click to select objects
- Visual gizmo controls for XYZ manipulation

### 🎮 Controls
- **Mouse**: Drag to rotate camera, scroll to zoom
- **Keyboard Shortcuts**:
  - `G` - Translate/Move mode
  - `R` - Rotate mode
  - `D` - Duplicate selected object
  - `Arrow Keys` - Move object on XZ plane
  - `Q/E` - Move object up/down (Y axis)

### 📱 AR Support

#### iOS (Safari/Chrome)
- Uses **AR Quick Look** with USDZ format
- Tap product cards at bottom of screen to view in AR
- Native iOS AR experience

#### Android (Chrome)
- Full **WebXR** support with hit-test
- Place furniture in real-world environment
- Interactive AR placement

### ➕ Dynamic Product Spawning
- **+ Add Chair** button - Spawn new chair models
- **+ Add Table** button - Spawn new table models
- Random placement within room bounds
- Fallback geometry if GLB not found

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

## Technologies

- **Vite 5.4.10** - Fast build tool
- **React 19.2.0** - UI framework
- **Three.js 0.168.0** - 3D rendering
- **OrbitControls** - Camera manipulation
- **TransformControls** - Object interaction
- **GLTFLoader** - 3D model loading
- **WebXR + AR Quick Look** - Cross-platform AR

## Converting 3D Models for iOS

To add new products with iOS AR support:

1. Convert GLB to USDZ at [Reality Converter](https://developer.apple.com/augmented-reality/tools/) or [reality.apple.com/convert](https://reality.apple.com/convert)
2. Place `.usdz` file in `src/assets/`
3. Import and add to AR overlay in `App.tsx`

## Browser Compatibility

| Feature | Chrome (Desktop) | Chrome (Android) | Safari (iOS) | Chrome (iOS) |
|---------|------------------|------------------|--------------|--------------|
| 3D View | ✅ | ✅ | ✅ | ✅ |
| WebXR AR | ✅ | ✅ | ❌ | ❌ |
| AR Quick Look | ❌ | ❌ | ✅ | ✅ |

*Note: Chrome on iOS uses WebKit, so AR Quick Look is supported but WebXR is not.*
