export function clampMap(
  scale: number,
  x: number,
  y: number,
  imageWidth: number,
  imageHeight: number,
  viewportWidth = imageWidth,
  viewportHeight = imageHeight,
): { scale: number; x: number; y: number } {
  'worklet';
  const boundedScale = Math.min(4, Math.max(1, scale));
  const maxX = Math.max(0, (imageWidth * boundedScale - viewportWidth) / 2);
  const maxY = Math.max(0, (imageHeight * boundedScale - viewportHeight) / 2);
  return {
    scale: boundedScale,
    x: maxX === 0 ? 0 : Math.min(maxX, Math.max(-maxX, x)),
    y: maxY === 0 ? 0 : Math.min(maxY, Math.max(-maxY, y)),
  };
}
