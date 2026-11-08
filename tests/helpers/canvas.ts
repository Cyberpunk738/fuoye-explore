// Geometry construction uses Canvas only to paint textures. No WebGL renderer is
// needed for this test; drawing stubs deliberately make no claim about appearance.
export function textureCanvas() {
  const context = {
    fillRect() {}, strokeRect() {}, beginPath() {}, moveTo() {}, lineTo() {},
    stroke() {}, ellipse() {}, fill() {}, save() {}, restore() {}, translate() {}, scale() {}, fillText() {},
    measureText: (text: string) => ({width: text.length * 10}),
    createLinearGradient: () => ({addColorStop() {}}),
  };
  return {width: 0, height: 0, getContext: () => context};
}
