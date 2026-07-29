---
type: Product
title: dbt-project-health-scorecard
description: 'Turn dbt-project-evaluator results into a client-ready audit: a letter grade per category, the top 10 issues ranked by severity, and a prioritised remediation checklist. Runs entirely in the browser.'
domain: Data & Analytics
users: 'Analytics engineers and consultants who need to put a dbt project audit in front of a client or a lead.'
lifecycle: shipped
live_url: https://bengodgart.github.io/dbt-project-health-scorecard/
pricing: 'Free. MIT licensed, no accounts.'
generated:
  by: claude-opus-5
  at: '2026-07-29T04:20:00+00:00'
status: stable
resource: https://github.com/bengodgart/dbt-project-health-scorecard.git
---

# dbt-project-health-scorecard

Turn `dbt-project-evaluator` results into a client-ready audit: a letter grade per category,
the top 10 issues ranked by severity, and a prioritised remediation checklist. Runs entirely
in the browser.

## Who it is for

Analytics engineers and consultants who need to put a dbt project audit in front of a client
or a lead.

## What problem it solves

`dbt-project-evaluator` does the hard part: it runs a real set of checks and writes results
into `fct_` tables. What it does not do is rank them, grade them, or turn them into
something a stakeholder reads in two minutes. Users have asked the package for exactly that
(dbt-labs/dbt-project-evaluator issue #407). This is the reporting layer on top, not a
replacement for the evaluator, and it does not run dbt for you.

It grades the same five categories the evaluator groups its checks into: testing coverage,
DAG hygiene, documentation coverage, naming conventions, and model structure. Severity is
base weight per rule times a layer multiplier (marts x3, intermediate x2, staging or source
x1), plus a bounded magnitude bonus for the two fanout rules, so a problem in a client-facing
mart outranks the same rule on a staging model. Ties break deterministically, so the same
input always produces the same order.

## Current state

Shipped and public on GitHub Pages. The grading maths lives in `scorecard.js`; nothing is
hidden in a spreadsheet.

Producing real input is a manual mapping step by design: run the evaluator, export each
`fct_` table to JSON, and combine them into the documented shape. Automating that into a
hosted runner is an explicit non-goal in the PRD.

The sample scorecard renders from `sample/sample-evaluator-results.json`, a fixture modelled
on a jaffle_shop-style project and built to match the documented shape of the evaluator's
real result tables. It is **not** the output of a real evaluator run. It exists so a stranger
can see the deliverable without owning a dbt project.
