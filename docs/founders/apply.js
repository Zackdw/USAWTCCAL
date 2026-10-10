(function () {
  const config = window.foundersConfig ?? {};
  const questions = window.foundersApplication;
  const RegionMap = window.RegionMap;
  const DRAFT_KEY = 'wtc-founders-application-draft';
  const SCHEMA_VERSION = 1;

  const form = document.getElementById('application-form');
  const content = document.getElementById('step-content');
  const stepper = document.getElementById('stepper');
  const backButton = document.getElementById('back-button');
  const nextButton = document.getElementById('next-button');
  const saveNote = document.getElementById('save-note');
  const formNav = document.getElementById('form-nav');

  const REVIEW_STEP = { id: 'review', title: 'Review & submit', fields: [] };
  const steps = [...questions.steps, REVIEW_STEP];
  // Fields whose value changes which other fields are shown; changing them re-renders the step.
  const DEPENDENCY_FIELDS = new Set(['path', 'travelReadyPlayers', 'selector', 'supportNeeded']);
  // Field ids asked differently per path (e.g. a number for regions, a radio for affiliates).
  const PATH_VARIANT_IDS = (() => {
    const types = {};
    questions.steps.flatMap((step) => step.fields).forEach((field) => {
      (types[field.id] ??= new Set()).add(field.type);
    });
    return Object.keys(types).filter((id) => types[id].size > 1);
  })();

  let state = loadState();
  let activeMaps = [];
  let statesData = null;
  let saveTimer = null;

  // ---------- persistence ----------

  function freshState() {
    return { answers: {}, stepIndex: 0, maxVisited: 0, status: 'draft', submission: null };
  }

  function loadState() {
    let saved = null;
    try {
      saved = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? 'null');
    } catch {
      saved = null;
    }
    const next = saved && typeof saved === 'object' ? { ...freshState(), ...saved } : freshState();
    const requestedPath = new URLSearchParams(window.location.search).get('path');
    if (!next.answers.path && questions.paths.some((path) => path.id === requestedPath)) {
      next.answers.path = requestedPath;
    }
    next.stepIndex = Math.min(next.stepIndex, steps.length - 1);
    return next;
  }

  function saveState({ immediate = false } = {}) {
    clearTimeout(saveTimer);
    const write = () => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(state));
        const time = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        saveNote.textContent = `Saved on this device at ${time}`;
      } catch {
        saveNote.textContent = 'This browser is not saving drafts, so finish in one sitting.';
      }
    };
    if (immediate) write();
    else saveTimer = setTimeout(write, 400);
  }

  // ---------- helpers ----------

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function isVisible(field, answers = state.answers) {
    if (field.paths && !field.paths.includes(answers.path)) return false;
    if (field.showIf && !field.showIf(answers)) return false;
    return true;
  }

  function visibleFields(step) {
    return step.fields.filter((field) => isVisible(field));
  }

  function stepIntro(step) {
    return step.introByPath?.[state.answers.path] ?? step.intro ?? '';
  }

  function pathById(id) {
    return questions.paths.find((path) => path.id === id);
  }

  function isEmpty(value) {
    if (value === undefined || value === null) return true;
    if (typeof value === 'string') return value.trim() === '';
    if (Array.isArray(value)) return value.length === 0;
    return false;
  }

  function destroyMaps() {
    activeMaps.forEach((map) => map.destroy());
    activeMaps = [];
  }

  function slugify(value) {
    return String(value ?? '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 40) || 'application';
  }

  function generateId() {
    const date = new Date();
    const stamp = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
    const random = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `WTCF-${stamp}-${random}`;
  }

  // ---------- field rendering ----------

  function labelHtml(field, tag = 'label') {
    const forAttr = tag === 'label' ? ` for="field-${field.id}"` : '';
    const required = field.required ? '<span class="required-mark" aria-hidden="true">*</span>' : '';
    return `<${tag}${forAttr}>${escapeHtml(field.label)}${required}</${tag}>`;
  }

  function helpHtml(field) {
    return field.help ? `<p class="field-help" id="help-${field.id}">${escapeHtml(field.help)}</p>` : '';
  }

  function describedBy(field) {
    return field.help ? ` aria-describedby="help-${field.id}"` : '';
  }

  function renderPathField(field) {
    const value = state.answers[field.id];
    const options = questions.paths.map((path) => `
      <label class="path-option" style="--path-color: ${RegionMap.PATH_STYLES[path.id]?.color}">
        <input type="radio" name="${field.id}" value="${path.id}" ${value === path.id ? 'checked' : ''}>
        <h3>${escapeHtml(path.name)}</h3>
        <p>${escapeHtml(path.tagline)}</p>
        <ul class="check-list">${path.requirements.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
      </label>
    `).join('');
    return `
      <fieldset class="field" data-field="${field.id}">
        ${labelHtml(field, 'legend')}
        ${helpHtml(field)}
        <div class="path-options">${options}</div>
      </fieldset>
    `;
  }

  function pathHint() {
    const { path, travelReadyPlayers } = state.answers;
    const count = Number(travelReadyPlayers);
    if (!path || !travelReadyPlayers) return '';
    if (path === 'regional' && count < 3) {
      return 'A regional founding needs three travel-ready players or a realistic path to three. You can still apply here and describe that path, or choose Provisional if your group is still forming.';
    }
    if (path === 'provisional' && count >= 3) {
      return 'With three or more travel-ready players, you may already meet the regional founding standard.';
    }
    if (path === 'affiliate' && count >= 3) {
      return 'A group of three or more might be ready for a provisional or regional founding. Affiliates are welcome too.';
    }
    return '';
  }

  function renderInputField(field) {
    const value = state.answers[field.id] ?? '';
    const type = field.type === 'number' ? 'number' : field.type === 'email' ? 'email' : 'text';
    const extras = [
      field.placeholder ? `placeholder="${escapeHtml(field.placeholder)}"` : '',
      field.min !== undefined ? `min="${field.min}"` : '',
      field.max !== undefined ? `max="${field.max}"` : '',
      type === 'email' ? 'autocomplete="email"' : '',
      type === 'number' ? 'inputmode="numeric"' : '',
    ].join(' ');
    const hint = field.id === 'travelReadyPlayers' && pathHint()
      ? `<p class="path-hint">${escapeHtml(pathHint())}</p>`
      : '';
    return `
      <div class="field" data-field="${field.id}">
        ${labelHtml(field)}
        ${helpHtml(field)}
        <input id="field-${field.id}" name="${field.id}" type="${type}" value="${escapeHtml(value)}" ${extras}${describedBy(field)}>
        ${hint}
      </div>
    `;
  }

  function renderTextarea(field) {
    return `
      <div class="field" data-field="${field.id}">
        ${labelHtml(field)}
        ${helpHtml(field)}
        <textarea id="field-${field.id}" name="${field.id}" rows="${field.rows ?? 3}"${describedBy(field)}>${escapeHtml(state.answers[field.id] ?? '')}</textarea>
      </div>
    `;
  }

  function renderSelect(field) {
    const value = state.answers[field.id] ?? '';
    const options = field.options.map((option) => (
      `<option value="${option.value}" ${value === option.value ? 'selected' : ''}>${escapeHtml(option.label)}</option>`
    )).join('');
    return `
      <div class="field" data-field="${field.id}">
        ${labelHtml(field)}
        ${helpHtml(field)}
        <select id="field-${field.id}" name="${field.id}"${describedBy(field)}>
          <option value="">Choose one&hellip;</option>
          ${options}
        </select>
      </div>
    `;
  }

  function renderChoices(field) {
    const multiple = field.type === 'checkboxes';
    const value = state.answers[field.id] ?? (multiple ? [] : '');
    const options = field.options.map((option) => {
      const checked = multiple ? value.includes(option.value) : value === option.value;
      return `
        <label class="choice">
          <input type="${multiple ? 'checkbox' : 'radio'}" name="${field.id}" value="${option.value}" ${checked ? 'checked' : ''}>
          <span>${escapeHtml(option.label)}</span>
        </label>
      `;
    }).join('');
    const inline = field.options.length <= 3 && field.options.every((option) => option.label.length < 28);
    return `
      <fieldset class="field" data-field="${field.id}">
        ${labelHtml(field, 'legend')}
        ${helpHtml(field)}
        <div class="choice-list${inline ? ' is-inline' : ''}">${options}</div>
      </fieldset>
    `;
  }

  function renderConsent(field) {
    const checked = state.answers[field.id] === true;
    return `
      <div class="field" data-field="${field.id}">
        <div class="choice-list">
          <label class="choice">
            <input type="checkbox" name="${field.id}" data-consent ${checked ? 'checked' : ''}>
            <span>${escapeHtml(field.label)}${field.required ? '<span class="required-mark" aria-hidden="true">*</span>' : ''}</span>
          </label>
        </div>
      </div>
    `;
  }

  function renderScale(field) {
    if (state.answers[field.id] === undefined) {
      state.answers[field.id] = Math.round((field.min + field.max) / 2);
    }
    const value = state.answers[field.id];
    return `
      <div class="field" data-field="${field.id}">
        ${labelHtml(field)}
        ${helpHtml(field)}
        <div class="scale">
          <span>${escapeHtml(field.minLabel)}</span>
          <input id="field-${field.id}" name="${field.id}" type="range" min="${field.min}" max="${field.max}" step="1" value="${value}"${describedBy(field)}>
          <span>${escapeHtml(field.maxLabel)}</span>
        </div>
        <div class="scale-value" id="scale-value-${field.id}">${value} of ${field.max}</div>
      </div>
    `;
  }

  function renderRegionField(field) {
    return `
      <div class="field" data-field="${field.id}">
        ${labelHtml(field, 'p').replace('<p>', '<p class="field-label">')}
        ${helpHtml(field)}
        <div class="region-editor">
          <div class="region-toolbar">
            <div class="tool-group" role="group" aria-label="Map tool">
              <button type="button" class="tool-button" data-mode="pan" aria-pressed="false">Move map</button>
              <button type="button" class="tool-button" data-mode="freehand" aria-pressed="false">Freehand</button>
              <button type="button" class="tool-button" data-mode="points" aria-pressed="false">Points</button>
            </div>
            <button type="button" class="button button-small" data-action="finish" hidden>Finish shape</button>
            <button type="button" class="button button-small" data-action="undo">Undo</button>
            <button type="button" class="button button-small" data-action="clear">Clear</button>
            <span class="toolbar-spacer"></span>
            <div class="tool-group" role="group" aria-label="Zoom">
              <button type="button" class="tool-button" data-zoom="out" aria-label="Zoom out">&minus;</button>
              <button type="button" class="tool-button" data-zoom="in" aria-label="Zoom in">+</button>
              <button type="button" class="tool-button" data-zoom="reset">Whole US</button>
            </div>
            <select data-action="jump" aria-label="Zoom to a state">
              <option value="">Zoom to state&hellip;</option>
            </select>
          </div>
          <div class="region-map" id="region-map"></div>
          <div class="region-status" id="region-status"></div>
        </div>
      </div>
    `;
  }

  function blankPerson() {
    return { name: '', role: '', discord: '', bcpEmail: '' };
  }

  function peopleRows(field) {
    const people = state.answers[field.id];
    return Array.isArray(people) && people.length ? people : [blankPerson()];
  }

  function personIsBlank(person) {
    return Object.values(person).every((value) => isEmpty(value));
  }

  function renderPeopleSlots(field) {
    const people = peopleRows(field);
    const listId = `roles-${field.id}`;
    const slots = people.map((person, index) => `
      <div class="person-slot" data-person-index="${index}">
        <div class="person-slot-header">
          <span class="person-number">${index + 1}</span>
          <button type="button" class="link-button" data-person-remove="${index}" aria-label="Remove person ${index + 1}">Remove</button>
        </div>
        <div class="person-grid">
          <label><span>Name<span class="required-mark" aria-hidden="true">*</span></span>
            <input type="text" data-person-key="name" value="${escapeHtml(person.name)}" autocomplete="off">
          </label>
          <label>Role
            <input type="text" data-person-key="role" value="${escapeHtml(person.role)}" list="${listId}" placeholder="Player, Organizer&hellip;" autocomplete="off">
          </label>
          <label>Discord handle
            <input type="text" data-person-key="discord" value="${escapeHtml(person.discord)}" placeholder="@handle" autocomplete="off">
          </label>
          <label>BCP email
            <input type="email" data-person-key="bcpEmail" value="${escapeHtml(person.bcpEmail)}" placeholder="Email used on Best Coast Pairings" autocomplete="off">
          </label>
        </div>
      </div>
    `).join('');
    return `
      <datalist id="${listId}">${(field.roleSuggestions ?? []).map((role) => `<option value="${escapeHtml(role)}">`).join('')}</datalist>
      <div class="person-slots">${slots}</div>
      <button type="button" class="button button-small" data-person-add>+ Add person</button>
    `;
  }

  function renderPeopleField(field) {
    return `
      <fieldset class="field" data-field="${field.id}" data-people-field>
        ${labelHtml(field, 'legend')}
        ${helpHtml(field)}
        <div class="people-editor">${renderPeopleSlots(field)}</div>
      </fieldset>
    `;
  }

  function renderField(field) {
    switch (field.type) {
      case 'path': return renderPathField(field);
      case 'text':
      case 'email':
      case 'number': return renderInputField(field);
      case 'textarea': return renderTextarea(field);
      case 'select': return renderSelect(field);
      case 'radio':
      case 'checkboxes': return renderChoices(field);
      case 'consent': return renderConsent(field);
      case 'scale': return renderScale(field);
      case 'region': return renderRegionField(field);
      case 'people': return renderPeopleField(field);
      default: return '';
    }
  }

  // ---------- people editor ----------

  function peopleFieldFor(element) {
    const wrapper = element.closest('[data-people-field]');
    if (!wrapper) return null;
    const field = visibleFields(steps[state.stepIndex]).find((f) => f.id === wrapper.dataset.field);
    return field ? { wrapper, field } : null;
  }

  function rerenderPeople(wrapper, field, focusIndex) {
    wrapper.querySelector('.people-editor').innerHTML = renderPeopleSlots(field);
    if (focusIndex !== undefined) {
      wrapper.querySelector(`[data-person-index="${focusIndex}"] input`)?.focus();
    }
  }

  content.addEventListener('click', (event) => {
    const addButton = event.target.closest('[data-person-add]');
    const removeButton = event.target.closest('[data-person-remove]');
    if (!addButton && !removeButton) return;
    const context = peopleFieldFor(event.target);
    if (!context) return;
    const people = peopleRows(context.field).slice();
    if (addButton) {
      people.push(blankPerson());
      state.answers[context.field.id] = people;
      rerenderPeople(context.wrapper, context.field, people.length - 1);
    } else {
      people.splice(Number(removeButton.dataset.personRemove), 1);
      state.answers[context.field.id] = people;
      rerenderPeople(context.wrapper, context.field);
    }
    saveState();
  });

  function onPersonInput(target) {
    const context = peopleFieldFor(target);
    if (!context) return;
    const index = Number(target.closest('[data-person-index]').dataset.personIndex);
    const people = peopleRows(context.field).map((person) => ({ ...person }));
    people[index][target.dataset.personKey] = target.value;
    state.answers[context.field.id] = people;
    target.closest('.person-slot').classList.remove('has-error');
    clearFieldError(context.field.id);
    saveState();
  }

  // ---------- region editor ----------

  const MODE_HINTS = {
    pan: 'Drag to move, scroll or pinch to zoom.',
    freehand: 'Press and drag to outline your region. Scroll to zoom.',
    points: 'Click to add corners, then click the first point to close.',
  };

  function formatArea(sqMi) {
    if (!sqMi) return '';
    if (sqMi >= 10000) return `~${Math.round(sqMi / 1000).toLocaleString()}k sq mi`;
    return `~${Math.round(sqMi).toLocaleString()} sq mi`;
  }

  function regionStatusHtml(hint) {
    const geometry = state.answers.region;
    const hintHtml = `<span class="region-hint">${escapeHtml(hint ?? '')}</span>`;
    if (!geometry) return `<span>No region drawn yet.</span>${hintHtml}`;
    const shapes = geometry.type === 'MultiPolygon' ? geometry.coordinates.length : 1;
    const states = state.answers.regionStates ?? [];
    const statesHtml = states.length
      ? `<span>Touches</span><span class="state-chips">${states.map((abbr) => `<span class="chip">${escapeHtml(abbr)}</span>`).join('')}</span>`
      : (statesData ? '<span>Outside US state lines</span>' : '<span>Looking up states&hellip;</span>');
    return `<strong>${shapes} shape${shapes === 1 ? '' : 's'}</strong><span>${formatArea(state.answers.regionAreaSqMi)}</span>${statesHtml}${hintHtml}`;
  }

  function updateRegionAnswers(geometry) {
    if (!geometry) {
      delete state.answers.region;
      delete state.answers.regionStates;
      delete state.answers.regionAreaSqMi;
    } else {
      state.answers.region = geometry;
      state.answers.regionAreaSqMi = Math.round(RegionMap.areaSqMi(geometry));
      state.answers.regionStates = RegionMap.statesTouched(geometry, statesData);
    }
  }

  function mountRegionEditor() {
    const element = document.getElementById('region-map');
    if (!element) return;
    const status = document.getElementById('region-status');
    const editor = element.closest('.region-editor');
    const finishButton = editor.querySelector('[data-action="finish"]');
    const jumpSelect = editor.querySelector('[data-action="jump"]');
    let currentHint = '';

    const usMap = RegionMap.createUsMap(element, { zoomable: true });
    activeMaps.push(usMap);

    const refreshStatus = () => { status.innerHTML = regionStatusHtml(currentHint); };

    const drawer = RegionMap.createDrawer(usMap, {
      onChange(geometry) {
        updateRegionAnswers(geometry);
        clearFieldError('region');
        refreshStatus();
        saveState();
      },
    });

    function setMode(mode) {
      drawer.setMode(mode);
      editor.querySelectorAll('[data-mode]').forEach((button) => {
        button.setAttribute('aria-pressed', String(button.dataset.mode === mode));
      });
      finishButton.hidden = mode !== 'points';
      currentHint = MODE_HINTS[mode];
      refreshStatus();
    }

    editor.querySelectorAll('[data-mode]').forEach((button) => {
      button.addEventListener('click', () => setMode(button.dataset.mode));
    });
    editor.querySelector('[data-zoom="in"]').addEventListener('click', () => usMap.zoomBy(1.8));
    editor.querySelector('[data-zoom="out"]').addEventListener('click', () => usMap.zoomBy(1 / 1.8));
    editor.querySelector('[data-zoom="reset"]').addEventListener('click', () => usMap.resetZoom());
    finishButton.addEventListener('click', () => drawer.finishPoints());
    editor.querySelector('[data-action="undo"]').addEventListener('click', () => drawer.undo());
    editor.querySelector('[data-action="clear"]').addEventListener('click', () => {
      if (!state.answers.region || window.confirm('Clear every shape you have drawn?')) drawer.clear();
    });
    jumpSelect.addEventListener('change', () => {
      const feature = usMap.getStates().find((f) => f.properties.abbr === jumpSelect.value);
      if (feature) usMap.zoomToGeometry(feature.geometry);
      jumpSelect.value = '';
    });

    setMode(state.answers.region ? 'pan' : 'freehand');

    usMap.ready
      .then((states) => {
        states.forEach((feature) => {
          const option = document.createElement('option');
          option.value = feature.properties.abbr;
          option.textContent = feature.properties.name;
          jumpSelect.appendChild(option);
        });
        if (state.answers.region) {
          drawer.load(state.answers.region);
          usMap.zoomToGeometry(state.answers.region, { maxScale: 8, padding: 0.6, animate: false });
        }
        return RegionMap.loadStates();
      })
      .then((states) => {
        statesData = states;
        if (!activeMaps.includes(usMap)) return;
        if (state.answers.region) {
          updateRegionAnswers(state.answers.region);
          saveState();
        }
        refreshStatus();
      })
      .catch(() => {
        element.innerHTML = '<div class="map-error">The map could not load. Check your connection and refresh the page.</div>';
      });
  }

  // ---------- events ----------

  function readFieldValue(target) {
    const { name, type } = target;
    if (target.dataset.consent !== undefined) return target.checked;
    if (type === 'checkbox') {
      return [...content.querySelectorAll(`input[name="${name}"]:checked`)].map((input) => input.value);
    }
    if (type === 'radio') return target.value;
    if (type === 'range') return Number(target.value);
    return target.value;
  }

  function onFieldInput(event) {
    const target = event.target;
    if (target.dataset.personKey) {
      onPersonInput(target);
      return;
    }
    if (!target.name || target.closest('.region-toolbar')) return;
    if (target.name === 'path' && state.answers.path !== target.value) {
      PATH_VARIANT_IDS.forEach((id) => delete state.answers[id]);
    }
    state.answers[target.name] = readFieldValue(target);
    if (target.type === 'range') {
      const output = document.getElementById(`scale-value-${target.name}`);
      const field = steps[state.stepIndex].fields.find((f) => f.id === target.name);
      if (output && field) output.textContent = `${target.value} of ${field.max}`;
    }
    clearFieldError(target.name);
    saveState();
  }

  function onFieldChange(event) {
    onFieldInput(event);
    if (DEPENDENCY_FIELDS.has(event.target.name)) {
      const scrollY = window.scrollY;
      const focusName = event.target.name;
      const focusValue = event.target.value;
      renderStep({ keepScroll: true });
      window.scrollTo(0, scrollY);
      const selector = event.target.type === 'radio'
        ? `[name="${focusName}"][value="${CSS.escape(focusValue)}"]`
        : `[name="${focusName}"]`;
      content.querySelector(selector)?.focus({ preventScroll: true });
    }
  }

  content.addEventListener('input', onFieldInput);
  content.addEventListener('change', onFieldChange);

  // ---------- validation ----------

  function clearFieldError(fieldId) {
    const wrapper = content.querySelector(`[data-field="${fieldId}"]`);
    if (!wrapper) return;
    wrapper.classList.remove('has-error');
    wrapper.querySelector('.field-error')?.remove();
  }

  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function filledPeople(value) {
    return (Array.isArray(value) ? value : []).filter((person) => !personIsBlank(person));
  }

  // Index of each slot that has details but no name, or a malformed BCP email.
  function invalidPeople(value) {
    return (Array.isArray(value) ? value : [])
      .map((person, index) => ({ person, index }))
      .filter(({ person }) => !personIsBlank(person) && (
        isEmpty(person.name) || (!isEmpty(person.bcpEmail) && !EMAIL_PATTERN.test(person.bcpEmail.trim()))
      ))
      .map(({ index }) => index);
  }

  function fieldError(field) {
    const value = state.answers[field.id];
    if (field.type === 'people') {
      if (invalidPeople(value).length) return 'Each person needs a name, and BCP emails need to be valid. Remove any slots you do not need.';
      return field.required && !filledPeople(value).length ? 'Add at least one person.' : '';
    }
    if (field.type === 'consent') {
      return field.required && value !== true ? 'Please confirm to continue.' : '';
    }
    if (field.type === 'region') {
      return field.required && !value ? 'Draw at least one shape for your region.' : '';
    }
    if (field.required && isEmpty(value)) {
      if (field.type === 'checkboxes') return 'Choose at least one.';
      if (field.type === 'radio' || field.type === 'select' || field.type === 'path') return 'Choose an option.';
      return 'This one is required.';
    }
    if (!isEmpty(value) && field.type === 'email' && !EMAIL_PATTERN.test(value.trim())) {
      return 'Enter a valid email address.';
    }
    if (!isEmpty(value) && field.type === 'number') {
      const number = Number(value);
      if (!Number.isFinite(number) || !Number.isInteger(number)) return 'Enter a whole number.';
      if (field.min !== undefined && number < field.min) return `Enter ${field.min} or more.`;
      if (field.max !== undefined && number > field.max) return `Enter ${field.max} or less.`;
    }
    return '';
  }

  function stepErrors(step) {
    return visibleFields(step)
      .map((field) => ({ field, message: fieldError(field) }))
      .filter((entry) => entry.message);
  }

  function showErrors(errors) {
    errors.forEach(({ field, message }) => {
      const wrapper = content.querySelector(`[data-field="${field.id}"]`);
      if (!wrapper) return;
      wrapper.classList.add('has-error');
      wrapper.querySelector('.field-error')?.remove();
      const note = document.createElement('p');
      note.className = 'field-error';
      note.setAttribute('role', 'alert');
      note.textContent = message;
      wrapper.appendChild(note);
      if (field.type === 'people') {
        invalidPeople(state.answers[field.id]).forEach((index) => {
          wrapper.querySelector(`[data-person-index="${index}"]`)?.classList.add('has-error');
        });
      }
    });
    const first = content.querySelector('.has-error');
    if (first) {
      first.scrollIntoView({ behavior: 'smooth', block: 'center' });
      first.querySelector('input, textarea, select, button')?.focus({ preventScroll: true });
    }
  }

  function firstIncompleteStep() {
    return questions.steps.findIndex((step) => stepErrors(step).length > 0);
  }

  // ---------- review ----------

  function formatAnswer(field) {
    const value = state.answers[field.id];
    if (field.type === 'path') return escapeHtml(pathById(value)?.name ?? '');
    if (field.type === 'consent') return value ? 'Yes' : 'No';
    if (field.type === 'people') {
      const people = filledPeople(value);
      if (!people.length) return '<span class="review-empty">Not answered</span>';
      return `<ul class="review-people">${people.map((person) => `<li><strong>${escapeHtml(person.name)}</strong>${
        [person.role, person.discord, person.bcpEmail].filter((part) => !isEmpty(part)).map((part) => ` · ${escapeHtml(part)}`).join('')
      }</li>`).join('')}</ul>`;
    }
    if (isEmpty(value)) return '<span class="review-empty">Not answered</span>';
    if (field.type === 'select' || field.type === 'radio') {
      return escapeHtml(field.options.find((option) => option.value === value)?.label ?? value);
    }
    if (field.type === 'checkboxes') {
      return escapeHtml(value.map((v) => field.options.find((option) => option.value === v)?.label ?? v).join(', '));
    }
    if (field.type === 'scale') {
      return escapeHtml(`${value} of ${field.max} (${field.minLabel} → ${field.maxLabel})`);
    }
    return escapeHtml(value);
  }

  function renderReview() {
    const sections = questions.steps.map((step, index) => {
      const rows = visibleFields(step).map((field) => {
        if (field.type === 'region') {
          const states = state.answers.regionStates ?? [];
          return `
            <dt>Region</dt>
            <dd>${state.answers.region ? `${formatArea(state.answers.regionAreaSqMi)}${states.length ? ` · ${escapeHtml(states.join(', '))}` : ''}` : '<span class="review-empty">Not drawn</span>'}</dd>
          `;
        }
        return `<dt>${escapeHtml(field.type === 'consent' ? field.label : field.label)}</dt><dd>${formatAnswer(field)}</dd>`;
      }).join('');
      const mapBlock = step.fields.some((field) => field.type === 'region') && state.answers.region
        ? '<div class="review-map" id="review-map"></div>'
        : '';
      return `
        <section class="review-section">
          <header>
            <h3>${escapeHtml(step.title)}</h3>
            <button type="button" class="link-button" data-goto="${index}">Edit</button>
          </header>
          ${mapBlock}
          <dl>${rows}</dl>
        </section>
      `;
    }).join('');

    return `
      <p class="section-kicker">Step ${steps.length} of ${steps.length}</p>
      <h2>Review &amp; submit</h2>
      <p class="step-intro">Check your answers before you send them. Organizers review each application against the founding standard and follow up on Discord or email.</p>
      ${sections}
    `;
  }

  function mountReviewMap() {
    const element = document.getElementById('review-map');
    if (!element || !state.answers.region) return;
    const usMap = RegionMap.createUsMap(element);
    activeMaps.push(usMap);
    usMap.ready
      .then(() => {
        usMap.regionsLayer.append('path')
          .attr('class', 'is-review')
          .attr('d', usMap.regionPath(state.answers.region));
        usMap.zoomToGeometry(state.answers.region, { maxScale: 6, padding: 0.5, animate: false });
      })
      .catch(() => element.remove());
  }

  // ---------- submission ----------

  function buildSubmission() {
    const answers = { ...state.answers };
    const geometry = answers.region;
    delete answers.region;

    const visibleIds = new Set(
      questions.steps.flatMap((step) => visibleFields(step).map((field) => field.id)),
    );
    Object.keys(answers).forEach((key) => {
      if (!visibleIds.has(key) && !['regionStates', 'regionAreaSqMi'].includes(key)) delete answers[key];
    });
    if (answers.members) answers.members = filledPeople(answers.members);

    const id = state.submission?.id ?? generateId();
    const centroid = geometry ? RegionMap.centroidOf(geometry) : null;

    return {
      id,
      schemaVersion: SCHEMA_VERSION,
      submittedAt: new Date().toISOString(),
      path: answers.path,
      region: {
        type: 'Feature',
        geometry,
        properties: {
          applicationId: id,
          name: answers.regionName,
          path: answers.path,
          status: 'pending',
          homeBase: answers.homeBase,
          states: answers.regionStates ?? [],
          areaSqMi: answers.regionAreaSqMi ?? null,
          centroid,
        },
      },
      answers,
    };
  }

  function downloadSubmission(submission) {
    const blob = new Blob([JSON.stringify(submission, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `wtc-usa-founding-${slugify(submission.answers.regionName)}-${submission.id}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function submitApplication() {
    const submission = buildSubmission();
    const endpoint = config.submission?.endpoint;
    nextButton.disabled = true;
    nextButton.textContent = 'Submitting…';

    let delivered = false;
    let errorMessage = '';
    if (endpoint) {
      try {
        // text/plain avoids a CORS preflight, which keeps simple endpoints like Apps Script working.
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(submission),
        });
        if (!response.ok) throw new Error(`Server responded ${response.status}`);
        delivered = true;
      } catch (error) {
        errorMessage = error.message;
      }
    }

    nextButton.disabled = false;
    if (endpoint && !delivered) {
      state.submission = submission;
      saveState({ immediate: true });
      renderStep();
      const notice = document.createElement('div');
      notice.className = 'notice is-error';
      notice.setAttribute('role', 'alert');
      notice.innerHTML = `We could not reach the application server (${escapeHtml(errorMessage)}). Your answers are still saved. Try again, or <button type="button" class="link-button" data-download>download your application</button> and send it to the organizers.`;
      content.appendChild(notice);
      notice.querySelector('[data-download]').addEventListener('click', () => downloadSubmission(submission));
      return;
    }

    state.status = delivered ? 'submitted' : 'saved';
    state.submission = submission;
    saveState({ immediate: true });
    renderConfirmation();
  }

  function renderConfirmation() {
    destroyMaps();
    const { submission, status } = state;
    const name = submission?.answers?.regionName ?? 'your region';
    const delivered = status === 'submitted';
    stepper.innerHTML = '';
    formNav.hidden = true;
    content.innerHTML = `
      <div class="confirmation">
        <div class="confirmation-badge" aria-hidden="true">&check;</div>
        <h2>${delivered ? 'Application received' : 'Application ready to send'}</h2>
        <p>${delivered
          ? `Thanks for stepping up for ${escapeHtml(name)}. Organizers will review your application against the founding standard and reach out on Discord or email.`
          : `Online submission is not open yet, so your application for ${escapeHtml(name)} is saved on this device. Download it and send it to the organizers.`}</p>
        <div class="app-id">${escapeHtml(submission?.id ?? '')}</div>
        ${delivered ? '' : `<div class="notice">${escapeHtml(config.submission?.contactNote ?? 'Send the downloaded file to the WTC USA Kill Team organizers.')}</div>`}
        <div class="confirmation-actions">
          <button type="button" class="button ${delivered ? '' : 'button-primary'}" data-action="download">Download application</button>
          <button type="button" class="button" data-action="copy">Copy as text</button>
          <a class="button" href="./">Back to Regional Founders</a>
        </div>
        <div class="confirmation-actions">
          <button type="button" class="link-button" data-action="edit">Edit answers</button>
          <button type="button" class="link-button" data-action="new">Start a new application</button>
        </div>
      </div>
    `;

    content.querySelector('[data-action="download"]').addEventListener('click', () => downloadSubmission(submission));
    content.querySelector('[data-action="copy"]').addEventListener('click', async (event) => {
      try {
        await navigator.clipboard.writeText(JSON.stringify(submission, null, 2));
        event.target.textContent = 'Copied';
      } catch {
        event.target.textContent = 'Copy failed. Use download instead.';
      }
    });
    content.querySelector('[data-action="edit"]').addEventListener('click', () => {
      state.status = 'draft';
      state.stepIndex = steps.length - 1;
      saveState({ immediate: true });
      formNav.hidden = false;
      renderStep();
    });
    content.querySelector('[data-action="new"]').addEventListener('click', () => {
      if (!window.confirm('Start over with a blank application? This clears the answers saved on this device.')) return;
      state = freshState();
      saveState({ immediate: true });
      formNav.hidden = false;
      renderStep();
    });
  }

  // ---------- step rendering ----------

  function renderStepper() {
    stepper.innerHTML = steps.map((step, index) => {
      const classes = [
        index === state.stepIndex ? 'is-current' : '',
        index < state.stepIndex || (index <= state.maxVisited && index !== state.stepIndex && stepErrors(step).length === 0 && step !== REVIEW_STEP) ? 'is-done' : '',
      ].join(' ');
      return `
        <li class="${classes}">
          <button type="button" data-goto="${index}" ${index > state.maxVisited ? 'disabled' : ''} ${index === state.stepIndex ? 'aria-current="step"' : ''}>
            <span class="step-index">${index + 1}</span>
            <span class="step-label">${escapeHtml(step.title)}</span>
          </button>
        </li>
      `;
    }).join('');
  }

  function renderStep({ keepScroll = false } = {}) {
    destroyMaps();
    const step = steps[state.stepIndex];
    renderStepper();

    if (step === REVIEW_STEP) {
      content.innerHTML = renderReview();
      mountReviewMap();
      nextButton.textContent = state.submission && config.submission?.endpoint ? 'Try again' : 'Submit application';
    } else {
      content.innerHTML = `
        <p class="section-kicker">Step ${state.stepIndex + 1} of ${steps.length}</p>
        <h2>${escapeHtml(step.title)}</h2>
        <p class="step-intro">${escapeHtml(stepIntro(step))}</p>
        ${visibleFields(step).map(renderField).join('')}
      `;
      mountRegionEditor();
      nextButton.textContent = state.stepIndex === steps.length - 2 ? 'Review answers' : 'Continue';
    }

    backButton.hidden = state.stepIndex === 0;
    if (!keepScroll) {
      document.querySelector('.apply-layout').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function goTo(index) {
    state.stepIndex = Math.max(0, Math.min(index, steps.length - 1));
    state.maxVisited = Math.max(state.maxVisited, state.stepIndex);
    saveState();
    renderStep();
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const step = steps[state.stepIndex];

    if (step === REVIEW_STEP) {
      const incomplete = firstIncompleteStep();
      if (incomplete !== -1) {
        goTo(incomplete);
        showErrors(stepErrors(steps[incomplete]));
        return;
      }
      submitApplication();
      return;
    }

    const errors = stepErrors(step);
    if (errors.length) {
      showErrors(errors);
      return;
    }
    goTo(state.stepIndex + 1);
  });

  backButton.addEventListener('click', () => goTo(state.stepIndex - 1));

  document.addEventListener('click', (event) => {
    const target = event.target.closest('[data-goto]');
    if (!target || target.disabled) return;
    goTo(Number(target.dataset.goto));
  });

  // ---------- start ----------

  if (state.status === 'submitted' || state.status === 'saved') {
    renderConfirmation();
  } else {
    renderStep({ keepScroll: true });
  }
})();
