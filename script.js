import { scoreOnTwenty } from './grade-statistics.js';
import './widget-resize.js';

(() => {
  const $ = (id) => document.getElementById(id);
  const apiBase = typeof window.__PRONOTE_API_URL__ === 'string'
    ? window.__PRONOTE_API_URL__.trim().replace(/\/+$/, '') : '';
  const apiUrl = (path) => `${apiBase}${path}`;
  const toast = $('toast');
  let toastTimer;
  const announce = (message) => {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('visible'), 3000);
  };
  const readJson = async (response, fallback) => {
    let body;
    try { body = await response.json(); } catch { throw new Error(`${fallback} (HTTP ${response.status}).`); }
    if (!response.ok) throw new Error(body?.error || `${fallback} (HTTP ${response.status}).`);
    return body;
  };
  const openDialog = (id) => { const dialog = $(id); if (dialog && !dialog.open) dialog.showModal(); };
  const closeDialog = (id) => { const dialog = $(id); if (dialog?.open) dialog.close(); };

  const today = $('today-label');
  if (today) today.textContent = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());

  $('open-login')?.addEventListener('click', () => openDialog('login-dialog'));
  $('close-login')?.addEventListener('click', () => closeDialog('login-dialog'));
  $('cancel-login')?.addEventListener('click', () => closeDialog('login-dialog'));
  $('login-dialog')?.addEventListener('close', () => { $('login-form')?.reset(); if ($('login-status')) $('login-status').textContent = ''; });

  $('login-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const status = $('login-status');
    const submit = $('submit-login');
    const credentials = Object.fromEntries(new FormData(form));
    if (status) { status.classList.remove('is-error'); status.textContent = 'Connexion en cours…'; }
    if (submit) submit.disabled = true;
    try {
      const response = await fetch(apiUrl('/api/pronote-data'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials), cache: 'no-store'
      });
      const data = await readJson(response, 'Connexion Pronote impossible.');
      if ($('page-title')) $('page-title').textContent = data.studentName ? `Bonjour, ${data.studentName}` : 'Bonjour';
      if ($('connection-badge')) $('connection-badge').textContent = 'Données Pronote · en mémoire';
      if ($('grade-summary-value')) $('grade-summary-value').textContent = data.overallAverage ? `${data.overallAverage} / 20` : 'Non publiée';
      if ($('grades-period')) $('grades-period').textContent = `${data.periodName || 'Période Pronote'} · ${(data.grades || []).length} notes`;
      if ($('grade-list')) {
        $('grade-list').replaceChildren(...(data.grades || []).map((grade) => {
          const row = document.createElement('div'); row.className = 'grade-row';
          for (const [cls, text] of [['subject', grade.subject || 'Matière'], ['grade-kind', grade.date || ''], ['grade-value', `${grade.value || '—'} / ${grade.outOf || '20'}`]]) {
            const span = document.createElement('span'); span.className = cls; span.textContent = text; row.append(span);
          }
          return row;
        }));
      }
      const homework = Array.isArray(data.homework) ? data.homework : [];
      if ($('homework-meta')) $('homework-meta').textContent = `${homework.length} devoir${homework.length === 1 ? '' : 's'} à venir`;
      if ($('homework-list')) $('homework-list').replaceChildren(...homework.map((item) => {
        const row = document.createElement('div'); row.className = 'task';
        const statusBox = document.createElement('input');
        statusBox.className = 'task-check'; statusBox.type = 'checkbox';
        statusBox.checked = Boolean(item.done); statusBox.disabled = true;
        statusBox.setAttribute('aria-label', item.done ? 'Devoir terminé' : 'Devoir à faire');
        const copy = document.createElement('span'); copy.className = 'task-copy';
        const name = document.createElement('span'); name.className = 'task-name';
        name.textContent = item.description || 'Devoir sans description';
        const subject = document.createElement('span'); subject.className = 'task-subject';
        subject.textContent = item.subject || 'Matière';
        copy.append(name, subject);
        const due = document.createElement('span'); due.className = item.done ? 'due soon' : 'due';
        due.textContent = item.date || 'À venir';
        row.append(statusBox, copy, due);
        return row;
      }));
      $('open-login').hidden = true;
      if ($('disconnect')) $('disconnect').hidden = false;
      closeDialog('login-dialog'); announce('Les données Pronote ont été chargées.');
    } catch (error) {
      if (status) { status.textContent = error.message; status.classList.add('is-error'); }
    } finally { form.reset(); if (submit) submit.disabled = false; }
  });
  $('disconnect')?.addEventListener('click', () => window.location.reload());

  $('open-widget-library')?.addEventListener('click', () => openDialog('widget-library'));
  $('close-widget-library')?.addEventListener('click', () => closeDialog('widget-library'));
  $('widget-library-search-input')?.addEventListener('input', filterWidgets);
  document.querySelectorAll('.widget-category').forEach((button) => button.addEventListener('click', () => {
    document.querySelectorAll('.widget-category').forEach((item) => {
      const active = item === button; item.classList.toggle('is-active', active); item.setAttribute('aria-pressed', String(active));
    });
    filterWidgets();
  }));
  function filterWidgets() {
    const query = ($('widget-library-search-input')?.value || '').trim().toLowerCase();
    const category = document.querySelector('.widget-category.is-active')?.dataset.widgetCategory || 'all';
    let count = 0;
    document.querySelectorAll('.widget-option').forEach((item) => {
      const visible = (category === 'all' || item.dataset.category === category) && item.textContent.toLowerCase().includes(query);
      item.hidden = !visible; if (visible) count += 1;
    });
    if ($('widget-library-empty')) $('widget-library-empty').hidden = count !== 0;
  }
  $('widget-library')?.addEventListener('click', (event) => {
    const option = event.target.closest('[data-add-widget]'); if (!option) return;
    const widget = document.querySelector(`.widget[data-widget="${option.dataset.addWidget}"]`);
    if (!widget) return;
    widget.hidden = false; closeDialog('widget-library'); announce('Widget ajouté au tableau de bord.');
  });

  $('create-ai-widget')?.addEventListener('click', () => openDialog('ai-widget-dialog'));
  $('close-ai-widget')?.addEventListener('click', () => closeDialog('ai-widget-dialog'));
  $('cancel-ai-widget')?.addEventListener('click', () => closeDialog('ai-widget-dialog'));
  $('ai-widget-developer-mode')?.addEventListener('change', (event) => {
    const enabled = event.currentTarget.checked;
    $('ai-widget-code-fields').hidden = !enabled;
    $('ai-widget-prompt').required = !enabled;
    $('ai-widget-code').required = enabled;
    $('generate-widget').textContent = enabled ? 'Prévisualiser le code' : 'Créer un aperçu';
  });
  $('ai-widget-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = $('generate-widget'); const notice = $('ai-widget-notice');
    const developer = $('ai-widget-developer-mode').checked;
    button.disabled = true; notice.classList.remove('is-error'); notice.textContent = 'Préparation de l’aperçu…';
    try {
      let widget;
      if (developer) widget = { title: 'Widget personnalisé', html: $('ai-widget-code').value };
      else {
        const generated = await readJson(await fetch(apiUrl('/api/generate-widget'), {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: $('ai-widget-prompt').value }), cache: 'no-store'
        }), 'La génération du widget a échoué.');
        widget = generated;
      }
      const preview = await readJson(await fetch(apiUrl('/api/widget-preview'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: widget.html }), cache: 'no-store'
      }), 'Impossible de prévisualiser le widget.');
      $('ai-widget-preview-title').textContent = widget.title;
      $('ai-widget-preview-frame').src = apiUrl(preview.url);
      $('ai-widget-preview').hidden = false; $('add-ai-widget').hidden = false;
      $('add-ai-widget').onclick = () => {
        const article = document.createElement('article'); article.className = 'widget custom-widget';
        const heading = document.createElement('h2'); heading.textContent = widget.title;
        const frame = document.createElement('iframe'); frame.title = widget.title; frame.sandbox = 'allow-scripts'; frame.src = apiUrl(preview.url);
        article.append(heading, frame); $('widgets').append(article); closeDialog('ai-widget-dialog'); announce('Widget ajouté au tableau de bord.');
      };
      notice.textContent = 'Aperçu prêt. Tu peux l’ajouter au tableau de bord.';
    } catch (error) { notice.textContent = error.message; notice.classList.add('is-error'); }
    finally { button.disabled = false; }
  });

  $('edit-layout')?.addEventListener('click', (event) => {
    const button = event.currentTarget; const active = button.getAttribute('aria-pressed') !== 'true';
    button.setAttribute('aria-pressed', String(active)); $('widgets')?.classList.toggle('is-editing', active);
    announce(active ? 'Mode personnalisation activé. Utilise la poignée ↘ en bas à droite pour agrandir les widgets.' : 'Personnalisation terminée.');
  });
  $('global-background-button')?.addEventListener('click', () => {
    const panel = $('global-background-settings'); panel.hidden = !panel.hidden;
    $('global-background-button').setAttribute('aria-expanded', String(!panel.hidden));
    if (!panel.dataset.ready) {
      panel.dataset.ready = 'true';
      const label = document.createElement('label'); label.textContent = 'Image de fond ';
      const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*';
      input.addEventListener('change', () => {
        const file = input.files?.[0]; if (!file) return;
        if (!file.type.startsWith('image/')) { announce('Choisis un fichier image.'); return; }
        const reader = new FileReader(); reader.onload = () => { document.body.style.backgroundImage = `url("${reader.result}")`; document.body.style.backgroundSize = 'cover'; document.body.style.backgroundAttachment = 'fixed'; };
        reader.readAsDataURL(file);
      }); label.append(input); panel.append(label);
    }
  });
  $('google-connect')?.addEventListener('click', () => announce('La connexion Google nécessite une configuration OAuth.'));
  $('install-app')?.addEventListener('click', () => announce('Dans Chrome ou Edge, ouvre le menu ⋮ puis « Installer Mon espace ».'));

  document.querySelectorAll('[data-settings-button]').forEach((button) => button.addEventListener('click', () => {
    const widget = button.closest('.widget'); let panel = widget.querySelector('.widget-settings');
    if (!panel) {
      panel = document.createElement('div'); panel.className = 'widget-settings';
      const color = document.createElement('input'); color.type = 'color'; color.setAttribute('aria-label', 'Couleur de fond');
      color.addEventListener('input', () => { widget.style.backgroundColor = color.value; });
      panel.append(color); widget.querySelector('.widget-body')?.before(panel);
    }
    panel.hidden = !panel.hidden; button.setAttribute('aria-expanded', String(!panel.hidden));
  }));

  void scoreOnTwenty;
})();
