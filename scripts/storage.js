/* ============================================================
   storage.js
   Handles ALL localStorage reading and writing.
   Nothing else in the app touches localStorage directly —
   everything goes through these functions.

   Keys used in localStorage:
     - "ft:transactions"  — the array of transaction records
     - "ft:settings"      — budget cap, base currency, rates
   ============================================================ */


/* -- Storage key constants --
   Using a prefix "ft:" avoids clashing with other apps
   that might also use localStorage on the same origin. */
const KEYS = {
  TRANSACTIONS: 'ft:transactions',
  SETTINGS:     'ft:settings',
};


/* ============================================================
   TRANSACTIONS
   ============================================================ */

/**
 * loadTransactions
 * Reads the transactions array from localStorage.
 * Returns an empty array if nothing is saved yet.
 *
 * @returns {Array} — array of transaction objects
 */
export function loadTransactions() {
  try {
    /* localStorage only stores strings, so we JSON.parse it back */
    const raw = localStorage.getItem(KEYS.TRANSACTIONS);

    /* If nothing stored yet, return empty array — not null */
    if (raw === null) return [];

    const parsed = JSON.parse(raw);

    /* Safety check — make sure it's actually an array */
    if (!Array.isArray(parsed)) return [];

    return parsed;

  } catch (error) {
    /* JSON.parse can throw if the stored data is corrupted.
       Log the error and return empty array so the app doesn't crash. */
    console.error('[storage] Failed to load transactions:', error);
    return [];
  }
}


/**
 * saveTransactions
 * Writes the full transactions array to localStorage.
 * Called every time a record is added, edited, or deleted.
 *
 * @param {Array} transactions — the full array to save
 * @returns {boolean} — true if saved successfully, false if it failed
 */
export function saveTransactions(transactions) {
  try {
    /* Safety check — only save if it's actually an array */
    if (!Array.isArray(transactions)) {
      console.error('[storage] saveTransactions expects an array');
      return false;
    }

    localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(transactions));
    return true;

  } catch (error) {
    /* localStorage can throw if storage quota is exceeded */
    console.error('[storage] Failed to save transactions:', error);
    return false;
  }
}


/**
 * clearTransactions
 * Removes all transaction data from localStorage.
 * Used by the "Clear all data" button in Settings.
 */
export function clearTransactions() {
  try {
    localStorage.removeItem(KEYS.TRANSACTIONS);
  } catch (error) {
    console.error('[storage] Failed to clear transactions:', error);
  }
}


/* ============================================================
   SETTINGS
   ============================================================ */

/**
 * Default settings object.
 * Used when no settings have been saved yet.
 */
const DEFAULT_SETTINGS = {
  budgetCap:    0,       /* monthly spending limit — 0 means no cap set */
  baseCurrency: 'USD',   /* the currency records are entered in */
  rates: {
    /* How many units of each currency = 1 unit of base currency.
       Example: if base is USD, rate for KES might be 129.50 */
    currency2: { code: 'KES', rate: 129.50 },
    currency3: { code: 'EUR', rate: 0.92   },
  },
};


/**
 * loadSettings
 * Reads settings from localStorage.
 * Merges with defaults so missing keys don't cause errors.
 *
 * @returns {Object} — settings object
 */
export function loadSettings() {
  try {
    const raw = localStorage.getItem(KEYS.SETTINGS);

    if (raw === null) return { ...DEFAULT_SETTINGS };

    const parsed = JSON.parse(raw);

    /* Merge with defaults in case new settings keys were added
       after the user already had data saved */
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      /* Deep merge the rates object too */
      rates: {
        ...DEFAULT_SETTINGS.rates,
        ...(parsed.rates || {}),
      },
    };

  } catch (error) {
    console.error('[storage] Failed to load settings:', error);
    return { ...DEFAULT_SETTINGS };
  }
}


/**
 * saveSettings
 * Writes the settings object to localStorage.
 *
 * @param {Object} settings — the settings object to save
 * @returns {boolean} — true if saved successfully
 */
export function saveSettings(settings) {
  try {
    if (typeof settings !== 'object' || settings === null) {
      console.error('[storage] saveSettings expects an object');
      return false;
    }

    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
    return true;

  } catch (error) {
    console.error('[storage] Failed to save settings:', error);
    return false;
  }
}


/* ============================================================
   IMPORT VALIDATION
   Used by the import feature in Settings.
   Checks that uploaded JSON matches the expected structure
   before we allow it to overwrite existing data.
   ============================================================ */

/**
 * validateImportData
 * Checks that a parsed JSON value is a valid transactions array.
 * Returns an object with { valid: boolean, errors: string[] }.
 *
 * @param {*} data — the parsed value from the uploaded JSON file
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateImportData(data) {
  const errors = [];

  /* Must be an array */
  if (!Array.isArray(data)) {
    errors.push('File must contain a JSON array at the top level.');
    return { valid: false, errors };
  }

  /* Must have at least one record */
  if (data.length === 0) {
    errors.push('The array is empty — nothing to import.');
    return { valid: false, errors };
  }

  /* Check each record has the required fields */
  const REQUIRED_FIELDS = ['id', 'description', 'amount', 'category', 'date', 'createdAt', 'updatedAt'];

  data.forEach((record, index) => {
    /* Each item must be an object */
    if (typeof record !== 'object' || record === null || Array.isArray(record)) {
      errors.push(`Record at index ${index} is not an object.`);
      return;
    }

    /* Check all required fields exist */
    REQUIRED_FIELDS.forEach((field) => {
      if (!(field in record)) {
        errors.push(`Record at index ${index} is missing field: "${field}".`);
      }
    });

    /* Amount must be a number */
    if ('amount' in record && typeof record.amount !== 'number') {
      errors.push(`Record at index ${index}: "amount" must be a number, got "${typeof record.amount}".`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}