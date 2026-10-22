<!-- Raw ChatGPT Deep Research output (Parts D+G, run 5), saved unedited 2026-10-22. citeturn/fileciteturn markers are ChatGPT citation placeholders. Audit: docs/24-AUDIT-RESEARCH-DG.md -->
# GeminiForge Workbench: Accessibility, Offline, Performance, Testing and Engineering Quality — October 2026

## Executive summary and decision baseline

GeminiForge already has the right high-level constraints: dark-only, keyboard-first, WCAG 2.2 AA, human-reviewed AI edits, native modal dialogs, source Markdown, versioned saves, no offline writes, and a narrow browser/device matrix. The main risk is not “missing ARIA”; it is **building application-style composite widgets whose focus, keyboard, mobile screen-reader and top-layer behavior is subtly wrong**. The current UI confirms 30 px rows, custom selects, route-like organization tabs, a command palette and compact controls. fileciteturn0file4

| Risk-reduction rank | Finding | Decision |
|---|---|---|
| **Critical** | APG explicitly warns its select-only combobox example is illustrative rather than production-ready and requires browser/AT testing; an APG issue documents a TalkBack/Chrome failure case. citeturn24view1turn5search4 | Keep your styling, but **TRIAL a headless behavior layer** for combobox/listbox/menu before hand-maintaining these interactions. |
| **Critical** | Your plan hierarchy should **not** start as a tree/treegrid. APG tree/grid semantics impose an application keyboard model that you do not need. citeturn2view5turn2view9 | Use nested semantic lists + disclosures + native leaf checkboxes. |
| **Critical** | A 30 px row is not itself a WCAG problem. WCAG 2.5.8 requires a 24×24 CSS-px target or sufficient target spacing; tiny icon hitboxes inside that row can still fail. citeturn24view0 | Keep 30 px density; make every actionable hit area at least 24×24 CSS px. |
| **Critical** | TOTP must not force memorization/transcription. Password-manager support, copy/paste and other mechanisms are explicitly relevant to WCAG 3.3.8. citeturn24view8turn9search2 | One OTP field, paste allowed, `autocomplete="one-time-code"`, manual TOTP seed plus QR, second TOTP factor for recovery. |
| **High** | Native `<dialog>` is the right modal primitive, but top-layer popover/dialog combinations still have documented interoperability pitfalls. citeturn24view7turn6search0turn6search4 | Keep native dialogs; avoid nested dialogs and body-portalled popovers from inside them unless specifically tested. |
| **High** | axe-core itself says automation finds about **57%** of WCAG issues on average. citeturn24view2 | CI axe is necessary, never sufficient; keyboard scripts, ARIA snapshots and real AT remain release gates. |
| **High** | Read-only offline is the highest useful level; offline edits turn your version/3-way-merge design into a second synchronization system. | Keep 5.2 “no offline writes”; build optional pinned read-only documents only after accessibility/performance work. |
| **High** | Vite 8 already uses Rolldown and defaults to a conservative Baseline Widely Available target including iOS 16.4; your “current + previous major” policy is stricter than the build target. citeturn24view4turn22search2 | Keep Vite default transpilation; gate newer platform features independently. |
| **Medium** | React 19.3 made View Transitions stable in React, but that does not make browser View Transition support universal. citeturn24view6 | Upgrade React as planned; keep View Transitions progressive and reduced-motion aware. |
| **Medium** | Public repositories get free, unlimited standard GitHub-hosted runners. citeturn24view5 | Use CI aggressively; optimize primarily for feedback time, not runner-minute scarcity. |

Two evidence limitations matter. First, the uploaded PDFs mention your **70 security** and **64 operations** test packs but do not contain their individual test-case text; I therefore give an exact conversion framework but do **not invent S001–S070/O001–O064 mappings**. Second, the PDFs/screenshots do not supply authoritative CSS token values, so the contrast section below contains a **calculated candidate palette**, not a claim about the live CSS.

## Accessibility and interaction correctness

**D1 — Widget-by-widget interaction contract**

The governing rule is simple: adding an ARIA role does not add any keyboard behavior. For composite widgets, you own focus movement, selection, disabled-item handling and active-descendant synchronization. APG explicitly distinguishes page-level `Tab` movement from arrow-key navigation inside composite widgets. citeturn0search0

**Custom animated select-only dropdown — APG Select-Only Combobox / Listbox.** Use a focusable element with `role="combobox"`, an accessible name, `aria-expanded`, `aria-controls` pointing to the popup `role="listbox"`, and `aria-activedescendant` for the active `role="option"`; each option exposes `aria-selected`. `aria-haspopup="listbox"` is implicit for a combobox but explicit use is harmless when correct. Closed-state behavior: `Enter`/`Space` opens; Down opens and navigates; Up opening is supported by APG; Home/End and printable-character typeahead are expected. In the open popup, focus remains on the combobox while `aria-activedescendant` changes; arrows, Home/End and typeahead move the active option; `Enter`/`Space` commits; `Escape` closes without committing the temporary active option; `Tab` commits the active option and continues normal focus navigation. JavaScript must scroll the active descendant into view. APG's example was updated in August 2025 but carries an explicit warning that example code is not a production guarantee, especially across mobile/touch/AT combinations. citeturn0search1turn24view1

Ten common bugs: (1) making the popup options tabbable; (2) moving DOM focus into every option while also using `aria-activedescendant`; (3) changing the committed value merely because the user arrows through options; (4) `Escape` committing rather than restoring the old value; (5) stale `aria-activedescendant` referencing a removed option; (6) `aria-expanded` disagreeing with visual state during animation; (7) failing to scroll the active option; (8) typeahead matching only the first letter forever rather than a timed string; (9) hiding the popup visually while it remains in the accessibility tree; (10) putting buttons, badges or other interactive descendants inside an option even though listbox options are not a container for nested controls. citeturn2view12turn24view1

Hand test: Tab to the closed control; open with Space, Enter, Down and Up; arrow from first to last; test Home/End; type several letters rapidly; Escape and verify the old value remains; reopen, choose with Enter; reopen, choose with Tab and verify focus proceeds to the next field; test a disabled option; test a 100-item list to verify active scrolling; repeat with touch and TalkBack on Android. The current invite-dialog dropdown shown on page 4 of the UI PDF is the exact control that should be used as the first behavior-library spike. fileciteturn0file4

**Documented AT difference:** W3C APG issue material records a TalkBack/Chrome Android case where the select-only example could not successfully make a choice; its current 2026 resolution in your exact Android/browser version is **UNVERIFIED**, which is why a physical Android test is mandatory. Another APG report involving VoiceOver found arrow-key interception when VoiceOver Quick Nav was enabled on macOS; you do not target macOS, and extrapolation to iPhone would be inappropriate. citeturn5search4turn5search0 a11ysupport.io reports substantial current support for `aria-activedescendant` across NVDA/JAWS and other combinations, but its test entries vary in age, so use it as evidence of interoperability, not certification of your implementation. citeturn5search12 Current widget-specific behavior for **Narrator, iPhone VoiceOver and JAWS in your implementation is UNVERIFIED** until you test it.

**Menu button and menus — APG Menu Button + Menu.** The trigger is a native `<button>` with `aria-haspopup="menu"` and `aria-expanded`; the popup has `role="menu"` containing `menuitem`, `menuitemcheckbox` or `menuitemradio`. Enter/Space opens and focuses an item; Down-to-first and Up-to-last are strongly useful and documented APG options. Inside the menu, Up/Down navigate, Home/End may jump, printable characters perform typeahead, Right/Left operate submenus where present, Enter/Space activate, Escape closes and restores trigger focus, and Tab closes the menu and proceeds in document order rather than tabbing through menu items. citeturn2view0turn2view1

Ten bugs: submenu arrows reversed; every menuitem gets `tabindex=0`; menu remains open after navigation; trigger loses focus-return target when rerendered; Escape bubbles and closes an enclosing dialog too; disabled command omitted from focus model inconsistently; separator made focusable; `aria-checked` missing on checkbox/radio items; hidden exit-animation menu remains interactive; link navigation and command menu semantics are mixed unpredictably.

Hand test: open via keyboard and pointer; check first/last movement, typeahead, disabled items, checkbox/radio state announcements, Escape focus return, Tab exit, nested menu if any, and opening/closing during CSS animation.

**Command palette — native modal dialog + editable combobox + listbox.** This is *not* one giant menu. Open Ctrl+K into a labelled dialog. Inside it, the text input is an editable combobox owning/controlling a listbox; DOM focus stays in the input and `aria-activedescendant` points to the highlighted result. Down/Up move results, Enter activates, Escape should first close transient inner UI where applicable and otherwise close the palette, and Tab reaches genuinely separate controls such as a scope selector rather than traversing options. APG combobox guidance applies. citeturn0search1turn2view2

Your screenshot labels the scope choices “All, Documents, Questions, Notes, Projects, Actions” as tabs. Because they filter one result collection rather than expose six tab panels, **do not use `tablist` merely because they look like tabs**. Use a labelled radio group, select, or ordinary pressed/filter buttons; the `>`, `#`, `@` prefixes remain plain text input grammar, not ARIA widgets. fileciteturn0file4

Ten bugs: input loses focus as the highlighted result changes; result IDs are unstable; Enter submits a surrounding form; Escape closes both nested popup and palette at once; query updates spam a live region; result count announced on every character; scope “tabs” falsely expose tab semantics; selected scope has color-only indication; stale asynchronous results replace newer ones; Ctrl+K fires while the user is composing text or typing inside CodeMirror.

Hand test: open from every route; inspect initial focus; type quickly; backspace to empty; prefix search; switch scope by keyboard; arrow across results; execute; Escape; reopen and verify recents; test zero-results/loading/error; test keyboard command from CodeMirror and text fields so it does not steal intended editor shortcuts.

**Breadcrumbs with sibling switcher — Breadcrumb + Menu Button.** The breadcrumb itself is a labelled `<nav>` containing an ordered list of links; the current location uses `aria-current="page"`. APG specifies no special arrow-key model for the breadcrumb itself. citeturn2view7 A sibling chevron must be a **separate button**, never a button nested inside an anchor. If its popup gets application-menu behavior, apply Menu Button semantics; otherwise a Popover containing an ordinary list of links is simpler and usually more natural for navigation.

Ten bugs: nested button inside link; current crumb remains an active duplicate link; ellipsis has no accessible name; popup opens only on hover; invisible collapsed crumbs remain tabbable; breadcrumb and popup share duplicate IDs; Escape closes wrong overlay; popup list gets menu semantics but lacks menu keyboard behavior; focus return goes to a removed crumb after navigation; narrow view truncates the only accessible name.

Hand test: Tab every visible crumb and switcher; open each switcher; navigate siblings; Escape; resize to 320 CSS px; verify overflow order; use browser Back after sibling navigation.

**Organization “tabs” — route navigation unless truly in-page.** APG tabs require `tablist`, `tab`, `tabpanel`; one tab is in the Tab sequence, Left/Right moves tabs, Home/End are useful, and Enter/Space activates under manual activation. Automatic activation is recommended only when content is already available with effectively no latency. citeturn2view3

For Projects / People / Invitations / Activity / Settings, **MODIFY the semantics**: if changing one of them changes SPA route/history and users should be able to open it in another tab, use a `<nav>` of links with `aria-current="page"` and retain the visual tab styling. Use the APG Tab pattern only if they are genuinely one page with panels.

Ten bugs: route links represented as tabs; every tab `tabindex=0`; focus and selection are conflated under manual activation; lazy network panel auto-activates on arrow movement; missing `aria-controls`/`aria-labelledby`; arrow keys scroll page because not handled; hidden panel is only visually hidden; disabled tab cannot be reached/understood; browser Back does not restore panel; deep link opens wrong selected tab.

**Sidebar groups — Disclosure + ordinary navigation.** Each group heading gets a native button with `aria-expanded`, optionally `aria-controls`; Enter/Space toggles. Children are a normal list of links. Do not turn the entire sidebar into a tree merely because it is hierarchical. citeturn2view4

Ten bugs: clickable `<div>` headings; arrow-key tree behavior added to only half the sidebar; collapsed links remain focusable; icon-only group name; disclosure state inaccessible; focus vanishes when its focused child is collapsed; animated height clips focus ring; state stored globally rather than per user/project where appropriate; count badge becomes accessible-name noise; current-page indication is color only.

**Plan hierarchy with check marks — nested list, disclosure and native checkbox, not tree/treegrid in v1.** APG Treeview requires a composite arrow-key system: Up/Down among visible nodes, Right to open/go to first child, Left to close/go to parent, Home/End and recommended typeahead. Treegrid additionally brings grid-cell navigation. citeturn2view5turn2view9 That is unnecessary complexity for your planned phase/step hierarchy. Use nested `<ol>`/`<ul>`, disclosure buttons for containers and native checkbox inputs for *leaf completion*. Native checkboxes use Space and expose checked state directly. citeturn2view10

Do **not** encode `blocked`, `deferred` or `cancelled` as checkbox states. The checkbox means completed/not completed; lifecycle status is separate visible text/badge, accessible by text as well as color. Do not use `aria-checked="mixed"` on a phase merely to display calculated progress unless the phase is genuinely a tri-state user-controlled checkbox. Progress should read something like “8 of 12 countable steps complete; 2 blocked” and may additionally use `<progress>` for the numeric fraction. This agrees with the master plan's rule that progress is computed from leaf rows and blocked remains unfinished. fileciteturn0file1

Ten bugs: tree semantics without tree keyboard handling; treegrid solely to achieve columns; parent checkbox silently toggles descendants; mixed state used as a progress meter; status communicated only by red/yellow/gray; cancelled/deferred counted incorrectly; collapsed descendant retains focus; reorder changes DOM while the AT cursor is on the moved item; checkbox label excludes step title; progress says “100%” while blocked/countable work remains.

**Toasts and live regions — Status/Alert, not focus-stealing dialogs.** `role="status"`/polite live behavior is appropriate for saves, Realtime summaries and undo confirmations; `role="alert"` is reserved for genuinely urgent errors. APG alert guidance says alerts normally do not receive focus. citeturn2view11 “Document saved” should normally be silent or polite; “3 updates arrived” should be aggregated rather than emitting three announcements while the user types. An undo toast may contain a native Undo button, but announcing its message must not pull focus away from the editor.

Ten bugs: every event uses assertive `alert`; toast receives focus automatically; timeout expires before AT users can reach Undo; hover/focus does not pause dismissal; DOM text is rewritten repeatedly and reannounced; duplicate live regions exist after rerenders; saving every keystroke announces “saved”; Realtime updates interrupt typing; visually hidden old toast stays live; error toast is the only place validation information exists.

Hand test: type continuously while triggering a Realtime update, save, error and undo; verify focus never moves; keyboard-reach Undo; pause it; test multiple rapid events; ensure critical errors also exist next to the affected UI.

**Native modal dialog + popovers — HTML `<dialog>` + APG focus policy.** `showModal()` puts the dialog in the top layer and makes the rest of the document inert. The living HTML Standard was last updated October 20, 2026 in the source rechecked for this report. citeturn24view7 APG requires focus inside the dialog, Tab/Shift+Tab containment, Escape close and sensible focus restoration. For large/rich dialogs, initial focus on a static heading (`tabindex="-1"` on the heading, not the dialog) may be better than dropping users deep into a form; for destructive confirmation, the least destructive action can be the initial target. citeturn2view2

Do **not** manually remove the dialog's `open` attribute to close it; use the dialog APIs so modal blocking and close events remain coherent. The HTML specification also says the dialog element itself should not carry `tabindex`. citeturn6search13turn24view7 Popovers launched from a modal must be specifically tested: WHATWG issues have documented combinations where a top-layer popover can be visually above a dialog yet remain inert or where nested top-layer ordering misbehaves. citeturn6search0turn6search4 Keep popup DOM logically inside the dialog whenever feasible; beware behavior libraries whose default portal goes to `document.body`.

Ten bugs: `open` attribute instead of `showModal()`; focus not moved in; focus restored to a deleted trigger; custom focus trap fighting native behavior; dialog itself gets positive/tab index; Escape closes both popover and dialog; body-portalled popup becomes inert; nested dialogs; background click handlers still act on inert content; exit animation delays semantic close while users think it is gone.

**Side peek panel — complementary region on desktop, modal dialog on phone.** The architecture PDF already identifies the phone peek panel as lacking a focus trap and proposes `<dialog>` below 900 px. fileciteturn0file3 That is correct. On desktop, use a labelled `<aside>`/region and leave the rest of the page operable. When keyboard users explicitly invoke “Peek”, either move focus to the panel heading or preserve trigger focus and provide an obvious next navigation path; choose one policy consistently. On phone, where the panel covers the workspace, make it a real modal dialog.

Ten bugs: desktop panel falsely marked modal; mobile overlay not modal; close button first/only accessible name is X; focus is moved on passive hover previews; Escape conflicts with an inner menu; heading absent; background remains tappable on phone; browser Back unexpectedly closes/navigates inconsistently; panel content changes without announcing heading; focus restoration breaks after navigating from the panel.

**Tooltips — Tooltip only for noninteractive supplementary text.** APG tooltip guidance remains a work in progress and explicitly lacks full task-force consensus. A tooltip has `role="tooltip"` and the trigger references it with `aria-describedby`; focus remains on the trigger; Escape dismisses; pointer users must be able to move from trigger onto the tooltip without it disappearing. citeturn2view6 Base UI's current documentation similarly treats tooltips as visual supplementation rather than a container for important interactive information. citeturn15search6

Ten bugs: putting links/buttons inside the tooltip; information available only on hover; tooltip flashes on keyboard focus then disappears; Escape does nothing; trigger has no accessible name without the tooltip; tooltip text duplicates a verbose button label; timeout is too short; pointer cannot enter tooltip; hidden tooltip remains described; mobile long-press conflicts with browser behavior.

**Data tables — native HTML table first.** Use `<table>`, `<caption>` or equivalent labelled context, `<th scope>` and normal cell semantics. Sort controls are buttons inside headers, with `aria-sort` on the relevant header. A semantic table does not make every cell focusable. APG Grid is appropriate only if you truly want spreadsheet-style arrow-key cell navigation. citeturn2view8turn2view9

Ten bugs: CSS grid with no table semantics; grid role added for visual appearance; every cell tab stop; sort state indicated by arrow icon only; sticky headers obscure focus; responsive layout silently deletes columns; horizontal scroll cannot be keyboard reached; row overflow action has no row context; selection checkbox accessible name is merely “Select”; virtualization reports misleading row position.

**Drag-to-reorder — pointer drag plus explicit non-dragging controls.** WCAG 2.5.7 requires an alternative to functionality that depends on dragging unless dragging is essential. citeturn7view1 Your smallest robust design is not a home-grown “keyboard drag mode”: retain mouse/touch drag, and put **Move up, Move down, Move to…** in each item's action menu. Keyboard users can reorder using ordinary buttons; screen readers receive ordinary button semantics. This also satisfies the broader keyboard requirement without exposing fragile custom drag semantics.

Ten bugs: drag is the only path; handle is <24 px; reordering only on pointer-up with no announcement; obsolete drag ARIA used as a substitute for behavior; moved item loses focus; live region announces every pointer movement; dropping into descendants can make hierarchy cycles; Move Up disabled state is visual only; move controls reorder filtered rather than canonical data unexpectedly; touch scrolling initiates drag accidentally.

**Diff viewer with per-hunk Accept/Reject — document structure + explicit buttons.** Use a heading per change/hunk or at least an accessible “Change N of M” grouping; expose old/new text as text, not merely red/green backgrounds; `ins`/`del` may be useful visual/semantic markup, but essential change meaning should also exist in accessible text. Every hunk gets native “Accept change” and “Reject change” buttons whose accessible names include useful local context. CodeMirror merge can remain the sighted visual implementation, but the review workflow needs a parallel linear review representation until its screen-reader behavior has been proved.

Ten bugs: change indicated only by color; editor gutters are the only buttons; Accept button name lacks hunk context; action removes the currently focused element with no replacement focus; old/new text is inaccessible canvas/decorations; line numbers dominate accessible output; thousands of unchanged lines create noise; accepted change still appears in accessibility tree; keyboard can't reach next hunk efficiently; merge conflict text is lost when action fails.

**Notification inbox — ordinary list, not `feed` unless you need Feed's complex contract.** Use a labelled section/main area containing a list; each notification can be an article/list item with descriptive link/button text, timestamp and textual unread state. The bell is a native button with a name such as “Notifications, 3 unread”. Realtime insertion should update a polite summary rather than focus the new row.

Ten bugs: unread is color/dot only; dynamic accessible name chatters on every event; `feed` role used without required navigation behavior; new row is inserted above keyboard focus and shifts target; mark-read icon is <24 px; notification action is a clickable `<div>`; timestamps have no meaningful text; deleted target produces dead action; keyboard cannot batch mark read; empty/loading state is announced repeatedly.

**File import dialog — native dialog + native file input; drop is enhancement.** Opening the file picker is a button/label-backed file input. Dropzone is never the only way to supply a file because a drop-only workflow violates the same interaction principle embodied by 2.5.7. Validation errors stay in the dialog, are associated with the input and appear in an error summary where multiple files fail. Import progress is a single polite status update rather than percentage announcements every few milliseconds.

Ten bugs: drop only; hidden file input removed from accessibility tree; fake button has no keyboard activation; accepted extension text is visual only; error only appears as red border; progress is assertive on every tick; cancel closes without explaining aborted work; focus lost when validation rerenders; filename/path announced with private local details unnecessarily; import result automatically navigates without announcing the new view.

**Skeleton/loading states — no dedicated APG pattern.** Skeleton rectangles are decorative and should normally be hidden from the accessibility tree. Put `aria-busy="true"` on the region being refreshed where appropriate and provide one meaningful status such as “Loading documents”. Do not replace already usable content with skeletons during every background refetch.

Ten bugs: every skeleton bar is exposed; dozens of “loading” announcements; `aria-busy` never resets; skeleton takes focus; layout shift moves focused controls; Realtime refresh skeletonizes the whole page; loading animation ignores reduced motion; stale buttons remain operable behind overlay; error replaces loader silently; loader masks page heading/landmarks.

**D2 — WCAG 2.2 AA failure points for this UI**

Your highest-risk criteria are accurately chosen, with one correction: **3.2.6 Consistent Help is Level A**, not AA; AA still includes it because AA conformance requires all A and AA criteria. citeturn7view3

| Criterion | What fails in a dense dark SPA | GeminiForge rule |
|---|---|---|
| 2.4.11 Focus Not Obscured (AA) | sticky headers, bottom bars, dialogs/popovers fully cover the focused target | After every focus change, at least part of the focused component must remain visible; preferably keep the whole ring visible. citeturn7view0 |
| 2.5.7 Dragging Movements (AA) | plan/document order only draggable | Every reorder gets Move Up/Down/To controls. citeturn7view1 |
| 2.5.8 Target Size Minimum (AA) | 14–18 px ellipsis/bell/chevron hitboxes | Keep 30 px rows, but guarantee ≥24×24 CSS-px action boxes or sufficient spacing. citeturn24view0 |
| 3.2.6 Consistent Help (A) | Help/settings/shortcut assistance moves unpredictably among repeated pages | Keep repeated help mechanisms in the same relative location. citeturn7view3 |
| 3.3.7 Redundant Entry (A) | invitation/account flow asks again for known email/org | Prefill or select previously entered information unless security/staleness makes that inappropriate. citeturn7view4 |
| 3.3.8 Accessible Authentication Minimum (AA) | forced password memorization, disabled paste, manual TOTP transcription, inaccessible bot puzzle | Allow password managers, paste/autofill and copy/paste OTP; do not introduce a cognition-only challenge. citeturn24view8turn9search1turn9search2 |
| 1.4.11 Non-text Contrast (AA) | subtle dark borders, focus rings, status icons disappear | Meaningful component boundaries/states require 3:1 against adjacent colors; inactive controls are excepted. citeturn7view6 |
| 1.4.13 Content on Hover/Focus (AA) | tooltips/popovers disappear while pointer crosses gap or cannot be dismissed | Popup must be dismissible, hoverable and persistent while needed. citeturn7view7 |
| 2.2.2 Pause, Stop, Hide (A) | continuously moving CSS decoration/GIF that starts automatically and lasts >5 s | Pause/stop/hide unless essential; honor reduced motion as an additional usability measure. citeturn7view8 |

**Dark-token check.** The actual CSS color tokens were not present in the supplied evidence, so an exact audit of today's theme would be fabricated. The screenshot cannot substitute for source color values because antialiasing, capture and PDF conversion alter pixels. Instead, the following is a **candidate AA-safe reference palette I calculated using the WCAG relative-luminance contrast formula**. It is not a requirement to adopt these exact colors.

| Proposed token | Hex | Contrast vs `#0F100E` canvas | Contrast vs `#171815` panel | Use |
|---|---:|---:|---:|---|
| Primary text | `#F2F0E9` | 16.73:1 | 15.63:1 | primary copy |
| Secondary text | `#A6A399` | 7.56:1 | 7.06:1 | metadata |
| Meaningful border | `#666A61` | 3.45:1 | 3.23:1 | control boundaries |
| Focus/action | `#FF8A65` | 8.24:1 | 7.70:1 | focus ring/accent |
| Success | `#7FD6C3` | 11.18:1 | 10.45:1 | text/icon + label |
| Warning | `#E7C66B` | 11.53:1 | 10.77:1 | text/icon + label |
| Danger | `#F08282` | 7.47:1 | 6.98:1 | destructive/error |
| Information | `#8CB7FF` | 9.39:1 | 8.77:1 | informational state |
| Truly disabled only | `#6D7068` | 3.79:1 | 3.54:1 | disabled, never ordinary secondary copy |

The key design rule is more important than exact numbers: **do not use a low-contrast border to carry the only information that something is a control, selected, invalid or focused**. Disabled components have WCAG exceptions, but “disabled-looking” gray must never be reused for enabled secondary actions. Semantic colors always get icon/text/status wording as well as hue. citeturn7view6

**WCAG 3.0.** Rechecked against the September 10, 2026 W3C Working Draft: WCAG 3.0 remains a Working Draft and explicitly still has substantial work ahead; details and conformance are not stable. It changes **nothing** about your October 2026 conformance target. Build and test to WCAG 2.2 AA. citeturn24view9

**D3 — authentication and account flows**

Cloudflare Turnstile is a CAPTCHA alternative that can usually evaluate in the background; Managed mode can display interaction when Cloudflare decides it is needed. Server-side Siteverify validation remains mandatory. Cloudflare also publishes dedicated testing keys because automated browsers otherwise encounter bot-detection behavior. citeturn8search0turn8search10 Your future CSP must explicitly account for Turnstile's challenge resources on the join flow; Cloudflare's 2026 documentation also notes challenge-domain/network changes, so do not freeze an over-specific firewall allowlist without monitoring their changelog. citeturn8search2turn8search15

For WCAG 3.3.8, use password-manager-friendly fields: `autocomplete="username"`/`email`, `new-password` during creation, `current-password` during login, and never block paste. W3C's documented failure for OTP widgets is particularly relevant: six separate one-character boxes can fail when pasting the complete code only populates one box. A single `one-time-code` field is smaller and safer. citeturn9search1turn9search2turn9search8

Supabase's current TOTP documentation provides QR enrollment and a TOTP URI/manual setup path. Your attached audit records TOTP availability on Free and the absence of Supabase-issued recovery codes; Supabase recommends a second TOTP factor as the recovery strategy. citeturn8search4turn8search3 Therefore D16 is sound: require AAL2 for owner/admin/project-manager sensitive operations, but **enroll and test a second factor before enforcement**.

Passkeys have materially changed since older research: Supabase documentation now exposes passkey support as **experimental**, with opt-in requirements; do not make it your mandatory login path yet. It is promising specifically because WebAuthn avoids memorized-secret authentication and is phishing-resistant, but “experimental” is the wrong foundation for your only owner account. citeturn8search1turn9search3 Verdict: **ASSESS passkeys, do not replace password+TOTP in this plan revision**.

On session expiry/token-refresh failure, preserve unsaved editor text first; show an inline/banner explanation and a “Sign in again” action; do not silently throw the user to the start page and discard text. A modal is justified only when an action cannot continue without fresh authentication.

**D4 — SPA fundamentals under hash routing**

Hash routing can remain. On a *true route change*, update `document.title`, move focus to the new H1/main heading or an appropriate `tabindex="-1"` route heading, and let its accessible name communicate the new context. W3C explicitly includes changing a SPA's document title when the view changes as the relevant page-title behavior. citeturn10search1 Do **not** focus the H1 for filter/sort/tab-like state changes that do not constitute navigation.

Provide one visible-on-focus skip link before app chrome, landing at `<main>`. Maintain `banner`, primary navigation, main and context/sidebar landmarks without creating five identically named `navigation` regions. Heading levels should describe the document/view structure rather than match visual font size.

Browser Back must operate on meaningful navigation states. Use history entries for route-level org/project/document navigation; avoid creating entries for every menu opening or transient filter keystroke. Restore scroll for Back/Forward when practical, but **focus semantics win over blindly restoring a scroll position that leaves the new focus off-screen**.

Live regions must never steal focus. Route changes normally need focus/title management, not a simultaneous “page loaded” alert; otherwise some screen readers can hear duplicated context.

For Windows High Contrast, test actual forced-colors behavior in Windows. Chrome DevTools can emulate `forced-colors` and `prefers-contrast`, but emulation is not a substitute for Narrator/Windows testing. citeturn10search6 WebKit documentation has historically noted important Apple-platform differences in forced-colors/prefers-contrast behavior, so do not make `prefers-contrast` the only route to a usable high-contrast UI. citeturn10search4 Use real borders/outlines rather than only shadows for focus because forced-colors modes may override visual properties.

At 400% zoom, WCAG Reflow is effectively tested at 320 CSS px for ordinary content. Tables and source editors may legitimately require two-dimensional scrolling, but navigation, forms, dialogs and plan controls may not simply overflow off-screen. citeturn7view9 Also apply the WCAG text-spacing override test: line-height 1.5, paragraph spacing 2× font size, letter spacing 0.12 em and word spacing 0.16 em without clipping/loss. citeturn7view10

Honor `prefers-reduced-motion`: remove nonessential movement, parallax, long transforms and scroll-linked motion; retain instantaneous state changes. Interaction-triggered motion has an additional WCAG AAA criterion, not an AA requirement, but honoring the OS preference is still the correct product choice. citeturn7view11

For a dark-only app, set the document's color scheme to dark so native controls and browser UI are informed of the design; test form controls, autofill, selection highlight and scrollbars in that mode. Print is the exception to “dark-only”: a print stylesheet should produce readable high-contrast output on a light physical page rather than dump a black app canvas onto paper.

**D5 — CodeMirror and merge-view accessibility**

CodeMirror's keyboard-trap design deserves explicit preservation. CodeMirror does **not** bind Tab to indentation by default specifically so Tab can leave the editor; if you choose to bind Tab, CodeMirror supplies an escape mechanism in which Escape followed by Tab leaves the editor, plus a tab-focus-mode command. citeturn12search0turn11search4 Put that escape instruction in the keyboard-help dialog and test it in every editor mode.

Give each editor a programmatic accessible name. CodeMirror exposes content attributes for that purpose; relying on the nearby visual “Editor” heading alone is not enough if it is not actually associated. citeturn12search16 Prefer line wrapping for ordinary Markdown editing so zoom users do not face gratuitous horizontal scrolling. Ensure CodeMirror token colors, cursor, selections, lint markers and search matches survive your dark/high-contrast token gates.

The project is actively maintained and its changelog shows continuing mobile/iOS/Android interaction fixes. citeturn11search0turn11search4 However, I found **no current maintainer statement guaranteeing that your exact CodeMirror configuration works correctly with NVDA, JAWS, Narrator, VoiceOver iPhone and TalkBack**. Treat those combinations as **UNVERIFIED, not “supported because CodeMirror says accessible.”**

For Markdown preview, label editor and preview as distinct regions. Do not move focus as preview content rerenders; do not announce the complete preview on each keystroke; preserve heading structure, internal-link targets and sanitization. A split-view scroll synchronizer must never move keyboard focus.

Your attached state audit reports `@codemirror/merge` 6.12.3 as current on October 22. fileciteturn0file3 I found no sufficient primary evidence that the visual merge view itself provides a complete screen-reader review experience. Therefore **5.7 needs modification**: keep `@codemirror/merge` for the visual diff, but expose an additional linear “Changes” list with hunk number, old/new text summary and native Accept/Reject buttons. That is the screen-reader-safe review path until real AT tests prove you can collapse the two representations.

## Build versus adopt and the accessibility test system

**D6 — behavior-layer choice**

The question is not “library versus custom visuals.” All four candidates are unstyled/headless or primitive-oriented enough to preserve GeminiForge's animated appearance. The question is how much interaction risk you want to own.

| Candidate | Current evidence, October 2026 | React | Licence | Bundle-cost conclusion | Verdict |
|---|---|---|---|---|---|
| **React Aria Components** | Very active; Adobe's project states its behavior follows APG and is tested across devices/AT. Current issue activity in Oct 2026 includes real combobox/popover/tree regressions, which is evidence of both maintenance and why pinning/testing remains necessary. citeturn17search0turn17search3 | React 18 supported; React 19 support exists, although older peer-dependency metadata caused warnings and was fixed after an issue. citeturn19search6 | Apache-2.0. citeturn16search0 | No honest fixed gzip number: tree-shaking/imports dominate. v1.17 cut dependency overhead substantially and supports subpath imports. citeturn14search8 | **TRIAL / preferred behavior layer** |
| **Base UI** | `@base-ui/react` 1.9.0 shown by npm as published ~10 days before this report; project is active and unstyled. citeturn16search2 | Official docs say React 17 and newer. citeturn17search2 | MIT. citeturn16search2 | Five direct dependencies in current npm metadata; exact tree-shaken app bytes still require measurement. citeturn16search2 | **ASSESS — strongest alternative** |
| **Ariakit** | `@ariakit/react` 0.4.42, published seven days before the retrieved npm page; one direct dependency and active project. citeturn16search3turn19search1 | Current React compatibility is clearly active, but I did not retrieve an authoritative 18/19 peer range in this pass: **UNVERIFIED exact range**. | MIT for packages. citeturn19search1 | Small dependency footprint; exact gzip cost is app-dependent and **UNVERIFIED**. | **ASSESS** |
| **Radix Primitives** | Unified `radix-ui` npm package showed 1.8.1, published six days before retrieval; current package metadata has broad React 16.8–19 peer support. citeturn16search1turn19search0 | React 18/19 supported. citeturn19search0 | MIT. citeturn16search1 | Unified package has many dependencies, but Radix is tree-shakeable/incrementally adoptable. citeturn15search9 | **HOLD for this app**; capable, but it does not give enough advantage over the first two to justify a second behavior system. |

There is a source conflict worth making explicit. Your attached state update says `react-aria-components` **1.22.1** on October 22, while the npm page available to the web index reported 1.21.1 and Adobe's current issue tracker already references behavior in “1.22”. fileciteturn0file3 citeturn16search0turn17search3 Therefore the **exact latest React Aria patch is UNVERIFIED across the conflicting indexes**. Before installing, use the version actually resolved by npm and commit that exact lockfile; do not copy a version from this report.

This does not change the recommendation. Run a two-day React Aria spike on **the existing invite select and command palette**, with your exact animations and the full keyboard/TalkBack/NVDA tests. Adopt it only if the DOM/portal model remains compatible with your styling and native dialog policy.

Per widget:

| Widget | Recommendation |
|---|---|
| Select-only dropdown | **TRIAL React Aria Select/collection behavior**; this is the highest-value library adoption. |
| Menu/account/ellipsis menus | **TRIAL React Aria Menu**; do not maintain roving focus/typeahead/submenu state yourself. |
| Command palette | **TRIAL React Aria ComboBox/ListBox behavior inside your native dialog**. |
| Breadcrumb switcher | Own semantic breadcrumb; behavior library only for popup menu if you choose Menu semantics. |
| Organization tabs | **Own route links**, not a widget library, when route-backed. |
| Sidebar disclosure | Own native button + `aria-expanded`; library adds little value. |
| Plan hierarchy | Own nested semantic lists/disclosures/checkboxes. |
| Toast/live region | Own tiny status service; do not add a library solely for toasts. |
| Modal dialog | Keep **native `<dialog>`**. |
| Popovers inside dialog | Native Popover only after top-layer tests; otherwise use the behavior library's popup mechanism but validate its portal target. |
| Side peek | Own region + native dialog below phone breakpoint. |
| Tooltip | Behavior library is useful; keep content noninteractive. |
| Data table | Native HTML; library only if future row selection/virtualization justifies it. |
| Drag reorder | Explicit Move controls first; React Aria drag/drop is a later option if richer keyboard drag behavior is genuinely valuable. |
| Diff | CodeMirror visual + own semantic hunk review list. |
| Notification inbox | Semantic list, own code. |
| Import | Native file input + native dialog, own code. |
| Skeleton | Own CSS/`aria-busy`; no library. |

This is intentionally **not** “replace every primitive.” Simple HTML is the smallest behavior library available.

**D7 — zero-dollar accessibility verification**

axe-core's own current README says automated axe testing finds on average about **57% of WCAG issues**, with “incomplete” results requiring manual judgment. citeturn24view2 A Deque maintainer has clarified that their higher “up to 80%” figure refers to axe DevTools plus guided/manual steps, not plain axe-core automation. citeturn21search1 Thus “axe clean” means “no violations axe can deterministically identify”, not “WCAG conformant”.

axe-core's latest GitHub release retrieved for this research is **4.14.0, October 5, 2026**; its release notes include new/default rule behavior and significant performance work. fileciteturn3file0L1-L2 Pin your axe dependency because new rules can legitimately start failing CI after a minor update.

Playwright's ARIA snapshot feature can assert roles, accessible names, state such as `expanded`, `checked`, `selected`, hierarchy and URL semantics. citeturn23search0 It is ideal for the “semantic shape” of each custom widget but does **not** prove that JAWS/TalkBack will operate it. Use partial snapshots for dynamic lists rather than recording huge brittle trees.

A practical CI split:

**Every pull request:** typecheck; ESLint; Vitest; build; Chromium functional tests; keyboard interaction tests for affected widgets; ARIA snapshots; axe at every meaningful state (closed/open/error/loading, not just initial page); DB pgTAP/RLS tests when migrations change; no production secrets.

**Nightly or main branch:** Firefox and WebKit Playwright; complete axe route set; import abuse corpus; screenshot comparisons; local Supabase integration; MCP contract suite.

**Before release:** actual Chrome Windows + NVDA, Windows Narrator, Android Chrome + TalkBack, iPhone Safari + VoiceOver; forced colors on Windows; 400% zoom; 320-CSS-px reflow; reduced motion; text spacing; touch target check.

Playwright 1.64.1 was released October 14, 2026 in the retrieved official GitHub release. fileciteturn2file0L1-L2 Its recommended trace pattern is still “on first retry” rather than tracing every successful run; Trace Viewer retains DOM/network/action context and the hosted viewer processes an uploaded trace locally in the browser. citeturn23search6turn23search8 Given that traces can contain private UI data, your plan's short retention is correct—prefer local viewing for sensitive failures.

For keyboard automation, assert **effects**, not implementation internals: after ArrowDown, the expected option is active; after Escape, selection is unchanged; after closing a dialog, the invoker has focus; after Move Down, DOM/data order changed and focus remains logically on the moved item; after route navigation, H1/title/focus changed once.

For free AT coverage: NVDA on Windows, Windows Narrator, iPhone VoiceOver and Android TalkBack form your zero-cost core matrix. JAWS is important because many enterprise users depend on it, but I did not re-verify a current zero-cost licensing path in this pass; JAWS-specific claims here remain **UNVERIFIED** rather than assuming a demo entitlement.

Accessibility Insights, Lighthouse and pa11y are useful adjuncts, but they do not replace the core matrix. I did not retrieve current October 2026 release metadata for Accessibility Insights or pa11y during this run, so under your “verify every recommended tool” rule I classify them **HOLD/optional**, not required infrastructure. Lighthouse remains useful for broad browser audits and performance diagnostics, but accessibility CI should have one deterministic source of truth—axe—rather than three overlapping automated checkers.

Your accessibility statement should state: WCAG target (2.2 AA); tested browser/AT combinations and dates; known limitations (especially editor/merge view until proven); contact/issue route; whether share pages are in scope; last review date. The accessibility issue template should request route/widget, browser/version, OS, AT/version, input method, reproduction steps, expected/actual result and impact. Explicitly warn reporters not to attach private document contents or authentication tokens.

## Offline, performance and browser baseline

**G1 — four offline levels**

| Level | Architecture | Value | Risks/complexity | Verdict |
|---|---|---|---|---|
| None | Network-only SPA | Smallest implementation | Network loss removes even already-read documentation | Acceptable today, but weaker than the product can cheaply achieve |
| App shell only | Service worker precaches immutable HTML/JS/CSS shell; data remains online-only | App opens to a meaningful “offline” screen | SW update/cache lifecycle with little document value | Good intermediate step |
| **Read-only pinned documents** | SW app shell + **IndexedDB** for explicitly pinned private docs; never runtime-cache API responses | Actual value for documentation without sync conflicts | Device privacy, stale authorization, eviction, sign-out wipe | **RECOMMENDED** |
| Offline edits | shell + local docs + durable outbox + dependency ordering + reconnect reauthorization + version conflict/3-way merge | Maximum offline capability | Essentially a second sync product, queue failure UX, long-lived sensitive local data, conflict matrix | **HOLD / do not build now** |

IndexedDB-only cannot make the application boot while truly offline because the browser still needs the app's HTML/JS. Therefore the smallest useful Level 2 is a service-worker-cached **public/static application shell plus private document records in IndexedDB**.

`vite-plugin-pwa` **2.0.0** was released October 3, 2026 and is active. fileciteturn4file0L1-L2 Workbox **7.4.1** was released May 5, 2026, so it is not abandoned under your 18-month rule. fileciteturn5file0L1-L2 Use `vite-plugin-pwa` rather than wiring Workbox by hand; you need very little custom service-worker logic.

WebKit documents an origin quota of up to about **60% of total disk** for a browser app and an overall browser-app quota up to 80%, but quota is a ceiling rather than guaranteed reserved capacity. It also explicitly notes eviction under storage pressure or after lack of interaction, and eviction is normally origin-wide. Standalone home-screen web apps receive the same stated quota class. citeturn24view3 Therefore never treat IndexedDB as backup storage.

Your prior research records Safari's ITP seven-day script-writable-storage behavior and notes ambiguity around standalone/home-screen behavior. fileciteturn0file2 I did **not** obtain sufficiently current primary evidence to declare how Safari 27 on your exact iPhone treats every form of that rule, so the practical status is **UNVERIFIED: test the real phone after 8+ days of non-use**.

Do not architect offline edits around Background Sync. Cross-browser support is not dependable enough for a current+previous Safari baseline; processing a queue whenever the foreground app detects connectivity is the portable fallback. Because you are not building offline edits now, Background Sync becomes irrelevant to v1.

For privacy, offline documents should be **opt-in (“Available offline on this device”)**, not an invisible cache of “recently opened” private material. Warn that an offline copy remains readable from that browser profile while offline even if server access is later revoked. On reconnect, reauthorize before replacing/updating the cached document.

On sign-out: delete the private document IndexedDB database; clear any private runtime caches if they ever exist; clear in-memory Zustand document state; cancel Realtime; remove local metadata that identifies private docs. **MODIFY master-plan 8.3:** unregistering the service worker itself is unnecessary if it contains only the public app shell. Keep the shell SW; provide a stronger “Forget this device” action that can additionally unregister it and clear everything.

WebCrypto encryption of IndexedDB is **not worthwhile in v1** if the decrypting key is stored in the same browser origin: XSS or someone with the unlocked browser profile can use the key just as the app can. Meaningful client-side-at-rest encryption would need a key derived from a secret the user re-enters and that is not stored locally, creating a new recovery/unlock system. Your threat reduction per unit complexity is much larger from CSP, XSS prevention, explicit offline opt-in and wipe correctness.

Never runtime-cache authenticated Supabase responses. Write a document into IndexedDB only after a successful authorized fetch; store schema version, server document version and fetched timestamp; ignore cached auth/permission decisions. This prevents an old service worker from treating “I once had access” as current authorization.

**G2 — performance budget**

The following is an **engineering budget for GeminiForge**, not a standards threshold:

| Metric | Budget |
|---|---:|
| Initial route JS, compressed | **≤180 KiB target; 220 KiB hard review threshold** |
| Initial CSS, compressed | **≤40 KiB** |
| Initial requests before interactive shell | **≤30** |
| Internal LCP budget on mid-range Android | **≤2.0 s** |
| Internal INP budget | **≤150 ms** |
| Internal CLS budget | **≤0.05** |
| Long task | Prefer none >100 ms during ordinary navigation |
| Steady-state tab memory after one project opens | **≤150 MB target** |
| Heavy editor/review peak | **≤250 MB review threshold** |

The memory numbers are product budgets, not web-standard conformance metrics; use them to detect regression rather than claim universal acceptability.

Your current “one chunk >500 kB” warning should be fixed by feature boundaries, not clever vendor chunk names. Vite 8 moved to Rolldown as its unified production/development bundler in March 2026. citeturn22search2 Its production default is `baseline-widely-available`, concretely Chrome/Edge 111, Firefox 114, Safari/iOS 16.4 for this major. citeturn24view4 That target is safely *older* than your current+previous browser support policy, so there is no reason to use `esnext` merely to save a few bytes.

Split at these dynamic-import boundaries: organization/start shell; project workspace; editor/CodeMirror; merge/diff review; Markdown preview pipeline; KaTeX only when math exists; future Mermaid only when a document contains Mermaid; ZIP import worker; labs; answer engine; admin/operations tools. **Never import axe, Playwright fixtures, test corpus, email preview tooling or benchmark utilities from production entry points.**

React 19.3 is a reasonable upgrade exactly as your plan says. React's September 9, 2026 release made React View Transitions and Fragment Refs stable. citeturn24view6 `startTransition` remains useful for expensive non-urgent view changes; `useOptimistic` is useful for reversible presentation such as marking a notification read, but should not pretend a permission change, destructive deletion or accepted AI edit succeeded before the server commits. React's Activity mechanisms may be useful later for preserving hidden UI state, but are not a reason to redesign the app. Keep the React Compiler out of the same upgrade.

Do not virtualize by superstition. For simple plan/document lists, start unvirtualized; profile once roughly **300–500 visible rows** or >1,000 complex DOM nodes are realistically possible. Treat those counts as a heuristic, not a standard. Virtualization becomes justified when actual commit/scroll/INP measurements fail the budget. It also carries accessibility costs: browser find-in-page and screen-reader context only see rendered content unless the implementation carefully exposes set size/position and navigation. Prefer filtering/collapsing the plan before virtualizing it.

CodeMirror already manages large-document rendering internally; do not wrap the editor itself in another virtualizer.

Search should not send a network query on every key. For local organization/project lists, filter locally. For document FTS, debounce modestly and cancel/ignore stale requests. Realtime should invalidate precise IDs and batch updates rather than causing a complete project bundle reload for every row event.

On PostgreSQL, continue your indexed `project_id`/membership model; add indexes based on actual query plans, not every conceivable column. `pg_stat_statements` is already installed according to the state-update PDF. fileciteturn0file3 Use it to identify total-cost/high-frequency queries, then inspect the candidate with `EXPLAIN (ANALYZE, BUFFERS)` in a safe environment. Combine round trips when an operation must be atomic or a screen otherwise makes an obvious N+1 waterfall; do not turn all reads into giant RPCs merely to reduce request counts.

At zero cost, use Chrome Performance/Lighthouse locally, Playwright timings for deterministic regression checks and real-user Web Vitals for field data. Vercel Speed Insights is available on Hobby for one project and its January 2026 documentation lists the first 10,000 data points as included. citeturn24search12turn24search13 That satisfies your $0 condition so long as Hobby simply stops/limits collection rather than triggering billing in your account configuration.

CrUX is useful only if the public origin has enough qualifying Chrome traffic; a few-user private app may never have useful origin-level field data. For your own first-party RUM, sample lightly and store only route template, release, metric/value, coarse device class and timestamp. Never log document IDs/titles, hashes, query strings, share secrets, emails or full user agent strings. Thirty days is ample retention for regression comparison.

**G4 — browser baseline and platform features**

“Current and previous major Chrome, Edge, Firefox and Safari, including iOS Safari” is an excellent baseline for a solo app. It is strict enough to let you use modern HTML/CSS while small enough to physically test.

| Feature | October 2026 posture for your baseline | Fallback / rule |
|---|---|---|
| `<dialog>` / `showModal()` | **ADOPT; mature** | Test focus/top-layer interactions; no custom modal polyfill. |
| Popover | **ADOPT selectively** | Button/popover behavior must still be tested; use custom controlled overlay if a browser bug appears. |
| `:has()` | **ADOPT** | Use for enhancement/layout, not as sole data-state mechanism. |
| Container queries | **ADOPT** | Ordinary viewport media-query fallback can provide acceptable layout. |
| `color-mix()` | **ADOPT** where output is nonessential | Fall back to explicit token if contrast is critical. |
| CSS `@starting-style` | **TRIAL/progressive** | Failure merely removes entry animation. |
| View Transitions | **TRIAL/progressive** | No transition is the fallback; always honor reduced motion. React 19.3 support does not equal universal engine support. citeturn24view6 |
| Scroll-driven animation | **HOLD for essential UX** | Static UI fallback; no functional dependency. |
| CSS Anchor Positioning | **HOLD / enhancement only** | Your attached audit found WebStatus still limited in 2026; ordinary JS/CSS positioning remains primary. fileciteturn0file1 |
| Clipboard `writeText` | **ADOPT with failure path** | Expose selectable text/manual copy and success/error status. |
| `structuredClone` | **ADOPT** | JSON/deep-copy fallback rarely necessary at your baseline. |
| `Intl` core APIs | **ADOPT** | Feature-test newer individual Intl sub-APIs. |
| Temporal | **HOLD** | Native implementation status is too new to make it a dependency; Date/Intl are sufficient here. |
| Import maps | **Technically safe but unnecessary** | Vite owns production dependency bundling. |
| Customizable native `<select>` / `appearance: base-select` | **HOLD** | Your prior research found uneven browser rollout; D13 already says the animated custom select stays. fileciteturn0file2 |

Vite's default target is intentionally more conservative than this support matrix. citeturn24view4 Keep it; there is little benefit in constantly bumping the transpilation floor to “last two”.

Keep a `browserslist` policy in the repository as human/tooling documentation even though Vite's production transformer has its own target. Treat unsupported-feature lint plugins cautiously: because I did not verify their October 2026 release health in this pass, they are not part of the required toolchain. The strongest compatibility test remains your Playwright Chromium/Firefox/WebKit suite plus actual Chrome Windows/Android and Safari iPhone.

## Testing, monitoring, AI-assisted engineering and hygiene

**G3 — testing strategy for one person plus an AI assistant**

Use the test pyramid only as a cost heuristic, not dogma: put deterministic logic in fast tests, integration boundaries in local service tests, and only user-observable workflows in Playwright.

**Unit level.** Adopt **Vitest 5.0.5**, whose latest official GitHub release retrieved here was October 15, 2026. fileciteturn1file0L1-L2 It is the natural fit for Vite and requires less duplicate transform configuration than Jest. Unit-test hierarchy math, ordering, status/progress calculation, version-conflict logic, route serialization, token parsers, import path validation, rate-bucket pure functions and Markdown transformations.

**Component/behavior level.** Do not build a giant component-testing infrastructure before unit and browser tests. For isolated widget state machines, Vitest plus a DOM environment is useful; for keyboard/focus semantics that depend on browser layout, use Playwright against a small widget-fixture page instead of pretending JSDOM is a browser.

**End-to-end.** Playwright 1.64.1 is current in the retrieved October 14 release. fileciteturn2file0L1-L2 Use role/name locators, web-first assertions, isolated fixtures, seeded users/projects, no arbitrary `waitForTimeout`, and record traces on first retry/failure. Playwright classifies a retry-success as “flaky”; do not treat that as green health. citeturn23search4

Run Chromium, Firefox and WebKit on Linux for cross-engine regression, and branded Chrome/Edge only where browser-specific integration matters. Playwright explicitly supports projects across Chromium/Firefox/WebKit and mobile-device *emulation*. citeturn23search10 **WebKit on Linux is not real iOS Safari and does not run VoiceOver**; your physical iPhone remains a manual release gate.

**Visual regression.** MODIFY master-plan 2.27: do not defer it completely. Playwright already includes `toHaveScreenshot`; no paid visual service is necessary. Its own docs warn that rendering varies by host OS/settings, so create and compare baselines on the same CI environment. citeturn23search1 Keep the suite tiny: dropdown open/closed, dialog, command palette, organization 390/320 px, plan hierarchy, editor/review and forced-colors/reduced-motion snapshots. Visual tests do not assert accessibility; they catch clipped focus rings, overflow and accidental token regressions.

**Database.** Master-plan 9.7 is correct: pgTAP/`supabase test db` should test grants, RLS and helper behavior in the local stack, while a much smaller live smoke matrix confirms production deployment. fileciteturn0file1 Never make a live production organization the primary PR test database.

**MCP.** Keep pure protocol/tool contract tests offline. The official MCP Inspector remains appropriate for occasional manual interoperability inspection, but its exact October 2026 version was not retrieved in this run and is therefore **UNVERIFIED** under your version rule; do not float `npx ...@latest` in CI.

**Edge Functions.** Unit-test pure validation/auth/rate-limit code without network; run local integration against Supabase for request/auth/database behavior; reserve deployed smoke tests for the narrow surface that local emulation cannot prove.

**Email.** Snapshot plain text and generated HTML; use Playwright for your own preview's layout; keep one real Gmail/iPhone smoke test because no zero-cost browser runner meaningfully emulates Gmail/Apple Mail rendering.

**Mutation testing.** HOLD globally. For a solo app, the CPU and triage cost is unjustified while ordinary gaps remain. Once mature, manually introduce a few targeted faults into version comparison, grant checks and import limits to see whether the suite fails; only then decide whether a mutation framework earns permanent CI cost.

**Coverage.** Start with a pragmatic global floor of roughly 70% statements / 65% branches once a stable baseline exists, but require ~90% branch coverage for pure security/version/import state machines. RLS/authorization quality is measured by a role/action matrix, not by JavaScript line percentage. These numbers are engineering policy recommendations, not industry standards.

**Flake policy.** One CI retry is enough to classify a test as flaky; every flaky test gets an issue, owner/reason and expiry. A quarantined test runs but does not gate only while its issue is active. Never solve a nondeterministic test by adding three retries and forgetting it.

**CI economics.** GitHub's October 2026 documentation says standard GitHub-hosted runners for public repositories are **free and unlimited**. citeturn24view5 Public repositories can configure Actions artifact/log/check retention between 1 and 90 days; the default is 90 days. citeturn22search16turn22search17 Your 7-day Playwright artifact policy is therefore sensible, especially because traces/screenshots can expose private test data.

Aim for **<10 minutes PR CI**, **<20 minutes nightly**. Parallelism is free in minutes for the public repo, but developer feedback latency still matters.

**Converting the 70 security + 64 operations packs.** The individual test definitions are absent from the surfaced PDFs, so exact item-by-item assignments are **UNVERIFIED**. Preserve their original IDs and add metadata rather than rewriting them:

`id | requirement | risk | automated/manual | layer | fixture | frequency | evidence artifact | last result | owner`.

Automate in this order: grants/RLS/auth matrices; token/share/invite negative cases; input/import limit tests; version/merge/data-integrity tests; CSP/header/build/supply-chain checks; backup manifest and restore automation; keep-alive/health endpoint checks; then UI/browser assertions. Keep real two-account invitation, owner TOTP recovery, Gmail deliverability, physical-iPhone AT, Backblaze decrypt/restore, Supabase pause recovery and incident tabletop as manual/drill items. The existing plan already treats real two-account invitation as an owner check and backups/restore as drills. fileciteturn0file1

**G5 — error monitoring and product telemetry**

For this few-user app, the smallest $0 design is a first-party `client_error_events`/aggregated-errors table rather than another SaaS dependency. Sentry and GlitchTip are credible products, but I did **not** retrieve current October 2026 no-card/free-tier terms for both, so under your hard rule they remain **HOLD/UNVERIFIED**, not recommendations.

Log: release SHA/version; route *template*; sanitized error class/fingerprint; sanitized stack filenames/line numbers; browser-engine family and coarse OS class; first/last seen; occurrence count. Do **not** log document body/title, email, user ID unless absolutely needed, query/hash, share secret, auth token, invitation token, request body, prompt, clipboard, local path or raw IP.

Client reporting must be rate-limited and server-side schema validated so an attacker cannot turn your errors table into storage/log injection. Deduplicate by normalized fingerprint. Thirty days is enough initially; aggregate older recurring fingerprints if needed.

For the owner, diagnostics can reasonably be always on as your own application telemetry. For invited collaborators, expose a concise privacy notice and preferably an “anonymous diagnostics” setting if you intend to retain browser/device telemetry beyond operationally necessary error records. This is product guidance, not a legal conclusion.

Vercel Hobby's own Speed Insights is already a useful complementary RUM source: one Hobby project and 10,000 included data points are documented. citeturn24search12turn24search13 Keep product analytics deliberately minimal—your app does not need session replay, advertising analytics or third-party trackers.

**G6 — AI coding assistants**

Use `AGENTS.md` for repository-wide, tool-neutral rules and `CLAUDE.md` only for Claude-specific instructions if that assistant actually reads it. The authoritative rules should be short: architecture boundaries; commands that must pass; no secrets; exact database migration discipline; accessibility patterns; no package additions without explicit justification; no production data in tests; master-plan/ADR update requirement.

The strongest retrieved 2026 synthesis of coding-assistant evidence reports **contradictory effects**: controlled studies show substantial gains in some scoped tasks, while the most rigorous RCT it reviewed reported a **19% slowdown for experienced developers working in familiar codebases**. citeturn23academia48 This is not evidence that “AI makes developers 19% slower”; it is evidence that task type, codebase familiarity and verification burden materially change the result. I did not retrieve a 2025–26 primary experiment robust enough to quote a universal **defect-rate percentage**, so any such number for GeminiForge would be **UNVERIFIED**.

For your one-owner workflow, AI is best used to increase *throughput of small verified steps*, not autonomy:

1. Give it one bounded change with acceptance tests.
2. Ask it to identify affected files/tests before editing.
3. Keep diffs small enough for human review.
4. Run typecheck/lint/unit/targeted Playwright immediately.
5. Inspect security-sensitive SQL/API behavior yourself.
6. Run the broader suite before merge.
7. Update docs/ADR/master-plan state in the same commit when behavior changes.

Package hallucination/slopsquatting needs an explicit gate: an assistant may suggest a package name, but it may not install it until the owner verifies the exact registry package, maintainer/repository, age/release history, licence and why existing dependencies/platform APIs cannot do the job. Never let generated code introduce a typo-similar package silently.

Do not paste secrets, database dumps, private documents, share links or production traces into assistant prompts. Test traces and logs deserve the same secret/PII treatment as source code. Your existing “secrets never in chat/code/git” decision remains correct. fileciteturn0file1

**G7 — engineering hygiene**

ESLint **10.13.0** was released October 16, 2026 and is current in the primary release material retrieved here. citeturn24search5 ESLint 10 removed the legacy eslintrc system and is flat-config-only; it also requires modern Node versions, aligning with Vite 8's modern Node baseline. citeturn24search9 **ADOPT ESLint 10**, after confirming the current versions of typescript-eslint, `eslint-plugin-jsx-a11y` and `eslint-plugin-react-hooks` against TypeScript 7/React 19 in the lockfile. I did not retrieve authoritative October 2026 versions for those three plugins, so their exact latest versions are **UNVERIFIED** here.

Keep ESLint rather than migrating wholesale to Biome. Your most valuable lint rules are ecosystem semantic rules—React Hooks and JSX accessibility—not formatting speed. Running Biome and ESLint as overlapping linters creates two suppression/configuration systems for one developer. Biome can be reconsidered only if it replaces enough of ESLint without losing these gates.

TypeScript should use `strict`, plus strongly consider `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `noFallthroughCasesInSwitch` and consistent module-isolation options supported by the current Vite toolchain. Introduce the two noisy strictness flags one at a time so AI-generated “fixes” do not bury real issues in a giant migration.

Dead-code tooling such as Knip is useful **after** the flat `parts/` architecture is converted into real modules; before that, concatenated/generated entry behavior creates false complexity. HOLD it until R0.

For bundle analysis, begin with Vite's emitted chunk sizes, dynamic-import map and browser Coverage/Performance panels. Do not add a bundle-analysis dependency merely for a pretty chart until the code split exists.

Dependency policy: lockfile committed; `npm ci`; weekly Dependabot; no blind auto-merge; minimum-release-age rule already planned; third-party Actions pinned by full SHA; review release notes for React/Vite/Supabase behavior libraries; remove unused dependencies promptly. That is consistent with your already-audited 9.5 supply-chain plan. fileciteturn0file1

Add an app-root error boundary plus boundaries around editor/review/import surfaces where a recoverable feature failure should not destroy the entire workspace. The fallback must preserve/recover unsaved text where possible and give a reload/copy-draft path.

Feature flags need no SaaS: use typed local configuration for unreleased client features and the existing/private settings model for server-controlled kill switches. Avoid accumulating permanent boolean branches; every flag gets owner, creation date and removal condition.

Database migrations remain forward-only source of truth: one schema change per migration where practical; explicit GRANT/RLS/policies/indexes together; local reset+pgTAP before merge; dry-run/deploy pipeline; destructive migration split into expand → migrate/verify → contract rather than “hope a down migration restores production”.

For releases, tag a tested commit, generate a short user-facing changelog, record migrations, deploy, run smoke checks and retain the previous known-good app build. A future contributor should be able to read one onboarding page containing architecture map, local start/test commands, environment-variable names without values, migration procedure, deployment procedure, accessibility keyboard contract and “how not to leak data”.

## Master-plan challenge, synthesis and unknown unknowns

The master plan is generally strong. The accessibility research changes semantics and sequencing more than product scope. fileciteturn0file1

**AGREE / MODIFY / DISAGREE verdicts**

| Step | Verdict | Evidence and required change |
|---|---|---|
| **2.6 Breadcrumb switchers** | **AGREE** | Keep breadcrumb as normal navigation; each switcher is a separate popup trigger, never hover-only. APG breadcrumb itself has no special keyboard model. citeturn2view7 |
| **2.7 Custom animated dropdowns** | **MODIFY** | D13 stays. Keep visuals, but spike React Aria behavior for select/listbox rather than assuming your current implementation can simply receive ARIA attributes. APG itself warns of AT/mobile caveats. citeturn24view1 |
| **2.8 30 px compact rows** | **MODIFY** | 30 px is acceptable; every actionable sub-target must meet 2.5.8's 24 px/spacing rule. citeturn24view0 |
| **2.11 Ctrl+K palette** | **MODIFY** | Dialog + editable combobox/listbox; scope filters should not be ARIA tabs unless they expose actual tabpanels. |
| **2.12 notification bell** | **MODIFY** | Button name includes unread state; don't rely on orange dot/count visually; Realtime aggregation is polite. |
| **2.19 breadcrumb overflow** | **AGREE** | Menu button or popup list of links; keyboard/open/focus-return test required. |
| **2.20 native dialog** | **AGREE** | Strong decision; use `showModal`, native inertness and explicit initial/return focus. Test popovers in top layer. citeturn24view7turn6search4 |
| **duplicate 2.20 palette polish** | **MODIFY** | Renumber this step. Duplicate step numbers damage test/master-plan traceability. Matched-letter highlighting must never be the only indication of a match. |
| **2.26 phone 360 px** | **MODIFY** | Add 320 CSS-px reflow plus real 390-ish iPhone/Android tests; 360 alone is insufficient for WCAG reflow. citeturn7view9 |
| **2.27 visual regression deferred** | **DISAGREE** | Add a **small** Playwright screenshot set now, not a large design-system suite. It costs $0 and catches focus clipping/reflow regressions. citeturn23search1 |
| **2.29 notification inbox** | **AGREE** | Use ordinary list semantics, not Feed unless you deliberately implement Feed behavior. |
| **3.13 invite-bound creation + Turnstile** | **MODIFY** | Retain model; add password-manager autocomplete/paste, one-field OTP when used, Turnstile test keys in CI and an accessible failure path. citeturn8search10turn24view8 |
| **3.14 TOTP/AAL2** | **AGREE** | Mandatory roles remain correct; enroll/test backup TOTP before enforcement because Supabase recovery codes are unavailable. citeturn8search3 |
| **4.1 plan hierarchy** | **AGREE** | Data model does not require ARIA tree semantics. |
| **4.2 computed progress** | **AGREE/MODIFY UI** | Keep computed leaf progress; blocked/deferred/cancelled must have text labels, not color-only state. |
| **4.3 phase/step check marks** | **MODIFY** | Implement nested list + disclosure + leaf native checkbox, not tree/treegrid initially. |
| **5.1 CodeMirror 6** | **AGREE** | Add editor accessible name, Tab escape help, wrapping/high-contrast/mobile acceptance tests. citeturn12search0 |
| **5.2 version + 3-way merge; no offline writes** | **AGREE strongly** | Offline edits would multiply the merge state space; do not broaden now. |
| **5.4 drag order** | **MODIFY** | Ship Move Up/Down/To simultaneously with drag. Required for 2.5.7. citeturn7view1 |
| **5.5 revision compare** | **AGREE** | Add linear/non-color diff semantics. |
| **5.7 per-hunk CodeMirror merge** | **MODIFY** | Keep visual merge, add semantic hunk list + native buttons until AT behavior is verified. |
| **5.8 import/export** | **AGREE** | Native file picker is primary; drag/drop enhancement; status/errors accessible. |
| **8.3 offline read cache** | **MODIFY** | Opt-in pinned docs, not implicit “recent docs”; wipe private IDB/cache on sign-out; keeping a private-data-free shell SW registered is safe and simpler. |
| **8.5 single-key shortcut toggle** | **AGREE** | Also require reduced motion, forced colors and high-contrast-safe tokens. |
| **9.1 CI** | **MODIFY** | Add lint, unit, ARIA snapshot, axe, pgTAP/migration gates. |
| **9.7 pgTAP + axe** | **AGREE strongly** | axe finds ~57% on average, therefore explicitly pair it with keyboard/AT tests. citeturn24view2 |
| **9.8 first-party error table** | **AGREE** | Prefer it over unverified paid/free SaaS terms; scrub PII/token/hash. |
| **9.11 code splitting** | **AGREE strongly** | Split CodeMirror, diff, Markdown extras, import, labs and answer engine. |
| **9.14 React 19.3.1 + Vite 8.3.5; Compiler later** | **AGREE** | Correct sequencing. React 19.3 stabilizes View Transitions, but keep the browser feature progressive. citeturn24view6 |
| **9.13 R0 restructure deferred** | **AGREE** | Do accessibility contracts/code splitting first; structural churn can follow stable feature boundaries. |

No primary-source evidence uncovered here overturns your settled facts about Supabase Free backups, the October 30 grants change, Canvas removal, project-wide share links, native dialogs, TOTP mandate, invitation-only creation, computed progress or keeping Zustand/hash routing. The attached master plan/state update remain the authoritative project facts for those decisions. fileciteturn0file1 fileciteturn0file3

**Unknown unknowns**

| Item | What appeared in 2025–26 | Value here | Effort | Zero-cost posture |
|---|---|---|---|---|
| React Aria **NavigationTree** | Adobe's Sept 2026 release introduced a NavigationTree aimed at hierarchical route sidebars. citeturn17search1 | Could eventually replace hand-built arrow navigation if sidebar complexity genuinely needs it | M | **ASSESS**, not now; your disclosure sidebar is simpler |
| React 19.3 ViewTransition | Stable React API Sept 2026. citeturn24view6 | Smooth route/document transitions without bespoke animation plumbing | S | **TRIAL** after reduced-motion tests |
| Playwright ARIA snapshots | Current Playwright can snapshot semantic accessibility-tree structure. citeturn23search0 | High-value regression gate for custom widgets | S | **ADOPT** |
| axe-core 4.14 changes | Oct 2026 release includes new/default rule behavior and performance improvements. fileciteturn3file0L1-L2 | Faster broader CI; also means upgrades can create legitimate new failures | S | **ADOPT**, pin exact version |
| Base UI 1.x maturity | Base UI is now stable/active, unstyled and supports React 17+. citeturn16search2turn17search2 | Real competitor to React Aria for your design philosophy | M | **ASSESS** |
| Native `dialog` evolution | HTML Living Standard continues to evolve close/light-dismiss semantics such as newer closing controls. citeturn24view7 | May delete more custom overlay code later | S | **ASSESS progressively**, never assume browser parity |
| Customizable native select | 2026 browser work substantially improved stylable native selects, but your own earlier audit found support not yet suitable for your baseline. fileciteturn0file2 | Useful future escape hatch from ARIA combobox complexity | M | **HOLD** |
| Vite Baseline targeting | Vite 8 formally ties production defaults to a frozen Baseline Widely Available set. citeturn24view4 | Makes browser floor explicit and reduces hand-tuned transpilation | S | **ADOPT default** |
| First-class public-repo runner expansion | GitHub's current public-repo standard runner catalog includes multiple modern Linux/Windows/macOS options free/unlimited. citeturn24view5 | Enables Windows forced-colors/Chrome test jobs without minute anxiety | S/M | **TRIAL Windows CI** |
| AI productivity counter-evidence | 2025–26 research is no longer uniformly “AI makes coding faster”; mature-codebase RCT evidence can point the opposite way. citeturn23academia48 | Supports your small-step/test-gated assistant workflow | S | **ADOPT governance**, not a product |

**What became outdated in 2025–2026**

Several common recommendations are now stale: “use Rollup behind Vite” is obsolete for Vite 8 because Rolldown is now the unified bundler. citeturn22search2 “React View Transitions are experimental” is outdated as of React 19.3, though browser capability remains progressive. citeturn24view6 “Automated accessibility catches only 20–30%” is not the number axe-core's maintainers use; axe states an average of ~57%. citeturn24view2turn21search12 Treating 44×44 as an absolute WCAG 2.2 AA minimum is wrong: WCAG 2.5.8 is 24×24 CSS px or a spacing exception. citeturn24view0 The old Base UI package name `@base-ui-components/react` is deprecated in favor of `@base-ui/react`. citeturn16search9 WCAG 3.0 is **not** a replacement standard in 2026; it is still a Working Draft. citeturn24view9

**RADAR**

| Item | Verdict | Why | Evidence/date | Costs $0? | Effort | Master step |
|---|---|---|---|---|---|---|
| Native `<dialog>` | **ADOPT** | Best modal baseline, native inert/top layer | HTML Standard, 2026-10-20. citeturn24view7 | Yes | S | 2.20 |
| React Aria behavior spike | **TRIAL** | Highest leverage on complex select/menu/combobox | Adobe current project/issues, Oct 2026. citeturn17search0turn17search3 | Yes | M | 2.7, 2.11 |
| Base UI | **ASSESS** | Excellent unstyled fallback, React 17+ | npm/official docs, Oct 2026. citeturn16search2turn17search2 | Yes | M | 2.7 |
| Ariakit | **ASSESS** | Active accessible toolkit, simple dependency graph | npm, Oct 2026. citeturn16search3 | Yes | M | 2.7 |
| Radix | **HOLD** | Mature but no clear reason to introduce alongside preferred layer | npm, Oct 2026. citeturn16search1 | Yes | M | 2.7 |
| Semantic nested plan list | **ADOPT** | Avoids unnecessary tree/treegrid composite behavior | APG current. citeturn2view5turn2view9 | Yes | S | 4.3 |
| Move controls beside drag | **ADOPT** | Direct 2.5.7 solution | W3C current. citeturn7view1 | Yes | S | 5.4 |
| axe-core 4.14 | **ADOPT** | Deterministic automated gate; known ~57% ceiling | Oct 5 2026 release + README. fileciteturn3file0L1-L2 citeturn24view2 | Yes | S | 9.7 |
| Playwright ARIA snapshots | **ADOPT** | Locks semantic widget shape | current docs. citeturn23search0 | Yes | S | 9.7 |
| Targeted visual snapshots | **ADOPT** | Free regression protection | current docs. citeturn23search1 | Yes | S | 2.27 |
| Read-only pinned offline | **TRIAL** | Useful, bounded sync risk | WebKit storage + PWA versions. citeturn24view3 fileciteturn4file0L1-L2 | Yes | M | 8.3 |
| Offline edits | **HOLD** | Adds outbox/auth/conflict system | architecture inference from 5.2 | Yes | L | 5.2/8.3 |
| vite-plugin-pwa 2.0 | **ADOPT for offline phase** | Active Oct 2026 integration | 2026-10-03. fileciteturn4file0L1-L2 | Yes | S | 8.3 |
| Workbox 7.4.1 | **ADOPT transitively** | Active May 2026 | 2026-05-05. fileciteturn5file0L1-L2 | Yes | S | 8.3 |
| React 19.3.1 | **ADOPT** | Settled upgrade; current React features | React 19.3, Sep 2026. citeturn24view6 | Yes | S | 9.14 |
| View Transitions | **TRIAL** | Polish only; good no-animation fallback | React 19.3. citeturn24view6 | Yes | S | 9.14 |
| First-party error table | **ADOPT** | Smallest private zero-cost monitor | project design | Yes | S | 9.8 |
| Sentry / hosted GlitchTip | **HOLD** | Current zero-card/free terms not reverified | **UNVERIFIED** | UNVERIFIED | S | 9.8 |
| ESLint 10.13 | **ADOPT** | Current, active, flat-config-only | 2026-10-16. citeturn24search5turn24search9 | Yes | S | 9.1 |
| Vitest 5.0.5 | **ADOPT** | Vite-native current test runner | 2026-10-15. fileciteturn1file0L1-L2 | Yes | S | 9.1 |
| Playwright 1.64.1 | **ADOPT** | Current existing browser strategy | 2026-10-14. fileciteturn2file0L1-L2 | Yes | S | 9.1 |
| Full mutation testing | **HOLD** | Lower ROI than current gaps | engineering judgment | Yes | M/L | 9.1 |

## Execution plan, risk register, decisions and runnable checklist

**Build order mapped to the master plan**

There is one prerequisite outside D/G that still outranks everything here: **3.0, the October 30 explicit-grants migration**, because your own audited plan has a hard platform deadline. Do that before accessibility refactors that are not urgent. fileciteturn0file1

After that, the smallest safe D/G order is:

**Days 0–30.** Finish 3.0; upgrade 9.14 React/Vite separately from Compiler; add 9.1 Vitest/ESLint/axe/ARIA-snapshot gates; establish dark-token contrast/focus/target rules for 2.8; fix route title/focus/skip-link/landmarks; implement native dialog 2.20 correctly; run the React Aria spike on 2.7/2.11; fix breadcrumb/menu/sidebar semantics; harden authentication fields for 3.13/3.14; establish Windows forced-colors and reduced-motion CSS; publish the initial accessibility statement.

**Days 31–60.** Implement 4.3 using nested lists/native checkboxes; add drag alternatives before 5.4 ships; integrate CodeMirror 5.1 with Tab escape/accessibility labeling; implement accessible revision/diff/hunk controls for 5.5/5.7; build the notification inbox 2.29 with restrained live announcements; add import-dialog accessibility to 5.8; code-split 9.11 and establish field/perf budgets; add the small visual-regression set that modifies 2.27.

**Days 61–90.** Run the actual NVDA/Narrator/TalkBack/iPhone VoiceOver matrix and fix resulting behavior; add read-only pinned-document offline support 8.3 if core tests are green; enable RUM/error aggregation 9.8; complete current+previous browser release tests; map every S001–S070/O001–O064 item into automated/manual cadence; run a full release accessibility checklist and first quarterly engineering review.

**Risk register**

| Risk | Likelihood | Impact | Detection | Mitigation |
|---|---|---|---|---|
| Custom combobox passes keyboard tests but fails TalkBack | High | High | Real Android TalkBack | Behavior-layer spike + physical-device release test |
| Tiny 30 px-row controls fail target-size rule | High | Medium | target-box audit/Playwright geometry | ≥24×24 CSS-px hit areas |
| Popover inside modal is inert/top-layer-broken | Medium | High | dialog+popup cross-browser tests | DOM-contained popup; avoid nested overlays |
| Realtime live regions interrupt editor typing | High | Medium | NVDA/TalkBack typing test | aggregate polite announcements |
| CodeMirror works visually but poor SR editing | Medium | High | actual AT editor session | source editor acceptance gate; documented Tab escape |
| Merge diff inaccessible to SR | High | High | linear AT review task | separate semantic hunk list |
| Route changes leave focus in vanished UI | High | Medium | Playwright focus assertions | central route-transition focus manager |
| Forced-colors removes meaningful focus/state | Medium | High | Windows HC + DevTools | borders/outlines/system colors |
| Offline cache leaks docs on shared device | Medium | High | sign-out/offline adversarial test | opt-in cache, private-IDB wipe, explicit warning |
| Access revoked while offline copy survives | Medium | High | revoke→offline test | document limitation; reauthorize on reconnect; Forget Device |
| SW serves stale shell after deploy | Medium | Medium | version/update E2E | versioned precache/update flow, no API runtime cache |
| Offline edits multiply merge/data-loss cases | High if built | High | queue/conflict matrix | Do not build now |
| Initial JS remains >budget after CM integration | High | Medium | bundle/Performance CI | route + editor/diff/import dynamic imports |
| Visual test flakes across environments | Medium | Low | CI mismatch patterns | generate/compare on identical CI OS |
| AI assistant introduces hallucinated package | Medium | High | lockfile/review | package-install gate |
| CI retry hides real race | Medium | Medium | flaky classification | issue + quarantine expiry; max one retry |
| First-party error logging captures secrets | Medium | High | fixture with planted secret | allowlist schema, sanitize server-side |
| Accessibility library regression arrives in update | Medium | High | pinned tests/Dependabot PR | pinned lockfile + per-widget acceptance suite |

**The fifteen remaining decisions and my recommended answers**

| Question | Recommended answer |
|---|---|
| Which behavior layer should become the default for complex widgets? | **Run a two-day React Aria spike; adopt it only for complex composites if it passes your animations + NVDA/TalkBack tests.** |
| Should the plan UI be a Tree? | **No. Nested list + disclosure + native checkbox first.** |
| Should organization Projects/People/etc. be ARIA tabs? | **No when route-backed; style normal navigation links as tabs.** |
| Can the 30 px density stay? | **Yes; enforce ≥24×24 hit areas.** |
| What semantics should command-palette scope chips use? | **Radio/filter buttons, not tabs, unless actual tabpanels exist.** |
| How assertive should Realtime/toasts be? | **Polite aggregate by default; `alert` only for urgent failure.** |
| Which offline level? | **Explicitly pinned, read-only documents + cached shell.** |
| Encrypt IndexedDB with WebCrypto? | **No for v1; same-origin stored keys do not solve the main threat.** |
| Unregister the SW on every sign-out? | **No; wipe private data. Unregister only for “Forget this device”.** |
| Build offline editing when 3-way merge exists? | **No. The merge algorithm does not remove durable-queue/auth/retry complexity.** |
| Browser policy? | **Current + previous Chrome/Edge/Firefox/Safari, physical iPhone Safari release test.** |
| When virtualize plan/document lists? | **Only after measurement; roughly 300–500 visible complex rows is the first profiling checkpoint, not an automatic trigger.** |
| Error monitoring vendor or own table? | **Own table first.** |
| Keep visual regression deferred? | **No; add ~10–20 high-value snapshots, not an exhaustive suite.** |
| How much authority should the coding assistant get? | **Generate/edit/test proposals freely; no unreviewed packages, migrations, security policy or deploys.** |

**Runnable acceptance checklist**

Use this as the release checklist, not merely a one-time audit.

| Area | Concrete test |
|---|---|
| Keyboard sweep | Start at URL load and navigate every route without mouse. No unreachable action, accidental trap or unexplained focus jump. |
| Focus visibility | Tab through app beneath sticky header/bottom controls/popovers; focused control never becomes entirely obscured. |
| Target size | Inspect ellipsis, chevrons, bell, checkbox, dialog X, tooltip triggers and drag handles; ≥24×24 or valid spacing exception. |
| Combobox | Open with Enter/Space/arrows; navigate; typeahead; Escape restores; Tab commits; active option scrolls. |
| Menu | Enter/Space/Down open; arrows/typeahead; disabled item; Escape/Tab close correctly; focus returns. |
| Palette | Ctrl+K from normal page and editor; rapid input; scopes; prefix; result activation; Escape; zero/error/loading state. |
| Breadcrumb | Navigate links, open sibling popup, overflow at 320 px, Escape, Back. |
| Routed org nav | Ctrl/keyboard-open link in new tab where browser allows; Back restores previous route; `aria-current` correct. |
| Sidebar | Toggle with Space/Enter; collapse while descendant was focused; current page remains understandable. |
| Plan | Native checkbox Space; blocked/deferred/cancelled spoken as text; collapse/expand; move without drag; progress read as n/m plus blocked. |
| Toast/Realtime | Trigger while continuously typing; focus never moves; announcements are not repeated; Undo reachable before dismissal. |
| Dialog | Initial focus; complete Tab/Shift+Tab loop; Escape; focus return; destructive dialog starts safely. |
| Dialog+popover | Open select/menu inside modal in Chrome/Firefox/WebKit/iPhone/Android; popup is visible **and interactive**; Escape closes only expected layer. |
| Peek | Desktop remains nonmodal; phone becomes modal; close/focus return. |
| Tooltip | Keyboard focus reveals; pointer can hover content; Escape closes; no essential information exists only there. |
| Table | Caption/headers/sort state; keyboard reaches only actual controls; responsive horizontal scroll usable. |
| Drag | Complete identical reorder with mouse, touch and buttons only. |
| Diff | Navigate changes without interpreting color; Accept/Reject from keyboard and screen reader; focus lands on logical next hunk. |
| Notifications | Unread is textual; bell name includes state; newly inserted rows do not steal focus. |
| Import | Complete import with file picker only; invalid ZIP error associated; progress not chatty; cancel safe. |
| Loading | Skeleton hidden from AT; one loading message; busy resets; no focus loss. |
| Auth | Password manager; paste password; paste full TOTP; autofill where platform offers; Turnstile failure path; second-factor recovery rehearsal. |
| SPA | Every route has unique title/H1; skip link works; route focus happens once; filters do not reset focus. |
| Zoom | 400%, equivalent 320 CSS px, every non-intrinsically-2D workflow remains usable. |
| Text spacing | Apply WCAG spacing override; no clipped labels/buttons. |
| Forced colors | Windows HC: focus/selected/error/disabled states remain distinguishable. |
| Reduced motion | Enable OS preference; no nonessential large movement/scroll animation. |
| CodeMirror | Tab leaves normally or Escape→Tab escape works; editor name announced; search/selection visible in forced colors; mobile typing. |
| Axe | Run after each materially different widget state, not merely initial page. |
| ARIA snapshots | Assert role/name/state for closed/open/selected/error widget states. |
| NVDA | Full Windows Chrome smoke, especially combobox, dialog, plan, editor and diff. |
| Narrator | Same critical flow. |
| TalkBack | Android Chrome select, palette, dialog, plan and editor. |
| VoiceOver | iPhone Safari auth, select, dialog, plan, editor and share flow. |
| Offline | Pin doc → offline launch/read; unpinned doc absent; sign out → private data gone; revoke access → reconnect cannot refresh. |
| Performance | Mid-range Android cold load, project navigation, editor open, diff open, 500-row plan; compare to budgets. |
| Visual | Stable CI screenshot baseline for critical dark/phone/dialog/widget states. |
| Flake | Any retry-success is recorded as flaky, not silently accepted. |
| DB | Local pgTAP/grants/RLS matrix green for every migration. |
| Recovery | Real TOTP backup factor, backup restore, invitation, Gmail and offline wipe drills pass. |

## Self-audit and source appendix

**Self-audit of the ten claims most likely to change decisions**

I deliberately re-opened these ten primary sources at the end of the research pass rather than relying on earlier search snippets.

| Claim | Reverification result |
|---|---|
| WCAG 2.5.8's basic target threshold is 24×24 CSS px, with defined alternatives/exceptions | **CONFIRMED** against W3C Understanding 2.5.8, re-opened 2026-10-22. citeturn24view0 |
| The APG select-only combobox example carries an explicit production/testing warning and uses active-descendant/listbox semantics | **CONFIRMED** against W3C APG, re-opened 2026-10-22. citeturn24view1 |
| axe-core says automated axe testing detects about 57% of WCAG issues on average | **CONFIRMED** against current axe-core repository, re-opened 2026-10-22. citeturn24view2 |
| Safari/WebKit documents up-to-60%-of-disk origin quota and origin-wide eviction behavior | **CONFIRMED** against WebKit storage policy, re-opened 2026-10-22. citeturn24view3 |
| Vite 8's production default is Baseline Widely Available and includes Chrome/Edge 111, Firefox 114, Safari/iOS 16.4 | **CONFIRMED** against Vite 8 docs, re-opened 2026-10-22. citeturn24view4 |
| Standard GitHub-hosted runners are free/unlimited for public repositories | **CONFIRMED** against GitHub Docs, re-opened 2026-10-22. citeturn24view5 |
| React 19.3 made React View Transitions stable | **CONFIRMED** against React's Sept 9, 2026 release post, re-opened 2026-10-22. citeturn24view6 |
| `showModal()`/modal dialog uses the platform top-layer/inert model and must be operated through dialog APIs correctly | **CONFIRMED** against HTML Living Standard last updated Oct 20, 2026. citeturn24view7 |
| WCAG 3.3.8 permits mechanisms such as password managers/copy-paste rather than forcing cognitive authentication | **CONFIRMED** against W3C Understanding 3.3.8, re-opened 2026-10-22. citeturn24view8 |
| WCAG 3.0 is still a Working Draft, not a replacement conformance target | **CONFIRMED** against Sept 10, 2026 W3C Working Draft. citeturn24view9 |

Items I could **not** confirm to the standard demanded by your process rule: exact current React Aria patch because your npm-registry audit and available web index conflict; the current no-card/free-tier contractual details for Sentry/GlitchTip; current October 2026 releases for Accessibility Insights, pa11y, MCP Inspector, typescript-eslint, jsx-a11y, React Hooks ESLint plugin and Knip; exact current JAWS zero-cost/demo terms; and the precise Safari 27 manifestation of the historical seven-day script-writable-storage rule. Those items are marked **UNVERIFIED/HOLD** rather than guessed.

**Primary/source appendix**

| Source | Date/state | Type | Used for |
|---|---|---|---|
| W3C APG Keyboard Interface | current retrieved 2026-10-22 | Standard-practice guidance | composite-widget focus/keyboard model. citeturn0search0 |
| W3C APG Combobox / Select-only example | updated 2025-08; re-opened 2026-10-22 | W3C APG | select roles, states, keyboard and warnings. citeturn24view1 |
| W3C APG Menu Button/Menu | current retrieved 2026-10-22 | W3C APG | menus. citeturn2view0turn2view1 |
| W3C APG Dialog | current retrieved 2026-10-22 | W3C APG | modal focus. citeturn2view2 |
| W3C APG Tabs | current retrieved 2026-10-22 | W3C APG | tab keyboard model. citeturn2view3 |
| W3C APG Disclosure | current retrieved 2026-10-22 | W3C APG | sidebar groups. citeturn2view4 |
| W3C APG Treeview | current retrieved 2026-10-22 | W3C APG | evidence for not adopting tree prematurely. citeturn2view5 |
| W3C APG Tooltip | current; pattern explicitly incomplete | W3C APG | tooltip caveat/behavior. citeturn2view6 |
| W3C APG Breadcrumb | current | W3C APG | breadcrumb semantics. citeturn2view7 |
| W3C APG Table/Grid | current | W3C APG | table versus grid. citeturn2view8turn2view9 |
| W3C APG Checkbox/Alert/Listbox | current | W3C APG | checkbox, live regions, listbox restrictions. citeturn2view10turn2view11turn2view12 |
| WCAG 2.2 Understanding 2.4.11 | current | W3C normative-supporting guidance | focus obstruction. citeturn7view0 |
| WCAG 2.2 Understanding 2.5.7 | current | W3C guidance | drag alternatives. citeturn7view1 |
| WCAG 2.2 Understanding 2.5.8 | re-opened 2026-10-22 | W3C guidance | 24 px target rule. citeturn24view0 |
| WCAG 2.2 Understanding 3.2.6 / 3.3.7 / 3.3.8 | current | W3C guidance | help, redundant entry, authentication. citeturn7view3turn7view4turn24view8 |
| WCAG 2.2 Understanding 1.4.11 / 1.4.13 / 2.2.2 | current | W3C guidance | dark UI contrast, hover content, motion. citeturn7view6turn7view7turn7view8 |
| WCAG 2.2 Understanding 1.4.10 / 1.4.12 | current | W3C guidance | 400% reflow/text spacing. citeturn7view9turn7view10 |
| WCAG 3.0 Working Draft | 2026-09-10 | W3C Working Draft | status of WCAG 3. citeturn24view9 |
| WHATWG HTML Living Standard | updated 2026-10-20 | Living standard | native dialog/top layer. citeturn24view7 |
| WHATWG top-layer issues | current retrieved 2026-10 | Standards-engine issue tracker | dialog/popover interoperability risks. citeturn6search0turn6search4 |
| W3C APG issue tracker | 2023–2025 reports, status reviewed 2026 | Maintainer issue tracker | documented TalkBack/VoiceOver caveats, not generalized test results. citeturn5search4turn5search0 |
| a11ysupport.io | current retrieved 2026 | Community interoperability dataset | supplementary AT-support evidence, explicitly treated as non-certification. citeturn5search12 |
| Cloudflare Turnstile docs | updated through 2026 | Vendor primary docs | interaction, testing and CSP. citeturn8search0turn8search10turn8search2 |
| Supabase Auth MFA/passkey docs | current 2026 | Vendor primary docs | TOTP/recovery/passkeys. citeturn8search4turn8search3turn8search1 |
| CodeMirror docs/changelog | through 2026 | Maintainer primary docs | Tab escape, accessibility attributes, active maintenance. citeturn12search0turn11search0turn12search16 |
| Adobe React Spectrum repository/releases/issues | through Oct 2026 | Maintainer primary | React Aria health, accessibility claims and current regressions. citeturn17search0turn17search1turn17search3 |
| Base UI docs/npm | Oct 2026 | Maintainer/registry primary | version, licence, React support. citeturn16search2turn17search2 |
| Ariakit repo/npm | Oct 2026 | Maintainer/registry primary | version, licence, health. citeturn16search3turn19search1 |
| Radix repo/npm | Oct 2026 | Maintainer/registry primary | version, licence, React range. citeturn16search1turn19search0 |
| axe-core repository/release | 2026-10-05/current | Maintainer primary | 57% average coverage, current release. citeturn24view2 fileciteturn3file0L1-L2 |
| Playwright docs/release | current; release 2026-10-14 | Maintainer primary | ARIA snapshots, visual tests, retries/traces, browser projects. citeturn23search0turn23search1turn23search4turn23search10 fileciteturn2file0L1-L2 |
| WebKit Storage Policy | current page, policy beginning Safari 17 | Browser-engine primary | quota/eviction. citeturn24view3 |
| vite-plugin-pwa releases | 2026-10-03 | Maintainer primary | v2.0.0 status. fileciteturn4file0L1-L2 |
| Workbox releases | 2026-05-05 | Maintainer primary | v7.4.1 status. fileciteturn5file0L1-L2 |
| Vite 8 docs/release | 2026-03 through current | Maintainer primary | Rolldown and production browser target. citeturn22search2turn24view4 |
| React 19.3 release | 2026-09-09 | Framework primary | stable View Transitions/Fragment refs. citeturn24view6 |
| GitHub Actions runner/retention docs | current Oct 2026 | Vendor primary | public runner cost and artifact retention. citeturn24view5turn22search16 |
| Vercel Speed Insights/Hobby docs | 2026-01 | Vendor primary | free Hobby data-point/project allowance. citeturn24search12turn24search13 |
| ESLint release notes | 2026-02 through 2026-10-16 | Maintainer primary | ESLint 10/flat config/current 10.13. citeturn24search5turn24search9 |
| Vitest official release | 2026-10-15 | Maintainer primary | Vitest 5.0.5. fileciteturn1file0L1-L2 |
| 2026 AI-assisted-development literature review | 2026-05 | Academic review, not original RCT | evidence-quality caveat/productivity contradiction. citeturn23academia48 |
| GeminiForge context pack | updated 2026-10-22 | Project primary context | live stack/product state. fileciteturn0file0 |
| GeminiForge Master Plan v2.1 | 2026-10-22 | Project primary planning doc | step-by-step verdicts. fileciteturn0file1 |
| Prior GeminiForge research | 2026-10-21/22 | Secondary project research, challenged rather than trusted blindly | previous offline/editor/UI assumptions. fileciteturn0file2 |
| Vision/architecture/security state update | 2026-10-22 | Project primary state update | authoritative current technical facts. fileciteturn0file3 |
| Current UI screenshots | 2026-10-21 | Project visual evidence | 30 px density, custom dropdown, palette, mobile UI. fileciteturn0file4 |