/* ============================================================
   state.js
   Holds the app's data in memory while the page is open.
   All other modules import from here — nobody talks to
   localStorage directly except storage.js.

   The flow is always:
     1. User does something (add, edit, delete)
     2. A function here updates the in-memory array
     3. That function calls saveTransactions() to persist it
     4. ui.js re-renders from the updated state

   Exporting plain variables won't work for sharing mutable
   state across modules, so we use getter functions instead.
   ============================================================ */

import {
  loadTransactions,
  saveTransactions,
  loadSettings,
  saveSettings,
  clearTransactions,
} from './storage.js';


/* ============================================================
   PRIVATE STATE
   These variables are only accessible through the functions
   below — nothing imports them directly.
   ============================================================ */

/* The full array of transaction records */
let _transactions = [];

/* App settings: budget cap, currency, rates */
let _settings = {};

/* Counter used to generate unique IDs — set on init */
let _idCounter = 0;


/* ============================================================
   INITIALISATION
   Call this once when the page loads.
   ============================================================ */

/**
 * initState
 * Loads data from localStorage into memory.
 * Must be called before any other state function.
 */
export function initState() {
  /* Load transactions from localStorage */
  _transactions = loadTransactions();

  /* Load settings from localStorage */
  _settings = loadSettings();

  /* Seed data for first-time visitors */
  if (_transactions.length === 0) {
    var seedData = [
      { "id": "txn_0001", "description": "Lunch at cafeteria", "amount": 12.50, "category": "Food", "date": "2025-09-25", "createdAt": "2025-09-25T08:30:00.000Z", "updatedAt": "2025-09-25T08:30:00.000Z" },
      { "id": "txn_0002", "description": "Chemistry textbook", "amount": 89.99, "category": "Books", "date": "2025-09-23", "createdAt": "2025-09-23T09:15:00.000Z", "updatedAt": "2025-09-23T09:15:00.000Z" },
      { "id": "txn_0003", "description": "Monthly bus pass", "amount": 45.00, "category": "Transport", "date": "2025-09-01", "createdAt": "2025-09-01T07:00:00.000Z", "updatedAt": "2025-09-01T07:00:00.000Z" },
      { "id": "txn_0004", "description": "Coffee with friends", "amount": 8.75, "category": "Entertainment", "date": "2025-09-28", "createdAt": "2025-09-28T14:00:00.000Z", "updatedAt": "2025-09-28T14:00:00.000Z" },
      { "id": "txn_0005", "description": "Semester tuition fees", "amount": 1500.00, "category": "Fees", "date": "2025-09-02", "createdAt": "2025-09-02T10:00:00.000Z", "updatedAt": "2025-09-02T10:00:00.000Z" },
      { "id": "txn_0006", "description": "Groceries for the week", "amount": 34.20, "category": "Food", "date": "2025-09-27", "createdAt": "2025-09-27T16:45:00.000Z", "updatedAt": "2025-09-27T16:45:00.000Z" },
      { "id": "txn_0007", "description": "Notebook and pens", "amount": 6.50, "category": "Books", "date": "2025-09-10", "createdAt": "2025-09-10T11:20:00.000Z", "updatedAt": "2025-09-10T11:20:00.000Z" },
      { "id": "txn_0008", "description": "Matatu fare to town", "amount": 0.75, "category": "Transport", "date": "2025-09-29", "createdAt": "2025-09-29T07:30:00.000Z", "updatedAt": "2025-09-29T07:30:00.000Z" },
      { "id": "txn_0009", "description": "Movie night ticket", "amount": 15.00, "category": "Entertainment", "date": "2025-09-26", "createdAt": "2025-09-26T19:00:00.000Z", "updatedAt": "2025-09-26T19:00:00.000Z" },
      { "id": "txn_0010", "description": "Library late fee", "amount": 2.00, "category": "Fees", "date": "2025-09-18", "createdAt": "2025-09-18T13:00:00.000Z", "updatedAt": "2025-09-18T13:00:00.000Z" },
      { "id": "txn_0011", "description": "Printing assignment pages", "amount": 3.50, "category": "Other", "date": "2025-09-24", "createdAt": "2025-09-24T12:10:00.000Z", "updatedAt": "2025-09-24T12:10:00.000Z" },
      { "id": "txn_0012", "description": "Tea and mandazi", "amount": 1.25, "category": "Food", "date": "2025-09-29", "createdAt": "2025-09-29T06:45:00.000Z", "updatedAt": "2025-09-29T06:45:00.000Z" }
    ];
    _transactions = seedData;
    _idCounter = 12;
    saveTransactions(_transactions);
  }

  /* Set the ID counter to one above the highest existing ID
     so new records never clash with imported ones.
     IDs look like "txn_0001" — we parse the number out. */
  _idCounter = _transactions.reduce((max, record) => {
    /* Extract the numeric part after "txn_" */
    const num = parseInt(record.id.replace('txn_', ''), 10);
    return isNaN(num) ? max : Math.max(max, num);
  }, 0);
}


/* ============================================================
   ID GENERATION
   ============================================================ */

/**
 * generateId
 * Creates a unique transaction ID like "txn_0042".
 * Increments the counter each time so IDs never repeat.
 *
 * @returns {string}
 */
function generateId() {
  _idCounter += 1;
  /* Pad to 4 digits: 1 → "0001", 42 → "0042" */
  return `txn_${String(_idCounter).padStart(4, '0')}`;
}


/* ============================================================
   TRANSACTION GETTERS
   ============================================================ */

/**
 * getTransactions
 * Returns a shallow copy of the transactions array.
 * We return a copy so callers can't accidentally mutate
 * the private array directly.
 *
 * @returns {Array}
 */
export function getTransactions() {
  return [..._transactions];
}


/**
 * getTransactionById
 * Finds and returns a single transaction by its id.
 * Returns undefined if not found.
 *
 * @param {string} id
 * @returns {Object|undefined}
 */
export function getTransactionById(id) {
  return _transactions.find((t) => t.id === id);
}


/* ============================================================
   TRANSACTION MUTATIONS
   Each function updates the in-memory array AND persists it.
   ============================================================ */

/**
 * addTransaction
 * Creates a new transaction record and adds it to state.
 * Generates the id, createdAt, and updatedAt automatically.
 *
 * @param {{ description: string, amount: number, category: string, date: string }} fields
 * @returns {Object} — the newly created record
 */
export function addTransaction(fields) {
  const now = new Date().toISOString();

  const newRecord = {
    id:          generateId(),
    description: fields.description,
    amount:      parseFloat(fields.amount),   /* ensure it's a number */
    category:    fields.category,
    date:        fields.date,
    createdAt:   now,
    updatedAt:   now,
  };

  /* Add to the front so newest records appear first by default */
  _transactions = [newRecord, ..._transactions];

  /* Persist immediately */
  saveTransactions(_transactions);

  return newRecord;
}


/**
 * updateTransaction
 * Edits an existing transaction by id.
 * Only updates the fields passed in — id and createdAt never change.
 *
 * @param {string} id — the id of the record to update
 * @param {{ description?: string, amount?: number, category?: string, date?: string }} fields
 * @returns {Object|null} — the updated record, or null if not found
 */
export function updateTransaction(id, fields) {
  let updatedRecord = null;

  _transactions = _transactions.map((record) => {
    if (record.id !== id) return record;  /* leave other records unchanged */

    updatedRecord = {
      ...record,                          /* keep all existing fields */
      ...fields,                          /* overwrite with new values */
      amount:    parseFloat(fields.amount ?? record.amount),
      id:        record.id,               /* id never changes */
      createdAt: record.createdAt,        /* createdAt never changes */
      updatedAt: new Date().toISOString(), /* always refresh updatedAt */
    };

    return updatedRecord;
  });

  /* Only save if we actually found and updated the record */
  if (updatedRecord) {
    saveTransactions(_transactions);
  }

  return updatedRecord;
}


/**
 * deleteTransaction
 * Removes a transaction from state by id.
 *
 * @param {string} id
 * @returns {boolean} — true if a record was removed, false if not found
 */
export function deleteTransaction(id) {
  const before = _transactions.length;

  _transactions = _transactions.filter((record) => record.id !== id);

  const removed = _transactions.length < before;

  /* Only save if something actually changed */
  if (removed) {
    saveTransactions(_transactions);
  }

  return removed;
}


/**
 * clearAllTransactions
 * Wipes all transactions from memory and localStorage.
 * Used by the "Clear all data" danger button in Settings.
 */
export function clearAllTransactions() {
  _transactions = [];
  _idCounter = 0;
  clearTransactions();
}


/**
 * importTransactions
 * Replaces all transactions with an imported array.
 * Assumes the data has already been validated by validateImportData().
 *
 * @param {Array} data — validated array from uploaded JSON file
 */
export function importTransactions(data) {
  _transactions = data;

  /* Reset the counter to one above the highest imported id */
  _idCounter = data.reduce((max, record) => {
    const num = parseInt(record.id.replace('txn_', ''), 10);
    return isNaN(num) ? max : Math.max(max, num);
  }, 0);

  saveTransactions(_transactions);
}


/* ============================================================
   SETTINGS GETTERS AND SETTERS
   ============================================================ */

/**
 * getSettings
 * Returns a copy of the current settings object.
 *
 * @returns {Object}
 */
export function getSettings() {
  return { ..._settings };
}


/**
 * updateSettings
 * Merges new values into settings and persists.
 *
 * @param {Object} newValues — partial settings object to merge
 */
export function updateSettings(newValues) {
  _settings = {
    ..._settings,
    ...newValues,
    /* Deep merge rates if provided */
    rates: {
      ...(_settings.rates || {}),
      ...(newValues.rates || {}),
    },
  };

  saveSettings(_settings);
}


/* ============================================================
   COMPUTED STATS
   These derive values from the transactions array.
   ui.js calls these to populate the dashboard.
   ============================================================ */

/**
 * getTotalAmount
 * Sums all transaction amounts.
 *
 * @returns {number}
 */
export function getTotalAmount() {
  return _transactions.reduce((sum, t) => sum + t.amount, 0);
}


/**
 * getTopCategory
 * Finds the category with the highest total spend.
 *
 * @returns {string} — category name, or "None" if no transactions
 */
export function getTopCategory() {
  if (_transactions.length === 0) return 'None';

  /* Build an object like { Food: 46.70, Books: 89.99, ... } */
  const totals = _transactions.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + t.amount;
    return acc;
  }, {});

  /* Find the category with the highest total */
  return Object.entries(totals).sort((a, b) => b[1] - a[1])[0][0];
}


/**
 * getLast7DaysTotals
 * Returns daily spending totals for the last 7 days.
 * Used to draw the trend chart on the dashboard.
 *
 * @returns {Array<{ label: string, amount: number }>}
 *   Array of 7 items, oldest first, each with a short day label.
 */
export function getLast7DaysTotals() {
  const days = [];

  /* Build a lookup: "2025-09-29" → total amount for that day */
  const dailyTotals = _transactions.reduce((acc, t) => {
    acc[t.date] = (acc[t.date] || 0) + t.amount;
    return acc;
  }, {});

  /* Generate the last 7 days starting from today */
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);

    /* Format as YYYY-MM-DD to match our date strings */
    const key = date.toISOString().split('T')[0];

    /* Short day label like "Mon", "Tue" */
    const label = date.toLocaleDateString('en-US', { weekday: 'short' });

    days.push({
      label,
      amount: dailyTotals[key] || 0,  /* 0 if no spending that day */
    });
  }

  return days;
}


/**
 * getBudgetStatus
 * Compares total spending against the budget cap.
 * Returns info needed for the ARIA live region alert.
 *
 * @returns {{ cap: number, total: number, remaining: number, isOver: boolean }}
 */
export function getBudgetStatus() {
  const cap   = _settings.budgetCap || 0;
  const total = getTotalAmount();

  return {
    cap,
    total,
    remaining: cap - total,
    isOver:    cap > 0 && total > cap,  /* only "over" if a cap is actually set */
  };
}