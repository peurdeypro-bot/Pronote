import assert from 'node:assert/strict';
import test from 'node:test';
import { createWidgetDocument, generateWidget } from './ai-service.js';

const widgetResponse = (value) => new Response(JSON.stringify({
  candidates: [{
    content: {
      parts: [{ text: JSON.stringify(value) }]
    }
  }]
}), { status: 200, headers: { 'Content-Type': 'application/json' } });

test('uses the Gemini generateContent API and keeps the API key out of the URL', async () => {
  let request;
  const widget = await generateWidget('Un compte à rebours bleu nuit', {
    apiKey: 'server-secret',
    fetchImpl: async (url, options) => {
      request = { url, options };
      return widgetResponse({ title: 'Vacances', html: '<div class="window-card">12 jours</div>' });
    }
  });

  assert.deepEqual(widget, { title: 'Vacances', html: '<div class="window-card">12 jours</div>' });
  assert.equal(request.url, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent');
  assert.equal(request.options.headers['x-goog-api-key'], 'server-secret');
  assert.equal(request.url.includes('server-secret'), false);
  const body = JSON.parse(request.options.body);
  assert.equal(body.contents[0].parts[0].text, 'Un compte à rebours bleu nuit');
  assert.equal('tools' in body, false);
  assert.equal(body.generationConfig.maxOutputTokens, 6000);
  assert.equal(body.systemInstruction.parts[0].text.includes('contenu non fiable'), true);
});

test('retries with the fallback model when the primary model is unavailable', async () => {
  const requests = [];
  const widget = await generateWidget('Un widget', {
    apiKey: 'server-secret',
    fetchImpl: async (url, options) => {
      requests.push({ url, options });
      if (requests.length === 1) return new Response('{}', { status: 503 });
      return widgetResponse({ title: 'Bonjour', html: '<div class="window-card">Bonjour</div>' });
    }
  });

  assert.deepEqual(widget, { title: 'Bonjour', html: '<div class="window-card">Bonjour</div>' });
  assert.equal(requests.length, 2);
  assert.equal(requests[0].url, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent');
  assert.equal(requests[1].url, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent');
});

test('rejects missing server configuration without making a network request', async () => {
  let called = false;
  await assert.rejects(
    generateWidget('Un widget', { apiKey: '', fetchImpl: async () => { called = true; } }),
    (error) => error.status === 503
  );
  assert.equal(called, false);
});

test('accepts JSON returned inside fenced markdown blocks', async () => {
  const widget = await generateWidget('Un widget', {
    apiKey: 'server-secret',
    fetchImpl: async () => new Response(JSON.stringify({
      candidates: [{
        content: {
          parts: [{ text: '```json\n{"title":"Vacances","html":"<div class=\\"window-card\\">12 jours</div>"}\n```' }]
        }
      }]
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  });

  assert.deepEqual(widget, { title: 'Vacances', html: '<div class="window-card">12 jours</div>' });
});

test('includes the current widget as context when refining a draft', async () => {
  let requestBody;
  const previousWidget = {
    title: 'Jours avant les vacances',
    html: '<div class="window-card">ancien aperçu</div>'
  };
  await generateWidget('Ajoute un sélecteur de date', {
    apiKey: 'server-secret',
    fetchImpl: async (_url, options) => {
      requestBody = JSON.parse(options.body);
      return widgetResponse({ title: 'Jours avant les vacances', html: '<div class="window-card">nouvel aperçu</div>' });
    },
    previousWidget
  });

  const content = requestBody.contents[0].parts[0].text;
  assert.match(content, /Ajoute un sélecteur de date/);
  assert.match(content, /Widget précédent/);
  assert.match(content, /ancien aperçu/);
});

test('falls back to a local widget when the model output is malformed, empty, or too large', async () => {
  const malformed = await generateWidget('Un widget', {
    apiKey: 'server-secret',
    fetchImpl: async () => widgetResponse({ title: '', html: 'x' })
  });
  assert.equal(malformed.title, 'Mon widget');
  assert.match(malformed.html, /window-card/);
  assert.equal(malformed.fallback, true);

  const emptyBody = await generateWidget('Un widget', {
    apiKey: 'server-secret',
    fetchImpl: async () => new Response('', { status: 200, headers: { 'Content-Type': 'application/json' } })
  });
  assert.equal(emptyBody.title, 'Mon widget');
  assert.match(emptyBody.html, /window-card/);
  assert.equal(emptyBody.fallback, true);

  const oversized = await generateWidget('Un widget', {
    apiKey: 'server-secret',
    fetchImpl: async () => widgetResponse({ title: 'Long', html: 'x'.repeat(18001) })
  });
  assert.equal(oversized.title, 'Mon widget');
  assert.match(oversized.html, /window-card/);
});

test('creates a relevant, usable vacation countdown when the AI service is unavailable', async () => {
  const widget = await generateWidget('Un compte à rebours jusqu’aux vacances avec le choix de la date', {
    apiKey: 'server-secret',
    fetchImpl: async () => {
      throw new Error('network down');
    }
  });

  assert.equal(widget.title, 'Jours avant les vacances');
  assert.match(widget.html, /type="date"/);
  assert.match(widget.html, /jours avant les vacances/);
  assert.doesNotMatch(widget.html, /Widget local|Mode local/);
});

test('preserves the current draft when a refinement request cannot reach the AI service', async () => {
  const previousWidget = {
    title: 'Jours avant les vacances',
    html: '<div class="window-card">aperçu actuel</div>'
  };
  const widget = await generateWidget('Rends le nombre plus grand', {
    apiKey: 'server-secret',
    fetchImpl: async () => {
      throw new Error('network down');
    },
    previousWidget
  });

  assert.deepEqual(widget, previousWidget);
});

test('falls back to a local widget when the upstream AI service is unavailable', async () => {
  const widget = await generateWidget('Une horloge qui tourne pour avoir leur de notre fuseau horaire', {
    apiKey: 'server-secret',
    fetchImpl: async () => {
      throw new Error('network down');
    }
  });

  assert.equal(widget.title, 'Horloge en direct');
  assert.match(widget.html, /window-card/);
  assert.match(widget.html, /setInterval/);
  assert.match(widget.html, /Horloge en direct/);
});

test('widget documents prohibit network access and remain suitable for a sandboxed iframe', () => {
  const document = createWidgetDocument('<div class="window-card"><script>top.alert(1)</script></div>');
  assert.match(document, /default-src 'none'/);
  assert.match(document, /connect-src 'none'/);
  assert.match(document, /navigate-to 'none'/);
  assert.match(document, /form-action 'none'/);
  assert.match(document, /html,body\{min-height:100%;margin:0;overflow:hidden\}/);
  assert.match(document, /type:'pronote-widget-size'/);
  assert.match(document, /window-card/);
});
