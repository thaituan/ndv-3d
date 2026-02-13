/// <reference types="vite/client" />

declare module '*.glb' {
  const src: string
  export default src
}

declare module '*.usdz' {
  const src: string
  export default src
}
