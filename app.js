const STORAGE_KEY = 'ledgerly-transactions';
const starterTransactions = [
  { id: '1', type: 'income', description: 'September salary', amount: 4200, category: 'Salary', date: '2026-09-01' },
  { id: '2', type: 'expense', description: 'Apartment rent', amount: 1450, category: 'Housing', date: '2026-09-01' },
  { id: '3', type: 'expense', description: 'Dinner with friends', amount: 68.40, category: 'Food & dining', date: '2026-09-02' },
  { id: '4', type: 'expense', description: 'Metro pass', amount: 42, category: 'Transport', date: '2026-09-03' }
];
let transactions = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') || starterTransactions;
let activeFilter = 'all';
let editingId = null;
const $ = (selector) => document.querySelector(selector);
const money = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value);
const formatDate = (value) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${value}T12:00:00`));
function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions)); }
function renderSummary() {
  const income = transactions.filter((item) => item.type === 'income').reduce((sum, item) => sum + Number(item.amount), 0);
  const expenses = transactions.filter((item) => item.type === 'expense').reduce((sum, item) => sum + Number(item.amount), 0);
  $('#balance-value').textContent = money(income - expenses);
  $('#income-value').textContent = money(income);
  $('#expense-value').textContent = money(expenses);
  $('#transaction-total-value').textContent = transactions.length;
  $('#balance-trend').textContent = transactions.length ? `${transactions.length} transaction${transactions.length === 1 ? '' : 's'} tracked` : 'Across all accounts';
  const categoryTotals = transactions.filter((item) => item.type === 'expense').reduce((totals, item) => { totals[item.category] = (totals[item.category] || 0) + Number(item.amount); return totals; }, {});
  const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];
  $('#insight-title').textContent = topCategory ? `${topCategory[0]} leads the way` : 'Your spending story';
  $('#insight-text').textContent = topCategory ? `You have spent ${money(topCategory[1])} on ${topCategory[0].toLowerCase()} so far. Small, regular check-ins keep your goals within reach.` : 'Add a few transactions and Ledgerly will surface a useful pattern here.';
}
function renderAnalytics() {
  const today = new Date('2026-09-03T12:00:00');
  const days = Array.from({ length: 7 }, (_, index) => { const date = new Date(today); date.setDate(today.getDate() - (6 - index)); return date; });
  const expensesByDay = days.map((date) => transactions.filter((item) => item.type === 'expense' && item.date === date.toISOString().slice(0, 10)).reduce((sum, item) => sum + Number(item.amount), 0));
  const weeklySpent = expensesByDay.reduce((sum, amount) => sum + amount, 0);
  $('#weekly-spent').textContent = money(weeklySpent).replace('.00', '');
  $('#weekly-count').textContent = transactions.filter((item) => item.type === 'expense' && days.some((date) => item.date === date.toISOString().slice(0, 10))).length;
  $('#weekly-average').textContent = money(weeklySpent / 7).replace('.00', '');
  const maxExpense = Math.max(500, ...expensesByDay);
  const points = expensesByDay.map((amount, index) => `${index * (700 / 6)},${170 - (amount / maxExpense) * 145}`);
  $('#chart-line').setAttribute('d', `M${points.join(' L')}`);
  $('#chart-area').setAttribute('d', `M0 170 L${points.join(' L')} L700 170 Z`);
  $('#chart-dots').innerHTML = points.map((point, index) => { const [x, y] = point.split(','); return `<circle cx="${x}" cy="${y}" r="4" data-value="${money(expensesByDay[index])}"><title>${money(expensesByDay[index])}</title></circle>`; }).join('');
  $('#chart-x-labels').innerHTML = days.map((date) => `<span>${new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date)}</span>`).join('');
  const categoryTotals = transactions.filter((item) => item.type === 'expense').reduce((totals, item) => { totals[item.category] = (totals[item.category] || 0) + Number(item.amount); return totals; }, {});
  const categories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]).slice(0, 4);
  const largest = categories[0]?.[1] || 1;
  $('#category-bars').innerHTML = categories.length ? categories.map(([category, amount], index) => `<div class="category-item"><div><span>${escapeHtml(category)}</span><strong>${money(amount)}</strong></div><div class="bar-track"><span class="bar-fill bar-${index}" style="width:${Math.max(8, (amount / largest) * 100)}%"></span></div></div>`).join('') : '<div class="mini-empty">No expense data yet</div>';
  const totalSpent = Object.values(categoryTotals).reduce((sum, amount) => sum + amount, 0);
  const pieColors = ['#8b7cf6', '#35c49a', '#ff7d78', '#f4c95d'];
  let pieOffset = 0;
  const pieSegments = categories.map(([category, amount], index) => { const percent = totalSpent ? (amount / totalSpent) * 100 : 0; const segment = `${pieColors[index]} ${pieOffset}% ${pieOffset + percent}%`; pieOffset += percent; return { category, amount, segment }; });
  $('#pie-chart').style.background = pieSegments.length ? `conic-gradient(${pieSegments.map((item) => item.segment).join(',')})` : '#273654';
  $('#pie-total').textContent = money(totalSpent).replace('.00', '');
  $('#pie-legend').innerHTML = pieSegments.slice(0, 3).map((item, index) => `<span><i style="background:${pieColors[index]}"></i>${escapeHtml(item.category)}</span>`).join('');
  const expenses = transactions.filter((item) => item.type === 'expense').reduce((sum, item) => sum + Number(item.amount), 0);
  const percent = Math.min(100, Math.round((expenses / 2000) * 100));
  $('#goal-progress').style.width = `${percent}%`;
  $('#goal-label').textContent = `${percent}% used`;
  $('#goal-status').textContent = expenses > 2000 ? 'Over budget' : 'On track';
  $('#goal-status').classList.toggle('over-budget', expenses > 2000);
}
function visibleTransactions() {
  const category = $('#category-filter').value;
  return [...transactions].sort((a, b) => b.date.localeCompare(a.date)).filter((item) => (activeFilter === 'all' || item.type === activeFilter) && (category === 'all' || item.category === category));
}
function renderTransactions() {
  const list = $('#transaction-list');
  const visible = visibleTransactions();
  $('#transaction-count').textContent = `${visible.length} entr${visible.length === 1 ? 'y' : 'ies'}`;
  if (!visible.length) { list.innerHTML = '<div class="empty-state"><strong>No transactions here yet</strong>Try another filter or add a new entry.</div>'; return; }
  list.innerHTML = visible.map((item) => `<div class="transaction-row"><div class="transaction-symbol ${item.type}">${item.type === 'income' ? '&#8593;' : '&#8595;'}</div><div class="transaction-info"><div class="transaction-name">${escapeHtml(item.description)}</div><div class="transaction-detail">${escapeHtml(item.category)} &middot; ${formatDate(item.date)}</div></div><div class="transaction-amount ${item.type}">${item.type === 'income' ? '+' : '-'}${money(item.amount)}</div><div class="row-actions"><button type="button" data-edit="${item.id}" aria-label="Edit ${escapeHtml(item.description)}">edit</button><button type="button" data-delete="${item.id}" aria-label="Delete ${escapeHtml(item.description)}">delete</button></div></div>`).join('');
}
function escapeHtml(value) { const div = document.createElement('div'); div.textContent = value; return div.innerHTML; }
function render() { renderSummary(); renderAnalytics(); renderTransactions(); }
let toastTimer;
function showToast(message) { $('#toast-text').textContent = message; $('#toast').classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').classList.remove('show'), 2600); }
function openModal(item) { editingId = item?.id || null; $('#modal-title').textContent = item ? 'Edit transaction' : 'Add a transaction'; $('#submit-transaction').textContent = item ? 'Update transaction' : 'Save transaction'; const form = $('#transaction-form'); form.reset(); form.elements.date.value = item?.date || new Date().toISOString().slice(0, 10); if (item) { form.elements.description.value = item.description; form.elements.amount.value = item.amount; form.elements.category.value = item.category; form.elements.type.value = item.type; } $('#modal').hidden = false; form.elements.description.focus(); }
function closeModal() { $('#modal').hidden = true; editingId = null; }
$('#open-add').addEventListener('click', () => openModal());
$('#close-modal').addEventListener('click', closeModal);
$('#modal').addEventListener('click', (event) => { if (event.target === $('#modal')) closeModal(); });
$('#transaction-form').addEventListener('submit', (event) => { event.preventDefault(); const form = new FormData(event.currentTarget); const entry = { id: editingId || crypto.randomUUID(), type: form.get('type'), description: form.get('description').trim(), amount: Number(form.get('amount')), category: form.get('category'), date: form.get('date') }; if (editingId) { transactions = transactions.map((item) => item.id === editingId ? entry : item); showToast('Transaction updated'); } else { transactions.push(entry); showToast('Transaction added'); } save(); render(); closeModal(); });
document.addEventListener('click', (event) => { const edit = event.target.closest('[data-edit]'); const remove = event.target.closest('[data-delete]'); if (edit) openModal(transactions.find((item) => item.id === edit.dataset.edit)); if (remove) { transactions = transactions.filter((item) => item.id !== remove.dataset.delete); save(); render(); showToast('Transaction deleted'); } });
document.querySelectorAll('.filter-btn').forEach((button) => button.addEventListener('click', () => { document.querySelectorAll('.filter-btn').forEach((item) => item.classList.remove('active')); button.classList.add('active'); activeFilter = button.dataset.filter; renderTransactions(); }));
$('#category-filter').addEventListener('change', renderTransactions);
$('#mobile-menu').addEventListener('click', () => $('.sidebar').classList.toggle('menu-open'));
document.querySelectorAll('.nav-item[data-view]').forEach((link) => link.addEventListener('click', (event) => {
  event.preventDefault();
  const view = link.dataset.view;
  document.querySelectorAll('.nav-item[data-view]').forEach((item) => item.classList.toggle('active', item === link));
  document.querySelector('.hero-row').classList.toggle('view-hidden', view !== 'overview');
  document.querySelector('.summary-grid').classList.toggle('view-hidden', view !== 'overview');
  $('#analysis').classList.toggle('view-hidden', view === 'transactions');
  $('#goal').classList.toggle('view-hidden', view === 'transactions');
  $('#transactions').closest('.content-grid').classList.toggle('transactions-focus', view === 'transactions');
  $('#transactions').classList.toggle('view-hidden', view === 'insights');
  $('#insights').classList.toggle('view-hidden', view === 'transactions');
  document.querySelector('.main-content').scrollIntoView({ behavior: 'smooth', block: 'start' });
  $('.sidebar').classList.remove('menu-open');
}));
$('#weekly-review').addEventListener('click', () => {
  document.querySelector('a[data-view="insights"]').click();
  renderAnalytics();
  showToast('Weekly review refreshed');
});
render();
