/* GURUKUL STUDY LIBRARY — automatic HTML-PPT discovery from GitHub */
(() => {
  const OWNER = 'mishraji-institute';
  const REPO = 'Class-X';
  const BRANCHES = ['main', 'master'];
  const ROOT = 'ppts/';
  const API = branch => `https://api.github.com/repos/${OWNER}/${REPO}/git/trees/${branch}?recursive=1`;
  const RAW = branch => `https://raw.githubusercontent.com/${OWNER}/${REPO}/${branch}/`;
  const PAGES = `https://${OWNER}.github.io/${REPO}/`;

  const grid = document.getElementById('dynamic-library');
  const filters = document.getElementById('subject-filters');
  const search = document.getElementById('library-search');
  const count = document.getElementById('library-count');
  if (!grid) return;

  let activeSubject = 'All';
  let items = [];
  let branch = 'main';

  const pretty = value => value.replace(/\.html?$/i, '').replace(/[-_]+/g, ' ').replace(/\b\w/g, m => m.toUpperCase());
  const subjectOf = path => {
    const relative = path.replace(/^ppts\//i, '');
    return pretty(relative.split('/')[0] || 'General');
  };
  const icon = subject => {
    const s = subject.toLowerCase();
    if (s.includes('math')) return '∑';
    if (s.includes('computer') || s.includes('cs')) return '⌘';
    if (s.includes('science')) return '⚗';
    if (s.includes('english')) return 'Aa';
    if (s.includes('ai') || s.includes('artificial')) return 'AI';
    if (s.includes('physics')) return 'Φ';
    if (s.includes('chem')) return '⚛';
    return '▦';
  };
  const safe = value => String(value || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function render() {
    const query = (search?.value || '').trim().toLowerCase();
    const visible = items.filter(item =>
      (activeSubject === 'All' || item.subject === activeSubject) &&
      (!query || `${item.title} ${item.subject} ${item.description}`.toLowerCase().includes(query))
    );
    grid.innerHTML = visible.length ? visible.map(item => `
      <a class="library-card" href="${PAGES + item.path.split('/').map(encodeURIComponent).join('/')}" target="_blank" rel="noopener">
        <div class="library-icon" aria-hidden="true">${safe(icon(item.subject))}</div>
        <div class="library-meta"><span>${safe(item.subject)}</span><b>HTML PPT</b></div>
        <h3>${safe(item.title)}</h3>
        <p>${safe(item.description || 'Interactive study presentation available in the school study library.')}</p>
        <div class="library-open">Open Presentation <span>↗</span></div>
      </a>`).join('') : '<div class="library-empty">No study material matches your search yet.</div>';
    if (count) count.textContent = `${visible.length} material${visible.length === 1 ? '' : 's'} available`;
    document.dispatchEvent(new CustomEvent('library:rendered'));
  }

  function renderFilters() {
    if (!filters) return;
    const subjects = ['All', ...Array.from(new Set(items.map(item => item.subject))).sort()];
    filters.innerHTML = subjects.map(subject => `<button type="button" class="filter-bar ${subject === activeSubject ? 'active' : ''}" data-subject="${safe(subject)}">${safe(subject)}</button>`).join('');
    filters.querySelectorAll('.filter-bar').forEach(button => button.addEventListener('click', () => {
      activeSubject = button.dataset.subject || 'All';
      renderFilters();
      render();
    }));
  }

  function fallback(message = 'Upload HTML PPTs inside ppts/Subject/ in GitHub and refresh this page.') {
    grid.innerHTML = `<div class="library-empty"><strong>Study library is waiting for materials.</strong><br>${safe(message)}</div>`;
    if (count) count.textContent = 'Connected to GitHub repository';
  }

  async function load() {
    let data;
    for (const candidate of BRANCHES) {
      try {
        const response = await fetch(API(candidate), { headers: { Accept: 'application/vnd.github+json' } });
        if (response.ok) { data = await response.json(); branch = candidate; break; }
      } catch (_) {}
    }
    if (!data) return fallback('The GitHub repository could not be reached right now. Try refreshing in a moment.');

    items = (data.tree || [])
      .filter(node => node.type === 'blob' && node.path.startsWith(ROOT) && /\.html?$/i.test(node.path))
      .map(node => ({
        path: node.path,
        subject: subjectOf(node.path),
        title: pretty(node.path.split('/').pop()),
        description: ''
      }));

    await Promise.all(items.map(async item => {
      try {
        const response = await fetch(RAW(branch) + item.path.split('/').map(encodeURIComponent).join('/'));
        const html = await response.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');
        item.title = doc.querySelector('title')?.textContent?.trim() || item.title;
        item.description = doc.querySelector('meta[name="description"]')?.content?.trim() || '';
      } catch (_) {}
    }));

    renderFilters();
    render();
  }

  search?.addEventListener('input', render);
  load();
})();
