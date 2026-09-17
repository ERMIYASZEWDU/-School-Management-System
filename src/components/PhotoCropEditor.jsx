import React, { useState, useEffect, useRef, useCallback } from 'react'
import { X, ZoomIn } from 'lucide-react'
import { useTranslation } from 'react-i18next'

// Square photo crop editor used by the Profile page. The user pans (drag)
// and zooms (wheel / slider) the photo inside a fixed square frame so the
// avatar can show exactly the face framing they want. onApply receives the
// baked 512x512 JPEG File of the framed area.
export const PhotoCropEditor = ({ isOpen, imageSrc, onApply, onCancel }) => {
  const { t } = useTranslation()
  const boxRef = useRef(null)
  const imgRef = useRef(null)
  const dragRef = useRef(null)

  const [box, setBox] = useState({ w: 0, h: 0 })
  const [imgDims, setImgDims] = useState(null) // { nw, nh } — natural size, kept in state so render never depends on a ref
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })

  const MIN_ZOOM = 1
  const MAX_ZOOM = 3

  // Load the image (twice: once for natural dimensions, once rendered) and
  // reset the framing whenever a new photo opens in the editor
  useEffect(() => {
    if (!isOpen || !imageSrc) {
      setImgDims(null)
      return undefined
    }
    setZoom(1)
    setOffset({ x: 0, y: 0 })
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

  const geometry = useCallback(() => {
    // Depends only on state — never on imgRef — so the <img> can render on
    // the very pass after dimensions load (no chicken-and-egg deadlock).
    // Cover-fit: scale so the image always fully covers the square frame
    // (min dimension of the image fills the frame), so zoom=1 never shows
    // letterbox bars in the output.
    if (!imgDims || !box.w || !box.h) return null
    const baseScale = Math.max(box.w / imgDims.nw, box.h / imgDims.nh)
    return {
      dispW: imgDims.nw * baseScale * zoom,
      dispH: imgDims.nh * baseScale * zoom
    }
  }, [imgDims, box, zoom])

  // Clamp panning so the square is always fully covered by the image
  useEffect(() => {
    const geo = geometry()
    if (!geo) return
    setOffset((o) => {
      const maxX = Math.max(0, (geo.dispW - box.w) / 2)
      const maxY = Math.max(0, (geo.dispH - box.h) / 2)
      return {
        x: Math.min(maxX, Math.max(-maxX, o.x)),
        y: Math.min(maxY, Math.max(-maxY, o.y))
      }
    })
  }, [geometry, box])

  const handlePointerDown = (e) => {
    e.preventDefault()
    dragRef.current = { startX: e.clientX, startY: e.clientY, baseX: offset.x, baseY: offset.y }
    // Keep receiving moves outside the frame (and stop touch scrolling)
    // until the pointer is released anywhere.
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }

  const handlePointerMove = (e) => {
    const drag = dragRef.current
    const geo = geometry()
    if (!drag || !geo) return
    const maxX = Math.max(0, (geo.dispW - box.w) / 2)
    const maxY = Math.max(0, (geo.dispH - box.h) / 2)
    setOffset({
      x: Math.min(maxX, Math.max(-maxX, drag.baseX + (e.clientX - drag.startX))),
      y: Math.min(maxY, Math.max(-maxY, drag.baseY + (e.clientY - drag.startY)))
    })
  }

  const endDrag = () => {
    dragRef.current = null
  }

  const handleApply = () => {
    const img = imgRef.current
    const geo = geometry()
    if (!img || !geo) return
    // Must mirror geometry()'s cover-fit: max of the two ratios.
    const scale = Math.max(box.w / imgDims.nw, box.h / imgDims.nh) * zoom
    const left = (box.w - geo.dispW) / 2 + offset.x
    const top = (box.h - geo.dispH) / 2 + offset.y

    const OUT = 512
    const canvas = document.createElement('canvas')
    canvas.width = OUT
    canvas.height = OUT
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, OUT, OUT)
    ctx.drawImage(
      img,
      -left / scale,
      -top / scale,
      box.w / scale,
      box.h / scale,
      0,
      0,
      OUT,
      OUT
    )
    canvas.toBlob((blob) => {
      if (!blob) return
      onApply(new File([blob], 'profile-photo.jpg', { type: 'image/jpeg' }))
    }, 'image/jpeg', 0.9)
  }

  if (!isOpen) return null

  const geo = geometry()
  const ready = !!geo

  return (
      <div
        className="fixed inset-0 z-[1060] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            {t('profile.editPhoto', 'Edit Photo')}
          </h3>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            aria-label={t('common.cancel', 'Cancel')}
          >
            <X size={18} className="text-gray-500 dark:text-gray-300" />
          </button>
        </div>

        {/* Square crop frame */}
        <div
          ref={boxRef}
          onPointerDown={handlePointerDown}
          className="relative w-full aspect-square rounded-xl overflow-hidden bg-gray-900 cursor-move touch-none select-none"
        >
          {ready && (
            <img
              ref={imgRef}
              src={imageSrc}
              alt=""
              draggable={false}
              className="absolute"
              style={{
                left: `${(box.w - geo.dispW) / 2 + offset.x}px`,
                top: `${(box.h - geo.dispH) / 2 + offset.y}px`,
                width: `${geo.dispW}px`,
                height: `${geo.dispH}px`
              }}
            />
          )}
          {/* Framing guides */}
          <div className="absolute inset-0 pointer-events-none">
            <div
              className="absolute inset-0 bg-black/40"
              style={{
                WebkitMaskImage: 'radial-gradient(circle at 50% 50%, transparent 0 34%, black 34.5%)',
                maskImage: 'radial-gradient(circle at 50% 50%, transparent 0 34%, black 34.5%)'
              }}
            />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[68%] h-[68%] rounded-full border-2 border-white/80 border-dashed" />
          </div>
        </div>

        {/* Zoom control */}
        <div className="flex items-center gap-3 mt-4">
          <ZoomIn size={18} className="text-gray-500 dark:text-gray-300 shrink-0" />
          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step="0.01"
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="w-full accent-blue-600"
          />
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
          {t('profile.cropHint', 'Drag to position your face in the circle, scroll or use the slider to zoom.')}
        </p>

        <div className="flex gap-3 mt-4">
          <button
            onClick={handleApply}
            disabled={!ready}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium disabled:opacity-50"
          >
            {t('profile.applyPhoto', 'Apply')}
          </button>
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition text-sm font-medium"
          >
            {t('common.cancel', 'Cancel')}
          </button>
        </div>
      </div>
    </div>
  )
}
