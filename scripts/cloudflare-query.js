/* Browser-only adapter for the four URL-query routes formerly rendered by Node.
   Keep the same origin and localStorage keys at production cutover. */
(() => {
  const path = location.pathname.replace(/\/+$/, '') || '/';
  const params = new URLSearchParams(location.search);
  if (path === '/trip') {
    const root = document.getElementById('tripApp');
    if (root) root.dataset.tripId = params.get('id') || '';
    return;
  }
  if (!['/parks', '/find', '/compare'].includes(path)) return;
  if (!params.toString() && path !== '/compare') return;
  const esc = x => String(x == null ? '' : x).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const url = '/cloudflare-parks.json';
  fetch(url).then(r => { if (!r.ok) throw new Error('Park index unavailable'); return r.json(); }).then(parks => {
    const main = document.querySelector('main');
    if (!main || !Array.isArray(parks) || parks.length !== 116) throw new Error('Incorrect park index');
    const bySlug = new Map(parks.map(p => [p.slug, p]));
    const form = main.querySelector('form.filters');
    if (form) {
      for (const control of form.querySelectorAll('[name]')) {
        if (control.type === 'checkbox') control.checked = params.getAll(control.name).includes(control.value);
        else if (params.has(control.name)) control.value = params.get(control.name);
      }
    }
    const state = params.get('state') || '';
    const trip = params.get('trip') || '';
    const tag = params.get('tag') || '';
    const practical = params.get('practical') || '';
    const q = (params.get('q') || '').toLowerCase();
    const baseMatch = p => (!state || p.state === state) && (!trip || p.idealTrip.toLowerCase() === trip.toLowerCase());
    if (path === '/parks') {
      let count = 0;
      for (const a of main.querySelectorAll('.cards.browse-cards > a[href^="/parks/"]')) {
        const slug = a.getAttribute('href').split('/')[2];
        const p = bySlug.get(slug);
        const matched = !!p && baseMatch(p) && (!tag || p.experience.includes(tag)) &&
          (!practical || p.practical.includes(practical)) &&
          (!q || [p.name,p.city,p.review,p.pros,p.cons,p.criticalFactors].join(' ').toLowerCase().includes(q));
        a.hidden = !matched;
        if (matched) count++;
      }
      // Native [hidden] can be overridden by the card's display CSS.
      if (!document.getElementById('cf-hidden-style')) {
        const style = document.createElement('style');style.id = 'cf-hidden-style';style.textContent = '[hidden]{display:none!important}';document.head.append(style);
      }
      const row = main.querySelector('.results-row');
      if (row) row.innerHTML = `<strong>${count}</strong> parks match your filters <a href="/parks">Clear filters</a>`;
      if (!count) {
        const cards = main.querySelector('.cards.browse-cards');
        cards?.insertAdjacentHTML('afterend', '<div class="empty-state"><h3>No parks match that combination.</h3><p>Try removing a filter or <a href="/parks">view all 116 parks</a>.</p></div>');
      }
      return;
    }
    if (path === '/compare') {
      const chosen = (params.get('parks') || '').split(',').map(s => bySlug.get(s)).filter(Boolean).slice(0,3);
      if (chosen.length < 2) return;
      const cells = (title, getter) => `<tr><th>${title}</th>${chosen.map(p => `<td>${esc(getter(p))}</td>`).join('')}</tr>`;
      main.innerHTML = `<section class="page-intro"><div class="kicker blue">COMPARE</div><h1>Which fits this trip?</h1></section><table class="compare-table"><thead><tr><th></th>${chosen.map(p => `<th>${esc(p.name.replace(' State Park', ''))}</th>`).join('')}</tr></thead><tbody>`+
        cells('Location',p => `${p.city}, ${p.state}`)+cells('Ideal trip',p => p.idealTrip)+cells('Pine rating',p => `${Number(p.rating).toFixed(1)} / 5`)+cells('Pros',p => p.pros || '—')+cells('Cons',p => p.cons || '—')+cells('Critical factors',p => p.criticalFactors || '—')+'</tbody></table>';
      document.title = 'Compare Parks | Atlas';
      return;
    }
    if (path === '/find' && params.has('go')) {
      const wants = params.getAll('experience').filter(Boolean);
      const avoids = params.getAll('avoid').filter(Boolean);
      let matches = parks.filter(p => baseMatch(p) && wants.every(x => p.experience.includes(x)) && avoids.every(x => !p.practical.includes(x)));
      const broader = !matches.length;
      if (broader) matches = parks.filter(p => baseMatch(p) && (!wants.length || wants.some(x => p.experience.includes(x))) && avoids.every(x => !p.practical.includes(x)));
      const cards = matches.slice(0,18).map(p => {
        const why = [trip && p.idealTrip.toLowerCase() === trip.toLowerCase() ? p.idealTrip : null, ...wants.filter(x => p.experience.includes(x))].filter(Boolean);
        const reason = why.length ? why.join(' · ') : p.idealTrip;
        return `<article class="park-card"><a href="/parks/${encodeURIComponent(p.slug)}">${p.image ? `<div class="card-photo"><img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy"></div>` : ''}<div class="card-body"><div class="eyebrow">${esc(p.city)}, ${esc(p.state)}</div><h3>${esc(p.name.replace(' State Park',''))}</h3><div class="trip">${esc(p.idealTrip)}</div><p style="margin-top:10px;font-size:12px">Good fit because: ${esc(reason)}</p><span class="button blue" style="display:inline-block;margin-top:10px">Read review</span></div></a></article>`;
      }).join('');
      const section = main.querySelector('form.filters')?.nextElementSibling;
      if (!section) throw new Error('Finder results container unavailable');
      const replacement = document.createElement('section');replacement.className = 'section';
      replacement.innerHTML = `<div class="section-head"><div><div class="kicker blue">MATCHES</div><h2>${matches.length} parks fit this trip.</h2><p>${broader ? 'No park matched every requested experience, so these results match at least one requested experience while preserving your state/trip/avoid filters.' : 'These are filtered fits, not a best-to-worst ranking.'}</p></div></div>`+
        (matches.length ? `<div class="cards browse-cards">${cards}</div>${matches.length > 18 ? `<p class="source-note">Showing 18 of ${matches.length}. Refine the filters to narrow the set.</p>` : ''}` : '<div class="empty-state"><h3>No parks matched these constraints.</h3><p>Try removing one experience or avoidance filter.</p></div>');
      section.replaceWith(replacement);
    }
  }).catch(err => {
    console.error('Cloudflare Parks query adapter:',err);
    const main = document.querySelector('main');
    const error = document.createElement('div');error.className='empty-state';
    error.textContent='Unable to display filtered results. Please reload the page.';
    main?.prepend(error);
  });
})();
