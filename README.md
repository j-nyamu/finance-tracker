# Student Finance Tracker

A lightweight, offline-first expense tracker built for students.
Log transactions, set a monthly budget cap, search with regex, and export your data — no account or internet connection required.

**Live demo:** https://j-nyamu.github.io/alu-web-development/
**Repository:** https://github.com/j-nyamu/alu-web-development
**Demo video:** https://youtu.be/chk49g-_TUU

---

## Chosen theme

Student Finance Tracker

---

## How to run locally

1. Clone the repository:
   ```
   git clone https://github.com/j-nyamu/alu-web-development.git
   ```
2. Open the project folder in VS Code.
3. Install the **Live Server** extension if you have not already.
4. Right-click `index.html` and choose **Open with Live Server**.
5. The app opens at `http://127.0.0.1:5500`.

> The scripts use ES modules (`type="module"`), so the app must be served over HTTP — double-clicking `index.html` directly in your file explorer will not work.

---

## How to run tests

1. Open `tests.html` directly in your browser — double-click it from your file explorer.
2. No server needed. The test suite is fully self-contained with no imports.
3. The page runs all regex validator assertions automatically and shows pass/fail results.

---

## Demo video

Watch the 2–3 minute walkthrough here: https://youtu.be/chk49g-_TUU

It covers keyboard navigation, form validation including the back-reference regex rule, live regex search with an intentionally invalid pattern, the budget alert, JSON import/export, and the app at mobile, tablet, and desktop widths.

---

## Features

- Add, edit, and delete transactions with full form validation
- Categorise transactions: Food, Books, Transport, Entertainment, Fees, Other
- Base currency setting (USD, KES, RWF, EUR, GBP) applied across the dashboard and table
- Live regex search across description, category, amount, and date
- Sort records by date, description (A–Z), and amount
- Filter records by category
- Dashboard with total spent, top category, budget remaining, and 7-day trend chart
- Monthly budget cap with ARIA live region alert (polite under cap, assertive when exceeded)
- All data saved to localStorage — persists across sessions
- JSON export (downloads a dated file)
- JSON import with schema validation before overwriting existing data, with a quick link to Settings from the Add Transaction page
- Clear all data option in Settings
- Fully keyboard-navigable
- Responsive at 360px, 768px, and 1024px breakpoints
- Accessible: semantic HTML, ARIA landmarks, visible focus styles, skip link
- Neon cyan header treatment over a black background, distinct from the light body of the app

---

## Regex catalog

| Rule | Pattern | Purpose | Valid example | Invalid example |
|---|---|---|---|---|
| Description | `/^\S(?:.*\S)?$/` | No leading or trailing spaces | `Lunch at cafe` | ` Lunch` |
| Amount | `/^(0\|[1-9]\d*)(\.\d{1,2})?$/` | Valid money, max 2 decimals | `12.50` | `12.555` |
| Date | `/^\d{4}-(0[1-9]\|1[0-2])-(0[1-9]\|[12]\d\|3[01])$/` | Strict YYYY-MM-DD | `2025-09-29` | `29-09-2025` |
| Category | `/^[A-Za-z]+(?:[ -][A-Za-z]+)*$/` | Letters, spaces, hyphens only | `Bus Fare` | `Food!` |
| **Advanced** | `/\b(\w+)\s+\1\b/i` | Back-reference: catches duplicate consecutive words | — | `lunch lunch` |

### Example search patterns for the search bar

| Pattern | What it finds |
|---|---|
| `food` | All descriptions or categories containing "food" (case-insensitive by default) |
| `(coffee\|tea)` | Descriptions mentioning coffee or tea |
| `\.\d{2}\b` | Amounts that have cents (e.g. 12.50, 0.75) |
| `\b(\w+)\s+\1\b` | Descriptions with duplicate consecutive words |
| `2026-06` | All transactions from June 2026 |
| `^Bus` | Descriptions that start with "Bus" |

---

## Keyboard map

| Key / action | What it does |
|---|---|
| `Tab` | Move forward through all interactive elements |
| `Shift + Tab` | Move backward |
| `Enter` | Activate focused button or link |
| `Space` | Toggle checkboxes (e.g. case-insensitive toggle) |
| `Escape` | Close the delete confirmation dialog |
| Skip link (first Tab on page) | Jump directly to main content |
| Nav links | Click or press Enter to switch sections |
| Sort select | Arrow keys to change sort order |
| Category filter | Arrow keys to filter by category |

---

## Accessibility notes

- Skip-to-content link is the first focusable element on the page
- All form inputs have a `<label>` bound by `for`/`id`
- All inputs use `aria-describedby` pointing to both hint text and error spans
- Errors are announced via `aria-live="assertive"` on the error spans
- Budget alert uses `aria-live="polite"` under cap and `aria-live="assertive"` when exceeded
- Search result count is announced via `aria-live="polite"`
- Import status is announced via `aria-live="assertive"`
- Delete dialog uses `role="dialog"` and `aria-modal="true"`, focus moves to the confirm button on open, closes on `Escape`
- Semantic landmarks: `<header role="banner">`, `<nav>`, `<main role="main">`, `<footer role="contentinfo">`
- All sections use `aria-labelledby` pointing to their heading
- Visible focus ring on all interactive elements via `:focus-visible`
- `prefers-reduced-motion` media query disables all animations for users who need it
- Color contrast tested against WCAG AA, including the dark neon header against its black background

---

## File structure

```
finance-tracker/
├── index.html             Main app (all sections in one file)
├── tests.html              Regex validator test suite, self-contained
├── seed.json               12 sample transactions for first-time use
├── demo-import.json        12 transactions dated for demo/import walkthroughs
├── README.md                This file
├── .gitignore
├── styles/
│   └── main.css            Mobile-first styles, 3 breakpoints, neon header
└── scripts/
    ├── storage.js          localStorage read/write
    ├── state.js            In-memory data and computed stats
    ├── validators.js       All regex validation rules
    ├── search.js           Safe regex compiler, highlight, sort
    └── ui.js               DOM rendering and event handling
```

---

## Data model

Each transaction record:

```json
{
  "id": "txn_0001",
  "description": "Lunch at cafeteria",
  "amount": 12.50,
  "category": "Food",
  "date": "2025-09-29",
  "createdAt": "2025-09-29T10:23:00.000Z",
  "updatedAt": "2025-09-29T10:23:00.000Z"
}
```

Settings object:

```json
{
  "budgetCap": 500,
  "baseCurrency": "USD"
}
```

---

## Academic integrity

This project was built individually. All UI logic, regex patterns, and JavaScript are original work.
AI tools were used only for documentation and seed data generation, not for code.

---

*Built by [j-nyamu](https://github.com/j-nyamu) — African Leadership University, Web Development*