import React, { useState, useEffect, useRef, useCallback } from 'react'
import { X, Camera, CameraOff, Loader2, RefreshCcw, Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const COUNTDOWN_SECONDS = 3

// Live camera capture used by the Profile page. Opens the webcam, shows a
// mirrored preview, and after a 3-2-1 countdown freezes the shot for review
// with Retake / Use Photo actions. Use Photo hands the captured JPEG File to
// onConfirm (which routes it into the crop editor). Fully cleans up the
// stream and timers on close.
export const CameraCapture = ({ onConfirm, onCancel }) => {
  const { t } = useTranslation()
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const timerRef = useRef(null)
  const shotRef = useRef(null) // { url, file }

  // starting | live | error
  const [status, setStatus] = useState('starting')
  const [errorKind, setErrorKind] = useState(null) // denied | unavailable
  const [countdown, setCountdown] = useState(null)
  const [shot, setShot] = useState(null) // object URL of the frozen capture

  useEffect(() => {
    let cancelled = false
    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus('error')
        setErrorKind('unavailable')
        return
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false
        })
        if (cancelled) {
          stream.getTracks().forEach((tr) => tr.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play().catch(() => {})
        }
        setStatus('live')
      } catch (err) {
        if (cancelled) return
        setStatus('error')
        setErrorKind(
          err?.name === 'NotFoundError' || err?.name === 'OverconstrainedError' ? 'unavailable' : 'denied'
        )
      }
    }
    start()
    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((tr) => tr.stop())
      streamRef.current = null
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  // Stop the live stream as soon as a shot is frozen for review (frees the
  // camera promptly and prevents the preview from drifting behind the shot)
  useEffect(() => {
    if (shot && streamRef.current) {
      streamRef.current.getTracks().forEach((tr) => tr.stop())
      streamRef.current = null
    }
  }, [shot])

  useEffect(() => () => {
    // Unmount: drop the frozen shot's object URL if it was never used
    if (shotRef.current?.url) URL.revokeObjectURL(shotRef.current.url)
  }, [])

  const captureShot = useCallback(() => {
    const video = videoRef.current
    if (!video || !video.videoWidth) return
    const vw = video.videoWidth
    const vh = video.videoHeight
    // Square center crop of the feed, mirrored to match exactly what the
    // user saw in the preview
    const edge = Math.min(vw, vh)
    const sx = (vw - edge) / 2
    const sy = (vh - edge) / 2
    const OUT = 640
    const canvas = document.createElement('canvas')
    canvas.width = OUT
    canvas.height = OUT
    const ctx = canvas.getContext('2d')
    ctx.save()
    ctx.translate(OUT, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(video, sx, sy, edge, edge, 0, 0, OUT, OUT)
    ctx.restore()
    canvas.toBlob(
      (blob) => {
        if (!blob) return
        const file = new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' })
        const url = URL.createObjectURL(file)
        shotRef.current = { url, file }
        setShot(url)
      },
      'image/jpeg',
      0.92
    )
  }, [])

  const startCountdown = () => {
    if (status !== 'live' || timerRef.current) return
    let n = COUNTDOWN_SECONDS
    setCountdown(n)
    timerRef.current = setInterval(() => {
      n -= 1
      if (n <= 0) {
        clearInterval(timerRef.current)
        timerRef.current = null
        setCountdown(null)
        captureShot()
      } else {
        setCountdown(n)
      }
    }, 1000)
  }

  const cancelCountdown = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    setCountdown(null)
  }

  const retake = () => {
    if (shotRef.current?.url) URL.revokeObjectURL(shotRef.current.url)
    shotRef.current = null
    setShot(null)
    // The stream was stopped on freeze; restart it for another take
    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false
        })
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play().catch(() => {})
        }
        setStatus('live')
      } catch {
        setStatus('error')
        setErrorKind('denied')
      }
    }
    start()
  }

  const usePhoto = () => {
    const s = shotRef.current
    if (!s) return
    const { file, url } = s
    shotRef.current = null // ownership transfers to the caller
    setShot(null)
    onConfirm(file, url)
  }

  const btnBase =
    'flex-1 px-4 py-2 rounded-lg text-sm font-medium transition focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50'

  return (
    <div className="fixed inset-0 z-[1060] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('profile.cameraTitle', 'Camera')}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md p-4 sm:p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <Camera size={20} className="text-blue-600" aria-hidden="true" />
            {t('profile.cameraTitle', 'Camera')}
          </h3>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
            aria-label={t('common.cancel', 'Cancel')}
          >
            <X size={18} className="text-gray-500 dark:text-gray-300" />
          </button>
        </div>

        {/* Square live view / frozen shot */}
        <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-gray-900 select-none">
          {shot ? (
            <img src={shot} alt={t('profile.capturedShotAlt', 'Captured photo preview')} className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <video
              ref={videoRef}
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
              style={{ transform: 'scaleX(-1)' }}
            />
          )}
          {!shot && status !== 'live' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 gap-3 text-gray-300">
              {status === 'starting' ? (
                <>
                  <Loader2 size={32} className="animate-spin" aria-hidden="true" />
                  <p className="text-sm">{t('profile.cameraStarting', 'Starting camera…')}</p>
                </>
              ) : (
                <>
                  <CameraOff size={32} aria-hidden="true" />
                  <p className="text-sm">
                    {errorKind === 'unavailable'
                      ? t('profile.cameraUnavailable', 'No camera found, or your browser does not support camera capture.')
                      : t('profile.cameraDenied', 'Camera access was denied. Allow camera permission and try again.')}
                  </p>
                </>
              )}
            </div>
          )}
          {countdown != null && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-8xl font-bold text-white drop-shadow-lg" aria-live="polite">{countdown}</span>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-4">
          {shot ? (
            <>
              <button
                onClick={onCancel}
                className={`${btnBase} border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800`}
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                onClick={retake}
                className={`${btnBase} border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-center gap-2`}
              >
                <RefreshCcw size={16} aria-hidden="true" /> {t('profile.retake', 'Retake')}
              </button>
              <button
                onClick={usePhoto}
                className={`${btnBase} bg-blue-600 text-white hover:bg-blue-700 flex items-center justify-center gap-2`}
              >
                <Check size={16} aria-hidden="true" /> {t('profile.usePhoto', 'Use Photo')}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onCancel}
                className={`${btnBase} border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800`}
              >
                {t('common.cancel', 'Cancel')}
              </button>
              {countdown != null ? (
                <button
                  onClick={cancelCountdown}
                  className={`${btnBase} border border-red-300 text-red-700 dark:text-red-300 hover:bg-red-50`}
                >
                  {t('profile.captureStop', 'Stop')}
                </button>
              ) : (
                <button
                  onClick={startCountdown}
                  disabled={status !== 'live'}
                  className={`${btnBase} bg-blue-600 text-white hover:bg-blue-700 flex items-center justify-center gap-2`}
                >
                  <Camera size={16} aria-hidden="true" /> {t('profile.capture', 'Capture')}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
