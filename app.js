// app.js, DOM wiring for the dbt project health scorecard. Pure client-side; no network calls.
// Reads scorecard.js for all grading/ranking logic; this file only renders it.
(function () {
  'use strict';

  function el(id) { return document.getElementById(id); }
  function show(node) { node.classList.remove('hidden'); }
  function hide(node) { node.classList.add('hidden'); }

  function escapeHtml(s) {
    return String(s).replace(/[&<>]/g, function (ch) {
      return ch === '&' ? '&amp;' : ch === '<' ? '&lt;' : '&gt;';
    });
  }

  function gradeClass(prefix, grade) {
    return prefix + '-' + grade.toLowerCase();
  }

  function renderErrors(errors) {
    var alertBox = el('error-alert');
    var list = el('error-list');
    list.innerHTML = '';
    if (!errors || !errors.length) { hide(alertBox); return; }
    errors.forEach(function (e) {
      var li = document.createElement('li');
      li.textContent = e;
      list.appendChild(li);
    });
    show(alertBox);
  }

  function renderOverview(card) {
    var badge = el('overall-badge');
    badge.textContent = card.categories.overall.grade;
    badge.className = 'badge ' + gradeClass('grade', card.categories.overall.grade);
    el('project-name').textContent = card.projectName;
    el('overall-label').textContent = 'Overall grade: ' + card.categories.overall.grade;
    el('overall-detail').textContent = 'Score ' + card.categories.overall.score + ' of 100, averaged across the five categories below. '
      + card.issueCount + ' issue' + (card.issueCount === 1 ? '' : 's') + ' flagged in total.';

    var grid = el('cat-grid');
    grid.innerHTML = '';
    CATEGORIES.forEach(function (c) {
      var cat = card.categories[c.id];
      var box = document.createElement('div');
      box.className = 'cat-card ' + gradeClass('g', cat.grade);
      box.innerHTML =
        '<div class="grade">' + cat.grade + '</div>' +
        '<div class="label">' + escapeHtml(c.label) + '</div>' +
        '<div class="count">' + cat.flaggedCount + ' of ' + cat.totalCount + ' flagged</div>' +
        '<div class="question">' + escapeHtml(c.question) + '</div>';
      grid.appendChild(box);
    });

    var note = el('fixture-note');
    if (card.isRepresentativeFixture) { note.classList.add('show'); } else { note.classList.remove('show'); }
  }

  function layerTag(layer) {
    return '<span class="layer-tag layer-' + layer + '">' + layer + '</span>';
  }

  function renderIssueCard(issue, index) {
    var card = document.createElement('div');
    card.className = 'issue';
    var rankHtml = (typeof index === 'number') ? '<span class="rank">#' + (index + 1) + '</span>' : '';
    card.innerHTML =
      '<div class="top-row">' +
        '<div>' + rankHtml + '<h4>' + escapeHtml(issue.ruleLabel) + '</h4></div>' +
        '<span class="sev">severity ' + issue.severity + '</span>' +
      '</div>' +
      '<div class="meta"><b>' + escapeHtml(issue.entityName) + '</b> &middot; ' + layerTag(issue.layer) + '</div>' +
      '<div class="detail">' + escapeHtml(issue.detail) + '</div>' +
      '<div class="action"><b>Fix:</b> ' + escapeHtml(issue.action) + '</div>';
    return card;
  }

  function renderTop10(card) {
    var host = el('view-top10');
    host.innerHTML = '';
    if (!card.top10.length) {
      var empty = document.createElement('p');
      empty.className = 'muted';
      empty.textContent = 'No issues were flagged. Every rule the evaluator checks came back clean.';
      host.appendChild(empty);
      return;
    }
    card.top10.forEach(function (issue, i) { host.appendChild(renderIssueCard(issue, i)); });
  }

  function renderAllIssues(card) {
    var host = el('view-all');
    host.innerHTML = '';
    var all = card.allIssues || [];
    if (!all.length) {
      var empty = document.createElement('p');
      empty.className = 'muted';
      empty.textContent = 'No issues were flagged. Every rule the evaluator checks came back clean.';
      host.appendChild(empty);
      return;
    }
    all.forEach(function (issue) { host.appendChild(renderIssueCard(issue)); });
  }

  function renderRemediation(card) {
    var host = el('view-remediation');
    host.innerHTML = '';
    if (!card.remediation.length) {
      var empty = document.createElement('p');
      empty.className = 'muted';
      empty.textContent = 'Nothing to remediate. There is no checklist because there is nothing flagged.';
      host.appendChild(empty);
      return;
    }
    card.remediation.forEach(function (row, i) {
      var div = document.createElement('div');
      div.className = 'remediation-row';
      div.innerHTML =
        '<div class="check-box"></div>' +
        '<div class="txt">' +
          '<h4>' + escapeHtml(row.ruleLabel) + ' (' + row.count + ')</h4>' +
          '<div class="action">' + escapeHtml(row.action) + '</div>' +
          '<div class="entities">' + escapeHtml(row.entities.join(', ')) + '</div>' +
        '</div>' +
        '<div class="priority">priority ' + (i + 1) + '</div>';
      host.appendChild(div);
    });
  }

  function renderCard(card) {
    if (card.errors && card.errors.length) {
      renderErrors(card.errors);
      hide(el('overview-panel'));
      hide(el('detail-panel'));
      hide(el('empty-panel'));
      return;
    }
    renderErrors([]);
    renderOverview(card);
    renderTop10(card);
    renderAllIssues(card);
    renderRemediation(card);
    show(el('overview-panel'));
    show(el('detail-panel'));
    hide(el('empty-panel'));
  }

  function scoreAndRender(raw) {
    var card = buildScorecard(raw);
    if (!card.errors || !card.errors.length) {
      // Attach the full, unranked issue list for the "All flagged issues" tab. buildScorecard
      // only returns the ranked top 10 by design; normalize() has the rest.
      var normalized = normalize(raw);
      card.allIssues = normalized.issues.slice().sort(function (a, b) {
        if (b.severity !== a.severity) return b.severity - a.severity;
        return a.entityName < b.entityName ? -1 : (a.entityName > b.entityName ? 1 : 0);
      });
    }
    renderCard(card);
  }

  function switchView(name) {
    ['top10', 'remediation', 'all'].forEach(function (v) {
      el('view-' + v).classList.toggle('active', v === name);
    });
    Array.prototype.forEach.call(el('view-tabs').children, function (b) {
      b.classList.toggle('active', b.getAttribute('data-view') === name);
    });
  }

  el('view-tabs').addEventListener('click', function (ev) {
    var btn = ev.target.closest ? ev.target.closest('button') : null;
    if (!btn) return;
    switchView(btn.getAttribute('data-view'));
  });

  function loadSample() {
    scoreAndRender(SAMPLE_EVALUATOR_RESULTS);
  }

  el('load-sample').addEventListener('click', loadSample);
  Array.prototype.forEach.call(document.getElementsByClassName('load-sample-btn'), function (b) {
    b.addEventListener('click', loadSample);
  });

  el('file-input').addEventListener('change', function (ev) {
    var file = ev.target.files && ev.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      var parsed;
      try {
        parsed = JSON.parse(reader.result);
      } catch (e) {
        renderErrors(['The file is not valid JSON: ' + e.message]);
        hide(el('overview-panel'));
        hide(el('detail-panel'));
        return;
      }
      scoreAndRender(parsed);
    };
    reader.onerror = function () {
      renderErrors(['The file could not be read from disk.']);
    };
    reader.readAsText(file);
  });
})();
