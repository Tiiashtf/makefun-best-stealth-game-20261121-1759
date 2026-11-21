// Moonlit Vault — keyboard and mouse input, polled once per frame.
export function createInput(canvas) {
  const keys = new Set();
  // Latched presses: a quick tap is remembered until a frame consumes it,
  // so a press is never lost when frames run slowly.
  const pressed = new Set();
  const mouse = { x: 0, y: 0, down: false, clicked: false, clickX: 0, clickY: 0 };

  function keyName(e) {
    return e.code;
  }

  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    if (!e.repeat) pressed.add(keyName(e));
    keys.add(keyName(e));
  });
  window.addEventListener('keyup', (e) => keys.delete(keyName(e)));
  window.addEventListener('blur', () => keys.clear());

  function updateMouse(e) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = (e.clientX - rect.left) * (canvas.width / rect.width);
    mouse.y = (e.clientY - rect.top) * (canvas.height / rect.height);
  }
  canvas.addEventListener('mousemove', updateMouse);
  canvas.addEventListener('mousedown', (e) => {
    updateMouse(e);
    mouse.down = true;
    mouse.clicked = true;
    mouse.clickX = mouse.x;
    mouse.clickY = mouse.y;
  });
  window.addEventListener('mouseup', () => { mouse.down = false; });

  return {
    keys,
    mouse,
    isDown(...codes) { return codes.some((c) => keys.has(c)); },
    // Movement vector from WASD or arrows, normalized.
    moveVector() {
      let x = 0;
      let y = 0;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
      if (keys.has('KeyW') || keys.has('ArrowUp')) y -= 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) y += 1;
      if (x !== 0 && y !== 0) { x *= Math.SQRT1_2; y *= Math.SQRT1_2; }
      return { x, y };
    },
    running() { return keys.has('ShiftLeft') || keys.has('ShiftRight'); },
    crouched() { return keys.has('KeyC') || keys.has('ControlLeft'); },
    // True once per physical press of any of the codes, even if the key was
    // released before the next frame ran; consumes the press.
    consumePressed(...codes) {
      const hit = codes.some((c) => pressed.has(c));
      for (const c of codes) pressed.delete(c);
      return hit;
    },
    consumeClick() {
      const v = mouse.clicked;
      mouse.clicked = false;
      return v ? { x: mouse.clickX, y: mouse.clickY } : null;
    },
  };
}
