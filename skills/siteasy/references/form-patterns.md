---
name: form-patterns
description: "Forms are the highest-friction surface of most products. Every additional field, every ambiguous label, every late-fire validation message increases drop-off. This reference."
version: 1.6.0
---

# Form Patterns

Forms are the highest-friction surface of most products. Every additional field, every ambiguous label, every late-fire validation message increases drop-off. This reference covers the canonical patterns: layout, labels, validation, autocomplete, error recovery, accessible authentication, and multi-step flows. Pair with [wcag-2-2.md](wcag-2-2.md), [accessibility-engineering.md](accessibility-engineering.md), and [interaction-design.md](interaction-design.md).

## Layout

### Single column is the default

The eye processes one field at a time more reliably than two. Single column reduces cognitive load and removes the alignment ambiguity of multi-column layouts.

Exceptions where side-by-side is acceptable:
- First name and last name on the same row (semantically a single concept)
- City, state or region, and postal code (geographically grouped)
- Card expiry month and year (units of one input)

Never:
- Stack independent fields side by side to "save vertical space". Vertical space is cheap, attention is not.

```css
.form-field-group { display: grid; gap: 6px; }
.form { display: grid; gap: 20px; max-width: 480px; }

@media (min-width: 600px) {
  .form-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
}
```

### Label placement

Top-aligned labels are the default. Eye movement is uniform (label → input → next label), labels do not get clipped, mobile parity is automatic.

| Placement | Use when | Avoid when |
|---|---|---|
| Top | Default for all forms | Never (this is the default) |
| Inline (left) | Dense admin forms, predictable scan path | Mobile, internationalization (label length varies) |
| Floating | Branded marketing forms, when space is constrained | High-stakes flows (label disappears, accessibility risk) |
| Placeholder-as-label | Never | Always — fails WCAG 2.5.3 and disappears on focus |

Required indicator: asterisk after the label, with an aria-label or sr-only explanation:

```html
<label for="email">Email <span aria-hidden="true">*</span><span class="sr-only">required</span></label>
<input id="email" type="email" required autocomplete="email">
```

## Autocomplete Vocabulary

Every input that maps to a known data type must declare its `autocomplete` value. Browsers and password managers depend on this for fill, and screen readers may announce hints.

Common values:

| Field | autocomplete |
|---|---|
| Given (first) name | `given-name` |
| Family (last) name | `family-name` |
| Full name | `name` |
| Email | `email` |
| Telephone | `tel` |
| Username | `username` |
| Current password | `current-password` |
| New password | `new-password` |
| One-time code | `one-time-code` |
| Street address line 1 | `address-line1` |
| City | `address-level2` |
| State or region | `address-level1` |
| Postal code | `postal-code` |
| Country | `country-name` |
| Credit card number | `cc-number` |
| Card expiry | `cc-exp` |
| Card security code | `cc-csc` |
| Birthday | `bday` |

For sign-up vs login distinction:
- Sign-up password input: `autocomplete="new-password"`
- Login password input: `autocomplete="current-password"`

Wrong values prevent password managers from working and cause accessibility regressions.

## Validation

### Validate at the right time

| Stage | Validate | Why |
|---|---|---|
| As the user types | Never for first attempt | Premature error, before the user is done |
| On blur (field exits focus) | Yes, for format-strict fields (email, phone) | User finished, immediate feedback |
| On submit | Yes, for all fields | Last line of defense |
| After a failed submit | On every change to the offending field | Help the user recover |

The pattern: silent until first submit, then live until success.

### Error messages

Rules:
- Specific. "Email is invalid" is weak. "Email must include an @ symbol" is actionable.
- Adjacent. Error appears next to the field, not at the top of the form (or both, with a link to the field).
- Persistent. The message stays until the user corrects the field.
- Polite tone. Errors are not the user's fault first, they are the system's failure to communicate.
- Accessible. `aria-describedby` on the input pointing to the error message.

```html
<div class="field" data-error="true">
  <label for="email">Email</label>
  <input id="email"
         type="email"
         autocomplete="email"
         aria-invalid="true"
         aria-describedby="email-error"
         required>
  <p id="email-error" class="error" role="alert">
    Email must include an @ symbol, for example name@example.com.
  </p>
</div>
```

### Inline success feedback

Show a checkmark or green border after a non-trivial field validates successfully (email format, postal code lookup). Reinforces progress.

Do not use success styling on every field. The pattern is for fields with friction; trivial fields (name, message) do not need it.

### Submit button states

| State | When | Visual |
|---|---|---|
| Default | Form is incomplete or unsubmitted | Solid, primary color |
| Disabled | Never (see note) | N/A |
| Loading | Submission in flight | Spinner, label "Submitting..." |
| Success | Submission accepted | Brief check then redirect or confirmation |
| Error | Submission failed | Stays in default state; error message above |

Note on disabled buttons: do not disable the submit button until the form is "complete". A disabled button gives no feedback about what is missing. Better: enable always, validate on submit, show errors.

## Input Patterns

### Input masks

Use sparingly. Useful for:
- Phone numbers (format as the user types)
- Credit card numbers (group every 4 digits)
- Date of birth (with explicit format hint)

Avoid for:
- Email (no universal format)
- Postal codes (international variance)
- Anything with a less-strict format

When using a mask, also include a visible format hint in the label or below the input:

```html
<label for="phone">Phone <span class="hint">(US format: 555-555-5555)</span></label>
<input id="phone" type="tel" autocomplete="tel" pattern="\d{3}-\d{3}-\d{4}">
```

### Numeric inputs

Always use `inputmode` to control the mobile keyboard:

```html
<input type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="postal-code">
```

`type="number"` is risky: it allows scroll wheel changes, has spinner controls, and rejects non-numeric pastes (which can confuse password manager fills). For postal codes, card numbers, and codes, prefer `type="text"` with `inputmode="numeric"`.

### File upload

Native file inputs are ugly but accessible. Style by hiding the input and pairing with a label:

```html
<label for="file-upload" class="file-upload-button">
  Choose a file
  <input id="file-upload" type="file" accept="image/png, image/jpeg, image/avif">
</label>
<output id="file-name" aria-live="polite"></output>
```

Drag-and-drop is enhancement, not replacement. The `<input type="file">` must always work. See WCAG 2.5.7 in [wcag-2-2.md](wcag-2-2.md).

### Date and time

`<input type="date">` is the cheapest accessible option. The native picker is keyboard navigable, screen-reader-friendly, and localized.

Custom date pickers are justifiable only when range selection, complex constraints, or a non-Gregorian calendar is required. They must replicate keyboard navigation: arrows to move, Page Up/Down for months, Home/End for week edges.

## Multi-Step Forms

For forms beyond 8 to 10 fields, split into steps. Each step has a clear purpose. The user sees progress.

Patterns:
- Progress indicator above the form ("Step 2 of 4")
- Each step is its own URL (`/checkout/shipping`, `/checkout/payment`). Back button works.
- Previous-step values persist when navigating back. See WCAG 3.3.7 in [wcag-2-2.md](wcag-2-2.md).
- Confirm step at the end, never auto-submit.

The progress indicator is a navigation control. Past steps are clickable, future steps are not.

## Accessible Authentication

See [wcag-2-2.md](wcag-2-2.md) for the full 3.3.8 spec. Operational rules:

- Never disable paste on password fields.
- Provide a "show password" toggle.
- Support password managers via `autocomplete="username"` and `autocomplete="current-password"`.
- Offer at least one non-cognitive alternative: magic link, OAuth, passkey, biometric.
- CAPTCHA, when used, must have an accessible audio or non-image alternative.
- Two-factor flows: allow paste of the code, and accept the code as a single field, not six split inputs (or use `autocomplete="one-time-code"` on a single field, which iOS auto-fills from SMS).

```html
<label for="otp">One-time code</label>
<input id="otp"
       type="text"
       inputmode="numeric"
       autocomplete="one-time-code"
       pattern="\d{6}"
       maxlength="6"
       required>
```

## Form Audit Checklist

| Check | Pass criteria |
|---|---|
| Layout | Single column, except for tightly grouped pairs |
| Labels | Top-aligned, always visible, never placeholder-only |
| Required indication | Asterisk plus screen-reader text |
| Autocomplete | Every applicable field has the right value |
| Validation timing | Silent before submit, live after first error |
| Error messages | Specific, adjacent, persistent, polite |
| Error association | `aria-describedby` on the input |
| Aria-invalid | Set on errored inputs |
| Aria-live | On dynamic status messages |
| Touch targets | Inputs and buttons ≥ 24x24 (≥ 44x44 on touch) |
| Submit button | Never permanently disabled; loading state visible |
| Paste enabled | All fields including passwords |
| Password manager | Works (test with 1Password, Bitwarden) |
| Browser autofill | Works (test in fresh profile) |
| Mobile keyboards | `inputmode` set where applicable |
| Multi-step persistence | Values survive back navigation |

## Anti-Patterns

- Placeholder text as label. Disappears on focus, fails contrast, fails screen readers.
- Required asterisk without `aria-label="required"`. Silent for screen readers.
- Validation that fires on every keystroke from the first character. The user sees errors before completing the field.
- Errors only at the top of the form, no inline indication. User cannot match the error to the field.
- Disabled submit button as gatekeeper. Hides what is missing.
- "Sign up with email" form that immediately asks for password, phone, postal address. Front-load value, defer collection.
- Disabling paste on password or one-time-code fields. Hostile to managers and SMS autofill.
- CAPTCHA as the only friction at signup. Hostile to disability, often broken on screen readers.
- Multi-step forms without back navigation or value persistence.
- Generic error "Something went wrong". Tell the user what, and what to try.

## Cross-References

- WCAG 2.2 criteria for forms: [wcag-2-2.md](wcag-2-2.md)
- ARIA patterns for inputs, descriptions, status: [accessibility-engineering.md](accessibility-engineering.md)
- Keyboard interaction and focus management: [interaction-design.md](interaction-design.md)
- Validation copy and error tone: [ux-writing.md](ux-writing.md)
- Cognitive load across multi-step flows: [cognitive-load.md](cognitive-load.md)
