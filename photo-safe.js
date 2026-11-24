/* photo-safe.js - safe photo loader for Prayagraj Tourism */
(function () {
  // Words that make a photo get rejected. Add more words here any time.
  var BLOCK = /nude|naked|nudity|topless|erotic|porn|sexual|sex\b|genital|penis|breast|lingerie|underwear|bikini|adult|explicit|holocaust|concentration camp|death camp|prisoner|massacre|genocide|corpse|dead bod|execution|torture|atrocit|famine|starv|lynch|gore|autopsy|abuse|auschwitz|buchenwald|dachau|mauthausen|belsen|ghetto|war crime|victim|naga sadhu|naga sanyasi/i;

  // Searches for these never go to Wikipedia (no real page exists), so a themed placeholder is used.
  var NO_WIKI = /toilet|sulabh|restroom|washroom|latrine|urinal|bus stand|bus station|bus stop|isbt|depot/i;

  var STOP = { city: 1, the: 1, and: 1, with: 1, near: 1, from: 1 };

  function placeholder(label) {
    var t = String(label || 'Prayagraj').replace(/[<>&"]/g, '');
    var svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500">' +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#9a3412"/><stop offset="1" stop-color="#431407"/>' +
      '</linearGradient></defs>' +
      '<rect width="800" height="500" fill="url(#g)"/>' +
      '<text x="400" y="235" font-size="72" text-anchor="middle">🕉️</text>' +
      '<text x="400" y="320" font-size="34" fill="#fcd34d" text-anchor="middle" font-family="Georgia,serif">' + t + '</text>' +
      '</svg>';
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  function decode(s) {
    try { return decodeURIComponent(s); } catch (e) { return s; }
  }

  function safeWikiPhoto(q) {
    q = String(q || '');
    if (!q || NO_WIKI.test(q)) return Promise.resolve(null);

    var key = 'safephoto:' + q;
    try {
      var cached = sessionStorage.getItem(key);
      if (cached !== null) return Promise.resolve(cached || null);
    } catch (e) {}

    var words = q.toLowerCase().split(/[^a-z0-9]+/).filter(function (w) {
      return w.length > 3 && !STOP[w];
    });

    var url = 'https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*' +
      '&generator=search&gsrlimit=8&gsrsearch=' + encodeURIComponent(q) +
      '&prop=pageimages|categories|description&piprop=thumbnail&pithumbsize=900&cllimit=max';

    return fetch(url)
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var pages = Object.keys((d.query && d.query.pages) || {}).map(function (k) {
          return d.query.pages[k];
        }).sort(function (a, b) { return a.index - b.index; });

        for (var i = 0; i < pages.length; i++) {
          var p = pages[i];
          if (!p.thumbnail || !p.thumbnail.source) continue;

          var cats = (p.categories || []).map(function (c) { return c.title; }).join(' ');
          var text = decode([p.title, p.description || '', cats, p.thumbnail.source].join(' '));
          if (BLOCK.test(text)) continue;

          var title = p.title.toLowerCase();
          if (words.length && !words.some(function (w) { return title.indexOf(w) > -1; })) continue;

          return p.thumbnail.source;
        }
        return null;
      })
      .then(function (u) {
        try { sessionStorage.setItem(key, u || ''); } catch (e) {}
        return u;
      })
      .catch(function () { return null; });
  }

  function fill(img) {
    if (img.dataset.safeDone) return;
    img.dataset.safeDone = '1';

    var q = img.getAttribute('data-wiki');
    var label = img.alt || q;
    var local = img.getAttribute('data-local');
    img.loading = 'lazy';

    function usePlaceholder() {
      img.onerror = null;
      img.src = placeholder(label);
    }
    function useWiki() {
      img.onerror = usePlaceholder;
      safeWikiPhoto(q).then(function (u) {
        img.src = u || placeholder(label);
      });
    }

    if (local) {
      img.onerror = useWiki;
      img.src = local;
    } else {
      useWiki();
    }
  }

  function scan(root) {
    if (!root || !root.querySelectorAll) return;
    if (root.matches && root.matches('img[data-wiki]')) fill(root);
    var list = root.querySelectorAll('img[data-wiki]');
    for (var i = 0; i < list.length; i++) fill(list[i]);
  }

  // Keep the same function name your pages already use
  window.wikiPhoto = safeWikiPhoto;
  window.safeWikiPhoto = safeWikiPhoto;

  function start() {
    scan(document);
    // Also handles cards that your pages build with JavaScript (like the toilets list)
    new MutationObserver(function (muts) {
      muts.forEach(function (m) {
        for (var i = 0; i < m.addedNodes.length; i++) scan(m.addedNodes[i]);
      });
    }).observe(document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
