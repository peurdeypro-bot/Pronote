import { scoreOnTwenty, weeklyGradeAverages } from './grade-statistics.js';

(() => {
  const readApiResponse = async (response, fallbackMessage) => {
    let rawBody = '';
    try {
      rawBody = await response.text();
    } catch {
      const responseMessage = response.ok
        ? 'Le serveur n’a pas renvoyé une réponse JSON valide.'
        : `Le serveur a renvoyé une réponse vide ou non JSON (HTTP ${response.status}).`;
      throw new Error(`${fallbackMessage} ${responseMessage} Vérifie que le serveur de l’application est démarré, puis réessaie.`);
    }

    let result = null;
    if (rawBody && rawBody.trim()) {
      try {
        result = JSON.parse(rawBody);
      } catch {
        const responseMessage = response.ok
          ? 'Le serveur n’a pas renvoyé une réponse JSON valide.'
          : `Le serveur a renvoyé une réponse vide ou non JSON (HTTP ${response.status}).`;
        throw new Error(`${fallbackMessage} ${responseMessage} Vérifie que le serveur de l’application est démarré, puis réessaie.`);
      }
    }

    if (!response.ok) {
      throw new Error(typeof result?.error === 'string' ? result.error : `${fallbackMessage} (HTTP ${response.status}).`);
    }
    if (!result || typeof result !== 'object' || Array.isArray(result)) {
      throw new Error(`${fallbackMessage} Le serveur a renvoyé une réponse invalide.`);
    }
    return result;
  };

  const container = document.getElementById('widgets');
  const editButton = document.getElementById('edit-layout');
  const todayLabel = document.getElementById('today-label');
  const toast = document.getElementById('toast');
  const globalBackgroundButton = document.getElementById('global-background-button');
  const globalBackgroundPanel = document.getElementById('global-background-settings');
  const widgetLibrary = document.getElementById('widget-library');
  const widgetLibrarySearch = document.getElementById('widget-library-search-input');
  const widgetLibraryEmpty = document.getElementById('widget-library-empty');
  const widgetOptions = [...document.querySelectorAll('.widget-option')];
  const widgetCategoryButtons = [...document.querySelectorAll('.widget-category')];
  const openWidgetLibrary = document.getElementById('open-widget-library');
  const aiWidgetDialog = document.getElementById('ai-widget-dialog');
  const aiWidgetForm = document.getElementById('ai-widget-form');
  const aiWidgetPromptLabel = document.getElementById('ai-widget-prompt-label');
  const aiWidgetPreview = document.getElementById('ai-widget-preview');
  const aiWidgetPreviewTitle = document.getElementById('ai-widget-preview-title');
  const aiWidgetPreviewFrame = document.getElementById('ai-widget-preview-frame');
  const aiWidgetDeveloperMode = document.getElementById('ai-widget-developer-mode');
  const aiWidgetCodeFields = document.getElementById('ai-widget-code-fields');
  const aiWidgetPrompt = document.getElementById('ai-widget-prompt');
  const aiWidgetCode = document.getElementById('ai-widget-code');
  const aiWidgetNotice = document.getElementById('ai-widget-notice');
  const generateWidgetButton = document.getElementById('generate-widget');
  const addAiWidgetButton = document.getElementById('add-ai-widget');
  const loginDialog = document.getElementById('login-dialog');
  const loginForm = document.getElementById('login-form');
  const loginStatus = document.getElementById('login-status');
  const submitLogin = document.getElementById('submit-login');
  const openLogin = document.getElementById('open-login');
  const disconnectButton = document.getElementById('disconnect');
  const connectionBadge = document.getElementById('connection-badge');
  const pageTitle = document.getElementById('page-title');
  const demoScheduleWeek = document.getElementById('schedule-demo-week');
  const demoScheduleGrid = document.getElementById('schedule-demo-grid');
  const realSchedule = document.getElementById('real-schedule');
  const gradeSummaryLabel = document.getElementById('grade-summary-label');
  const gradeSummaryValue = document.getElementById('grade-summary-value');
  const gradeList = document.getElementById('grade-list');
  const gradesPeriod = document.getElementById('grades-period');
  const scheduleMeta = document.getElementById('schedule-meta');
  const homeworkMeta = document.getElementById('homework-meta');
  const homeworkList = document.getElementById('homework-list');
  const demoGradeMarkup = gradeList.innerHTML;
  const demoHomeworkMarkup = homeworkList.innerHTML;
  const demoGradeLabel = gradeSummaryLabel.textContent;
  const demoGradeValue = gradeSummaryValue.innerHTML;
  const demoPageTitle = pageTitle.textContent;
  const demoGradesPeriod = gradesPeriod.textContent;
  const demoScheduleMeta = scheduleMeta.textContent;
  const demoHomeworkMeta = homeworkMeta.textContent;
  let pronoteData = null;
  const storageKey = 'pronote-dashboard-widget-order';
  const layoutStorageKey = 'pronote-dashboard-layout';
  const addedWidgetsStorageKey = 'pronote-dashboard-added-widgets';
  const appearanceKey = 'pronote-dashboard-appearance';
  const customWidgetsStorageKey = 'pronote-dashboard-custom-widgets';
  const maxImageLength = 150000;
  const optionalWidgetIds = new Set(['grade-trend', 'grade-subject-bars', 'grade-percentage', 'grade-pie']);
  const maxCustomWidgets = 8;
  const maxCustomWidgetHtmlLength = 18000;
  const customWidgetPattern = /^custom-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const legacyVacationCountdownHtml = `
    <style>
      .window-card{display:grid;gap:18px;padding:22px;border:1px solid #e7e9e3;border-radius:12px;background:#fff;color:#202722;font:14px/1.5 Inter,Arial,sans-serif}
      .widget-title{margin:0;color:#202722;font-size:18px;line-height:1.3;font-weight:700}
      .widget-label{display:block;margin-bottom:7px;color:#788078;font-size:12px;font-weight:600}
      .widget-input{width:100%;min-height:44px;padding:10px 12px;border:1px solid #dfe3dc;border-radius:7px;background:#fff;color:#202722;font:inherit}
      .widget-input:focus{border-color:#2f654c;outline:2px solid #e8f1eb}
      .widget-result{padding:16px;border-radius:9px;background:#e8f1eb;text-align:center}
      .widget-number{display:block;color:#2f654c;font-size:clamp(34px,10vw,52px);font-weight:800;line-height:1.1;font-variant-numeric:tabular-nums}
      .widget-caption{display:block;margin-top:5px;color:#59645b;font-size:13px}
    </style>
    <div class="window-card">
      <h2 class="widget-title">Jours avant les vacances</h2>
      <label class="widget-label" for="holiday-date">Date de départ</label>
      <input class="widget-input" id="holiday-date" type="date">
      <div class="widget-result" aria-live="polite">
        <strong class="widget-number" id="days-left">—</strong>
        <span class="widget-caption" id="days-caption">Choisis la date de tes vacances</span>
      </div>
    </div>
    <script>
      (() => {
        const dateInput = document.getElementById('holiday-date');
        const daysOutput = document.getElementById('days-left');
        const caption = document.getElementById('days-caption');
        dateInput.addEventListener('input', () => {
          if (!dateInput.value) {
            daysOutput.textContent = '—';
            caption.textContent = 'Choisis la date de tes vacances';
            return;
          }
          const [year, month, day] = dateInput.value.split('-').map(Number);
          const target = Date.UTC(year, month - 1, day);
          const now = new Date();
          const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
          const days = Math.ceil((target - today) / 86400000);
          daysOutput.textContent = String(Math.max(days, 0));
          caption.textContent = days > 1 ? 'jours avant les vacances' : days === 1 ? 'jour avant les vacances' : 'C’est le grand jour !';
        });
      })();
    </script>`;

  const createCustomWidgetElement = ({ id, title }) => {
    const widget = document.createElement('article');
    const header = document.createElement('header');
    const titleWrap = document.createElement('div');
    const icon = document.createElement('span');
    const titleGroup = document.createElement('div');
    const heading = document.createElement('h2');
    const meta = document.createElement('p');
    const settingsButton = document.createElement('button');
    const body = document.createElement('div');
    const frame = document.createElement('iframe');
    widget.className = 'widget custom-widget';
    widget.draggable = false;
    widget.dataset.widget = id;
    widget.setAttribute('aria-labelledby', `${id}-title`);
    header.className = 'widget-head';
    titleWrap.className = 'widget-title-wrap';
    icon.className = 'widget-icon custom-widget-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = '✦';
    titleGroup.className = 'custom-widget-title';
    heading.id = `${id}-title`;
    heading.textContent = title;
    meta.className = 'widget-meta';
    meta.textContent = 'Widget personnalisé';
    titleGroup.append(heading, meta);
    settingsButton.type = 'button';
    settingsButton.className = 'widget-menu';
    settingsButton.dataset.settingsButton = '';
    settingsButton.setAttribute('aria-label', `Paramètres de ${title}`);
    settingsButton.setAttribute('aria-expanded', 'false');
    settingsButton.textContent = '•••';
    titleWrap.append(icon, titleGroup);
    header.append(titleWrap, settingsButton);
    body.className = 'widget-body custom-widget-body';
    frame.className = 'custom-widget-frame';
    frame.setAttribute('sandbox', 'allow-scripts');
    frame.setAttribute('referrerpolicy', 'no-referrer');
    frame.setAttribute('loading', 'lazy');
    frame.title = title;
    body.append(frame);
    widget.append(header, body);
    return widget;
  };

  let customWidgets = [];
  try {
    const stored = JSON.parse(localStorage.getItem(customWidgetsStorageKey) || '[]');
    if (Array.isArray(stored)) {
      customWidgets = stored.filter((item) => item && typeof item === 'object'
        && typeof item.id === 'string' && customWidgetPattern.test(item.id)
        && typeof item.title === 'string' && item.title.trim().length > 0 && item.title.length <= 80
        && typeof item.html === 'string' && item.html.trim().length > 0 && item.html.length <= maxCustomWidgetHtmlLength)
        .slice(0, maxCustomWidgets)
        .map((item) => item.title === 'Widget local' && /vacance|cong[eé]s/i.test(item.html)
          && /Mode local/i.test(item.html)
          ? { ...item, title: 'Jours avant les vacances', html: legacyVacationCountdownHtml }
          : item);
    }
  } catch {
    customWidgets = [];
  }
  customWidgets.forEach((item) => container.append(createCustomWidgetElement(item)));

  try {
    const savedWidgets = JSON.parse(localStorage.getItem(addedWidgetsStorageKey) || '[]');
    if (Array.isArray(savedWidgets)) savedWidgets.forEach((id) => {
      if (!optionalWidgetIds.has(id)) return;
      const widget = container.querySelector(`.widget[data-widget="${id}"]`);
      if (widget) widget.hidden = false;
    });
  } catch {}
  const widgets = [...container.querySelectorAll('.widget')].filter((widget) => !widget.hidden);
  const layoutDefaults = {
    schedule: { column: 1, row: 1, width: 12, height: 12 },
    grades: { column: 1, row: 14, width: 6, height: 8 },
    homework: { column: 7, row: 14, width: 6, height: 8 },
    agenda: { column: 1, row: 23, width: 6, height: 8 },
    documents: { column: 7, row: 23, width: 6, height: 8 },
    'grade-trend': { column: 1, row: 32, width: 6, height: 8 },
    'grade-subject-bars': { column: 7, row: 32, width: 6, height: 8 },
    'grade-percentage': { column: 1, row: 41, width: 4, height: 7 },
    'grade-pie': { column: 5, row: 41, width: 8, height: 8 }
  };
  let layouts = Object.fromEntries(widgets.map((widget) => [
    widget.dataset.widget,
    { ...(layoutDefaults[widget.dataset.widget] || { column: 1, row: 32, width: 6, height: 8 }) }
  ]));
  let appearance = { global: {}, widgets: {} };
  let pointerSession = null;
  let toastTimer;
  const scheduleMinimumRows = 6;

  todayLabel.textContent = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long'
  }).format(new Date());

  try {
    const savedOrder = JSON.parse(localStorage.getItem(storageKey) || '[]');
    if (Array.isArray(savedOrder)) savedOrder.forEach((id) => {
      const widget = container.querySelector(`[data-widget="${id}"]`);
      if (widget) container.append(widget);
    });
  } catch {}

  try {
    const savedLayouts = JSON.parse(localStorage.getItem(layoutStorageKey) || '{}');
    if (savedLayouts && typeof savedLayouts === 'object') {
      widgets.forEach((widget) => {
        const saved = savedLayouts[widget.dataset.widget];
        if (!saved || !['column', 'row', 'width', 'height'].every((key) => Number.isInteger(saved[key]))) return;
        const isSchedule = widget.dataset.widget === 'schedule';
        const minWidth = isSchedule ? 6 : 3;
        const width = Math.min(12, Math.max(minWidth, saved.width));
        layouts[widget.dataset.widget] = {
          column: isSchedule ? 1 : Math.min(13 - width, Math.max(1, saved.column)),
          row: isSchedule ? 1 : Math.min(200, Math.max(1, saved.row)),
          width,
          height: isSchedule ? Math.min(30, Math.max(scheduleMinimumRows, saved.height)) : Math.min(30, Math.max(4, saved.height))
        };
      });
    }
  } catch {}

  try {
    const savedAppearance = JSON.parse(localStorage.getItem(appearanceKey) || '{}');
    if (savedAppearance && typeof savedAppearance === 'object') {
      appearance = {
        global: savedAppearance.global && typeof savedAppearance.global === 'object' ? savedAppearance.global : {},
        widgets: savedAppearance.widgets && typeof savedAppearance.widgets === 'object' ? savedAppearance.widgets : {}
      };
    }
  } catch {}

  const announce = (message) => {
    toast.textContent = message;
    toast.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('visible'), 2200);
  };

  const installButton = document.getElementById('install-app');
  let installPrompt = null;
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  installButton.hidden = Boolean(isStandalone);

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    installPrompt = event;
  });
  installButton.addEventListener('click', async () => {
    if (!installPrompt) {
      announce('Dans Chrome ou Edge, ouvre le menu ⋮ puis « Installer Mon espace ».');
      return;
    }

    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    installPrompt = null;
    announce(outcome === 'accepted' ? 'Mon espace a été installé.' : 'Installation annulée.');
  });
  window.addEventListener('appinstalled', () => {
    installPrompt = null;
    installButton.hidden = true;
    announce('Mon espace est installé sur cet appareil.');
  });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js').catch((error) => {
      console.error('Impossible de préparer l’installation de Mon espace.', error);
    });
  }

  const formatDate = (value, options = { day: 'numeric', month: 'short' }) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Date inconnue' : new Intl.DateTimeFormat('fr-FR', options).format(date);
  };

  const setConnectionBadge = (message, connected) => {
    const dot = connectionBadge.querySelector('span') || document.createElement('span');
    connectionBadge.replaceChildren(dot, document.createTextNode(message));
    connectionBadge.classList.toggle('is-connected', connected);
  };

  const renderPronoteData = (data) => {
    const grades = Array.isArray(data.grades) ? data.grades : [];
    const homework = Array.isArray(data.homework) ? data.homework : [];
    const lessons = Array.isArray(data.lessons) ? data.lessons : [];

    pageTitle.textContent = data.studentName ? `Bonjour, ${data.studentName}` : 'Bonjour';
    gradeSummaryLabel.textContent = 'Moyenne générale';
    gradeSummaryValue.textContent = data.overallAverage ? `${data.overallAverage} / 20` : 'Non publiée';
    gradesPeriod.textContent = `${data.periodName || 'Période Pronote'} · ${grades.length} note${grades.length === 1 ? '' : 's'}`;
    scheduleMeta.textContent = data.weekStart && data.weekEnd
      ? `Semaine du ${formatDate(data.weekStart, { day: 'numeric', month: 'short' })} au ${formatDate(data.weekEnd, { day: 'numeric', month: 'short' })}`
      : 'Cours Pronote';
    gradeList.replaceChildren();
    gradeList.classList.add('is-live-data');
    grades.forEach((grade) => {
      const row = document.createElement('div');
      const subject = document.createElement('span');
      const date = document.createElement('span');
      const value = document.createElement('span');
      row.className = 'grade-row';
      subject.className = 'subject';
      subject.textContent = grade.subject || 'Matière';
      date.className = 'grade-kind';
      date.textContent = grade.date ? formatDate(grade.date) : '';
      value.className = 'grade-value';
      value.textContent = `${grade.value || '—'} / ${grade.outOf || '20'}`;
      row.append(subject, date, value);
      gradeList.append(row);
    });
    if (!grades.length) gradeList.textContent = 'Aucune note pour cette période.';

    homeworkMeta.textContent = `${homework.length} devoir${homework.length === 1 ? '' : 's'} récupéré${homework.length === 1 ? '' : 's'}`;
    homeworkList.replaceChildren();
    homeworkList.classList.add('is-live-data');
    homework.forEach((item) => {
      const row = document.createElement('div');
      const status = document.createElement('input');
      const copy = document.createElement('span');
      const name = document.createElement('span');
      const subject = document.createElement('span');
      const due = document.createElement('span');
      row.className = 'task';
      status.className = 'task-check';
      status.type = 'checkbox';
      status.checked = item.done;
      status.disabled = true;
      status.setAttribute('aria-label', item.done ? 'Devoir terminé' : 'Devoir à faire');
      copy.className = 'task-copy';
      name.className = 'task-name';
      name.textContent = item.description || 'Devoir sans description';
      subject.className = 'task-subject';
      subject.textContent = item.subject || 'Matière';
      copy.append(name, subject);
      due.className = item.done ? 'due soon' : 'due';
      due.textContent = item.date ? formatDate(item.date, { weekday: 'short', day: 'numeric', month: 'short' }) : 'À venir';
      row.append(status, copy, due);
      homeworkList.append(row);
    });
    if (!homework.length) homeworkList.textContent = 'Aucun devoir pour cette semaine.';

    demoScheduleWeek.hidden = true;
    demoScheduleGrid.hidden = true;
    realSchedule.replaceChildren();
    realSchedule.hidden = false;
    realSchedule.classList.add('is-timetable');
    lessons.sort((first, second) => new Date(first.start) - new Date(second.start));
    const datedLessons = lessons.map((lesson) => ({
      lesson,
      start: new Date(lesson.start),
      end: new Date(lesson.end)
    })).filter(({ start, end }) => !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()));
    const hasWeekendLessons = datedLessons.some(({ start }) => start.getDay() === 0 || start.getDay() === 6);
    const dayCount = hasWeekendLessons ? 7 : 5;
    const visibleLessons = datedLessons.filter(({ start }) => {
      const weekday = (start.getDay() + 6) % 7;
      return weekday < dayCount;
    });

    if (!visibleLessons.length) {
      realSchedule.textContent = 'Aucun cours trouvé cette semaine.';
    } else {
      const weekStart = new Date(`${data.weekStart}T00:00:00`);
      const firstHour = Math.max(0, Math.min(...visibleLessons.map(({ start }) => start.getHours())));
      const lastMinute = Math.max(...visibleLessons.map(({ end }) => end.getHours() * 60 + end.getMinutes()));
      const slotCount = Math.max(2, Math.ceil((lastMinute - firstHour * 60) / 30));
      const daysHeader = document.createElement('div');
      const timeGrid = document.createElement('div');
      daysHeader.className = 'week real-week';
      timeGrid.className = 'time-grid real-time-grid';
      daysHeader.style.gridTemplateColumns = `38px repeat(${dayCount}, minmax(0, 1fr))`;
      timeGrid.style.gridTemplateColumns = `38px repeat(${dayCount}, minmax(0, 1fr))`;
      timeGrid.style.gridTemplateRows = `repeat(${slotCount}, minmax(16px, auto))`;
      daysHeader.append(document.createElement('span'));

      for (let dayIndex = 0; dayIndex < dayCount; dayIndex += 1) {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + dayIndex);
        const heading = document.createElement('span');
        heading.className = 'day';
        if (date.toDateString() === new Date().toDateString()) heading.classList.add('today-col');
        heading.textContent = formatDate(date, { weekday: 'short', day: 'numeric' });
        daysHeader.append(heading);
      }

      for (let slot = 0; slot < slotCount; slot += 1) {
        if (slot % 2 !== 0) continue;
        const hourLabel = document.createElement('span');
        hourLabel.className = 'time real-time-label';
        hourLabel.style.gridColumn = '1';
        hourLabel.style.gridRow = `${slot + 1} / span 2`;
        hourLabel.textContent = `${String(firstHour + slot / 2).padStart(2, '0')}h`;
        timeGrid.append(hourLabel);
      }

      visibleLessons.forEach(({ lesson, start, end }) => {
        const dayIndex = (start.getDay() + 6) % 7;
        const startMinutes = start.getHours() * 60 + start.getMinutes();
        const endMinutes = Math.max(startMinutes + 30, end.getHours() * 60 + end.getMinutes());
        const startSlot = Math.max(0, Math.floor((startMinutes - firstHour * 60) / 30));
        const endSlot = Math.max(startSlot + 1, Math.ceil((endMinutes - firstHour * 60) / 30));
        const row = document.createElement('article');
        const time = document.createElement('span');
        const subject = document.createElement('strong');
        const details = document.createElement('span');
        const colorIndex = subjectColorIndex(lesson.subject);
        row.className = `lesson real-lesson real-color-${colorIndex}${lesson.canceled ? ' is-canceled' : ''}`;
        row.style.gridColumn = String(dayIndex + 2);
        row.style.gridRow = `${startSlot + 1} / span ${endSlot - startSlot}`;
        time.className = 'lesson-time';
        time.textContent = `${formatDate(start, { hour: '2-digit', minute: '2-digit' })}–${formatDate(end, { hour: '2-digit', minute: '2-digit' })}`;
        subject.textContent = lesson.subject || 'Cours';
        details.textContent = [lesson.teacher, lesson.classroom, lesson.canceled ? 'Annulé' : ''].filter(Boolean).join(' · ');
        row.append(time, subject, details);
        timeGrid.append(row);
      });
      realSchedule.append(daysHeader, timeGrid);
    }
  };

  const chartColors = ['#426c91', '#b86a3f', '#2f654c', '#8a7198', '#b38b2e', '#6688a1', '#b6748b', '#718b48', '#8a795f'];
  const subjectColorIndex = (subject) => [...String(subject || 'Cours').toLocaleLowerCase('fr-FR')]
    .reduce((sum, character) => sum + character.charCodeAt(0), 0) % chartColors.length;
  const svgNamespace = 'http://www.w3.org/2000/svg';
  const svgElement = (name, attributes = {}) => {
    const element = document.createElementNS(svgNamespace, name);
    Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, String(value)));
    return element;
  };
  const showChartMessage = (body, message) => {
    body.replaceChildren();
    const text = document.createElement('p');
    text.className = 'chart-empty';
    text.textContent = message;
    body.append(text);
  };
  const subjectAverages = (grades) => {
    const subjects = new Map();
    grades.forEach((grade) => {
      const score = scoreOnTwenty(grade);
      if (score === null) return;
      const subject = grade.subject || 'Autre';
      const current = subjects.get(subject) || { total: 0, count: 0 };
      current.total += score;
      current.count += 1;
      subjects.set(subject, current);
    });
    return [...subjects].map(([subject, values]) => ({ subject, average: values.total / values.count, count: values.count }));
  };

  const renderStatistics = () => {
    const bodies = {
      trend: document.getElementById('grade-trend-body'),
      bars: document.getElementById('grade-subject-bars-body'),
      percentage: document.getElementById('grade-percentage-body'),
      pie: document.getElementById('grade-pie-body')
    };
    const allBodies = Object.values(bodies);
    if (!pronoteData) {
      allBodies.forEach((body) => showChartMessage(body, 'Connecte-toi à Pronote pour afficher tes statistiques.'));
      return;
    }

    const grades = Array.isArray(pronoteData.grades) ? pronoteData.grades : [];
    const validGrades = grades.filter((grade) => scoreOnTwenty(grade) !== null);
    if (!validGrades.length) {
      allBodies.forEach((body) => showChartMessage(body, 'Aucune note exploitable pour cette statistique.'));
      return;
    }

    const trendAverages = weeklyGradeAverages(validGrades).slice(-12);
    if (trendAverages.length < 2) {
      showChartMessage(bodies.trend, 'Il faut au moins deux périodes pour tracer l’évolution des moyennes.');
    } else {
      const svg = svgElement('svg', { viewBox: '0 0 420 190', role: 'img', 'aria-label': 'Évolution des moyennes sur 20' });
      [20, 10, 0].forEach((value) => {
        const y = 18 + (20 - value) * 6.4;
        svg.append(svgElement('line', { x1: 34, y1: y, x2: 410, y2: y, class: 'chart-grid-line' }));
        const label = svgElement('text', { x: 4, y: y + 3, class: 'chart-axis-label' });
        label.textContent = String(value);
        svg.append(label);
      });
      const points = trendAverages.map((period, index) => {
        const x = 38 + index * (360 / (trendAverages.length - 1));
        const y = 18 + (20 - period.average) * 6.4;
        return { x, y, period };
      });
      svg.append(svgElement('polyline', {
        points: points.map(({ x, y }) => `${x},${y}`).join(' '),
        fill: 'none', stroke: '#2f654c', 'stroke-width': 3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round'
      }));
      points.forEach(({ x, y, period }) => {
        const point = svgElement('circle', { cx: x, cy: y, r: 4, fill: '#ffffff', stroke: '#2f654c', 'stroke-width': 2 });
        const title = svgElement('title');
        const periodDate = new Date(`${period.start}T12:00:00`);
        title.textContent = `Moyenne du ${formatDate(periodDate)} : ${period.average.toFixed(1).replace('.', ',')} / 20`;
        point.append(title);
        svg.append(point);
        const dateLabel = svgElement('text', { x, y: 174, class: 'chart-axis-label', 'text-anchor': 'middle' });
        dateLabel.textContent = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'numeric' }).format(periodDate);
        svg.append(dateLabel);
      });
      svg.classList.add('chart-svg');
      bodies.trend.replaceChildren(svg);
    }

    const averages = subjectAverages(validGrades).sort((first, second) => second.average - first.average).slice(0, 7);
    if (!averages.length) {
      showChartMessage(bodies.bars, 'Aucune moyenne par matière disponible.');
      showChartMessage(bodies.pie, 'Aucune matière disponible.');
    } else {
      const bars = document.createElement('div');
      bars.className = 'chart-bars';
      averages.forEach((item, index) => {
        const row = document.createElement('div');
        const label = document.createElement('span');
        const track = document.createElement('span');
        const fill = document.createElement('span');
        const value = document.createElement('span');
        row.className = 'chart-bar-row';
        label.className = 'chart-bar-label';
        label.textContent = item.subject;
        track.className = 'chart-bar-track';
        fill.className = 'chart-bar-fill';
        fill.style.width = `${Math.max(0, Math.min(100, item.average / 20 * 100))}%`;
        fill.style.backgroundColor = chartColors[subjectColorIndex(item.subject)];
        track.append(fill);
        value.className = 'chart-bar-value';
        value.textContent = `${item.average.toFixed(1).replace('.', ',')}/20`;
        row.append(label, track, value);
        bars.append(row);
      });
      bodies.bars.replaceChildren(bars);

      const total = averages.reduce((sum, item) => sum + item.count, 0);
      const circumference = 2 * Math.PI * 43;
      let offset = 0;
      const pieSvg = svgElement('svg', { viewBox: '0 0 110 110', role: 'img', 'aria-label': 'Répartition des notes par matière' });
      averages.forEach((item, index) => {
        const segment = item.count / total * circumference;
        pieSvg.append(svgElement('circle', {
          cx: 55, cy: 55, r: 43, fill: 'none', stroke: chartColors[subjectColorIndex(item.subject)], 'stroke-width': 20,
          'stroke-dasharray': `${segment} ${circumference - segment}`, 'stroke-dashoffset': -offset,
          transform: 'rotate(-90 55 55)'
        }));
        offset += segment;
      });
      pieSvg.classList.add('pie-chart');
      const legend = document.createElement('div');
      legend.className = 'pie-legend';
      averages.forEach((item, index) => {
        const row = document.createElement('div');
        const swatch = document.createElement('span');
        const label = document.createElement('span');
        row.className = 'pie-legend-item';
        swatch.className = 'pie-legend-swatch';
        swatch.style.backgroundColor = chartColors[subjectColorIndex(item.subject)];
        label.textContent = `${item.subject} · ${item.count}`;
        row.append(swatch, label);
        legend.append(row);
      });
      const pieLayout = document.createElement('div');
      pieLayout.className = 'pie-layout';
      pieLayout.append(pieSvg, legend);
      bodies.pie.replaceChildren(pieLayout);
    }

    const average = Number(String(pronoteData.overallAverage || '').replace(',', '.'));
    if (!Number.isFinite(average) || average < 0) {
      showChartMessage(bodies.percentage, 'La moyenne générale n’est pas publiée.');
    } else {
      const percentage = Math.max(0, Math.min(100, average / 20 * 100));
      const display = document.createElement('div');
      const value = document.createElement('strong');
      const track = document.createElement('div');
      const fill = document.createElement('div');
      const caption = document.createElement('span');
      display.className = 'percentage-stat';
      value.textContent = `${Math.round(percentage)} %`;
      track.className = 'percentage-track';
      fill.className = 'percentage-fill';
      fill.style.width = `${percentage}%`;
      track.append(fill);
      caption.className = 'percentage-caption';
      caption.textContent = `${average.toString().replace('.', ',')} sur 20`;
      display.append(value, track, caption);
      bodies.percentage.replaceChildren(display);
    }
  };

  const clearPronoteData = () => {
    pronoteData = null;
    pageTitle.textContent = demoPageTitle;
    gradeSummaryLabel.textContent = demoGradeLabel;
    gradeSummaryValue.innerHTML = demoGradeValue;
    gradesPeriod.textContent = demoGradesPeriod;
    scheduleMeta.textContent = demoScheduleMeta;
    gradeList.innerHTML = demoGradeMarkup;
    gradeList.classList.remove('is-live-data');
    homeworkMeta.textContent = demoHomeworkMeta;
    homeworkList.innerHTML = demoHomeworkMarkup;
    homeworkList.classList.remove('is-live-data');
    renderStatistics();
    demoScheduleWeek.hidden = false;
    demoScheduleGrid.hidden = false;
    realSchedule.replaceChildren();
    realSchedule.hidden = true;
    realSchedule.classList.remove('is-timetable');
    setConnectionBadge('Données de démonstration', false);
    openLogin.hidden = false;
    disconnectButton.hidden = true;
    loginForm.reset();
  };

  openLogin.addEventListener('click', () => loginDialog.showModal());
  document.getElementById('close-login').addEventListener('click', () => loginDialog.close());
  document.getElementById('cancel-login').addEventListener('click', () => loginDialog.close());
  loginDialog.addEventListener('close', () => {
    loginForm.reset();
    loginStatus.textContent = '';
    loginStatus.classList.remove('is-error');
  });

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const credentials = {
      url: loginForm.elements.url.value,
      username: loginForm.elements.username.value,
      password: loginForm.elements.password.value,
      entProvider: loginForm.elements.entProvider.value
    };
    let requestBody = JSON.stringify(credentials);
    credentials.url = '';
    credentials.username = '';
    credentials.password = '';
    credentials.entProvider = '';
    loginForm.reset();
    submitLogin.disabled = true;
    loginStatus.classList.remove('is-error');
    loginStatus.textContent = 'Connexion en cours…';

    try {
      const response = await fetch('/api/pronote-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: requestBody,
        cache: 'no-store',
        credentials: 'same-origin'
      });
      requestBody = '';
      const result = await readApiResponse(response, 'Connexion Pronote impossible.');
      pronoteData = result;
      pronoteData.grades.sort((first, second) => Date.parse(second.date) - Date.parse(first.date));
      renderPronoteData(pronoteData);
      renderStatistics();
      setConnectionBadge('Données Pronote · en mémoire', true);
      openLogin.hidden = true;
      disconnectButton.hidden = false;
      loginDialog.close();
      announce('Les données Pronote ont été chargées.');
    } catch (error) {
      loginStatus.textContent = error.message || 'Connexion Pronote impossible.';
      loginStatus.classList.add('is-error');
    } finally {
      requestBody = '';
      loginForm.reset();
      submitLogin.disabled = false;
      credentials.url = '';
      credentials.username = '';
      credentials.password = '';
      credentials.entProvider = '';
    }
  });

  disconnectButton.addEventListener('click', () => {
    clearPronoteData();
    announce('Les données ont été effacées de la page.');
  });
  window.addEventListener('pagehide', clearPronoteData);

  const applyGridLayout = (widget) => {
    const layout = layouts[widget.dataset.widget];
    widget.style.gridColumn = `${layout.column} / span ${layout.width}`;
    widget.style.gridRow = `${layout.row} / span ${layout.height}`;
  };

  const saveLayout = () => {
    try {
      localStorage.setItem(layoutStorageKey, JSON.stringify(layouts));
    } catch {
      announce('La disposition ne peut pas être enregistrée sur cet appareil.');
    }
  };

  const overlaps = (first, second) => {
    const a = layouts[first];
    const b = layouts[second];
    return a.column < b.column + b.width && a.column + a.width > b.column
      && a.row < b.row + b.height && a.row + a.height > b.row;
  };

  const resolveCollisions = (activeId) => {
    const remaining = widgets
      .filter((widget) => widget.dataset.widget !== activeId)
      .sort((first, second) => layouts[first.dataset.widget].row - layouts[second.dataset.widget].row
        || layouts[first.dataset.widget].column - layouts[second.dataset.widget].column);
    const placed = [activeId];

    remaining.forEach((widget) => {
      const id = widget.dataset.widget;
      let collisions = placed.filter((placedId) => overlaps(id, placedId));
      let attempts = 0;
      while (collisions.length && attempts < widgets.length) {
        layouts[id].row = Math.max(...collisions.map((placedId) => {
          const layout = layouts[placedId];
          return layout.row + layout.height;
        }));
        collisions = placed.filter((placedId) => overlaps(id, placedId));
        attempts += 1;
      }
      placed.push(id);
    });
    widgets.forEach(applyGridLayout);
  };

  widgets.forEach(applyGridLayout);

  window.addEventListener('message', (event) => {
    const message = event.data;
    if (!message || message.type !== 'pronote-widget-size' || !Number.isInteger(message.height)) return;
    const frames = [...container.querySelectorAll('iframe'), aiWidgetPreviewFrame];
    const frame = frames.find((candidate) => candidate.contentWindow === event.source);
    if (!frame) return;

    const height = Math.min(900, Math.max(180, message.height));
    frame.style.height = `${height}px`;
    const widget = frame.closest('.custom-widget');
    const layout = widget && layouts[widget.dataset.widget];
    if (!layout) return;

    const requiredRows = Math.min(30, Math.max(layout.height, Math.ceil((height + 90) / 36)));
    if (requiredRows === layout.height) return;
    layout.height = requiredRows;
    resolveCollisions(widget.dataset.widget);
    saveLayout();
  });

  const saveAppearance = () => {
    try {
      localStorage.setItem(appearanceKey, JSON.stringify(appearance));
    } catch {
      announce('Les réglages ne peuvent pas être enregistrés sur cet appareil.');
    }
  };

  const createField = (labelText, control) => {
    const label = document.createElement('label');
    const caption = document.createElement('span');
    label.className = 'setting-field';
    caption.textContent = labelText;
    label.append(caption, control);
    return label;
  };

  const createImageInput = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.className = 'setting-file';
    return input;
  };

  const createResetButton = (text) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'setting-reset';
    button.textContent = text;
    return button;
  };

  const safeColor = (color) => typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color);
  const safeImage = (image) => typeof image === 'string' && /^data:image\/jpeg;base64,[a-z0-9+/]+=*$/i.test(image);

  const applyWidgetAppearance = (widget) => {
    const settings = appearance.widgets[widget.dataset.widget] || {};
    widget.style.backgroundColor = safeColor(settings.color) ? settings.color : '';
    if (safeImage(settings.image)) {
      widget.classList.add('has-background-image');
      widget.style.backgroundImage = `linear-gradient(rgb(255 255 255 / 74%), rgb(255 255 255 / 74%)), url("${settings.image}")`;
    } else {
      widget.classList.remove('has-background-image');
      widget.style.backgroundImage = '';
    }
  };

  const applyGlobalBackground = () => {
    if (safeImage(appearance.global.image)) {
      document.body.style.backgroundImage = `linear-gradient(rgb(244 245 242 / 48%), rgb(244 245 242 / 48%)), url("${appearance.global.image}")`;
      document.body.style.backgroundPosition = 'center';
      document.body.style.backgroundRepeat = 'no-repeat';
      document.body.style.backgroundSize = 'cover';
      document.body.style.backgroundAttachment = 'fixed';
    } else {
      document.body.style.backgroundImage = '';
      document.body.style.backgroundPosition = '';
      document.body.style.backgroundRepeat = '';
      document.body.style.backgroundSize = '';
      document.body.style.backgroundAttachment = '';
    }
  };

  const resizeImage = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Impossible de lire cette image.'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('Ce fichier image ne peut pas être utilisé.'));
      image.onload = () => {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) {
          reject(new Error('Le traitement de cette image a échoué.'));
          return;
        }

        let scale = Math.min(1, 1200 / Math.max(image.width, image.height));
        for (let attempt = 0; attempt < 8; attempt += 1) {
          canvas.width = Math.max(1, Math.round(image.width * scale));
          canvas.height = Math.max(1, Math.round(image.height * scale));
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          const compressed = canvas.toDataURL('image/jpeg', Math.max(.45, .78 - attempt * .05));
          if (compressed.length <= maxImageLength) {
            resolve(compressed);
            return;
          }
          scale *= .78;
        }
        reject(new Error('Cette image est trop volumineuse pour être enregistrée.'));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });

  const bindImageInput = (input, onImageReady) => {
    input.addEventListener('change', async () => {
      const file = input.files[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        announce('Choisis un fichier image.');
        input.value = '';
        return;
      }
      try {
        onImageReady(await resizeImage(file));
        saveAppearance();
        announce('Image de fond mise à jour.');
      } catch (error) {
        announce(error.message);
      }
      input.value = '';
    });
  };

  const settingsPanels = [];
  const initializeWidget = (widget) => {
    const storedSettings = appearance.widgets[widget.dataset.widget];
    const settings = storedSettings && typeof storedSettings === 'object' ? storedSettings : {};
    appearance.widgets[widget.dataset.widget] = settings;
    const button = widget.querySelector('[data-settings-button]');
    const panel = document.createElement('div');
    const colorInput = document.createElement('input');
    const imageInput = createImageInput();
    const resetButton = createResetButton('Réinitialiser le bloc');
    const resizeHandle = document.createElement('button');
    panel.id = `${widget.dataset.widget}-settings`;
    panel.className = 'widget-settings';
    panel.hidden = true;
    panel.setAttribute('role', 'group');
    panel.setAttribute('aria-label', `Réglages de ${widget.querySelector('h2').textContent}`);
    colorInput.type = 'color';
    colorInput.className = 'setting-color';
    colorInput.value = safeColor(settings.color) ? settings.color : '#ffffff';
    panel.append(
      createField('Couleur de fond', colorInput),
      createField('Image de fond', imageInput),
      resetButton
    );
    if (widget.classList.contains('custom-widget')) {
      const removeButton = createResetButton('Supprimer ce widget');
      panel.append(removeButton);
      removeButton.addEventListener('click', () => {
        const id = widget.dataset.widget;
        customWidgets = customWidgets.filter((item) => item.id !== id);
        widgets.splice(widgets.indexOf(widget), 1);
        settingsPanels.splice(settingsPanels.findIndex((item) => item.button === button), 1);
        delete layouts[id];
        delete appearance.widgets[id];
        widget.remove();
        saveLayout();
        saveAppearance();
        if (!saveCustomWidgets()) announce('Le widget a été supprimé, mais sa suppression ne peut pas être mémorisée.');
        else announce('Widget supprimé.');
      });
    }
    widget.querySelector('.widget-body').before(panel);
    resizeHandle.type = 'button';
    resizeHandle.className = 'widget-resize';
    resizeHandle.setAttribute('aria-label', `Redimensionner ${widget.querySelector('h2').textContent}`);
    resizeHandle.title = 'Redimensionner par cases';
    resizeHandle.innerHTML = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><path d="M17 7v10H7M17 12l-5 5M17 3v1M13 3v1M9 3v1M3 17h1M3 13h1M3 9h1"/></svg>';
    widget.append(resizeHandle);
    resizeHandle.addEventListener('keydown', (event) => {
      if (editButton.getAttribute('aria-pressed') !== 'true') return;
      const delta = event.shiftKey ? 2 : 1;
      const layout = layouts[widget.dataset.widget];
      const isSchedule = widget.dataset.widget === 'schedule';
      if (event.key === 'ArrowRight') layout.width = Math.min(12, layout.width + delta);
      else if (event.key === 'ArrowLeft') layout.width = Math.max(isSchedule ? 6 : 3, layout.width - delta);
      else if (event.key === 'ArrowDown') layout.height = Math.min(30, layout.height + delta);
      else if (event.key === 'ArrowUp') layout.height = Math.max(isSchedule ? scheduleMinimumRows : 4, layout.height - delta);
      else return;
      layout.column = isSchedule ? 1 : Math.min(layout.column, 13 - layout.width);
      event.preventDefault();
      resolveCollisions(widget.dataset.widget);
      saveLayout();
    });
    button.setAttribute('aria-controls', panel.id);
    settingsPanels.push({ button, panel });
    applyWidgetAppearance(widget);

    colorInput.addEventListener('input', () => {
      settings.color = colorInput.value;
      applyWidgetAppearance(widget);
    });
    colorInput.addEventListener('change', saveAppearance);
    bindImageInput(imageInput, (image) => {
      settings.image = image;
      applyWidgetAppearance(widget);
    });
    resetButton.addEventListener('click', () => {
      delete settings.color;
      delete settings.image;
      colorInput.value = '#ffffff';
      applyWidgetAppearance(widget);
      saveAppearance();
      announce('Réglages du bloc réinitialisés.');
    });

  };
  widgets.forEach(initializeWidget);

  container.addEventListener('click', (event) => {
    const button = event.target.closest('[data-settings-button]');
    if (!button) return;
    const panel = settingsPanels.find((item) => item.button === button)?.panel;
    if (!panel) return;
    const open = panel.hidden;
    settingsPanels.forEach((item) => {
      item.panel.hidden = true;
      item.button.setAttribute('aria-expanded', 'false');
    });
    globalBackgroundPanel.hidden = true;
    globalBackgroundButton.setAttribute('aria-expanded', 'false');
    panel.hidden = !open;
    button.setAttribute('aria-expanded', String(open));
  });

  const globalImageInput = createImageInput();
  const globalResetButton = createResetButton('Retirer le fond global');
  globalBackgroundPanel.append(
    createField('Image de fond globale', globalImageInput),
    globalResetButton
  );
  applyGlobalBackground();
  bindImageInput(globalImageInput, (image) => {
    appearance.global.image = image;
    applyGlobalBackground();
  });
  globalResetButton.addEventListener('click', () => {
    delete appearance.global.image;
    applyGlobalBackground();
    saveAppearance();
    announce('Fond global retiré.');
  });

  globalBackgroundButton.addEventListener('click', () => {
    const open = globalBackgroundPanel.hidden;
    settingsPanels.forEach((item) => {
      item.panel.hidden = true;
      item.button.setAttribute('aria-expanded', 'false');
    });
    globalBackgroundPanel.hidden = !open;
    globalBackgroundButton.setAttribute('aria-expanded', String(open));
  });

  let activeWidgetCategory = 'all';

  const filterWidgetOptions = () => {
    const query = widgetLibrarySearch.value.trim().toLowerCase();
    const categoryLabels = { notes: 'notes', progression: 'progression', matiere: 'matières' };
    let visibleCount = 0;
    widgetOptions.forEach((option) => {
      const category = option.dataset.category || 'all';
      const matchesCategory = activeWidgetCategory === 'all' || category === activeWidgetCategory;
      const searchableText = `${option.textContent} ${categoryLabels[category] || ''}`.toLowerCase();
      const matchesQuery = !query || searchableText.includes(query);
      const visible = matchesCategory && matchesQuery;
      option.hidden = !visible;
      if (visible) visibleCount += 1;
    });
    widgetLibraryEmpty.hidden = visibleCount !== 0;
  };

  widgetCategoryButtons.forEach((button) => {
    button.addEventListener('click', () => {
      activeWidgetCategory = button.dataset.widgetCategory || 'all';
      widgetCategoryButtons.forEach((item) => {
        const isActive = item === button;
        item.classList.toggle('is-active', isActive);
        item.setAttribute('aria-pressed', String(isActive));
      });
      filterWidgetOptions();
    });
  });

  widgetLibrarySearch.addEventListener('input', filterWidgetOptions);
  widgetLibrary.addEventListener('close', () => {
    widgetLibrarySearch.value = '';
    activeWidgetCategory = 'all';
    widgetCategoryButtons.forEach((item) => {
      const isActive = item.dataset.widgetCategory === 'all';
      item.classList.toggle('is-active', isActive);
      item.setAttribute('aria-pressed', String(isActive));
    });
    filterWidgetOptions();
  });
  document.getElementById('close-widget-library').addEventListener('click', () => widgetLibrary.close());
  openWidgetLibrary.addEventListener('click', () => {
    widgetLibrary.showModal();
    widgetLibrarySearch.focus();
    filterWidgetOptions();
  });
  let draftWidget = null;
  let draftPreviewUrl = '';
  const resetAiWidgetComposer = () => {
    aiWidgetForm.reset();
    aiWidgetCodeFields.hidden = true;
    aiWidgetPrompt.required = true;
    aiWidgetCode.required = false;
    aiWidgetPromptLabel.textContent = 'Ton idée';
    aiWidgetPrompt.placeholder = 'Ex. : un compte à rebours jusqu’aux prochaines vacances, avec un fond bleu nuit…';
    aiWidgetPreview.hidden = true;
    aiWidgetPreviewTitle.textContent = '';
    aiWidgetPreviewFrame.removeAttribute('src');
    addAiWidgetButton.hidden = true;
    generateWidgetButton.textContent = 'Créer un aperçu';
    aiWidgetNotice.textContent = 'L’aperçu est privé jusqu’à ce que tu choisisses de l’ajouter. Tu peux demander autant d’ajustements que nécessaire.';
    aiWidgetNotice.classList.remove('is-error');
    draftWidget = null;
    draftPreviewUrl = '';
  };
  document.getElementById('create-ai-widget').addEventListener('click', () => {
    resetAiWidgetComposer();
    aiWidgetDialog.showModal();
  });
  document.getElementById('close-ai-widget').addEventListener('click', () => aiWidgetDialog.close());
  document.getElementById('cancel-ai-widget').addEventListener('click', () => aiWidgetDialog.close());
  aiWidgetDeveloperMode.addEventListener('change', () => {
    aiWidgetCodeFields.hidden = !aiWidgetDeveloperMode.checked;
    aiWidgetCode.required = aiWidgetDeveloperMode.checked;
    aiWidgetPrompt.required = !aiWidgetDeveloperMode.checked;
    draftWidget = null;
    draftPreviewUrl = '';
    aiWidgetPreview.hidden = true;
    aiWidgetPreviewFrame.removeAttribute('src');
    addAiWidgetButton.hidden = true;
    aiWidgetPromptLabel.textContent = 'Ton idée';
    generateWidgetButton.textContent = aiWidgetDeveloperMode.checked ? 'Prévisualiser le code' : 'Créer un aperçu';
  });
  aiWidgetDialog.addEventListener('close', resetAiWidgetComposer);
  aiWidgetDialog.addEventListener('click', (event) => {
    if (event.target === aiWidgetDialog) aiWidgetDialog.close();
  });
  const createWidgetPreview = async (html) => {
    const response = await fetch('/api/widget-preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ html }),
      cache: 'no-store',
      credentials: 'same-origin'
    });
    const result = await readApiResponse(response, 'Impossible de prévisualiser ce widget.');
    if (typeof result.url !== 'string' || !result.url.startsWith('/widget-preview/')) {
      throw new Error('Le serveur n’a pas renvoyé de lien d’aperçu valide.');
    }
    return result.url;
  };

  const saveCustomWidgets = () => {
    try {
      localStorage.setItem(customWidgetsStorageKey, JSON.stringify(customWidgets));
      return true;
    } catch {
      return false;
    }
  };

  const addCustomWidget = ({ title, html }, previewUrl) => {
    if (customWidgets.length >= maxCustomWidgets) {
      throw new Error(`Tu peux enregistrer au maximum ${maxCustomWidgets} widgets personnalisés.`);
    }
    const item = { id: `custom-${crypto.randomUUID()}`, title, html };
    const widget = createCustomWidgetElement(item);
    widget.querySelector('iframe').src = previewUrl;
    container.append(widget);
    customWidgets.push(item);
    widgets.push(widget);
    layouts[item.id] = { column: 1, row: 32, width: 6, height: 8 };
    initializeWidget(widget);
    resolveCollisions(item.id);
    saveLayout();
    if (!saveCustomWidgets()) announce('Widget ajouté, mais il ne pourra pas être conservé après fermeture du navigateur.');
  };

  aiWidgetForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    generateWidgetButton.disabled = true;
    aiWidgetNotice.classList.remove('is-error');
    const isRefining = Boolean(draftWidget) && !aiWidgetDeveloperMode.checked;
    aiWidgetNotice.textContent = aiWidgetDeveloperMode.checked
      ? 'Préparation de l’aperçu sécurisé…'
      : isRefining ? 'Mise à jour de ton aperçu…' : 'Création de ton premier aperçu…';
    generateWidgetButton.classList.add('is-loading');
    try {
      let generated;
      if (aiWidgetDeveloperMode.checked) {
        generated = { title: draftWidget?.title || 'Widget personnalisé', html: aiWidgetCode.value };
      } else {
        const response = await fetch('/api/generate-widget', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: aiWidgetPrompt.value,
            ...(isRefining ? { previousWidget: draftWidget } : {})
          }),
          cache: 'no-store',
          credentials: 'same-origin'
        });
        const result = await readApiResponse(response, 'La génération du widget a échoué.');
        generated = result;
      }

      const previewUrl = await createWidgetPreview(generated.html);
      const generationUsedFallback = generated.fallback === true;
      const genericFallback = generationUsedFallback && generated.title === 'Mon widget';
      const previousDraftWasKept = isRefining
        && generated.title === draftWidget.title && generated.html === draftWidget.html;
      draftWidget = { title: generated.title, html: generated.html };
      draftPreviewUrl = previewUrl;
      aiWidgetPreviewTitle.textContent = generated.title;
      aiWidgetPreviewFrame.title = `Aperçu : ${generated.title}`;
      aiWidgetPreviewFrame.src = previewUrl;
      aiWidgetPreview.hidden = false;
      addAiWidgetButton.hidden = false;
      if (!aiWidgetDeveloperMode.checked && !genericFallback) {
        aiWidgetPrompt.value = '';
        aiWidgetPromptLabel.textContent = 'Que veux-tu améliorer ?';
        aiWidgetPrompt.placeholder = 'Ex. : affiche le nombre de jours en plus grand et ajoute un champ pour choisir la date…';
        generateWidgetButton.textContent = 'Améliorer l’aperçu';
      }
      if (genericFallback) {
        addAiWidgetButton.hidden = true;
        aiWidgetNotice.textContent = 'Gemini n’a pas pu générer ce widget. Vérifie que le serveur est configuré avec GEMINI_API_KEY et que le modèle est accessible. Cet aperçu générique ne peut pas être ajouté.';
        aiWidgetNotice.classList.add('is-error');
      } else if (customWidgets.length >= maxCustomWidgets) {
        addAiWidgetButton.disabled = true;
        aiWidgetNotice.textContent = `L’aperçu est prêt. Tu as atteint la limite de ${maxCustomWidgets} widgets enregistrés : supprime-en un avant d’ajouter celui-ci.`;
      } else {
        addAiWidgetButton.disabled = false;
        aiWidgetNotice.textContent = generationUsedFallback
          ? 'Le service IA est indisponible. Voici un aperçu de secours utilisable; réessaie plus tard pour obtenir un widget personnalisé.'
          : previousDraftWasKept
            ? 'Le service IA n’a pas pu appliquer cette modification. Ton aperçu précédent est conservé : réessaie avec une autre demande.'
            : isRefining
              ? 'Aperçu mis à jour. Tu peux demander une autre modification ou l’ajouter au tableau de bord.'
              : 'Aperçu prêt. Vérifie-le, demande une modification si besoin, puis ajoute-le quand il te plaît.';
      }
    } catch (error) {
      aiWidgetNotice.textContent = error.message || 'La génération du widget a échoué.';
      aiWidgetNotice.classList.add('is-error');
    } finally {
      generateWidgetButton.disabled = false;
      generateWidgetButton.classList.remove('is-loading');
    }
  });
  addAiWidgetButton.addEventListener('click', () => {
    if (!draftWidget || !draftPreviewUrl) return;
    try {
      addCustomWidget(draftWidget, draftPreviewUrl);
      aiWidgetDialog.close();
      announce('Widget ajouté au tableau de bord.');
    } catch (error) {
      aiWidgetNotice.textContent = error.message || 'Impossible d’ajouter le widget.';
      aiWidgetNotice.classList.add('is-error');
    }
  });
  customWidgets.forEach(async (item) => {
    const widget = container.querySelector(`[data-widget="${item.id}"]`);
    try {
      widget.querySelector('iframe').src = await createWidgetPreview(item.html);
    } catch {
      widget.querySelector('.custom-widget-body').textContent = 'Impossible de restaurer l’aperçu. Vérifie que le serveur est en ligne.';
    }
  });
  widgetLibrary.addEventListener('click', (event) => {
    const option = event.target.closest('[data-add-widget]');
    if (!option) return;
    const id = option.dataset.addWidget;
    const widget = container.querySelector(`.widget[data-widget="${id}"]`);
    if (!optionalWidgetIds.has(id) || !widget) return;
    if (widgets.includes(widget)) {
      widgetLibrary.close();
      announce('Ce widget est déjà affiché.');
      return;
    }
    widget.hidden = false;
    widgets.push(widget);
    layouts[id] = { ...layoutDefaults[id] };
    resolveCollisions(id);
    saveLayout();
    try {
      localStorage.setItem(addedWidgetsStorageKey, JSON.stringify(
        widgets.map((item) => item.dataset.widget).filter((widgetId) => optionalWidgetIds.has(widgetId))
      ));
    } catch {
      announce('Le widget est ajouté, mais ne peut pas être mémorisé sur cet appareil.');
    }
    renderStatistics();
    widgetLibrary.close();
    announce('Widget ajouté à ton tableau de bord.');
  });

  document.getElementById('google-connect').addEventListener('click', () => {
    announce('La connexion Google nécessite une configuration OAuth côté serveur.');
  });

  editButton.addEventListener('click', () => {
    const editing = editButton.getAttribute('aria-pressed') !== 'true';
    editButton.setAttribute('aria-pressed', String(editing));
    container.classList.toggle('is-editing', editing);
    const message = window.matchMedia('(max-width: 680px)').matches
      ? 'Les fenêtres restent empilées sur petit écran.'
      : 'Glisse un en-tête pour déplacer une fenêtre. Tire son coin pour changer sa taille.';
    announce(editing ? message : 'Disposition enregistrée.');
  });

  container.addEventListener('pointerdown', (event) => {
    if (editButton.getAttribute('aria-pressed') !== 'true' || window.matchMedia('(max-width: 680px)').matches) return;
    const handle = event.target.closest('.widget-resize');
    const header = event.target.closest('.widget-head');
    const widget = event.target.closest('.widget');
    if (!widget || (!handle && !header) || (widget.dataset.widget === 'schedule' && !handle)) return;
    if (!handle && event.target.closest('button, input, select, textarea, a')) return;
    const layout = layouts[widget.dataset.widget];
    pointerSession = {
      pointerId: event.pointerId,
      widget,
      id: widget.dataset.widget,
      mode: handle ? 'resize' : 'move',
      startX: event.clientX,
      startY: event.clientY,
      startLayout: { ...layout }
    };
    event.preventDefault();
    widget.classList.add('is-dragging');
    container.setPointerCapture(event.pointerId);
  });

  container.addEventListener('pointermove', (event) => {
    if (!pointerSession || event.pointerId !== pointerSession.pointerId) return;
    const style = window.getComputedStyle(container);
    const columnGap = parseFloat(style.columnGap) || 0;
    const rowGap = parseFloat(style.rowGap) || 0;
    const trackWidth = (container.clientWidth - columnGap * 11) / 12;
    const trackHeight = parseFloat(style.gridAutoRows) || 24;
    const deltaColumn = Math.round((event.clientX - pointerSession.startX) / (trackWidth + columnGap));
    const deltaRow = Math.round((event.clientY - pointerSession.startY) / (trackHeight + rowGap));
    const layout = layouts[pointerSession.id];
    const start = pointerSession.startLayout;

    if (pointerSession.mode === 'move') {
      layout.column = Math.min(13 - layout.width, Math.max(1, start.column + deltaColumn));
      layout.row = Math.min(200, Math.max(1, start.row + deltaRow));
    } else {
      const isSchedule = pointerSession.id === 'schedule';
      layout.width = Math.min(12, Math.max(isSchedule ? 6 : 3, start.width + deltaColumn));
      layout.height = Math.min(30, Math.max(isSchedule ? scheduleMinimumRows : 4, start.height + deltaRow));
      layout.column = isSchedule ? 1 : Math.min(start.column, 13 - layout.width);
    }
    applyGridLayout(pointerSession.widget);
  });

  const finishPointerAction = (event) => {
    if (!pointerSession || event.pointerId !== pointerSession.pointerId) return;
    const { widget, id } = pointerSession;
    pointerSession = null;
    widget.classList.remove('is-dragging');
    resolveCollisions(id);
    saveLayout();
  };
  container.addEventListener('pointerup', finishPointerAction);
  container.addEventListener('pointercancel', finishPointerAction);

  container.addEventListener('dragstart', (event) => {
    if (container.classList.contains('is-editing')) event.preventDefault();
  });

  renderStatistics();
})();
