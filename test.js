// test.js, smoke test for the scorecard logic. Run: node test.js
// No dependencies. Exits 0 on pass, 1 on first failure.

var fs = require('fs');
var path = require('path');
var sc = require('./scorecard.js');

var passed = 0;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL: ' + msg); process.exit(1); }
  passed++;
  console.log('ok: ' + msg);
}

function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b || a === null || b === null) return false;
  if (typeof a !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  var ak = Object.keys(a), bk = Object.keys(b);
  if (ak.length !== bk.length) return false;
  return ak.every(function (k) { return Object.prototype.hasOwnProperty.call(b, k) && deepEqual(a[k], b[k]); });
}

// 0. The embedded browser copy of the sample fixture must never drift from the canonical JSON
// file, since app.js reads the embedded copy and README/tests read the JSON file.
var canonical = JSON.parse(fs.readFileSync(path.join(__dirname, 'sample', 'sample-evaluator-results.json'), 'utf8'));
var embedded = require('./sample/sample-data.js');
assert(deepEqual(canonical, embedded), 'sample-data.js is byte-identical to sample-evaluator-results.json');

// ---------------------------------------------------------------------------
// 1. Shape and rule metadata.
// ---------------------------------------------------------------------------
var EM = String.fromCharCode(8212);
Object.keys(sc.RULES).forEach(function (id) {
  var r = sc.RULES[id];
  assert(sc.CATEGORIES.some(function (c) { return c.id === r.category; }), id + ' has a valid category');
  assert(typeof r.label === 'string' && r.label.length > 0, id + ' has a non-empty label');
  assert(typeof r.action === 'string' && r.action.length > 0, id + ' has a non-empty remediation action');
  assert(typeof r.baseWeight === 'number' && r.baseWeight > 0, id + ' has a positive base weight');
  assert(r.label.indexOf(EM) === -1 && r.action.indexOf(EM) === -1, id + ' rule text has no em-dash');
});

// ---------------------------------------------------------------------------
// 2. Sample fixture: shape validates clean, deterministic grades, and a correctly ordered top 10.
// ---------------------------------------------------------------------------
var sample = canonical;
var errors = sc.validate(sample);
assert(errors.length === 0, 'sample fixture has no validation errors (' + JSON.stringify(errors) + ')');

var card = sc.buildScorecard(sample);
assert(card.errors.length === 0, 'buildScorecard(sample) reports no errors');

// Deterministic per-category grades, hand-derived from the fixture counts (see README "Worked example").
assert(card.categories.testing.score === 78 && card.categories.testing.grade === 'C', 'testing: score 78, grade C');
assert(card.categories.dag.score === 73 && card.categories.dag.grade === 'C', 'dag: score 73, grade C');
assert(card.categories.documentation.score === 81 && card.categories.documentation.grade === 'B', 'documentation: score 81, grade B');
assert(card.categories.naming.score === 80 && card.categories.naming.grade === 'B', 'naming: score 80, grade B (boundary)');
assert(card.categories.structure.score === 90 && card.categories.structure.grade === 'A', 'structure: score 90, grade A (boundary)');
assert(card.categories.overall.score === 80 && card.categories.overall.grade === 'B', 'overall: score 80, grade B');

// Re-running buildScorecard on the same input reproduces the exact same grades (the "Done when" gate).
var card2 = sc.buildScorecard(sample);
assert(deepEqual(card.categories, card2.categories), 'grades reproduce identically on a clean re-run');

// Top 10 is sorted by severity, non-increasing, and the hand-checked top of the list matches the
// documented severity rule (base weight x layer multiplier, plus the fanout magnitude bonus).
assert(card.top10.length === 10, 'top10 has exactly 10 entries');
for (var i = 1; i < card.top10.length; i++) {
  assert(card.top10[i - 1].severity >= card.top10[i].severity, 'top10 is non-increasing at position ' + i);
}
assert(card.top10[0].rule === 'missing_primary_key_tests' && card.top10[0].entityName === 'fct_order_items' && card.top10[0].severity === 27,
  '#1 is fct_order_items missing_primary_key_tests at severity 27 (9 base x 3 marts)');
assert(card.top10[1].entityName === 'dim_products' && card.top10[2].entityName === 'mart_finance_summary' && card.top10[1].severity === 24 && card.top10[2].severity === 24,
  '#2/#3 tie at severity 24 (direct_join_to_source), broken by entity name: dim_products before mart_finance_summary');
assert(card.top10[9].severity === 9, '#10 sits at severity 9, the documented tie-break floor for this fixture');

// ---------------------------------------------------------------------------
// 3. Remediation checklist is prioritized high to low.
// ---------------------------------------------------------------------------
assert(card.remediation.length > 0, 'remediation checklist is non-empty for the sample fixture');
for (var j = 1; j < card.remediation.length; j++) {
  assert(card.remediation[j - 1].maxSeverity >= card.remediation[j].maxSeverity, 'remediation is non-increasing at position ' + j);
}
assert(card.remediation[0].rule === 'missing_primary_key_tests', 'remediation top item is the highest-severity rule (missing primary key tests)');
var totalRemediationEntities = card.remediation.reduce(function (n, r) { return n + r.count; }, 0);
assert(totalRemediationEntities === 22, 'remediation counts sum to the 22 distinct rule violations in the fixture');

// ---------------------------------------------------------------------------
// 4. Boundary check: an all-clean fixture grades A; an all-broken fixture grades F.
// ---------------------------------------------------------------------------
var cleanFixture = {
  project_name: 'all-clean fixture',
  models: [
    { unique_id: 'model.x.stg_a', name: 'stg_a', layer: 'staging' },
    { unique_id: 'model.x.int_a', name: 'int_a', layer: 'intermediate' },
    { unique_id: 'model.x.dim_a', name: 'dim_a', layer: 'marts' },
    { unique_id: 'model.x.fct_a', name: 'fct_a', layer: 'marts' },
    { unique_id: 'model.x.mart_a', name: 'mart_a', layer: 'marts' }
  ],
  sources: [
    { unique_id: 'source.x.raw.a', name: 'raw.a' },
    { unique_id: 'source.x.raw.b', name: 'raw.b' }
  ],
  fct_test_coverage: { total_models: 5, tested_models: 5, test_coverage_pct: 100 }
};
var cleanCard = sc.buildScorecard(cleanFixture);
assert(cleanCard.errors.length === 0, 'all-clean fixture validates');
sc.CATEGORIES.concat([{ id: 'overall' }]).forEach(function (c) {
  assert(cleanCard.categories[c.id].score === 100 && cleanCard.categories[c.id].grade === 'A', 'all-clean: ' + c.id + ' is 100/A');
});
assert(cleanCard.top10.length === 0, 'all-clean fixture has no issues to rank');
assert(cleanCard.remediation.length === 0, 'all-clean fixture has an empty remediation list, not a fabricated one');

var brokenModels = [
  { unique_id: 'model.y.stg_a', name: 'stg_a', layer: 'staging' },
  { unique_id: 'model.y.int_a', name: 'int_a', layer: 'intermediate' },
  { unique_id: 'model.y.dim_a', name: 'dim_a', layer: 'marts' },
  { unique_id: 'model.y.fct_a', name: 'fct_a', layer: 'marts' },
  { unique_id: 'model.y.mart_a', name: 'mart_a', layer: 'marts' }
];
var brokenSources = [
  { unique_id: 'source.y.raw.a', name: 'raw.a' },
  { unique_id: 'source.y.raw.b', name: 'raw.b' }
];
function everyModelRow(extra) {
  return brokenModels.map(function (m) {
    var row = { unique_id: m.unique_id, model_name: m.name, layer: m.layer };
    if (extra) Object.keys(extra).forEach(function (k) { row[k] = extra[k]; });
    return row;
  });
}
var brokenFixture = {
  project_name: 'all-broken fixture',
  models: brokenModels,
  sources: brokenSources,
  fct_test_coverage: { total_models: 5, tested_models: 0, test_coverage_pct: 0 },
  fct_missing_primary_key_tests: everyModelRow(),
  fct_undocumented_models: everyModelRow(),
  fct_undocumented_sources: brokenSources.map(function (s) { return { unique_id: s.unique_id, source_name: s.name }; }),
  fct_direct_join_to_source: everyModelRow({ source_name: 'raw.a' }),
  fct_source_fanout: brokenSources.map(function (s) { return { unique_id: s.unique_id, source_name: s.name, num_direct_children: 9 }; }),
  fct_model_naming_conventions: everyModelRow({ expected_prefix: 'stg_', actual_prefix: 'zzz_' }),
  fct_model_directories: everyModelRow({ expected_directory: 'models/correct/', actual_directory: 'models/wrong/' })
};
var brokenCard = sc.buildScorecard(brokenFixture);
assert(brokenCard.errors.length === 0, 'all-broken fixture validates (bad data quality is not malformed JSON)');
sc.CATEGORIES.concat([{ id: 'overall' }]).forEach(function (c) {
  assert(cardGradeIsFailing(brokenCard, c.id), 'all-broken: ' + c.id + ' scores ' + brokenCard.categories[c.id].score + ' and grades ' + brokenCard.categories[c.id].grade + ' (F)');
});
function cardGradeIsFailing(card, id) { return card.categories[id].grade === 'F' && card.categories[id].score < 60; }

// ---------------------------------------------------------------------------
// 5. Malformed input is collected as errors, not thrown, and reported all at once.
// ---------------------------------------------------------------------------
assert(deepEqual(sc.buildScorecard(null).errors, ['The file is not a JSON object at the top level.']), 'null input reports one clear error');
assert(sc.buildScorecard([1, 2, 3]).errors.length === 1, 'array input is rejected as not a top-level object');
var missingShape = sc.validate({ models: [{ unique_id: 'a' }, { name: 'b' }], fct_model_fanout: 'not-an-array' });
assert(missingShape.length >= 2, 'multiple shape problems are collected in one pass, not just the first');
assert(missingShape.some(function (e) { return e.indexOf('unique_id or name') !== -1; }), 'reports models missing unique_id/name');
assert(missingShape.some(function (e) { return e.indexOf('fct_model_fanout') !== -1; }), 'reports the malformed fct_ table by name');

// ---------------------------------------------------------------------------
// 6. No em-dash anywhere in generated, user-facing output (copy rule).
// ---------------------------------------------------------------------------
function sweepForEmDash(value, label, seen) {
  if (typeof value === 'string') {
    assert(value.indexOf(EM) === -1, 'no em-dash in ' + label);
  } else if (Array.isArray(value)) {
    value.forEach(function (v, i) { sweepForEmDash(v, label + '[' + i + ']', seen); });
  } else if (value && typeof value === 'object') {
    Object.keys(value).forEach(function (k) { sweepForEmDash(value[k], label + '.' + k, seen); });
  }
}
sweepForEmDash(card, 'sample scorecard output');
sweepForEmDash(cleanCard, 'clean scorecard output');
sweepForEmDash(brokenCard, 'broken scorecard output');
sweepForEmDash(sc.RULES, 'RULES table');
sweepForEmDash(sc.CATEGORIES, 'CATEGORIES table');

console.log('\n' + passed + ' assertions passed.');
process.exit(0);
