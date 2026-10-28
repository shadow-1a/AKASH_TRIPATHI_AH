const _photoCache = {};
const _photoQueue = [];
let _photoActive = 0;
const _PHOTO_MAX_ACTIVE = 3;

function _photoLimit(fn) {
  return new Promise(resolve => {
    const run = () => {
      _photoActive++;
      fn().then(resolve, () => resolve(null)).then(() => {
        _photoActive--;
        if (_photoQueue.length) _photoQueue.shift()();
      });
    };
    _photoActive < _PHOTO_MAX_ACTIVE ? run() : _photoQueue.push(run);
  });
}

function _photoJSON(url, tries = 2) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12000);
  return fetch(url, { signal: ctrl.signal })
    .then(r => { clearTimeout(t); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .catch(e => { clearTimeout(t); if (tries > 1) return _photoJSON(url, tries - 1); throw e; });
}

function _photoCanLoad(u) {
  return new Promise(res => {
    const i = new Image();
    let done = false;
    const end = v => { if (!done) { done = true; res(v); } };
    i.referrerPolicy = 'no-referrer';
    i.onload = () => end(i.naturalWidth > 50);
    i.onerror = () => end(false);
    setTimeout(() => end(false), 15000);
    i.src = u;
  });
}
