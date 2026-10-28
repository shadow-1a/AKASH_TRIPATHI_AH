const _photoCache = {};
async function wikiPhoto(q) {
  if (_photoCache[q] !== undefined) return _photoCache[q];
  try {
    const url = 'https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=' +
      encodeURIComponent(q) + '&gsrlimit=3&prop=pageimages&piprop=thumbnail&pithumbsize=1200&format=json&origin=*';
    const j = await (await fetch(url)).json();
    const pages = Object.values(j.query.pages).sort((a, b) => a.index - b.index);
    const p = pages.find(x => x.thumbnail);
    return (_photoCache[q] = p ? p.thumbnail.source : null);
  } catch (e) { return (_photoCache[q] = null); }
}
function placeholder(q) {
  return 'https://placehold.co/900x600/c2410c/ffffff?text=' + encodeURIComponent(q.split(' ').slice(0, 3).join(' '));
}
function fillPhotos(root = document) {
  root.querySelectorAll('img[data-wiki]:not([data-done])').forEach(img => {
    img.dataset.done = 1;
    const go = async () => { img.src = (await wikiPhoto(img.dataset.wiki)) || placeholder(img.dataset.wiki); };
    if (img.dataset.local) { img.onerror = () => { img.onerror = null; go(); }; img.src = img.dataset.local; }
    else go();
  });
}
document.addEventListener('DOMContentLoaded', () => fillPhotos());
