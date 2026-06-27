import * as THREE from 'three';

export function generateWoodTexture(baseHex = 0xc8915a) {
  const w = 512, h = 512;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');

  const base = new THREE.Color(baseHex);
  const baseStr = `rgb(${(base.r*255)|0},${(base.g*255)|0},${(base.b*255)|0})`;
  ctx.fillStyle = baseStr;
  ctx.fillRect(0, 0, w, h);

  // grain stripes
  for (let i = 0; i < 140; i++) {
    const y = Math.random() * h;
    const lightness = 0.65 + Math.random() * 0.55;
    const col = base.clone().multiplyScalar(lightness);
    const a = 0.18 + Math.random() * 0.25;
    ctx.strokeStyle = `rgba(${(col.r*255)|0},${(col.g*255)|0},${(col.b*255)|0},${a})`;
    ctx.lineWidth = 0.5 + Math.random() * 2.5;
    ctx.beginPath();
    const wobble = 4 + Math.random() * 6;
    const period = 0.005 + Math.random() * 0.02;
    for (let x = 0; x <= w; x += 4) {
      const yy = y + Math.sin(x * period + i) * wobble;
      if (x === 0) ctx.moveTo(x, yy);
      else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }

  // knots
  const knotCount = 2 + (Math.random() * 3) | 0;
  for (let i = 0; i < knotCount; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const r = 8 + Math.random() * 18;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, 'rgba(40,20,5,0.55)');
    grad.addColorStop(0.6, 'rgba(40,20,5,0.18)');
    grad.addColorStop(1, 'rgba(40,20,5,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // subtle noise
  const id = ctx.getImageData(0, 0, w, h);
  const d = id.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 14;
    d[i]   = Math.max(0, Math.min(255, d[i]   + n));
    d[i+1] = Math.max(0, Math.min(255, d[i+1] + n));
    d[i+2] = Math.max(0, Math.min(255, d[i+2] + n));
  }
  ctx.putImageData(id, 0, 0);

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
