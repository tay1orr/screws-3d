const HEART_COLORS = ['#ff356f', '#ff5d8f', '#ff85b3', '#ffb3d1', '#ffffff', '#ffd45c'];

export function createHeartParty(root) {
  let cleanupTimer = null;

  function clear() {
    if (cleanupTimer !== null) clearTimeout(cleanupTimer);
    cleanupTimer = null;
    root.classList.remove('heart-party--active');
    root.replaceChildren();
  }

  function burst() {
    clear();
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const count = reducedMotion ? 72 : 240;
    const fragment = document.createDocumentFragment();

    for (let i = 0; i < count; i++) {
      const heart = document.createElement('span');
      heart.className = 'heart-particle';
      heart.textContent = i % 17 === 0 ? '💖' : '♥';

      const wave = i % 4;
      const originX = 50 + (Math.random() - 0.5) * (wave === 0 ? 10 : 34);
      const originY = 54 + (Math.random() - 0.5) * 18;
      const angle = Math.random() * Math.PI * 2;
      const distance = 190 + Math.random() * 520;
      const dx = Math.cos(angle) * distance;
      const finalY = 120 + Math.random() * 430;
      const middleX = dx * (0.35 + Math.random() * 0.25);
      const middleY = -(110 + Math.random() * 330);
      const size = 14 + Math.random() * 34;
      const delay = wave * 145 + Math.random() * 130;
      const duration = 1800 + Math.random() * 1900;

      heart.style.setProperty('--heart-x', `${originX}vw`);
      heart.style.setProperty('--heart-y', `${originY}vh`);
      heart.style.setProperty('--heart-mx', `${middleX}px`);
      heart.style.setProperty('--heart-my', `${middleY}px`);
      heart.style.setProperty('--heart-dx', `${dx}px`);
      heart.style.setProperty('--heart-dy', `${finalY}px`);
      heart.style.setProperty('--heart-size', `${size}px`);
      heart.style.setProperty('--heart-delay', `${delay}ms`);
      heart.style.setProperty('--heart-duration', `${duration}ms`);
      const rotation = -540 + Math.random() * 1080;
      heart.style.setProperty('--heart-mid-rotation', `${rotation * 0.45}deg`);
      heart.style.setProperty('--heart-rotation', `${rotation}deg`);
      heart.style.setProperty('--heart-color', HEART_COLORS[i % HEART_COLORS.length]);
      fragment.appendChild(heart);
    }

    for (let i = 0; i < 4; i++) {
      const ring = document.createElement('span');
      ring.className = 'heart-shockwave';
      ring.style.setProperty('--ring-delay', `${i * 150}ms`);
      fragment.appendChild(ring);
    }

    root.appendChild(fragment);
    root.classList.add('heart-party--active');
    cleanupTimer = setTimeout(clear, reducedMotion ? 2400 : 5200);
  }

  return { burst, clear };
}
