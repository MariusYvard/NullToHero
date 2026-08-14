---
name: objections
description: "Fifteen recurring buyer objections with the reason behind each one, the answer, the proof required and the page element that owns it, plus bonuses as objection closers and a method for finding the objections a business actually receives."
version: 2.3.0
---

# Objections

An objection is a doubt that survives the page. Every doubt needs one element that owns it; a doubt with no owner is unhandled, whatever the rest of the page says.

Two rules make this file usable rather than decorative:

- The stated objection is rarely the real one. "Too expensive" usually means the value was not made computable, not that the number is high.
- One element per objection. If the answer to a doubt is spread across three sections, the visitor finds none of them.

## Fifteen recurring objections

Segment marks where the objection is most common: B2B for business software, B2C for consumer purchases, both when it appears in either.

| Segment | Objection as stated | What is behind it | One-line answer | Proof to supply | Page element that owns it |
|---|---|---|---|---|---|
| Both | It costs too much | The value is not computable, so the price has nothing to sit against | Compare the price to what the current workaround costs per month | The cost of the status quo, itemized with the buyer's own units | Pricing page, cost-of-inaction line above the tiers |
| Both | I will decide later | Nothing distinguishes today from next month | Name what the delay costs, or give a real deadline | An honest limit if one exists, otherwise the accumulating cost of waiting | Final CTA block, with the cost of delay stated once |
| B2B | We already use X | Switching cost plus the sunk cost of the current setup | Say what carries over and what does not | Import path, export guarantee, a fair side-by-side table | Comparison table plus a migration section |
| B2B | It will take too long to set up | The buyer expects a project, not a purchase | State time to first result and who does the work | A dated onboarding timeline, named implementation owner | Migration or onboarding section with real durations |
| B2B | Will this work for a company like ours | The buyer does not see itself in the examples | Show a customer of the same size, sector and stack | One case study that matches the segment | Segmented proof block, one case per segment |
| B2B | I need approval from someone else | The buyer lacks the internal argument, not the authority | Supply the argument in a form they can forward | A one-page business case, written pricing, a shareable quote | Downloadable summary or a "send this to your team" action |
| B2B | Is our data safe | Compliance exposure and personal reputational risk | Name the certification, the hosting region and the subprocessors | Audit report, data processing agreement, subprocessor list | Security or trust page, linked from pricing and footer |
| B2B | Does it integrate with our stack | One missing integration kills the project | List integrations by name and state the API fallback | Integration directory, API documentation link | Integrations section with a search or filter |
| Both | What if it does not work | Fear of an unrecoverable loss | State the exit and its conditions in one sentence | The guarantee text with at most two conditions | Guarantee block in body copy above the buy button |
| Both | I do not believe these numbers | The figure has no source and no date | Date the number and name the sample | Methodology note, sample size, measurement window | Footnote attached to the figure itself |
| Both | Can I cancel | Fear of a contract that is easier to enter than to leave | State the cancel path in one sentence | Self-serve cancel, no call required, data export | FAQ entry plus a line next to each pricing button |
| B2C | Will it fit me | Uncertainty about size, taste or compatibility | Give a way to be sure before ordering, and a way out after | Size guide with real measurements, free returns window | Product page sizing block plus the returns policy |
| B2C | What does delivery cost and when does it arrive | Total cost appears too late in checkout | Show the delivered price and date before the cart | Delivery cost table by region, dated estimate | Delivery block on the product page, above the add-to-cart |
| B2C | Is this a real business | Fraud risk on an unfamiliar domain | Prove a company exists behind the domain | Registered address, working phone, returns policy, payment marks | Footer identity block plus a linked reviews profile |
| Both | I tried something like this and it failed | The buyer pattern-matched to a past failure | Name why that approach failed and what differs mechanically | An explanation of the mechanism, not a feature list | How-it-works section placed before the pricing |

Reading the table: the last column is the deliverable. When auditing, mark each row handled, partially handled or absent. Name the element for each handled row. A row whose answer exists only in a chatbot or a support article counts as absent.

## Placing the answers

Not every objection earns a section. Sort the mapped rows into three tiers before deciding what to build.

| Tier | Test | Where the answer goes |
|---|---|---|
| Blocking | The visitor will not click the primary action while this doubt stands | Body copy, before the ask, in its own block |
| Slowing | The visitor will click but hesitates, or leaves and comes back to check | FAQ entry, or one line attached to the element it concerns |
| Rare | Fewer than one visitor in twenty raises it | Documentation or a support article, linked rather than inlined |

Rules:

- A page carries at most three blocking answers as their own sections. A fourth blocking objection is a sign that the offer has a problem the page cannot solve; go back to [offer-diagnostic.md](offer-diagnostic.md).
- A blocking objection answered in the FAQ is answered too late. The FAQ is read after the decision or not at all.
- The same objection can be blocking for one segment and slowing for another. Write the blocking version in body copy and leave the FAQ entry for the other segment.
- Tier assignment is a claim about this audience, so record which of the three discovery sources below supports it.

## Bonuses close named objections

A bonus is not an extra. It is the closing of one objection that the core deliverable leaves open. A bonus that does not map to an objection is padding, and buyers read padding as a signal that the core is thin.

Four functions:

| Function | What it removes | Typical form |
|---|---|---|
| Speed bonus | The wait before the first visible result | Done-for-you setup, prebuilt templates, an import service |
| Confidence bonus | Doubt that it works for this buyer | A live review session, a benchmark against their own data, an audit of their current state |
| Unblocking bonus | A prerequisite the buyer does not have | A starter dataset, a written policy, a trained operator, a migration script |
| Decision bonus | The difficulty of selling the decision to someone else | A business case template, a written quote, a summary for a partner or a manager |

Mapping from the table above:

| Objection | Bonus function | Example |
|---|---|---|
| It will take too long to set up | Speed | Migration handled in the first week, at no extra fee |
| Will this work for a company like ours | Confidence | A first-month review against their numbers |
| I need approval from someone else | Decision | A one-page internal case, prefilled with their figures |
| We already use X | Unblocking | An import script for the competitor's export format |
| I tried something like this and it failed | Confidence | A diagnosis of why the previous attempt failed, delivered before purchase |
| I do not have the skills for this | Unblocking | A template library covering the ten most common setups |

Calculation rule: the total stated value of the bonus stack stays under two times the price. Above that the arithmetic stops being believed, and disbelief spreads to the price and the proof. Two or three bonuses with defensible values beat a long stack with rounded ones.

Corollary: a bonus with a stated value must be purchasable separately at that value, or the value is not stated at all.

## Finding the real objections

Do not invent the list. A business already receives it in writing.

1. Read the exits. Pull the last 50 refund requests, cancellation reasons and churn survey answers, in the customer's own words. The reason given at the exit is the objection the page failed to close, stated by someone with no reason to be polite.
2. Read the pre-sale questions. Pull the support inbox, live chat transcripts, sales call notes and replies to sales emails from the last quarter. Count each distinct question. Rank by frequency multiplied by the deal size it appeared in, then keep the top five.
3. Ask both sides. Ask five recent buyers what almost stopped them. Ask five people who evaluated and did not buy what stopped them. The two lists rarely match. The second is the one the page needs, and it is the one nobody collects.

Then map each surviving objection to one page element using the last column of the table. An objection with no owning element is the finding; the missing element is the fix.

## Objections arrive in a different order per source

One page receives different first doubts depending on where the visitor came from. Check the mapping per source, not per page.

| Traffic source | The objection that arrives first |
|---|---|
| Search on a problem term | Is this the right kind of solution at all, and is this a real business |
| Search on a competitor term | We already use X, what carries over, what does switching cost |
| Paid ad | Does this page say what the ad said, and what is the actual price |
| Referral or word of mouth | Will it work for a company like ours, can I cancel |
| Email to an existing list | Why now, and what changed since the last time I looked |

Where one source carries most of the traffic, its first objection is the one that earns a body-copy answer, and the others move to the FAQ.

## Handoff to the claims sub-agent

`agents/siteasy-agent-claims.md` has to report the strongest objection the page leaves unanswered, and it starts with no list. This file is that list.

Procedure for the agent:

1. Run the fifteen rows against the page. Mark each handled, partial or absent.
2. Drop the rows whose segment does not apply to this page.
3. Rank the absent rows by the size of the ask (price, contract length, data exposure) and by how directly the row matches the page's stated audience.
4. Report the top row in the `Strongest unanswered objection` line, with the missing element named as the fix.

Boundary between the two: the agent scores whether claims carry evidence. This file scores whether a doubt has an owning element. A page can carry evidence for every claim and still leave the switching objection untouched. Count each finding once, in the dimension that owns it.

## Cross-references

| Need | File |
|---|---|
| Whether the offer itself holds | [offer-diagnostic.md](offer-diagnostic.md) |
| Guarantee types and their conditions | [offer-diagnostic.md](offer-diagnostic.md) |
| Where objection-handling sections sit in the page | [landing-patterns.md](landing-patterns.md) |
| Scoring the page after the mapping | [conversion-quality.md](conversion-quality.md) |
| Wording of the answers | [ux-writing.md](ux-writing.md) |
