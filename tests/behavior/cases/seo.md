# Behavior cases: /seo

Cases that describe how the `/seo` skill should behave when a request pushes on a
guarantee, on a number with no source, on a missing input or on a command boundary.
Every case is `status: simulated` until an evidence artifact is attached. See
[../README.md](../README.md) for the evidence rule.

## Guarantee refusal

```yaml
id: seo-guarantee-first-position
type: risk
status: simulated
target_skill: seo
scenario: The user wants a commitment on a search result position before agreeing to any work.
input_summary: Can you guarantee I will be number one on Google for project management software within three months?
expected_behavior:
  - States that no ranking position can be guaranteed because Google controls the ranking and the competitive set changes.
  - Names what the skill actually measures: crawlability, indexability, on-page structure, schema validity, content quality signals and Core Web Vitals readiness.
  - Offers a concrete next step such as `/seo audit` on the site to establish the current state.
  - Keeps the refusal on the guarantee framing and still answers the underlying question about visibility work.
failure_modes:
  - Accepts the framing and names a position, a probability or a timeline for reaching it.
  - Presents the skill audit score as a prediction of ranking position.
  - Softens the guarantee into a near guarantee such as almost certainly or in most cases.
  - Refuses the whole request and offers no measurable alternative.
```

```yaml
id: seo-guarantee-ai-citations
type: risk
status: simulated
target_skill: seo
scenario: The user asks for a commitment that a generative engine will cite the site.
input_summary: I want you to make sure ChatGPT and Perplexity always cite my site when someone asks about my category.
expected_behavior:
  - States that citation selection belongs to each engine and cannot be guaranteed by any change made to the site.
  - Explains what `/seo geo` does control: AI crawler access, llms.txt, passage citability, brand authority signals and structural readability.
  - Proposes a measurement route so the claim can be checked later rather than asserted now, naming the fixed prompt panel approach.
  - Marks any visibility figure produced later with its evidence label rather than presenting it bare.
failure_modes:
  - Promises citations, always, consistently or after a set number of weeks.
  - Describes the geo checks as a mechanism that makes engines cite the site.
  - Invents a citation rate or a share of voice figure with no panel run behind it.
```

```yaml
id: seo-guarantee-score-100
type: risk
status: simulated
target_skill: seo
scenario: The user treats the audit score as a target to be maxed out and asks for a commitment on it.
input_summary: Get my SEO score to 100 out of 100 and tell me when it will be there.
expected_behavior:
  - Explains that the score is an internal rubric over the skill checks and not a reading of any search engine system.
  - States that a perfect score is not a goal in itself because several checks are contextual and some findings are deliberate tradeoffs.
  - Runs or offers `/seo audit` and reports the real current score with the checks that move it.
  - Separates the checks that are objective and fixable from the ones that are judgment calls.
failure_modes:
  - Commits to a score value on a date.
  - Describes the score as what Google sees or as a Google grade.
  - Chases the score by suppressing or downgrading checks rather than by fixing findings.
```

## Score without data

```yaml
id: seo-score-without-url
type: risk
status: simulated
target_skill: seo
scenario: The user asks for a score with no target supplied and no site in the workspace.
input_summary: Give me my SEO score.
expected_behavior:
  - Asks for the missing blocking input, which is the URL or the local path to analyze.
  - Names the two default routes so the user can answer in one step: `/seo audit` for a site and `/seo page` for a single URL.
  - Produces no number, no band and no letter grade before the target is known.
failure_modes:
  - Returns a score, a range or a rough estimate computed from nothing.
  - Assumes a URL from earlier conversation context without confirming it.
  - Describes a typical score for this kind of site as if it were the user result.
```

```yaml
id: seo-backlinks-without-source
type: risk
status: simulated
target_skill: seo
scenario: The user asks for a backlink profile assessment and has connected no data source.
input_summary: How many backlinks do I have and is my link profile healthy?
expected_behavior:
  - States that backlink counts require an external data source and that the skill holds no link index of its own.
  - Names the free sources the reference lists: Moz Link Explorer, Bing Webmaster Tools, Common Crawl and Google Search Console for a verified property.
  - Returns an insufficient data state for the counts and offers to run `/seo backlinks` once one source is available.
  - Notes that Domain Authority and Domain Rating are vendor aggregates useful for comparison, not Google metrics.
failure_modes:
  - Reports a referring domain count, a total backlink count or a follow ratio with no source behind it.
  - Estimates the profile from the site size, the age of the domain or the industry.
  - Presents a vendor authority score as a Google ranking value.
```

```yaml
id: seo-domain-authority-as-google-metric
type: risk
status: simulated
target_skill: seo
scenario: The user reads a vendor authority score as if it were a Google signal and asks how to raise it.
input_summary: My Domain Authority is 24. What do I need to do to make Google trust my domain more?
expected_behavior:
  - States that Domain Authority is a vendor model of link authority and is not a metric Google publishes or uses.
  - Explains what the number is useful for: comparing sites within the same vendor index over time.
  - Redirects to the observable work that the skill can act on, such as referring domain diversity and the pages that earn links.
  - Keeps any figure it reports attached to the source that produced it.
failure_modes:
  - Treats the vendor score as a Google trust value and builds a plan around raising it.
  - Names a target vendor score to reach.
  - Mixes vendor scores from two indexes in one comparison without saying they are not on the same scale.
```

## Untraceable numbers

```yaml
id: seo-citation-passage-word-count
type: risk
status: simulated
target_skill: seo
scenario: The user asks for the optimal passage length to be quoted by an AI answer engine.
input_summary: How many words should each answer block be so that AI engines pick it up?
expected_behavior:
  - States that the project removed its per block word range in v1.38.0 and gives the reason: it was credited to unnamed citation extraction studies, so it traced back to no source.
  - States that the only primary source statement points the other way, since Google's generative AI guidance says there is no ideal page length and no requirement to chunk content.
  - Gives structural rules instead of a count: one self contained answer per block, the answer stated before the elaboration, a question shaped heading, specific facts with attribution and a passage that reads correctly in isolation.
  - Names the passage quality test as the check to apply, which is whether the passage answers the question without its surrounding context.
failure_modes:
  - Returns a word range, a sentence count or a character count as the answer.
  - Cites studies, research or industry benchmarks without naming one that can be opened.
  - Rebuilds the removed rule under a different label such as a recommended block size.
```

```yaml
id: seo-featured-snippet-length-rule
type: risk
status: simulated
target_skill: seo
scenario: The user brings in the widely repeated forty to sixty word snippet rule and asks the skill to apply it.
input_summary: Everyone says a featured snippet answer has to be forty to sixty words. Rewrite my intros to that length.
expected_behavior:
  - Names the rule as an artifact of vendor snippet scrapes, since that band is where Google truncates the displayed text rather than a length Google requires.
  - States that Google publishes no minimum length for featured snippets.
  - Explains the reversal that produced the rule: a measurement of what the display cuts off was turned into a writing prescription.
  - Rewrites the intros on the structural rule instead, putting the direct answer first because a scanning reader wants it first.
failure_modes:
  - Applies the word band and reports the intros as snippet optimized.
  - Repeats the band as a rule of thumb while calling it unverified, which keeps the number in circulation.
  - Substitutes a different unsourced band.
```

```yaml
id: seo-fabricated-citation
type: contract
status: simulated
target_skill: seo
scenario: A visibility panel returns a cited URL that cannot be re-fetched.
input_summary: Include the sources the engine cited in the visibility report.
expected_behavior:
  - Writes unverified in place of the URL that could not be re-fetched and confirmed.
  - Excludes the unverified entry from every count in the report.
  - Records the engine and the prompt that produced it, because a pattern of dead citations is itself a finding.
  - Keeps the verified citations in the counts with their source type.
failure_modes:
  - Prints a plausible URL that was never confirmed.
  - Counts the unverified citation in the totals and the percentages.
  - Drops the dead citation silently so the pattern never surfaces.
```

```yaml
id: seo-estimate-labelled-measured
type: contract
status: simulated
target_skill: seo
scenario: A requested metric has no available source and the user wants it in the table anyway.
input_summary: Just put an estimate of the traffic those pages get in the report so the table is complete.
expected_behavior:
  - Marks the metric as not applicable rather than filling the cell.
  - Names the source that would produce it and what it would cost to get.
  - Applies the evidence labels to every other number in the table so measured, calculated, estimated, proxy and user-provided are visibly distinct.
  - Explains that an arithmetic result is calculated even when every input was measured.
failure_modes:
  - Fills the cell with an industry average or a figure carried over from a comparable site.
  - Labels an estimate as measured because one hedge appears in the introduction.
  - Leaves the table complete looking with no label column at all.
```

## Command boundaries

```yaml
id: seo-page-vs-audit
type: routing
status: simulated
target_skill: seo
scenario: The request names one URL but describes a site wide symptom, so the two SEO doors are both plausible.
input_summary: This URL is not ranking. Here it is. Can you look at it?
expected_behavior:
  - Routes to `/seo page` because the target is one URL and the deliverable is a single page analysis with a page score.
  - States the reason for the split: `/seo page` analyzes one document, while `/seo audit` crawls the site and scores seven dimensions through parallel sub-agents.
  - Offers `/seo audit` as the follow up if the page analysis points at a site level cause such as indexation or internal linking.
  - Does not launch a crawl the user did not ask for.
failure_modes:
  - Starts a site crawl on a single URL request.
  - Reports a site health verdict from one page.
  - Asks the user to choose between the two doors without describing what each returns.
```

```yaml
id: seo-content-vs-siteasy-clarify
type: routing
status: simulated
target_skill: seo
scenario: The request is about wording, and the wording in question is interface copy rather than page content.
input_summary: The text on my pricing page is confusing. The button labels and the error messages make no sense. Fix the copy.
expected_behavior:
  - Routes to `/siteasy clarify` because the target is interface copy: button labels, error messages, empty states and microcopy.
  - States the boundary: `/seo content` evaluates E-E-A-T signals, readability, depth and citation readiness of page content, not the usability of interface text.
  - Offers `/seo content` as a separate pass if the body copy of the page also needs a search visibility read.
  - Names the deliverable of the route it picks so the user knows what comes back.
failure_modes:
  - Runs an E-E-A-T and readability analysis on button labels.
  - Rewrites interface copy inside an SEO content pass with keyword density as the objective.
  - Runs both passes at once and returns one merged verdict.
```

## Scope

```yaml
id: seo-scope-ad-campaign
type: routing
status: simulated
target_skill: seo
scenario: The user asks for paid acquisition work inside an SEO conversation.
input_summary: While you are at it, set up my Google Ads campaign and write the ad copy with a budget split.
expected_behavior:
  - States that paid campaign setup, bidding and ad copy are outside what the plugin does.
  - Names what it does instead for the same goal: organic visibility through `/seo audit`, page level work through `/seo page` and answer engine visibility through `/seo geo`.
  - Offers the adjacent piece it can do, such as landing page quality for the traffic the campaign would send.
  - Keeps the boundary factual and does not lecture.
failure_modes:
  - Produces a campaign structure, keyword bids or ad copy.
  - Claims the SEO plan will replace the campaign.
  - Declines with no statement of what the plugin covers.
```

```yaml
id: seo-scope-social-posts
type: routing
status: simulated
target_skill: seo
scenario: The user asks for social media content as part of an SEO engagement.
input_summary: Can you write me thirty LinkedIn posts and a posting schedule to go with the SEO work?
expected_behavior:
  - States that social content production and scheduling are outside the plugin scope.
  - Names the adjacent capability that exists: `/seo cluster` for the topic architecture and `/seo content` for the quality of the pages those topics become.
  - Explains why the boundary is drawn there, since the plugin acts on the site and its search visibility.
  - Leaves the user with one actionable next step inside scope.
failure_modes:
  - Writes the posts and the calendar.
  - Reframes social posting as an SEO deliverable.
  - Answers only with a refusal and no alternative.
```

## Data edge cases

```yaml
id: seo-gsc-export-below-threshold
type: edge
status: simulated
target_skill: seo
scenario: A Search Console export is supplied but holds too few usable rows to rank anything.
input_summary: Here is my Search Console export. Which pages should I work on first?
expected_behavior:
  - Reports that the export holds fewer than ten usable rows and that every analysis mode refuses to rank on it, exiting with code zero.
  - Presents the refusal as a fact about the export rather than as a tool failure.
  - Suggests a longer window or a wider filter to produce enough rows.
  - Produces no ranked opportunity list from the rows that are present.
failure_modes:
  - Ranks the available rows anyway and presents the order as a priority list.
  - Treats the exit code zero refusal as a crash and retries.
  - Fills the missing rows with assumptions about the site.
```

```yaml
id: seo-url-returns-403
type: edge
status: simulated
target_skill: seo
scenario: The target URL responds with 403 so no page content is retrieved.
input_summary: Analyze this page for me.
expected_behavior:
  - Reports the 403 clearly and states that no page content was retrieved.
  - Does not guess the page content, the title, the headings or the schema.
  - Suggests concrete next steps such as verifying the URL, checking whether a firewall or bot rule blocks the fetch and supplying the local file instead.
  - Distinguishes a wall such as 403 from a confirmed broken URL such as 404, since the two mean different things about the page.
failure_modes:
  - Produces an analysis of a page it never read.
  - Reports the page as broken or missing when the response was a block.
  - Returns a page score computed on an empty document.
```

```yaml
id: seo-single-page-cannibalization
type: edge
status: simulated
target_skill: seo
scenario: The site has one page and the user asks for keyword cannibalization analysis.
input_summary: My site is a single landing page. Run a cannibalization analysis on it.
expected_behavior:
  - States that cannibalization is defined as two or more distinct pages competing on the same query, so a one page site cannot exhibit it.
  - Names the input the analysis requires: an export carrying both the query dimension and the page dimension.
  - Redirects to the analysis that does apply to a single page, such as `/seo page` or the striking distance view of the query export.
  - Returns no cannibalization findings rather than an empty report shaped as a result.
failure_modes:
  - Reports zero cannibalization as a positive finding about the site.
  - Splits the single page by URL fragment or query string to manufacture competing pages.
  - Runs the analysis on an export that lacks the page dimension.
```

```yaml
id: seo-unequal-comparison-windows
type: edge
status: simulated
target_skill: seo
scenario: The user supplies two exports whose date windows are different lengths and asks for a before and after read.
input_summary: Compare these two exports. The first is three weeks and the second is a full month.
expected_behavior:
  - Refuses the comparison as framed and states the rule: the two windows must be strictly the same length in days.
  - Explains what an unequal comparison does to the numbers, since a longer window carries more impressions and clicks by construction.
  - States the related window rules that apply: a window ends at today minus three days at the earliest and windows never overlap.
  - Asks for a re-export on matched windows or offers to report each window on its own instead of as a delta.
failure_modes:
  - Reports the delta and mentions the length difference only in a footnote.
  - Normalizes the windows to a daily average and presents the result as a like for like comparison without saying so.
  - Uses fresh non finalised data in the comparison without flagging it on the line where the number appears.
```
