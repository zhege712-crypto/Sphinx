import { useEffect, useState } from 'react';
import { ImageOff, Image } from 'lucide-react';
import { createPortal } from 'react-dom';
import { pageBackground, backgroundImage } from '../shared/page-background.mjs';
import { parseRoute } from '../shared/navigation.mjs';
import './page-background.css';

export default function PageBackground({ document, privatePreview = false }) {
  const settings = pageBackground(document);
  const key = `sphinx:background-hidden:${document?.id}${document?.section === 'valhalla' ? ':valhalla' : ''}`;
  const [hidden, setHidden] = useState(() => { try { return localStorage.getItem(key) === '1'; } catch { return false; } });
  const [failed, setFailed] = useState(false);
  const route = parseRoute(location.hash);
  const inScope = route.writing ? route.view === 'editor' && (!route.id || route.id === document?.id) : route.view === 'reader' ? !route.id || route.id === document?.id : ['references', 'valhalla'].includes(route.view) && !!route.id && route.id === document?.id;
  const image = inScope ? backgroundImage(settings, privatePreview) : '';
  const active = !!image && !hidden && !failed;
  useEffect(() => { setFailed(false); }, [image]);
  useEffect(() => { const shell = window.document.querySelector('.app-shell'); if (active) shell?.setAttribute('data-page-background', ''); else shell?.removeAttribute('data-page-background'); return () => shell?.removeAttribute('data-page-background'); }, [active]);
  if (!image) return null;
  const imageStyle = { objectPosition: `${settings.positionX}% ${settings.positionY}%` };
  const blur = Math.max(0, Math.min(30, settings.blur));
  function toggle() { const next = !hidden; setHidden(next); try { localStorage.setItem(key, next ? '1' : '0'); } catch {} }
  return createPortal(<>
    {active && <div className="page-background" aria-hidden="true" style={{ opacity: Math.max(0, Math.min(100, settings.opacity)) / 100 }}><img src={image} alt="" onError={() => setFailed(true)} style={{ ...imageStyle, filter: `blur(${blur}px)` }} /><img className="page-background-edge-blur" src={image} alt="" style={{ ...imageStyle, filter: `blur(${blur + 22}px)` }} /></div>}
    <div className="page-background-toggle"><button type="button" onClick={toggle} aria-pressed={!hidden} title={failed ? '背景图片暂时无法加载，可在背景设置中更换图片' : undefined}>{hidden ? <Image size={14} /> : <ImageOff size={14} />}{hidden ? '显示本页背景' : '关闭本页背景'}</button>{settings.preset === 'windows' && !settings.url && active && <a href="backgrounds/ATTRIBUTION.md" target="_blank" rel="noopener noreferrer">Bliss · Charles O’Rear / Microsoft</a>}</div>
  </>, window.document.body);
}
