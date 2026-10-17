import { useLayoutEffect } from 'react';
export default function useScrollMemory(key, ref) {
  useLayoutEffect(() => {
    const node = ref.current; if (!node) return;
    const storageKey = `sphinx-scroll:${key}`;
    try { node.scrollTop = Math.max(0, Number(sessionStorage.getItem(storageKey)) || 0); } catch {}
    const remember = () => { try { sessionStorage.setItem(storageKey, String(node.scrollTop)); } catch {} };
    node.addEventListener('scroll', remember, { passive: true });
    return () => { remember(); node.removeEventListener('scroll', remember); };
  }, [key]);
}
