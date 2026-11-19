const canvas = document.querySelector('#game');
const start = document.querySelector('#start');
const launcher = document.querySelector('#launcher');
const status = document.querySelector('#status');
const progress = document.querySelector('#loading');
const fullscreen = document.querySelector('#fullscreen');
let instance;
canvas.addEventListener("contextmenu", event => event.preventDefault());

function showMessage(message, type) {
  if (type !== 'error' && type !== 'warning') return;
  status.textContent = message.replace(/<[^>]+>/g, ' ');
  if (type === 'error') launcher.hidden = false;
}

function installLoader(url) {
  return new Promise((resolve, reject) => {
    const js = document.createElement('script');
    js.src = url;
    js.onload = resolve;
    js.onerror = () => reject(new Error('The game loader could not be downloaded.'));
    document.head.append(js);
  });
}

start.addEventListener('click', async () => {
  if (instance) return;
  start.disabled = true;
  progress.hidden = false;
  status.textContent = 'Loading SPARTA…';
  try {
    const response = await fetch('unity-build.json');
    if (!response.ok) throw new Error('The game files could not be found.');
    const settings = await response.json();
    await installLoader(settings.loader);
    instance = await createUnityInstance(canvas, {
      ...settings.config,
      devicePixelRatio: Math.min(window.devicePixelRatio || 1, 1.25),
      showBanner: showMessage
    }, value => {
      progress.value = value;
      status.textContent = 'Loading SPARTA… ' + Math.round(value * 100) + '%';
    });
    launcher.hidden = true;
    canvas.classList.add('ready');
    fullscreen.disabled = false;
    canvas.focus();
  } catch (error) {
    status.textContent = error.message || String(error);
    start.textContent = 'Retry';
    start.disabled = false;
    progress.hidden = true;
  }
});

fullscreen.addEventListener('click', () => {
  if (instance) {
    instance.SetFullscreen(1);
    canvas.focus();
  }
});
