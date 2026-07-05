// scorecard.js, the dbt project health grading logic.
// Pure, dependency-free, and shared between the browser (index.html) and Node (test.js).
// Nothing here reads a file or hits a network; it only transforms the JSON you hand it.
//
// Input shape: a normalized export of dbt-project-evaluator results (see README "Input shape").
// dbt-project-evaluator groups its checks into five categories: Testing, Modeling (DAG),
// Documentation, Naming, and Structure. This file grades a project against those same five
// categories, ranks the individual findings by a documented severity rule, and produces a
// prioritized remediation checklist. It does not run dbt or the evaluator package itself.

// Rule metadata: the fct_ table each rule reads from, which of the five categories it belongs
// to, a plain-English label and remediation action, and its base severity weight (1-10, higher
// is worse). Weights are Ben's documented judgment call, described in README "Severity rule":
// a broken foreign-key-style test or a bypassed staging layer risks corrupting every model
// downstream, so it outweighs a missing description.
var RULES = {
  missing_primary_key_tests: {
    category: 'testing',
    label: 'Missing primary key tests',
    baseWeight: 9,
    action: 'Add a primary key test (unique and not_null) so a bad join upstream cannot silently duplicate every row that depends on this model.'
  },
  direct_join_to_source: {
    category: 'dag',
    label: 'Direct join to a raw source',
    baseWeight: 8,
    action: 'Route this model through the staging layer instead of joining the raw source directly, so every model shares one cleaned definition of that source.'
  },
  staging_dependent_on_marts_or_intermediate: {
    category: 'dag',
    label: 'Staging model depends on a mart or intermediate model',
    baseWeight: 8,
    action: 'Break the backwards dependency. A staging model should only read from a source. Rebuild it from the source directly, or move the logic it needs downstream.'
  },
  rejoining_of_upstream_concepts: {
    category: 'dag',
    label: 'Upstream concepts rejoined more than once',
    baseWeight: 6,
    action: 'Combine the redundant join paths into a single upstream model so the same two concepts are only joined together once in the whole project.'
  },
  model_fanout: {
    category: 'dag',
    label: 'Model fans out to too many children',
    baseWeight: 5,
    action: 'Add an intermediate model to absorb the shared logic these children all repeat, so one change does not have to be made in a dozen places.'
  },
  source_fanout: {
    category: 'dag',
    label: 'Source read directly by too many models',
    baseWeight: 5,
    action: 'Route the models that read this source through one staging model instead, so a schema change upstream only has to be fixed in one place.'
  },
  root_models: {
    category: 'dag',
    label: 'Model has no recorded upstream dependency',
    baseWeight: 4,
    action: 'Confirm this is not an orphaned or abandoned model. If it should depend on a source or another model, add the missing ref.'
  },
  undocumented_models: {
    category: 'documentation',
    label: 'Model has no description',
    baseWeight: 5,
    action: 'Add a description to this model in its schema.yml so anyone reading the docs site knows what it represents.'
  },
  undocumented_sources: {
    category: 'documentation',
    label: 'Source has no description',
    baseWeight: 4,
    action: 'Add a description to this source table so the docs site explains what it holds.'
  },
  model_naming_conventions: {
    category: 'naming',
    label: 'Model name does not match its layer prefix',
    baseWeight: 3,
    action: 'Rename this model to match the project\'s prefix convention for its layer, so the layer is obvious from the name alone.'
  },
  model_directories: {
    category: 'structure',
    label: 'Model file is not in the folder matching its layer',
    baseWeight: 3,
    action: 'Move this model\'s file into the folder that matches its layer, so the file structure and the model\'s purpose stay in sync.'
  }
};

// The two rules that carry a magnitude (how many children/rows are affected), used to add a
// small severity bonus on top of the base weight. See computeSeverity below.
var MAGNITUDE_RULES = { model_fanout: 'num_children', source_fanout: 'num_direct_children' };

// A mart is client-facing and sits at the end of the DAG, so a problem there has the widest
// blast radius; a staging model is closest to the source and has the narrowest. This multiplier
// is the documented reason the same rule scores higher on a mart than on a staging model.
var LAYER_MULTIPLIER = { marts: 3, intermediate: 2, staging: 1, source: 1 };
var VALID_LAYERS = ['staging', 'intermediate', 'marts'];

var CATEGORIES = [
  { id: 'testing', label: 'Testing coverage', question: 'Are the model\'s key rows actually tested?' },
  { id: 'dag', label: 'DAG hygiene', question: 'Does data flow cleanly through the layers, or are there shortcuts, fanouts, and backwards dependencies?' },
  { id: 'documentation', label: 'Documentation coverage', question: 'Can someone else tell what a model or source is for without asking you?' },
  { id: 'naming', label: 'Naming conventions', question: 'Do model names signal their layer at a glance?' },
  { id: 'structure', label: 'Model structure', question: 'Does the file layout on disk match the model\'s layer?' }
];

// Standard letter-grade cutoffs, checked highest first.
var GRADE_CUTOFFS = [[90, 'A'], [80, 'B'], [70, 'C'], [60, 'D'], [0, 'F']];

function gradeForScore(score) {
  for (var i = 0; i < GRADE_CUTOFFS.length; i++) {
    if (score >= GRADE_CUTOFFS[i][0]) return GRADE_CUTOFFS[i][1];
  }
  return 'F';
}

// computeSeverity: baseWeight x layerMultiplier, plus a capped magnitude bonus for fanout rules.
// magnitude/3, floored, capped at +3, so a fanout of 9+ maxes the bonus rather than dominating it.
function computeSeverity(ruleId, layer, magnitude) {
  var rule = RULES[ruleId];
  var mult = LAYER_MULTIPLIER[layer] || 1;
  var bonus = 0;
  if (MAGNITUDE_RULES[ruleId]) {
    bonus = Math.min(3, Math.floor((magnitude || 0) / 3));
  }
  return rule.baseWeight * mult + bonus;
}

// validate: collects every shape problem instead of stopping at the first one, so the UI can
// show them all at once (the portfolio ErrorAlert convention). Returns an array of strings;
// empty means the input is safe to normalize.
function validate(raw) {
  var errors = [];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    errors.push('The file is not a JSON object at the top level.');
    return errors;
  }

  if (!Array.isArray(raw.models) || raw.models.length === 0) {
    errors.push('Missing or empty "models" list. The export needs a models array with each model\'s unique_id, name, and layer (staging, intermediate, or marts).');
  } else {
    var badId = 0, badLayer = 0;
    raw.models.forEach(function (m) {
      if (!m || !m.unique_id || !m.name) badId++;
      if (!m || VALID_LAYERS.indexOf(m.layer) === -1) badLayer++;
    });
    if (badId > 0) errors.push(badId + ' model(s) are missing a unique_id or name.');
    if (badLayer > 0) errors.push(badLayer + ' model(s) have a missing or invalid layer; expected staging, intermediate, or marts.');
  }

  if (raw.sources !== undefined && !Array.isArray(raw.sources)) {
    errors.push('"sources" must be a list, if present.');
  } else if (Array.isArray(raw.sources)) {
    var badSource = 0;
    raw.sources.forEach(function (s) { if (!s || !s.unique_id || !s.name) badSource++; });
    if (badSource > 0) errors.push(badSource + ' source(s) are missing a unique_id or name.');
  }

  Object.keys(RULES).forEach(function (ruleId) {
    var key = 'fct_' + ruleId;
    if (raw[key] !== undefined && !Array.isArray(raw[key])) {
      errors.push('"' + key + '" must be a list of rows, if present.');
    }
  });

  if (raw.fct_test_coverage !== undefined) {
    var tc = raw.fct_test_coverage;
    if (!tc || typeof tc !== 'object' || typeof tc.test_coverage_pct !== 'number') {
      errors.push('"fct_test_coverage" must be an object with a numeric test_coverage_pct, if present.');
    }
  }

  return errors;
}

// normalize: turns the raw evaluator export into a flat list of issues, one per rule violation,
// each carrying the severity score computed above. Assumes validate() already passed.
function normalize(raw) {
  var modelById = {};
  (raw.models || []).forEach(function (m) { modelById[m.unique_id] = m; });
  var sourceById = {};
  (raw.sources || []).forEach(function (s) { sourceById[s.unique_id] = s; });

  var issues = [];
  Object.keys(RULES).forEach(function (ruleId) {
    var rows = raw['fct_' + ruleId] || [];
    rows.forEach(function (row) {
      var isSource = ruleId === 'undocumented_sources' || ruleId === 'source_fanout';
      var layer = isSource ? 'source' : (row.layer || (modelById[row.unique_id] && modelById[row.unique_id].layer) || 'staging');
      var magnitude = MAGNITUDE_RULES[ruleId] ? row[MAGNITUDE_RULES[ruleId]] : undefined;
      var entityName = row.model_name || row.source_name || row.unique_id;
      issues.push({
        id: ruleId + '::' + row.unique_id,
        rule: ruleId,
        ruleLabel: RULES[ruleId].label,
        category: RULES[ruleId].category,
        baseWeight: RULES[ruleId].baseWeight,
        entityId: row.unique_id,
        entityName: entityName,
        entityKind: isSource ? 'source' : 'model',
        layer: layer,
        detail: buildDetail(ruleId, row),
        action: RULES[ruleId].action,
        severity: computeSeverity(ruleId, layer, magnitude)
      });
    });
  });

  return {
    projectName: raw.project_name || 'Untitled dbt project',
    modelCount: (raw.models || []).length,
    sourceCount: (raw.sources || []).length,
    testCoverage: raw.fct_test_coverage || null,
    isRepresentativeFixture: !!raw.is_representative_fixture,
    issues: issues
  };
}

// Plain-English detail line per rule, using the specifics the evaluator's real output carries
// (which source, how many children, which model it wrongly depends on).
function buildDetail(ruleId, row) {
  switch (ruleId) {
    case 'direct_join_to_source':
      return 'Joins directly to source "' + row.source_name + '".';
    case 'model_fanout':
      return 'Feeds ' + row.num_children + ' downstream models directly.';
    case 'source_fanout':
      return row.num_direct_children + ' models read this source directly.';
    case 'staging_dependent_on_marts_or_intermediate':
      return 'Depends on "' + row.depends_on_model + '", which is a mart or intermediate model.';
    case 'rejoining_of_upstream_concepts':
      return 'Rejoins ' + row.rejoined_models + ' through more than one path.';
    case 'model_naming_conventions':
      return 'Named "' + row.actual_prefix + '..." but the ' + row.layer + ' layer convention expects "' + row.expected_prefix + '...".';
    case 'model_directories':
      return 'Lives in "' + row.actual_directory + '" but the ' + row.layer + ' layer belongs in "' + row.expected_directory + '".';
    default:
      return RULES[ruleId].label + '.';
  }
}

// distinctCount: how many different entities (by entityId) appear among a set of issues.
function distinctCount(issues) {
  var seen = {};
  issues.forEach(function (i) { seen[i.entityId] = true; });
  return Object.keys(seen).length;
}

// gradeCategories: one score/grade/count per category, plus the overall grade. Testing blends
// two independent signals (missing PK tests and the evaluator's own aggregate coverage percent)
// because a project can have broad test coverage but still be missing the one test, unique keys,
// that catches join fanout. Every other category is a plain violation rate: 100 x (1 - flagged /
// total). Documented so the same input always reproduces the same grade.
function gradeCategories(normalized) {
  var modelCount = normalized.modelCount;
  var sourceCount = normalized.sourceCount;
  var byCategory = {};
  CATEGORIES.forEach(function (c) { byCategory[c.id] = []; });
  normalized.issues.forEach(function (i) { byCategory[i.category].push(i); });

  var result = {};

  var pkIssues = byCategory.testing.filter(function (i) { return i.rule === 'missing_primary_key_tests'; });
  var pkScore = modelCount > 0 ? 100 * (1 - distinctCount(pkIssues) / modelCount) : 100;
  var coveragePct = normalized.testCoverage ? normalized.testCoverage.test_coverage_pct : null;
  var testingScore = coveragePct === null ? pkScore : (pkScore + coveragePct) / 2;
  result.testing = {
    score: Math.round(testingScore),
    grade: gradeForScore(Math.round(testingScore)),
    flaggedCount: distinctCount(pkIssues),
    totalCount: modelCount
  };

  var dagTotal = modelCount + sourceCount;
  var dagFlagged = distinctCount(byCategory.dag);
  var dagScore = dagTotal > 0 ? 100 * (1 - dagFlagged / dagTotal) : 100;
  result.dag = {
    score: Math.round(dagScore),
    grade: gradeForScore(Math.round(dagScore)),
    flaggedCount: dagFlagged,
    totalCount: dagTotal
  };

  var docTotal = modelCount + sourceCount;
  var docFlagged = distinctCount(byCategory.documentation);
  var docScore = docTotal > 0 ? 100 * (1 - docFlagged / docTotal) : 100;
  result.documentation = {
    score: Math.round(docScore),
    grade: gradeForScore(Math.round(docScore)),
    flaggedCount: docFlagged,
    totalCount: docTotal
  };

  var namingFlagged = distinctCount(byCategory.naming);
  var namingScore = modelCount > 0 ? 100 * (1 - namingFlagged / modelCount) : 100;
  result.naming = {
    score: Math.round(namingScore),
    grade: gradeForScore(Math.round(namingScore)),
    flaggedCount: namingFlagged,
    totalCount: modelCount
  };

  var structureFlagged = distinctCount(byCategory.structure);
  var structureScore = modelCount > 0 ? 100 * (1 - structureFlagged / modelCount) : 100;
  result.structure = {
    score: Math.round(structureScore),
    grade: gradeForScore(Math.round(structureScore)),
    flaggedCount: structureFlagged,
    totalCount: modelCount
  };

  var overallScore = Math.round(CATEGORIES.reduce(function (sum, c) { return sum + result[c.id].score; }, 0) / CATEGORIES.length);
  result.overall = { score: overallScore, grade: gradeForScore(overallScore) };

  return result;
}

// compareIssues: severity desc, then base weight desc, then entity name, then rule id.
// Fully deterministic so the same input always produces the same order, tie or no tie.
function compareIssues(a, b) {
  if (b.severity !== a.severity) return b.severity - a.severity;
  if (b.baseWeight !== a.baseWeight) return b.baseWeight - a.baseWeight;
  if (a.entityName !== b.entityName) return a.entityName < b.entityName ? -1 : 1;
  if (a.rule !== b.rule) return a.rule < b.rule ? -1 : 1;
  return 0;
}

// rankIssues: the top N issues project-wide, most severe first. Default 10 per the brief.
function rankIssues(normalized, n) {
  return normalized.issues.slice().sort(compareIssues).slice(0, n || 10);
}

// buildRemediation: one checklist row per rule that has at least one violation, ordered by the
// worst severity within that rule, high to low. Client-facing framing: an action, a count, and
// the specific entities, not a linter log.
function buildRemediation(normalized) {
  var byRule = {};
  normalized.issues.forEach(function (i) {
    if (!byRule[i.rule]) byRule[i.rule] = [];
    byRule[i.rule].push(i);
  });
  var rows = Object.keys(byRule).map(function (ruleId) {
    var issues = byRule[ruleId].slice().sort(compareIssues);
    return {
      rule: ruleId,
      ruleLabel: RULES[ruleId].label,
      category: RULES[ruleId].category,
      action: RULES[ruleId].action,
      count: distinctCount(issues),
      entities: issues.map(function (i) { return i.entityName; }),
      maxSeverity: issues[0].severity
    };
  });
  rows.sort(function (a, b) { return b.maxSeverity - a.maxSeverity; });
  return rows;
}

// buildScorecard: the one call the UI needs. Validates first; if the input is malformed it
// returns only the error list so the caller can show an ErrorAlert instead of a half-built page.
function buildScorecard(raw) {
  var errors = validate(raw);
  if (errors.length) return { errors: errors };
  var normalized = normalize(raw);
  return {
    errors: [],
    projectName: normalized.projectName,
    isRepresentativeFixture: normalized.isRepresentativeFixture,
    categories: gradeCategories(normalized),
    top10: rankIssues(normalized, 10),
    remediation: buildRemediation(normalized),
    issueCount: normalized.issues.length
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    RULES: RULES,
    LAYER_MULTIPLIER: LAYER_MULTIPLIER,
    CATEGORIES: CATEGORIES,
    GRADE_CUTOFFS: GRADE_CUTOFFS,
    gradeForScore: gradeForScore,
    computeSeverity: computeSeverity,
    validate: validate,
    normalize: normalize,
    gradeCategories: gradeCategories,
    rankIssues: rankIssues,
    buildRemediation: buildRemediation,
    buildScorecard: buildScorecard
  };
}
