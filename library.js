/* GURUKUL STUDY LIBRARY — automatic HTML-PPT discovery from GitHub */
(() => {
  const OWNER = 'mishraji-institute';
  const REPO = 'Class-X';
  const BRANCHES = ['main', 'master'];
  const ROOTS = ['ppts/', 'slides/'];
  const API = branch => `https://api.github.com/repos/${OWNER}/${REPO}/git/trees/${branch}?recursive=1`;
  const RAW = branch => `https://raw.githubusercontent.com/${OWNER}/${REPO}/${branch}/`;
  const PAGES = `https://${OWNER}.github.io/${REPO}/`;

  const localCatalog = [
    { path: 'Home%20page.html', subject: 'Overview', title: 'Home Page', description: 'Landing page for the Gurukul study portal.' },
    { path: 'home.html', subject: 'Overview', title: 'School Home', description: 'Secondary home page for quick access and navigation.' },
    { path: 'presentation.html', subject: 'Overview', title: 'Presentation', description: 'Class presentation and study showcase.' },
    { path: 'ppts/AI/AI_Unit_1_Explanation.html', subject: 'AI', title: 'AI Unit 1 Explanation', description: 'Artificial Intelligence study material for classroom learning.' },
    { path: 'ppts/Mathematics/Class11_EaJEE_Mathematics_Roadmap.html', subject: 'Mathematics', title: 'Mathematics Roadmap', description: 'Roadmap and structured guidance for Class 11 mathematics learning.' },
    { path: 'ppts/UI-Design/Liquid_Glass_Dashboard_Design.html', subject: 'UI Design', title: 'Liquid Glass Dashboard Design', description: 'Design case study for the glassmorphism dashboard concept.' },
    { path: 'ppts/README.md', subject: 'Resources', title: 'PPT Index', description: 'Folder overview and instructions for the presentation library.' }
  ];

  const grid = document.getElementById('dynamic-library');
  const filters = document.getElementById('subject-filters');
  const search = document.getElementById('library-search');
  const count = document.getElementById('library-count');
  if (!grid) return;

  let activeSubject = 'All';
  let items = [...localCatalog];
  let branch = 'main';

  const pretty = value => value.replace(/\.html?$/i, '').replace(/[-_]+/g, ' ').replace(/\b\w/g, m => m.toUpperCase());
  const subjectOf = path => {
    const relative = ROOTS.reduce((value, root) => value.replace(new RegExp(`^${root}`, 'i'), ''), path);
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

  function getItemHref(item) {
    if (item.path.startsWith('http')) return item.path;
    return `${PAGES}${item.path.split('/').map(encodeURIComponent).join('/')}`;
  }

  function render() {
    const query = (search?.value || '').trim().toLowerCase();
    const visible = items.filter(item =>
      (activeSubject === 'All' || item.subject === activeSubject) &&
      (!query || `${item.title} ${item.subject} ${item.description}`.toLowerCase().includes(query))
    );
    grid.innerHTML = visible.length ? visible.map(item => `
      <a class="library-card" href="${getItemHref(item)}" target="_blank" rel="noopener">
        <div class="library-icon" aria-hidden="true">${safe(icon(item.subject))}</div>
        <div class="library-meta"><span>${safe(item.subject)}</span><b>${item.path.endsWith('.md') ? 'DOC' : 'HTML PPT'}</b></div>
        <h3>${safe(item.title)}</h3>
        <p>${safe(item.description || 'Interactive study presentation available in the school study library.')}</p>
        <div class="library-open">Open ${item.path.endsWith('.md') ? 'Document' : 'Presentation'} <span>↗</span></div>
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

  function fallback(message = 'The local study files are connected and ready to open from this folder.') {
    grid.innerHTML = `<div class="library-empty"><strong>Study library loaded from the local project folder.</strong><br>${safe(message)}</div>`;
    if (count) count.textContent = `${items.length} local materials available`;
  }

  async function load() {
    let data;
    for (const candidate of BRANCHES) {
      try {
        const response = await fetch(API(candidate), { headers: { Accept: 'application/vnd.github+json' } });
        if (response.ok) { data = await response.json(); branch = candidate; break; }
      } catch (_) {}
    }

    if (data) {
      items = (data.tree || [])
        .filter(node => node.type === 'blob' && ROOTS.some(root => node.path.startsWith(root)) && /\.html?$/i.test(node.path))
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
      return;
    }

    items = [...localCatalog];
    fallback('The project folder is connected directly to the page, so all local files can be opened from this site.');
    renderFilters();
    render();
  }

  search?.addEventListener('input', render);
  load();
})();
