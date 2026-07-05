# dbt Project Health Scorecard

A free, single-page tool that turns `dbt-project-evaluator` results into a client-ready audit: a letter grade per category, the top 10 issues ranked by severity, and a prioritized remediation checklist. Everything runs in your browser. No data leaves the page, no accounts, no backend, and it does not run dbt for you.

> `dbt-project-evaluator` tells you which rules a model breaks. It does not tell you which three things to fix first, or hand you something you can put in front of a client. This is the reporting layer on top.

## Why this exists

`dbt-project-evaluator` is free, well-loved, and does the hard part: it runs a real set of checks against your project and writes the results into `fct_` tables. What it does not do is rank them, grade them, or turn them into something a stakeholder reads in two minutes. Users have asked the package for exactly this: richer reporting on top of the raw test output (see `dbt-labs/dbt-project-evaluator` GitHub issue #407, and the research notes this project shipped from, `research/round2/utility-gaps.md` Gap 5). This tool is that reporting layer, not a replacement for the evaluator.

The evaluator groups its checks into five categories, and this tool grades against the same five: **testing coverage**, **DAG hygiene** (fan-out, rejoins, direct-source references), **documentation coverage**, **naming conventions**, and **model structure** (staging, intermediate, marts).

## Use it

Open `index.html` in any browser (or the live version linked in the repo description). No install.

1. Click **Load the sample project** to see a full scorecard immediately, or upload your own normalized evaluator export (see "Input shape" below).
2. Read the overall grade and the five category grades, each with the count behind it.
3. Switch between **Top 10 issues** (ranked by severity), **Remediation checklist** (prioritized, one row per rule with an action), and **All flagged issues**.

## About the sample data

The live example scorecard renders from `sample/sample-evaluator-results.json`, a representative fixture modeled on a jaffle_shop-style project (20 models, 6 sources) and built to match the documented shape of `dbt-project-evaluator`'s real `fct_` result tables. **It is not the output of a real evaluator run.** It exists so a stranger can see the deliverable without owning a dbt project. `sample/sample-data.js` embeds the identical object for the in-browser "Load the sample" button (some browsers block `fetch()` of a local JSON file when `index.html` is opened directly rather than served over http); `test.js` asserts the two files never drift apart.

## Input shape

The tool expects one JSON object with a `models` array, a `sources` array, and one array per rule (named `fct_<rule_id>`, matching the evaluator's own table names) plus one aggregate object, `fct_test_coverage`. Every `fct_` key is optional; a clean project can omit all of them.

```json
{
  "project_name": "your_project",
  "models": [{ "unique_id": "model.x.stg_orders", "name": "stg_orders", "layer": "staging" }],
  "sources": [{ "unique_id": "source.x.raw.orders", "name": "raw.orders" }],
  "fct_test_coverage": { "total_models": 20, "tested_models": 14, "test_coverage_pct": 70 },
  "fct_missing_primary_key_tests": [{ "unique_id": "model.x.stg_orders", "model_name": "stg_orders", "layer": "staging" }]
}
```

See `sample/sample-evaluator-results.json` for a complete example covering all eleven rules.

### Producing real input

1. Add the package to `packages.yml` and run `dbt deps`:
   ```yaml
   packages:
     - package: dbt-labs/dbt_project_evaluator
       version: [">=0.12.0", "<0.13.0"]
   ```
2. Configure the variables the package's own docs ask for (which folders map to staging, intermediate, and marts) in `dbt_project.yml`.
3. Run the checks: `dbt build --select package:dbt_project_evaluator` against your project (DuckDB works fine for this, free and local).
4. Export each `fct_` model you want graded to JSON, for example `dbt show --select fct_missing_primary_key_tests --output json --limit -1 > fct_missing_primary_key_tests.json`, and do the same for `fct_test_coverage` and any other rule tables you have.
5. Combine the exports into the shape above (a short script mapping each table's columns to `unique_id` / `model_name` / `layer` / the rule-specific fields is the only glue code needed) and add your project's `models` and `sources` lists. This mapping step is manual by design; automating it into a hosted runner is explicitly out of scope for v1 (see PRD non-goals).
6. Upload the combined JSON on the tool's first panel.

## Severity rule

Each flagged rule violation gets a severity score: **base weight (per rule) times a layer multiplier**, plus a small bonus for the two rules that carry a magnitude (how many children a fanout affects).

| Rule | Category | Base weight | Why this weight |
|---|---|---|---|
| Missing primary key tests | Testing | 9 | A silent duplicate can inflate every downstream sum. |
| Direct join to a raw source | DAG hygiene | 8 | Bypasses the staging layer; breaks the single cleaned definition of that source. |
| Staging model depends on a mart or intermediate model | DAG hygiene | 8 | A backwards dependency; the layered DAG only works one direction. |
| Upstream concepts rejoined more than once | DAG hygiene | 6 | Redundant join paths, a common source of double-counting. |
| Model has no description | Documentation | 5 | Nobody downstream can tell what it is for. |
| Model fans out to too many children | DAG hygiene | 5 (+ up to 3) | One change has to be repeated in every child. |
| Source read directly by too many models | DAG hygiene | 5 (+ up to 3) | A schema change upstream breaks every reader at once. |
| Model has no recorded upstream dependency | DAG hygiene | 4 | Possibly orphaned; lineage is broken either way. |
| Source has no description | Documentation | 4 | Same problem, one layer further upstream. |
| Model name does not match its layer prefix | Naming | 3 | The name lies about what the model is. |
| Model file is not in the folder matching its layer | Structure | 3 | The file layout lies about what the model is. |

Layer multiplier: **marts x3, intermediate x2, staging or source x1.** A mart is client-facing and sits at the end of the DAG, so a problem there has the widest blast radius; the same rule on a staging model, closest to the source, has the narrowest. The magnitude bonus for the two fanout rules is `min(3, floor(children / 3))`, so a fanout of 9 or more maxes the bonus instead of dominating the score.

The top 10 issues are every flagged violation, project-wide, sorted by severity (highest first). Ties break by base weight, then entity name, then rule id, so the same input always produces the same order. The remediation checklist groups issues by rule and orders the rules by their worst severity, highest first, so the first item you check off is always the one with the highest blast radius.

## Grading

Each category scores 0 to 100 and maps to a standard school letter grade: A at 90+, B at 80+, C at 70+, D at 60+, F below that. Testing coverage blends two signals, the evaluator's own aggregate `test_coverage_pct` and the fraction of models missing a primary key test, because a project can have broad test coverage and still be missing the one test that would catch a join fanout. Every other category is a plain violation rate: `100 x (1 - flagged entities / total entities checked)`. The overall grade is the average of the five category scores. All of this is in `scorecard.js`; nothing is hidden in a spreadsheet.

## Worked example

Running the sample fixture produces this scorecard:

- **Overall: B (80).**
- Testing coverage: **C (78)**, 3 of 20 models flagged.
- DAG hygiene: **C (73)**, 7 of 26 models/sources flagged.
- Documentation coverage: **B (81)**, 5 of 26 models/sources flagged.
- Naming conventions: **B (80)**, 4 of 20 models flagged.
- Model structure: **A (90)**, 2 of 20 models flagged.

Top of the ranked list: `fct_order_items` missing its primary key tests (severity 27, the highest base weight on a mart), then two tied direct-joins-to-source on marts (severity 24 each), then a second missing-primary-key-test on an intermediate model (severity 18).

## Run the tests

```bash
node test.js
```

504 assertions cover the rule metadata, the severity math, the sample fixture's exact grades and top-10 order, an all-clean fixture (grades A across the board) and an all-broken fixture (grades F across the board) as a boundary check, the remediation checklist's priority order, malformed-input handling, and an em-dash sweep over every generated string. No dependencies.

## How it works

- `scorecard.js` holds the rule table, the severity math, and the pure functions that validate, grade, rank, and build the remediation checklist. It runs in both the browser and Node, so the same logic that renders the page is the logic the tests check.
- `app.js` is the DOM wiring. `index.html` and `styles.css` are the page.
- `sample/` holds the fixture, in both JSON and embedded-JS form.

## Tech notes

Zero dependencies, zero build step, static hosting. Your data never leaves the browser because there is no server to send it to. This tool does not connect to a warehouse, does not run dbt, and does not modify your project; it only reads the JSON you give it.

## License

MIT, see [LICENSE](LICENSE).
