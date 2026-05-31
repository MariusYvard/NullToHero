---
name: ux-research
description: "Research is the foundation that prevents design from collapsing into self-projection. The first axiom: You ≠ User. Your mental models, your fluency with the tool, your aesthetic."
version: 1.6.0
---

# UX Research Methodology

Research is the foundation that prevents design from collapsing into self-projection. The first axiom: **You ≠ User**. Your mental models, your fluency with the tool, your aesthetic preferences do not generalize. Designing without research is designing for yourself.

Use this reference whenever a project is starting, when usability is debated, when the team disagrees about what users want, or when scope creeps based on opinion rather than evidence. Pair with [personas.md](personas.md), [journey-mapping.md](journey-mapping.md), [information-architecture.md](information-architecture.md), and [shape.md](shape.md).

## Research Phases

Pick the method that matches the maturity of the project.

| Phase | Goal | Method examples | Typical output |
|---|---|---|---|
| Discovery | Understand the problem space | Field studies, diary studies, stakeholder interviews | Problem statements, opportunity map |
| Exploration | Frame solutions | Concept testing, competitive analysis, card sorting | Concept directions, IA hypotheses |
| Testing | Validate execution | Usability tests, A/B tests, tree testing, click tests | Pass/fail criteria, friction inventory |
| Listening | Monitor in production | Analytics, session replays, surveys, NPS, support tickets | Trend reports, regression flags |

A project that skips Discovery and jumps to Testing tests the wrong thing. A project that skips Listening ships then goes blind.

## Qualitative vs Quantitative

Both are required. Used alone, each lies.

| Approach | Answers | When it lies | Sample size |
|---|---|---|---|
| Qualitative | Why and how users behave | When generalized beyond observed conditions | 5 to 12 per segment |
| Quantitative | What and how many | When the metric is decoupled from context | 100+ for statistical confidence |

The classic Nielsen finding: testing with 5 users surfaces approximately 85 percent of usability problems. The marginal value of users 6 through 15 drops sharply. Run multiple rounds of 5 rather than one round of 20.

## Core Methods

### Usability Testing

Place a real or representative user in front of the interface, give them a task, observe.

Protocol:
1. Define 3 to 5 representative tasks. Phrase as goals, not click paths. "Find the cheapest flight to Lisbon in March" beats "Click search, then filter by price".
2. Recruit 5 users matching the target segment.
3. Run think-aloud. Ask them to verbalize. Do not lead.
4. Record screen and audio with consent. Watch later, do not multitask during the session.
5. Score per task: completion, time, errors, satisfaction. Tag friction moments with timestamps.
6. Synthesize. Group friction by severity (blocker, major, minor, cosmetic).

Severity scale (Nielsen):
- 0: Not a usability problem.
- 1: Cosmetic. Fix if budget permits.
- 2: Minor. Low priority.
- 3: Major. High priority.
- 4: Blocker. Fix before release.

### Interviews

Semi-structured conversations. Goal: surface mental models, not opinions.

Rules:
- Open with broad context questions, narrow toward the product.
- Ask about the last time a behavior occurred ("Tell me about the last time you booked a flight"), never about hypothetical futures ("Would you use a feature that...").
- Five Whys: drill into causes, not symptoms.
- Silence is a tool. After an answer, pause 3 seconds before the next question. Users fill the silence with their richest material.
- Record verbatim quotes for personas and journey maps.

### Card Sorting

Users group content cards into categories that make sense to them. Output: a candidate Information Architecture.

Modes:
- Open: users define their own category names. Best for novel domains.
- Closed: users sort into predefined categories. Best for validating an existing IA.
- Hybrid: predefined categories with the option to add new ones.

Sample size: 15 to 30 participants for statistically clean dendrograms.

Tools: Optimal Workshop, Maze, Miro for in-person.

### Tree Testing

The inverse of card sorting. Users navigate a stripped-down site map (text only, no visuals) to find specific items. Validates whether the IA actually delivers.

Sample size: 50+ for confidence.

Pass thresholds:
- Directness: 70 percent of users find the target on the first attempt without backtracking.
- Success: 85 percent of users find the target eventually.

### Surveys

Quantitative listening. Use when you need scale or trend tracking.

Rules:
- Maximum 10 questions. Drop-off compounds past 5 minutes.
- Avoid leading language ("How much do you love...").
- Use Likert scales (1 to 5 or 1 to 7) for attitudes.
- Always include one open text question for the surprises.
- Calibrate against an existing benchmark (SUS, NPS, CSAT) when comparison matters.

System Usability Scale (SUS) score interpretation:
- Above 80: excellent
- 68 to 80: good
- 51 to 68: marginal
- Below 51: failing

### A/B Testing

Quantitative validation in production. Use for definitive answers on measurable outcomes (conversion, retention, completion).

Requirements:
- Hypothesis stated as null vs alternate, with the metric and direction.
- Minimum detectable effect calculated before launch.
- Sample size meeting 80 percent statistical power, 95 percent confidence.
- Pre-registered duration (one full business cycle minimum, usually 14 days).
- No peeking. Decisions made on the final readout, not interim.

A/B testing reveals what wins, never why. Pair with qualitative follow-up to understand the mechanism.

## The Recruitment Trap

The fastest way to invalidate research: recruit the wrong users. Tests with employees, friends, or "people who happen to be available" produce data that confirms what the team already believes.

Recruit through:
- Existing user base, filtered by segment criteria (active in last 30 days, completed key action).
- Specialized panels (UserTesting, Respondent, dscout).
- Targeted outreach (LinkedIn, Reddit, niche communities) with screener surveys.

A good screener has 5 to 7 questions and disqualifies based on observable criteria, not self-report. "How often do you use [competitor]?" beats "Are you a power user?".

## Synthesis Outputs

Research is only useful when it produces decisions. Standard synthesis artifacts:

| Artifact | Purpose | Audience |
|---|---|---|
| Affinity diagram | Cluster raw observations into themes | Researchers, designers |
| Persona | Crystallize a recurring user archetype | Whole team |
| Empathy map | Externalize what a persona says, thinks, feels, does | Designers, PMs |
| Journey map | Sequence emotions and friction across a flow | Designers, support, ops |
| Service blueprint | Cross-functional view including backstage | PMs, ops, engineering |
| Heuristic scorecard | Quantitative review against established laws | Team, leadership |
| Friction inventory | Sorted list of usability problems with severity | Engineering, product |

For persona and mapping methods, see [personas.md](personas.md) and [journey-mapping.md](journey-mapping.md).

## Cost of Interaction

Every research session should measure or estimate the **cost of interaction**: the total mental and physical effort a user spends to reach their goal. Costs accumulate as:
- Clicks and taps
- Scrolls and swipes
- Decisions (number of visible choices)
- Wait time (latency, loading states)
- Recall effort (anything the user must remember)
- Error recovery

Reducing cost is the operational definition of UX improvement. A redesign that adds delight but adds a click is a regression.

## Ethics

Always:
- Obtain informed consent before recording.
- Pay participants fairly (incentive scaled to session length and difficulty).
- Anonymize raw data in reports unless the participant consents to attribution.
- Allow withdrawal at any time without penalty.
- Disclose conflicts of interest (whether the participant has a stake in outcomes).

Never:
- Deceive participants about the purpose of the study without ethics board approval.
- Use raw recordings as marketing material.
- Cherry-pick quotes that confirm the team's prior beliefs.

## Anti-Patterns

- "We tested with the team, it works." Internal tests are not user tests.
- "We surveyed 500 users." Sample size without sampling discipline is noise.
- "The metric went up, ship it." Metric movement without mechanism is fragile.
- "Users said they want X." Stated preferences do not predict revealed behavior.
- One round of testing pre-launch, none after. Listening is half the discipline.

## Cross-References

- Persona archetypes for evaluation: [personas.md](personas.md)
- Journey, empathy, blueprint methods: [journey-mapping.md](journey-mapping.md)
- IA validation techniques: [information-architecture.md](information-architecture.md)
- Friction inventory and heuristic scoring: [heuristics-scoring.md](heuristics-scoring.md)
- Shape brief and design discovery: [shape.md](shape.md)
