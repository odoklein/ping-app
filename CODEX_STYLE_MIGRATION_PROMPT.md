# CODEX STYLE MIGRATION PROMPT — Suzalink / élan CRM Platform

## CONTEXT

This is a Next.js 15 CRM platform called **élan** (previously Suzalink). It recently underwent a brand migration from an **old dark indigo/violet/cool-gray theme** to a new **warm, paper-toned "Élan" brand system**. A compatibility layer (`elan-theme.css`) was created that uses CSS `!important` overrides on Tailwind utility classes, but **hundreds of old color values remain hardcoded in component files and CSS classes**.

Your job is to systematically replace ALL remaining old-theme colors with the correct Élan design tokens. The app must look consistent with the Élan warm brand: warm paper backgrounds, petrol dark surfaces, amber accents, and warm gray text.

---

## THE ÉLAN DESIGN SYSTEM (TARGET)

### Color Tokens — Use these EVERYWHERE:

| Token | Value | Usage |
|-------|-------|-------|
| `--elan-paper` | `#f4f0e8` | Primary light background, cards |
| `--elan-paper-2` | `#ece5d8` | Page background, secondary surfaces |
| `--elan-paper-3` | `#e4dbca` | Tertiary surfaces, hover states |
| `--elan-surface` | `#fffcf6` | White-equivalent surface (inputs, modals) |
| `--elan-ink` | `#15201e` | Primary text (headings, body) |
| `--elan-ink-soft` | `#394b46` | Secondary text |
| `--elan-slate` | `#5c6e69` | Tertiary/muted text, labels |
| `--elan-petrol` | `#0c3b38` | Dark surfaces (sidebar, dark headers) |
| `--elan-petrol-700` | `#114b46` | Dark surface variant |
| `--elan-eucalyptus` | `#dbe4df` | Accent-light backgrounds (replaces indigo-50/violet-50) |
| `--elan-amber` | `#ff9e1b` | Primary accent (buttons, active states) |
| `--elan-amber-deep` | `#e07c00` | Accent hover/dark variant |
| `--elan-line` | `rgba(21, 32, 30, 0.13)` | Borders, dividers |
| `--elan-line-strong` | `rgba(21, 32, 30, 0.24)` | Stronger borders |
| `--elan-danger` | `#b9433e` | Error/danger |
| `--elan-success` | `#25745f` | Success states |
| `--elan-shadow-sm` | `0 1px 2px rgba(12,59,56,0.04), 0 5px 16px rgba(12,59,56,0.045)` | Small shadow |
| `--elan-shadow-md` | `0 16px 45px rgba(12,59,56,0.09)` | Medium shadow |

### Muted palette:
| Token | Value |
|-------|-------|
| Muted text 1 | `#7a8984` |
| Muted text 2 | `#899892` |
| Light muted | `#a7b2ad` |
| Muted border | `#b8c2bd` |

---

## COLOR MAPPING — Old → New

### Backgrounds:
| OLD | NEW | Notes |
|-----|-----|-------|
| `#F4F6F9`, `#F8F9FC`, `#F4F5FA`, `#FAFBFC`, `#F0F1F5`, `#FAFAFF`, `#F5F6FA`, `#EEF0F8`, `#FAFBFD`, `#F9FAFC`, `#F8FAFC`, `#f1f5f9`, `#f8f9fb` | `var(--elan-paper)` or `#f4f0e8` | Cool gray backgrounds → warm paper |
| `white`, `#FFFFFF`, `#fff` | `var(--elan-surface)` or `#fffcf6` | Pure white → warm white |
| `#eef2ff`, `#F3F0FF`, `#EEF2FF`, `#F8F7FF`, `#EEEDFB`, `#F3F2FD` | `var(--elan-eucalyptus)` or `#dbe4df` | Indigo/violet light bg → eucalyptus |
| `#FAFAFA`, `#F3F4F6`, `#F3F4F8` | `var(--elan-paper)` or `#f4f0e8` | Neutral gray → warm paper |
| `#0f0f12`, `#1e1b4b`, `#312e81` | `var(--elan-petrol)` or `#0c3b38` | Dark violet/slate → petrol |

### Text Colors:
| OLD | NEW | Notes |
|-----|-----|-------|
| `#12122A`, `#0f172a`, `#1e293b`, `#2D2D35`, `#1A1A1A`, `#0A0A0B`, `#111827` | `var(--elan-ink)` or `#15201e` | Dark text |
| `#334155`, `#475569`, `#44403C`, `#4b5563` | `var(--elan-ink-soft)` or `#394b46` | Medium-dark text |
| `#5A5A7A`, `#6B7194`, `#64748b`, `#6A6A8A`, `#6B6B7B`, `#4B4D7A`, `#78716C` | `var(--elan-slate)` or `#5c6e69` | Muted text |
| `#8B8BA7`, `#8B8DAF`, `#A0A3BD`, `#A0A0B0`, `#B0B3C4`, `#B0B0C7`, `#C5C8D4`, `#94a3b8`, `#9ca3af`, `#A8A29E` | `#7f8e89` or `#899892` | Light muted text |

### Border Colors:
| OLD | NEW |
|-----|-----|
| `#E8EBF0`, `#E2E8F0`, `#e2e8f0`, `#E0E3EA`, `#EEF1F6`, `#F0F1F5`, `#E0E3F5`, `#E7EAF2`, `#DDE0EC` | `var(--elan-line)` or `rgba(21,32,30,0.13)` |
| `#C5C8D4`, `#CBD5E1`, `#cbd5e1`, `#D8DEEA`, `#D4C8FF` | `var(--elan-line-strong)` or `rgba(21,32,30,0.24)` |

### Accent Colors:
| OLD | NEW | Notes |
|-----|-----|-------|
| `#6366f1`, `#4f46e5`, `#7C5CFC`, `#5B4FE8`, `#6C3AFF`, `#6C4CE0`, `#4238D0`, `#818cf8` | `var(--elan-amber)` / `#ff9e1b` (for backgrounds/buttons) OR `var(--elan-petrol)` / `#0c3b38` (for text/icons) | Context-dependent: solid bg → amber, text links → petrol |
| `#A78BFA`, `#8b5cf6`, `#7B72EF` | `var(--elan-amber)` or `#ffb64f` | Lighter accent variants |
| `#c7d2fe`, `#a5b4fc` | `rgba(12,59,56,0.22)` or `#b8c2bd` | Accent borders |
| `rgba(99, 102, 241, *)`, `rgba(79, 70, 229, *)`, `rgba(91, 79, 232, *)`, `rgba(124, 92, 252, *)`, `rgba(139, 92, 246, *)` | `rgba(12, 59, 56, *)` or `rgba(255, 158, 27, *)` | RGBA accent values |

### Tailwind Class Mapping:
| OLD Tailwind | NEW Tailwind / CSS |
|-------------|-------------------|
| `bg-white` | `bg-[var(--elan-surface)]` or keep (elan-theme overrides it) |
| `bg-slate-50` | `bg-[var(--elan-paper)]` |
| `bg-slate-100` | `bg-[var(--elan-paper-2)]` |
| `bg-slate-200` | `bg-[var(--elan-paper-3)]` |
| `bg-slate-800`, `bg-slate-900` | `bg-[var(--elan-petrol)]` |
| `text-slate-900`, `text-gray-900` | `text-[var(--elan-ink)]` |
| `text-slate-700`, `text-slate-800` | `text-[var(--elan-ink-soft)]` |
| `text-slate-500`, `text-slate-600` | `text-[var(--elan-slate)]` |
| `text-slate-400` | `text-[#7b8984]` |
| `border-slate-200`, `border-slate-100` | `border-[var(--elan-line)]` |
| `border-slate-300`, `border-slate-400` | `border-[var(--elan-line-strong)]` |
| `bg-indigo-50`, `bg-violet-50`, `bg-purple-50` | `bg-[var(--elan-eucalyptus)]` |
| `bg-indigo-500`, `bg-indigo-600`, `bg-violet-500` | `bg-[var(--elan-amber)]` |
| `text-indigo-600`, `text-indigo-700`, `text-violet-600` | `text-[var(--elan-petrol)]` |
| `text-indigo-400`, `text-indigo-500`, `text-violet-500` | `text-[var(--elan-amber-deep)]` |
| `border-indigo-200`, `border-violet-200` | `border-[rgba(12,59,56,0.22)]` |
| `from-indigo-500 to-violet-600` | `from-[#ff9e1b] to-[#e07c00]` |
| `from-slate-900 via-indigo-950 to-slate-900` | `from-[#0c3b38] via-[#114b46] to-[#0c3b38]` |
| `from-slate-900 via-slate-800 to-slate-900` | `from-[#0c3b38] via-[#114b46] to-[#0c3b38]` |
| `ring-indigo-500/20`, `ring-violet-500/20` | `ring-[rgba(255,158,27,0.34)]` |
| `focus:border-indigo-400`, `focus:border-violet-400` | `focus:border-[var(--elan-amber-deep)]` |
| `focus:ring-indigo-500/30`, `focus:ring-violet-500/30` | `focus:ring-[rgba(255,158,27,0.22)]` |
| `hover:bg-indigo-50`, `hover:bg-violet-50` | `hover:bg-[var(--elan-eucalyptus)]` |
| `hover:text-indigo-600`, `hover:text-violet-600` | `hover:text-[var(--elan-petrol)]` |
| `shadow-indigo-*`, `shadow-violet-*` | Use `rgba(12,59,56,0.12)` shadow |

---

## FILES TO FIX — ORGANIZED BY PRIORITY

### PRIORITY 1: CSS FILES (fix these first — they cascade everywhere)

#### File: `app/globals.css`

**A) First `:root` block (lines 8-50):** Remove or update all old brand color definitions. The `elan-theme.css` already overrides them, but these are dead/confusing code. Either delete them or update to match Élan values.

**B) Dashboard classes `.db-*` (lines 2896-3630):** These have ~100 hardcoded old colors NOT overridden by elan-theme.css:
- `.db-title` line 2916: `color: #1e293b` → `color: var(--elan-ink)`
- `.db-subtitle` line 2921: `color: #64748b` → `color: var(--elan-slate)`
- `.db-period-selector` line 2935: `background: #f1f5f9` → `background: var(--elan-paper)`
- `.db-period-btn` line 2943: `color: #64748b` → `color: var(--elan-slate)`
- `.db-period-btn-active` line 2957: `background: white; color: #4f46e5` → `background: var(--elan-surface); color: var(--elan-petrol)`
- `.db-mission-select` line 2963: `color: #334155; background: white; border: 1px solid #e2e8f0` → use Élan tokens
- `.db-mission-select:focus` line 2974: `border-color: #6366f1; box-shadow: rgba(99, 102, 241, 0.2)` → amber focus ring
- `.db-refresh-btn` line 2986: old colors → Élan tokens
- `.db-refresh-btn:hover` line 2993: `color: #4f46e5; background: #eef2ff; border-color: #c7d2fe` → petrol text, eucalyptus bg
- `.db-hero` line 3026: `background: linear-gradient(135deg, #4f46e5 0%, #6366f1 50%, #818cf8 100%); box-shadow: rgba(99, 102, 241, 0.35)` → petrol/amber gradient
- `.db-kpi` line 3132: `background: white; border: 1px solid #e2e8f0` → Élan tokens
- `.db-kpi-icon-calls` line 3150: `background: #eef2ff; color: #6366f1` → `background: var(--elan-eucalyptus); color: var(--elan-petrol)`
- `.db-kpi-value` line 3165: `color: #1e293b` → `color: var(--elan-ink)`
- `.db-kpi-label` line 3172: `color: #64748b` → `color: var(--elan-slate)`
- `.db-card` line 3200: `background: white; border: 1px solid #e2e8f0` → Élan tokens
- `.db-card-title` line 3218: `color: #1e293b` → `var(--elan-ink)`
- `.db-card-count` line 3224: `color: #64748b` → `var(--elan-slate)`
- `.db-card-badge` line 3237: `color: #4f46e5; background: #eef2ff` → petrol + eucalyptus
- `.db-link-btn` line 3248: `color: #6366f1` → `color: var(--elan-petrol)`
- `.db-link-btn:hover` line 3254: `color: #4f46e5` → `color: var(--elan-amber-deep)`
- ALL `.db-mission-*` classes: Replace #1e293b, #64748b, #4f46e5, #eef2ff, #94a3b8, #f8fafc
- ALL `.db-lb-*` leaderboard classes: Same replacements
- ALL `.db-goal-*` classes: Same replacements
- ALL `.db-activity-*` classes: `#6366f1` dot → `var(--elan-amber)`, #334155 → var(--elan-ink-soft), #94a3b8 → #899892
- `.db-badge-good` line 3574: `background: #dbeafe; color: #2563eb` → `background: var(--elan-eucalyptus); color: var(--elan-petrol)`

**C) Client portal classes `.client-*` (lines 2803-2891):**
- `.client-kpi-card::before` line 2817: `background: linear-gradient(90deg, #6366f1, #8b5cf6)` → amber gradient
- `.client-kpi-card:hover` line 2823: `box-shadow: rgba(99, 102, 241, 0.12); border-color: #c7d2fe` → Élan shadows/borders
- `.client-panel` line 2834: `background: white; border: 1px solid #e2e8f0` → Élan tokens
- `.client-panel:hover` line 2840: `border-color: #cbd5e1` → Élan line-strong
- `.client-opp-card:hover` line 2852: `border-color: #a5b4fc; box-shadow: rgba(99, 102, 241, 0.1)` → Élan border/shadow
- `.client-opp-card:focus-visible` line 2857: `outline: 2px solid #6366f1` → amber-deep outline
- `.client-mission-row` line 2863: `background: white; border: 1px solid #e2e8f0` → Élan tokens
- `.client-mission-row:hover` line 2870: `background: #f8fafc; border-color: #c7d2fe; box-shadow: rgba(99, 102, 241, 0.06)` → Élan hover

**D) Team classes `.team-*` (lines 2596-2668):**
- All instances of `background: white`, `border: 1px solid #e2e8f0`, `border-color: #c7d2fe`, `box-shadow: rgba(99, 102, 241, *)`, `background: #f8fafc` → Élan tokens

**E) Manager link/file classes (lines 2695-2716):**
- `.mgr-link-btn`: `color: #6366f1` → petrol, hover `color: #4f46e5; background: #eef2ff` → amber-deep + eucalyptus
- `.mgr-files-strip`: `background: #f8fafc; border: 1px solid #e2e8f0` → Élan paper + line

**F) Premium card/glass card/gradient text (lines 3732-3762):**
- `.premium-card`: `background: white; border: rgba(232, 235, 240, 0.8); box-shadow: rgba(124, 92, 252, *)` → Élan surface/line/shadow
- `.glass-card`: `background: rgba(255, 255, 255, 0.7)` → `rgba(255, 252, 246, 0.7)`
- `.gradient-text`: `background: linear-gradient(135deg, #6C3AFF 0%, #7C5CFC 40%, #A78BFA 100%)` → Élan overrides this already but clean up
- `.pulse-glow` animation: `rgba(124, 92, 252, *)` → `rgba(12, 59, 56, *)`

**G) SDR drawer classes `.sdr-*` (lines 4286-4616):**
- `.sdr-section-label` line 4312: `color: #A0A0B0` → `color: var(--elan-slate)`
- `.sdr-card` line 4319: `background: #FFFFFF` → `var(--elan-surface)`
- `.sdr-info-val` line 4354: `color: #2D2D35` → `var(--elan-ink)`
- `.sdr-info-val a` line 4357: `color: #4238D0` → `var(--elan-petrol)`
- `.sdr-info-val a:hover` line 4360: `color: #5B4FE8` → `var(--elan-amber-deep)`
- `.sdr-note-quote` line 4367: `background: rgba(91,79,232,*)` → eucalyptus-based
- `.sdr-note-quote::before` line 4377: `background: linear-gradient(to bottom, #7B72EF, #5B4FE8)` → `var(--elan-amber)`
- `.sdr-chip` line 4398: `background: #FFFFFF; color: #6B6B7B` → Élan tokens
- `.sdr-chip:hover` line 4405: `color: #2D2D35` → `var(--elan-ink)`
- `.sdr-qaction` line 4420: `background: #FFFFFF; color: #6B6B7B` → Élan tokens
- `.sdr-textarea`, `.sdr-input`: `color: #0A0A0B; background: #FFFFFF` → Élan tokens
- `.sdr-textarea:focus`, `.sdr-input:focus`: `border-color: #5B4FE8; box-shadow: rgba(91,79,232,0.1)` → amber focus
- `.sdr-submit` line 4506: `background: #5B4FE8; box-shadow: rgba(91,79,232,0.28)` → amber button
- `.sdr-submit:hover` line 4509: `background: #4238D0` → amber-deep
- `.sdr-submit-secondary` line 4524: `color: #2D2D35` → `var(--elan-ink)`
- `.sdr-tab .active` line 4550: `background: #FFFFFF; color: #0A0A0B` → Élan tokens
- `.sdr-summary` line 4558: `background: #FAFAFA` → `var(--elan-paper)`
- `.sdr-tag` line 4576: `background: #F3F4F6` → `var(--elan-paper)`
- `.sdr-meeting-chip.sel` line 4595: `background: #5B4FE8; border-color: #5B4FE8; box-shadow: rgba(91,79,232,0.25)` → amber
- `.sdr-ai-btn` line 4607: `border: rgba(91,79,232,0.2); background: rgba(91,79,232,0.04); color: #5B4FE8` → petrol/eucalyptus
- `.sdr-ai-summary` line 4459: `background: linear-gradient(135deg, #EEEDFB, #F3F2FD)` → eucalyptus
- `.sdr-meeting-box` line 4626: `background: rgba(91,79,232,*)` → eucalyptus-based
- `.sdr-callback-box` line 4621: Keep amber tones (already correct)

**H) SQSQ `:root` block (lines 3815-3847):**
Update:
- `--accent: #4F46E5` → `var(--elan-amber)` or `#ff9e1b`
- `--a-light: #EEF2FF` → `var(--elan-eucalyptus)` or `#dbe4df`
- `--a-text: #4338CA` → `var(--elan-petrol)` or `#0c3b38`
- `--canvas: #FAFAF8` → `var(--elan-paper-2)`
- `--surface: #FFFFFF` → `var(--elan-surface)`
- `--s2: #F4F3F0` → `var(--elan-paper)`
- Other values: map to Élan equivalents

#### File: `app/manager/rdv/_components/rdv-shell.css`

This file has its own `:root` block with OLD values. Update:
- `--bg: #f8f9fb` → `var(--elan-paper-2)` or `#ece5d8`
- `--surface: #ffffff` → `var(--elan-surface)` or `#fffcf6`
- `--surface2: #f1f3f7` → `var(--elan-paper)` or `#f4f0e8`
- `--border: rgba(0, 0, 0, 0.06)` → `var(--elan-line)`
- `--ink: #111827` → `var(--elan-ink)` or `#15201e`
- `--ink2: #4b5563` → `var(--elan-ink-soft)` or `#394b46`
- `--ink3: #9ca3af` → `#899892`
- `--accent: #4f46e5` → `var(--elan-amber)` or `#ff9e1b`
- `--accentLight: rgba(79, 70, 229, 0.08)` → `rgba(255, 158, 27, 0.12)`
- `.rdv-btn-primary:hover` shadow: `rgba(79, 70, 229, 0.25)` → `rgba(255, 158, 27, 0.25)`

---

### PRIORITY 2: COMPONENT FILES WITH HARDCODED HEX COLORS

These files use inline hex values in className strings or style attributes that are NOT caught by elan-theme.css CSS overrides (because they're arbitrary Tailwind values or inline styles):

#### `app/sdr/page.tsx` (~70+ instances) — CRITICAL
Replace all instances of:
- `#8B8BA7` → `var(--elan-slate)` / `text-[#5c6e69]`
- `#12122A` → `var(--elan-ink)` / `text-[#15201e]`
- `#5A5A7A` → `var(--elan-slate)` / `text-[#5c6e69]`
- `#E8EBF0` → `border-[rgba(21,32,30,0.13)]`
- `#F4F6F9` → `bg-[#f4f0e8]`
- `#C5C8D4` → `text-[#b8c2bd]`
- `#7C5CFC` → For spinners/accents use `text-[#ff9e1b]` or `text-[#0c3b38]`
- `#F9FAFB` → `bg-[#f4f0e8]`

#### `app/sdr/callbacks/page.tsx` (~100+ instances) — CRITICAL
Same replacements as above plus:
- `from-slate-900 via-slate-800` header gradients → `from-[#0c3b38] via-[#114b46]`

#### `app/client/portal/activite/page.tsx` (~56 instances)
- Replace all `#7C5CFC` → `#0c3b38` (for text) or `#ff9e1b` (for backgrounds)
- Replace all `#8B8DAF` → `#7f8e89`
- Replace all `#E8EBF0` → `rgba(21,32,30,0.13)` equivalent
- Replace all `#F4F5FA` → `#f4f0e8`
- Replace all `#12122A` → `#15201e`
- Replace all `#B0B3C8` → `#b8c2bd`

#### `app/client/portal/email/page.tsx` (~71 instances)
Same pattern — replace all old hex values with Élan equivalents

#### `app/client/portal/calls/page.tsx` (~47 instances)
Same pattern

#### `app/client/portal/settings/page.tsx` (~64 instances)
- `#7C5CFC` → `#0c3b38` (for text references to petrol)
- `#E2E4EF` → `rgba(21,32,30,0.13)` (toggle off-state)
- `#E0E3F5` → `rgba(21,32,30,0.13)` (borders)

#### `app/client/portal/reporting/page.tsx` (~41 instances)
- `#6C3AFF` → `#0c3b38` or `#ff9e1b`
- All other old hex values → Élan equivalents

#### `app/client/portal/sales-playbook/page.tsx` (~24 instances)
Same pattern

#### `app/client/portal/files/page.tsx` (~21 instances)
Same pattern

#### `app/client/portal/aide/page.tsx` (~15 instances)
Same pattern

#### `app/client/portal/notifications/page.tsx` (~21 instances)
Same pattern

#### `app/client/portal/database/page.tsx` (~29 instances)
Same pattern

#### `app/client/portal/page.tsx` (~24 instances)
Same pattern

#### `app/commercial/portal/page.tsx` (~21 instances)
Same pattern

#### `app/commercial/portal/contacts/page.tsx` (~21 instances)
Same pattern

#### `app/commercial/portal/settings/page.tsx` (~34 instances)
Same pattern

#### `app/shared/report/[token]/page.tsx` (~16 instances)
- `from-[#6C3AFF] to-[#7C5CFC]` → `from-[#ff9e1b] to-[#e07c00]`
- `from-[#F8F7FF] to-[#F4F6F9]` → `from-[#f4f0e8] to-[#ece5d8]`
- `border-[#E8EBF0]` → Élan line
- `hover:border-[#7C5CFC]/15` → `hover:border-[#0c3b38]/15`

#### `app/manager/sdr-feedback/page.tsx` (~53 instances)
Replace all old hex values

#### `app/forgot-password/page.tsx` — CRITICAL
Lines 50-55: Remove the embedded `<style>` tag with old indigo CSS variables OR replace them:
- `--cp950: #1e1b4b` → `var(--elan-petrol)` / `#0c3b38`
- `--cp700: #4338ca` → `var(--elan-petrol-700)` / `#114b46`
- `--cp600: #4f46e5` → `var(--elan-amber-deep)` / `#e07c00`
- `--cp500: #6366f1` → `var(--elan-amber)` / `#ff9e1b`
- `--cp400: #818cf8` → `#ffb64f`
- `--cp200: #c7d2fe` → `#ffd698`
- `--ink: #1e1b4b` → `var(--elan-ink)` / `#15201e`

---

### PRIORITY 3: FILES WITH OLD TAILWIND UTILITY CLASSES

These files use old Tailwind color classes. The elan-theme.css DOES override many of these via CSS, but for code clarity and maintainability, they should be replaced with Élan equivalents. Focus on the heaviest files:

**Top offenders (by occurrence count):**

| File | `slate` count | `indigo` count | `violet/purple` count |
|------|--------------|----------------|----------------------|
| `app/manager/missions/[id]/page.tsx` | 263 | — | 26 |
| `app/manager/analytics/page.tsx` | 156 | — | 49 |
| `app/manager/settings/statuses/page.tsx` | 126 | 21 | 6 |
| `app/manager/utilisateurs/[id]/page.tsx` | 162 | 33 | 3 |
| `app/manager/planning/MonthCalendar.tsx` | 114 | — | — |
| `app/manager/analyse-ia/page.tsx` | 109 | — | — |
| `app/manager/team/ReglagesTab.tsx` | 93 | 31 | 1 |
| `app/manager/testclient/page.tsx` | 86 | 21 | 18 |
| `app/manager/api/page.tsx` | — | — | 2 (+ 82 gray) |
| `app/manager/playbook/import/page.tsx` | 73 | — | 10 |
| `app/manager/emails/sent/page.tsx` | 66 | 19 | 2 |
| `app/manager/lists/page.tsx` | 66 | — | 2 |
| `app/manager/projects/page.tsx` | 65 | — | 1 |
| `app/manager/projects/[id]/page.tsx` | 64 | — | — |
| `app/sdr/projects/[id]/page.tsx` | 64 | 16 | 2 |
| `app/manager/lists/[id]/page.tsx` | 59 | 5 | 2 |
| `app/manager/utilisateurs/page.tsx` | 56 | 15 | 1 |
| `app/manager/missions/_components/NewMissionDialog.tsx` | 55 | — | 5 |
| `app/sdr/projects/page.tsx` | 46 | 24 | — |
| `app/developer/tasks/page.tsx` | 43 | — | — |
| `app/developer/integrations/page.tsx` | 42 | — | — |
| `app/developer/settings/page.tsx` | 40 | — | — |
| `app/bd/dashboard/page.tsx` | 40 | — | — |
| `app/bd/clients/[id]/page.tsx` | 40 | 5 | 2 |
| `app/bd/clients/new/page.tsx` | 47 | — | — |
| `app/manager/sdrs/page.tsx` | 37 | 10 | — |
| `app/sdr/notifications/page.tsx` | 35 | 12 | — |
| `app/sdr/meetings/page.tsx` | — | 34 | — |
| `app/manager/billing/page.tsx` | — | 31 | 1 |
| `app/manager/settings/broadcast/page.tsx` | — | 29 | — |
| `app/manager/settings/page.tsx` | — | 25 | — |
| `app/manager/campaigns/[id]/page.tsx` | — | 13 | — |
| `app/sdr/action/page.tsx` | — | — | 23 |
| `app/manager/dashboard/page.tsx` | — | — | 20 |

#### Shared UI components:
- `components/ui/Badge.tsx` line 18: `primary: "bg-indigo-50 text-indigo-700 border-indigo-200"` → `"bg-[var(--elan-eucalyptus)] text-[var(--elan-petrol)] border-[rgba(12,59,56,0.22)]"`
- `components/ui/Modal.tsx` line 216: `default: "bg-indigo-600 hover:bg-indigo-700 text-white"` → `"bg-[var(--elan-amber)] hover:bg-[#f29113] text-[var(--elan-ink)]"`

---

### PRIORITY 4: LAYOUT ISSUES

1. **Dark hero gradients** in multiple pages use `from-slate-900 via-indigo-950 to-slate-900`:
   - `app/manager/missions/page.tsx` line ~247
   - `app/manager/billing/page.tsx` line ~199
   - `app/developer/dashboard/page.tsx` line ~87
   - `app/developer/projects/[id]/page.tsx` line ~129
   - `app/blocked/page.tsx` line ~8
   → Replace all with `from-[#0c3b38] via-[#114b46] to-[#0c3b38]`

2. **Channel config gradients** in missions pages:
   - CALL: `from-blue-500 to-indigo-600` → `from-[#ff9e1b] to-[#e07c00]`
   - EMAIL: `from-violet-500 to-purple-600` → `from-[#0c3b38] to-[#114b46]`
   - LINKEDIN: `from-sky-500 to-blue-600` → `from-[#114b46] to-[#0c3b38]`

3. **Inline style objects in meetings pages** (`app/client/portal/meetings/page.tsx` and `app/commercial/portal/meetings/page.tsx`):
   These use a `tk` (token) object. Verify that the token values are correct Élan colors. The `tk.accent` at line 31 of `client/portal/meetings/page.tsx` is set to `"#5B4FE8"` which is the OLD purple. Change to `"#ff9e1b"` or `"#0c3b38"` depending on context.

---

## RULES FOR MAKING CHANGES

1. **Do NOT modify `elan-theme.css`** — it's the compatibility layer and should stay as-is
2. **Do NOT change component logic, props, or behavior** — only change color/style values
3. **When replacing Tailwind classes:** Use `var()` CSS variables in arbitrary value syntax: `bg-[var(--elan-paper)]`, `text-[var(--elan-ink)]`, etc. This is cleaner than hardcoding hex values.
4. **For inline `style={{}}` objects:** Use CSS variable references: `var(--elan-ink)` or hardcode the Élan hex values
5. **For `.css` files:** Use `var()` references to Élan CSS custom properties
6. **Context matters for accent replacement:**
   - Old indigo/purple used as **button/badge background** → replace with `var(--elan-amber)` (#ff9e1b)
   - Old indigo/purple used as **text color** → replace with `var(--elan-petrol)` (#0c3b38)
   - Old indigo/purple used as **light background** → replace with `var(--elan-eucalyptus)` (#dbe4df)
   - Old indigo/purple used as **focus ring** → replace with amber ring `rgba(255, 158, 27, 0.22)`
   - Old indigo/purple used as **border** → replace with `rgba(12, 59, 56, 0.22)`
7. **Keep semantic colors (red/green/amber/yellow for status)** — only replace when they use OLD palette values. Emerald for success, red for danger, amber for warning are fine. Just make sure success green is `#25745f` not `#10b981`.
8. **Test visual consistency:** After changes, the entire app should have a warm, papery feel with amber accents and dark petrol text — NO cool blue-gray or purple tones should remain.

---

## VERIFICATION CHECKLIST

After all changes, grep the codebase for these patterns — ALL should return 0 results in `.tsx` files (excluding node_modules):

```bash
# Old hex colors (should be 0 in app/ tsx files)
grep -rn "#7C5CFC\|#6366f1\|#4F46E5\|#5B4FE8\|#6C3AFF\|#4238D0\|#818cf8\|#A78BFA\|#8b5cf6" app/ --include="*.tsx"
grep -rn "#12122A\|#2D2D35\|#8B8BA7\|#A0A3BD\|#6B7194\|#5A5A7A\|#A0A0B0\|#6B6B7B\|#B0B3C4" app/ --include="*.tsx"
grep -rn "#F4F6F9\|#F8F9FC\|#F4F5FA\|#FAFBFC\|#F0F1F5\|#FAFAFF\|#F5F6FA" app/ --include="*.tsx"
grep -rn "#E8EBF0\|#C5C8D4\|#E0E3EA\|#D8DEEA\|#EEF1F6" app/ --include="*.tsx"

# In CSS files, old accent values (should be 0 in component classes)
grep -n "#6366f1\|#4f46e5\|#5B4FE8\|#7C5CFC\|rgba(99, 102, 241\|rgba(79, 70, 229\|rgba(91, 79, 232\|rgba(124, 92, 252" app/globals.css
grep -n "#4f46e5\|rgba(79, 70, 229" app/manager/rdv/_components/rdv-shell.css
```

---

## ESTIMATED SCOPE

- **~633 old hex color instances** across ~20 TSX files
- **~3,383 old Tailwind utility class instances** across ~60+ TSX files
- **~300+ hardcoded old values** in globals.css component classes
- **~25 old values** in rdv-shell.css
- **1 embedded old theme** in forgot-password page

This is a large but mechanical migration. Process files systematically, starting with CSS files (they cascade), then the heaviest TSX files, then shared components.
