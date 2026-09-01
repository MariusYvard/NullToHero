---
name: clarify
description: "Identify and improve unclear, confusing, or poorly written interface text to make the product easier to understand and use."
version: 1.7.0
---

> **Additional context needed**: audience technical level and users' mental state in context.

Identify and improve unclear, confusing, or poorly written interface text to make the product easier to understand and use.


---

## Inventory before you rewrite

You cannot improve what you have not listed, and the list is what turns "the copy is
confusing" into a finite job. Walk the product and put every visible string in three
columns: where it is, what it says now, and what the reader is trying to do there. The
inconsistencies surface on their own, and they are usually the loudest problem: "Valider",
"OK" and "Confirmer" for the same action, on three screens.

Then do not rewrite all of it. Two lists decide the order, and both already exist:

- The most visited screens. Sign-up, sign-in, the primary action, checkout.
- The most frequent errors. Your logs have the ranking; you do not have to guess it.

Three messages rewritten well beat fifty rewritten approximately, and the first three tell
you whether the voice you picked survives contact with a real screen.

## Assess Current Copy

Before rewriting anything, establish two things the text itself cannot tell you:

- **Audience and mental state.** A stressed reader in an error and a confident reader in a success need different registers. The same sentence is right in one and wrong in the other.
- **The constraint.** Character limits, brand voice, and localization decide what "shorter" is allowed to mean.

**CRITICAL**: Clear copy helps users succeed. Unclear copy creates frustration, errors, and support tickets.

## Plan Copy Improvements

- **Primary message**: What's the ONE thing users need to know?
- **Action needed**: What should users do next (if anything)?
- **Tone**: How should this feel? (Helpful? Apologetic? Encouraging?)

**IMPORTANT**: Good UX writing is invisible. Users should understand immediately without noticing the words.

## Improve Copy Systematically

Work in passes, one dimension at a time, and re-check the earlier passes after each one.
A single sweep that tries to fix clarity, proof and emotion at once fixes none of them:
tightening a sentence for clarity often removes the specific number that was carrying the
proof, which is exactly what the return pass is for.

| Pass | Question it asks | What it kills |
|------|------------------|---------------|
| 1. Clarity | Can a first-time reader say what this is, in their own words | Jargon, abstraction, sentences carrying two ideas |
| 2. Voice and tone | Does this sound like the same product throughout | Register drift, borrowed startup cadence |
| 3. So what | For each claim, ask "ok, and so what" until a benefit answers | Features stated with no consequence attached |
| 4. Prove it | What makes this believable to someone who does not trust us yet | Adjectives standing in for evidence |
| 5. Specificity | Replace every vague quantity with the real one | "Save time" where "save 4 hours a week" was available |
| 6. Emotion | Does the copy name the frustration the reader actually has | Neutral description of a painful situation |
| 7. Zero risk | What is the reader afraid of, and does the page answer it | Unanswered objections next to the buy button |

After each pass, return to the passes before it. The sequence matters: specificity added
in pass 5 frequently breaks the voice set in pass 2.

### Knowing when to stop

The passes have no natural end, so give them one that is not your own judgement. Show a
screen to five readers from outside the project for five seconds and ask what the main
button does. Five is enough to surface most of the confusion and, more usefully, to settle
the arguments of taste that otherwise run forever. Where they hesitate is the list of what
to rewrite next; where they answer instantly, stop editing.

Passes 3, 4 and 7 have their own references. The claim and evidence work belongs to
[../../../agents/siteasy-agent-claims.md](../../../agents/siteasy-agent-claims.md), the
objection inventory to [objections.md](objections.md), and the risk reversal to
[offer-diagnostic.md](offer-diagnostic.md).



The pattern-by-pattern catalogue, with templates and Bad/Good pairs for button labels,
error messages, empty states, loading states, confirmations, terminology and translation
expansion, is [ux-writing.md](ux-writing.md). Label placement, required indicators and the
placeholder-as-label prohibition are in [form-patterns.md](form-patterns.md); wayfinding
labels and breadcrumbs in [information-architecture.md](information-architecture.md).
What follows is the operating summary.

## UX copy patterns

Microcopy is interface. The same rules every time: clear, concise, consistent, useful, human.

### Error messages

Structure every error as what happened, why, and how to fix it: "Payment declined. Your bank rejected the charge. Try another card or contact your bank." Not "Error 402". Name the problem in the reader's terms, never the system's.

Two rules that decide whether the rewrite lands. Never blame the reader: "You entered an invalid value" becomes "The expected format is DD/MM/YYYY". And render the message beside the field it belongs to, not in a summary at the top of the form, which is registry rule 23 and is checked by the rendered probe.

### Calls to action

Label the outcome, not the mechanism: "Start the trial", "Send the invite", "Delete account". Avoid "Submit", "OK" and "Click here". Verb plus object, two to four words. The test is to cover the rest of the screen: if the button still reads unambiguously on its own, it is done. One primary button per screen.

### Empty states

An empty state is a first impression, not a dead end. Say what goes here, why it is empty, and the one action that fills it: "No projects yet. Create your first to get started." plus the button.

### Confirmations and destructive actions

Name the specific consequence and object: "Delete the Q3 report? This cannot be undone." The confirming button repeats the verb ("Delete"), never a generic "Yes".

### Help text and hints

Help text earns its place by adding what the label cannot say: the reason you are asking, or
the format expected. Restating the label in a tooltip is noise that trains readers to skip
every tooltip you write.

### Tone

Write like a competent person, not a mascot and not a manual. Drop filler ("please note that", "in order to"). Match the moment: plain in errors, warmer in success, never jokey in a failure the reader did not cause.

Write the rules down once, on one page, or you will relitigate them on every screen: the address form, the tense, and the twenty product terms with their single permitted wording. A term that only exists in your database has no business on screen.

Where the additions above came from: the blind evaluation of 2026-08-05 recorded three draws in which the reader given nothing went further than the reader given this file, every time on operational specifics. The inventory, the triage by traffic and by error frequency, the stopping test at five readers, the button sizing and the one-page rule are what the control produced and this file lacked. Recorded in `tools/eval-corpus/results.json` under `clarify-confusing-copy`.

## Spotting machine-written copy

The rhythm-level tells are below. The lexical tells, with a penalty per pattern and a
banded score, are in [slop-patterns.md](slop-patterns.md), and the deterministic
measurement of sentence rhythm and phrase density is
[../../../tools/content/score.mjs](../../../tools/content/score.mjs). This section is the
short read; that pair is the scored version.


Generated copy has tells. When auditing or editing site text, watch for and remove these:

- Uniform sentence rhythm, every sentence the same length. Break it with a short one.
- Repetitive openings, many sentences starting with the same word ("Moreover", "Additionally"). Vary the first word.
- Overused connectors ("moreover", "furthermore", "in addition", "as such") on most sentences. Cut the mechanical ones, keep the load-bearing ones.
- The rule of three on autopilot, where every list is three items. Vary it to one, two or four.
- Contrastive amplification, "not only X but also Y". Replace with a direct statement.
- A two-word phrase repeated several times on one page. Reword the reprises.

These are form, not fact. Fix the wording, never the meaning, and re-read aloud: copy that sounds like a person passes.
