(function () {
  const config = window.reviewHubConfig ?? {};
  const documents = window.reviewHubDocuments ?? [];
  const TIMELINE_SAFE_EDGE_PERCENT = 3.5;

  const monthRow = document.getElementById('month-row');
  const timelineBoard = document.getElementById('timeline-board');
  const timelineLegend = document.getElementById('timeline-legend');
  const documentGrid = document.getElementById('document-grid');
  const modal = document.getElementById('review-modal');
  const modalTitle = document.getElementById('modal-title');
  const modalKicker = document.getElementById('modal-kicker');
  const modalBody = document.getElementById('modal-body');

  function escapeHtml(value) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function renderInlineMarkdown(text) {
    return escapeHtml(text)
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>');
  }

  function renderMarkdown(markdown) {
    const lines = markdown.replace(/\r\n/g, '\n').split('\n');
    const output = [];
    let paragraph = [];
    let listType = null;
    let listItems = [];
    let codeBlock = [];
    let inCodeBlock = false;

    function flushParagraph() {
      if (!paragraph.length) {
        return;
      }

      output.push(`<p>${renderInlineMarkdown(paragraph.join(' '))}</p>`);
      paragraph = [];
    }

    function flushList() {
      if (!listType) {
        return;
      }

      output.push(`<${listType}>${listItems.map((item) => `<li>${item}</li>`).join('')}</${listType}>`);
      listType = null;
      listItems = [];
    }

    function flushCodeBlock() {
      if (!inCodeBlock) {
        return;
      }

      output.push(`<pre><code>${escapeHtml(codeBlock.join('\n'))}</code></pre>`);
      codeBlock = [];
      inCodeBlock = false;
    }

    lines.forEach((line) => {
      if (line.startsWith('```')) {
        flushParagraph();
        flushList();

        if (inCodeBlock) {
          flushCodeBlock();
        } else {
          inCodeBlock = true;
        }

        return;
      }

      if (inCodeBlock) {
        codeBlock.push(line);
        return;
      }

      const trimmed = line.trim();

      if (!trimmed) {
        flushParagraph();
        flushList();
        return;
      }

      const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        flushParagraph();
        flushList();
        const level = headingMatch[1].length;
        output.push(`<h${level}>${renderInlineMarkdown(headingMatch[2])}</h${level}>`);
        return;
      }

      const unorderedMatch = trimmed.match(/^-\s+(.+)$/);
      if (unorderedMatch) {
        flushParagraph();
        if (listType !== 'ul') {
          flushList();
          listType = 'ul';
        }
        listItems.push(renderInlineMarkdown(unorderedMatch[1]));
        return;
      }

      const orderedMatch = trimmed.match(/^\d+\.\s+(.+)$/);
      if (orderedMatch) {
        flushParagraph();
        if (listType !== 'ol') {
          flushList();
          listType = 'ol';
        }
        listItems.push(renderInlineMarkdown(orderedMatch[1]));
        return;
      }

      if (listType && /^\s{2,}\S+/.test(line) && listItems.length) {
        listItems[listItems.length - 1] = `${listItems[listItems.length - 1]} ${renderInlineMarkdown(trimmed)}`;
        return;
      }

      paragraph.push(trimmed);
    });

    flushParagraph();
    flushList();
    flushCodeBlock();

    return output.join('');
  }

  function positionPercent(monthIndex) {
    const usableWidth = 100 - TIMELINE_SAFE_EDGE_PERCENT * 2;
    return `${TIMELINE_SAFE_EDGE_PERCENT + (monthIndex / 12) * usableWidth}%`;
  }

  function widthPercent(start, end) {
    const usableWidth = 100 - TIMELINE_SAFE_EDGE_PERCENT * 2;
    return `${((end - start) / 12) * usableWidth}%`;
  }

  function openModal({ title, kicker, html }) {
    modalTitle.textContent = title;
    modalKicker.textContent = kicker;
    modalBody.innerHTML = html;
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
  }

  function closeModal() {
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
    modalBody.innerHTML = '';
    document.body.classList.remove('modal-open');
  }

  function renderTimeline() {
    const timeline = config.timeline ?? { months: [], phases: [], milestones: [] };
    monthRow.innerHTML = '';
    timelineBoard.innerHTML = '';
    timelineLegend.innerHTML = '';

    timeline.months.forEach((label) => {
      const month = document.createElement('div');
      month.className = 'month-cell';
      month.textContent = label;
      monthRow.appendChild(month);
    });

    timeline.months.forEach((_, index) => {
      const stripe = document.createElement('div');
      stripe.className = `month-stripe${index % 2 === 1 ? ' is-alt' : ''}`;
      stripe.style.left = positionPercent(index);
      timelineBoard.appendChild(stripe);
    });

    timeline.phases.forEach((phase) => {
      const bar = document.createElement('button');
      bar.type = 'button';
      bar.className = `phase-bar phase-${phase.color}`;
      bar.style.left = positionPercent(phase.start);
      bar.style.width = widthPercent(phase.start, phase.end);
      bar.style.top = `${3.2 + phase.lane * 2.5}rem`;
      bar.setAttribute('aria-label', `${phase.label} from ${timeline.months[Math.floor(phase.start)]} to ${timeline.months[Math.min(11, Math.floor(phase.end))]}`);
      bar.innerHTML = `<span>${phase.label}</span>`;
      bar.addEventListener('click', () => {
        openModal({
          title: phase.label,
          kicker: 'Timeline phase',
          html: `<p>This phase is currently mapped from <strong>${timeline.months[Math.floor(phase.start)]}</strong> through <strong>${timeline.months[Math.min(11, Math.floor(phase.end))]}</strong>.</p>`,
        });
      });
      timelineBoard.appendChild(bar);
    });

    timeline.milestones.forEach((milestone) => {
      const marker = document.createElement('div');
      marker.className = `timeline-marker marker-${milestone.style}`;
      marker.style.left = positionPercent(milestone.monthIndex);
      if (typeof milestone.connectTo === 'number') {
        marker.style.width = `calc(${widthPercent(milestone.monthIndex, milestone.connectTo)} + 0.55rem)`;
      }
      marker.title = milestone.label;
      timelineBoard.appendChild(marker);

      const callout = document.createElement('div');
      const calloutOffsetRem = 12 + (milestone.calloutLane ?? 0) * 1.75;
      callout.className = `milestone-callout align-${milestone.calloutAlign ?? 'left'}`;
      callout.style.left = positionPercent(milestone.monthIndex);
      callout.style.setProperty('--label-offset', `${calloutOffsetRem}rem`);
      callout.innerHTML = `
        <div class="milestone-callout-line"></div>
        <div class="milestone-callout-label">${milestone.label}</div>
      `;
      timelineBoard.appendChild(callout);

      const card = document.createElement('article');
      card.className = 'legend-card';
      card.innerHTML = `
        <p class="legend-month">${milestone.monthLabel}</p>
        <h3>${milestone.label}</h3>
        <p>${milestone.summary ?? 'A locked milestone in the season flow.'}</p>
      `;
      timelineLegend.appendChild(card);
    });
  }

  function buildButton(label, className, onClick, disabled = false) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = className;
    button.textContent = label;
    button.disabled = disabled;
    if (!disabled) {
      button.addEventListener('click', onClick);
    }
    return button;
  }

  function renderDocuments() {
    documentGrid.innerHTML = '';

    documents.forEach((doc) => {
      const card = document.createElement('article');
      card.className = 'document-card';

      const actions = document.createElement('div');
      actions.className = 'document-actions';
      actions.appendChild(
        buildButton('Review draft', 'button button-primary', () => {
          openModal({
            title: doc.title,
            kicker: 'Markdown draft',
            html: `<div class="document-preview">${renderMarkdown(doc.markdown)}</div>`,
          });
        }),
      );

      card.innerHTML = `
        <h3>${doc.title}</h3>
        <p class="document-excerpt">${escapeHtml(doc.excerpt)}</p>
      `;
      card.appendChild(actions);
      documentGrid.appendChild(card);
    });
  }

  document.querySelectorAll('[data-close-modal]').forEach((element) => {
    element.addEventListener('click', closeModal);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !modal.classList.contains('hidden')) {
      closeModal();
    }
  });

  renderTimeline();
  renderDocuments();
})();