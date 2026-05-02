---
name: planin
description: Plan and evaluate beginner-focused portfolio product work against the project rubric, identify missing features, and specify concrete copy updates. Use when the user mentions /planIn, rubric checks, missing requirements, or scenario-rebalancing product planning.
disable-model-invocation: true
---

# planIn

## Purpose
Use this skill to make project decisions and gap analyses match the stated judging rubric for beginner investors.

## Required copy update
In the "Run scenarios before reacting." section, use this text verbatim:

To prepare for when markets get scary, the Scenarios tab turns a what-if into a reviewable plan with costs, tax awareness, and what could go wrong.

## Rubric checks
Evaluate current implementation against these must-haves and report status as `implemented`, `partial`, or `missing`:

1. Unified and intuitive stocks + mutual funds dashboard with plain language and clear visual indicators.
2. Scenario-driven rebalancing for common stress events with clear, easy-to-execute actions.
3. Radical transparency: rationale, costs/fees, tax implications, and downside risks in simple language.
4. Guided onboarding for risk appetite and goals without advanced metrics jargon.
5. Technical feasibility: functioning prototype with market data integration (or realistic simulation), allocation logic, and portfolio analytics.

## Response format
When asked what is missing:

1. List **missing features first**, grouped by rubric category.
2. For each missing feature include:
   - user impact (why beginners need it),
   - minimum implementation scope,
   - priority (`P0`, `P1`, or `P2`).
3. Then list partial items that should be improved.
4. End with a short "what changed" section naming exact files edited.

## Writing style
- Keep language beginner-friendly and concrete.
- Avoid finance jargon unless you define it in plain English.
- Be explicit about trade-offs and assumptions.
