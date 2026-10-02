(() => {
  'use strict';
  const reduceQuery = matchMedia('(prefers-reduced-motion: reduce)');
  const fineQuery = matchMedia('(hover: hover) and (pointer: fine)');
  const ease = 'cubic-bezier(.16,1,.3,1)';
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const buttonSelector = '.pill,.menu-toggle,.folio-close,.book-close,.lightbox>button,.folio-controls button,.folio-gallery-bottom button,.book-controls button,.film-bottom button,.deck-tabs button';
  const buttonStates = new Map();
  const magneticStates = new Map();
  const motionAnimations = new Set();
  let magneticFrame = 0;
  let previousFrame = 0;
  let leaving = false;
  let navigationTimer = 0;

  function animate(element, frames, options) {
    const animation = element.animate(frames, options);
    motionAnimations.add(animation);
    animation.finished.then(() => motionAnimations.delete(animation), () => motionAnimations.delete(animation));
    return animation;
  }
  function rgb(color) {
    if (/^#[\da-f]{3,8}$/i.test(color)) {
      const hex = color.slice(1);
      if (hex.length === 3 || hex.length === 4) return [...hex].slice(0, 3).map(c => parseInt(c + c, 16));
      if (hex.length === 6 || hex.length === 8) return [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16));
    }
    if (color.startsWith('color(srgb ')) {
      const channels = color.match(/[\d.]+/g)?.map(Number);
      if (channels?.length >= 3) return channels.map((channel, i) => i < 3 ? channel * 255 : channel);
    }
    const values = color.match(/[\d.]+/g)?.map(Number);
    return values?.length >= 3 ? values : null;
  }
  function luminance(color) {
    const channels = rgb(color);
    if (!channels) return .5;
    return channels.slice(0, 3).map(channel => {
      const c = channel / 255;
      return c <= .04045 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4);
    }).reduce((value, channel, i) => value + channel * [.2126, .7152, .0722][i], 0);
  }
  function opaque(color) {
    const channels = rgb(color);
    return channels && (channels.length < 4 || channels[3] > .95);
  }
  function nearestBackground(element) {
    for (let current = element; current; current = current.parentElement) {
      const color = getComputedStyle(current).backgroundColor;
      if (opaque(color)) return color;
    }
    return '#171717';
  }
  function setFill(state, hot) {
    if (state.hot === hot && state.fill.isConnected) return;
    state.hot = hot;
    const button = state.button;
    const fill = state.fill;
    const start = getComputedStyle(fill).transform;
    state.animation?.cancel();
    clearTimeout(state.inkTimer);
    fill.style.transform = start === 'none' ? 'translateY(115%)' : start;
    if (hot || reduceQuery.matches) button.classList.toggle('is-fill-active', hot);
    else state.inkTimer = setTimeout(() => {
      if (!state.hot) button.classList.remove('is-fill-active');
    }, 210);
    if (reduceQuery.matches) {
      fill.style.transform = hot ? 'translateY(0)' : 'translateY(115%)';
      return;
    }
    const finish = hot ? 'translateY(0)' : 'translateY(-115%)';
    const animation = animate(fill, [{ transform: fill.style.transform }, { transform: finish }], {
      duration: hot ? 740 : 660,
      easing: hot ? 'cubic-bezier(.22,.61,.24,1)' : 'cubic-bezier(.32,.02,.24,1)',
      fill: 'forwards'
    });
    state.animation = animation;
    animation.finished.then(() => {
      if (state.animation !== animation) return;
      fill.style.transform = hot ? finish : 'translateY(115%)';
      animation.cancel();
      state.animation = null;
    }, () => {});
  }
  function updateFill(state) { setFill(state, state.pointer || state.keyboard || state.touch); }
  function installButton(button) {
    const existing = buttonStates.get(button);
    if (existing?.fill.isConnected) return;
    let state = existing;
    if (!state) {
      const computed = getComputedStyle(button);
      const idle = computed.color;
      const legacyFill = getComputedStyle(button, '::before').backgroundColor;
      const fillColor = opaque(legacyFill) ? legacyFill : idle;
      const context = nearestBackground(button);
      const caseInk = getComputedStyle(document.body).getPropertyValue('--case-ink').trim() || '#151515';
      const casePaper = getComputedStyle(document.body).getPropertyValue('--case-paper').trim() || '#fff';
      let hover = luminance(fillColor) > .42 ? caseInk : casePaper;
      if (luminance(fillColor) > .42 && luminance(context) < .25) hover = context;
      // Contrast remains predictable even when a case uses a pale paper color.
      if (Math.abs(luminance(fillColor) - luminance(hover)) < .38) hover = luminance(fillColor) > .42 ? '#151515' : '#fff';
      button.style.setProperty('--motion-button-idle', idle);
      button.style.setProperty('--motion-button-hover', hover);
      button.style.setProperty('--motion-button-fill', fillColor);
      button.style.setProperty('--motion-button-position', computed.position === 'static' ? 'relative' : computed.position);
      state = { button, fill: null, animation: null, inkTimer: 0, hot: false, pointer: false, keyboard: false, touch: false };
      buttonStates.set(button, state);
      button.classList.add('motion-button');
      button.addEventListener('pointerenter', event => {
        if (event.pointerType === 'touch' || !fineQuery.matches) return;
        state.pointer = true;
        updateFill(state);
      });
      button.addEventListener('pointerleave', () => { state.pointer = false; updateFill(state); });
      button.addEventListener('focusin', () => {
        state.keyboard = button.matches(':focus-visible');
        updateFill(state);
      });
      button.addEventListener('focusout', () => { state.keyboard = false; updateFill(state); });
      button.addEventListener('pointerdown', event => {
        if (event.pointerType !== 'touch') return;
        state.touch = true;
        updateFill(state);
      });
      const release = () => { state.touch = false; updateFill(state); };
      button.addEventListener('pointerup', release);
      button.addEventListener('pointercancel', release);
    }
    const fill = document.createElement('span');
    fill.className = 'motion-button-fill';
    fill.setAttribute('aria-hidden', 'true');
    if (!button.classList.contains('pill') && !button.querySelector(':scope>.motion-button-label')) {
      const label = document.createElement('span');
      label.className = 'motion-button-label';
      label.append(...button.childNodes);
      button.append(label);
    }
    button.prepend(fill);
    state.fill = fill;
    state.hot = false;
    updateFill(state);
  }

  function wakeMagnetics() { if (!magneticFrame) magneticFrame = requestAnimationFrame(tickMagnetics); }
  function tickMagnetics(time) {
    magneticFrame = 0;
    const dt = Math.min(32, time - (previousFrame || time - 16.67)) / 16.67;
    previousFrame = time;
    let moving = false;
    magneticStates.forEach(state => {
      for (let axis = 0; axis < 2; axis++) {
        state.velocity[axis] = (state.velocity[axis] + (state.target[axis] - state.position[axis]) * .095 * dt) * Math.pow(.76, dt);
        state.position[axis] += state.velocity[axis] * dt;
      }
      state.element.style.translate = `${state.position[0].toFixed(3)}px ${state.position[1].toFixed(3)}px`;
      state.labels.forEach(label => {
        label.style.translate = `${(state.position[0] * state.ratio).toFixed(3)}px ${(state.position[1] * state.ratio).toFixed(3)}px`;
      });
      moving ||= Math.abs(state.position[0] - state.target[0]) + Math.abs(state.position[1] - state.target[1]) + Math.abs(state.velocity[0]) + Math.abs(state.velocity[1]) > .025;
    });
    if (moving) wakeMagnetics();
    else previousFrame = 0;
  }
  function installMagnetic(element) {
    if (magneticStates.has(element)) return;
    const navigation = element.matches('.nav-link,.filter');
    let labels;
    if (navigation) {
      const label = document.createElement('span');
      label.className = 'motion-magnetic-label motion-nav-label';
      label.append(...element.childNodes);
      const indicator = document.createElement('span');
      indicator.className = 'motion-nav-indicator';
      indicator.setAttribute('aria-hidden', 'true');
      element.append(label, indicator);
      labels = [label];
    } else {
      labels = [...element.querySelectorAll(':scope>.roll,:scope>.arrow,:scope>.motion-button-label')];
      labels.forEach(label => label.classList.add('motion-magnetic-label'));
    }
    const strength = Number(element.dataset.strength) || (element.classList.contains('filter') ? 20 : 24);
    const textStrength = Number(element.dataset.strengthText) || (element.classList.contains('filter') ? 10 : 12);
    const state = { element, labels, strength, ratio: textStrength / strength, position: [0, 0], velocity: [0, 0], target: [0, 0], rect: null };
    element.classList.add('motion-magnetic');
    magneticStates.set(element, state);
    element.addEventListener('pointerenter', event => {
      if (reduceQuery.matches || !fineQuery.matches || event.pointerType === 'touch') return;
      state.rect = element.getBoundingClientRect();
      element.classList.add('is-magnetic-hover');
    });
    element.addEventListener('pointermove', event => {
      if (reduceQuery.matches || !fineQuery.matches || event.pointerType === 'touch') return;
      const rect = state.rect || (state.rect = element.getBoundingClientRect());
      state.target = [
        clamp((event.clientX - rect.left - rect.width / 2) / rect.width, -.5, .5) * strength,
        clamp((event.clientY - rect.top - rect.height / 2) / rect.height, -.5, .5) * strength
      ];
      wakeMagnetics();
    });
    element.addEventListener('pointerleave', () => {
      state.rect = null;
      state.target = [0, 0];
      element.classList.remove('is-magnetic-hover');
      wakeMagnetics();
    });
  }
  function resetMagnetics() {
    cancelAnimationFrame(magneticFrame);
    magneticFrame = previousFrame = 0;
    magneticStates.forEach(state => {
      state.rect = null;
      state.target = [0, 0];
      state.position = [0, 0];
      state.velocity = [0, 0];
      state.element.style.translate = 'none';
      state.labels.forEach(label => label.style.translate = 'none');
      state.element.classList.remove('is-magnetic-hover');
    });
  }
  document.querySelectorAll(buttonSelector).forEach(installButton);
  document.querySelectorAll('.nav-link,.filter,.pill').forEach(installMagnetic);
  // The menu and reader mode buttons change their labels at runtime.
  new MutationObserver(() => document.querySelectorAll(buttonSelector).forEach(installButton))
    .observe(document.body, { childList: true, subtree: true });

  function entrance() {
    if (reduceQuery.matches || leaving) return;
    let items;
    if (document.querySelector('.case-header')) {
      items = [...document.querySelectorAll('.case-header .back,.case-kicker,.case-header h1,.case-header .tags,.case-hero')];
    } else if (document.querySelector('.about-grid')) {
      items = [...document.querySelectorAll('.about-grid .hero-top,.about-grid h1,.about-grid p,.about-grid .skills-list,.about-grid .pill,.about-photo')];
    } else {
      items = [...document.querySelectorAll('.hero .hero-top,.hero h1,.hero p,.filters')];
    }
    items.forEach((item, index) => {
      if (item.getBoundingClientRect().top > innerHeight + 50) return;
      item.classList.remove('pending');
      item.classList.add('is-visible');
      animate(item, [{ opacity: 0, translate: '0 16px' }, { opacity: 1, translate: '0 0' }], {
        duration: item.classList.contains('case-hero') ? 760 : 640,
        delay: 35 + index * 48,
        easing: ease,
        fill: 'backwards'
      });
    });
  }

  // Case copy has its own entrance. Artwork keeps the original image observer.
  // Text is never moved out of normal layout; only small visual offsets are used.
  const caseStates = new Map();
  const visibleCaseStates = new Set();
  let caseObserver = null;
  let caseScrollFrame = 0;
  let casePreviousFrame = 0;
  let caseInstalled = false;

  function splitCaseText(element) {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (node.parentElement.closest('button,svg,script,style,code,.motion-case-word')) continue;
      if (node.textContent.trim()) textNodes.push(node);
    }
    textNodes.forEach(node => {
      const fragment = document.createDocumentFragment();
      // NBSP phrases, including a number and its unit, remain indivisible.
      const pieces = node.textContent.match(/[^ \t\r\n]+|[ \t\r\n]+/g) || [];
      pieces.forEach(piece => {
        if (/^[ \t\r\n]+$/.test(piece)) fragment.append(document.createTextNode(piece));
        else {
          const word = document.createElement('span');
          word.className = 'motion-case-word';
          word.textContent = piece;
          fragment.append(word);
        }
      });
      node.replaceWith(fragment);
    });
    return [...element.querySelectorAll('.motion-case-word')];
  }

  function revealCaseText(state) {
    if (state.revealed) return;
    state.revealed = true;
    state.element.classList.remove('motion-case-pending');
    state.element.classList.add('motion-case-ready');
    if (reduceQuery.matches) return;
    const compact = state.element.matches('.eyebrow,dt,dd,figcaption,.result span');
    const heading = state.element.matches('h2,h3,.quote');
    let lastTop = null;
    let line = -1;
    let wordInLine = 0;
    state.words.forEach(word => {
      const top = word.offsetTop;
      if (lastTop === null || Math.abs(top - lastTop) > 3) {
        line++;
        wordInLine = 0;
        lastTop = top;
      }
      const delay = compact ? Math.min(wordInLine * 12, 100) : Math.min(line * 78 + wordInLine * (heading ? 15 : 9), 330);
      const animation = animate(word, [
        { opacity: 0, translate: `0 ${compact ? 12 : heading ? 28 : 22}px`, rotate: heading ? '.7deg' : '0deg' },
        { opacity: 1, translate: '0 0', rotate: '0deg' }
      ], { duration: compact ? 730 : heading ? 1000 : 900, delay, easing: ease, fill: 'backwards' });
      state.animations.add(animation);
      animation.finished.then(() => state.animations.delete(animation), () => state.animations.delete(animation));
      wordInLine++;
    });
  }

  function wakeCaseScroll() {
    if (!caseScrollFrame && !reduceQuery.matches && visibleCaseStates.size) caseScrollFrame = requestAnimationFrame(tickCaseScroll);
  }
  function tickCaseScroll(time) {
    caseScrollFrame = 0;
    if (reduceQuery.matches || document.hidden || leaving) return;
    const dt = Math.min(40, time - (casePreviousFrame || time - 16.67)) / 16.67;
    casePreviousFrame = time;
    const follow = 1 - Math.pow(.81, dt);
    const amplitude = fineQuery.matches ? 9 : 5;
    const readings = [];
    visibleCaseStates.forEach(state => {
      if (!state.revealed) return;
      const rect = state.element.getBoundingClientRect();
      // Remove our own visual offset before computing the scroll position.
      const center = rect.top - state.position + rect.height * .5;
      const target = clamp((center - innerHeight * .52) / Math.max(innerHeight, 1) * amplitude * 2, -amplitude, amplitude);
      readings.push([state, target]);
    });
    let moving = false;
    readings.forEach(([state, target]) => {
      state.position += (target - state.position) * follow;
      if (Math.abs(target - state.position) < .025) state.position = target;
      else moving = true;
      state.element.style.translate = `0 ${state.position.toFixed(3)}px`;
    });
    if (moving) wakeCaseScroll();
    else casePreviousFrame = 0;
  }

  function resetCaseMotion(revealPending = false, resume = true) {
    cancelAnimationFrame(caseScrollFrame);
    caseScrollFrame = casePreviousFrame = 0;
    caseStates.forEach(state => {
      state.animations.forEach(animation => animation.cancel());
      state.animations.clear();
      state.position = 0;
      state.element.style.translate = 'none';
      if (revealPending) {
        state.revealed = true;
        state.element.classList.remove('motion-case-pending');
        state.element.classList.add('motion-case-ready');
      }
    });
    if (!revealPending && resume) wakeCaseScroll();
  }

  function installCaseMotion() {
    if (caseInstalled || !document.querySelector('.case-header')) return;
    caseInstalled = true;
    const scopes = [...document.querySelectorAll('main .case-intro,main .case-facts,main .case-text,main .case-block,main .result,main .next-project,main .folio-gallery-top,main .exhibit-heading,main .exhibit-top,main .kinext-format-v15,main .maps-board,main .dark-section')];
    scopes.forEach(scope => scope.classList.add('motion-case-scope'));
    // Repeated artwork captions receive a quiet entrance, without changing rails.
    const targets = new Set(document.querySelectorAll('main .case-intro p,main .case-intro>.eyebrow,main .case-facts dt,main .case-facts dd,main .case-text p,main .case-text>.eyebrow,main .case-block h2,main .case-block h3,main .case-block p,main .case-block>.eyebrow,main .folio-gallery-top h2,main .exhibit-heading h2,main .exhibit-top h2,main .kinext-format-v15 h2,main .kinext-format-v15 h3,main .kinext-format-v15 p,main .maps-board h2,main .maps-board p,main .dark-section h2,main .dark-section p,main .result strong,main .result span,main .next-project h2,main .next-project>.eyebrow,main .figure figcaption'));
    caseObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const state = caseStates.get(entry.target);
        if (!state) return;
        if (entry.isIntersecting) {
          visibleCaseStates.add(state);
          revealCaseText(state);
        } else visibleCaseStates.delete(state);
      });
      wakeCaseScroll();
    }, { threshold: 0, rootMargin: '0px 0px -38px 0px' });
    targets.forEach(element => {
      if (!element.textContent.trim() || element.closest('.case-hero') || element.matches('figcaption') && element.closest('.figure.reveal') || [...targets].some(other => other !== element && other.contains(element))) return;
      const words = splitCaseText(element);
      if (!words.length) return;
      element.classList.add('motion-case-text');
      const state = { element, words, revealed: false, position: 0, animations: new Set() };
      caseStates.set(element, state);
      if (reduceQuery.matches || element.getBoundingClientRect().bottom < 0) revealCaseText(state);
      else element.classList.add('motion-case-pending');
      caseObserver.observe(element);
    });
  }
  // Typography finishes before the first frame, so a numeric phrase stays whole.
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => requestAnimationFrame(installCaseMotion), { once: true });
  else requestAnimationFrame(installCaseMotion);

  const cards = [...document.querySelectorAll('.project-card')];
  const revealedCards = new WeakSet();
  function splitTitle(title) {
    if (!title || title.dataset.motionWords) return;
    title.dataset.motionWords = 'true';
    const walker = document.createTreeWalker(title, NodeFilter.SHOW_TEXT);
    const texts = [];
    while (walker.nextNode()) texts.push(walker.currentNode);
    texts.forEach(node => {
      const fragment = document.createDocumentFragment();
      // A nonbreaking phrase stays a single visual unit.
      const pieces = node.textContent.match(/[^ \t\r\n]+|[ \t\r\n]+/g) || [];
      pieces.forEach(piece => {
        if (/^[ \t\r\n]+$/.test(piece)) fragment.append(document.createTextNode(piece));
        else {
          const word = document.createElement('span');
          word.className = 'motion-title-word';
          word.textContent = piece;
          fragment.append(word);
        }
      });
      node.replaceWith(fragment);
    });
  }
  function revealCard(card) {
    if (card.hidden || revealedCards.has(card)) return;
    revealedCards.add(card);
    card.classList.remove('motion-project-pending');
    card.classList.add('motion-project-ready');
    if (reduceQuery.matches) return;
    const link = card.querySelector(':scope>a');
    if (!link) return;
    animate(link, [{ opacity: 0, translate: '0 60px', scale: '.96' }, { opacity: 1, translate: '0 0', scale: '1' }], {
      duration: 1000,
      delay: 35,
      easing: ease,
      fill: 'backwards'
    });
    card.querySelectorAll('.motion-title-word').forEach((word, index) => {
      animate(word, [{ opacity: 0, translate: '0 18px', rotate: '2deg' }, { opacity: 1, translate: '0 0', rotate: '0deg' }], {
        duration: 750,
        delay: 110 + Math.min(index, 12) * 26,
        easing: ease,
        fill: 'backwards'
      });
    });
  }
  let cardObserver;
  if (cards.length) {
    cardObserver = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting && !entry.target.hidden) {
        revealCard(entry.target);
        cardObserver.unobserve(entry.target);
      }
    }), { threshold: .1, rootMargin: '0px 0px -25px 0px' });
    cards.forEach(card => {
      splitTitle(card.querySelector('h2'));
      if (reduceQuery.matches) revealCard(card);
      else { card.classList.add('motion-project-pending'); cardObserver.observe(card); }
    });
  }
  entrance();

  const main = document.querySelector('main');
  const surface = document.querySelector('.transition-surface');
  surface?.classList.add('motion-page-surface');
  function resetPageMotion() {
    clearTimeout(navigationTimer);
    navigationTimer = 0;
    leaving = false;
    document.documentElement.classList.remove('motion-page-leaving');
    motionAnimations.forEach(animation => animation.cancel());
    motionAnimations.clear();
    surface?.classList.remove('leaving', 'active', 'entering');
    if (surface) surface.style.transform = 'translateY(110%)';
    resetMagnetics();
    resetCaseMotion(reduceQuery.matches);
    buttonStates.forEach(state => {
      state.animation?.cancel();
      clearTimeout(state.inkTimer);
      state.animation = null;
      state.pointer = state.touch = state.keyboard = state.hot = false;
      state.button.classList.remove('is-fill-active');
      state.fill.style.transform = 'translateY(115%)';
    });
  }
  document.addEventListener('click', event => {
    const link = event.target.closest?.('a[href]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target || link.hasAttribute('download')) return;
    const destination = new URL(link.href, location.href);
    if (!/^https?:$/.test(destination.protocol) || destination.origin !== location.origin || (destination.pathname === location.pathname && destination.search === location.search)) return;
    if (reduceQuery.matches || !main || !surface) return;
    event.preventDefault();
    if (leaving) return;
    leaving = true;
    document.documentElement.classList.add('motion-page-leaving');
    document.querySelector('.motion-cursor')?.classList.remove('show');
    document.querySelector('.motion-arrow')?.classList.remove('show');
    const bodyStyle = getComputedStyle(document.body);
    surface.style.setProperty('--motion-transition-color', opaque(bodyStyle.backgroundColor) ? bodyStyle.backgroundColor : bodyStyle.getPropertyValue('--case-paper').trim() || bodyStyle.getPropertyValue('--paper').trim() || '#f4f3ef');
    animate(main, [{ opacity: 1, translate: '0 0' }, { opacity: .3, translate: '0 -12px' }], { duration: 300, easing: ease, fill: 'forwards' });
    animate(surface, [{ transform: 'translateY(110%)' }, { transform: 'translateY(0)' }], { duration: 360, easing: 'cubic-bezier(.76,0,.24,1)', fill: 'forwards' });
    navigationTimer = setTimeout(() => location.assign(destination.href), 390);
  });
  window.addEventListener('pageshow', event => { if (event.persisted) resetPageMotion(); });
  window.addEventListener('pagehide', () => { resetMagnetics(); resetCaseMotion(false, false); });
  window.addEventListener('blur', () => {
    resetMagnetics();
    buttonStates.forEach(state => { state.pointer = state.touch = false; updateFill(state); });
  });
  window.addEventListener('resize', () => { resetMagnetics(); wakeCaseScroll(); }, { passive: true });
  window.addEventListener('scroll', () => {
    magneticStates.forEach(state => { state.rect = null; state.target = [0, 0]; });
    if (fineQuery.matches && !reduceQuery.matches) wakeMagnetics();
    wakeCaseScroll();
  }, { passive: true });
  reduceQuery.addEventListener('change', () => {
    resetPageMotion();
    if (reduceQuery.matches) {
      cardObserver?.disconnect();
      cards.forEach(card => { card.classList.remove('motion-project-pending'); card.classList.add('motion-project-ready'); });
    }
  });
  fineQuery.addEventListener('change', () => { resetMagnetics(); wakeCaseScroll(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(caseScrollFrame);
      caseScrollFrame = casePreviousFrame = 0;
    } else wakeCaseScroll();
  });
})();
