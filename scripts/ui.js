/* ============================================================
   ui.js
   The main controller for the Finance Tracker.
   This file:
     - Initialises the app on page load
     - Handles all navigation between sections
     - Renders the records table
     - Handles the add/edit form
     - Renders the stats dashboard and chart
     - Wires up search, sort, and filter
     - Handles import/export and settings
     - Manages the delete confirmation dialog
   ============================================================ */

import {
  initState,
  getTransactions,
  getTransactionById,
  addTransaction,
  updateTransaction,
  deleteTransaction,
  clearAllTransactions,
  importTransactions,
  getSettings,
  updateSettings,
  getTotalAmount,
  getTopCategory,
  getLast7DaysTotals,
  getBudgetStatus,
} from './state.js';

import {
  validateForm,
  applyValidationUI,
  validateDescription,
  validateAmount,
  validateDate,
  validateCategory,
} from './validators.js';

import {
  compileRegex,
  highlight,
  filterTransactions,
  sortTransactions,
} from './search.js';

import { validateImportData } from './storage.js';


/* ============================================================
   DOM ELEMENT REFERENCES
   Grabbed once here so we do not query the DOM repeatedly.
   ============================================================ */

/* Navigation */
const navLinks     = document.querySelectorAll('.nav-link');
const navToggleBtn = document.querySelector('.nav-toggle');
const primaryNav   = document.getElementById('primary-nav');

/* Sections */
const allSections = document.querySelectorAll('.app-section');

/* Dashboard */
const statTotalCount      = document.getElementById('stat-total-count');
const statTotalAmount     = document.getElementById('stat-total-amount');
const statTopCategory     = document.getElementById('stat-top-category');
const statBudgetRemaining = document.getElementById('stat-budget-remaining');
const budgetAlertEl       = document.getElementById('budget-alert');
const trendChartEl        = document.getElementById('trend-chart');
const convertAmountEl     = document.getElementById('convert-amount');
const convertFromEl       = document.getElementById('convert-from');
const convertToEl         = document.getElementById('convert-to');
const convertResultEl     = document.getElementById('convert-result');

/* Records toolbar */
const searchInputEl    = document.getElementById('search-input');
const searchErrorEl    = document.getElementById('search-error');
const toggleCaseEl     = document.getElementById('toggle-case');
const sortByEl         = document.getElementById('sort-by');
const filterCategoryEl = document.getElementById('filter-category');
const recordsCountEl   = document.getElementById('records-count');
const recordsTbody     = document.getElementById('records-tbody');
const emptyStateEl     = document.getElementById('empty-state');

/* Form */
const formHeading          = document.getElementById('form-heading');
const formStatusEl         = document.getElementById('form-status');
const transactionForm      = document.getElementById('transaction-form');
const fieldId              = document.getElementById('field-id');
const fieldDescription     = document.getElementById('field-description');
const fieldAmount          = document.getElementById('field-amount');
const fieldCategory        = document.getElementById('field-category');
const fieldDate            = document.getElementById('field-date');
const descError            = document.getElementById('desc-error');
const amountError          = document.getElementById('amount-error');
const categoryError        = document.getElementById('category-error');
const dateError            = document.getElementById('date-error');
const btnSubmit            = document.getElementById('btn-submit');
const btnCancel            = document.getElementById('btn-cancel');

/* Settings */
const settingBudgetCap    = document.getElementById('setting-budget-cap');
const btnSaveBudget       = document.getElementById('btn-save-budget');
const settingBaseCurrency = document.getElementById('setting-base-currency');
const settingRate1Code    = document.getElementById('setting-rate-1-code');
const settingRate1Value   = document.getElementById('setting-rate-1-value');
const settingRate2Code    = document.getElementById('setting-rate-2-code');
const settingRate2Value   = document.getElementById('setting-rate-2-value');
const btnSaveRates        = document.getElementById('btn-save-rates');
const settingsStatusEl    = document.getElementById('settings-status');
const btnExport           = document.getElementById('btn-export');
const importFileEl        = document.getElementById('import-file');
const importStatusEl      = document.getElementById('import-status');
const btnClearData        = document.getElementById('btn-clear-data');

/* Delete dialog */
const confirmDialog    = document.getElementById('confirm-dialog');
const btnConfirmDelete = document.getElementById('btn-confirm-delete');
const btnCancelDelete  = document.getElementById('btn-cancel-delete');


/* ============================================================
   APP STATE - UI layer
   These track what the user is currently doing in the UI.
   ============================================================ */

/* The id of the record currently being edited, or null */
let editingId = null;

/* The id of the record pending deletion (set when dialog opens) */
let pendingDeleteId = null;

/* Current search regex - null means no active search */
let activeRegex = null;


/* ============================================================
   INITIALISATION
   ============================================================ */

/**
 * init
 * Entry point - called once when the DOM is ready.
 * Loads data, renders everything, attaches event listeners.
 */
function init() {
  /* Hide all sections immediately so none flash visible before init completes */
  allSections.forEach(function(section) { section.hidden = true; });

  /* Load data from localStorage into memory */
  initState();

  /* Render the initial UI */
  renderDashboard();
  renderTable();
  populateCategoryFilter();
    loadSettingsIntoForm();

  /* Attach all event listeners */
  attachNavListeners();
  attachFormListeners();
  attachTableListeners();
  attachSearchListeners();
  attachSettingsListeners();
  attachDialogListeners();
  attachImportExportListeners();
  
  /* Show the about section by default */
  showSection('about');
}


/* ============================================================
   NAVIGATION
   ============================================================ */

/**
 * showSection
 * Hides all sections and shows only the requested one.
 * Updates the active nav link highlight.
 *
 * @param {string} sectionName - e.g. "about", "dashboard", "records"
 */
function showSection(sectionName) {
  /* Hide all sections */
  allSections.forEach((section) => {
    section.hidden = true;
  });

  /* Show the target section */
  const target = document.getElementById('section-' + sectionName);
  if (!target) {
    console.warn('[ui] showSection: no section found for "' + sectionName + '"');
    return;
  }
  target.hidden = false;
  /* Move focus to the section heading for keyboard users */
  const heading = target.querySelector('h1, h2');
  if (heading) {
    heading.setAttribute('tabindex', '-1');
    heading.focus();
  }

  /* Update active state on nav links */
  navLinks.forEach((link) => {
    const isActive = link.dataset.section === sectionName;
    link.classList.toggle('is-active', isActive);
    link.setAttribute('aria-current', isActive ? 'page' : 'false');
  });

  /* Close mobile nav after navigating */
  primaryNav.classList.remove('is-open');
  navToggleBtn.setAttribute('aria-expanded', 'false');
}

/**
 * attachNavListeners
 * Handles clicks on nav links and the hamburger toggle.
 */
function attachNavListeners() {
  navLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const section = link.dataset.section;

      /* Refresh data before showing these sections */
      if (section === 'dashboard') renderDashboard();
      if (section === 'records')   renderTable();

      showSection(section);
    });
  });

  /* Hamburger toggle */
  navToggleBtn.addEventListener('click', () => {
    const isOpen = primaryNav.classList.toggle('is-open');
    navToggleBtn.setAttribute('aria-expanded', String(isOpen));
  });

  /* Close nav if user clicks outside of it */
  document.addEventListener('click', (e) => {
    if (
      primaryNav.classList.contains('is-open') &&
      !primaryNav.contains(e.target) &&
      !navToggleBtn.contains(e.target)
    ) {
      primaryNav.classList.remove('is-open');
      navToggleBtn.setAttribute('aria-expanded', 'false');
    }
  });

  /* data-goto buttons — e.g. "Add a Transaction" on the About page */
  document.addEventListener('click', function(e) {
    var gotoBtn = e.target.closest('[data-goto]');
    if (!gotoBtn) return;
    e.preventDefault();
    var dest = gotoBtn.dataset.goto;
    if (dest === 'dashboard') renderDashboard();
    if (dest === 'records')   renderTable();
    showSection(dest);
  });
}


/* ============================================================
   DASHBOARD
   ============================================================ */

/**
 * renderDashboard
 * Updates all stat cards, the trend chart, and the budget alert.
 */
function renderDashboard() {
  const transactions = getTransactions();
  const settings     = getSettings();
  const total        = getTotalAmount();
  const budgetStatus = getBudgetStatus();

  /* Stat cards */
  statTotalCount.textContent  = transactions.length;
  statTotalAmount.textContent = formatCurrency(total, settings.baseCurrency);
  statTopCategory.textContent = getTopCategory();

  if (settings.budgetCap > 0) {
    const remaining = budgetStatus.remaining;
    statBudgetRemaining.textContent = formatCurrency(Math.abs(remaining), settings.baseCurrency);
    statBudgetRemaining.style.color = budgetStatus.isOver
      ? 'var(--color-danger)'
      : 'var(--color-success)';
  } else {
    statBudgetRemaining.textContent = 'No cap set';
    statBudgetRemaining.style.color = '';
  }

  /* Budget ARIA live alert */
  renderBudgetAlert(budgetStatus, settings);

  /* 7-day trend chart */
  renderTrendChart();

  /* Currency selects */
  }

/**
 * renderBudgetAlert
 * Updates the ARIA live region with budget status.
 * Uses "polite" when under budget, "assertive" when over.
 */
function renderBudgetAlert(budgetStatus, settings) {
  if (!settings.budgetCap || settings.budgetCap <= 0) {
    budgetAlertEl.textContent = '';
    budgetAlertEl.className   = 'budget-alert';
    return;
  }

  if (budgetStatus.isOver) {
    /* Assertive so screen readers interrupt immediately */
    budgetAlertEl.setAttribute('aria-live', 'assertive');
    budgetAlertEl.className   = 'budget-alert is-over';
    budgetAlertEl.textContent =
      'Over budget by ' + formatCurrency(Math.abs(budgetStatus.remaining), settings.baseCurrency) +
      '. You have spent ' + formatCurrency(budgetStatus.total, settings.baseCurrency) +
      ' of your ' + formatCurrency(budgetStatus.cap, settings.baseCurrency) + ' cap.';
  } else {
    budgetAlertEl.setAttribute('aria-live', 'polite');
    budgetAlertEl.className   = 'budget-alert is-under';
    budgetAlertEl.textContent =
      'You have ' + formatCurrency(budgetStatus.remaining, settings.baseCurrency) +
      ' remaining of your ' + formatCurrency(budgetStatus.cap, settings.baseCurrency) + ' budget.';
  }
}

/**
 * renderTrendChart
 * Builds the 7-day bar chart from daily totals.
 */
function renderTrendChart() {
  const days   = getLast7DaysTotals();
  const maxAmt = Math.max.apply(null, days.map(function(d) { return d.amount; }).concat([1]));

  trendChartEl.innerHTML = '';

  days.forEach(function(day) {
    const heightPercent = (day.amount / maxAmt) * 100;

    const wrapper = document.createElement('div');
    wrapper.className = 'chart-bar-wrapper';

    const bar = document.createElement('div');
    bar.className = 'chart-bar';
    bar.style.height = heightPercent + '%';
    bar.setAttribute('title', formatCurrency(day.amount, getSettings().baseCurrency));
    bar.setAttribute('aria-label', day.label + ': ' + formatCurrency(day.amount, getSettings().baseCurrency));

    const label = document.createElement('span');
    label.className   = 'chart-label';
    label.textContent = day.label;

    wrapper.appendChild(bar);
    wrapper.appendChild(label);
    trendChartEl.appendChild(wrapper);
  });
}


/* ============================================================
   RECORDS TABLE
   ============================================================ */

/**
 * renderTable
 * Filters, sorts, and renders all matching transactions.
 */
function renderTable() {
  let transactions = getTransactions();

  /* 1. Category filter */
  const selectedCategory = filterCategoryEl.value;
  if (selectedCategory && selectedCategory !== 'all') {
    transactions = transactions.filter(function(t) {
      return t.category === selectedCategory;
    });
  }

  /* 2. Regex search */
  transactions = filterTransactions(transactions, activeRegex);

  /* 3. Sort */
  transactions = sortTransactions(transactions, sortByEl.value);

  /* 4. Result count - announced by aria-live */
  recordsCountEl.textContent =
    'Showing ' + transactions.length + ' transaction' + (transactions.length !== 1 ? 's' : '');

  /* 5. Empty state */
  if (transactions.length === 0) {
    recordsTbody.innerHTML = '';
    emptyStateEl.hidden    = false;
    return;
  }

  emptyStateEl.hidden = true;

  /* 6. Build rows */
  recordsTbody.innerHTML = transactions.map(buildTableRow).join('');
}

/**
 * buildTableRow
 * Returns the HTML string for one table row.
 *
 * @param {Object} record
 * @returns {string}
 */
function buildTableRow(record) {
  const settings          = getSettings();
  const highlightedDesc   = highlight(record.description, activeRegex);
  const highlightedCat    = highlight(record.category, activeRegex);
  const badgeClass        = 'badge badge-' + record.category.toLowerCase().replace(/\s+/g, '-');

  return '<tr data-id="' + record.id + '" class="row-new">' +
    '<td>' + escapeForAttr(record.date) + '</td>' +
    '<td>' + highlightedDesc + '</td>' +
    '<td><span class="' + badgeClass + '">' + highlightedCat + '</span></td>' +
    '<td class="amount-cell">' + formatCurrency(record.amount, settings.baseCurrency) + '</td>' +
    '<td class="row-actions">' +
      '<button class="btn-icon" data-action="edit" data-id="' + record.id + '" ' +
        'aria-label="Edit transaction: ' + escapeForAttr(record.description) + '">Edit</button>' +
      '<button class="btn-icon btn-icon-danger" data-action="delete" data-id="' + record.id + '" ' +
        'aria-label="Delete transaction: ' + escapeForAttr(record.description) + '">Delete</button>' +
    '</td>' +
  '</tr>';
}

/**
 * attachTableListeners
 * Event delegation - one listener for all edit/delete clicks.
 */
function attachTableListeners() {
  recordsTbody.addEventListener('click', function(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    const action = btn.dataset.action;
    const id     = btn.dataset.id;

    if (action === 'edit')   handleEditClick(id);
    if (action === 'delete') handleDeleteClick(id);
  });
}

/**
 * populateCategoryFilter
 * Adds category options to the filter dropdown.
 */
function populateCategoryFilter() {
  const categories = ['Food', 'Books', 'Transport', 'Entertainment', 'Fees', 'Other'];

  filterCategoryEl.innerHTML = '<option value="all">All categories</option>';

  categories.forEach(function(cat) {
    const option       = document.createElement('option');
    option.value       = cat;
    option.textContent = cat;
    filterCategoryEl.appendChild(option);
  });
}


/* ============================================================
   SEARCH, SORT, FILTER LISTENERS
   ============================================================ */

/**
 * attachSearchListeners
 * Wires up search, case toggle, sort, and category filter.
 */
function attachSearchListeners() {
  searchInputEl.addEventListener('input', function() {
    const flags = toggleCaseEl.checked ? 'i' : '';
    const regex = compileRegex(searchInputEl.value, flags);

    if (searchInputEl.value && regex === null) {
      searchErrorEl.textContent = 'Invalid regex pattern. Check your syntax.';
      return;
    }

    searchErrorEl.textContent = '';
    activeRegex = regex;
    renderTable();
  });

  toggleCaseEl.addEventListener('change', function() {
    searchInputEl.dispatchEvent(new Event('input'));
  });

  sortByEl.addEventListener('change', function() { renderTable(); });
  filterCategoryEl.addEventListener('change', function() { renderTable(); });
}


/* ============================================================
   ADD / EDIT FORM
   ============================================================ */

/**
 * attachFormListeners
 * Real-time validation and form submit.
 */
function attachFormListeners() {
  fieldDescription.addEventListener('input', function() {
    applyValidationUI(fieldDescription, descError, validateDescription(fieldDescription.value));
  });

  fieldAmount.addEventListener('input', function() {
    applyValidationUI(fieldAmount, amountError, validateAmount(fieldAmount.value));
  });

  fieldDate.addEventListener('change', function() {
    applyValidationUI(fieldDate, dateError, validateDate(fieldDate.value));
  });

  fieldCategory.addEventListener('change', function() {
    applyValidationUI(fieldCategory, categoryError, validateCategory(fieldCategory.value));
  });

  transactionForm.addEventListener('submit', handleFormSubmit);

  btnCancel.addEventListener('click', function() {
    resetForm();
    showSection('records');
  });
}

/**
 * handleFormSubmit
 * Validates all fields then adds or updates a record.
 *
 * @param {Event} e
 */
function handleFormSubmit(e) {
  e.preventDefault();

  const fields = {
    description: fieldDescription.value,
    amount:      fieldAmount.value,
    category:    fieldCategory.value,
    date:        fieldDate.value,
  };

  const results = validateForm(fields);

  applyValidationUI(fieldDescription, descError,    results.description);
  applyValidationUI(fieldAmount,      amountError,   results.amount);
  applyValidationUI(fieldCategory,    categoryError, results.category);
  applyValidationUI(fieldDate,        dateError,     results.date);

  if (!results.allValid) {
    if (!results.description.valid) fieldDescription.focus();
    else if (!results.amount.valid)  fieldAmount.focus();
    else if (!results.category.valid) fieldCategory.focus();
    else if (!results.date.valid)    fieldDate.focus();
    return;
  }

  const parsedFields = {
    description: fields.description,
    amount:      parseFloat(fields.amount),
    category:    fields.category,
    date:        fields.date,
  };

  if (editingId) {
    updateTransaction(editingId, parsedFields);
    showFormStatus('Transaction updated successfully.', 'success');
  } else {
    addTransaction(parsedFields);
    showFormStatus('Transaction saved successfully.', 'success');
  }

  resetForm();
  renderDashboard();
  renderTable();
  showSection('records');
}

/**
 * handleEditClick
 * Populates the form with an existing record for editing.
 *
 * @param {string} id
 */
function handleEditClick(id) {
  const record = getTransactionById(id);
  if (!record) return;

  editingId = id;

  fieldId.value          = record.id;
  fieldDescription.value = record.description;
  fieldAmount.value      = String(record.amount);
  fieldCategory.value    = record.category;
  fieldDate.value        = record.date;

  formHeading.textContent = 'Edit Transaction';
  btnSubmit.textContent   = 'Update Transaction';

  showSection('add');
  fieldDescription.focus();
}

/**
 * resetForm
 * Clears the form back to its default empty state.
 */
function resetForm() {
  editingId = null;
  transactionForm.reset();
  fieldId.value = '';

  formHeading.textContent = 'Add Transaction';
  btnSubmit.textContent   = 'Save Transaction';

  [fieldDescription, fieldAmount, fieldCategory, fieldDate].forEach(function(el) {
    el.classList.remove('is-valid', 'is-invalid');
  });

  [descError, amountError, categoryError, dateError].forEach(function(el) {
    el.textContent = '';
  });
}

/**
 * showFormStatus
 * Shows a success or error message below the form.
 *
 * @param {string} message
 * @param {string} type - 'success' or 'error'
 */
function showFormStatus(message, type) {
  formStatusEl.textContent = message;
  formStatusEl.className   = 'form-status is-' + type;

  setTimeout(function() {
    formStatusEl.textContent = '';
    formStatusEl.className   = 'form-status';
  }, 4000);
}


/* ============================================================
   DELETE DIALOG
   ============================================================ */

/**
 * handleDeleteClick
 * Opens the confirm dialog before deleting.
 *
 * @param {string} id
 */
function handleDeleteClick(id) {
  pendingDeleteId = id;
  confirmDialog.hidden = false;
  btnConfirmDelete.focus();
}

/**
 * attachDialogListeners
 * Wires confirm and cancel on the delete dialog.
 */
function attachDialogListeners() {
  btnConfirmDelete.addEventListener('click', function() {
    if (pendingDeleteId) {
      deleteTransaction(pendingDeleteId);
      pendingDeleteId      = null;
      confirmDialog.hidden = true;
      renderTable();
      renderDashboard();
    }
  });

  btnCancelDelete.addEventListener('click', function() {
    pendingDeleteId      = null;
    confirmDialog.hidden = true;
  });

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && !confirmDialog.hidden) {
      pendingDeleteId      = null;
      confirmDialog.hidden = true;
    }
  });

  confirmDialog.addEventListener('click', function(e) {
    if (e.target === confirmDialog) {
      pendingDeleteId      = null;
      confirmDialog.hidden = true;
    }
  });
}


/* ============================================================
   SETTINGS
   ============================================================ */

/**
 * loadSettingsIntoForm
 * Pre-fills settings form fields from saved settings.
 */
function loadSettingsIntoForm() {
  const settings = getSettings();

  settingBudgetCap.value    = settings.budgetCap || '';
  settingBaseCurrency.value = settings.baseCurrency || 'USD';

  if (settings.rates) {
    settingRate1Code.value  = settings.rates.currency2 ? settings.rates.currency2.code  : 'KES';
    settingRate1Value.value = settings.rates.currency2 ? settings.rates.currency2.rate  : '';
    settingRate2Code.value  = settings.rates.currency3 ? settings.rates.currency3.code  : 'EUR';
    settingRate2Value.value = settings.rates.currency3 ? settings.rates.currency3.rate  : '';
  }

  }

/**
 * attachSettingsListeners
 * Budget cap, currency rates, and clear data.
 */
function attachSettingsListeners() {
  btnSaveBudget.addEventListener('click', function() {
    const cap = parseFloat(settingBudgetCap.value) || 0;
    updateSettings({ budgetCap: cap });
    showSettingsStatus('Budget cap saved.');
    renderDashboard();
  });

  btnSaveRates.addEventListener('click', function() {
    updateSettings({
      baseCurrency: settingBaseCurrency.value,
      rates: {
        currency2: {
          code: settingRate1Code.value,
          rate: parseFloat(settingRate1Value.value) || 0,
        },
        currency3: {
          code: settingRate2Code.value,
          rate: parseFloat(settingRate2Value.value) || 0,
        },
      },
    });
            showSettingsStatus('Currency settings saved.');
  });

  settingBaseCurrency.addEventListener('change', updateCurrencySymbol);

  btnClearData.addEventListener('click', function() {
    const confirmed = window.confirm(
      'This will permanently delete all your transactions. Are you sure?'
    );
    if (confirmed) {
      clearAllTransactions();
      renderTable();
      renderDashboard();
      showSettingsStatus('All data cleared.');
    }
  });
}

/**
 * showSettingsStatus
 * Shows a confirmation message in settings.
 *
 * @param {string} message
 */
function showSettingsStatus(message) {
  settingsStatusEl.textContent = message;
  settingsStatusEl.className   = 'form-status is-success';
  setTimeout(function() {
    settingsStatusEl.textContent = '';
    settingsStatusEl.className   = 'form-status';
  }, 3000);
}

/**
 * handleExport
 * Serialises transactions to JSON and triggers a file download.
 */
function handleExport() {
  const transactions = getTransactions();

  if (transactions.length === 0) {
    importStatusEl.textContent = 'Nothing to export - no transactions saved.';
    return;
  }

  const json  = JSON.stringify(transactions, null, 2);
  const blob  = new Blob([json], { type: 'application/json' });
  const url   = URL.createObjectURL(blob);
  const link  = document.createElement('a');

  link.href     = url;
  link.download = 'finance-tracker-export-' + new Date().toISOString().split('T')[0] + '.json';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * handleImport
 * Reads an uploaded JSON file, validates, then replaces data.
 *
 * @param {Event} e
 */
function handleImport(e) {
  const file = e.target.files[0];
  if (!file) return;

  if (!file.name.endsWith('.json')) {
    importStatusEl.textContent = 'Please choose a .json file.';
    importStatusEl.className   = 'form-status is-error';
    return;
  }

  const reader = new FileReader();

  reader.onload = function(event) {
    try {
      const parsed         = JSON.parse(event.target.result);
      const validation     = validateImportData(parsed);

      if (!validation.valid) {
        importStatusEl.textContent =
          'Import failed: ' + validation.errors[0] +
          (validation.errors.length > 1 ? ' (and ' + (validation.errors.length - 1) + ' more errors)' : '');
        importStatusEl.className = 'form-status is-error';
        return;
      }

      importTransactions(parsed);
      renderTable();
      renderDashboard();

      importStatusEl.textContent =
        'Imported ' + parsed.length + ' transaction' + (parsed.length !== 1 ? 's' : '') + ' successfully.';
      importStatusEl.className = 'form-status is-success';

    } catch (parseError) {
      importStatusEl.textContent = 'Import failed: file is not valid JSON.';
      importStatusEl.className   = 'form-status is-error';
    }

    importFileEl.value = '';
  };

  reader.readAsText(file);
}


/* ============================================================
   UTILITY FUNCTIONS
   ============================================================ */

/**
 * formatCurrency
 * Formats a number as a currency string.
 * e.g. formatCurrency(12.5, "USD") returns "$12.50"
 *
 * @param {number} amount
 * @param {string} currencyCode
 * @returns {string}
 */
function formatCurrency(amount, currencyCode) {
  currencyCode = currencyCode || 'USD';
  const symbols = { USD: '$', KES: 'KES ', RWF: 'RWF ', EUR: '€', GBP: '£' };
  const symbol  = symbols[currencyCode] || (currencyCode + ' ');
  return symbol + amount.toFixed(2);
}

/**
 * escapeForAttr
 * Escapes a string for safe use inside an HTML attribute.
 *
 * @param {string} text
 * @returns {string}
 */
function escapeForAttr(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}


/* ============================================================
   START THE APP
   DOMContentLoaded ensures HTML is fully parsed before we
   grab elements and attach listeners.
   ============================================================ */
document.addEventListener('DOMContentLoaded', init);