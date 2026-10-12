(() => {
  "use strict";

  const heartCanvas = document.getElementById("heartCanvas");
  const heartCtx = heartCanvas.getContext("2d");

  const starCanvas = document.getElementById("universe");
  const starCtx = starCanvas.getContext("2d");

  const canvasWrap = document.getElementById("canvasWrap");
  const reformButton = document.getElementById("reformButton");
  const messageToggle = document.getElementById("messageToggle");
  const message = document.getElementById("message");
  const status = document.getElementById("status");

  const reducedMotion =
    window.matchMedia("(prefers-reduced-motion: reduce)");

  // Every particle and star uses a pink shade.
  const pinks = [
    "#fff0f6",
    "#ffd0e1",
    "#ff9fc6",
    "#ff70ae",
    "#f83f91",
    "#c91e68"
  ];

  const heart = [];
  const stars = [];

  const pointer = {
    x: -9999,
    y: -9999,
    active: false
  };

  let width = 0;
  let height = 0;
  let dpr = 1;
  let starWidth = 0;
  let starHeight = 0;
  let lastTime = 0;
  let frameId = 0;
  let scattered = false;
  let resizeTimer;

  const rand = (min, max) =>
    min + Math.random() * (max - min);

  function heartPoint(t) {
    const x = 16 * Math.pow(Math.sin(t), 3);

    const y =
      13 * Math.cos(t) -
      5 * Math.cos(2 * t) -
      2 * Math.cos(3 * t) -
      Math.cos(4 * t);

    return {
      x: x / 17,
      y: -y / 17
    };
  }

  function makeHeartParticles() {
    heart.length = 0;

    const area = width * height;

    const count = Math.max(
      520,
      Math.min(1450, Math.round(area / 95))
    );

    const scale = Math.min(
      width * 0.37,
      height * 0.42
    );

    for (let i = 0; i < count; i++) {
      const t = Math.random() * Math.PI * 2;
      const point = heartPoint(t);

      // Randomized interior points create a full heart.
      const fill = Math.sqrt(Math.random());

      const tx =
        width / 2 + point.x * scale * fill;

      const ty =
        height / 2 +
        point.y * scale * fill -
        scale * 0.02;

      const size = rand(0.75, 2.05);

      heart.push({
        x: tx + rand(-width * 0.18, width * 0.18),
        y: ty + rand(-height * 0.18, height * 0.18),

        tx,
        ty,

        vx: 0,
        vy: 0,

        size,
        color: pinks[
          Math.floor(Math.random() * pinks.length)
        ],

        alpha: rand(0.5, 1),
        phase: rand(0, Math.PI * 2),
        seed: rand(0.7, 1.4)
      });
    }
  }

  function resizeCanvas(canvas, ctx, w, h) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);

    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);

    const rect = heartCanvas.getBoundingClientRect();

    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);

    resizeCanvas(heartCanvas, heartCtx, width, height);

    starWidth = window.innerWidth;
    starHeight = window.innerHeight;

    resizeCanvas(
      starCanvas,
      starCtx,
      starWidth,
      starHeight
    );

    makeStars();
    makeHeartParticles();
  }

  function makeStars() {
    stars.length = 0;

    const amount = Math.min(
      190,
      Math.floor((starWidth * starHeight) / 6500)
    );

    for (let i = 0; i < amount; i++) {
      stars.push({
        x: Math.random() * starWidth,
        y: Math.random() * starHeight,
        r: rand(0.35, 1.35),
        alpha: rand(0.18, 0.76),
        phase: rand(0, Math.PI * 2),
        speed: rand(0.5, 1.8)
      });
    }
  }

  function drawStars(time) {
    starCtx.clearRect(0, 0, starWidth, starHeight);

    for (const star of stars) {
      const pulse = reducedMotion.matches
        ? 0.85
        : 0.6 +
          0.4 * Math.sin(
            time * 0.001 * star.speed + star.phase
          );

      starCtx.globalAlpha = star.alpha * pulse;

      starCtx.fillStyle =
        pinks[1 + (Math.floor(star.phase * 10) % 4)];

      starCtx.beginPath();

      starCtx.arc(
        star.x,
        star.y,
        star.r,
        0,
        Math.PI * 2
      );

      starCtx.fill();
    }

    starCtx.globalAlpha = 1;
  }

  function drawHeart(time, dt) {
    heartCtx.clearRect(0, 0, width, height);

    const nowSeconds = time * 0.001;

    // A subtle heartbeat keeps the shape alive.
    const beat = reducedMotion.matches
      ? 1
      : 1 +
        0.012 * Math.sin(nowSeconds * 2.4) +
        0.006 * Math.sin(nowSeconds * 4.8);

    const repelRadius = Math.min(
      125,
      Math.max(78, width * 0.27)
    );

    const delta = Math.min(dt / 16.67, 2.2);

    // Soft pink glow behind the heart.
    const gradient = heartCtx.createRadialGradient(
      width / 2,
      height / 2,
      1,
      width / 2,
      height / 2,
      Math.min(width, height) * 0.44
    );

    gradient.addColorStop(0, "#f83f911c");
    gradient.addColorStop(0.5, "#c91e6810");
    gradient.addColorStop(1, "#c91e6800");

    heartCtx.fillStyle = gradient;
    heartCtx.fillRect(0, 0, width, height);

    for (const p of heart) {
      const targetX =
        width / 2 + (p.tx - width / 2) * beat;

      const targetY =
        height / 2 + (p.ty - height / 2) * beat;

      // Mouse or finger repels nearby particles.
      if (pointer.active) {
        const dx = p.x - pointer.x;
        const dy = p.y - pointer.y;

        const distance = Math.hypot(dx, dy) || 0.001;

        if (distance < repelRadius) {
          const force =
            (1 - distance / repelRadius) * 1.25;

          p.vx +=
            (dx / distance) * force * 2.8 * delta;

          p.vy +=
            (dy / distance) * force * 2.8 * delta;

          scattered = true;
        }
      }

      // Spring physics pulls particles toward their targets.
      const spring = scattered ? 0.010 : 0.027;

      p.vx += (targetX - p.x) * spring * delta;
      p.vy += (targetY - p.y) * spring * delta;

      p.vx *= Math.pow(scattered ? 0.94 : 0.86, delta);
      p.vy *= Math.pow(scattered ? 0.94 : 0.86, delta);

      p.x += p.vx * delta;
      p.y += p.vy * delta;

      const twinkle =
        0.75 +
        0.25 *
          Math.sin(
            nowSeconds * p.seed + p.phase
          );

      // Outer pink particle glow.
      heartCtx.globalAlpha = p.alpha * 0.2;
      heartCtx.fillStyle = p.color;
      heartCtx.beginPath();

      heartCtx.arc(
        p.x,
        p.y,
        p.size * 3.2,
        0,
        Math.PI * 2
      );

      heartCtx.fill();

      // Bright pink particle core.
      heartCtx.globalAlpha = p.alpha * twinkle;
      heartCtx.beginPath();

      heartCtx.arc(
        p.x,
        p.y,
        p.size,
        0,
        Math.PI * 2
      );

      heartCtx.fill();
    }

    heartCtx.globalAlpha = 1;
  }

  function animate(time) {
    const dt = lastTime
      ? Math.min(time - lastTime, 40)
      : 16.67;

    lastTime = time;

    drawStars(time);
    drawHeart(time, dt);

    frameId = requestAnimationFrame(animate);
  }

  function getCanvasPosition(event) {
    const rect = heartCanvas.getBoundingClientRect();

    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }

  function movePointer(event) {
    const pos = getCanvasPosition(event);

    pointer.x = pos.x;
    pointer.y = pos.y;
    pointer.active = true;

    canvasWrap.classList.add("is-scattered");

    status.textContent = "Particles scattering.";
  }

  function releasePointer() {
    pointer.active = false;
    scattered = false;

    canvasWrap.classList.remove("is-scattered");
  }

  function reformHeart() {
    pointer.active = false;

    pointer.x = -9999;
    pointer.y = -9999;
    scattered = false;

    for (const p of heart) {
      p.vx *= 0.25;
      p.vy *= 0.25;
    }

    canvasWrap.classList.remove("is-scattered");

    status.textContent =
      "The pink heart is coming back together.";
  }

  // Desktop mouse and mobile touch interactions.
  heartCanvas.addEventListener(
    "pointermove",
    movePointer,
    { passive: true }
  );

  heartCanvas.addEventListener(
    "pointerleave",
    releasePointer,
    { passive: true }
  );

  heartCanvas.addEventListener(
    "pointerdown",
    event => {
      if (event.pointerType === "touch") {
        movePointer(event);
      }

      reformHeart();
    },
    { passive: true }
  );

  reformButton.addEventListener("click", reformHeart);

  // Reveal or hide the optional personal message.
  messageToggle.addEventListener("click", () => {
    const opening = message.hidden;

    message.hidden = !opening;

    messageToggle.setAttribute(
      "aria-expanded",
      String(opening)
    );

    messageToggle.textContent = opening
      ? "Hide the note"
      : "A little note";

    status.textContent = opening
      ? "A little note revealed."
      : "The note was hidden.";
  });

  // Recreate the particle layout after a resize.
  window.addEventListener(
    "resize",
    () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(resize, 100);
    },
    { passive: true }
  );

  // Pause animation while the tab is hidden.
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && frameId) {
      cancelAnimationFrame(frameId);
      frameId = 0;
    } else if (!document.hidden && !frameId) {
      lastTime = 0;
      frameId = requestAnimationFrame(animate);
    }
  });

  resize();
  frameId = requestAnimationFrame(animate);
})();
