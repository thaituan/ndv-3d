import { useRef, useState } from 'react'
import ThreeScene from './ThreeScene'
import chairUsdz from './assets/chair.usdz'
import tableUsdz from './assets/table.usdz'
import './App.css'

export default function App() {
  const setModeRef = useRef<(mode: 'translate' | 'rotate') => void>(() => {})
  const duplicateRef = useRef<() => void>(() => {})
  const addChairRef = useRef<() => void>(() => {})
  const addTableRef = useRef<() => void>(() => {})
  const [isIOS, setIsIOS] = useState(false)

  return (
    <div className="app">
      <header className="hero">
        <h1>Nitori Demo 3D</h1>
      </header>

      <div className="tools">
        <button type="button" onClick={() => setModeRef.current('translate')}>
          Move (G)
        </button>
        <button type="button" onClick={() => setModeRef.current('rotate')}>
          Rotate (R)
        </button>
        <button type="button" onClick={() => duplicateRef.current()}>
          Duplicate (D)
        </button>
        <div className="divider" />
        <button type="button" onClick={() => addChairRef.current()}>
          + Add Chair
        </button>
        <button type="button" onClick={() => addTableRef.current()}>
          + Add Table
        </button>
      </div>

      <ThreeScene
        setModeRef={setModeRef}
        duplicateRef={duplicateRef}
        addChairRef={addChairRef}
        addTableRef={addTableRef}
        setIsIOS={setIsIOS}
      />

      {isIOS && (
        <div className="ios-ar-overlay">
          <div className="ar-products">
            <a rel="ar" href={chairUsdz} className="ar-product-card">
              <div className="ar-card-content">
                <div className="ar-icon">🪑</div>
                <span className="ar-label">Chair</span>
                <span className="ar-hint">Tap to view in AR</span>
              </div>
            </a>
            <a rel="ar" href={tableUsdz} className="ar-product-card">
              <div className="ar-card-content">
                <div className="ar-icon">🪑</div>
                <span className="ar-label">Table</span>
                <span className="ar-hint">Tap to view in AR</span>
              </div>
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
