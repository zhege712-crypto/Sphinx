// Deterministic, bounded packing in a shallow ellipse. Sprites describe occupied
// glyph pixels, rather than boxes, so smaller words can fill gaps between letters.
export function packWordCloud(words, width, height, spriteForWord) {
  if (width < 20 || height < 20) return [];
  const occupied = new Uint8Array(width * height), placed = [];
  const radiusX = width / 2 - 2, radiusY = height / 2 - 2;
  const inside = (x, y) => ((x - width / 2) / radiusX) ** 2 + ((y - height / 2) / radiusY) ** 2 <= 1;
  for (let index = 0; index < Math.min(words.length, 80); index++) {
    let found = false;
    for (let shrink = 0; shrink < 3 && !found; shrink++) {
      const sprite = spriteForWord(words[index], index, shrink);
      if (!sprite?.cells.length || sprite.width > width || sprite.height > height) continue;
      for (let step = 0; step < 1200; step++) {
        const angle = step * 2.399963229728653 + index * .57;
        const radius = Math.sqrt(step / 1200);
        const x = Math.round(width / 2 + Math.cos(angle) * radius * radiusX - sprite.width / 2);
        const y = Math.round(height / 2 + Math.sin(angle) * radius * radiusY - sprite.height / 2);
        if (x < 0 || y < 0 || x + sprite.width > width || y + sprite.height > height) continue;
        if (!inside(x, y) || !inside(x + sprite.width, y) || !inside(x, y + sprite.height) || !inside(x + sprite.width, y + sprite.height)) continue;
        if (sprite.cells.some(([cx, cy]) => occupied[(y + cy) * width + x + cx])) continue;
        for (const [cx, cy] of sprite.cells) occupied[(y + cy) * width + x + cx] = 1;
        placed.push({ ...sprite, word: words[index], index, x, y }); found = true; break;
      }
    }
  }
  return placed;
}
