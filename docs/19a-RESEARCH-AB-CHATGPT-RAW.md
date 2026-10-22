# GeminiForge Workbench Technical Architecture Audit — October 2026

**Audit date:** 2026-10-22  
**Scope:** Parts A and B of the requested frontend, data, security, operations, and free-tier architecture review.  
**Constraint treated as absolute:** operating cost must remain **exactly USD 0**; recommendations that require a card, credit balance, paid plan, domain, paid API, or temporary trial are rejected.

**Assumption:** the repository still broadly follows the `parts/*`, `supabase/*`, and test layout described in the architecture PDF; where that PDF conflicts with your verified 2026-10-22 state—such as migration/table counts—your current statement wins. fileciteturn0file3

## Executive Summary

- **Upgrade React 18 to React 19.3, but not before the urgent Supabase security work.** React 19.3 is the current stable React line in the registry; React 19 brought Actions, `use()`, ref-as-prop and other API changes, while 19.3 made View Transitions and Fragment refs stable. Upgrade through React 18.3 first and run the complete Playwright suite. **Do not enable React Compiler in the same change.** The compiler is production-stable, but it should be a separate optimization experiment after React 19 is green. Effort: **M**. citeturn16search0turn16search2turn16search3turn16search4turn16search1

- **Keep Zustand. Do not migrate to Jotai, Redux Toolkit, or signals.** Zustand remains actively maintained, tiny in dependency surface, and already fits your app. Jotai is the best alternative if highly granular atom state becomes a real need; Redux Toolkit adds structure you do not need at solo-project scale; signals introduce another state model and, depending on implementation, compiler/transform considerations. A state-library rewrite has essentially no product or security return. Effort: **S to do nothing**. Verdict: **KEEP**. citeturn7search2turn7search3turn8search1turn7search1

- **Keep hash routing for now, especially for secret share links.** A URI fragment is not transmitted in an HTTP request and cannot appear in the HTTP `Referer`, whereas path and query secrets can reach Vercel/CDN/server logs and can appear in referrer data subject to policy. This is an unusually good fit for a private, non-SEO SPA. However, a fragment is **not a security boundary**: it remains in browser history, JavaScript can read it, extensions can potentially see it, and an email/link-security product that parses the literal URL already has the fragment even if its HTTP request cannot transmit it. Use `#/s/<random-secret>`, SHA-256-hash the secret in the database, never consume it merely by loading the page, and enforce expiry/revocation/scope server-side. Effort: **S**. citeturn10search1turn10search15turn9search5

- **Keep plain CSS and remove CSS complexity, not add a CSS framework.** Do not adopt Tailwind or another utility system. During the planned module restructure, split the giant CSS source into feature-oriented files, add custom properties and native CSS nesting, and use newer platform primitives selectively. Container queries, `:has()`, Popover, View Transitions, `color-mix()`, `@starting-style`, `<dialog>`, `field-sizing`, and `light-dark()` have broadly useful support in current engines; anchor positioning remains insufficiently interoperable for required layout, and scroll-driven animations remain a progressive enhancement because Firefox support is the weak point. citeturn13search4turn14view0turn14view1turn14view2turn14view3turn15view0turn14view5turn14view6turn14view7turn14view8turn13search1turn15view1

- **Do not install a headless component library wholesale.** Replace modal infrastructure with native `<dialog>` first; use Popover where it eliminates top-layer/light-dismiss plumbing; keep your tested combobox, action-menu keyboard behavior, and command palette unless accessibility tests expose defects. If one difficult widget needs replacement, **React Aria Components** is the strongest selective candidate because its stated design centers keyboard, touch and screen-reader interactions. Ariakit is the lean alternative but remains on a `0.x` release line; Radix is mature but carries more package surface per primitive; Base UI is active but has recently undergone a package rename; Headless UI is less aligned with your no-Tailwind stack. citeturn11search0turn11search9turn11search1turn11search2turn12search0turn12search4turn12search6

- **The PDF's CodeMirror 6 decision is correct.** Markdown is your durable source format, so the primary editor should edit the actual string, not a structured document that is later serialized back to Markdown. Use CodeMirror 6 plus `@codemirror/lang-markdown`, `@codemirror/merge`, version-based optimistic concurrency, and a sanitized React Markdown preview. Do not make Tiptap/ProseMirror, Lexical, BlockNote, or another WYSIWYG model your canonical editor unless a future round-trip test proves byte/content preservation for your dialect. Your prior research's exact CodeMirror version numbers have already drifted slightly, which reinforces pinning versions rather than copying research-document numbers. citeturn24search4turn24search6turn21search8 fileciteturn0file2

- **The highest-priority change is the Supabase Data API grant transition, before October 30.** Supabase announced that new `public` objects stop receiving the old automatic Data API privileges; existing privileges are preserved, but future tables need explicit grants. Opt into the new default-privilege behavior now, inventory all 33 tables, and require every future migration to create the object, enable RLS, establish explicit grants, create policies, and add policy-supporting indexes together. Missing grants result in permission failures even when the RLS policy itself is correct. citeturn17search2turn18search0

- **Do not leave all 28 `SECURITY DEFINER` findings untouched merely because the permission checks are intentional.** Advisor findings 0028/0029 are warnings about executable definer functions, not proof of vulnerabilities, but the right response is classification: turn unnecessary definers into invokers; move internal helpers out of exposed schemas; revoke default `PUBLIC` and `anon` execution; keep only deliberately exposed authenticated/share RPCs; set `search_path = ''`; fully qualify objects; and repeat authorization inside every elevated RPC. A “public definer that checks permissions” can be legitimate, but it should be the exception, not the default architecture. Effort: **M**, security value: **very high**. citeturn19search0turn19search1turn18search0turn19search8

- **Use adjacency lists for plans, immutable revision/verification events for document trust, durable notification rows, hashed scoped share links, and ordinary PostgreSQL FTS.** Do not install `ltree`, vector, or a closure-table subsystem now. I would also simplify one PDF decision: for ordering, a `bigint` gap scheme is easier for a solo application than text fractional indexing; if you retain fractional strings, enforce `COLLATE "C"` and bytewise client comparison and never use `localeCompare`. For progress, count ordinary leaf steps equally at first; defer weighted progress until a concrete project needs it.

- **The zero-dollar architecture is viable for your scale, but storage—not compute—is the resource to watch.** Supabase Free currently exposes a 500 MB database allowance, 1 GB Storage, 500,000 Edge Function invocations, 2 million Realtime messages and 200 peak Realtime connections; free Storage has a 50 MB maximum upload and does not include paid image transformations. For a text-centric solo workspace, database growth from revisions/audit history is the likely long-term pressure; once images become common, the 1 GB Storage allowance and egress can become the first practical limits instead. Measure actual usage rather than designing around quota speculation. citeturn22search4turn22search7turn22search9turn22search14turn22search0turn22search2

## Part A — Front-End Stack

**A1 — React, state management, and upgrade timing**

**Recommendation.** Move from React 18 to **React 19.3**, after the Supabase grant/definer work and before starting a large editor implementation. Do not combine the React upgrade, React Compiler, router migration, CSS restructuring and CodeMirror implementation in one branch.

React 19 shipped Actions and associated APIs such as `useActionState` and `useOptimistic`; it also made `ref` available as a regular function-component prop and introduced `use()` for consuming promises/context. React 19.3, released September 9, 2026, made React's View Transition API and Fragment refs stable. The official React 19 migration guide recommends first moving to React 18.3 because 18.3 is effectively React 18 plus warnings for things that break or change under 19. citeturn16search4turn16search2turn16search3

For **your** Vite SPA:

| React feature | Actual value to GeminiForge | Recommendation |
|---|---|---|
| Actions / async transitions | Useful for pending/error/optimistic UI around saves, invitations and approvals, but your Supabase mutation functions already provide a workable abstraction | Adopt opportunistically; no rewrite |
| `use()` | Useful when integrating Suspense-aware promise/context patterns; not a reason by itself to upgrade | Available, but do not redesign data access around it |
| Ref as a prop | Can remove some future `forwardRef` plumbing in custom widgets | Use in new code; do not mass-rewrite stable widgets |
| View Transitions | Good fit for document/sidebar transitions and route polish | Add only after functional upgrade; enhancement, not architecture |
| Fragment refs | Potentially useful for complex composite components without wrapper elements | Optional |
| React Compiler | Potentially eliminates hand-written memoization and can optimize existing components | **Separate experiment after React 19** |
| Server Actions / RSC ecosystem | Irrelevant to your Vite client SPA unless you deliberately adopt a server-component stack | Skip |

The React Compiler reached stable 1.0 status in October 2025 and is designed for incremental adoption rather than requiring an all-at-once rewrite. That makes it credible technology, but there is little benefit in using it as part of your React-major migration. Establish React 19 correctness first, profile actual rerender problems, then compile a limited scope and compare behavior and build output. citeturn16search1

The largest React-19 risk in your app is not “React 19 itself”; it is the concentration of home-grown focus/ref behavior across custom comboboxes, menus, modals and the command palette. React's official migration guide specifically calls out TypeScript/ref-related changes and deprecated patterns. Your 150+ Playwright tests substantially lower the risk, provided keyboard and focus tests are represented, rather than only mouse-click paths. citeturn16search2

**State management.** Keep Zustand. The prior architecture places routing and shared state in `parts/30-store.tsx`; that existing investment matters more than theoretical comparisons. fileciteturn0file3

Jotai is the best alternative if you later discover that independent document/editor atoms dramatically simplify rerender isolation. Redux Toolkit is excellent when a larger team needs standardized data flow, slices, middleware conventions and debugging discipline, but those are not your bottleneck. Signals are attractive for fine-grained reactivity but would add another mental/runtime model to a React application that already has working Zustand state. Current package registries continue to show all of these as maintained projects. citeturn7search2turn7search3turn8search1turn7search1

**Migration effort:** **M** for React 19; **none** for the Zustand decision.

**Best alternative:** stay temporarily on React 18 while building the editor. I reject that as the medium-term plan because React 19 has now had nearly two years of ecosystem maturation and 19.3 is a current stable release. It is better to cross the major-version boundary before adding another large interactive subsystem. citeturn16search0turn16search3

**Six-month risk:** React 19.x will continue receiving fixes and libraries may increasingly optimize for it. React Compiler integration around modern Vite/Rolldown tooling may also improve; the exact best Vite/compiler pipeline in October 2026 was **UNVERIFIED** from the returned primary documentation, so do not make the compiler part of your mandatory migration.

**Verdict:** **UPGRADE, staged. React 19.3 yes; compiler later; Zustand stays.**

**Current recommended-tool ledger**

| Tool | Version verified in current source | Licence | Last-release evidence | Decision |
|---|---:|---|---|---|
| React | **19.3.0** | MIT | React 19.3 release: **2026-09-09** | Adopt |
| Zustand | **5.0.15** | MIT | Registry returned a recent 2026 publication, but the exact calendar date was not exposed in the fetched result: **UNVERIFIED exact date** | Keep |
| Vite | **8.3.5** | MIT | Registry showed current publication on **2026-10-22** | Adopt |
| ESLint | **10.13.0** | MIT | Registry showed publication about **2026-10-19** | Keep |
| `@codemirror/lang-markdown` | **6.5.2** | MIT | npm: published approximately August 2026; **exact date UNVERIFIED** | Adopt |
| `@codemirror/merge` | **6.12.2** in the current fetched registry result | MIT | 2026, exact registry timestamp **UNVERIFIED** | Adopt |
| `rehype-sanitize` | **6.0.0** | MIT | npm says published about three years ago | Adopt; mature/stable |
| `react-markdown` | current package verified as active, but the fetched first-party excerpt did not expose its version sidebar | package version/date **UNVERIFIED in this run** | Verify before pinning | Adopt/retain as renderer |

React, Vite and ESLint registry evidence is current to the audit date. citeturn16search0turn21search5turn21search0 CodeMirror Markdown and sanitization data comes directly from npm package pages. citeturn24search6turn24search0

The prior PDF lists slightly different CodeMirror package numbers—for example `@codemirror/merge 6.12.3`—than the current registry search returned (`6.12.2`). I therefore treat the PDF's exact package ledger as stale or possibly affected by registry timing rather than source-of-truth version data. fileciteturn0file2

**A2 — Routing, Vercel and secret URLs**

**Recommendation.** Keep the existing hash router. Do not introduce React Router or TanStack Router simply to replace working URL parsing.

History routing is technically easy on Vercel: Vite SPAs can use a catch-all rewrite to `index.html`. That is not the issue here. The question is whether history routes give your private application enough value to justify another dependency and a migration. They do not. SEO is explicitly irrelevant to you, and hash routing has a real accidental-secret-exposure advantage for share links because URI fragments are not part of the HTTP request target. citeturn10search0turn10search2turn10search1turn10search15

The security difference is important:

| Form | Sent to your server/CDN in HTTP request? | Can be in HTTP `Referer`? | Browser history/address bar | Link-scanner implications | Verdict |
|---|---|---|---|---|---|
| `/s/SECRET` | **Yes** | Path may be included depending on referrer policy/destination | Yes | Scanner requests expose token to receiving infrastructure | Avoid for bearer secrets |
| `/?share=SECRET` | **Yes** | Query information can leak under permissive/same-origin circumstances | Yes | Easy for scanners/proxies/logging to capture | Worst choice |
| `/#/s/SECRET` | **No fragment** | Fragment is prohibited from the `Referer` value | Yes | Scanner can still read the literal URL from an email/message; ordinary HTTP fetch does not transmit the fragment | **Preferred** |

The standards point is narrower than “fragments are safe”: RFC/URL processing keeps fragments client-side for HTTP requests, and `Referer` excludes them. It does **not** protect against browser history, copied URLs, JavaScript running in your origin, browser extensions, screenshots, clipboard history or a security service that has the original message text. citeturn10search15turn9search5

Therefore the share-link implementation should be:

```text
https://geminiforge-workbench.vercel.app/#/s/<43-ish-character-base64url-secret>
```

with at least 256 bits of randomness. Store only `SHA-256(secret)` in PostgreSQL. The raw secret lives only in the URL shown to the creator/recipient. On navigation, JavaScript sends the token in the **body** of a POST/RPC request, not as another URL parameter. The database function verifies the hash, expiry, revocation and scope before returning a deliberately reduced public projection.

A scanner opening the link must **not** consume or revoke it. GET/page-load semantics should be idempotent. This repeats the good design already present in your invitation workflow, where scanner loads should not equal acceptance. fileciteturn0file2

Use `Referrer-Policy: no-referrer` on the app or at least on the share experience as defense in depth. The fragment is already omitted from `Referer`, but this also prevents the non-secret route/origin navigation context from being sent onwards. Do not load third-party analytics, remote images or other third-party resources on the share page.

**React Router.** If your home-grown `parseHash`/`toHash` implementation becomes a source of bugs, React Router is the conservative replacement. Its current release train is active in 2026. Use it in hash-history mode so you preserve the security/hosting properties above. citeturn9search0turn9search1

**TanStack Router.** This is the best alternative when compile-time route/search-parameter typing becomes important. It explicitly supports hash history as well as browser history. For your current route set, that advantage is smaller than the cost of replacing working routing and tests. citeturn9search4

**Migration effort:** keeping the router **S**; React Router conversion **M**; TanStack conversion **M/L** because type-safe routes tend to propagate through navigation code.

**Six-month risk:** none material. Hash routing is old, boring and compatible. Future router releases will not make history routing more secure for URL bearer secrets.

**Verdict:** **KEEP HASH ROUTING. Secret fragments are a useful exposure reduction, not authentication.**

**A3 — CSS, browser platform features and custom widgets**

Your own CSS is not a technical liability merely because it is custom. The liability is that the architecture PDF places effectively the whole stylesheet inside `parts/20-styles.tsx`; that makes ownership and deletion harder as the app grows. fileciteturn0file3

The correct migration is not “rewrite in Tailwind.” It is:

```text
src/
  app/app.css
  features/editor/editor.css
  features/navigation/navigation.css
  features/ai-space/review.css
  features/projects/projects.css
  lib/ui/primitives.css
```

after the module restructure has progressed far enough. Keep design tokens in custom properties and use native nesting where it makes selectors clearer.

**Browser support as of the October 2026 data queried for this audit:**

| Feature | Chrome | Edge | Firefox | Safari macOS | Safari iOS | Recommendation |
|---|---:|---:|---:|---:|---:|---|
| Container size queries | 106+ | 106+ | 110+ | 16+ | 16+ | **Use** |
| `:has()` | 105+ | 105+ | 121+ | 15.4+ | 15.4+ | **Use** |
| Popover API | 114+ | 114+ | 125+ | 17+ | 17+ | **Use selectively** |
| CSS Anchor Positioning | 125+ but current support has partial/interoperability caveats | 125+ partial | current tracked implementations still have partial caveats | Safari 26 partial; 27 materially improved/full in the tracked table | same Safari-generation caveat | **Progressive enhancement only** |
| Same-document View Transitions | 111+ | 111+ | 144+ | 18+ | 18+ | **Safe enhancement** |
| `color-mix()` | 111+ | 111+ | 113+ | 16.2+ | 16.2+ | **Use** |
| `@starting-style` | 117+ | 117+ | 129+ | 17.5+ | 17.5+ | **Use** |
| Scroll-driven animations | 115+ | 115+ | interoperability gap remains in current tracked Firefox data | 26+ | 26+ | **Decorative only** |
| `<dialog>` | 37+ | 79+ | 98+ | 15.4+ | 15.4+ | **Use now** |
| `field-sizing` | 123+ | 123+ | 152+ | 26.2+ | 26.2+ | **Use with simple fallback** |
| `light-dark()` | 123+ | 123+ | 120+ | 17.5+ | 17.5+ | Technically safe; **irrelevant to dark-only design** |
| Native CSS nesting | 120+ | 120+ | 117+ | 17.2+ | 17.2+ | **Use** |

These support conclusions come from current Can I Use data rather than the PDFs. citeturn13search4turn14view0turn14view1turn14view2turn14view3turn15view0turn14view5turn14view6turn14view7turn14view8turn13search1turn15view1

The most useful practical simplifications are:

**Modal:** convert to `<dialog>` and `showModal()`. Native modal dialogs get the top layer and modal interaction semantics, dramatically reducing the amount of homemade layering/inert-background code. Keep explicit accessible naming, sensible initial focus and a tested return-focus policy. This also directly addresses the architecture PDF's warning that the phone “peek panel” is not a true modal. citeturn14view7 fileciteturn0file3

**Action menus:** Popover can eliminate much of your positioning/top-layer/light-dismiss machinery, but **Popover does not turn arbitrary content into an ARIA menu** and does not magically supply menu arrow-key/typeahead behavior. Keep that keyboard logic or replace the behavioral primitive with a tested library. citeturn14view1

**Tooltips:** Popover/top-layer capabilities can help with display. Tooltip accessible-name/description semantics, hover/focus triggering, escape behavior and not trapping interactive content remain your responsibility.

**Command palette:** use `<dialog>` for the container, but retain the combobox/listbox interaction model. `<dialog>` solves the modal shell, not search/list navigation.

**Selects:** I disagree with the master-plan statement that every native select should be replaced by a custom animated dropdown. fileciteturn0file1 Use native `<select>` for simple finite options such as role/status/sort where search is unnecessary. Keep a custom or headless combobox only for searchable project/document/member selectors. This reduces keyboard, touch, screen-reader and mobile-picker maintenance immediately.

**CSS Modules:** they are a reasonable best alternative if the eventual `src/features/*` split produces recurring accidental selector collisions. Do not convert existing CSS merely to get generated class names. Plain CSS plus a feature naming convention is adequate for a solo app.

**Utility CSS:** skip. It would rewrite working styling, add another abstraction and provide little correctness/security value.

**Migration effort:** `<dialog>` **S/M**; selected Popover migrations **S**; feature CSS split **M**; framework rewrite **L and rejected**.

**Six-month risk:** anchor positioning and scroll-driven animation interop will probably continue improving. That is precisely why they should be enhancement layers rather than required application mechanics today.

**Verdict:** **PLAIN MODERN CSS + NATIVE PRIMITIVES. NO CSS FRAMEWORK.**

**A4 — Headless accessible component libraries**

A component-library migration only pays if it removes more code and bugs than it creates. Because you already have custom primitives plus 150+ browser tests, the bar is much higher than it would be for a new application.

| Library | Current maintenance evidence | Licence | Dependency/package observation | Accessibility position | GeminiForge decision |
|---|---|---|---|---|---|
| React Aria Components | `react-aria-components` **1.21.1**, actively published | Apache-2.0 | Broad component package; production bytes depend strongly on imports/tree-shaking | Explicitly built around mouse, touch, keyboard and screen-reader behavior | **Best selective adoption candidate** |
| Ariakit | `@ariakit/react` **0.4.42**, published days before audit | MIT | Registry showed only a small direct dependency surface | Strong headless accessibility focus | Good alternative, but 0.x API line is a stability cost |
| Base UI | `@base-ui/react` **1.9.0**, active | MIT | Several direct dependencies | Modern unstyled primitives | Watch; recent package rename increases churn |
| Radix UI | umbrella package **1.8.1**; Select **2.3.7** in fetched registry | MIT | Per-primitive packages may bring substantial transitive package count | Explicit WAI-ARIA/AT-focused design/testing | Excellent primitives, but unnecessary wholesale |
| Headless UI | active 2.x line | MIT | Larger framework-oriented component set | Good accessible primitives | Less attractive in this codebase, especially given Tailwind-oriented ecosystem/design assumptions |

Registry/package information is current from the official npm pages and Radix documentation queried for this audit. citeturn11search0turn11search9turn11search1turn11search2turn12search0turn12search4turn12search6

I am deliberately **not** giving “bundle size = X KB” claims. Whole-package bundle calculators are a poor architectural metric for headless component systems because actual cost depends on imported subpaths, tree-shaking, shared dependencies and your bundler. A production Vite bundle analysis after importing a candidate widget is stronger evidence than a generic marketing number.

The adoption rule I recommend is simple: **native first → existing tested custom widget second → one headless primitive when a specific widget continues to fail accessibility/maintenance tests.**

The highest-probability candidate for replacement is your custom searchable combobox. The lowest-value migration is a trivial button, native dialog, or static select.

Add accessibility automation with `@axe-core/playwright`, but do not mistake it for a keyboard/screen-reader behavioral proof. Preserve explicit Playwright tests for Tab, Shift+Tab, Escape, Enter, Space, arrow keys, typeahead where applicable, focus restoration and pointer/touch opening.

**Best alternative:** React Aria Components selectively. Why not now? Because a migration of widgets that already work is product-neutral work, and it may change DOM/focus behavior across many tests.

**Migration effort:** one widget **M**; whole primitive system **L**.

**Six-month risk:** Base UI and other young component ecosystems can change quickly. React Aria and Radix are more established, but no library removes the need to test your exact composition.

**Verdict:** **NO WHOLESALE LIBRARY. REACT ARIA ONLY AS A TARGETED ESCAPE HATCH.**

**A5 — Markdown, review UI and build tooling**

The PDF's source-editor choice is one of its strongest decisions. fileciteturn0file1

For Markdown that must remain source-faithful, CodeMirror has a structural advantage: **the text is the editor state.** There is no Markdown → rich document model → Markdown round trip merely to edit a paragraph. `@codemirror/lang-markdown` 6.5.2 is current in npm and MIT-licensed. citeturn24search6

For Tiptap/ProseMirror, Lexical and comparable structured editors, exact source preservation should be considered **UNVERIFIED unless the library explicitly guarantees it for your complete syntax dialect**. Parsing/serializing a structured representation can legitimately normalize list markers, whitespace, HTML, extension syntax or unsupported constructs. That makes these good *rich editors* but a poor canonical editor for a documentation repository whose stored format is meaningful Markdown.

**Recommended editor architecture:**

```text
stored Markdown
      │
      ├── CodeMirror 6 source editor
      │
      ├── sanitized preview
      │
      └── revision / proposal diff
             └── @codemirror/merge
```

`@codemirror/merge` is the right foundation for per-hunk AI review. Keep three concepts distinct:

```text
base revision       = document revision AI saw
current revision    = human-visible document now
proposed revision   = AI candidate
```

If `current_revision = base_revision`, hunk acceptance is straightforward. If not, calculate/rebase against all three; never silently apply an old offset/range to a newer document. A stale proposal should remain reviewable but require merge/conflict handling.

For concurrent human saves, use optimistic concurrency:

```sql
update public.docs
set
  body_md = :new_body,
  version = version + 1,
  updated_at = now()
where id = :doc_id
  and version = :base_version
returning id, version;
```

Zero returned rows means “your base is stale,” not “retry the same overwrite.”

**Mobile.** Code editing on a phone is inevitably less comfortable than ordinary textareas or native rich text, but that is not enough reason to sacrifice source correctness. Provide a large editing surface, avoid keyboard-shortcut-only actions, do not cover the selection with fixed toolbars, and manually test the real iOS Safari keyboard in addition to Playwright WebKit.

**Accessibility.** Give the editor an explicit visible/accessible label and do not make syntax decorations the sole carrier of meaning. Diff acceptance must also have ordinary buttons/keyboard actions rather than only clickable gutter graphics.

### Safe untrusted-Markdown pipeline

`react-markdown` explicitly states that it is safe by default but also warns that plugins, custom components and an unsafe `urlTransform` can reintroduce XSS; it recommends `rehype-sanitize` when complete safety is needed. `rehype-sanitize` likewise says to sanitize any HTML you do not fully trust and warns that transforms added after sanitization can make the result unsafe again. citeturn24search1turn24search0

For GeminiForge:

```text
Markdown string
   ↓
remark parse
   ↓
remark-gfm
   ↓
your safe internal-link transform
   ↓
HAST
   ↓
rehype-sanitize with a small explicit schema
   ↓
React elements
```

Rules:

1. **Do not enable arbitrary raw HTML.** There is no meaningful product need for collaborators or AI proposals to inject raw application DOM.

2. **Do not use `dangerouslySetInnerHTML` for Markdown.**

3. Explicitly restrict URL schemes. For normal links, permit things such as `https:`, `http:` if desired, `mailto:` if desired, and known internal document links. Reject `javascript:` and unexpected custom/data schemes.

4. Render external links with safe new-window behavior only when needed. Where `target="_blank"` is used, use appropriate `rel` isolation.

5. Keep remote images out of the **AI Review inbox**. A malicious document/proposal can otherwise turn rendering into an exfiltration side channel. Your prior MCP-security research correctly identified this class of problem. fileciteturn0file2

6. Sanitize after the final untrusted transform. `rehype-sanitize` specifically documents this ordering requirement. citeturn24search0

7. Be deliberate about generated heading IDs. `rehype-sanitize` prefixes IDs/names to defend against DOM clobbering. If GeminiForge wants stable block anchors, map your own safe database/block IDs rather than turning arbitrary headings into global DOM names. citeturn24search0

**KaTeX.** Add only when actual documents need math. KaTeX output requires a larger allowed element/class/MathML set than plain Markdown. Either sanitize the untrusted source tree before applying a trusted KaTeX renderer, or construct and test a narrowly expanded post-render sanitizer schema. Do not simply “allow every class because KaTeX needs classes.”

**Mermaid.** Defer it. Diagram text is executable-like input transformed into complex SVG/DOM, which creates a much larger sanitization and dependency surface. If you later need it, lazy-load it only for Mermaid fences, use its strictest security mode, and preferably render into an isolated/sandboxed context rather than trusting generated SVG in your main application DOM. The PDF's suggestion to lazy-load Mermaid is directionally right; I would make Mermaid optional later rather than editor-v1 scope. fileciteturn0file2

### Build and lint stack

Vite 8 has already crossed the Rolldown transition: the current npm package is Vite 8.3.5, and the Vite 8 release line integrated Rolldown into the normal build path. **Do not add Rolldown as another project dependency merely because it is new technology. Upgrade Vite and let Vite own its bundler.** citeturn21search5

Keep ESLint. ESLint 10.13.0 is current in the registry, and the React Compiler ecosystem exposes compiler-related lint rules through the React hooks lint tooling. Adding Biome merely to run a second competing lint stack provides little benefit to a working solo TypeScript app. citeturn21search0turn16search1

Biome is reasonable for a greenfield project seeking a single formatter/linter, but replacing working ESLint/prettier-or-current-formatting infrastructure is not a high-return GeminiForge task.

**Recommended sequence:** Vite 8 first; React 19 second; editor third; Compiler later.

**Migration effort:** CodeMirror/editor **M/L**; sanitizer hardening **S/M**; Vite 8 **S/M**; React Compiler experiment **M**.

**Verdict:** **CODEMIRROR SOURCE MODE + SANITIZED PREVIEW + CODEMIRROR MERGE. VITE 8. ESLINT. SKIP RICH-TEXT CANONICAL EDITING, BIOME MIGRATION, AND MERMAID FOR NOW.**

## Part B — Data and Backend on Supabase Free

**B1 — Schema patterns**

### Hierarchical plan nodes

**Recommendation: adjacency list.** Do not install `ltree` and do not build a closure table.

Your hierarchy is shallow, mutable and project-scoped. An ordinary `parent_id` gives the smallest write surface, works naturally with RLS/project foreign keys, and lets PostgreSQL recursive CTEs answer descendant queries. A closure table introduces second-order rows that every insert/move/delete must maintain; `ltree` introduces an extension/path representation that is unnecessary for a few hundred or even a few thousand planning nodes.

I would also simplify the PDF's “phase|step, sub-step = step parent” model rather than add a separate `substep` type. fileciteturn0file2

A good baseline migration is:

```sql
create table public.plan_nodes (
  id uuid primary key default gen_random_uuid(),

  project_id uuid not null
    references public.projects(id)
    on delete cascade,

  parent_id uuid null,

  kind text not null
    check (kind in ('phase', 'step')),

  title text not null
    check (length(btrim(title)) between 1 and 500),

  notes_md text not null default '',

  status text not null default 'todo'
    check (status in (
      'todo',
      'doing',
      'done',
      'blocked',
      'cancelled',
      'deferred'
    )),

  -- See ordering recommendation below.
  order_key bigint not null,

  created_by uuid not null
    references auth.users(id),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  revision bigint not null default 1
    check (revision > 0),

  unique (project_id, id),

  foreign key (project_id, parent_id)
    references public.plan_nodes(project_id, id)
    on delete restrict
);

create index plan_nodes_project_parent_idx
  on public.plan_nodes(project_id, parent_id);

create index plan_nodes_project_status_idx
  on public.plan_nodes(project_id, status);

create unique index plan_nodes_root_order_uq
  on public.plan_nodes(project_id, order_key)
  where parent_id is null;

create unique index plan_nodes_child_order_uq
  on public.plan_nodes(project_id, parent_id, order_key)
  where parent_id is not null;
```

`ON DELETE RESTRICT` for a parent is preferable to silently deleting a whole subtree because your product already emphasizes Trash/Undo. A project itself can retain its existing whole-project deletion/soft-deletion semantics.

Add a cycle/depth trigger. This is **defensive integrity**, not a replacement for UI validation:

```sql
create schema if not exists private;

create or replace function private.check_plan_node_parent()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_depth integer;
  v_cycle boolean;
begin
  if new.kind = 'phase' and new.parent_id is not null then
    raise exception 'A phase must be a root node';
  end if;

  if new.kind = 'step' and new.parent_id is null then
    raise exception 'A step must belong to a phase or another step';
  end if;

  if new.parent_id is null then
    return new;
  end if;

  if new.parent_id = new.id then
    raise exception 'A node cannot be its own parent';
  end if;

  if not exists (
    select 1
    from public.plan_nodes p
    where p.id = new.parent_id
      and p.project_id = new.project_id
  ) then
    raise exception 'Parent must belong to the same project';
  end if;

  with recursive ancestors as (
    select
      p.id,
      p.parent_id,
      1 as depth,
      array[p.id] as path,
      false as cycle
    from public.plan_nodes p
    where p.project_id = new.project_id
      and p.id = new.parent_id

    union all

    select
      p.id,
      p.parent_id,
      a.depth + 1,
      a.path || p.id,
      p.id = any(a.path)
    from ancestors a
    join public.plan_nodes p
      on p.project_id = new.project_id
     and p.id = a.parent_id
    where not a.cycle
      and a.depth < 64
  )
  select
    coalesce(max(depth), 0) + 1,
    coalesce(bool_or(id = new.id or cycle), false)
  into v_depth, v_cycle
  from ancestors;

  if v_cycle then
    raise exception 'Plan hierarchy cycle detected';
  end if;

  -- phase=1, step=2, substep=3, another nested step=4.
  if v_depth > 4 then
    raise exception 'Plan hierarchy may not exceed depth 4';
  end if;

  return new;
end;
$$;

revoke all on function private.check_plan_node_parent() from public;
revoke all on function private.check_plan_node_parent() from anon;
revoke all on function private.check_plan_node_parent() from authenticated;

create trigger plan_nodes_parent_guard
before insert or update of parent_id, project_id, kind
on public.plan_nodes
for each row
execute function private.check_plan_node_parent();
```

The depth limit is a product decision, not a PostgreSQL necessity. Four levels is reasonable given the PDF's existing target and prevents the UI from becoming an arbitrary tree browser. fileciteturn0file1

### Leaf-step progress

**Recommendation: computed every time; do not store parent percentages.** This agrees with both relevant PDFs. fileciteturn0file1 fileciteturn0file2

I would, however, **drop weights in v1**. Equal leaf steps are much easier for an owner to understand. Add weights only after a real project demonstrates that a 10-minute checkbox and a two-week implementation step must contribute differently.

A phase progress query can be:

```sql
with recursive subtree as (
  select
    n.id,
    n.parent_id,
    n.kind,
    n.status
  from public.plan_nodes n
  where n.id = $1
    and n.project_id = $2

  union all

  select
    c.id,
    c.parent_id,
    c.kind,
    c.status
  from public.plan_nodes c
  join subtree p
    on c.parent_id = p.id
  where c.project_id = $2
),
leaves as (
  select s.*
  from subtree s
  where s.kind = 'step'
    and not exists (
      select 1
      from public.plan_nodes child
      where child.project_id = $2
        and child.parent_id = s.id
        and child.kind = 'step'
    )
),
countable as (
  select *
  from leaves
  where status not in ('cancelled', 'deferred')
)
select
  count(*) as total_steps,
  count(*) filter (where status = 'done') as done_steps,
  count(*) filter (where status = 'blocked') as blocked_steps,
  case
    when count(*) = 0 then null
    else floor(
      100.0 *
      count(*) filter (where status = 'done') /
      count(*)
    )::integer
  end as progress_percent
from countable;
```

This preserves the good rules from the plan: cancelled/deferred do not inflate completion, blocked remains unfinished, an empty container is “no steps,” and rounding down prevents 99.x% being presented as 100%. fileciteturn0file2

### Ordering

Here I would **MODIFY the PDF**.

For a solo application, use a gap-based `bigint order_key`, initially:

```text
1024, 2048, 3072, 4096 ...
```

An insertion between 1024 and 2048 gets 1536. When there is no integer gap, renumber only that sibling set in one transaction. With one owner and a few collaborators, this is simpler to reason about, index and test than a string fractional-indexing algorithm.

**Best alternative — the PDF's fractional strings.** If you already have that code working and tested, retaining it is reasonable. Then use:

```sql
position_key text collate "C" not null
```

and enforce a restricted ASCII alphabet. On the TypeScript side:

```ts
function comparePosition(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
```

Do **not** use:

```ts
a.localeCompare(b)
```

because locale-aware comparison is not the same contract as PostgreSQL's byte-oriented `"C"` ordering.

Whichever approach you choose, add a stable `id` tie-breaker when reading and a unique-per-sibling constraint.

**Verdict:** **bigint gaps for v1; fractional strings only if you already possess a proven implementation.**

### Decisions

Your desired ADR model is sound, but the precise statement “MADR 4.0.0, released 2024-09-17, has exactly these fields” was not independently re-confirmed from the primary MADR repository in this web run. Treat that exact version/date as **UNVERIFIED here**, although it is recorded in the prior research PDF. fileciteturn0file2

Use real columns for lifecycle/query-critical fields and Markdown/JSON only for flexible narrative:

```sql
create table public.decisions (
  id uuid primary key default gen_random_uuid(),

  project_id uuid not null
    references public.projects(id)
    on delete cascade,

  ref text not null,
  title text not null,

  status text not null default 'proposed'
    check (status in (
      'proposed',
      'accepted',
      'rejected',
      'deprecated',
      'superseded'
    )),

  context_md text not null default '',
  decision_drivers_md text not null default '',
  options jsonb not null default '[]'::jsonb,
  outcome_md text not null default '',
  consequences_md text not null default '',
  confirmation_md text not null default '',
  more_information_md text not null default '',

  superseded_by uuid null
    references public.decisions(id),

  decided_at timestamptz null,
  decided_by uuid null
    references auth.users(id),

  review_after date null,

  revision bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(project_id, ref),
  unique(project_id, id),

  check (superseded_by is null or superseded_by <> id)
);
```

Keep links separate:

```sql
create table public.decision_plan_links (
  decision_id uuid not null references public.decisions(id) on delete cascade,
  plan_node_id uuid not null references public.plan_nodes(id) on delete restrict,
  relation text not null
    check (relation in ('drives', 'blocks', 'motivated_by')),
  primary key (decision_id, plan_node_id, relation)
);
```

I agree with the PDF that accepted decisions should not simply be edited until history becomes unknowable. A change in architectural decision should normally produce a replacement/superseding decision or a new revision with explicit provenance. fileciteturn0file1

### Document revisions and verification

This is an area where I would change the master plan materially.

The PDF proposes mutable document-level fields such as `verified_at`, `verified_until` and `reviewed_rev`, plus a job that “flips expired verifications.” fileciteturn0file1

Instead, make verification **an event tied to a specific revision**:

```sql
create table public.doc_verifications (
  id uuid primary key default gen_random_uuid(),

  doc_id uuid not null
    references public.docs(id)
    on delete cascade,

  revision_no bigint not null,

  verified_by uuid not null
    references auth.users(id),

  verified_at timestamptz not null default now(),
  review_after date null,

  note text not null default '',

  unique(doc_id, revision_no, verified_by, verified_at),

  foreign key (doc_id, revision_no)
    references public.doc_revisions(doc_id, revision_no)
    on delete restrict
);

create index doc_verifications_latest_idx
  on public.doc_verifications(doc_id, verified_at desc);
```

Then derive state:

```text
no verification                         → UNVERIFIED
latest verification revision != current revision
                                        → CHANGED_SINCE_VERIFIED
review_after < current_date             → REVIEW_DUE
otherwise                               → VERIFIED
```

The database clock can determine expiration on every query, so there is no boolean for cron to make stale. Cron is only needed to create reminder notifications.

This makes the crucial PDF rule automatic: **an AI-accepted edit never silently renews verification**. Any new revision immediately changes the state to “changed since verified.” fileciteturn0file1

### Notifications

Use a durable table; Realtime is just how the browser hears about it quickly:

```sql
create table public.notifications (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  project_id uuid null
    references public.projects(id)
    on delete cascade,

  doc_id uuid null
    references public.docs(id)
    on delete cascade,

  type text not null,

  payload jsonb not null default '{}'::jsonb,

  dedupe_key text null,

  created_at timestamptz not null default now(),
  read_at timestamptz null,

  check (read_at is null or read_at >= created_at)
);

create unique index notifications_dedupe_uq
  on public.notifications(user_id, dedupe_key)
  where dedupe_key is not null;

create index notifications_unread_idx
  on public.notifications(user_id, created_at desc)
  where read_at is null;
```

Do not treat a Realtime Broadcast or Presence event as the record. Reconnects happen; the row is truth.

### Daily view counters

For your present traffic, one row per document/day is sufficient:

```sql
create table public.doc_view_daily (
  doc_id uuid not null references public.docs(id) on delete cascade,
  day date not null,
  views bigint not null default 0 check (views >= 0),
  primary key (doc_id, day)
);
```

Atomic update:

```sql
insert into public.doc_view_daily(doc_id, day, views)
values ($1, current_date, 1)
on conflict (doc_id, day)
do update set views = public.doc_view_daily.views + 1;
```

The PDF's worry about “hot rows” is premature at one owner plus a few invitees. fileciteturn0file1

If you later have enough public-share traffic for that row to contend, shard it:

```sql
create table public.doc_view_daily_sharded (
  doc_id uuid not null references public.docs(id) on delete cascade,
  day date not null,
  shard smallint not null check (shard between 0 and 7),
  views bigint not null default 0,
  primary key(doc_id, day, shard)
);
```

Choose one of eight shards per view and sum them for reporting. Do not deploy that complexity now.

### Share links

Use high-entropy bearer capabilities with only their hashes stored.

```sql
create table public.share_links (
  id uuid primary key default gen_random_uuid(),

  project_id uuid not null
    references public.projects(id)
    on delete cascade,

  doc_id uuid null
    references public.docs(id)
    on delete cascade,

  scope text not null
    check (scope in ('project_read', 'document_read')),

  token_hash text not null unique
    check (token_hash ~ '^[0-9a-f]{64}$'),

  created_by uuid not null
    references auth.users(id),

  created_at timestamptz not null default now(),
  expires_at timestamptz null,
  revoked_at timestamptz null,
  last_used_at timestamptz null,

  check (
    (scope = 'project_read' and doc_id is null)
    or
    (scope = 'document_read' and doc_id is not null)
  )
);

create index share_links_project_idx
  on public.share_links(project_id);

create index share_links_active_idx
  on public.share_links(token_hash)
  where revoked_at is null;
```

Generate the raw 32-byte random value with browser Web Crypto, encode it as base64url, SHA-256 it client-side for insertion, and retain the raw value only in the fragment URL. Redemption should hash the supplied raw secret again in PostgreSQL with `pgcrypto`, then test:

```sql
token_hash = encode(digest(p_token, 'sha256'), 'hex')
and revoked_at is null
and (expires_at is null or expires_at > now())
```

Your user-supplied state says `pgcrypto` is installed, so no new extension is necessary.

The anonymous redemption function is one place where a narrowly scoped `SECURITY DEFINER` RPC can be justified: it must read a private row without granting anonymous table access. Return a dedicated public projection that contains **no membership rows, editor email addresses, internal token metadata, draft/review data, Trash data or unrelated project documents**. The prior PDF is right to call this out. fileciteturn0file1

### Favourites

Simple and correct:

```sql
create table public.favourites (
  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  doc_id uuid not null
    references public.docs(id)
    on delete cascade,

  created_at timestamptz not null default now(),

  primary key(user_id, doc_id)
);

create index favourites_user_created_idx
  on public.favourites(user_id, created_at desc);
```

Policy: users can see/insert/delete only rows where `user_id = (select auth.uid())`.

**B1 overall verdict:** adjacency list **AGREE**; computed progress **AGREE but drop weights initially**; fractional text ordering **MODIFY to bigint gaps unless already implemented**; decisions **AGREE with normalized lifecycle fields**; verification **MODIFY to immutable revision-linked events**; notifications **AGREE**; view-counter sharding **DEFER**; hashed share links **STRONGLY AGREE**; favourites **AGREE**.

**B2 — RLS, Data API grants, new API keys and `SECURITY DEFINER`**

### The October Data API privilege change

This is the most time-sensitive finding in the entire report.

Supabase's April 28, 2026 changelog announced the transition away from automatically granting new `public` objects to `anon`, `authenticated` and `service_role`. Existing object privileges are retained. The rollout includes the opt-out/transition period, defaults for newly created projects, and application to existing projects on **October 30, 2026**. That means you should adopt the future behavior yourself now rather than discover it when a new migration starts returning `42501`. citeturn17search2

Put this in an immediate migration:

```sql
-- Adopt the post-2026-10-30 Supabase Data API privilege model now.

alter default privileges for role postgres in schema public
revoke select, insert, update, delete
on tables
from anon, authenticated, service_role;

alter default privileges for role postgres in schema public
revoke usage, select
on sequences
from anon, authenticated, service_role;
```

Important nuance: `ALTER DEFAULT PRIVILEGES` applies to objects subsequently created by the specified owner role. Supabase migrations normally create application objects as the migration/database owner, but if you create objects under another owning role, audit that separately.

Then every new-table migration should follow one explicit pattern:

```sql
create table public.example (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.example enable row level security;

-- Start closed.
revoke all on table public.example
from public, anon, authenticated;

-- Grant only Data API operations this table actually supports.
grant select, insert, update, delete
on table public.example
to authenticated;

-- Only if a service-key backend really reads/writes this table through
-- PostgREST/Data API.
grant select, insert, update, delete
on table public.example
to service_role;

create index example_project_idx
  on public.example(project_id);

create index example_created_by_idx
  on public.example(created_by);

create policy "example_select"
on public.example
for select
to authenticated
using (
  -- Substitute your reviewed project permission helper.
  private.can_read_project(project_id)
);

create policy "example_insert"
on public.example
for insert
to authenticated
with check (
  private.can_edit_project(project_id)
  and created_by = (select auth.uid())
);

create policy "example_update"
on public.example
for update
to authenticated
using (
  private.can_edit_project(project_id)
)
with check (
  private.can_edit_project(project_id)
);
```

Grants and RLS solve different problems. The role needs the SQL privilege **and** the row must pass the relevant policy. Supabase's current RLS documentation explicitly discusses using explicit grants, role-scoped policies, indexes and `(select auth.uid())` where the auth value is invariant across rows. citeturn18search0

Do not mechanically wrap a project helper in an initPlan if its result depends on the current row's `project_id`. The optimization is for values/functions that can be calculated once for the statement. Within your permission helper, however, calculating the current user ID once with `(select auth.uid())` is appropriate. citeturn18search0

### Audit the 33 existing tables

Run:

```sql
select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,

  has_table_privilege(
    'anon',
    format('%I.%I', n.nspname, c.relname),
    'select'
  ) as anon_select,

  has_table_privilege(
    'authenticated',
    format('%I.%I', n.nspname, c.relname),
    'select'
  ) as authenticated_select,

  has_table_privilege(
    'service_role',
    format('%I.%I', n.nspname, c.relname),
    'select'
  ) as service_select

from pg_class c
join pg_namespace n
  on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind in ('r', 'p')
order by c.relname;
```

Then:

```sql
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
order by tablename, cmd, policyname;
```

And fail an audit if a base table is exposed without RLS:

```sql
select
  n.nspname,
  c.relname
from pg_class c
join pg_namespace n
  on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind in ('r', 'p')
  and not c.relrowsecurity;
```

For private-by-default tables, explicitly assert:

```sql
select has_table_privilege(
  'anon',
  'public.plan_nodes',
  'select'
);
```

must be false.

After October 30, what breaks is primarily **new objects whose Data API role privileges were being assumed**. Existing table grants are not automatically stripped by the transition. Direct SQL as the database owner/postgres role is a different path and is not evidence that PostgREST access will work. citeturn17search2

### Legacy key migration

Supabase now treats the old JWT-shaped `anon` and `service_role` API keys as legacy. Current migration/API-key documentation says to migrate to `sb_publishable_...` and `sb_secret_...`, with the legacy keys scheduled for deprecation around the end of 2026. citeturn17search0turn17search3

Map them as follows:

```text
Browser:
legacy anon key
        ↓
sb_publishable_...

Trusted server / Vercel / Edge administrative client:
legacy service_role
        ↓
sb_secret_...
```

A publishable key is intentionally safe to expose in browser configuration. A secret key is **not**; it belongs only in server/Edge secrets. Secret keys retain privileged backend behavior and must be treated with at least the same care as `service_role`. citeturn17search0

Recommended migration:

1. Create the new publishable and secret keys without deactivating the old keys.
2. Replace the browser's legacy `anon` key with the publishable key in your Vite environment.
3. Replace trusted backend/service usage with the secret key.
4. Search the repository and platform configuration for `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, hard-coded JWT-looking API keys and old environment-variable assumptions.
5. Update Edge Function initialization. Supabase's newer Edge environment exposes publishable/secret key maps rather than making every new key equivalent to the historical JWT variables. citeturn17search0
6. Update database webhooks/`pg_net`: opaque secret keys are sent as an `apikey` header, not treated as an old service-role JWT in `Authorization`. Store the secret in Vault rather than embedding it in SQL. citeturn17search0
7. Test browser Auth, every RPC, Storage, Realtime, MCP, invitation flow, scheduled jobs and any database-triggered HTTP calls.
8. Disable the old API keys.
9. Observe usage/last-used information and logs.
10. Only then remove the legacy API-key path permanently.

Be particularly careful with Edge Functions. New publishable/secret API keys are opaque—not JWTs themselves. User authentication is still represented by the user's Auth JWT. Do not “solve” a new-key failure by indiscriminately turning off JWT verification on every Edge Function. For MCP endpoints using your own bearer-token scheme, custom authorization can be appropriate, but every entry path then needs explicit authentication.

### JWT signing keys

API-key migration and Auth JWT signing-key rotation are related but **not the same project**.

Supabase's signing-key documentation supports overlapping keys/rotation so that a new signing key can be introduced before an old one is revoked. Consumers that verify Auth JWTs themselves should move toward the project's current public-key/JWKS mechanism rather than depending forever on the legacy shared `JWT_SECRET`. citeturn17search7turn17search1

I confirmed the end-of-2026 urgency for **legacy API keys**. I did **not** find an equally specific hard October/December 2026 deadline in the primary material returned for forcing every existing project onto one particular asymmetric signing algorithm. Therefore any claim that “you must rotate to ES256 by date X” is **UNVERIFIED**.

Do the API-key migration now. Then audit the Auth signing-key page in your live dashboard, test JWKS verification in MCP/Edge integrations, rotate while both verification paths can coexist, and revoke the old signing secret only after current clients no longer depend on it.

### The 28 `SECURITY DEFINER` findings

Supabase's current security advisors contain:

- **0028** — anonymous role can execute a `SECURITY DEFINER` function.
- **0029** — authenticated role can execute a `SECURITY DEFINER` function. citeturn19search0

Those lints are warnings about attack surface. They do not know whether your function correctly checks project membership. So “intentional” is possible—but the correct audit outcome is not “ignore 28 warnings.”

Classify every function:

| Class | Correct action |
|---|---|
| Does not actually need elevated privileges | Change to `SECURITY INVOKER` |
| Trigger/helper/RLS utility, never directly called by clients | Move to `private`, revoke `PUBLIC`/`anon`; grant only if the caller genuinely needs direct execution |
| Authenticated RPC that genuinely must bypass RLS | Keep as a small reviewed exception; `search_path=''`, fully qualified objects, authorization inside function, input validation, explicit `authenticated` EXECUTE only |
| Anonymous share-token redemption | Keep one tiny read-only definer RPC if necessary; no table grants; verify token/expiry/scope and return minimal projection |
| Admin maintenance | Do not expose to ordinary `authenticated`; service/backend path only |

Supabase's function and RLS guidance recommends invoker semantics by default and, when a definer is necessary, setting a safe/empty `search_path` and explicitly naming referenced schemas. Functions otherwise also have broad default `EXECUTE` behavior unless you revoke it. citeturn19search1turn18search0

Inventory:

```sql
select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  p.prosecdef as security_definer,
  p.proconfig as function_settings
from pg_proc p
join pg_namespace n
  on n.oid = p.pronamespace
where p.prosecdef
  and n.nspname in ('public', 'private')
order by n.nspname, p.proname;
```

Privileges:

```sql
select
  routine_schema,
  routine_name,
  grantee,
  privilege_type
from information_schema.routine_privileges
where routine_schema in ('public', 'private')
  and grantee in ('PUBLIC', 'anon', 'authenticated', 'service_role')
order by routine_schema, routine_name, grantee;
```

Safe pattern:

```sql
create or replace function private.example_internal(...)
returns ...
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Always schema qualify.
  perform 1
  from public.projects p
  where p.id = ...
    and private.can_edit_project(p.id);

  if not found then
    raise exception 'not authorized'
      using errcode = '42501';
  end if;

  ...
end;
$$;

revoke all on function private.example_internal(...) from public;
revoke all on function private.example_internal(...) from anon;
```

Merely moving a client RPC from `public` to another **exposed** schema is organizational, not a security fix. The main value of `private` is that it is **not** part of the Data API exposure.

### RLS performance

Supabase's current guidance remains practical:

- use `(select auth.uid())` rather than recalculating an invariant Auth helper for every row;
- add indexes for columns used in RLS predicates, especially `project_id`, `user_id` and membership lookup pairs;
- specify `TO authenticated` rather than letting the engine evaluate irrelevant policies for anonymous calls;
- remember that `UPDATE` generally also needs a matching `SELECT` policy;
- use `security_invoker` views when a view should obey underlying caller RLS on supported PostgreSQL versions. citeturn18search0

For central membership helpers, add the corresponding membership index, typically something like:

```sql
create index if not exists project_members_user_project_idx
  on public.project_members(user_id, project_id);
```

or whichever membership table your current schema actually uses.

### RLS testing

Install/use pgTAP and `supabase test db`. Supabase's current database-testing documentation explicitly supports pgTAP and tests that run against the local database, with tests transactionally isolated/rolled back. citeturn18search3turn18search4turn18search5turn18search7

Do **not** delete your existing SQL matrix on day one. Treat it as the oracle while porting.

For each protected table/RPC, test at least:

```text
anon
authenticated non-member
viewer
editor
project manager
org admin
org owner
service/backend where applicable
valid share token
expired share token
revoked share token
```

And test both positive and negative behavior. A security suite that only proves owners can read data is mostly useless.

**Migration effort:** Data API default privileges **S and immediate**; key migration **M**; definer classification **M**; pgTAP conversion **M**.

**B2 verdict:** **ACT NOW. This is the highest-value work in the report.**

**B3 — Operations, Realtime, Edge Functions, search, Storage and limits**

### Migration and deployment workflow

Keep versioned SQL migrations in `supabase/migrations`. Supabase's current migration documentation continues to support local reset/replay and `db push`; it has also introduced newer declarative/diff tooling, but that is not a reason to replace a migration workflow that already works. citeturn23search0

Recommended workflow:

```text
feature branch
   ↓
supabase db reset
   ↓
supabase test db
   ↓
typecheck + Vite build
   ↓
Playwright / MCP tests
   ↓
migration dry-run / review
   ↓
merge main
   ↓
production migration
   ↓
Edge Function deployment
   ↓
post-deploy smoke test
```

Supabase's GitHub integration is available across plans and can deploy database migrations/Edge Functions from GitHub. Because you already use GitHub Actions heavily, the simplest $0 design is: **Actions for test gates; Supabase's native GitHub integration for deployment after a protected main-branch check**, rather than spending more runner minutes duplicating deployment plumbing. Supabase Branching/preview-environment features are a different matter and can have paid-plan requirements; do not build your process around them. citeturn23search1turn23search9

Supabase also documents direct GitHub Actions deployment of Edge Functions, so retaining CLI deployment in Actions is a valid alternative if you prefer one pipeline. citeturn23search3

The exact October-2026 **private-repository GitHub Actions free-minute quota was not confirmed from a primary billing page returned in this run**, so I will not repeat the PDF's “2,000 minutes/month” as fact. Treat that number as **UNVERIFIED** until you check GitHub Settings → Billing/Actions. That matters because 150+ Playwright tests can consume substantially more runner time than SQL deployment itself.

### Realtime

Current Supabase Free Realtime limits include roughly the order of magnitude your prior research quoted: 200 peak connections, 2 million monthly messages, 100 messages/s and high per-connection channel capacity. Postgres-change accounting increases with listeners: one database event listened to by multiple clients can count multiple delivered messages. citeturn22search2turn22search3turn22search15

For GeminiForge:

```text
database row change
      ↓
one project-level Realtime subscription
      ↓
invalidate/refetch affected resource
```

Do not make Realtime the database.

Avoid a channel per document. Avoid Presence until you actually show “Alice is editing.” Avoid Broadcast for state you can persist normally. For your current user count, Realtime quotas are generous; accidental subscription multiplication/reconnect loops are a bigger risk than legitimate collaboration traffic.

The PDF's “Presence only for a soft X is editing banner” is exactly the right boundary if you later add it. fileciteturn0file2

### Edge Function limits

Current official limits returned in this audit include:

- **256 MB memory**
- **2 seconds CPU time per request on Free**
- **150 seconds wall-clock**
- **150 seconds idle timeout**
- deployment bundle limits that differ between CLI and dashboard paths
- **100 functions** on Free
- **100 secrets**
- outbound SMTP ports **25 and 587 blocked**. citeturn22search0turn22search16

That supports your existing architectural split: the Gmail SMTP sender belongs on Vercel rather than being moved into a Supabase Edge Function merely for consolidation. Your prior research already identified that constraint. fileciteturn0file2

For the MCP function, the meaningful limit is CPU, not wall-clock. Keep it as an authorization/orchestration layer rather than doing CPU-heavy parsing, compression or enormous diff computation there.

There is no useful architecture in “optimizing cold starts” speculatively for a personal MCP endpoint. Keep the bundle small, avoid giant top-level imports, and measure actual latency.

### `pg_cron`

Supabase's current Cron guidance recommends no more than about **eight concurrent jobs** and jobs of no more than about **ten minutes**. citeturn22search1

You need far fewer:

```text
daily verification-reminder generation
trash purge if already implemented
possibly lightweight retention cleanup
```

Do not create one cron job per project or document. One daily set-oriented SQL function should process all due records.

And, as noted above, do not use cron to mutate “expired” truth when a query can derive that from `review_after < current_date`.

### PostgreSQL full-text search

For a few hundred Markdown pages, built-in FTS is the correct first search architecture. No embeddings are necessary.

PostgreSQL provides `setweight`, `websearch_to_tsquery`, `ts_rank_cd` and `ts_headline`; `websearch_to_tsquery` is especially appropriate for a search box because it accepts web-like user input without exposing raw tsquery syntax. citeturn23search2turn23search6

Assuming your actual columns are `title` and `body_md`:

```sql
alter table public.docs
add column search_tsv tsvector
generated always as (
  setweight(
    to_tsvector('english'::regconfig, coalesce(title, '')),
    'A'
  )
  ||
  setweight(
    to_tsvector('english'::regconfig, coalesce(body_md, '')),
    'B'
  )
) stored;

create index docs_search_tsv_gin
on public.docs
using gin(search_tsv);
```

Search:

```sql
with q as (
  select websearch_to_tsquery(
    'english'::regconfig,
    $1
  ) as query
)
select
  d.id,
  d.project_id,
  d.title,

  ts_rank_cd(
    d.search_tsv,
    q.query,
    32
  ) as rank,

  ts_headline(
    'english'::regconfig,
    d.body_md,
    q.query,
    'StartSel=⟦⟦, StopSel=⟧⟧, MaxWords=35, MinWords=12'
  ) as headline

from public.docs d
cross join q
where d.search_tsv @@ q.query
order by
  rank desc,
  d.updated_at desc,
  d.id
limit 30;
```

The `32` normalization option is useful for turning rank into a bounded-looking score, but **ranking numbers should not be presented to users as calibrated probabilities**. PostgreSQL documents them as relevance-ranking functions, not confidence values. citeturn23search2

Do not render `ts_headline` as trusted HTML. Your source is Markdown and the content may be untrusted. Use unique textual markers such as `⟦⟦...⟧⟧`, render the snippet as React text and turn marker-delimited spans into `<mark>` components yourself.

**`pg_trgm`:** you told me it is available but not installed. Install it only if exact FTS plus prefix search proves inadequate for title/reference typos.

```sql
create extension if not exists pg_trgm
with schema extensions;
```

Then add a trigram index to **title/ref fields**, not blindly to every entire Markdown body:

```sql
create index docs_title_trgm_idx
on public.docs
using gin (title extensions.gin_trgm_ops);
```

**`unaccent`:** skip initially. You are English-only, technical identifiers matter, and adding text-normalization dictionaries/configuration creates another search behavior to test. Its current availability in your exact live project was **UNVERIFIED** in this audit.

**`ltree`:** do not install.

**`vector`:** per your instruction, do not cover or install it.

### Storage and images

Current Free-plan storage is **1 GB**, with a **50 MB maximum file size on Free**, and paid image-transformation capabilities are not part of the free path. citeturn22search9turn22search4

For a documentation app, set your own much lower application limit—around a few megabytes per ordinary image—rather than allowing users to reach the platform's 50 MB ceiling.

Recommended zero-dependency client pipeline:

```text
selected image
   ↓
validate MIME/type + dimensions
   ↓
createImageBitmap()
   ↓
Canvas resize if huge
   ↓
encode WebP/JPEG at reasonable quality
   ↓
upload to private Supabase Storage bucket
   ↓
store object path/reference in Markdown
```

Do not base64-encode ordinary images into the Markdown or a PostgreSQL text column. That grows database backups and defeats Storage's purpose.

Keep the bucket private and enforce `storage.objects` RLS. Do not rely on possession of a predictable object URL as authorization.

### Which free limit arrives first?

The answer depends strongly on whether you add images.

Current relevant allowances from official Supabase material are approximately:

| Resource | Free allowance relevant here | Near-term risk |
|---|---:|---|
| Database | **500 MB/project** | Medium long-term because revisions/audit can accumulate |
| Storage | **1 GB** | High if screenshots/images become common |
| Uncached egress | detailed current docs report **5 GB** free allocation | Medium with image-heavy sharing |
| Cached egress | detailed current docs separately report a free cached allocation | Medium with image-heavy sharing |
| Edge invocations | **500,000/month** | Very low for a few users |
| Realtime messages | **2 million/month** | Very low unless subscription design is buggy |
| Peak Realtime connections | **200** | Extremely low risk |
| Storage object max upload | **50 MB on Free** | Enforce lower app-level cap |

The billing/usage and egress details were checked against Supabase's current Free documentation. citeturn22search4turn22search7turn22search14

For your current text-first workload, I predict the **database** as the first durable resource constraint, mainly because revisions and audit trails grow monotonically. That is an inference, not a measured fact. If you start keeping project screenshots, the **1 GB Storage quota can overtake it immediately**.

Measure database usage directly:

```sql
select
  pg_size_pretty(pg_database_size(current_database()))
    as database_size;
```

Find the large relations:

```sql
select
  n.nspname as schema_name,
  c.relname as relation_name,
  pg_size_pretty(
    pg_total_relation_size(c.oid)
  ) as total_size,
  pg_total_relation_size(c.oid) as bytes
from pg_class c
join pg_namespace n
  on n.oid = c.relnamespace
where n.nspname in ('public', 'storage', 'auth')
  and c.relkind in ('r', 'm')
order by bytes desc
limit 30;
```

Use the Supabase dashboard as the source of truth for billed/quota-counted egress, Function and Realtime usage rather than trying to reconstruct all provider billing counters from application rows. citeturn22search4turn22search13

### Backups: correction to the PDF

The master plan says, in effect, “backups do not exist unless we build them.” That is **too absolute**. Current Supabase backup documentation describes managed database backups, while PITR is a paid capability; Storage objects are not part of the PostgreSQL database backup. citeturn18search1

So the correct position is:

```text
Supabase-managed database backup
        ≠
your own portable disaster-recovery copy
        ≠
Storage-object backup
```

You should still produce periodic SQL/Markdown exports because your budget forbids solving a future platform/account incident by buying a higher recovery tier. But it is incorrect to say the database has literally no backup mechanism at all on the free service.

**B3 verdict:** keep migrations simple; use native GitHub integration or tightly gated CLI deploys; Realtime only as invalidation; keep MCP Edge work CPU-light; one set-oriented cron; PostgreSQL FTS first; private optimized image storage; measure DB/Storage before adding complexity.

## AGREE / MODIFY / DISAGREE Audit of the Attached Plans

The context pack establishes the core requirements—private invited workspace, zero-dollar operation, English-only UI/content, Supabase/Vercel stack and human-reviewed AI changes. fileciteturn0file0 The master plan then makes a large number of implementation choices. fileciteturn0file1 The following table treats those choices as hypotheses rather than authority.

| PDF decision or claim | Audit | Reason |
|---|---|---|
| $0 budget; reject paid domains/APIs/plans | **AGREE** | Hard requirement; this report does not depend on paid infrastructure |
| Keep React 18 | **MODIFY** | React 19.3 is stable/current and gives a better long-term base; upgrade after urgent DB security work. citeturn16search0turn16search3 |
| Zustand | **AGREE** | No state rewrite has sufficient return; current alternatives do not solve a demonstrated problem. citeturn7search2turn7search3 |
| Hash routing | **AGREE** | Private SPA does not need SEO; fragment secrets reduce server/referrer exposure. citeturn10search1turn10search15 |
| Share URL `#/s/<secret>` | **AGREE STRONGLY** | Better accidental-log/referrer properties than path/query; still needs real server-side token controls |
| `noindex` + `Referrer-Policy: no-referrer` on shares | **AGREE** | Sensible defense in depth; `noindex` is not access control |
| Custom CSS, no UI framework | **AGREE** | Correct solo-maintenance trade-off |
| One giant CSS source | **MODIFY** | Split by features during module restructuring; use native nesting. citeturn15view1 |
| “Custom animated dropdowns replace every native select” | **DISAGREE** | Simple finite choices should use native select; custom/headless combobox only where search/custom behavior justifies it |
| CodeMirror 6 source editor + preview | **AGREE STRONGLY** | Best match for source-faithful Markdown. citeturn24search6 |
| `@codemirror/merge` for per-hunk review | **AGREE** | Direct fit for review UI; exact version in PDF appears stale |
| Tiptap block editor deferred | **AGREE** | No demonstrated need worth introducing source-roundtrip risk |
| No CRDT; version column + three-way merge | **AGREE** | Correct for one owner/few users; drastically simpler than collaborative CRDT state |
| Presence only for “X is editing” | **AGREE** | Realtime Presence should remain ephemeral, not data state |
| Rows are source of truth for planning | **AGREE** | Stable IDs/status/order belong in relational rows, not parsed Markdown |
| Adjacency-list `plan_nodes` | **AGREE** | `ltree`/closure table are unnecessary here |
| Depth limit around four | **AGREE** | Helps UX and bounds accidental hierarchy complexity |
| Fractional text order with `COLLATE "C"` | **MODIFY** | Correct if fractional indexing is retained, but bigint gap positions are simpler for this low-concurrency project |
| Weighted plan progress from day one | **DISAGREE** | Equal leaf-step counts are simpler; add weight only on demonstrated need |
| Leaf-only computed progress | **AGREE STRONGLY** | Never store parent percentages |
| Cancelled/deferred omitted from denominator | **AGREE** | Avoids counting abandoned scope as completion |
| Blocked remains in denominator | **AGREE** | Correctly communicates unfinished work |
| MADR-style decision records | **AGREE DIRECTIONALLY** | Good structure; exact MADR 4.0 field/version statement not independently reverified here |
| Accepted decisions never silently rewritten | **AGREE** | Preserve decision provenance |
| Verification fields stored directly on docs | **MODIFY** | Prefer immutable revision-linked verification events and derive current state |
| Cron “flips expired verification” | **DISAGREE** | Expiry is derivable from date; use cron only to emit reminders |
| Notification inbox backed by rows | **AGREE** | Durable truth with Realtime notification |
| Daily views one upsert row | **AGREE FOR CURRENT SCALE** | Hot-row contention is not credible yet |
| Build sharded counters now | **DISAGREE** | Unnecessary until measured contention |
| Favorites table, recents localStorage | **AGREE** | Correct split between durable personal state and lightweight device state |
| Every new table has GRANT + RLS in same migration | **AGREE, URGENT** | Required by Supabase's 2026 privilege transition. citeturn17search2turn18search0 |
| `(select auth.uid())`, indexes and `TO authenticated` in RLS | **AGREE, WITH NUANCE** | InitPlan optimization only where expression is row-invariant. citeturn18search0 |
| 28 definer warnings are intentional, therefore acceptable | **DISAGREE** | Intentionality is not sufficient; classify and minimize every elevated entry point. citeturn19search0turn19search1 |
| Put definer helpers in private schema with `search_path=''` | **AGREE** | Correct for non-client helpers. citeturn19search1 |
| Exposed authenticated definer RPCs may remain when genuinely required | **AGREE WITH EXCEPTION PROCESS** | They must re-authorize, validate, schema-qualify and have narrow grants |
| pgTAP next to existing SQL matrix | **AGREE** | Port incrementally; current matrix is valuable regression evidence. citeturn18search3turn18search7 |
| Legacy anon/service_role keys should migrate before end 2026 | **AGREE** | Current Supabase migration direction. citeturn17search0turn17search3 |
| Database webhooks/`pg_net` need new-key handling | **AGREE** | New opaque keys change old JWT assumptions. citeturn17search0 |
| “No Free backups unless we build them” | **DISAGREE / CORRECT** | Managed DB backup capability exists; it is still prudent to make portable exports, and Storage files are separate. citeturn18search1 |
| One Realtime channel rather than many | **AGREE** | Avoid message/subscription multiplication. citeturn22search2turn22search3 |
| Install `pg_trgm` for fuzzy search | **MODIFY** | Install only if typo/title matching is demonstrably useful |
| Install `ltree` for plans | **DISAGREE** | No need |
| Install vector/semantic search | **DISAGREE FOR THIS SCOPE** | Explicitly out of scope and unnecessary for hundreds of pages |
| FTS generated `tsvector` + GIN + `websearch_to_tsquery` | **AGREE** | Native PostgreSQL solution is adequate. citeturn23search2turn23search6 |
| `unaccent` from day one | **DISAGREE** | English-only app; add only on demonstrated search need |
| Images only; no arbitrary attachments initially | **AGREE** | Helps control the 1 GB Storage budget. citeturn22search9 |
| Full app/module restructure deferred until product model is stable | **AGREE** | Avoid a large mechanical refactor colliding with security/schema changes |
| Vite code splitting | **AGREE** | Useful when bundle analysis identifies large lazy-loadable editor/Markdown features |
| Add Rolldown separately | **DISAGREE** | Vite 8 already owns the modern bundling transition. citeturn21search5 |
| Biome replacement of lint stack | **DISAGREE FOR NOW** | No meaningful product/security benefit over working ESLint |
| Native `<dialog>` for phone modal behavior | **AGREE, EXPAND TO ALL TRUE MODALS** | Cross-browser support is mature. citeturn14view7 |
| Mermaid in editor v1 | **MODIFY / DEFER** | Dependency and untrusted SVG complexity are not worth it initially |
| Human review before AI changes | **AGREE STRONGLY** | This is one of the architecture's most valuable security boundaries |
| Pending diffs should not load remote images | **AGREE STRONGLY** | Prevent rendering-based exfiltration; keep diffs plain/sanitized. fileciteturn0file2 |

The architecture PDF's page-3 diagram also makes clear that the app currently concentrates the browser, Supabase access, Markdown renderer, AI review and Realtime systems into numbered global `parts/*` files. That structure explains why the planned module refactor is valuable, but it also supports postponing the refactor until the high-risk database/key transitions are complete. fileciteturn0file3

## Unknown Unknowns and What Became Outdated

**Unknown unknowns discovered or elevated by 2025–2026 changes**

**React's platform assumptions have moved significantly.** React 19.3 is no longer merely “the new major”; View Transitions are now a stable React capability, while browser-native View Transitions themselves are implemented across Chrome/Edge, Safari and current Firefox generations. This makes a small native animation layer realistic without adding an animation/router framework. citeturn16search3turn14view3

**React Compiler is now a real production option, not a research feature.** It became stable in 2025 and is intentionally adoptable incrementally. That does not mean “enable it immediately”; it means manual `useMemo`/`useCallback` dogma should no longer drive new architecture without measurement. citeturn16search1

**Native CSS now replaces more preprocessing and JS than the PDFs acknowledge.** CSS nesting is broadly supported; `:has()`, container queries, `color-mix()`, `@starting-style`, Popover and dialog cover a large part of what used to require Sass, positioning libraries or custom modal stacks. citeturn15view1turn14view0turn13search4turn15view0turn14view5turn14view1turn14view7

**But “modern CSS” is not one compatibility bucket.** Anchor positioning is still a risky dependency for critical cross-browser placement, and scroll-driven animations still have a Firefox interoperability gap in the tracked data. They should be enhancements, not requirements. citeturn14view2turn14view6

**Base UI's package identity changed.** Current npm points at `@base-ui/react`; the earlier `@base-ui-components/react` package is deprecated/renamed. Any prior component comparison referring to the old package name is stale. citeturn11search1turn11search2

**Supabase Data API privilege defaults are now an application-architecture concern.** An old migration pattern that assumed Supabase would magically grant PostgREST roles is no longer future-safe. This change arrives before most of your new plan/share/notification tables, so it is especially relevant. citeturn17search2

**API keys and Auth signing keys have been decoupled conceptually.** A publishable/secret key is no longer simply “the new string spelling of the anon/service JWT.” The gateway key, the user's Auth JWT and the JWT signing key lifecycle are different layers. Code that assumes every Supabase credential is a JWT will increasingly fail. citeturn17search0turn17search7

**“RLS enabled everywhere” is no longer an adequate security statement.** Table privileges, function privileges, policy roles, definer execution, view security mode and actual deny tests all matter separately. Current Supabase documentation and advisors make that much clearer than older “turn RLS on and write policies” guidance. citeturn18search0turn19search0

**Storage image transformation is not a free hidden dependency.** Because Free does not give you the paid transformation path, client-side resizing/compression becomes architecturally useful—not just a performance polish item. citeturn22search9

**Your AI-review renderer deserves the same threat model as the MCP server.** The system can remain secure at the database boundary and still leak information if a malicious proposed Markdown diff causes the review UI to fetch remote attacker-controlled resources. The prior research caught this; it should be elevated to a mandatory rendering rule, not a phase-six polish task. fileciteturn0file2

**The share-token fragment has a subtle scanner property.** It prevents the fragment from reaching your server through ordinary HTTP, but it does **not** hide the token from a security scanner that has access to the original invitation text. This means “fragment link” must never be confused with “scanner-proof.” The real protection is that merely loading/scanning the share page does not mutate state. citeturn10search1turn10search15

**What became outdated in 2025–2026**

| Old/previous assumption | October 2026 position |
|---|---|
| React 18 is the conservative target | **React 19.3 is now the conservative current target** after a staged migration. citeturn16search0turn16search3 |
| React Compiler is experimental/future | **Stable since 2025**, but still optional. citeturn16search1 |
| View Transitions are Chromium-only novelty | No longer true; current Safari and Firefox support materially changes the calculus. citeturn14view3 |
| Vite means esbuild dev + Rollup build forever | Vite 8 has moved its bundling architecture onto Rolldown. citeturn21search5 |
| New Supabase public tables automatically get anon/auth/service privileges | **Stops being a safe assumption; Oct. 30 transition is imminent.** citeturn17search2 |
| `anon` and `service_role` JWT strings are the normal long-term API keys | They are legacy; publishable and secret keys are the migration target. citeturn17search0turn17search3 |
| A `SECURITY DEFINER` helper in `public` is fine if code looks careful | Current advisors/docs make exposed definer functions a much more explicit audit item. citeturn19search0turn19search1 |
| RLS alone decides Data API access | Grants **and** RLS both matter. citeturn18search0 |
| Base UI package is `@base-ui-components/react` | Renamed/deprecated in favor of `@base-ui/react`. citeturn11search2turn11search1 |
| The PDF's exact CodeMirror version table can be copied into `package.json` | Already stale/inconsistent with current npm results; check registry at install time. citeturn24search6turn21search8 |
| Supabase Free has literally no database backup | Too broad; managed DB backup capability exists, though your own portable exports and separate Storage backup remain prudent. citeturn18search1 |
| Every custom dropdown is preferable to native select | No. Native controls remove substantial accessibility/mobile maintenance where their behavior is sufficient |
| Anchor positioning is ready to replace all positioning JS | Not yet sufficiently interoperable for required layout. citeturn14view2 |
| Scroll-driven animation can be core cross-browser UI | Not yet; use only as progressive decoration. citeturn14view6 |
| A separate Rolldown adoption project is needed | No; Vite 8 already incorporates the transition. citeturn21search5 |

## Prioritized Thirty-Day Plan and Risk Register

**Next 30 days — maximum fifteen actions, in priority order**

| Priority | Action | Effort | Files / SQL touched | Why now |
|---:|---|:---:|---|---|
| 1 | Opt into the post-Oct-30 Data API default-privilege model and audit all 33 public tables | **S** | new `supabase/migrations/*_explicit_data_api_privileges.sql`; SQL audit script | Deadline-driven; prevents future migrations failing or assuming unsafe grants. citeturn17search2 |
| 2 | Inventory all 28 `SECURITY DEFINER` functions and classify invoker/internal RPC/share/admin | **M** | `supabase/migrations/*_definer_hardening.sql`; existing function definitions | Highest remaining privilege-escalation surface. citeturn19search0turn19search1 |
| 3 | Revoke `PUBLIC`/`anon` execution where unnecessary; move internal helpers to `private`; enforce `search_path=''` and schema qualification | **M** | same function migration; SQL test matrix | Converts the inventory into actual hardening |
| 4 | Add pgTAP and port the most security-critical RLS matrix cases first | **M** | `supabase/tests/database/*.sql`, CI workflow | Makes policy/grant regressions reproducible before new tables appear. citeturn18search3turn18search7 |
| 5 | Migrate browser/server infrastructure from legacy anon/service-role API keys to publishable/secret keys | **M** | `parts/47-cloud.tsx` or future `src/lib/supabase/*`; `supabase/functions/docs-mcp/*`; Vercel invite function/environment; webhook/Vault setup | End-of-2026 migration is close. citeturn17search0turn17search3 |
| 6 | Audit current Auth JWT signing setup and every component that manually verifies/signs JWTs | **S/M** | MCP auth code; any custom JWT utility; deployment notes | Prevents opaque-key/JWT-key concepts being mixed during step 5. citeturn17search7 |
| 7 | Implement the planning schema with adjacency list, revision counters and simple gap ordering | **M** | new `supabase/migrations/*_plan_nodes.sql`; RLS tests | Core product model; do it only after grant conventions are fixed |
| 8 | Add decisions, revision-linked verification, notifications and favourites with the new grant/RLS template | **M/L** | separate migrations recommended rather than one giant migration | Builds core features on the hardened pattern rather than creating 2026-style debt |
| 9 | Implement share links as 256-bit fragment capabilities with SHA-256 hashes, expiry/revocation/scope and one minimal redemption RPC | **M** | `share_links` migration, RPC, `parts/30-store.tsx`, share view, Playwright/RLS tests | Security-sensitive; establishes correct public boundary before “public” features expand |
| 10 | Harden Markdown rendering and AI review rendering before adding more editor features | **S/M** | `parts/49-pages.tsx`, `parts/49-ai.tsx`, future `src/lib/markdown/*` | Prevent remote-image/link/plugin-based exfiltration; small code, high security value. citeturn24search1turn24search0 |
| 11 | Upgrade Vite to 8.3.x and validate build/preview/CI | **S/M** | `package.json`, lockfile, `vite.config.ts`, CI | Isolated tooling migration before React/editor changes. citeturn21search5 |
| 12 | Upgrade React through 18.3 warnings to React 19.3, run full Playwright suite, fix refs/types | **M** | `package.json`, root, custom primitives, TS types/tests | Establish current frontend baseline before editor expansion. citeturn16search2turn16search3 |
| 13 | Build CodeMirror source-editor proof with version-checked saving and `@codemirror/merge` review | **M/L** | `parts/49-pages.tsx`, AI review feature, revision RPC/SQL, package files | Core editing requirement; source-preserving path is now clear |
| 14 | Add FTS generated vector/GIN index and a safe text-snippet search RPC | **S/M** | migration + search code/palette | Gives hundreds of Markdown pages strong zero-cost search without a new service. citeturn23search2turn23search6 |
| 15 | Replace true modals with `<dialog>` and use native select for at least one simple custom-select case; leave larger CSS restructure for later | **M** | `parts/40-primitives.tsx`, `49-peek.tsx`, `20-styles.tsx`, Playwright a11y tests | Reduces custom accessibility code without a library migration. citeturn14view7 |

**Things specifically to skip during these 30 days:** React Compiler, router migration, Tailwind, CSS Modules rewrite, Base UI/Radix/React Aria wholesale adoption, `ltree`, vector search, CRDT/Yjs, offline writes, Mermaid, generalized attachments, weighted progress, sharded view counters, board/timeline views, OAuth work unless a real MCP client forces it, and the full `parts/*` directory refactor.

**Risk register**

| Risk | Likelihood | Impact | Early signal | Mitigation |
|---|---|---|---|---|
| New tables stop working through Data API after Oct. 30 because migration omitted grants | **High without action** | High | `42501` after migration | Step 1 now; explicit grant template; pgTAP. citeturn17search2 |
| One of 28 definer functions enables privilege escalation through a missed authorization/input path | Medium | **Critical** | Advisor 0028/0029; unexpected direct RPC works | Classify all; invoker where possible; private helpers; narrow EXECUTE. citeturn19search0 |
| RLS regression exposes another user's project/document | Medium | **Critical** | Negative test begins returning rows | pgTAP deny tests for every role and table |
| Legacy API keys continue into deprecation period | High if postponed | High | new platform warnings/deactivation deadline | Migrate publishable/secret keys this month. citeturn17search0turn17search3 |
| Share token appears in logs/history/scanner systems | Medium | High | copied URL/log observation | Fragment URL, raw token never DB-stored, expiry/revoke/scope, no consume-on-load |
| AI proposal Markdown exfiltrates through remote image/link rendering | Medium | High | review opens outbound request | Plain/sanitized diff; block remote images in Review |
| Markdown/plugin pipeline introduces XSS | Medium | High | sanitizer test payload executes | No raw HTML; narrow URL policy; `rehype-sanitize` after untrusted transforms. citeturn24search0turn24search1 |
| Concurrent editor save silently overwrites newer content | Medium | High | same document edited in two tabs/users | `version = base_version` optimistic update + three-way merge |
| React 19 changes break custom focus/ref behavior | Medium | Medium | Playwright keyboard/focus failures | 18.3 first; separate branch; do not enable Compiler simultaneously. citeturn16search2 |
| Free database quota fills from unlimited revisions/audit rows | Low near-term, rising over time | High because paying is forbidden | DB-size growth | Usage dashboard + relation-size query + explicit retention/export policy. citeturn22search14 |
| 1 GB Storage fills after image support | Medium once images arrive | High | Storage usage climb | Client resizing, application file cap, delete orphaned objects. citeturn22search9 |
| Realtime implementation amplifies messages through duplicate channels/reconnects | Low/Medium | Medium | message usage disproportionate to users | One project channel, unsubscribe correctly, refetch-on-event. citeturn22search2turn22search3 |
| GitHub Actions testing consumes free quota | Medium | Medium | tests stop/runners unavailable | Cache dependencies; shard only when useful; traces on failure; use Supabase native deploy integration; verify live quota |
| Gmail SMTP credential/rate abuse through invite endpoint | Medium | Medium/High | unusual invite volume | Server-side authorization/rate limit, never expose app password, narrow invite permissions |
| New “modern CSS” feature behaves differently in one browser | Medium for anchor/scroll features | Low/Medium | Firefox/Safari visual test | Require fallback; use anchor/scroll effects only as enhancements. citeturn14view2turn14view6 |

## Eight Important Owner Decisions and Ten Least-Certain Claims

These are decision questions to resolve as implementation reaches them; they are **not requests for clarification before this audit**.

**Eight most important questions for you**

1. **What is the minimum browser baseline you are willing to support?** If “current and previous major” is acceptable, the modern CSS/native-control recommendations become much easier. If you require old Safari/iOS releases, the fallback burden changes materially.

2. **Will a project-level share link expose every current document in that project, or should the first implementation be document-only?** My recommendation is **document-only first**. A project capability has a much larger blast radius if copied or leaked.

3. **Which of the 28 `SECURITY DEFINER` functions are intentionally public RPC endpoints versus internal/RLS/trigger helpers?** This classification determines the largest security cleanup. The SQL inventory above will answer most of this without relying on memory.

4. **How long should ordinary document revision bodies be retained?** “Forever” is easy at 120 pages but conflicts eventually with a hard 500 MB free database. My recommendation is to preserve all significant/manual/verified revisions, while later allowing compaction of dense autosave history.

5. **Does “verified” mean the exact stored revision was reviewed, or that the underlying real-world claim remains correct despite formatting edits?** My recommended schema deliberately chooses the stricter and auditable interpretation: verification attaches to an exact revision.

6. **Will plan step weighting ever be exposed to users?** My recommendation is no for v1. Equal leaf steps make completion understandable and prevent progress configuration from becoming another subsystem.

7. **Are images actually needed in the next month?** If not, leave Storage-image implementation out of the first plan/editor milestone and preserve that free-tier headroom.

8. **Do you want the current numbered `parts/*` architecture to survive until the master-file/editor feature is working, or should module extraction happen one feature at a time during those implementations?** I recommend the latter: extract touched features opportunistically, not through one giant refactor. The PDF itself correctly warns that the concatenated global-scope design makes a big-bang restructure risky. fileciteturn0file3

**Ten least-certain claims and how to verify them**

| Claim | Confidence | Why uncertain | Exact verification |
|---|---|---|---|
| Exact latest `@codemirror/view` version on 2026-10-22 | Medium | Returned sources exposed indirect dependency versions rather than a clean primary package result | Run `npm view @codemirror/view version license time --json` |
| Exact latest `react-markdown` version and publication date | Medium | Official npm search result exposed security docs but omitted its sidebar/version in the returned excerpt | `npm view react-markdown version license time --json` |
| Exact release timestamp of `@codemirror/merge 6.12.2` | Medium | Registry result exposed version but not a reliable exact timestamp in this run | `npm view @codemirror/merge version license time --json` |
| Exact release date of Zustand 5.0.15 | Medium | npm result used a relative “months ago” date | `npm view zustand version license time --json` |
| Exact current GitHub Actions free private-repository minutes/artifact allowance | **Low in this report** | Primary GitHub billing page did not return in the research set; PDF number may have changed | GitHub repository/account → Settings → Billing → Actions, then compare to official GitHub billing docs |
| Exact MADR 4.0.0 release date/field set | Medium | Confirmed only through the attached prior research here, not independently fetched from the primary repository in this run | Check the `adr/madr` official repository release/tag and `template/adr-template.md` |
| Full cross-browser interoperability of CSS Anchor Positioning on the exact browsers you own | Medium | Can I Use still records partial/interoperability caveats | Open a small anchor-positioning test in current Chrome, Edge, Firefox, macOS Safari and your iPhone; keep fallback regardless. citeturn14view2 |
| Whether `unaccent` is available/enabled in the live Supabase project | Low | You listed several available extensions but not `unaccent` | `select name, default_version, installed_version from pg_available_extensions where name = 'unaccent';` |
| Exact PostgreSQL major version of the live project and therefore every available view/constraint feature | Low | Not stated in your verified state | `select version();` and record it in `docs/architecture.md` |
| How many of the 28 Advisor 0029 findings represent genuinely necessary client-callable elevated RPCs | Low until audited | Advisor knows privileges but not application intent | Run the `pg_proc` + `routine_privileges` SQL above, grep each function name in browser/Edge code, then classify it in a checked-in security ledger |

There is one additional operational uncertainty worth recording separately: exact vendor free-tier quotas can change with little architectural notice. For hard caps, the Supabase dashboard and current pricing/usage pages should always override numbers copied into the project documentation.

## Dated Source List

**Attached project material — treated as claims to audit, not external authority**

- **Context Pack: GeminiForge Workbench**, dated 2026-10-21. Establishes application purpose, stack, zero-dollar requirement, private/invited model and open topics. fileciteturn0file0
- **Master Plan v2**, dated 2026-10-21. Contains the decisions audited above: CodeMirror, plan rows, share links, RLS/grants, verification, notifications, free-tier operations and roadmap. fileciteturn0file1
- **Prior Research**, dated 2026-10-21. Contains earlier package/version comparisons, MCP/security research, planning-layer design, editor research and Supabase limits. fileciteturn0file2
- **Product Vision / Architecture / Security Notes**, current through 2026-10-22 according to the file. Describes `parts/*`, Supabase/MCP flow, current security mechanisms and known weaknesses. fileciteturn0file3

**React and frontend**

- React, **React v19**, 2024-12-05. Official release notes.  
  `https://react.dev/blog/2024/12/05/react-19` citeturn16search4
- React, **React 19 Upgrade Guide**, official migration guidance; recommends the React 18.3 stepping stone and documents ref/TypeScript/API changes.  
  `https://react.dev/blog/2024/04/25/react-19-upgrade-guide` citeturn16search2
- React, **React 19.3**, 2026-09-09. Stable View Transitions and Fragment refs.  
  `https://react.dev/blog/2026/09/09/react-19-3` citeturn16search3
- React, **React Compiler v1.0**, 2025-10-07. Production-stable compiler and incremental adoption.  
  `https://react.dev/blog/2025/10/07/react-compiler-1` citeturn16search1
- npm, **react** package, current result 19.3.0, checked 2026-10-22.  
  `https://www.npmjs.com/package/react` citeturn16search0
- npm, **Vite**, current result 8.3.5, checked 2026-10-22.  
  `https://www.npmjs.com/package/vite` citeturn21search5
- npm, **ESLint**, current result 10.13.0, checked 2026-10-22.  
  `https://www.npmjs.com/package/eslint` citeturn21search0
- npm, **Zustand**, current 5.x package information checked during audit.  
  `https://www.npmjs.com/package/zustand` citeturn7search2
- npm, **Jotai**, current 3.x package information checked during audit.  
  `https://www.npmjs.com/package/jotai` citeturn7search3
- npm, **Redux Toolkit**, current package information checked during audit.  
  `https://www.npmjs.com/package/@reduxjs/toolkit` citeturn8search1
- npm, **Preact Signals for React**, current package information checked during audit.  
  `https://www.npmjs.com/package/@preact/signals-react` citeturn7search1

**Routing and URL security**

- MDN, **URI fragment**, checked 2026-10-22; fragment processing is client-side and fragments are not transmitted in HTTP requests.  
  `https://developer.mozilla.org/en-US/docs/Web/URI/Reference/Fragment` citeturn10search1
- IETF, **RFC 9110: HTTP Semantics**, section covering request-target/referrer fragment exclusion.  
  `https://www.rfc-editor.org/rfc/rfc9110` citeturn10search15
- MDN, **Referer header**, checked 2026-10-22.  
  `https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Referer` citeturn9search5
- Vercel, **Vite on Vercel / SPA rewrites**, checked 2026-10-22.  
  `https://vercel.com/docs/frameworks/frontend/vite` citeturn10search0
- Vercel, **Rewrites**, documentation current to 2026.  
  `https://vercel.com/docs/rewrites` citeturn10search2
- React Router, official changelog/current release line checked October 2026.  
  `https://reactrouter.com/changelog` citeturn9search0turn9search1
- TanStack Router, **history types/hash history**, checked October 2026.  
  `https://tanstack.com/router/latest/docs/framework/react/guide/history-types` citeturn9search4

**CSS/browser support**

- Can I Use, **CSS Container Queries**, checked 2026-10-22.  
  `https://caniuse.com/css-container-queries` citeturn13search4
- Can I Use, **`:has()`**, checked 2026-10-22.  
  `https://caniuse.com/css-has` citeturn14view0
- Can I Use, **Popover API**, checked 2026-10-22.  
  `https://caniuse.com/mdn-api_htmlelement_popover` citeturn14view1
- Can I Use, **CSS Anchor Positioning**, checked 2026-10-22.  
  `https://caniuse.com/css-anchor-positioning` citeturn14view2
- Can I Use, **View Transitions API**, checked 2026-10-22.  
  `https://caniuse.com/view-transitions` citeturn14view3
- Can I Use, **`color-mix()`**, checked 2026-10-22.  
  `https://caniuse.com/mdn-css_types_color_color-mix` citeturn15view0
- Can I Use, **`@starting-style`**, checked 2026-10-22. citeturn14view5
- Can I Use, **CSS scroll-driven animations**, checked 2026-10-22.  
  `https://caniuse.com/css-scroll-timeline` citeturn14view6
- Can I Use, **HTML `<dialog>`**, checked 2026-10-22.  
  `https://caniuse.com/dialog` citeturn14view7
- Can I Use, **`field-sizing`**, checked 2026-10-22. citeturn14view8
- Can I Use, **`light-dark()`**, checked 2026-10-22. citeturn13search1
- Can I Use, **CSS Nesting**, checked 2026-10-22.  
  `https://caniuse.com/css-nesting` citeturn15view1

**Accessible component libraries**

- npm, **react-aria-components 1.21.1**, Apache-2.0, checked 2026-10-22.  
  `https://www.npmjs.com/package/react-aria-components` citeturn11search0
- npm, **@ariakit/react 0.4.42**, MIT, checked 2026-10-22.  
  `https://www.npmjs.com/package/@ariakit/react` citeturn11search9
- npm, **@base-ui/react 1.9.0**, MIT, checked 2026-10-22.  
  `https://www.npmjs.com/package/@base-ui/react` citeturn11search1
- npm, deprecated/renamed **@base-ui-components/react**, checked 2026-10-22. citeturn11search2
- Radix UI, accessibility documentation, checked 2026-10-22.  
  `https://www.radix-ui.com/primitives/docs/overview/accessibility` citeturn12search0
- npm, **@radix-ui/react-select 2.3.7**, checked 2026-10-22.  
  `https://www.npmjs.com/package/@radix-ui/react-select` citeturn12search4
- npm, **radix-ui 1.8.1** umbrella package, checked 2026-10-22.  
  `https://www.npmjs.com/package/radix-ui` citeturn12search6

**Markdown/editor**

- npm, **CodeMirror**, MIT, current 6.x package checked 2026-10-22.  
  `https://www.npmjs.com/package/codemirror` citeturn24search4
- npm, **@codemirror/lang-markdown 6.5.2**, MIT, checked 2026-10-22.  
  `https://www.npmjs.com/package/@codemirror/lang-markdown` citeturn24search6
- npm/CodeMirror, **@codemirror/merge**, current registry data checked 2026-10-22.  
  `https://www.npmjs.com/package/@codemirror/merge` citeturn21search8
- npm, **react-markdown**, security documentation checked 2026-10-22.  
  `https://www.npmjs.com/package/react-markdown` citeturn24search1
- npm, **rehype-sanitize 6.0.0**, MIT; security/order guidance checked 2026-10-22.  
  `https://www.npmjs.com/package/rehype-sanitize` citeturn24search0
- npm, **remark-gfm 4.0.1**, checked during audit.  
  `https://www.npmjs.com/package/remark-gfm` citeturn21search9

**Supabase security and API migration**

- Supabase Changelog, **Data API default privileges change**, published 2026-04-28; includes rollout to existing projects in October 2026.  
  `https://supabase.com/changelog/45329` citeturn17search2
- Supabase, **Row Level Security**, current docs checked 2026-10-21/22.  
  `https://supabase.com/docs/guides/database/postgres/row-level-security` citeturn18search0
- Supabase, **Migrating to new API keys**, current docs checked 2026-10-22.  
  `https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys` citeturn17search0
- Supabase, **API Keys**, publishable/secret vs legacy keys, checked 2026-10-22. citeturn17search3
- Supabase, **JWT signing keys**, rotation/coexistence documentation, checked 2026-10-22. citeturn17search7
- Supabase blog/documentation on signing-key migration, checked 2026-10-22. citeturn17search1
- Supabase, **Database Security Advisors**, including 0028/0029, checked 2026-10-22. citeturn19search0
- Supabase, **Database Functions**, `SECURITY INVOKER`/`DEFINER`, `search_path`, function privileges, checked 2026-10-22. citeturn19search1
- Supabase, **pgTAP/database testing** documentation, checked 2026-10-22. citeturn18search3turn18search4turn18search5turn18search7
- Supabase, **Database Backups**, current documentation checked 2026-10-22.  
  `https://supabase.com/docs/guides/platform/backups` citeturn18search1

**Supabase operations and quotas**

- Supabase, **Edge Function limits**, checked 2026-10-22.  
  `https://supabase.com/docs/guides/functions/limits` citeturn22search0
- Supabase, **Cron**, operational recommendations checked 2026-10-22.  
  `https://supabase.com/docs/guides/cron` citeturn22search1
- Supabase, **Realtime limits**, checked 2026-10-22.  
  `https://supabase.com/docs/guides/realtime/limits` citeturn22search2
- Supabase, **Realtime usage/billing**, checked 2026-10-22. citeturn22search3turn22search15turn22search13
- Supabase, **Billing/usage documentation**, current Free allocations checked 2026-10-22. citeturn22search4
- Supabase, **Egress usage**, current cached/uncached allocation details checked 2026-10-22. citeturn22search7
- Supabase, **Storage file limits**, Free 50 MB maximum object upload, checked 2026-10-22.  
  `https://supabase.com/docs/guides/storage/uploads/file-limits` citeturn22search9
- Supabase, Free database allowance documentation/changelog, checked 2026-10-22. citeturn22search14
- Supabase, current Edge Function secret-count documentation, checked 2026-10-22. citeturn22search16
- Supabase, **Database migrations / local development**, checked 2026-10-22.  
  `https://supabase.com/docs/guides/deployment/database-migrations` citeturn23search0
- Supabase, **GitHub integration**, database and Edge Function deployment, checked 2026-10-22. citeturn23search1turn23search9
- Supabase, **Deploying Edge Functions with GitHub Actions**, checked 2026-10-22. citeturn23search3

**PostgreSQL**

- PostgreSQL current documentation, **Controlling Text Search**, ranking/query functions including `websearch_to_tsquery`, `ts_rank_cd` and `ts_headline`, checked 2026-10-22.  
  `https://www.postgresql.org/docs/current/textsearch-controls.html` citeturn23search2
- PostgreSQL current documentation, **Text Search Functions and Operators**, including `setweight` and query construction, checked 2026-10-22.  
  `https://www.postgresql.org/docs/current/functions-textsearch.html` citeturn23search6