import { Pause, Play } from 'lucide-react'
import { useRef, useState, useSyncExternalStore } from 'react'

// The owner's brand animation, served exactly as provided (1280×720, 10 s, H.264). The poster is its last frame.
const VIDEO_SRC = '/videos/gemini_generated_video_720ff841.mp4'
const POSTER = '/images/hero/heraldo-video-poster-1280.webp'
const POSTER_SRCSET = '/images/hero/heraldo-video-poster-640.webp 640w, /images/hero/heraldo-video-poster-1280.webp 1280w'
const DESCRIPTION = 'Animación de Heraldo: el personaje presenta pizzas, empanadas, milanesas ¡y mucho más!'

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'

function subscribeToMotionPreference(onChange: () => void) {
  const query = window.matchMedia?.(REDUCED_MOTION)
  query?.addEventListener?.('change', onChange)
  return () => query?.removeEventListener?.('change', onChange)
}

/** Reduced motion, or a visitor saving data: show the still poster instead of downloading and playing the video. */
function prefersStill(): boolean {
  const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true
  return saveData || (window.matchMedia?.(REDUCED_MOTION).matches ?? false)
}

/**
 * The brand animation at its own 16:9 frame, never cropped: the mascot, the words, and the products move across the
 * whole frame, so `object-cover` on a 16:9 box shows all of it without stretching. Muted, looping, inline, and
 * decorative to the page's flow: it never blocks the menu, falls back to the poster if it fails, and can be paused
 * (WCAG 2.2.2). A description stands in for it for screen readers.
 */
export function BrandVideo({ className = '' }: { className?: string }) {
  const still = useSyncExternalStore(subscribeToMotionPreference, prefersStill, () => true)
  const [failed, setFailed] = useState(false)
  const [playing, setPlaying] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const showVideo = !still && !failed

  const toggle = () => {
    const video = videoRef.current
    if (!video) return
    // Follows what the button says, which the video's own play and pause events keep in sync.
    if (playing) video.pause()
    else void video.play()?.catch(() => undefined)
  }

  return (
    <div className={`relative aspect-video w-full overflow-hidden bg-chapa ${className}`}>
      <div role="img" aria-label={DESCRIPTION} className="size-full">
        {showVideo ? (
          <video
            ref={(video) => {
              videoRef.current = video
              // React sets `muted` as a property only; autoplay policies also read the default.
              if (video) {
                video.muted = true
                video.defaultMuted = true
              }
            }}
            src={VIDEO_SRC}
            poster={POSTER}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            aria-hidden="true"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onError={() => setFailed(true)}
            className="size-full object-cover"
          />
        ) : (
          <img
            src={POSTER}
            srcSet={POSTER_SRCSET}
            sizes="(min-width: 768px) 60vw, 100vw"
            alt=""
            width={1280}
            height={720}
            fetchPriority="high"
            className="size-full object-cover"
          />
        )}
      </div>
      {showVideo ? (
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? 'Pausar la animación' : 'Reproducir la animación'}
          className="absolute right-2 bottom-2 grid size-11 place-items-center rounded-full bg-chapa/70 text-crema ring-1 ring-crema/25 backdrop-blur-sm transition-colors hover:bg-chapa"
        >
          {playing ? <Pause aria-hidden="true" className="size-4.5" /> : <Play aria-hidden="true" className="size-4.5" />}
        </button>
      ) : null}
    </div>
  )
}
