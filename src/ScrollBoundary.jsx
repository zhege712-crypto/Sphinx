import { useEffect, useRef } from 'react';
import { boundaryForScroll, boundaryWords } from '../shared/scroll-boundary.mjs';
import './scroll-boundary.css';
import BoundaryWordCloud from './BoundaryWordCloud';

const scrollerSelector = '.document-column, .reference-page, .reading-home, .management';
function nestedScroller(target, scroller) {
  for (let node = target instanceof Element ? target : target?.parentElement; node && node !== scroller; node = node.parentElement) {
    if (node.matches('dialog, textarea, select, input[type=range], [role=slider]')) return true;
    const style = getComputedStyle(node);
    if (/(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight + 1) return true;
    if (/(auto|scroll)/.test(style.overflowX) && node.scrollWidth > node.clientWidth + 1) return true;
  }
  return false;
}

// Feedback moves only the content viewport, never the fixed background or scrollTop.
export default function ScrollBoundary({ children, routeKey, entries }) {
  const frame = useRef();
  const words = boundaryWords(entries);
  useEffect(() => {
    const root = frame.current;
    let scroller, resize, timer, amount = 0, side = '', touch, disposed = false;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    function reset() {
      clearTimeout(timer); amount = 0; side = '';
      root.removeAttribute('data-boundary');
      root.style.removeProperty('--boundary-reveal');
      scroller?.style.removeProperty('--boundary-offset');
    }
    function release(delay = 2800) { clearTimeout(timer); timer = setTimeout(reset, delay); }
    function reveal(next, distance) {
      clearTimeout(timer);
      if (side !== next) amount = 0;
      side = next; amount = Math.min(next === 'top' ? 112 : 176, Math.max(0, distance));
      root.dataset.boundary = next;
      root.style.setProperty('--boundary-reveal', `${amount}px`);
      scroller.style.setProperty('--boundary-offset', `${reduced.matches ? 0 : amount * (next === 'top' ? 1 : -1)}px`);
    }
    function place() {
      if (!scroller) return;
      const outer = root.getBoundingClientRect(), box = scroller.getBoundingClientRect();
      root.style.setProperty('--boundary-left', `${box.left - outer.left}px`);
      root.style.setProperty('--boundary-top', `${scroller.offsetTop}px`);
      root.style.setProperty('--boundary-width', `${scroller.clientWidth}px`);
      root.style.setProperty('--boundary-height', `${scroller.clientHeight}px`);
    }
    function wheel(event) {
      if (event.ctrlKey || event.metaKey || Math.abs(event.deltaX) > Math.abs(event.deltaY) || nestedScroller(event.target, scroller)) return;
      const next = boundaryForScroll(scroller, event.deltaY);
      if (!next) { if (side) reset(); return; }
      if (event.cancelable) event.preventDefault();
      reveal(next, next === 'top' ? 112 : 176);
      release();
    }
    function touchStart(event) {
      reset(); touch = null;
      if (event.touches.length !== 1 || nestedScroller(event.target, scroller) || event.target.closest('button, a, input, [draggable=true], [role=slider]')) return;
      touch = { x: event.touches[0].clientX, y: event.touches[0].clientY };
    }
    function touchMove(event) {
      if (!touch || event.touches.length !== 1) { touch = null; reset(); return; }
      const dx = event.touches[0].clientX - touch.x, dy = event.touches[0].clientY - touch.y;
      if (Math.abs(dx) > Math.abs(dy)) { reset(); return; }
      const next = boundaryForScroll(scroller, -dy);
      if (!next) { reset(); touch = { x: event.touches[0].clientX, y: event.touches[0].clientY }; return; }
      if (event.cancelable) event.preventDefault();
      reveal(next, Math.abs(dy) * .55);
    }
    function touchEnd() { touch = null; release(2000); }
    function scroll() { if (side && !boundaryForScroll(scroller, side === 'top' ? -1 : 1)) reset(); }
    function keydown(event) {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || event.target.closest('input, textarea, select, [contenteditable=true], dialog')) return;
      const delta = ['ArrowUp', 'PageUp', 'Home'].includes(event.key) ? -1 : ['ArrowDown', 'PageDown', 'End'].includes(event.key) ? 1 : 0;
      const next = boundaryForScroll(scroller, delta);
      if (next) { reveal(next, next === 'top' ? 112 : 176); release(); }
      else if (delta || event.key === 'Escape') reset();
    }
    function detach() {
      if (!scroller) return;
      reset(); resize?.disconnect(); scroller.classList.remove('boundary-scroller');
      for (const [type, handler] of [['wheel', wheel], ['touchstart', touchStart], ['touchmove', touchMove], ['touchend', touchEnd], ['touchcancel', reset], ['scroll', scroll]]) scroller.removeEventListener(type, handler);
    }
    function attach() {
      if (disposed) return;
      const next = root.querySelector(scrollerSelector);
      if (next === scroller) return;
      detach(); scroller = next; root.toggleAttribute('data-has-scroller', !!scroller);
      if (!scroller) return;
      scroller.classList.add('boundary-scroller');
      for (const [type, handler] of [['wheel', wheel], ['touchstart', touchStart], ['touchmove', touchMove], ['touchend', touchEnd], ['touchcancel', reset], ['scroll', scroll]]) scroller.addEventListener(type, handler, { passive: !['wheel', 'touchmove'].includes(type) });
      resize = new ResizeObserver(place); resize.observe(scroller); resize.observe(root); place();
    }
    const observer = new MutationObserver(attach);
    observer.observe(root, { childList: true, subtree: true });
    attach(); root.addEventListener('keydown', keydown); window.addEventListener('blur', reset);
    return () => { disposed = true; observer.disconnect(); detach(); root.removeEventListener('keydown', keydown); window.removeEventListener('blur', reset); };
  }, [routeKey]);
  return <div ref={frame} className="scroll-boundary-frame">
    {children}
    <div className="scroll-boundary-scene" aria-hidden="true">
      <div className="scroll-boundary-message"><span className="scroll-boundary-face">ฅ(˶•̀ᴗ•́˶)ฅ</span><p>真的没有更多了，请继续耕耘当下喵</p></div>
      <div className="scroll-boundary-cloud"><BoundaryWordCloud words={words} /></div>
    </div>
  </div>;
}
