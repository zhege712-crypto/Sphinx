---
name: "Sphinx"
description: "A familiar document desk for authoring and reading beginner guides."
colors:
  primary: "#3370ff"
  primary-hover: "#245bdb"
  ink: "#1f2329"
  body-ink: "#303742"
  muted: "#646c7a"
  paper: "#fff"
  sidebar: "#f5f7fa"
  divider: "#e6e9ef"
  control-border: "#d8dde5"
  selected: "#e8efff"
  published-ink: "#28704a"
  published-bg: "#e9f4ef"
  danger: "#c43c40"
  reference-surface: "#f5f6f8"
  reference-border: "#e5e8ed"
typography:
  headline:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif'
    fontSize: "34px"
    fontWeight: 650
    lineHeight: 1.45
    letterSpacing: "-0.7px"
  title:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif'
    fontSize: "27px"
    fontWeight: 600
    letterSpacing: "-0.4px"
  body:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif'
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.9
  interface:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif'
    fontSize: "14px"
    fontWeight: 400
  label:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif'
    fontSize: "12px"
    fontWeight: 400
  code:
    fontFamily: "Consolas, monospace"
    fontSize: "13px"
    lineHeight: 1.7
rounded:
  status: "4px"
  compact: "5px"
  control: "6px"
  floating: "7px"
  dialog: "9px"
spacing:
  tight: "4px"
  small: "8px"
  medium: "12px"
  inset: "16px"
  content: "20px"
  section: "25px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.paper}"
    rounded: "{rounded.control}"
    padding: "6px 13px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.paper}"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "#303744"
    rounded: "{rounded.control}"
    padding: "6px 13px"
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.paper}"
    rounded: "{rounded.control}"
    padding: "6px 13px"
  button-icon:
    backgroundColor: "transparent"
    textColor: "#596272"
    rounded: "{rounded.compact}"
    padding: "6px"
    width: "32px"
  field:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "8px 10px"
  navigation-active:
    backgroundColor: "{colors.selected}"
    textColor: "{colors.primary-hover}"
    rounded: "{rounded.control}"
    padding: "8px 14px"
  status-draft:
    backgroundColor: "#f1f3f7"
    textColor: "#646d7d"
    rounded: "{rounded.status}"
    padding: "3px 7px"
  status-published:
    backgroundColor: "{colors.published-bg}"
    textColor: "{colors.published-ink}"
    rounded: "{rounded.status}"
    padding: "3px 7px"
  reference-card:
    backgroundColor: "{colors.reference-surface}"
    textColor: "{colors.body-ink}"
    rounded: "{rounded.floating}"
    padding: "18px 20px"
  reference-term:
    backgroundColor: "transparent"
    textColor: "{colors.body-ink}"
    padding: "9px 0"
---

# Design System: Sphinx

## Overview

**Creative North Star: "The Familiar Document Desk"**

This is the user-approved Feishu-like direction A: a white document, a cool gray navigation rail, blue actions, small corners, and quiet dividers. Its character is practical, calm, and immediately recognizable to people who already write in document tools. The identity comes from the relationship between the persistent tree, the open writing surface, and the compact utility controls.

The product name is **Sphinx**, written in English in the brand and document title. “指南” names the guide content section; it is not part of the product name. The repository uses the same Sphinx name. This naming change preserves the established document-desk appearance.

The interface supports sustained writing and reading. Navigation and metadata use compact type; document titles and generous paragraph leading establish the reading hierarchy. Editing, private preview, and public reading share the same document material. Status labels make draft and publication state visible, while the publish action carries the strongest blue emphasis.

This document records the current React implementation and screenshots in `docs/screenshots/`, after the core interface finish review. The later Reference dictionary, editable term pages, and build credits extend that same world. It documents visual behavior; production configuration and verification are recorded separately in `docs/deployment.md`. The responsive extension is documented below and in `docs/mobile.md`; physical-device keyboard and touch selection remain unverified.

**Key Characteristics:**
- White document surfaces and a cool gray navigation rail.
- Restrained blue emphasis for actions, selection, links, and keyboard focus.
- Compact controls surrounding a spacious, readable document.
- Flat regions divided by fine lines; shadows reserved for floating feedback and dialogs.
- One Chinese-capable system font stack across writing and reading.

## Colors

The palette is restrained: cool neutrals support one blue accent, with green and red reserved for meaningful states. Frontmatter values are normative; the descriptions below explain their use.

### Primary
- **Document Blue** (`primary`): publication and creation actions, brand icon, checkbox accent, and focus outlines.
- **Action Blue** (`primary-hover`): primary-button hover, links, and selected navigation text.
- **Selection Wash** (`selected`): the active workspace navigation row. Selected document-tree rows use a closely related pale blue in the source.
- **Published Green** (`published-ink`, `published-bg`): the published-state label, paired with explicit text.
- **Review Red** (`danger`): the danger action in the deletion-review dialog. Error and recovery banners use their own subdued red or amber treatments rather than large saturated fields.

### Neutral
- **Document Paper** (`paper`): the writing surface, reading surface, header, fields, and default buttons.
- **Navigation Gray** (`sidebar`): the persistent left rail and subdued code/notice surfaces.
- **Document Ink** (`ink`): document titles, field text, and base text.
- **Reading Ink** (`body-ink`): long-form content and editor text.
- **Metadata Gray** (`muted`): supporting labels and quiet explanations.
- **Quiet Divider** (`divider`): regional boundaries, toolbar rules, and row separators.
- **Control Edge** (`control-border`): the more visible outline of inputs and default buttons.
- **Reference Surface and Edge** (`reference-surface`, `reference-border`): the closely related cool gray fill and outline used by website cards within rich document content.

**The State Has a Name Rule.** Pair color with readable text or a familiar control state; blue selection, green publication, and red review actions must remain understandable without color alone.

## Typography

**Display and Body Font:** the Chinese-capable system stack recorded in frontmatter. There is no separate decorative display face or downloaded font.

**Code Font:** Consolas with monospace fallback.

**Character:** neutral UI lettering keeps the work familiar. Weight and size establish hierarchy; the document title is more assertive than the surrounding interface without becoming a promotional headline.

### Hierarchy
- **Document headline:** the `headline` role applies to the public article title. The editable title shares its size and weight but uses slightly looser leading (1.5) and a fixed field height (53px).
- **Management title:** the `title` role labels document management and other workspace views.
- **Article headings:** three observed levels (28px, 22px, 18px), with more space above than below. The editor uses the same sizes through its BlockNote overrides.
- **Body:** the `body` role describes public reading; editable body text uses slightly tighter leading (1.85). Content width follows the document column rather than a fixed character count.
- **Interface:** base controls and navigation use the `interface` role. Tree and breadcrumb labels are smaller (13px); status and footer labels reach (11px).
- **Label:** metadata, outline links, secondary controls, and supporting text use the `label` role or a neighboring compact size already present in source.
- **Code:** fenced code uses the `code` role; inline code uses a relative size (.9em), a pale background, and compact padding.

**The Document Leads Rule.** Preserve the size difference between article content and surrounding utility labels; new chrome must not compete with the document title.

## Layout

The desktop shell fills the viewport height. Its left navigation is fixed at (248px), while the main area flexes. The brand row and utility header align at (64px). The navigation rail scrolls above a bottom identity area; the main writing column and right outline have their own overflow regions.

The document composition has a flexible central column and a right outline of (190px), widening to (218px) when the viewport is at least (1450px). The original editor/documents/reader screenshots are (1536 × 1024) and show the wider outline; the newer Sphinx editor/reader captures show the narrower desktop arrangement. The central document has a maximum outer width of (1020px), with base insets (45px 62px 90px); horizontal insets become (68px) at the wide breakpoint and (44px) at widths up to (1240px). Public articles begin with a slightly larger top inset (52px).

The editor toolbar remains sticky above the independently scrolling document and has automatic height. Its top row holds formatting tools and can scroll horizontally; a thin rule separates a second row of labeled insertion actions. Management screens instead use a centered container with a maximum width (1200px), broad padding, and full-width table rows. Image-library thumbnails use a three-column grid, becoming two columns at the compact desktop breakpoint.

Spacing is compact around actions and navigation, generous around article headings and sections. The recorded small spacing steps are reused, but this is not a rigid modular scale: source values reflect document-specific relationships.

The body has a minimum width (320px). Up to (900px), navigation becomes a native modal drawer with a backdrop, close button, Escape dismissal, focus containment and restoration. Selecting a destination closes the drawer. Ctrl/Cmd+K opens it and focuses document search when needed. Up to (1100px), the outline becomes a disclosure above the scrolling document; selecting a heading collapses it, restores focus to its summary, and scrolls to the target. Wider screens retain the desktop rail and right outline.

On phones, document titles use (28px), body and editable content (16px), and form fields (16px). Main touch controls have a minimum (44px) target. The writing header has a title row and an action row retaining save state, preview and publish. Both toolbar rows scroll horizontally. Reference names use one column and A–Z controls wrap. Side-by-side images stack above their copy without modifying stored layout. Reader tables and code, editor tables and management lists scroll within their containers. Dialogs fit the dynamic viewport and scroll internally. Safe-area insets protect navigation and bottom feedback. Screens below (380px) use (22px) document insets. See `docs/mobile.md` for viewport validation and physical-device limits.

## Elevation & Depth

Permanent regions are flat. Background tone and one-pixel rules distinguish the sidebar, header, toolbar, document, and outline. Shadows indicate temporary layers, so the reading and writing surfaces do not float as cards.

### Shadow Vocabulary
- **Menu:** a compact floating menu uses `0 6px 24px #18243a24`.
- **Dialog:** the native modal uses `0 12px 45px #18243a33` over a translucent dark backdrop (`#172b4d55`).
- **Toast:** feedback uses `0 5px 24px #19253926` beneath a dark compact surface.

**The Flat Desk Rule.** Keep persistent content flat; reserve elevation for menus, modal dialogs, and transient feedback.

## Shapes

Small rounded corners are the common form language. Standard controls and search fields use the `control` radius; icon buttons and tree rows use `compact`; status labels use `status`. Floating menus and toasts use `floating`, and modal dialogs use `dialog`. Article tables and full-width management rows retain square corners and fine cell or row rules.

The interface uses thin, consistent outline icons from Lucide, generally at (16–18px) with stroke width (1.7). Icons accompany text or carry accessible labels. Identity avatars are compact rounded squares. Website cards within document content use a scoped rounded rectangle (7px) with a compact provider mark; the Reference index itself uses plain term links. Neither pattern turns the article or management views into card shells. Avoid deriving a new pill, glass, or oversized card language from these small control corners.

## Components

### Buttons

Compact and familiar. Default buttons use white fill, a visible control edge, the control radius, and padding (6px 13px), with a minimum height (34px). Primary buttons use Document Blue with white text and darken on hover. Secondary controls use a pale neutral hover with a stronger border. Disabled controls lower opacity (.5) and retain their label.

Icon buttons use transparent backgrounds at rest, compact corners, and a pale blue-gray hover. Editor tools are slightly narrower than general icon buttons. Preserve their accessible names and keyboard activation; image insertion is a button that opens the file chooser.

Keyboard focus uses a blue outline (2px), offset (3px). The editable document title is the existing special case, using a thin bottom emphasis instead of the normal outline.

### Inputs / Fields

White fields have a fine control edge, control radius, padding (8px 10px), and minimum height (36px). Search combines an outline icon, an unbordered inner input, and a quiet shortcut hint within a single outlined surface. The title input removes ordinary field chrome so that it reads as the document title. Errors are explained in adjacent banners with recovery actions.

### Navigation

The main navigation uses icon-and-label rows with a minimum height (40px). Hover adds a quiet gray surface; active rows pair blue text with Selection Wash. The nested document tree uses smaller type, compact row corners, visible expand/collapse controls, ellipsis for long titles, and a related pale-blue selection. The right outline uses plain text rows and indentation rather than card containers.

The present outline highlights its first entry with blue text and a fine left rule. It does not currently track the active scroll section. Do not document that static emphasis as scroll-aware behavior.

### Status Labels

Small rectangular labels use compact padding (3px 7px), the status radius, and compact text (11px). Draft and unpublished changes use neutral tones; published content uses the green pair. Some top-bar statuses intentionally remove the label background. Preserve the words that distinguish saved draft, unpublished changes, and published content.

### Rows / Containers

Document management uses tables and flat full-width rows, not a card grid. Row separators provide structure; header cells have a subtle cool fill. Recent-document rows use a minimum height (76px) and gentle hover. Notices use pale fills and small corners. Image-library figures are unframed, with contained thumbnails and caption/action text below.

### Document Surface

Editor, private preview, and reader share white paper and the same title/content hierarchy. Body paragraphs, numbered lists, bullets, nested lists, tables, code, quotes, images, and captions remain part of the reading flow. Tables have fine visible cell boundaries, subdued header fills, and horizontal overflow when needed. Images keep their aspect ratio and fit the content width. Code blocks have a neutral fill, compact corners, and their own horizontal scrolling.

The toolbar's top row groups undo/redo, text style, headings, and lists with thin vertical dividers. A second row begins with the quiet label “插入” and exposes “图片”, “图文并排”, “表格”, “词汇链接”, and “链接卡片” as icon-and-text buttons (12px), rather than hiding their purpose in icons alone. Publication and preview remain in the utility header rather than inside the writing content. Private preview has an explicit amber label. Preserve that state distinction on new surfaces.

### Manual Term Hyperlinks

The “词汇链接” action links only the author's selected words to a chosen Reference term or an external HTTP(S) URL. It never finds and links other occurrences of the same word automatically. An existing link can be edited or removed by selecting it or placing the caret inside it; applying and removing a link preserve its text and inline styles.

A native modal dialog inherits the existing dialog radius, shadow, white surface, and compact actions. It shows the selected words, then two equal-width target-mode buttons: “站内 Reference” and “站外网址”. The active mode uses Selection Wash, blue text and border, and a pressed state. Reference mode focuses a labeled search field and presents plain title rows inside a fine-bordered, scrollable list (maximum height 240px). Selection uses a pale-blue row plus a checkmark; unpublished terms carry an explicit “尚未发布” badge (11px) and an access warning. External mode provides a labeled URL field and explains that the destination opens in a new tab. Apply and Cancel remain right-aligned; Remove Link, when available, sits at the left of that same action row. Validation errors appear as inline alert text.

Dialog focus protects the chosen document range, and cancellation restores it when the document is unchanged. If an asynchronous change makes that range stale, application or removal is rejected with an instruction to reselect the words. Internal links use the fixed term ID in `#/reference/:id`, opening in the same tab and remaining relative to the current deployment path. External HTTP(S) links open a new tab with the safe relationship attributes. In reading, only the chosen words receive the ordinary blue, underlined link treatment; surrounding text and other matching words keep their original presentation.

Finish evidence for this extension is recorded in `docs/screenshots/term-link-picker-local.png` and `docs/screenshots/term-link-reader-local.png`. The finish reviewer reported no material findings; the final production build after the autofocus adjustment and all 29 tests passed. This closeout preserves the established desktop composition and palette.

### Images and Image-Text Layouts

The native single-image block retains visible utility controls whenever it has an image URL. These controls sit on Navigation Gray, use the control radius, padding (10px 12px), and quiet utility labels (11px). A layout select offers left, center, and right single-image alignment plus image-left/text-right and text-left/image-right arrangements. The image remains proportional and fits within the document width.

Single-image sizing provides a range slider, an explicit pixel input (64–1600), and Small, Medium, and Full Width presets. The slider adapts to the available editor width; presets use roughly one-third, two-thirds, or all of that space. The pixel field is clamped on blur, and invalid values block saving until corrected. Clearing the field restores automatic sizing. A separate optional caption field stays visible below the sizing row.

The `imageText` block pairs an image figure with genuinely editable rich child blocks, including multiple paragraphs, in a two-column grid with a gap (24px). Image placement can be left or right, and its share of the content width is adjustable from (25–65%) in five-point steps, defaulting to (40%). The copy column uses normal document typography, no nested indentation, and a quiet empty-text hint. In public reading, the same proportions and ordering apply without authoring controls. Switching back to a single image preserves the image and caption and moves all text children into normal following blocks. Do not flatten this text into a caption or discard it during layout changes.

### Published Update Metadata

Each public guide article and Reference term shows “最近更新” with a semantic time element below its title. It uses the published snapshot's `updatedAt`, falling back to `publishedAt`; later private draft changes do not change the reader's date. Invalid or missing timestamps produce no label. The compact metadata row uses the existing quiet text treatment with tabular numerals, a gap (9px), and a bottom margin (30px), preserving the title-to-body hierarchy.

### Copyable Text and Code

Reader code blocks have a quiet language label and an always-visible Copy action in a separate header, above the horizontally scrollable preformatted text. The pale sidebar surface, existing small radius and fine divider keep the document grammar. The Copy action reports success, disables during the request and for empty content, and presents an actionable message when clipboard permission is denied. Its phone target is at least 44px high. The editor's “可复制内容” action inserts a standard text code block without replacing existing content. Clipboard text comes from the block model, preserving indentation and line breaks while excluding UI labels. Local browser verification includes a copy-and-paste roundtrip in Edge, a denied-permission fixture, and narrow-screen measurements.

### About and Contact

Between the introduction and contacts, “参与者与致谢” is an independent rich-document section separated by a fine rule. The owner's initial action creates a private, editable roster with third-level groups “写作成员” and “其他贡献者”; subsequent visits use an Edit action. Names are plain list or paragraph content with standard text links, preserving the reading surface rather than adding profile cards. Authors see compact guidance for adding nicknames, contributions and external links, and the distinction between public credit and workspace access. The public section uses only its published snapshot and shows a quiet placeholder until publication. It inherits the established narrow-screen wrapping and document typography.

The public `#/about` route and writer `#/write/about` route use the existing document column with the sidebar label “关于与联系”. A project introduction precedes a fine divider and three contact rows. Rows use the existing Lucide stroke icons, service labels, readable email/username text and external arrows; there are no contact card shells. Mobile rows place the service label above the value, keeping long email addresses inside the viewport. Email links use mailto; the Bilibili user search opens with noopener/noreferrer. The introduction starts with a quiet placeholder and is supplied by a normal document's published snapshot. The workspace offers an edit action and clearly labels the draft-to-publish behavior. Anonymous pages contain no authoring entry.

### Dialogs and Feedback

Anonymous public pages omit workspace and edit-term entry links. Authenticated workspace readers may return to writing; owners copy the partner workspace URL from the existing Members page, beneath a short explanation that the account must be invited first. This uses a plain button and quiet paragraph within the established management layout. The URL itself grants no access. Nonowner management routes redirect to the workspace with a permission message.

Native dialogs use a compact title, clear explanatory copy, and right-aligned actions. Deletion review uses a red submission button and names the affected content. Toasts are dark, compact, and positioned near the lower center of the workspace, with an explicit close button. Saving and upload progress use small inline status treatments; recovery and conflict states remain actionable beside the document.

Motion is limited: outline navigation scrolls smoothly, progress uses a linear spinner, and toast entry lasts (.22s). The reduced-motion query removes animations, transitions, and smooth scrolling.

### Reference Dictionary and Build Credits

Reference is a dictionary of named terms with independent rich-content pages. Its index appears below ordinary document editing and private preview, below public articles, and on the empty public homepage and empty-editor welcome screen. Public and writer sidebars also provide dedicated index views at `#/reference` and `#/write/reference`. Standalone and welcome-screen wrappers flex to fill available height, allow shrinking, and scroll vertically so the full index and credits remain reachable. They share a centered maximum width (1040px). The embedded index uses a fine top rule; the standalone view removes that rule. Its title is modest (24px, weight 600).

A compact search field (240px, or 185px in the embedded editor index) sits beside the heading, followed by tag filters and wrapping All, A–Z, and Other controls. Searching matches names, author-defined tags, body text and pinyin, combines space-separated keywords, and clears the letter filter. Name matches rank ahead of tags and body; results show highlights and a short matching excerpt. Related tags expose counts and can narrow results. Letter buttons filter by the name's initial, and clicking an active letter clears it. Chinese names join A–Z by their pinyin initial, with titles sorted using Chinese pinyin collation. Other appears only for numeric, symbolic, or unsupported initials. Labeled clear controls reset search or all filters. Index state, scroll and last opened row are restored on return.

Tags use small neutral labels under term names, with the existing pale-blue selection and highlight color. The term editor places removable tags, an existing-tag suggestion field and an Add action between the byline and body. Tags follow draft/history/publication state; the public term page exposes them as links to the filtered index. At phone widths the main tag controls use 44px touch targets. The sidebar searches both guides and terms and shows content type, tags and matching snippets. No card layout is introduced.

Writer pages have document-specific routes. The editor offers a return action above the title, while the term page returns to its source with an index fallback. Navigation waits for draft and pending-tag validation; failures preserve the editor and input. See `docs/discovery.md` for the state and database contract.

The index groups plain term names by initial, with a narrow letter column (48px) and two columns of links, separated by fine horizontal rules. Terms use body-sized interface text (14px), a minimum row height (42px), square corners, and no fill. Their arrow appears on hover or keyboard focus as the text turns blue. Writer rows also show a compact textual publication state. The index does not use provider-mark website cards.

Each public term opens at `#/reference/:id`, with a back-to-index link, document title, rich body, right outline, and credits. The writer route `#/write/reference/:id` uses the existing editor, private draft, explicit publish, history, and deletion-review workflow. Term editing ends with a return-to-index action and credits rather than another embedded dictionary. New terms are created from the writer index using the familiar primary action and dialog.

Website cards are rich-content blocks inside term pages or ordinary documents. Each shows a destination mark, a card name, a URL, and an external-link arrow, without descriptive card copy. Links use the scoped Reference Surface, its fine border, the floating radius, padding (18px 20px), a minimum height (88px), and a slightly bluer hover fill. The editor exposes card-name and URL fields; incomplete URLs show an inline message, and only valid HTTP(S) destinations render as links. Marks are local static SVG images (28px) inside rounded squares (48px), selected from the destination host; unknown destinations use an external-link icon. OpenAI, Anthropic, Claude, and DeepSeek use the four vendored Lobe Icons static SVG assets (1.95.1), with their MIT license retained in `src/assets/brands/LICENSE` and attribution in `THIRD_PARTY_NOTICES.md`. Brand marks identify the linked destination; they do not claim sponsorship or endorsement.

Build credits are quieter (11px), with the label “网页构建支持” and OpenAI and DeepSeek links. Their SVG images shrink to (15px) inside marks (20px). Credits appear at the end of each dictionary index and term page. External website and credit links open in a new tab with the corresponding safe relationship attributes; term names navigate within the site. Keep the dictionary, rich-body cards, and credits inside the established document grammar.

## Do's and Don'ts

### Footer notice and embedded index

Normal page surfaces end with a shared two-paragraph disclaimer after the content and build credits. A fine top rule, 12px muted text and comfortable line height keep it readable without competing with the article. Its underlined “关于与联系” link follows reader or writer navigation. The footer scrolls with the page; it never floats over prose or occupies a fixed viewport strip. Reading columns align it with the document measure; index, about and management containers use their existing inset.

Only the Reference index embedded at an article or editor's end can collapse. It starts closed, showing a keyboard-operable title row, chevron, term count and explicit 展开/收起 label. The browser remembers reader and writer preferences separately. Search, filters and terms appear on expansion with existing state preserved; build credits remain visible. The standalone dictionary remains expanded. Mobile disclosure controls retain 44px targets and wrap the search beneath the title.

### Code demonstrations

The editor's existing insert row includes “代码演示”. Its inline fields collect a title, height and a single HTML/SVG source, with file import beside them. A monospace textarea keeps source visibly distinct from prose. A short format hint explains the single-file and offline boundary. Drafts, preview and publication reuse the document workflow.

Readers see a quiet bordered demonstration panel: a neutral header holds the title and run/restart/stop actions, a 12px gray inset separates the white sandbox from the article, and a small status row precedes the collapsible source. The initial state invites a click; scripts never start on article load. Mobile controls have 44px targets, the header wraps, and the window stays inside the article width. Errors appear below the stage in readable text. The sandbox belongs to the artifact and cannot style the surrounding document.

### Do:
- **Do** preserve the white document, cool gray rail, blue emphasis, and quiet divider relationship.
- **Do** keep writing, preview, and reading typography consistent while labeling their different states.
- **Do** preserve the fixed desktop navigation and flexible document column, including the implemented wide-screen outline adjustment.
- **Do** use explicit words alongside publication, review, saving, and error colors.
- **Do** retain keyboard focus, labeled icon buttons, visible upload feedback, and reduced-motion behavior.
- **Do** extend the flat table, row, and document patterns before introducing new containers.
- **Do** show plain term names in the Reference index; reserve name-and-URL website cards for rich page content and keep build credits visually secondary.
- **Do** link only explicitly chosen words, preserve their text and styles, and keep internal term links distinct from external destinations.

### Don't:
- **Don't** introduce decorative gradients, glass, or floating card shells into the established flat document desk.
- **Don't** use large radii or pill shapes for ordinary controls and document rows.
- **Don't** give utility labels the visual weight of article headings.
- **Don't** replace draft, preview, publish, or review state labels with color alone.
- **Don't** claim physical-device touch/keyboard verification from viewport testing, or describe static outline emphasis as scroll tracking.
- **Don't** automatically link other occurrences of a selected term or apply a hyperlink to a stale document range.
