(() => {
  'use strict';
  const root = document.querySelector('.findings-carousel');
  if (!root) return;
  const track = root.querySelector('.finding-track');
  const slides = [...track.children];
  const videos = slides.map(slide => slide.querySelector('video'));
  const dots = [...root.querySelectorAll('.finding-dot')];
  const toggle = document.getElementById('finding-toggle');
  const status = document.getElementById('finding-status');
  const progress = root.querySelector('.finding-progress span');
  const films = [...document.querySelectorAll('#overview-film, #alignment-film')];
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(max-width: 600px)');
  let index = 0, physical = 1, automatic = !motion.matches;
  let visible = false, moving = false, timeout = 0, moveTimeout = 0, raf = 0;
  let pointer = null;

  function setSources() {
    videos.forEach(video => {
      const source = mobile.matches ? video.dataset.mobile : video.dataset.desktop;
      if (video.getAttribute('src') === source) return;
      video.src = source;
      video.poster = mobile.matches ? video.dataset.mobilePoster : video.dataset.poster;
      video.controls = false;
      video.load();
    });
  }
  setSources();
  function clone(slide) {
    const copy = slide.cloneNode(true);
    copy.classList.add('finding-clone');
    copy.removeAttribute('id');
    copy.setAttribute('aria-hidden', 'true');
    copy.inert = true;
    const video = copy.querySelector('video');
    const poster = document.createElement('img');
    poster.src = video.poster;
    poster.alt = '';
    poster.className = 'finding-video';
    video.replaceWith(poster);
    return copy;
  }
  const lastClone = clone(slides[slides.length - 1]);
  const firstClone = clone(slides[0]);
  track.prepend(lastClone);
  track.append(firstClone);
  track.classList.add('is-ready', 'no-transition');
  track.style.transform = 'translateX(-100%)';
  requestAnimationFrame(() => requestAnimationFrame(() => track.classList.remove('no-transition')));

  function readyToPlay() {
    return automatic && visible && !document.hidden && !moving && !films.some(v => !v.paused && !v.ended);
  }
  function updateUI() {
    slides.forEach((slide, i) => {
      slide.inert = i !== index;
      slide.setAttribute('aria-hidden', String(i !== index));
    });
    dots.forEach((dot, i) => {
      if (i === index) dot.setAttribute('aria-current', 'true');
      else dot.removeAttribute('aria-current');
    });
    root.dataset.activePage = String(index + 1);
    root.dataset.automatic = String(automatic);
    toggle.textContent = automatic ? 'Pause' : 'Play';
    toggle.setAttribute('aria-label', automatic ? 'Pause finding demos and automatic slides' : 'Play finding demos and automatic slides');
  }
  function stop() {
    clearTimeout(timeout);
    cancelAnimationFrame(raf);
    videos.forEach(video => video.pause());
  }
  function drawProgress() {
    const video = videos[index];
    progress.style.transform = `scaleX(${video.duration ? Math.min(1, video.currentTime / video.duration) : 0})`;
    if (!video.paused) raf = requestAnimationFrame(drawProgress);
  }
  function queueNext() {
    clearTimeout(timeout);
    if (readyToPlay()) timeout = setTimeout(() => go(index + 1, 1), 850);
  }
  async function play() {
    if (!readyToPlay()) return;
    const video = videos[index];
    if (video.ended) return queueNext();
    try {
      await video.play();
      if (!readyToPlay() || video !== videos[index]) { video.pause(); return; }
      cancelAnimationFrame(raf);
      drawProgress();
    } catch (error) {
      if (error.name === 'AbortError') return;
      automatic = false;
      updateUI();
      status.textContent = 'Press Play to start the demo.';
    }
  }
  function settle() {
    if (!moving) return;
    clearTimeout(moveTimeout);
    moving = false;
    const nextPhysical = index + 1;
    if (physical !== nextPhysical) {
      track.classList.add('no-transition');
      physical = nextPhysical;
      track.style.transform = `translateX(-${physical * 100}%)`;
      void track.offsetWidth;
      track.classList.remove('no-transition');
    }
    play();
  }
  function go(target, direction = 0, manual = false) {
    if (moving) return;
    const next = (target + slides.length) % slides.length;
    if (next === index) return;
    stop();
    const old = index;
    index = next;
    videos[index].currentTime = 0;
    progress.style.transform = 'scaleX(0)';
    physical = direction > 0 && old === slides.length - 1 && next === 0 ? slides.length + 1
      : direction < 0 && old === 0 && next === slides.length - 1 ? 0 : index + 1;
    moving = true;
    track.style.transform = `translateX(-${physical * 100}%)`;
    updateUI();
    if (manual) status.textContent = slides[index].getAttribute('aria-label');
    moveTimeout = setTimeout(settle, motion.matches ? 0 : 750);
  }
  track.addEventListener('transitionend', event => {
    if (event.target === track && event.propertyName === 'transform') settle();
  });
  videos.forEach((video, i) => {
    video.addEventListener('ended', () => { if (i === index) queueNext(); });
    video.addEventListener('error', () => {
      if (i !== index) return;
      automatic = false;
      updateUI();
      status.textContent = 'This demo could not load. Use Next to view another finding.';
    });
  });
  document.getElementById('finding-next').addEventListener('click', () => go(index + 1, 1, true));
  document.getElementById('finding-prev').addEventListener('click', () => go(index - 1, -1, true));
  dots.forEach(dot => dot.addEventListener('click', () => go(Number(dot.dataset.page), 0, true)));
  toggle.addEventListener('click', () => {
    automatic = !automatic;
    if (automatic) {
      films.forEach(video => video.pause());
      if (videos[index].ended) videos[index].currentTime = 0;
      play();
    } else stop();
    updateUI();
  });
  root.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      go(index + (event.key === 'ArrowRight' ? 1 : -1), event.key === 'ArrowRight' ? 1 : -1, true);
    }
  });
  root.querySelector('.finding-viewport').addEventListener('pointerdown', event => {
    if (event.pointerType !== 'mouse') pointer = {x: event.clientX, y: event.clientY};
  });
  root.addEventListener('pointerup', event => {
    if (!pointer) return;
    const dx = event.clientX - pointer.x, dy = event.clientY - pointer.y;
    pointer = null;
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.5) go(index + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1, true);
  });
  root.addEventListener('pointercancel', () => { pointer = null; });
  slides.forEach((slide, i) => slide.querySelector('.demo-fullscreen').addEventListener('click', async () => {
    automatic = false;
    stop();
    updateUI();
    const video = videos[i];
    video.controls = true;
    if (video.ended) video.currentTime = 0;
    try {
      if (video.requestFullscreen) await video.requestFullscreen();
      else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen();
      await video.play();
    } catch { video.controls = true; }
  }));
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement) videos.forEach(video => { video.pause(); video.controls = false; });
  });
  films.forEach(video => video.addEventListener('play', () => {
    stop();
    films.forEach(other => { if (other !== video) other.pause(); });
  }));
  films.forEach(video => ['pause', 'ended'].forEach(event => video.addEventListener(event, play)));
  const filmObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting && document.fullscreenElement !== entry.target) entry.target.pause();
    });
  });
  films.forEach(video => filmObserver.observe(video));
  new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting && entries[0].intersectionRatio >= 0.18;
    if (visible) play(); else if (!document.fullscreenElement) stop();
  }, {threshold: 0.18}).observe(root);
  document.addEventListener('visibilitychange', () => document.hidden ? stop() : play());
  motion.addEventListener('change', () => {
    if (motion.matches) { automatic = false; stop(); updateUI(); }
  });
  mobile.addEventListener('change', () => {
    stop();
    setSources();
    lastClone.querySelector('img').src = videos[videos.length - 1].poster;
    firstClone.querySelector('img').src = videos[0].poster;
    play();
  });
  updateUI();
})();
