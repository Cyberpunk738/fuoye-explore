export type GraphicsQuality = 'auto' | 'low' | 'high';
export function graphicsSettings(quality:GraphicsQuality) {
  return quality==='low'?{width:960,height:540,pixelRatio:1,shadows:false}:quality==='high'?{width:1920,height:1080,pixelRatio:1.5,shadows:true}:{width:1280,height:720,pixelRatio:1,shadows:true};
}
