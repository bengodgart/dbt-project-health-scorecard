---
type: Playbook
title: Run dbt-project-health-scorecard locally
description: 'How to open dbt-project-health-scorecard, feed it real evaluator output, and run its tests.'
generated:
  by: claude-opus-5
  at: '2026-07-29T04:20:00+00:00'
status: stable
---

# Steps

1. Clone the repo:
   `git clone https://github.com/bengodgart/dbt-project-health-scorecard.git`
2. Open `index.html` in any browser. No install.
3. Click **Load the sample project** to see a full scorecard immediately, or upload your own
   normalised evaluator export.

## Producing real input

1. Add the package to `packages.yml` and run `dbt deps`:
   `dbt-labs/dbt_project_evaluator`, version `[">=0.12.0", "<0.13.0"]`.
2. Configure the folder-to-layer variables the package's own docs ask for in
   `dbt_project.yml`.
3. Run the checks: `dbt build --select package:dbt_project_evaluator`. DuckDB works fine for
   this, free and local.
4. Export each `fct_` model to JSON, for example
   `dbt show --select fct_missing_primary_key_tests --output json --limit -1 > fct_missing_primary_key_tests.json`.
5. Combine the exports into the documented shape and add your `models` and `sources` lists.
   This glue step is manual by design.
6. Upload the combined JSON on the first panel.

## Available scripts

* `node test.js` runs the test suite, 504 assertions.

## Common failures

* **The sample loads from a button but a `fetch` of the local JSON fails.** Some browsers
  block `fetch()` of a local file when `index.html` is opened directly rather than served
  over http. That is why the fixture is also embedded in `sample/sample-data.js` for the
  in-browser button. Serve the folder over `python -m http.server` if you want the JSON path.
* The sample fixture is a representative model of evaluator output, not a real run. Do not
  quote its grades as a real project's health.

## Deploying

It is a static page, so GitHub Pages hosts it for $0. `publish-guide.html` has the click path.
