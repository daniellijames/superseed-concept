// The artwork timelines own their clocks. This control only gates when they run.
export function playback(stage, preference, resume, pause) {
  const button = document.querySelector('[data-playback]');
  let paused = false;
  let hovered = false;
  let focused = false;

  function update() {
    button.hidden = preference.matches;
    button.textContent = paused ? 'Play animation' : 'Pause animation';
    const stopped = paused || hovered || focused || preference.matches;
    stage.classList.toggle('is-paused', stopped);
    if (stopped) pause();
    else resume();
  }

  button.addEventListener('click', () => { paused = !paused; update(); });
  stage.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') { hovered = true; update(); } });
  stage.addEventListener('pointerleave', () => { hovered = false; update(); });
  stage.addEventListener('focusin', () => { focused = true; update(); });
  stage.addEventListener('focusout', event => { focused = stage.contains(event.relatedTarget); update(); });
  preference.addEventListener('change', update);
  update();
  return () => !paused && !hovered && !focused && !preference.matches;
}
