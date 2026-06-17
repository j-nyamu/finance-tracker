/* ============================================================
   search.js
   Powers the live regex search on the Records page.

   Two main jobs:
     1. Safely compile a user-typed regex string into a RegExp
        object — catching invalid patterns without crashing.
     2. Wrap matched text in <mark> tags so the browser
        highlights them, without breaking accessibility.

   These are the exact patterns from the assignment spec:
     - Plain keyword search: "food", "bus", "coffee"
     - Regex with cents:     \.\d{2}\b
     - Beverage keyword:     (coffee|tea)
     - Duplicate word:       \b(\w+)\s+\1\b  (back-reference)
   ============================================================ */


/* ============================================================
   SAFE REGEX COMPILER
   ============================================================ */

/**
 * compileRegex
 * Tries to turn a user-typed string into a RegExp.
 * Returns null if the string is empty or invalid regex.
 * NEVER throws — all errors are caught internally.
 *
 * Why this matters: if a user types "coffee[" (unclosed bracket),
 * new RegExp("coffee[") throws a SyntaxError and crashes the app.
 * This function catches that and returns null instead.
 *
 * @param {string} input — the raw search string from the input field
 * @param {string} flags — regex flags, default "i" for case-insensitive
 * @returns {RegExp|null}
 */
export function compileRegex(input, flags = 'i') {
  /* Empty or whitespace-only input means no active search */
  if (!input || input.trim() === '') return null;

  try {
    return new RegExp(input, flags);
  } catch (error) {
    /* Invalid regex — return null so the caller knows to show an error */
    return null;
  }
}


/* ============================================================
   MATCH HIGHLIGHTER
   ============================================================ */

/**
 * highlight
 * Replaces all regex matches in a text string with
 * <mark>matched text</mark> for visual highlighting.
 *
 * Accessibility note: <mark> has implicit role="mark" which
 * some screen readers announce. The text content is preserved
 * so the meaning is never lost if CSS is disabled.
 *
 * IMPORTANT: this returns an HTML string, not plain text.
 * Only inject it via innerHTML on elements that display
 * user-visible text (description, category cells).
 * Never use it on anything that runs as code.
 *
 * @param {string} text — the plain text to search within
 * @param {RegExp|null} regex — compiled regex from compileRegex()
 * @returns {string} — HTML string with <mark> tags around matches
 */
export function highlight(text, regex) {
  /* If no active regex, return the original text unchanged */
  if (!regex) return escapeHtml(text);

  /* We need to escape the non-matched parts so HTML special
     characters like < > & don't break the table cell.
     We split on matches, escape each piece, then wrap matches. */

  /* Use replace with a function to process each match */
  let result = '';
  let lastIndex = 0;

  /* Reset regex lastIndex in case it has the global flag */
  regex.lastIndex = 0;

  /* Build a global version of the regex so we find ALL matches */
  const globalRegex = new RegExp(
    regex.source,
    /* Add 'g' flag if not already present, keep other flags */
    regex.flags.includes('g') ? regex.flags : regex.flags + 'g'
  );

  let match;

  /* Loop through every match in the text */
  while ((match = globalRegex.exec(text)) !== null) {
    /* Append the unmatched text before this match (escaped) */
    result += escapeHtml(text.slice(lastIndex, match.index));

    /* Wrap the matched text in <mark> */
    result += `<mark>${escapeHtml(match[0])}</mark>`;

    /* Move our position forward */
    lastIndex = globalRegex.lastIndex;

    /* Safety: if the regex matched an empty string, advance
       by one to avoid an infinite loop */
    if (match[0].length === 0) {
      lastIndex++;
      globalRegex.lastIndex = lastIndex;
    }
  }

  /* Append any remaining text after the last match */
  result += escapeHtml(text.slice(lastIndex));

  return result;
}


/* ============================================================
   SEARCH FILTER
   ============================================================ */

/**
 * filterTransactions
 * Filters an array of transaction records against a compiled regex.
 * Searches across description, category, amount, and date fields.
 *
 * @param {Array} transactions — the full transactions array from state
 * @param {RegExp|null} regex  — compiled regex from compileRegex()
 * @returns {Array} — subset of transactions that match
 */
export function filterTransactions(transactions, regex) {
  /* No active regex means show all records */
  if (!regex) return transactions;

  return transactions.filter((record) => {
    /* Test each searchable field — return true if ANY field matches */
    return (
      regex.test(record.description)          ||
      regex.test(record.category)             ||
      regex.test(String(record.amount))       ||  /* convert number to string first */
      regex.test(record.date)
    );
  });
}


/* ============================================================
   SORT HELPER
   ============================================================ */

/**
 * sortTransactions
 * Sorts a transactions array by the given sort key.
 * Returns a NEW array — does not mutate the original.
 *
 * Sort options match the <select> values in index.html:
 *   "date-desc"   — newest first  (default)
 *   "date-asc"    — oldest first
 *   "desc-asc"    — description A to Z
 *   "desc-desc"   — description Z to A
 *   "amount-asc"  — lowest amount first
 *   "amount-desc" — highest amount first
 *
 * @param {Array}  transactions — array to sort
 * @param {string} sortKey      — one of the values above
 * @returns {Array} — sorted copy
 */
export function sortTransactions(transactions, sortKey) {
  /* Spread into a new array so we don't mutate state */
  const copy = [...transactions];

  switch (sortKey) {
    case 'date-asc':
      /* Oldest first — string comparison works for YYYY-MM-DD */
      return copy.sort((a, b) => a.date.localeCompare(b.date));

    case 'date-desc':
      /* Newest first */
      return copy.sort((a, b) => b.date.localeCompare(a.date));

    case 'desc-asc':
      /* A to Z — case-insensitive */
      return copy.sort((a, b) =>
        a.description.toLowerCase().localeCompare(b.description.toLowerCase())
      );

    case 'desc-desc':
      /* Z to A */
      return copy.sort((a, b) =>
        b.description.toLowerCase().localeCompare(a.description.toLowerCase())
      );

    case 'amount-asc':
      /* Lowest first */
      return copy.sort((a, b) => a.amount - b.amount);

    case 'amount-desc':
      /* Highest first */
      return copy.sort((a, b) => b.amount - a.amount);

    default:
      /* Unknown sort key — return unsorted copy */
      return copy;
  }
}


/* ============================================================
   INTERNAL UTILITY
   ============================================================ */

/**
 * escapeHtml
 * Converts HTML special characters to their entity equivalents.
 * Prevents user-entered text like "<script>" from being
 * interpreted as HTML when injected into the DOM.
 *
 * @param {string} text
 * @returns {string}
 */
function escapeHtml(text) {
  return String(text)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#039;');
}