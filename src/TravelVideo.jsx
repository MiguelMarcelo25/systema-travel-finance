import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';

// Decorative footage stays local, silent, and idle when it cannot be seen.
export default function TravelVideo({ className = '' }) {
  const root = useRef(null), video = useRef(null);
  const [requested, setRequested] = useState(null);
  const [playing, setPlaying] = useState(false), [ready, setReady] = useState(false), [failed, setFailed] = useState(false);
  useEffect(() => {
    if (failed) return;
    const media = video.current, reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    let visible = false, disposed = false;
    const shouldPlay = () => !disposed && visible && !document.hidden && (requested ?? (!reduce.matches && !navigator.connection?.saveData));
    function sync() {
      if (!shouldPlay()) { media.pause(); return; }
      if (!media.getAttribute('src')) media.src = '/videos/coastal-journey.mp4';
      media.play().then(() => { if (!shouldPlay()) media.pause(); }).catch(() => { /* Poster and play control remain available if autoplay is blocked. */ });
    }
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }, { threshold: .01 });
    observer.observe(root.current);
    reduce.addEventListener('change', sync);
    document.addEventListener('visibilitychange', sync);
    return () => { disposed = true; observer.disconnect(); reduce.removeEventListener('change', sync); document.removeEventListener('visibilitychange', sync); media.pause(); };
  }, [requested, failed]);
  return <div ref={root} className={`travel-video ${className}`}>
    <img className="travel-video-poster" src="/images/coastal-journey-poster.webp" alt="Aerial view of boats beside a palm-lined tropical beach"/>
    <video ref={video} className={ready && !failed ? 'is-ready' : ''} muted playsInline loop preload="none" aria-hidden="true" tabIndex={-1}
      onPlaying={() => { setReady(true); setPlaying(true); }} onPause={() => setPlaying(false)} onError={() => { setFailed(true); setPlaying(false); }}/>
    {!failed && <button type="button" className="travel-video-toggle" aria-label={playing ? 'Pause travel video' : 'Play travel video'} onClick={() => setRequested(!playing)}>
      {playing ? <Pause size={16} aria-hidden="true"/> : <Play size={16} aria-hidden="true"/>}<span>{playing ? 'Pause video' : 'Play video'}</span>
    </button>}
  </div>;
}
