---
name: conversion-experiments
description: "A catalogue of falsifiable test hypotheses for homepages, landing pages, pricing pages and forms, each naming a metric and a mechanism, plus the cost of a form field and rules for interruption patterns."
version: 2.3.0
---

# Conversion Experiments

A catalogue of tests to draw from, not a list of changes to make. Each row pairs a test with a hypothesis that names a metric, a direction and the mechanism expected to produce the movement. A hypothesis that cannot be wrong is not in the catalogue.

Rules for using it:

- Pick from the weakest dimension named by [conversion-quality.md](conversion-quality.md). Testing the strongest part of a page wastes the traffic.
- One change per test, unless the two changes are the same idea expressed twice (a headline and its subhead).
- Write the metric down before the test runs. A test whose metric is chosen afterwards proves whatever the data happened to do.
- A test that does not move the metric is a result. Record it, because the same idea will be proposed again next quarter.

## Homepage

| Test | Hypothesis |
|---|---|
| Replace a category headline with an outcome plus a number | Scroll past the hero rises, because the visitor can judge relevance without reading further |
| Move the primary CTA above the fold on mobile | Mobile CTA clicks rise, because the first decision point no longer sits behind a scroll |
| One primary CTA instead of two at equal weight | Clicks on the intended action rise even if total clicks fall, because the choice between equals costs a decision |
| Add a subhead naming the audience by role or company size | Bounce rate falls for off-segment traffic, because visitors self-qualify before clicking |
| Replace the stock hero image with a product screenshot | Time to first interaction falls, because the visitor sees the product instead of a mood |
| Move named customer logos above the fold | CTA clicks rise for first-time visitors only, because borrowed credibility arrives before the ask |
| Cut the nav to the five most-clicked items | Clicks concentrate on the remaining items, because fewer paths compete with the primary action |
| Replace the hero carousel with one static hero | Hero CTA clicks rise, because slides two and three were never seen and movement pulled attention off the button |
| Add a captioned product video with a poster frame | CTA clicks rise among viewers, because watching answers the "too complicated" doubt |
| Put pricing in the top nav | Pricing page visits rise and time to pricing falls, because price-aware traffic stops hunting |
| Add a "who this is for and not for" line | Signup-to-qualified-lead ratio rises while raw signups fall, because unfit visitors leave earlier |
| Add a sticky header CTA once the hero scrolls away | Clicks from below-fold sections rise, because the action stays reachable after the visitor decides |
| Replace three feature cards with one worked example | Scroll depth and CTA clicks rise, because a concrete case is easier to evaluate than three abstractions |
| Show a live metric fed by a real data source | CTA clicks rise, because a checkable number carries more weight than an adjective |
| Cut the page to the sections that answer the top three objections | CTA clicks per session rise, because less scanning separates arrival from the decision |
| Move the newsletter block below the primary CTA | Primary CTA clicks rise with little loss of signups, because a secondary ask no longer intercepts the primary one |

## Landing page

| Test | Hypothesis |
|---|---|
| Repeat the ad headline verbatim in the H1 | Conversion rises for paid traffic, because the visitor confirms they arrived at the promised page |
| Remove the global nav | Conversion rises, because links competing with the single action are gone |
| Problem-agitate-solve order instead of features first, for cold traffic | Conversion rises for cold sources only, because the pitch is earned before it is made |
| Move the form above the fold instead of after the proof block | Conversion rises for warm traffic and falls for cold, because warm visitors need no convincing and cold ones do |
| Add a two-condition guarantee next to the button | Conversion rises, because the exit is visible at the moment the risk is felt |
| Replace three written quotes with one named video testimonial | Conversion rises, because a face and a name are harder to invent than a quote |
| Add a comparison table against the named alternative | Conversion rises for competitor-term traffic, because the comparison the visitor came to make is completed on the page |
| Cut the page to the sections answering the top three objections | Conversion holds and time on page falls, because the removed sections were not load-bearing |
| Add a FAQ answering the five most frequent pre-sale questions | Conversion rises and pre-sale support volume falls, because the answers arrive before the question is typed |
| Replace "Learn more" with an outcome label | Clicks rise, because the label states what happens next |
| Add a risk line under the button ("No card required") | Conversion rises, because the perceived size of the step falls |
| Show the price instead of "contact us" | Qualified leads rise and total leads fall, because unfit visitors disqualify themselves |
| Add one proof number with a date and a source above the fold | Conversion rises, because the first claim carries evidence rather than an adjective |
| Replace the illustration with a 20-second silent product loop | Conversion rises, because the visitor sees the product working without a play decision |
| Add a three-step "what happens after you click" list | Conversion rises, because uncertainty about the next screen is removed |
| Replace a long-form page with a short one for warm traffic | Conversion holds and scroll depth completion rises, because returning visitors do not need the full argument again |

## Pricing page

| Test | Hypothesis |
|---|---|
| Three tiers instead of four | Selection time falls and paid conversion rises, because a fourth column adds comparison work without adding a decision |
| Mark the middle tier as recommended | Mix shifts toward the middle tier, because an explicit default removes the burden of choosing |
| Default to annual with a monthly toggle | Annual share rises and total conversion holds, because the default carries the choice for undecided buyers |
| Show the annual saving as a currency amount, not a percentage | Annual share rises, because a currency figure is compared without arithmetic |
| Label comparison rows by job rather than by feature name | Time on the table falls and clicks rise, because buyers match rows to work they recognize |
| Add a "best for" line under each tier name | Support questions about tier choice fall, because self-selection happens on the page |
| Move the FAQ directly under the tiers | Conversion rises, because the doubts raised by the price are answered where the price is read |
| Replace "Contact sales" with a starting price plus "Contact sales" | Enterprise inquiries fall and their qualification rate rises, because unfit buyers stop before the form |
| Add a line stating the cost of the current workaround | Conversion rises, because the price is compared to a number instead of to zero |
| State the cancel policy next to each button | Conversion rises, because the exit is visible at the moment of commitment |
| Move the enterprise tier out of the comparison grid into its own row | Self-serve tier conversion rises, because the grid stops being read against a plan with no prices |
| State currency and tax handling before checkout | Checkout abandonment falls, because the total stops changing at the last step |
| State what happens when the trial ends | Trial starts rise, because the visitor knows whether a charge follows |
| Replace the static table with a two-question plan recommender | Paid conversion rises for first-time visitors, because the comparison work is done for them |
| Express usage limits in the units the buyer already measures | Support questions about limits fall and upgrade rate rises, because buyers can locate themselves on the scale |
| Add per-tier proof, one customer name each | Conversion rises on the tiers that carry proof, because the tier feels chosen by comparable buyers |

## Form

| Test | Hypothesis |
|---|---|
| Cut five fields to three | Completion rises, because each removed field removes a reason to stop |
| Split a long form into two steps with a progress indicator | Completion rises, because the first screen looks finishable and the sunk effort carries the second |
| Ask for work email only and drop the phone field | Completion rises and lead quality holds, because the phone field reads as a call the visitor did not agree to |
| Replace a 200-item country dropdown with a typeahead | Completion rises on mobile, because scrolling a long native picker is the slowest step in the form |
| Move optional fields behind a disclosure | Completion rises, because the form looks shorter without losing the data from those who want to give it |
| Validate on blur instead of only on submit | Completion rises and error resubmits fall, because errors surface while the field is still in context |
| Enable the submit button at all times instead of disabling it until complete | Completion rises, because submitting reveals what is missing instead of leaving the visitor to guess |
| Replace "Submit" with the outcome ("Get the quote") | Completion rises, because the label states what the click produces |
| Put the privacy line under the submit button | Completion rises, because the data question is answered at the moment of the decision |
| Add correct autocomplete attributes to every mapped field | Completion rises on returning visitors, because browsers and password managers fill the form |
| Use text with inputmode numeric instead of type number for codes and postal codes | Error rate falls, because the mobile keyboard matches the field and pastes stop being rejected |
| Use one OTP field with autocomplete one-time-code instead of six split inputs | Verification completion rises, because the code can be pasted and autofilled from SMS |
| Prefill known values from the query string or the session | Completion rises, because fields the visitor already answered are not asked again |
| Ask company size after signup instead of before | Signup completion rises and the field's answer rate holds, because qualification moves behind the commitment |
| Replace the CAPTCHA with a honeypot field plus rate limiting | Completion rises with no rise in spam, because the friction lands on scripts rather than on people |
| Show a single-field first step (email only) before the rest | Starts rise and completion of step two holds, because the first commitment is small enough to make without deciding |

## The cost of a form field

Three fields is the working baseline. Moving to four to six fields costs on the order of 10 to 25 percent of completions, and seven or more costs more than that.

These figures are unsourced orders of magnitude. Treat them as sliders for prioritizing a test, never as measurements. Never quote them in a report as findings. The only number that counts is the one measured on the form in question.

Ask three questions of every field before it ships:

1. Is it needed before we can help this person? A field that only matters after the account exists is not a signup field.
2. Can it be obtained another way? Enrichment from the email domain, the referring URL, the query string, the existing account record or the first session of usage.
3. Can it be asked later? Onboarding, first use and the first support contact are all cheaper places to ask than the form standing between the visitor and the product.

[form-patterns.md](form-patterns.md) already sets the threshold for splitting into multiple steps, and that threshold is the one that applies. Nothing here overrides it.

## Interruption patterns

Popups, slide-ins and banners interrupt a reader who did not ask to be interrupted. The settings below keep the interruption from destroying the session that produced it.

| Setting | Value | Reason |
|---|---|---|
| Time trigger | On the order of 30 to 60 seconds, not 5 | A visitor who has read something has a reason to answer; one who just arrived does not |
| Scroll trigger | Between 25 and 50 percent of the page | Engagement is demonstrated before the ask |
| Frequency cap | Once per session, with the dismissal stored | A second showing after a refusal reads as not listening |
| Dismissal storage | Persist the refusal, not just the impression | An impression counter resets on reload and reshows to someone who already said no |

These trigger values are orders of magnitude to calibrate on the page's own data, not measured optima.

Writing the dismiss option:

- Neutral wording only. "No thanks", "Not now", "Close".
- Never a phrasing that shames the reader into staying. "No, I do not want to grow my business" is a manipulation, not a label. It turns the reader's refusal into an admission.
- The dismiss control is a real button: keyboard reachable, focusable, labelled for screen readers and large enough to hit on a touch screen. A small grey cross in a corner is a dark pattern implemented through size.
- The accept and dismiss controls sit in the same visual family. Different weight is fine, a hidden or invisible dismiss is not.

Intrusive interstitials that cover the main content on arrival are penalized in mobile search ranking, so the interruption also costs traffic upstream of the page. See [sxo.md](../../seo/references/sxo.md).

## Cross-references

| Need | File |
|---|---|
| Which dimension to test first | [conversion-quality.md](conversion-quality.md) |
| Whether the offer needs changing before the page | [offer-diagnostic.md](offer-diagnostic.md) |
| Which objection a test should close | [objections.md](objections.md) |
| Field layout, labels and validation rules | [form-patterns.md](form-patterns.md) |
| Section order for a restructuring test | [landing-patterns.md](landing-patterns.md) |
