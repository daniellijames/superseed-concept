const field = document.querySelector('.field');
const fieldFrame = field.querySelector('iframe');
const jobs = [...field.querySelectorAll('.jobs li')];
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const frames = [...document.querySelectorAll('iframe[data-src]')];
const frameSources = new Map(frames.map(frame => [frame.contentWindow, frame]));
let fieldState = 'today';

function tellField() {
  fieldFrame.contentWindow.postMessage({ type: 'field-state', state: fieldState }, location.origin);
}

window.addEventListener('message', event => {
  const frame = frameSources.get(event.source);
  const height = event.data?.height;
  if (event.origin !== location.origin || !frame ||
      event.data?.type !== 'anatomy-height' || !Number.isFinite(height) || height <= 0 || height > 5000) return;

  frame.style.height = `${Math.ceil(height)}px`;
  if (frame.classList.contains('frame-pending')) {
    frame.classList.remove('frame-pending');
    frame.removeAttribute('aria-hidden');
    frame.removeAttribute('tabindex');
    frame.previousElementSibling.hidden = true;
    if (frame === fieldFrame) tellField();
  }
});

// Focus inside a child document makes its iframe the active element of this
// document without matching :focus on the iframe itself.
function updateFrameFocus() {
  requestAnimationFrame(() => {
    for (const frame of frames) {
      frame.classList.toggle('frame-focused', document.activeElement === frame && document.hasFocus());
    }
  });
}

window.addEventListener('focus', updateFrameFocus);
window.addEventListener('blur', updateFrameFocus);

async function loadFigure(frame) {
  try {
    const response = await fetch(frame.dataset.src, { method: 'HEAD' });
    if (!response.ok) return;
    // Keep the frame measurable while its fallback is still on screen.
    frame.classList.add('frame-pending');
    frame.setAttribute('aria-hidden', 'true');
    frame.tabIndex = -1;
    frame.src = frame.dataset.src;
    frame.hidden = false;
    frame.addEventListener('load', () => {
      frame.contentWindow.addEventListener('focus', updateFrameFocus);
      frame.contentWindow.addEventListener('blur', updateFrameFocus);
      if (frame === fieldFrame) tellField();
    });
  } catch {
    // The fallback stays in place if the figure is unavailable.
  }
}

const lazyFigures = new IntersectionObserver(entries => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    lazyFigures.unobserve(entry.target);
    loadFigure(entry.target.querySelector('iframe'));
  }
}, { rootMargin: '450px' });

for (const frame of frames) {
  if (frame.loading === 'lazy') lazyFigures.observe(frame.parentElement);
  else loadFigure(frame);
}

let updatePending = false;
function updateField() {
  updatePending = false;
  const figure = fieldFrame.parentElement.getBoundingClientRect();
  const progress = (innerHeight - figure.top) / (innerHeight + figure.height);
  const nextState = motion.matches || progress >= .5 ? 'with' : 'today';
  if (nextState !== fieldState) {
    fieldState = nextState;
    tellField();
  }
  field.classList.toggle('is-driven', !motion.matches);
  jobs.forEach((job, index) => {
    const threshold = innerHeight * (.85 - index * .045);
    job.classList.toggle('is-crossed', job.getBoundingClientRect().top <= threshold);
  });
}

function scheduleFieldUpdate() {
  if (updatePending) return;
  updatePending = true;
  requestAnimationFrame(updateField);
}

addEventListener('scroll', scheduleFieldUpdate, { passive: true });
addEventListener('resize', scheduleFieldUpdate);
motion.addEventListener('change', scheduleFieldUpdate);
new ResizeObserver(scheduleFieldUpdate).observe(field);
updateField();

const bank = document.querySelector('[data-bank]');
const bankObserver = new IntersectionObserver(([entry]) => {
  if (!entry.isIntersecting) return;
  bankObserver.disconnect();
  if (!motion.matches) bank.classList.add('is-playing');
}, { threshold: .35 });
bankObserver.observe(bank);

if (CSS.supports('animation-timeline: view()')) {
  document.body.classList.add('scroll-motion');
} else {
  document.body.classList.add('io-motion');
  const reveals = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.replace('is-awaiting', 'has-entered');
      reveals.unobserve(entry.target);
    }
  }, { threshold: .14 });

  for (const element of document.querySelectorAll('.matter-stage, .image-window, .pilot')) {
    element.classList.add('is-awaiting');
    reveals.observe(element);
  }
}
