---
name: "Agent 指南"
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
---

# Design System: Agent 指南

## Overview

**Creative North Star: "The Familiar Document Desk"**

This is the user-approved Feishu-like direction A: a white document, a cool gray navigation rail, blue actions, small corners, and quiet dividers. Its character is practical, calm, and immediately recognizable to people who already write in document tools. The identity comes from the relationship between the persistent tree, the open writing surface, and the compact utility controls.

The interface supports sustained writing and reading. Navigation and metadata use compact type; document titles and generous paragraph leading establish the reading hierarchy. Editing, private preview, and public reading share the same document material. Status labels make draft and publication state visible, while the publish action carries the strongest blue emphasis.

This document records the current React implementation and the desktop screenshots in `docs/screenshots/`, after the finish review. It documents visual behavior, not production readiness: authentication and Cloudflare resources still require configuration, and the present interface is a local demonstration. No mobile design is established.

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

The document composition has a flexible central column and a right outline of (190px), widening to (218px) when the viewport is at least (1450px). The screenshots supplied for documentation are (1536 × 1024), so they show this wider outline. The central document has a maximum outer width of (1020px), with base insets (45px 62px 90px); horizontal insets become (68px) at the wide breakpoint and (44px) at widths up to (1240px). Public articles begin with a slightly larger top inset (52px).

The editor toolbar remains sticky above the independently scrolling document; its height is (61px). Management screens instead use a centered container with a maximum width (1200px), broad padding, and full-width table rows. Image-library thumbnails use a three-column grid, becoming two columns at the compact desktop breakpoint.

Spacing is compact around actions and navigation, generous around article headings and sections. The recorded small spacing steps are reused, but this is not a rigid modular scale: source values reflect document-specific relationships.

The body has a minimum width (1120px). Existing media queries refine desktop density, not phone layouts. A sidebar toggle collapses the left rail; it does not establish a mobile drawer pattern. Preserve the desktop-only scope until mobile behavior is deliberately designed and verified.

## Elevation & Depth

Permanent regions are flat. Background tone and one-pixel rules distinguish the sidebar, header, toolbar, document, and outline. Shadows indicate temporary layers, so the reading and writing surfaces do not float as cards.

### Shadow Vocabulary
- **Menu:** a compact floating menu uses `0 6px 24px #18243a24`.
- **Dialog:** the native modal uses `0 12px 45px #18243a33` over a translucent dark backdrop (`#172b4d55`).
- **Toast:** feedback uses `0 5px 24px #19253926` beneath a dark compact surface.

**The Flat Desk Rule.** Keep persistent content flat; reserve elevation for menus, modal dialogs, and transient feedback.

## Shapes

Small rounded corners are the common form language. Standard controls and search fields use the `control` radius; icon buttons and tree rows use `compact`; status labels use `status`. Floating menus and toasts use `floating`, and modal dialogs use `dialog`. Article tables and full-width management rows retain square corners and fine cell or row rules.

The interface uses thin, consistent outline icons from Lucide, generally at (16–18px) with stroke width (1.7). Icons accompany text or carry accessible labels. Identity avatars are compact rounded squares. Avoid deriving a new pill, glass, or oversized card language from these small control corners.

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

The toolbar groups undo/redo, text style, headings, lists, images, and tables with thin vertical dividers. Publication and preview remain in the utility header rather than inside the writing content. Private preview has an explicit amber label. Preserve that state distinction on new surfaces.

### Dialogs and Feedback

Native dialogs use a compact title, clear explanatory copy, and right-aligned actions. Deletion review uses a red submission button and names the affected content. Toasts are dark, compact, and positioned near the lower center of the workspace, with an explicit close button. Saving and upload progress use small inline status treatments; recovery and conflict states remain actionable beside the document.

Motion is limited: outline navigation scrolls smoothly, progress uses a linear spinner, and toast entry lasts (.22s). The reduced-motion query removes animations, transitions, and smooth scrolling.

## Do's and Don'ts

### Do:
- **Do** preserve the white document, cool gray rail, blue emphasis, and quiet divider relationship.
- **Do** keep writing, preview, and reading typography consistent while labeling their different states.
- **Do** preserve the fixed desktop navigation and flexible document column, including the implemented wide-screen outline adjustment.
- **Do** use explicit words alongside publication, review, saving, and error colors.
- **Do** retain keyboard focus, labeled icon buttons, visible upload feedback, and reduced-motion behavior.
- **Do** extend the flat table, row, and document patterns before introducing new containers.

### Don't:
- **Don't** introduce decorative gradients, glass, or floating card shells into the established flat document desk.
- **Don't** use large radii or pill shapes for ordinary controls and document rows.
- **Don't** give utility labels the visual weight of article headings.
- **Don't** replace draft, preview, publish, or review state labels with color alone.
- **Don't** describe the present desktop layout as a verified mobile system or the static outline emphasis as scroll tracking.
