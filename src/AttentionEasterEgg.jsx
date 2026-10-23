import { useEffect, useId, useRef, useState } from 'react';
import { ChevronRight, ExternalLink, Music2 } from 'lucide-react';
import { attentionTrack } from '../shared/attention-music.mjs';
import './attention-easter-egg.css';

const audioAssets = import.meta.glob('./assets/audio/attention-all-you-need-is-love.{mp3,m4a,wav}', { eager: true, query: '?url', import: 'default' });

function TrackPlayer({ track }) {
  const audio = useRef(null);
  const errorId = useId();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const player = audio.current;
    const pauseWhenHidden = () => { if (document.hidden) player.pause(); };
    document.addEventListener('visibilitychange', pauseWhenHidden);
    return () => {
      document.removeEventListener('visibilitychange', pauseWhenHidden);
      player.pause();
      player.removeAttribute('src');
      player.load();
    };
  }, [track.src]);
  return <div className="attention-music-content">
    <p className="attention-music-title"><strong>{track.title}</strong></p>
    <a className="attention-music-artist" href={track.href} target="_blank" rel="noopener noreferrer">{track.artist}<ExternalLink size={13} aria-hidden="true" /></a>
    <p className="attention-music-note">模型需要 attention，我们还需要一点 love。</p>
    <audio ref={audio} src={track.src} controls preload="none" aria-label={`${track.title} — ${track.artist}`} aria-describedby={failed ? errorId : undefined} onError={() => setFailed(true)} onCanPlay={() => setFailed(false)} />
    {failed && <div className="attention-music-error" id={errorId} role="status"><span>音频暂时无法播放，请重新加载后再试。</span><button type="button" onClick={() => { setFailed(false); audio.current?.load(); }}>重新加载音频</button></div>}
  </div>;
}

export function MusicEasterEgg({ track }) {
  const [open, setOpen] = useState(false);
  return <details className="attention-music" onToggle={event => setOpen(event.currentTarget.open)}>
    <summary><ChevronRight className="attention-music-chevron" size={16} aria-hidden="true" /><span>All you need is…</span><Music2 size={16} aria-hidden="true" /></summary>
    {open && <TrackPlayer track={track} />}
  </details>;
}

export default function AttentionEasterEgg({ document, assets = audioAssets }) {
  const track = attentionTrack(document, assets);
  return track ? <MusicEasterEgg key={`${document.id}:${track.src}`} track={track} /> : null;
}
