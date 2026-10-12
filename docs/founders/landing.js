// Shared by the founders landing page (map, paths) and the founding page (calendar).
// Each section renders only when its elements are on the page.
(function () {
  const config = window.foundersConfig ?? {};
  const application = window.foundersApplication ?? { paths: [] };
  const PATH_STYLES = window.RegionMap?.PATH_STYLES ?? {};
  const DRAFT_KEY = 'wtc-founders-application-draft';
  const DAY_MS = 24 * 60 * 60 * 1000;

  function parseLocalDate(value) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  function formatDate(date) {
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function readDraft() {
    try {
      return JSON.parse(localStorage.getItem(DRAFT_KEY) ?? 'null');
    } catch {
      return null;
    }
  }

  // ---------- founding window ----------

  function renderWindowStatus() {
    const status = document.getElementById('window-status');
    const text = document.getElementById('window-status-text');
    if (!status) return;
    const { opens, closes } = config.foundingWindow ?? {};
    if (!opens || !closes) {
      status.hidden = true;
      return;
    }

    const now = new Date();
    const openDate = parseLocalDate(opens);
    const closeDate = parseLocalDate(closes);

    if (now < openDate) {
      text.textContent = `Founding window opens ${formatDate(openDate)}`;
    } else if (now < closeDate) {
      const days = Math.ceil((closeDate - now) / DAY_MS);
      text.textContent = `Founding window open · closes ${formatDate(closeDate)} (${days} day${days === 1 ? '' : 's'} left)`;
    } else {
      text.textContent = `The founding window closed ${formatDate(closeDate)}. Affiliates are still welcome.`;
    }
  }

  // ---------- calendar ----------

  function renderCalendar() {
    const months = document.getElementById('calendar-months');
    const track = document.getElementById('calendar-track');
    const windowBar = document.getElementById('calendar-window');
    const afterBar = document.getElementById('calendar-after');
    if (!track) return () => {};
    const seasonStart = parseLocalDate(config.seasonStart ?? '2026-09-01');
    const seasonEnd = new Date(seasonStart.getFullYear(), seasonStart.getMonth() + 12, 1);
    const span = seasonEnd - seasonStart;
    const percent = (date) => Math.min(100, Math.max(0, ((date - seasonStart) / span) * 100));

    for (let i = 0; i < 12; i += 1) {
      const month = new Date(seasonStart.getFullYear(), seasonStart.getMonth() + i, 1);
      const cell = document.createElement('span');
      cell.textContent = month.toLocaleDateString('en-US', { month: 'short' });
      months.appendChild(cell);
    }

    const { opens, closes } = config.foundingWindow ?? {};
    if (opens && closes) {
      const start = percent(parseLocalDate(opens));
      const end = percent(parseLocalDate(closes));
      windowBar.style.left = `${start}%`;
      windowBar.style.width = `${end - start}%`;
      afterBar.style.left = `calc(${end}% + 0.35rem)`;
      afterBar.style.width = `calc(${100 - end}% - 0.35rem)`;
    }

    const marker = document.createElement('div');
    marker.className = 'calendar-today';
    track.appendChild(marker);

    // Returned so the marker can be repositioned as the date changes.
    return function updateToday() {
      const now = new Date();
      marker.hidden = now < seasonStart || now >= seasonEnd;
      marker.style.left = `${percent(now)}%`;
      marker.title = `Today, ${formatDate(now)}`;
    };
  }

  // ---------- paths ----------

  function renderPaths() {
    const grid = document.getElementById('path-grid');
    grid.innerHTML = application.paths.map((path) => `
      <article class="path-card" style="--path-color: ${PATH_STYLES[path.id]?.color ?? '#b24133'}">
        <h3>${escapeHtml(path.name)}</h3>
        <p>${escapeHtml(path.tagline)}</p>
        <ul class="check-list">
          ${path.requirements.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
        </ul>
        <a class="button" href="./apply.html?path=${encodeURIComponent(path.id)}">Apply as ${escapeHtml(path.name.toLowerCase())}</a>
      </article>
    `).join('');
  }

  // ---------- map ----------

  function renderLegend(hasDraft) {
    const legend = document.getElementById('map-legend');
    const items = Object.values(PATH_STYLES).map((style) => (
      `<span><i class="legend-swatch" style="background:${style.color}"></i>${style.label}</span>`
    ));
    if (hasDraft) {
      items.push('<span><i class="legend-swatch" style="background:transparent;border:2px dashed #b24133"></i>Your draft</span>');
    }
    legend.innerHTML = items.join('');
  }

  function regionTooltip(properties, note) {
    const pathLabel = PATH_STYLES[properties.path]?.label ?? 'Region';
    const lines = [`<strong>${escapeHtml(properties.name ?? 'Unnamed region')}</strong>`, escapeHtml(note ?? pathLabel)];
    if (properties.homeBase) lines.push(escapeHtml(properties.homeBase));
    return lines.join('<br>');
  }

  function renderMap() {
    const element = document.getElementById('landing-map');
    const tooltip = document.getElementById('map-tooltip');
    const published = config.publishedRegions?.features ?? [];
    const draft = readDraft();
    const draftGeometry = draft?.answers?.region ?? null;
    const draftNote = draft?.status === 'submitted'
      ? 'Your application, pending review'
      : draft?.status === 'saved' ? 'Your application, not sent yet' : 'Your draft, not submitted';

    renderLegend(Boolean(draftGeometry));

    function showTooltip(event, html) {
      const bounds = element.getBoundingClientRect();
      tooltip.innerHTML = html;
      tooltip.hidden = false;
      tooltip.style.left = `${event.clientX - bounds.left}px`;
      tooltip.style.top = `${event.clientY - bounds.top}px`;
    }

    function hideTooltip() {
      tooltip.hidden = true;
    }

    function addRegion(geometry, { color, className, html }) {
      return usMap.regionsLayer.append('path')
        .attr('class', className ?? null)
        .attr('d', usMap.regionPath(geometry))
        .attr('fill', color ?? null)
        .attr('stroke', color ?? null)
        .on('pointermove', (event) => showTooltip(event, html))
        .on('pointerleave', hideTooltip);
    }

    const pathOrder = Object.keys(PATH_STYLES);
    const pathRank = (feature) => {
      const rank = pathOrder.indexOf(feature.properties?.path);
      return rank === -1 ? pathOrder.length : rank;
    };

    // One card per approved region under the map. Hovering a card or its shape highlights both.
    function addRegionCard(properties, color, shape) {
      const list = document.getElementById('region-list');
      const card = document.createElement('article');
      card.className = 'region-card';
      card.style.setProperty('--path-color', color);
      const meta = [PATH_STYLES[properties.path]?.label, properties.homeBase].filter(Boolean).map(escapeHtml).join(' &middot; ');
      card.innerHTML = `
        <h3>${escapeHtml(properties.name ?? 'Unnamed region')}</h3>
        <p>${meta}</p>
        <div class="state-chips">${(properties.states ?? []).map((abbr) => `<span class="chip">${escapeHtml(abbr)}</span>`).join('')}</div>
      `;
      const setActive = (active) => {
        card.classList.toggle('is-active', active);
        shape.classed('is-active', active);
      };
      card.addEventListener('pointerenter', () => setActive(true));
      card.addEventListener('pointerleave', () => setActive(false));
      shape.on('pointerenter.card', () => setActive(true)).on('pointerleave.card', () => setActive(false));
      list.appendChild(card);
      list.hidden = false;
    }

    const usMap = window.RegionMap.createUsMap(element);
    usMap.ready
      .then(() => {
        const showRegions = (features) => features
          .slice()
          .sort((a, b) => pathRank(a) - pathRank(b) || String(a.properties?.name).localeCompare(String(b.properties?.name)))
          .forEach((feature) => {
            const properties = feature.properties ?? {};
            const color = PATH_STYLES[properties.path]?.color ?? '#b24133';
            const shape = addRegion(feature.geometry, { color, html: regionTooltip(properties) });
            addRegionCard(properties, color, shape);
          });
        showRegions(published);
        // Approved regions come from the database; the map still works if that request fails.
        if (window.FoundersStore?.isConfigured()) {
          window.FoundersStore.loadRegions().then(showRegions).catch(() => {});
        }
        if (draftGeometry) {
          addRegion(draftGeometry, {
            className: 'is-draft',
            html: regionTooltip({ name: draft.answers.regionName || 'Your region', homeBase: draft.answers.homeBase }, draftNote),
          });
        }
      })
      .catch(() => {
        element.innerHTML = '<div class="map-error">The map could not load. Check your connection and refresh.</div>';
      });
  }

  const updateToday = renderCalendar();

  // Keep the today marker and countdown current if the page stays open across days.
  function refreshDates() {
    renderWindowStatus();
    updateToday();
  }

  refreshDates();
  setInterval(refreshDates, 60 * 60 * 1000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) refreshDates();
  });

  if (document.getElementById('path-grid')) renderPaths();
  if (document.getElementById('landing-map')) renderMap();
})();
