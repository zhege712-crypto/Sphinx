// Fill the complete rectangular boundary, including its perimeter. Sprites use
// glyph pixels so small words can fit between larger words without overlap.
export function packWordCloud(words, width, height, spriteForWord) {
  if (width < 20 || height < 20) return [];
  const occupied = new Uint8Array(width * height), placed = [];
  const anchors = [[.5, .5], [0, 0], [1, 1], [1, 0], [0, 1], [.5, 0], [.5, 1], [0, .5], [1, .5]];
  function halton(value, base) { let result = 0, fraction = 1; while (value > 0) { fraction /= base; result += fraction * (value % base); value = Math.floor(value / base); } return result; }
  for (let index = 0; index < Math.min(words.length, 240); index++) {
    let found = false;
    for (let shrink = 0; shrink < 3 && !found; shrink++) {
      const sprite = spriteForWord(words[index], index, shrink);
      if (!sprite?.cells.length || sprite.width > width - 4 || sprite.height > height - 4) continue;
      for (let step = 0; step < 1200; step++) {
        const seed = step + index * 127 + 1;
        const [px, py] = step === 0 && anchors[index] ? anchors[index] : [halton(seed, 2), halton(seed, 3)];
        const x = Math.round(2 + px * (width - sprite.width - 4));
        const y = Math.round(2 + py * (height - sprite.height - 4));
        if (sprite.cells.some(([cx, cy]) => occupied[(y + cy) * width + x + cx])) continue;
        for (const [cx, cy] of sprite.cells) occupied[(y + cy) * width + x + cx] = 1;
        placed.push({ ...sprite, word: words[index], index, x, y }); found = true; break;
      }
    }
  }
  return placed;
}
