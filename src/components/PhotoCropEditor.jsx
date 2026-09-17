import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { X, ZoomIn, ZoomOut, RotateCw, RotateCcw, RefreshCcw, Circle, Square } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const OUT_SIZE = 512 // baked output (square) — consistent avatar format app-wide
const MIN_ZOOM = 1
const MAX_ZOOM = 3

// Profile photo editor used by the Profile page. The user pans (drag or arrow
// keys), zooms (wheel / slider / +-), rotates in 90° steps and toggles the
// avatar shape inside a square frame; a live preview shows exactly what will
// be saved. onApply receives the baked square JPEG File (512x512).
export const PhotoCropEditor = ({ isOpen, imageSrc, onApply, onCancel }) => {
  const { t } = useTranslation()
  const boxRef = useRef(null)
  const imgRef = useRef(null)
  const previewRef = useRef(null)
  const dragRef = useRef(null)

  const [box, setBox] = useState({ w: 0, h: 0 })
  const [imgDims, setImgDims] = useState(null) // { nw, nh } natural size, in state so render never depends on a ref
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [rotation, setRotation] = useState(0) // 0 | 90 | 180 | 270
  const [shape, setShape] = useState('circle') // 'circle' | 'square'

  // Natural dimensions of the image after the current rotation (memoized —
  // stable identity, since it feeds geometry used in effect deps)
  const rotDims = useMemo(
    () =>
      imgDims
        ? rotation % 180 === 0
          ? { nw: imgDims.nw, nh: imgDims.nh }
          : { nw: imgDims.nh, nh: imgDims.nw }
        : null,
    [imgDims, rotation]
  )

  // Load the image (twice: once for natural dimensions, once rendered) and
  // reset the framing whenever a new photo opens in the editor
  useEffect(() => {
    if (!isOpen || !imageSrc) {
      setImgDims(null)
      return undefined
    }
    setZoom(1)
    setOffset({ x: 0, y: 0 })
    setRotation(0)
    setShape('circle')
    const probe = new Image()
    probe.onload = () => setImgDims({ nw: probe.naturalWidth, nh: probe.naturalHeight })
    probe.src = imageSrc
    return undefined
  }, [isOpen, imageSrc])

  // Keep the editor box measured (it sizes with the viewport)
  useEffect(() => {
    if (!isOpen) return undefined
    const measure = () => {
      const rect = boxRef.current?.getBoundingClientRect()
      if (rect) setBox({ w: rect.width, h: rect.height })
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [isOpen])

  // Wheel zoom needs a non-passive listener; React attaches wheel as passive,
  // so e.preventDefault() here would warn and let the page scroll.
  useEffect(() => {
    if (!isOpen) return undefined
    const el = boxRef.current
    if (!el) return undefined
    const onWheel = (e) => {
      e.preventDefault()
      setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z * (1 - e.deltaY * 0.0015))))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [isOpen])

  // Focus the crop frame once, when it first becomes interactive, so
  // keyboard panning works immediately (without stealing focus on re-renders)
  const wasReadyRef = useRef(false)

  // Cover-fit geometry in *rotated* display space, memoized so its identity
  // is stable between renders — the clamp effect below depends on it, and a
  // fresh object every render would loop forever.
  const geo = useMemo(() => {
    if (!rotDims || !box.w || !box.h) return null
    const scale = Math.max(box.w / rotDims.nw, box.h / rotDims.nh) * zoom
    return { scale, dispW: rotDims.nw * scale, dispH: rotDims.nh * scale }
  }, [rotDims, box, zoom])

  // Clamp panning so the frame is always fully covered by the image
  useEffect(() => {
    if (!geo) return
    setOffset((o) => {
      const maxX = Math.max(0, (geo.dispW - box.w) / 2)
      const maxY = Math.max(0, (geo.dispH - box.h) / 2)
      return {
        x: Math.min(maxX, Math.max(-maxX, o.x)),
        y: Math.min(maxY, Math.max(-maxY, o.y))
      }
    })
  }, [geo, box])

  const ready = !!geo

  // Focus the crop frame once, when it first becomes interactive, so
  // keyboard panning works immediately (without stealing focus on re-renders)
  useEffect(() => {
    if (isOpen && ready && !wasReadyRef.current) {
      wasReadyRef.current = true
      boxRef.current?.focus()
    }
    if (!ready) wasReadyRef.current = false
  }, [isOpen, ready])

  // Bake the currently framed region into an out×out canvas. Shared by the
  // live preview and Apply so the preview always matches the saved result.
  const bake = useCallback(
    (out) => {
      const img = imgRef.current
      if (!img || !imgDims || !rotDims || !geo || !box.w || !box.h) return null
      const { scale, dispW, dispH } = geo
      const left = (box.w - dispW) / 2 + offset.x
      const top = (box.h - dispH) / 2 + offset.y

      // Offscreen: the image rotated to natural resolution
      const off = document.createElement('canvas')
      off.width = rotDims.nw
      off.height = rotDims.nh
      const octx = off.getContext('2d')
      octx.translate(rotDims.nw / 2, rotDims.nh / 2)
      octx.rotate((rotation * Math.PI) / 180)
      octx.drawImage(img, -imgDims.nw / 2, -imgDims.nh / 2)

      const canvas = document.createElement('canvas')
      canvas.width = out
      canvas.height = out
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, out, out)
      ctx.drawImage(off, -left / scale, -top / scale, box.w / scale, box.h / scale, 0, 0, out, out)
      return canvas
    },
    [imgDims, rotDims, geo, box, offset, rotation]
  )

  // Live result preview — redrawn on every edit so it never drifts from Apply
  useEffect(() => {
    if (!isOpen || !shape) return
    const baked = bake(256)
    const el = previewRef.current
    if (!el) return
    if (!baked) {
      el.width = 256
      el.height = 256
      const ctx = el.getContext('2d')
      ctx.fillStyle = '#f3f4f6'
      ctx.fillRect(0, 0, 256, 256)
      return undefined
    }
    el.width = baked.width
    el.height = baked.height
    el.getContext('2d').drawImage(baked, 0, 0)
    return undefined
  }, [isOpen, bake, shape])

  const clampOffset = (o, g) => {
    const maxX = Math.max(0, (g.dispW - box.w) / 2)
    const maxY = Math.max(0, (g.dispH - box.h) / 2)
    return {
      x: Math.min(maxX, Math.max(-maxX, o.x)),
      y: Math.min(maxY, Math.max(-maxY, o.y))
    }
  }

  const handlePointerDown = (e) => {
    e.preventDefault()
    dragRef.current = { startX: e.clientX, startY: e.clientY, baseX: offset.x, baseY: offset.y }
    // Keep receiving moves outside the frame (and stop touch scrolling)
    // until the pointer is released anywhere.
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }

  const handlePointerMove = (e) => {
    const drag = dragRef.current
    if (!drag || !geo) return
    setOffset(clampOffset({ x: drag.baseX + (e.clientX - drag.startX), y: drag.baseY + (e.clientY - drag.startY) }, geo))
  }

  const endDrag = () => {
    dragRef.current = null
  }

  const zoomBy = (factor) => setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z * factor)))

  const rotateBy = (deg) => setRotation((r) => (r + deg + 360) % 360)

  const resetEdits = () => {
    setZoom(1)
    setOffset({ x: 0, y: 0 })
    setRotation(0)
    setShape('circle')
  }

  // Keyboard panning/zoom/rotation on the frame (frame is focusable)
  const handleKeyDown = (e) => {
    if (!geo) return
    const step = e.shiftKey ? 40 : 12
    const pan = (dx, dy) => {
      e.preventDefault()
      setOffset((o) => clampOffset({ x: o.x + dx, y: o.y + dy }, geo))
    }
    switch (e.key) {
      case 'ArrowLeft': pan(-step, 0); break
      case 'ArrowRight': pan(step, 0); break
      case 'ArrowUp': pan(0, -step); break
      case 'ArrowDown': pan(0, step); break
      case '+':
      case '=': e.preventDefault(); zoomBy(1.15); break
      case '-': e.preventDefault(); zoomBy(1 / 1.15); break
      case 'r': case 'R': e.preventDefault(); rotateBy(e.shiftKey ? -90 : 90); break
      case 'Enter': e.preventDefault(); handleApply(); break
      default: break
    }
  }

  const handleApply = () => {
    const baked = bake(OUT_SIZE)
    if (!baked) return
    baked.toBlob(
      (blob) => {
        if (!blob) return
        onApply(new File([blob], 'profile-photo.jpg', { type: 'image/jpeg' }))
      },
      'image/jpeg',
      0.9
    )
  }

  if (!isOpen) return null

  // The <img> keeps its natural orientation and is CSS-rotated about its
  // center, so it is sized in natural space and centered + offset normally.
  const elW = geo ? imgDims.nw * geo.scale : 0
  const elH = geo ? imgDims.nh * geo.scale : 0

  const iconBtn = 'p-2 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none transition disabled:opacity-40'
  const toggleBtn = (active) =>
    `flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none ${
      active
        ? 'bg-blue-600 text-white'
        : 'border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
    }`

  return (
    <div
      className="fixed inset-0 z-[1060] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onCancel()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('profile.editPhoto', 'Edit Photo')}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-3xl p-4 sm:p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            {t('profile.editPhoto', 'Edit Photo')}
          </h3>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
            aria-label={t('common.cancel', 'Cancel')}
          >
            <X size={18} className="text-gray-500 dark:text-gray-300" />
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-5">
          {/* Left: crop frame + controls */}
          <div className="flex-1 min-w-0">
            <div
              ref={boxRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onKeyDown={handleKeyDown}
              tabIndex={0}
              role="application"
              aria-label={t('profile.cropAreaLabel', 'Photo crop area. Use arrow keys to pan, plus and minus to zoom, R to rotate.')}
              className="relative w-full aspect-square rounded-xl overflow-hidden bg-gray-900 cursor-move touch-none select-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
            >
              {ready && (
                <img
                  ref={imgRef}
                  src={imageSrc}
                  alt=""
                  draggable={false}
                  className="absolute"
                  style={{
                    left: `${(box.w - elW) / 2 + offset.x}px`,
                    top: `${(box.h - elH) / 2 + offset.y}px`,
                    width: `${elW}px`,
                    height: `${elH}px`,
                    transform: `rotate(${rotation}deg)`
                  }}
                />
              )}
              {/* Framing guide: circular or square, matching the chosen shape */}
              <div className="absolute inset-0 pointer-events-none">
                {shape === 'circle' ? (
                  <div className="absolute inset-0 bg-black/40" style={{
                    WebkitMaskImage: 'radial-gradient(circle at 50% 50%, transparent 0 34%, black 34.5%)',
                    maskImage: 'radial-gradient(circle at 50% 50%, transparent 0 34%, black 34.5%)'
                  }} />
                ) : (
                  <>
                    {/* Four bars leaving the central 68% square visible */}
                    <div className="absolute inset-x-0 top-0 h-[16%] bg-black/40" />
                    <div className="absolute inset-x-0 bottom-0 h-[16%] bg-black/40" />
                    <div className="absolute inset-y-0 left-0 w-[16%] bg-black/40" />
                    <div className="absolute inset-y-0 right-0 w-[16%] bg-black/40" />
                  </>
                )}
                {shape === 'circle' ? (
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[68%] h-[68%] rounded-full border-2 border-white/80 border-dashed" />
                ) : (
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[68%] h-[68%] rounded-lg border-2 border-white/80 border-dashed" />
                )}
              </div>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
              {t('profile.cropHint', 'Drag to position your face in the circle, scroll or use the slider to zoom.')}
            </p>

            {/* Zoom slider */}
            <div className="flex items-center gap-3 mt-3">
              <ZoomOut size={16} className="text-gray-500 dark:text-gray-300 shrink-0" aria-hidden="true" />
              <input
                type="range"
                min={MIN_ZOOM}
                max={MAX_ZOOM}
                step="0.01"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                aria-label={t('profile.zoom', 'Zoom')}
                className="w-full accent-blue-600"
              />
              <ZoomIn size={16} className="text-gray-500 dark:text-gray-300 shrink-0" aria-hidden="true" />
            </div>

            {/* Shape / rotate / reset controls */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
              <button type="button" onClick={() => setShape('circle')} aria-pressed={shape === 'circle'} className={toggleBtn(shape === 'circle')}>
                <Circle size={14} aria-hidden="true" /> {t('profile.shapeCircle', 'Circle')}
              </button>
              <button type="button" onClick={() => setShape('square')} aria-pressed={shape === 'square'} className={toggleBtn(shape === 'square')}>
                <Square size={14} aria-hidden="true" /> {t('profile.shapeSquare', 'Square')}
              </button>
              <span className="w-px h-6 bg-gray-200 dark:bg-gray-600 mx-1" aria-hidden="true" />
              <button type="button" onClick={() => rotateBy(-90)} className={iconBtn} aria-label={t('profile.rotateLeft', 'Rotate left')}>
                <RotateCcw size={16} />
              </button>
              <button type="button" onClick={() => rotateBy(90)} className={iconBtn} aria-label={t('profile.rotateRight', 'Rotate right')}>
                <RotateCw size={16} />
              </button>
              <button type="button" onClick={resetEdits} className={iconBtn} aria-label={t('profile.reset', 'Reset')}>
                <RefreshCcw size={16} />
              </button>
            </div>
          </div>

          {/* Right: live preview of the final avatar */}
          <div className="sm:w-44 flex sm:flex-col items-center gap-3 sm:justify-start justify-center">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              {t('profile.preview', 'Preview')}
            </p>
            <div
              className={`w-32 h-32 sm:w-36 sm:h-36 overflow-hidden bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-inner transition-all ${
                shape === 'circle' ? 'rounded-full' : 'rounded-2xl'
              }`}
            >
              <canvas ref={previewRef} width={256} height={256} className="w-full h-full" aria-label={t('profile.previewAria', 'Final photo preview')} />
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
              {OUT_SIZE}×{OUT_SIZE} JPEG
            </p>
          </div>
        </div>

        <div className="flex gap-3 mt-5">
          <button
            onClick={handleApply}
            disabled={!ready}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            {t('profile.applyPhoto', 'Apply')}
          </button>
          <button
            onClick={resetEdits}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition text-sm font-medium focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
          >
            {t('profile.reset', 'Reset')}
          </button>
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition text-sm font-medium focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
          >
            {t('common.cancel', 'Cancel')}
          </button>
        </div>
      </div>
    </div>
  )
}
