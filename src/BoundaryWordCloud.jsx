import { useEffect, useRef } from 'react';
import { packWordCloud } from '../shared/word-cloud-layout.mjs';

export default function BoundaryWordCloud({ words }) {
  const canvas = useRef();
  useEffect(() => {
    const node = canvas.current;
    let disposed = false, pending;
    function paint() {
      if (disposed) return;
      const width = Math.round(node.clientWidth), height = Math.round(node.clientHeight);
      if (!width || !height) return;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      node.width = width * ratio; node.height = height * ratio;
      const context = node.getContext('2d'); if (!context) return;
      context.scale(ratio, ratio);
      const font = getComputedStyle(node).fontFamily;
      const buffer = document.createElement('canvas'), brush = buffer.getContext('2d', { willReadFrequently: true });
      if (!brush) return;
      const compact = width < 520;
      if (!words.length) return;
      const count = Math.min(240, Math.max(words.length, Math.ceil(width * height / 900)));
      const slots = Array.from({ length: count }, (_, index) => words[index % words.length]);
      const sprites = new Map();
      const placements = packWordCloud(slots, Math.floor(width / 2), Math.floor(height / 2), (word, index, shrink) => {
        const size = Math.max(9, (index === 0 ? compact ? 37 : 56 : index === 1 ? compact ? 26 : 38 : index < 5 ? 29 - index * 2 : 10 + (index * 13 % 15)) * .8 ** shrink);
        const weight = index < 5 ? 750 : index % 3 === 0 ? 650 : 500;
        const angle = (index > 2 && index % 5 === 0 ? 82 : -8) * Math.PI / 180;
        const key = `${word}:${size}:${weight}:${angle}`;
        if (sprites.has(key)) return sprites.get(key);
        brush.font = `${weight} ${size / 2}px ${font}`;
        const metrics = brush.measureText(word);
        const textWidth = metrics.width + 2, textHeight = size / 2 + 2;
        const w = Math.ceil(Math.abs(Math.cos(angle)) * textWidth + Math.abs(Math.sin(angle)) * textHeight) + 4;
        const h = Math.ceil(Math.abs(Math.sin(angle)) * textWidth + Math.abs(Math.cos(angle)) * textHeight) + 4;
        buffer.width = w; buffer.height = h;
        brush.translate(w / 2, h / 2); brush.rotate(angle);
        brush.font = `${weight} ${size / 2}px ${font}`;
        brush.textAlign = 'center'; brush.textBaseline = 'middle'; brush.fillText(word, 0, 0);
        const pixels = brush.getImageData(0, 0, w, h).data, cells = new Set();
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          if (pixels[(y * w + x) * 4 + 3] < 24) continue;
          for (const [dx, dy] of [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]]) {
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && nx < w && ny >= 0 && ny < h) cells.add(ny * w + nx);
          }
        }
        const sprite = { width: w, height: h, size, weight, angle, cells: [...cells].map(cell => [cell % w, Math.floor(cell / w)]) };
        sprites.set(key, sprite); return sprite;
      });
      for (const item of placements) {
        context.save(); context.translate((item.x + item.width / 2) * 2, (item.y + item.height / 2) * 2); context.rotate(item.angle);
        context.font = `${item.weight} ${item.size}px ${font}`;
        context.fillStyle = ['#202c3d', '#3d4b5d', '#5b6879', '#758191'][item.index % 4];
        context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillText(item.word, 0, 0); context.restore();
      }
      node.dataset.wordCount = String(placements.length);
    }
    const resize = new ResizeObserver(() => { cancelAnimationFrame(pending); pending = requestAnimationFrame(paint); });
    resize.observe(node); document.fonts.ready.then(() => { if (!disposed) paint(); });
    return () => { disposed = true; cancelAnimationFrame(pending); resize.disconnect(); };
  }, [words.join('\u0000')]);
  return <canvas ref={canvas} className="boundary-word-canvas" aria-hidden="true" />;
}
