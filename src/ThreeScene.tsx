import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { TransformControls } from 'three/addons/controls/TransformControls.js'
import { ARButton } from 'three/addons/webxr/ARButton.js'

// Reuse the internal helper type from App for safer access
type TransformControlsInternal = TransformControls & {
  mouseButtons?: Record<string, number>
  _root?: THREE.Object3D
  root?: THREE.Object3D
  _gizmo?: THREE.Object3D
  gizmo?: THREE.Object3D
  visible?: boolean
  update?: (delta?: number) => void
}

type Props = {
  setModeRef: React.MutableRefObject<(mode: 'translate' | 'rotate') => void>
  duplicateRef: React.MutableRefObject<() => void>
  addChairRef: React.MutableRefObject<() => void>
  addTableRef: React.MutableRefObject<() => void>
  setIsIOS: React.Dispatch<React.SetStateAction<boolean>>
}

export default function ThreeScene({
  setModeRef,
  duplicateRef,
  addChairRef,
  addTableRef,
  setIsIOS,
}: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent))

    if (!mountRef.current) return
    const container = mountRef.current

    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#162338')

    const camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      100,
    )
    camera.position.set(0, 0.8, 2.4)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.xr.enabled = true
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    container.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.enablePan = false
    controls.minDistance = 1.2
    controls.maxDistance = 6
    controls.target.set(0, 0, 0)

    // Temporary safe-patch around Object3D.add while TransformControls constructs
    const _originalAdd = THREE.Object3D.prototype.add
    THREE.Object3D.prototype.add = function (...objects: unknown[]) {
      try {
        return _originalAdd.apply(this, objects as unknown as Parameters<typeof _originalAdd>)
      } catch {
        const filtered = objects.filter((o): o is THREE.Object3D => Boolean((o as unknown as { isObject3D?: boolean }).isObject3D))
        if (filtered.length) return _originalAdd.apply(this, filtered as unknown as Parameters<typeof _originalAdd>)
        return this
      }
    }

    const transformControls = new TransformControls(camera, renderer.domElement)
    const tc = transformControls as unknown as TransformControlsInternal

    // restore original add implementation immediately
    THREE.Object3D.prototype.add = _originalAdd

    tc.setMode('translate')
    tc.setSpace('world')
    tc.setSize(1.1)

    // Ensure mouse button mappings (fixes null mouseButtons in some builds)
    tc.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN,
    }

    tc.addEventListener('dragging-changed', (event) => {
      controls.enabled = !event.value
    })

    // Add transform controls (or fallback internal root/gizmo) to the scene so the gizmo shows
    if ((tc as unknown as { isObject3D?: boolean }).isObject3D) {
      scene.add(tc as unknown as THREE.Object3D)
    } else {
      const internalRoot = tc._root || tc.root
      const internalGizmo = tc._gizmo || tc.gizmo
      if (internalRoot && internalRoot.isObject3D) scene.add(internalRoot)
      if (internalGizmo && internalGizmo.isObject3D && internalGizmo.parent == null) scene.add(internalGizmo)
      console.debug('TransformControls fallback used (internal root/gizmo added)')
    }

    tc.showX = true
    tc.showY = true
    tc.showZ = true

    setModeRef.current = (mode) => {
      tc.setMode(mode)
    }

    const isiOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    let arButton: HTMLElement

    if (!isiOS) {
      arButton = ARButton.createButton(renderer, {
        requiredFeatures: ['hit-test'],
      })
      container.appendChild(arButton)
    } else {
      arButton = document.createElement('div')
    }

    const reticleGeometry = new THREE.RingGeometry(0.08, 0.11, 32).rotateX(-Math.PI / 2)
    const reticleMaterial = new THREE.MeshBasicMaterial({ color: '#7ef9ff' })
    const reticle = new THREE.Mesh(reticleGeometry, reticleMaterial)
    reticle.matrixAutoUpdate = false
    reticle.visible = false
    scene.add(reticle)

    const loader = new GLTFLoader()
    let room: THREE.Object3D | null = null
    let chair: THREE.Object3D | null = null
    let activeObject: THREE.Object3D | null = null
    const selectable: THREE.Object3D[] = []
    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()
    let floorY = 0

    const updatePointer = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect()
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    }

    const findSelectable = (object: THREE.Object3D) => {
      let current: THREE.Object3D | null = object
      while (current) {
        if (selectable.includes(current)) {
          return current
        }
        current = current.parent
      }
      return null
    }

    const selectObject = (object: THREE.Object3D | null) => {
      activeObject = object
      if (activeObject) {
        console.debug('attach object', {
          name: (activeObject as THREE.Object3D & { name?: string }).name ?? activeObject.type,
          scale: activeObject.scale,
          parentScale: activeObject.parent?.scale,
        })

        tc.attach(activeObject)
        ;(tc as unknown as THREE.Object3D).visible = true
      } else {
        tc.detach()
        ;(tc as unknown as THREE.Object3D).visible = false
      }
    }

    const roomGroup = new THREE.Group()
    const roomSize = { width: 6, height: 3, depth: 6 }
    const roomBox = new THREE.Mesh(
      new THREE.BoxGeometry(roomSize.width, roomSize.height, roomSize.depth),
      new THREE.MeshStandardMaterial({
        color: '#26364b',
        roughness: 0.95,
        metalness: 0.05,
        side: THREE.BackSide,
      }),
    )
    roomBox.position.y = roomSize.height / 2
    roomBox.receiveShadow = true
    roomGroup.add(roomBox)

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(roomSize.width - 0.4, roomSize.depth - 0.4),
      new THREE.MeshStandardMaterial({
        color: '#6c563f',
        roughness: 0.75,
        metalness: 0.1,
      }),
    )
    floor.rotation.x = -Math.PI / 2
    floor.position.y = 0.01
    floor.receiveShadow = true
    roomGroup.add(floor)

    room = roomGroup
    scene.add(roomGroup)

    floorY = 0

    const addProduct = (modelUrl: string, offsetX = 0, offsetZ = 0) => {
      loader.load(
        modelUrl,
        (gltf) => {
          const product = gltf.scene
          scene.add(product)

          const box = new THREE.Box3().setFromObject(product)
          const center = box.getCenter(new THREE.Vector3())
          const minY = box.min.y
          product.position.sub(center)
          product.position.y -= minY
          product.position.y = floorY
          product.position.x = offsetX
          product.position.z = offsetZ
          product.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.castShadow = true
              child.receiveShadow = true
            }
          })
          selectable.push(product)
          selectObject(product)
        },
        undefined,
        (error) => {
          console.error('Failed to load GLB model', error)
        },
      )
    }

    // Load initial chair
    loader.load(
      '/src/assets/chair.glb',
      (gltf) => {
        chair = gltf.scene
        scene.add(chair)

        const box = new THREE.Box3().setFromObject(chair)
        const center = box.getCenter(new THREE.Vector3())
        const minY = box.min.y
        chair.position.sub(center)
        chair.position.y -= minY
        chair.position.y = floorY
        chair.position.x = 0.4
        chair.position.z = 0.2
        chair.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true
            child.receiveShadow = true
          }
        })
        selectable.push(chair)
        selectObject(chair)
      },
      undefined,
      (error) => {
        console.error('Failed to load chair GLB model', error)
      },
    )

    addChairRef.current = () => {
      addProduct('/src/assets/chair.glb', Math.random() * 2 - 1, Math.random() * 2 - 1)
    }

    addTableRef.current = () => {
      loader.load(
        '/src/assets/table.glb',
        (gltf) => {
          const product = gltf.scene
          scene.add(product)

          const box = new THREE.Box3().setFromObject(product)
          const center = box.getCenter(new THREE.Vector3())
          const minY = box.min.y
          product.position.sub(center)
          product.position.y -= minY
          product.position.y = floorY
          product.position.x = Math.random() * 2 - 1
          product.position.z = Math.random() * 2 - 1
          product.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.castShadow = true
              child.receiveShadow = true
            }
          })
          selectable.push(product)
          selectObject(product)
        },
        undefined,
        () => {
          console.warn('table.glb not found, creating simple table geometry')
          const tableGroup = new THREE.Group()
          const tableTop = new THREE.Mesh(
            new THREE.BoxGeometry(1.2, 0.05, 0.8),
            new THREE.MeshStandardMaterial({
              color: '#8b7355',
              roughness: 0.8,
              metalness: 0.1,
            }),
          )
          tableTop.position.y = 0.7
          tableTop.castShadow = true
          tableTop.receiveShadow = true
          tableGroup.add(tableTop)

          const legGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.7)
          const legMaterial = new THREE.MeshStandardMaterial({
            color: '#6b5744',
            roughness: 0.9,
            metalness: 0.05,
          })
          const legPositions = [
            [-0.5, 0.35, -0.35],
            [0.5, 0.35, -0.35],
            [-0.5, 0.35, 0.35],
            [0.5, 0.35, 0.35],
          ]
          legPositions.forEach(([x, y, z]) => {
            const leg = new THREE.Mesh(legGeometry, legMaterial)
            leg.position.set(x, y, z)
            leg.castShadow = true
            leg.receiveShadow = true
            tableGroup.add(leg)
          })

          tableGroup.position.set(
            Math.random() * 2 - 1,
            floorY,
            Math.random() * 2 - 1,
          )
          scene.add(tableGroup)
          selectable.push(tableGroup)
          selectObject(tableGroup)
        },
      )
    }

    const duplicateChair = () => {
      if (!activeObject) {
        return
      }
      const clone = activeObject.clone(true)
      clone.position.x += 0.3
      clone.position.z += 0.3
      clone.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true
          child.receiveShadow = true
        }
      })
      scene.add(clone)
      selectable.push(clone)
      selectObject(clone)
    }

    duplicateRef.current = duplicateChair

    const controller = renderer.xr.getController(0)
    controller.addEventListener('select', () => {
      if (chair && reticle.visible) {
        chair.position.setFromMatrixPosition(reticle.matrix)
        chair.position.y = floorY
        chair.rotation.set(0, 0, 0)
      }
    })
    scene.add(controller)

    const ambientLight = new THREE.AmbientLight('#ffffff', 0.8)
    scene.add(ambientLight)

    const keyLight = new THREE.DirectionalLight('#ffb969', 0.8)
    keyLight.position.set(2, 3, 4)
    keyLight.castShadow = true
    scene.add(keyLight)

    const fillLight = new THREE.DirectionalLight('#6aa9ff', 0.6)
    fillLight.position.set(-3, 1, 2)
    scene.add(fillLight)

    let hitTestSource: XRHitTestSource | null = null
    let hitTestSourceRequested = false

    const animate = (_time: number, frame?: XRFrame) => {
      if (renderer.xr.isPresenting) {
        controls.enabled = false
        if (frame) {
          const referenceSpace = renderer.xr.getReferenceSpace()
          const session = renderer.xr.getSession()

          // WebXR hit test for Android
          if (!hitTestSourceRequested && session && session.requestHitTestSource) {
            const xrSession = session
            xrSession.requestReferenceSpace('viewer').then((space: XRReferenceSpace) => {
              xrSession.requestHitTestSource?.({ space })?.then((source: XRHitTestSource) => {
                hitTestSource = source
              }).catch(() => {
                console.warn('Hit test source request failed')
              })
            }).catch(() => {
              console.warn('Reference space request failed')
            })

            xrSession.addEventListener('end', () => {
              hitTestSourceRequested = false
              hitTestSource = null
              reticle.visible = false
              controls.enabled = true
            })

            hitTestSourceRequested = true
          }

          if (hitTestSource && referenceSpace) {
            const hitTestResults = frame.getHitTestResults(hitTestSource)
            if (hitTestResults.length > 0) {
              const hit = hitTestResults[0]
              const pose = hit.getPose(referenceSpace)
              if (pose) {
                reticle.visible = true
                reticle.matrix.fromArray(pose.transform.matrix)
              }
            } else {
              reticle.visible = false
            }
          }
        }
      }

      // Ensure transform gizmo updates each frame (fixes orientation/scale issues)
      tc.update?.(0)

      controls.update()
      renderer.render(scene, camera)
    }

    renderer.setAnimationLoop(animate)

    const handleResize = () => {
      const { clientWidth, clientHeight } = container
      camera.aspect = clientWidth / clientHeight
      camera.updateProjectionMatrix()
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.setSize(clientWidth, clientHeight)
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (renderer.xr.isPresenting || (tc as unknown as { dragging?: boolean }).dragging) {
        return
      }
      updatePointer(event)
      raycaster.setFromCamera(pointer, camera)
      const hits = raycaster.intersectObjects(selectable, true)
      if (hits.length > 0) {
        const target = findSelectable(hits[0].object)
        if (target) {
          selectObject(target)
        }
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!activeObject) {
        return
      }
      const step = event.shiftKey ? 0.05 : 0.15
      switch (event.code) {
        case 'ArrowUp':
          activeObject.position.z -= step
          break
        case 'ArrowDown':
          activeObject.position.z += step
          break
        case 'ArrowLeft':
          activeObject.position.x -= step
          break
        case 'ArrowRight':
          activeObject.position.x += step
          break
        case 'KeyQ':
          activeObject.position.y += step
          break
        case 'KeyE':
          activeObject.position.y -= step
          break
        case 'KeyG':
          tc.setMode('translate')
          break
        case 'KeyR':
          tc.setMode('rotate')
          break
        case 'KeyD':
          duplicateChair()
          break
        case 'Delete':
        case 'Backspace':
          if (activeObject && selectable.length > 1) {
            scene.remove(activeObject)
            const index = selectable.indexOf(activeObject)
            if (index >= 0) {
              selectable.splice(index, 1)
            }
            selectObject(selectable[0] ?? null)
          }
          break
        default:
          return
      }
    }

    window.addEventListener('resize', handleResize)
    renderer.domElement.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('resize', handleResize)
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
      renderer.setAnimationLoop(null)
      const disposeObject = (object: THREE.Object3D | null) => {
        if (!object) {
          return
        }
        object.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose()
            if (Array.isArray(child.material)) {
              child.material.forEach((material) => material.dispose())
            } else {
              child.material.dispose()
            }
          }
        })
      }
      disposeObject(room)
      selectable.forEach((object) => disposeObject(object))
      reticleGeometry.dispose()
      reticleMaterial.dispose()
      renderer.dispose()
      controls.dispose()
      tc.dispose()
      if (container.contains(arButton)) {
        container.removeChild(arButton)
      }
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [])

  return <div ref={mountRef} className="scene" />
}

