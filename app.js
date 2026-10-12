(function () {
  'use strict';

  /* ---------- Content ---------- */

  var LENSES = [
    {
      id: 'roi',
      abbr: 'ROI',
      name: 'Return on Investment',
      kase: 'The business case',
      intro: 'Did I move the right metrics? Think completion rates, engagement, error reduction, and time on task.',
      questions: [
        'Did the metrics I set out to move (completion, conversion, engagement) move in the right direction?',
        'Did errors, support contacts, or rework go down?',
        'Did time on task improve without hurting quality?',
        'Could I defend the investment to someone who only looks at the numbers?'
      ]
    },
    {
      id: 'rov',
      abbr: 'ROV',
      name: 'Return on Value',
      kase: 'The user experience case',
      intro: 'Did it feel better for the person using it? Think reduced friction, reduced anxiety, and content that felt made for them.',
      questions: [
        'Did people hit less friction getting to what they came for?',
        'Did the experience reduce uncertainty or anxiety, so people knew what was happening and what came next?',
        'Did the content and language feel made for this audience, not for the organization?',
        'Do I have real evidence (research, feedback, observation) that it felt better, rather than assuming it?'
      ]
    },
    {
      id: 'rot',
      abbr: 'ROT',
      name: 'Return on Technology',
      kase: 'The feasibility case',
      intro: 'What was possible within real constraints? Think compliance, accessibility, platform limits, and legacy architecture. A high score means I did well within my constraints; a low score means constraints heavily compromised the outcome.',
      questions: [
        'Did the solution meet compliance and legal requirements without degrading the experience?',
        'Did it meet accessibility standards in practice, not just on paper?',
        'Did most of the ideal solution survive platform and tooling limits?',
        'Is it sustainable for the team to maintain, given the legacy architecture?'
      ]
    }
  ];

  var RATING_WORDS = ['Not at all', 'Barely', 'Partly', 'Mostly', 'Clearly'];
  var MAX_SCORE = 20;      // 4 questions x 5 points

  var EVIDENCE = [
    { value: 'measured', label: 'Mostly measured' },
    { value: 'mixed', label: 'A mix' },
    { value: 'assumed', label: 'Mostly assumed' }
  ];

  var STEPS = ['intro', 'setup', 'roi', 'rov', 'rot', 'results'];
  var PROGRESS = [
    { step: 'setup', label: 'Setup' },
    { step: 'roi', label: 'ROI', lens: 'roi' },
    { step: 'rov', label: 'ROV', lens: 'rov' },
    { step: 'rot', label: 'ROT', lens: 'rot' },
    { step: 'results', label: 'Results' }
  ];

  /* ---------- State ---------- */

  var state;
  function freshState() {
    state = { name: '', desc: '', current: 'intro', lenses: {}, reflection: { confirm: '', challenge: '' } };
    LENSES.forEach(function (l) {
      state.lenses[l.id] = {
        evidence: '',
        answers: l.questions.map(function () { return { rating: 0, note: '' }; })
      };
    });
  }

  /* ---------- Helpers ---------- */

  var SVGNS = 'http://www.w3.org/2000/svg';

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    setAttrs(node, attrs);
    appendAll(node, children);
    return node;
  }
  function svg(tag, attrs, children) {
    var node = document.createElementNS(SVGNS, tag);
    setAttrs(node, attrs);
    appendAll(node, children);
    return node;
  }
  function setAttrs(node, attrs) {
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'text') node.textContent = attrs[k];
      else node.setAttribute(k, attrs[k]);
    });
  }
  function appendAll(node, children) {
    (children || []).forEach(function (c) {
      if (c) node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
  }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function lensById(id) { return LENSES.filter(function (l) { return l.id === id; })[0]; }
  function lensColor(id) { return { roi: '#2457a6', rov: '#b4531f', rot: '#1b7a5f' }[id]; }

  function score(lensId) {
    return state.lenses[lensId].answers.reduce(function (sum, a) { return sum + a.rating; }, 0);
  }

  /* ---------- Build lens steps ---------- */

  function buildLensSteps() {
    var host = $('#lens-steps');
    host.textContent = '';
    LENSES.forEach(function (lens, li) {
      var next = li < LENSES.length - 1 ? 'Continue to ' + LENSES[li + 1].abbr : 'See my results';
      var section = el('section', {
        'class': 'step lens-' + lens.id, id: 'step-' + lens.id,
        'data-step': lens.id, 'aria-labelledby': 'h-' + lens.id, hidden: ''
      });
      section.style.cssText = '--c:' + lensColor(lens.id) + ';--tint:var(--' + lens.id + '-tint)';

      section.appendChild(el('div', { 'class': 'lens-head' }, [
        el('p', { 'class': 'eyebrow', text: 'Lens ' + (li + 1) + ' of 3 · ' + lens.kase }),
        el('h2', { id: 'h-' + lens.id, tabindex: '-1', text: lens.abbr + ': ' + lens.name }),
        el('p', { text: lens.intro })
      ]));

      var form = el('form', { novalidate: '', 'data-lens': lens.id });

      lens.questions.forEach(function (q, qi) {
        var legend = el('legend', {}, [el('span', { 'class': 'q-num', text: (qi + 1) + '.' }), q]);
        var scale = el('div', { 'class': 'scale' });
        for (var r = 1; r <= 5; r++) {
          var id = lens.id + '-q' + qi + '-r' + r;
          scale.appendChild(el('label', { 'for': id }, [
            el('input', { type: 'radio', id: id, name: lens.id + '-q' + qi, value: String(r) }),
            el('span', { 'class': 'pill' }, [
              el('span', { 'class': 'num', text: String(r) }),
              el('span', { 'class': 'word', text: RATING_WORDS[r - 1] })
            ])
          ]));
        }
        var noteId = lens.id + '-n' + qi;
        form.appendChild(el('fieldset', { 'class': 'question' }, [
          legend,
          scale,
          el('div', { 'class': 'note' }, [
            el('label', { 'for': noteId, text: 'A short note (optional)' }),
            el('input', { type: 'text', id: noteId, maxlength: '240', autocomplete: 'off', 'data-note': lens.id + ':' + qi })
          ])
        ]));
      });

      var ev = el('fieldset', { 'class': 'evidence' }, [
        el('legend', { text: 'How much of this lens rests on real evidence?' }),
        el('p', { 'class': 'hint', text: 'Optional. It helps separate what I know from what I believe.' })
      ]);
      var opts = el('div', { 'class': 'opts' });
      EVIDENCE.forEach(function (o) {
        var id = lens.id + '-ev-' + o.value;
        opts.appendChild(el('label', { 'for': id }, [
          el('input', { type: 'radio', id: id, name: lens.id + '-evidence', value: o.value }),
          o.label
        ]));
      });
      ev.appendChild(opts);
      form.appendChild(ev);

      form.appendChild(el('p', { 'class': 'error step-error', role: 'alert', hidden: '', 'data-error': lens.id }));
      form.appendChild(el('div', { 'class': 'actions' }, [
        el('button', { 'class': 'btn', type: 'button', 'data-action': 'back', text: 'Back' }),
        el('button', { 'class': 'btn primary', type: 'submit', text: next })
      ]));

      section.appendChild(form);
      host.appendChild(section);
    });
  }

  function buildProgress() {
    var list = $('#progress-list');
    list.textContent = '';
    PROGRESS.forEach(function (p) {
      var li = el('li', { 'data-step': p.step, text: p.label });
      if (p.lens) li.setAttribute('data-lens', p.lens);
      list.appendChild(li);
    });
  }

  /* ---------- Navigation ---------- */

  function showStep(stepId, opts) {
    opts = opts || {};
    state.current = stepId;
    STEPS.forEach(function (id) {
      var s = $('#step-' + id);
      if (s) s.hidden = id !== stepId;
    });

    var nav = $('#progress');
    nav.hidden = stepId === 'intro';
    var idx = STEPS.indexOf(stepId);
    Array.prototype.forEach.call($('#progress-list').children, function (li) {
      var i = STEPS.indexOf(li.getAttribute('data-step'));
      li.classList.toggle('done', i < idx);
      li.classList.toggle('current', i === idx);
      if (i === idx) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
    });

    if (stepId === 'results') renderResults();
    if (!opts.fromHistory) history.pushState({ step: stepId }, '');

    var heading = $('#step-' + stepId + ' h2');
    window.scrollTo(0, 0);
    if (heading && !opts.silent) heading.focus({ preventScroll: true });
  }

  function go(delta) {
    var i = STEPS.indexOf(state.current) + delta;
    if (i >= 0 && i < STEPS.length) showStep(STEPS[i]);
  }

  /* ---------- Validation ---------- */

  function submitSetup(e) {
    e.preventDefault();
    var input = $('#project-name');
    var err = $('#name-error');
    var name = input.value.trim();
    if (!name) {
      err.hidden = false;
      input.setAttribute('aria-invalid', 'true');
      input.focus();
      return;
    }
    err.hidden = true;
    input.removeAttribute('aria-invalid');
    state.name = name;
    state.desc = $('#project-desc').value.trim();
    showStep('roi');
  }

  function submitLens(e) {
    e.preventDefault();
    var lensId = e.target.getAttribute('data-lens');
    var answers = state.lenses[lensId].answers;
    var missing = [];
    answers.forEach(function (a, i) { if (!a.rating) missing.push(i + 1); });
    var err = $('[data-error="' + lensId + '"]');
    if (missing.length) {
      err.textContent = 'Please rate ' + (missing.length === 1 ? 'question ' : 'questions ') + missing.join(', ') + ' to continue.';
      err.hidden = false;
      var first = $('input[name="' + lensId + '-q' + (missing[0] - 1) + '"]', e.target);
      if (first) first.focus();
      return;
    }
    err.hidden = true;
    go(1);
  }

  function onInput(e) {
    var t = e.target;
    if (t.type === 'radio') {
      var m = /^(roi|rov|rot)-q(\d)$/.exec(t.name);
      if (m) {
        state.lenses[m[1]].answers[+m[2]].rating = +t.value;
        var err = $('[data-error="' + m[1] + '"]');
        if (err) err.hidden = true;
      }
      var ev = /^(roi|rov|rot)-evidence$/.exec(t.name);
      if (ev) state.lenses[ev[1]].evidence = t.value;
    } else if (t.hasAttribute('data-reflect')) {
      state.reflection[t.getAttribute('data-reflect')] = t.value;
    } else if (t.hasAttribute('data-note')) {
      var p = t.getAttribute('data-note').split(':');
      state.lenses[p[0]].answers[+p[1]].note = t.value;
    }
  }

  /* ---------- Results ---------- */

  function renderResults() {
    $('#h-results').textContent = state.name;
    $('#results-desc').textContent = state.desc || 'Here\u2019s how the three lenses line up, and what they suggest doing next.';
    var a = analyze();
    renderInterpretation(a);
    renderBars();
    renderTriangle();
    renderTension(a);
    renderSteps(a);
    renderTests(a);
    renderEvidencePrompts(a);
    renderMove(a);
    renderNotes();
  }

  function analyze() {
    var scores = {}, evidence = {}, answers = {};
    LENSES.forEach(function (l) {
      scores[l.id] = score(l.id);
      evidence[l.id] = state.lenses[l.id].evidence;
      answers[l.id] = state.lenses[l.id].answers;
    });
    return Guidance.analyze({ scores: scores, evidence: evidence, answers: answers, lenses: LENSES });
  }

  function heading(id, text) { return el('h3', { id: id, 'class': 'panel-title', text: text }); }
  function paragraphs(list, cls) {
    return list.map(function (t) { return el('p', cls ? { 'class': cls, text: t } : { text: t }); });
  }
  function fill(host, children) { host.textContent = ''; appendAll(host, children); }

  function evidenceLabel(v) {
    var o = EVIDENCE.filter(function (e) { return e.value === v; })[0];
    return o ? 'Evidence: ' + o.label.toLowerCase() : '';
  }

  function renderBars() {
    var host = $('#bars');
    host.textContent = '';
    LENSES.forEach(function (lens) {
      var s = score(lens.id);
      var fill = el('div', { 'class': 'fill' });
      var row = el('div', { 'class': 'bar-row' }, [
        el('div', { 'class': 'bar-label' }, [
          el('span', { 'class': 'name' }, [
            el('span', { 'class': 'abbr-inline', text: lens.abbr }),
            lens.name
          ]),
          el('span', { 'class': 'score' }, [String(s), el('small', { text: ' / ' + MAX_SCORE })])
        ]),
        el('div', { 'class': 'track', role: 'img', 'aria-label': lens.abbr + ' scored ' + s + ' out of ' + MAX_SCORE }, [fill]),
        state.lenses[lens.id].evidence
          ? el('span', { 'class': 'badge', text: evidenceLabel(state.lenses[lens.id].evidence) })
          : null
      ]);
      row.style.setProperty('--c', lensColor(lens.id));
      host.appendChild(row);
      // Animate after layout
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { fill.style.width = (s / MAX_SCORE * 100) + '%'; });
      });
    });
  }

  function renderTriangle() {
    var host = $('#triangle');
    host.textContent = '';
    var cx = 220, cy = 175, R = 125;
    var angles = { roi: -90, rov: 30, rot: 150 };

    function pt(id, frac) {
      var a = angles[id] * Math.PI / 180;
      return [cx + R * frac * Math.cos(a), cy + R * frac * Math.sin(a)];
    }
    function poly(fracs) {
      return LENSES.map(function (l) { return pt(l.id, fracs[l.id]).map(function (n) { return n.toFixed(1); }).join(','); }).join(' ');
    }
    function uniform(f) { return { roi: f, rov: f, rot: f }; }

    var scores = {}, fr = {}, total = 0;
    LENSES.forEach(function (l) {
      scores[l.id] = score(l.id);
      fr[l.id] = scores[l.id] / MAX_SCORE;
      total += scores[l.id];
    });
    var avgFrac = total / 3 / MAX_SCORE;

    var summary = LENSES.map(function (l) { return l.abbr + ' ' + scores[l.id] + ' out of ' + MAX_SCORE; }).join(', ');
    var root = svg('svg', {
      viewBox: '0 0 440 320', role: 'img',
      'aria-label': 'Triangle chart of the three lens scores: ' + summary + '. Dashed outline shows a perfectly balanced shape at the average score.'
    });

    // Grid rings
    [0.25, 0.5, 0.75, 1].forEach(function (f) {
      root.appendChild(svg('polygon', { points: poly(uniform(f)), fill: f === 1 ? '#fbfbfa' : 'none', stroke: '#d5d9dc', 'stroke-width': f === 1 ? 1.5 : 1 }));
    });
    // Axes
    LENSES.forEach(function (l) {
      var p = pt(l.id, 1);
      root.appendChild(svg('line', { x1: cx, y1: cy, x2: p[0].toFixed(1), y2: p[1].toFixed(1), stroke: '#d5d9dc', 'stroke-width': 1 }));
    });
    // Balanced reference
    root.appendChild(svg('polygon', { points: poly(uniform(avgFrac)), fill: 'none', stroke: '#6b747a', 'stroke-width': 1.5, 'stroke-dasharray': '5 4' }));
    // Actual shape
    root.appendChild(svg('polygon', { points: poly(fr), fill: 'rgba(29,35,39,0.14)', stroke: '#1d2327', 'stroke-width': 2.5, 'stroke-linejoin': 'round' }));

    // Vertex dots and labels
    var labelPos = {
      roi: { x: 220, y: 24, anchor: 'middle' },
      rov: { x: 345, y: 262, anchor: 'start' },
      rot: { x: 95, y: 262, anchor: 'end' }
    };
    LENSES.forEach(function (l) {
      var p = pt(l.id, fr[l.id]);
      root.appendChild(svg('circle', { cx: p[0].toFixed(1), cy: p[1].toFixed(1), r: 7, fill: lensColor(l.id), stroke: '#fff', 'stroke-width': 2 }));
      var lp = labelPos[l.id];
      root.appendChild(svg('text', { x: lp.x, y: lp.y, 'text-anchor': lp.anchor, 'font-size': 17, 'font-weight': 800, fill: lensColor(l.id), text: l.abbr }));
      root.appendChild(svg('text', { x: lp.x, y: lp.y + 18, 'text-anchor': lp.anchor, 'font-size': 14, fill: '#1d2327', text: scores[l.id] + ' / ' + MAX_SCORE }));
    });

    host.appendChild(root);
  }

  var SIZE_LABEL = { significant: 'Significant gap', modest: 'Modest gap', none: 'Aligned' };

  function renderInterpretation(a) {
    fill($('#interpretation'), [
      el('p', { 'class': 'eyebrow', text: 'Reading the pattern' }),
      heading('h-interp', a.pattern.title)
    ].concat(paragraphs(a.pattern.paragraphs), [
      el('p', { 'class': 'fine', text: 'These scores reflect current beliefs and the evidence entered. They\u2019re a prompt for what to examine next, not a verdict.' })
    ]));
  }

  function renderTension(a) {
    var t = a.tension;
    var card = el('div', { 'class': 'gap-card gap-' + t.size }, [
      el('span', { 'class': 'chip', text: SIZE_LABEL[t.size] }),
      el('p', { 'class': 'gap-headline', text: t.headline })
    ]);
    if (t.structure) card.appendChild(el('p', { 'class': 'gap-structure', text: t.structure }));
    card.appendChild(el('p', { 'class': 'gap-why' }, [el('strong', { text: 'Why it matters. ' }), t.why]));
    if (t.sizeNote) card.appendChild(el('p', { 'class': 'fine', text: t.sizeNote }));

    var list = el('ul', { 'class': 'pairs' });
    t.pairs.forEach(function (p) {
      list.appendChild(el('li', { 'class': 'pair pair-' + p.size }, [
        el('span', { 'class': 'pair-names', text: lensById(p.a).abbr + ' and ' + lensById(p.b).abbr }),
        el('span', { 'class': 'pair-gap', text: p.gap + (p.gap === 1 ? ' point' : ' points') + ' apart' }),
        el('span', { 'class': 'pair-tag', text: SIZE_LABEL[p.size] })
      ]));
    });

    var kids = [heading('h-tension', 'Where the tension is'), card,
      el('h4', { 'class': 'sub', text: 'Every pair, for comparison' }), list];
    if (t.assumed.length) {
      var names = t.assumed.map(function (id) { return lensById(id).abbr; }).join(' and ');
      kids.push(el('p', { 'class': 'fine', text: names + (t.assumed.length > 1 ? ' rest' : ' rests') + ' mostly on assumption, so part of any gap may reflect missing information rather than a real difference.' }));
    }
    fill($('#tension-panel'), kids);
  }

  function renderSteps(a) {
    var ol = el('ol', { 'class': 'steps' });
    a.steps.forEach(function (st) {
      var li = el('li', {}, [
        el('strong', { 'class': 'step-title', text: st.title }),
        el('p', { text: st.detail })
      ]);
      if (st.source) {
        li.appendChild(el('p', { 'class': 'step-source' }, [
          el('span', { 'class': 'chip small', text: 'From a low rating' }), ' ' + st.source
        ]));
        if (st.note) li.appendChild(el('p', { 'class': 'step-source' }, [el('em', { text: 'My note: ' + st.note })]));
      }
      ol.appendChild(li);
    });
    fill($('#steps-panel'), [
      heading('h-steps', 'Suggested intervention steps'),
      el('p', { 'class': 'panel-intro', text: 'Chosen from the shape of the scores, with the biggest gap weighted most. Treat them as the next best things to try, in roughly this order.' }),
      ol
    ]);
  }

  function renderTests(a) {
    var ul = el('ul', { 'class': 'tests' });
    a.tests.forEach(function (t) {
      ul.appendChild(el('li', {}, [
        el('p', { 'class': 'assumption' }, [el('span', { 'class': 'label', text: 'Assumption' }), t.assumption]),
        el('p', { 'class': 'test' }, [el('span', { 'class': 'label', text: 'Test' }), t.test])
      ]));
    });
    fill($('#tests-panel'), [
      heading('h-tests', 'What to test next'),
      el('p', { 'class': 'panel-intro', text: 'Each item is something the current scores quietly depend on, paired with a small way to check it.' }),
      ul
    ]);
  }

  function renderEvidencePrompts(a) {
    function column(key, title, items, label) {
      var ta = el('textarea', { id: 'reflect-' + key, rows: '3', maxlength: '600', 'data-reflect': key, placeholder: 'e.g., a specific number, a quote, a decision someone makes' });
      ta.value = state.reflection[key];
      return el('div', { 'class': 'evidence-col evidence-' + key }, [
        el('h4', { 'class': 'sub', text: title }),
        el('ul', {}, items.map(function (t) { return el('li', { text: t }); })),
        el('label', { 'for': 'reflect-' + key, text: label }),
        ta
      ]);
    }
    fill($('#evidence-panel'), [
      heading('h-evidence', 'What evidence would change my mind?'),
      el('p', { 'class': 'panel-intro', text: 'The framework is for learning and decision-making, not for producing a definitive score. Deciding now what would strengthen or weaken this recommendation makes it easier to notice when the picture has changed.' }),
      el('div', { 'class': 'evidence-grid' }, [
        column('confirm', 'Would strengthen the case', a.evidence.confirm, 'What else would make me more confident?'),
        column('challenge', 'Would challenge it', a.evidence.challenge, 'What would make me reconsider?')
      ])
    ]);
  }

  function renderMove(a) {
    fill($('#move-panel'), [
      el('p', { 'class': 'eyebrow', text: 'Recommended next move' }),
      el('h3', { id: 'h-move', 'class': 'move-label', text: a.move.label })
    ].concat(paragraphs(a.move.paragraphs), [
      el('p', { 'class': 'fine', text: a.move.revisit })
    ]));
  }

  function renderNotes() {
    var host = $('#notes');
    host.textContent = '';
    LENSES.forEach(function (lens) {
      var section = el('div', { 'class': 'notes-lens' }, [el('h4', { text: lens.abbr + ': ' + lens.name })]);
      section.style.setProperty('--c', lensColor(lens.id));
      var ul = el('ul');
      lens.questions.forEach(function (q, i) {
        var a = state.lenses[lens.id].answers[i];
        ul.appendChild(el('li', {}, [
          el('span', { 'class': 'q', text: q }),
          el('span', { 'class': 'a', text: a.rating + ' / 5' }),
          a.note ? el('span', { 'class': 'n', text: a.note }) : el('span', { 'class': 'none', text: 'No note' })
        ]));
      });
      section.appendChild(ul);
      host.appendChild(section);
    });
  }

  /* ---------- Reset ---------- */

  function restart() {
    freshState();
    $('#setup-form').reset();
    $('#name-error').hidden = true;
    buildLensSteps();
    bindLensForms();
    showStep('intro');
  }

  /* ---------- Wiring ---------- */

  function bindLensForms() {
    Array.prototype.forEach.call(document.querySelectorAll('#lens-steps form'), function (f) {
      f.addEventListener('submit', submitLens);
    });
  }

  function init() {
    freshState();
    buildProgress();
    buildLensSteps();
    bindLensForms();

    $('#setup-form').addEventListener('submit', submitSetup);
    document.addEventListener('input', onInput);
    document.addEventListener('change', onInput);

    document.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-action]');
      if (!btn) return;
      var action = btn.getAttribute('data-action');
      if (action === 'start') go(1);
      else if (action === 'back') go(-1);
      else if (action === 'print') window.print();
      else if (action === 'restart') restart();
    });

    window.addEventListener('popstate', function (e) {
      var step = e.state && e.state.step;
      if (step && STEPS.indexOf(step) !== -1) {
        // Don't allow jumping to results via history unless the work exists
        showStep(step === 'results' && !state.name ? 'intro' : step, { fromHistory: true, silent: true });
      } else {
        showStep('intro', { fromHistory: true, silent: true });
      }
    });

    window.addEventListener('beforeprint', function () { $('#notes-details').open = true; });

    history.replaceState({ step: 'intro' }, '');
    showStep('intro', { fromHistory: true, silent: true });
  }

  init();
})();
