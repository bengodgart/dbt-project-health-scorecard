---
type: Tech Stack
title: dbt-project-health-scorecard stack
description: 'Frameworks, storage and services dbt-project-health-scorecard runs on.'
runtime: Browser
framework: 'None. Plain HTML, CSS and JavaScript.'
build: 'None. Zero dependencies and zero build step.'
storage: 'None. It reads only the JSON you hand it and there is no backend.'
hosting: GitHub Pages
tests: 'node test.js, 504 assertions'
generated:
  by: claude-opus-5
  at: '2026-07-29T04:24:12+00:00'
status: stable
---

# Stack

* **Runtime**: the browser. No warehouse connection, no dbt execution, no project mutation.
  It only reads the JSON you give it.
* **Framework**: none. Plain HTML, CSS and JavaScript.
* **Build**: none. Zero dependencies, zero build step, static hosting.
* **Files that carry the logic**: `scorecard.js` holds the rule table, the severity maths and
  the pure functions that validate, grade, rank and build the remediation checklist. `app.js`
  is the DOM wiring, `index.html` and `styles.css` are the page, `sample/` holds the fixture.
* **Input shape**: one JSON object with a `models` array, a `sources` array, one array per
  rule named `fct_<rule_id>` matching the evaluator's own table names, and an aggregate
  `fct_test_coverage` object. Every `fct_` key is optional.
* **Hosting**: GitHub Pages.
* **Tests**: `node test.js`, 504 assertions covering rule metadata, severity maths, the
  sample fixture's exact grades and top-10 order, all-clean and all-broken boundary
  fixtures, checklist priority order, malformed input, and an em-dash sweep.

## Notes

`scorecard.js` runs in both the browser and Node, so the logic that renders the page is the
logic the tests check. The fixture exists twice, as JSON and embedded in `sample-data.js`,
and a test asserts the two never drift apart.
