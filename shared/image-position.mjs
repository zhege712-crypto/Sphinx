export function clampImageOffset(value, fallback = 0) {
  return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : fallback;
}

export function imageOffset(props = {}) {
  return clampImageOffset(props.imageOffset, props.textAlignment === 'right' ? 100 : props.textAlignment === 'center' ? 50 : 0);
}

// Both percentages refer to their own box: this places the image in the free
// space, rather than allowing it to leave the document column.
export function imagePositionStyle(props = {}) {
  const offset = imageOffset(props);
  return {
    width: Number.isFinite(props.previewWidth) ? Math.max(64, Math.min(1600, props.previewWidth)) : undefined,
    maxWidth: '100%', position: 'relative', left: `${offset}%`, transform: `translateX(-${offset}%)`,
    marginLeft: 0, marginRight: 0,
  };
}

export function draggedImageOffset(start, delta, laneWidth, imageWidth) {
  const free = laneWidth - imageWidth;
  return free > 1 ? clampImageOffset(imageOffset({ imageOffset: start }) + delta / free * 100) : clampImageOffset(start);
}

export function resizedImageWidth(startWidth, delta, direction, laneWidth) {
  return Math.round(Math.max(Math.min(64, laneWidth), Math.min(1600, laneWidth, startWidth + delta * direction)));
}

export function resizedBesideWidth(startWidth, delta, direction, laneWidth) {
  return Math.round(Math.max(25, Math.min(65, startWidth + delta * direction / Math.max(1, laneWidth) * 100)));
}

export function imageSideAt(clientX, left, width) {
  return clientX < left + width / 2 ? 'left' : 'right';
}
