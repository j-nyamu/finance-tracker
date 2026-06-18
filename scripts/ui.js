/* ============================================================
   ui.js
   The main controller for the Finance Tracker.
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
   ============================================================ */

let editingId = null;
let pendingDeleteId = null;
let activeRegex = null;


/* ============================================================
   INITIALISATION
   ============================================================ */

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

function showSection(sectionName) {
  allSections.forEach((section) => {
    section.hidden = true;
  });

  const target = document.getElementById('section-' + sectionName);
  if (!target) {
    console.warn('[ui] showSection: no section found for "' + sectionName + '"');
    return;
  }
  target.hidden = false;
  const heading = target.querySelector('h1, h2');
  if (heading) {
    heading.setAttribute('tabindex', '-1');
    heading.focus();
  }

  navLinks.forEach((link) => {
    const isActive = link.dataset.section === sectionName;
    link.classList.toggle('is-active', isActive);
    link.setAttribute('aria-current', isActive ? 'page' : 'false');
  });

  primaryNav.classList.remove('is-open');
  navToggleBtn.setAttribute('aria-expanded', 'false');
}

function attachNavListeners() {
  navLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const section = link.dataset.section;
      if (section === 'dashboard') renderDashboard();
      if (section === 'records')   renderTable();
      showSection(section);
    });
  });

  navToggleBtn.addEventListener('click', () => {
    const isOpen = primaryNav.classList.toggle('is-open');
    navToggleBtn.setAttribute('aria-expanded', String(isOpen));
  });

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

function renderDashboard() {
  const transactions = getTransactions();
  const settings     = getSettings();
  const total        = getTotalAmount();
  const budgetStatus = getBudgetStatus();

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

  renderBudgetAlert(budgetStatus, settings);
  renderTrendChart();
}

function renderBudgetAlert(budgetStatus, settings) {
  if (!settings.budgetCap || settings.budgetCap <= 0) {
    budgetAlertEl.textContent = '';
    budgetAlertEl.className   = 'budget-alert';
    return;
  }

  if (budgetStatus.isOver) {
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

function renderTable() {
  let transactions = getTransactions();

  const selectedCategory = filterCategoryEl.value;
  if (selectedCategory && selectedCategory !== 'all') {
    transactions = transactions.filter(function(t) {
      return t.category === selectedCategory;
    });
  }

  transactions = filterTransactions(transactions, activeRegex);
  transactions = sortTransactions(transactions, sortByEl.value);

  recordsCountEl.textContent =
    'Showing ' + transactions.length + ' transaction' + (transactions.length !== 1 ? 's' : '');

  if (transactions.length === 0) {
    recordsTbody.innerHTML = '';
    emptyStateEl.hidden    = false;
    return;
  }

  emptyStateEl.hidden = true;
  recordsTbody.innerHTML = transactions.map(buildTableRow).join('');
}

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

function handleDeleteClick(id) {
  pendingDeleteId = id;
  confirmDialog.hidden = false;
  btnConfirmDelete.focus();
}

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

function showSettingsStatus(message) {
  settingsStatusEl.textContent = message;
  settingsStatusEl.className   = 'form-status is-success';
  setTimeout(function() {
    settingsStatusEl.textContent = '';
    settingsStatusEl.className   = 'form-status';
  }, 3000);
}


/* ============================================================
   IMPORT / EXPORT
   ============================================================ */

function attachImportExportListeners() {
  btnExport.addEventListener('click', handleExport);
  importFileEl.addEventListener('change', handleImport);
}

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

function formatCurrency(amount, currencyCode) {
  currencyCode = currencyCode || 'USD';
  const symbols = { USD: '$', KES: 'KES ', RWF: 'RWF ', EUR: '€', GBP: '£' };
  const symbol  = symbols[currencyCode] || (currencyCode + ' ');
  return symbol + amount.toFixed(2);
}

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
   ============================================================ */
document.addEventListener('DOMContentLoaded', init);