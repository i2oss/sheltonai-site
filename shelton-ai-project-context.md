# Shelton.ai / rwshelton.com — Project Context Handoff

This file is a handoff summary for continuing work on Ross Shelton's personal site
in a new Claude Code / Claude chat, without needing the full prior conversation history.

## What this project is

A fully custom-coded, single-page personal site for Ross Shelton (rwshelton.com),
dark terminal/hacker aesthetic, branded "Shelton.ai" — a fictional/aspirational AI
persona terminal that acts as the hero centerpiece of the page. The hero section
contains a terminal-styled Q&A widget that currently displays a **hardcoded, typed-out
canned answer** — it is NOT yet wired to a real LLM. That is the next major feature.

## Canonical files

- **`/home/claude/site-onepage.html`** — THE canonical master file. All future edits
  should be made here first. Single self-contained HTML file: all CSS and JS inline,
  Google Fonts via `<link>`. File is large (~370KB) — the Read tool chokes on it even
  with small offset/limit in some cases, so **use Grep with `-n -A -B` context flags**
  to inspect specific regions, and the `Edit` tool (or a Python script with
  `assert old_string in html` + `.replace(old, new, 1)`) to make changes.
- **`/home/claude/site-artifact.html`** — a stripped copy (no `<!DOCTYPE>`, `<html>`,
  `<head>`, `<body>` wrapper tags — content starts directly with `<title>`) regenerated
  from `site-onepage.html` on every change via a small Python script that dynamically
  locates `</style>`, `<body>`, `</body>` line indices (they shift as the file grows).
  Published via the `Artifact` tool to a persistent URL:
  `https://claude.ai/artifact/T56B1zNdCHsdhkSCCiHS3R` (currently at version 11).
  This is the shareable preview link.
- **`/home/claude/index.html`** — full unstripped copy of `site-onepage.html`, kept in
  sync after every edit and delivered to the user via `SendUserFile`. The user manually
  re-uploads this file to Netlify (drag-and-drop / Netlify Drop) to push changes live —
  there is no CI/CD or git repo; deploys are manual file uploads.

Regeneration script pattern for `site-artifact.html` (Python, run after every edit to
`site-onepage.html`):
```python
with open('site-onepage.html') as f:
    lines = f.readlines()
style_end = body_start = body_end = title_idx = None
for i, l in enumerate(lines):
    if style_end is None and '</style>' in l: style_end = i
    if body_start is None and l.strip().startswith('<body'): body_start = i
    if '</body>' in l: body_end = i
for i in range(10):
    if '<title>' in lines[i]: title_idx = i; break
new_lines = ['<title>Shelton.ai</title>\n']
for i in range(title_idx+1, style_end+1):
    if '<link rel="icon"' in lines[i]: continue
    new_lines.append(lines[i])
new_lines.append('\n')
for i in range(body_start+1, body_end):
    new_lines.append(lines[i])
with open('site-artifact.html', 'w') as f:
    f.writelines(new_lines)
```
Then publish with the `Artifact` tool (`action: "publish"`, same `url` each time to
update in place, not create a new artifact).

## Deployment / hosting status (as of this handoff)

- Domain `rwshelton.com` is registered at **Hostinger**. Hostinger's own DNS Zone
  Editor was found to be genuinely broken for this domain (reproducible "Domain not
  found" error on any new record). Workaround: **delegated the entire domain's DNS to
  Netlify DNS** by changing Hostinger's nameservers to Netlify's 4 assigned ones
  (`dns1-4.p01.nsone.net`). This succeeded.
- Netlify site name: `loquacious-marigold-635a8e` (project URL
  `loquacious-marigold-635a8e.netlify.app`). Netlify's DNS zone for rwshelton.com has
  correct `NETLIFY`-type records for both apex and `www` pointing at this site.
- **As of last check, DNS/nameserver propagation was still in progress** (Netlify
  dashboard showed "Netlify DNS propagating..." and the SSL cert was "Waiting on DNS
  propagation"). This is expected to resolve within a few hours to 24-48 hours of the
  nameserver switch. Worth re-checking live status before assuming it's done — check
  both the Netlify dashboard (Domain management page) and an external DNS lookup
  (e.g. `https://dns.google/resolve?name=rwshelton.com&type=A` should eventually
  return a Netlify IP, not the old Hostinger IP `185.212.71.84`).
- No CI/CD: updates to the live site require the user to manually re-upload
  `index.html` to Netlify (drag-and-drop).

## Design system / established conventions

CSS custom properties (`:root`):
```css
--bg:#0b0c0d; --bg-soft:#111315; --term:#131517; --term-border:#24272a;
--ink:#eceae6; --ink-soft:#9a9a95; --ink-faint:#5c5e60;
--accent:#7c4dff; --accent-soft:rgba(124,77,255,0.16); --green:#7fd08a;
```
- Purple (`--accent`) = highlight/emphasis color (e.g. the `.hl` span class used in
  headings). Green (`--green`) = secondary accent, used for the "+" bullet markers in
  the Experience section's git-diff-styled entries (`.git-diff .add`, `.plus-accent`)
  and now also the nav links (About/Experience/Projects/Contact were changed to green
  per user request, same size/weight/letter-spacing as before — only color changed).
- Icon buttons (email/LinkedIn/GitHub in Contact section) share a consistent hover
  pattern: 36×36px square, default `border:1.5px solid var(--ink-faint)`, hover
  `border-color:var(--accent); color:var(--accent); background:var(--accent-soft);
  box-shadow:0 0 14px rgba(124,77,255,0.55);` — maintain this pattern for any new
  icon buttons added to that row.
- Typewriter/typing animation pattern (used in two places — reuse this convention for
  any new typed text): a `setTimeout`-recursive function that slices the target string
  by an incrementing index and writes it into a target element's `textContent` or
  `innerHTML`, e.g.:
  ```js
  let i = 0;
  function type(){
    if(i <= text.length){ el.textContent = text.slice(0, i); i++; setTimeout(type, 14); }
  }
  setTimeout(type, 500);
  ```
  The hero H1 uses a variant of this that also wraps a substring (e.g. "Ask") in a
  `<span class="hl">` for the purple highlight while it types. The hero H1's caret/
  cursor was explicitly removed per user request (blinking cursor after typing looked
  bad) — the terminal Q&A widget below it still has its own blinking cursor and should
  stay that way unless told otherwise.
- Section dividers: the `.section` class previously had a `border-top:1px solid
  var(--term-border)` to visually separate About/Experience/Projects/Contact — this
  was removed per user request. The alternating `.section.alt` background tint
  (`rgba(255,255,255,0.015)`) now fades in/out via a `::before` pseudo-element with a
  linear-gradient (transparent → tint → transparent) over ~160px at each edge, instead
  of switching on as a flat color — this was done to avoid an abrupt-looking seam once
  the divider line was removed. Reuse this "gradient pseudo-element fade" pattern for
  any future soft transitions between sections.
- `scroll-snap-type:y proximity` on `html` (changed from `mandatory` per user request —
  proximity is less aggressive/forceful when scrolling).
- Current hero copy: eyebrow line "AI/ML Engineer + Technical Writer" (green "+"),
  H1 "Curious about me? Ask Shelton.ai" ("Ask" in purple `.hl` span, typed on load, no
  cursor), sub-text "Meet **Shelton.ai** — a language model I've wired up with my
  actual background as context. Ask something below, or pick a prompt to start."

## Contact form (already fully built, for reference / consistency)

Contact section has a working silent-submit form using **Web3Forms**
(`https://api.web3forms.com/submit`), POSTing JSON via `fetch()`/async-await with
`{access_key, name, email, subject, message, botcheck}`. Access key:
`80c7f221-9828-490d-9268-e6dd8886a900`. Honeypot spam field (`botcheck`, visually
hidden). Button text is just "Submit" (icon removed per user request). Success/error
shown via an inline status paragraph (`#cf-status`) with green/red styling. This is a
useful reference pattern for the LLM feature's own fetch-based Netlify Function call
(loading state → fetch → success/error UI), since the conventions (status element,
disabled-during-submit button state, error handling) should probably match.

## The LLM feature — plan to implement next

This is the next major piece of work. Full step-by-step guide (already given to the
user in chat, repeated here for continuity):

1. **Approach**: system-prompt grounding, not RAG — the background doc is small enough
   (a few thousand words) to pass directly as context on every request.
2. **Write the knowledge base**: a single Markdown (or plain text) document containing
   bio, full work history w/ dates, skills, projects, education, and a short "voice"
   note for how Shelton.ai should talk (tone, first-person, how to decline off-topic
   questions). This becomes the system prompt verbatim.
3. **API/model**: Anthropic API, a smaller/cheaper model (e.g. Haiku) is sufficient for
   grounded Q&A over a small context.
4. **Serverless proxy required**: the site is static — cannot call the Anthropic API
   directly from browser JS (would expose the API key). Add a Netlify Function that
   receives `{question}`, calls the Anthropic API server-side with system prompt +
   question, returns the answer. API key goes in Netlify environment variables only.
5. **Abuse protection**: per-IP rate limiting, max question length, and a
   spend cap/alert in the Anthropic console.
6. **Frontend wiring**: replace hardcoded `heroText`/terminal response constants with
   a real flow — user submits a question in `.term-input` → loading state → fetch the
   Netlify Function → feed the returned text into the existing typewriter function so
   the visual effect is unchanged, just driven by real content.
7. **Prompt engineering**: answer as Shelton.ai, stay grounded only in provided
   background (no hallucination), keep answers short (terminal UI, not chat app),
   graceful fallback for off-topic/hostile questions.
8. **Test & deploy**: try normal / adversarial / off-topic questions; set
   `ANTHROPIC_API_KEY` in Netlify env vars; deploy and verify live (not just local).
9. **Monitor & iterate**: check usage/cost periodically; update the knowledge-base doc
   over time without needing code changes.

### Open decisions for the next session to make with the user
- Exact content of the background/knowledge-base document (needs to be written or
  provided by Ross).
- Whether to reuse the existing hardcoded terminal Q&A widget's exact UI/copy, or
  redesign the interaction slightly to make it clear it's now a live text input.
- Netlify Functions vs. an alternative (e.g. Cloudflare Workers) — Netlify Functions
  is the natural default since the site is already hosted there.
- Rate-limiting implementation specifics (in-memory per-function-instance vs. a
  persistted store) and what a reasonable per-IP/day cap looks like.

## Working conventions established this session (apply going forward)

- Every visual/content change follows this loop: edit `site-onepage.html` → verify
  with a Playwright screenshot (`/opt/pw-browsers/chromium`, headless, screenshot
  specific sections) → regenerate `site-artifact.html` → republish via `Artifact` tool
  to the existing URL → copy to `index.html` → deliver via `SendUserFile` with a short
  one-line note (and a reminder to re-upload to Netlify when relevant).
- For ambiguous requests (e.g. "remove the mail icon" — unclear which icon), ask a
  clarifying question rather than guessing.
- For subjective/creative copy decisions, offer a few concrete alternatives rather
  than picking one unilaterally.
- The user's own email for reference: ross@rwshelton.com (site contact form target).
  Ross's GitHub: `https://github.com/i2oss`.
