const defaultTasks = [
  { id: '1', title: 'Finalize Q3 goals', category: 'Work', priority: 'High', dueDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10), completed: false, important: true, description: 'Review roadmap and share updates with the team.', createdAt: new Date().toISOString(), completedAt: null },
  { id: '2', title: 'Prepare presentation deck', category: 'Project', priority: 'Medium', dueDate: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10), completed: false, important: false, description: 'Outline slides and final content blocks.', createdAt: new Date().toISOString(), completedAt: null },
  { id: '3', title: 'Gym session', category: 'Health', priority: 'Low', dueDate: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10), completed: true, important: false, description: '30 minute cardio and stretching.', createdAt: new Date().toISOString(), completedAt: new Date().toISOString(), },
  { id: '4', title: 'Read the product brief', category: 'Study', priority: 'High', dueDate: new Date(Date.now() - 86400000).toISOString().slice(0, 10), completed: false, important: true, description: 'Capture insights and research notes.', createdAt: new Date().toISOString(), completedAt: null }
];

let tasks = [];
let currentFilter = 'all';
let currentCategory = 'All';
let weeklyChart = null;
let donutChart = null;
let calendarDate = new Date();

const taskList = document.getElementById('task-list');
const emptyState = document.getElementById('empty-state');
const addTaskForm = document.getElementById('add-task-form');
const searchInput = document.getElementById('search-input');
const categoryFilter = document.getElementById('category-filter');
const filterBtns = document.querySelectorAll('.filter-btn');
const currentDateEl = document.getElementById('current-date');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const loginScreen = document.getElementById('login-screen');
const appLayout = document.querySelector('.app-layout');
const logoutBtn = document.getElementById('logout-btn');
const tasksPageList = document.getElementById('tasks-page-list');
const importantList = document.getElementById('important-list');
const analyticsMetrics = document.getElementById('analytics-metrics');
const calendarGrid = document.getElementById('calendar-grid');
const calendarEvents = document.getElementById('calendar-events');

const totalTasksEl = document.getElementById('total-tasks');
const completedTasksEl = document.getElementById('completed-tasks');
const completionRateEl = document.getElementById('completion-rate');
const pendingTasksEl = document.getElementById('pending-tasks');
const overdueTasksEl = document.getElementById('overdue-tasks');
const overdueFooterEl = document.getElementById('overdue-footer');
const highPriorityTasksEl = document.getElementById('high-priority-tasks');
const productivityScoreEl = document.getElementById('productivity-score');
const scoreProgress = document.getElementById('score-progress');
const scoreMessageEl = document.getElementById('score-message');
const streakDaysEl = document.getElementById('streak-days');
const streakDaysBadgeEl = document.getElementById('streak-days-badge');
const streakMessageEl = document.getElementById('streak-message');
const upcomingList = document.getElementById('upcoming-list');
const upcomingEmpty = document.getElementById('upcoming-empty');

const editModal = document.getElementById('edit-modal');
const editTaskForm = document.getElementById('edit-task-form');
const closeModalBtn = document.getElementById('close-modal');
const cancelEditBtn = document.getElementById('cancel-edit');
const themeToggleBtn = document.getElementById('theme-toggle');
const settingsThemeToggleBtn = document.getElementById('settings-theme-toggle');
const moonIcon = document.getElementById('moon-icon');
const sunIcon = document.getElementById('sun-icon');
const titleEl = document.getElementById('page-title');
const subtitleEl = document.getElementById('page-subtitle');

const navButtons = document.querySelectorAll('.nav-item');
const viewPanes = document.querySelectorAll('.view-pane');

function normalizeTask(task) {
  return {
    id: String(task.id),
    title: task.title || 'Untitled task',
    category: task.category || 'Other',
    priority: task.priority || 'Medium',
    dueDate: task.dueDate || '',
    completed: Boolean(task.completed),
    important: Boolean(task.important),
    description: task.description || '',
    createdAt: task.createdAt || new Date().toISOString(),
    completedAt: task.completedAt || null,
    date: task.date || task.dueDate || ''
  };
}

function parseDateOnly(dateStr) {
  const [year, month, day] = String(dateStr).split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatDateOnly(dateStr, options) {
  return parseDateOnly(dateStr).toLocaleDateString(undefined, options);
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isOverdue(dateStr, completed) {
  if (!dateStr || completed) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const taskDate = parseDateOnly(dateStr);
  taskDate.setHours(0, 0, 0, 0);
  return taskDate < today;
}

function setCurrentDate() {
  const options = { weekday: 'long', month: 'long', day: 'numeric' };
  currentDateEl.textContent = new Date().toLocaleDateString(undefined, options);
}

function restrictDateInputs() {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  
  const taskDateInput = document.getElementById('task-date');
  const editTaskDateInput = document.getElementById('edit-task-date');
  
  if (taskDateInput) {
    taskDateInput.min = todayStr;
  }
  
  if (editTaskDateInput) {
    editTaskDateInput.min = todayStr;
  }
}

function loadThemePreference() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  if (savedTheme === 'dark') {
    document.body.setAttribute('data-theme', 'dark');
    moonIcon.classList.add('hidden');
    sunIcon.classList.remove('hidden');
  }
}

function toggleTheme() {
  const isDark = document.body.getAttribute('data-theme') === 'dark';
  if (isDark) {
    document.body.removeAttribute('data-theme');
    localStorage.setItem('theme', 'light');
    moonIcon.classList.remove('hidden');
    sunIcon.classList.add('hidden');
  } else {
    document.body.setAttribute('data-theme', 'dark');
    localStorage.setItem('theme', 'dark');
    moonIcon.classList.add('hidden');
    sunIcon.classList.remove('hidden');
  }
  if (typeof updateChartsTheme === 'function') updateChartsTheme();
}

async function fetchTasks() {
  const storedTasks = localStorage.getItem('tasks');
  const fallbackTasks = storedTasks ? JSON.parse(storedTasks) : defaultTasks;

  try {
    const response = await fetch('/api/tasks');
    if (!response.ok) throw new Error('Could not load tasks from backend');
    const data = await response.json();
    tasks = data.map(normalizeTask);
    localStorage.setItem('tasks', JSON.stringify(tasks));
    return tasks;
  } catch (error) {
    console.warn('Using saved local data because backend is unavailable:', error.message);
    tasks = (fallbackTasks || defaultTasks).map(normalizeTask);
    localStorage.setItem('tasks', JSON.stringify(tasks));
    return tasks;
  }
}

function saveDataAndRefresh() {
  localStorage.setItem('tasks', JSON.stringify(tasks));
  renderTasks();
  updateStats();
  renderUpcomingTasks();
  renderTasksPage();
  renderImportantTasks();
  renderAnalytics();
  renderCalendar();
  updateCharts();
}

async function handleAddTask(event) {
  event.preventDefault();
  const title = document.getElementById('task-title').value.trim();
  const category = document.getElementById('task-category').value;
  const priority = document.getElementById('task-priority').value;
  const dueDate = document.getElementById('task-date').value;

  if (!title) return;

  const payload = {
    title,
    category,
    priority,
    dueDate,
    completed: false,
    important: false,
    description: ''
  };

  try {
    const response = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error('Unable to create task');
    const created = await response.json();
    tasks.unshift(normalizeTask(created));
    addTaskForm.reset();
    document.getElementById('task-category').value = 'Work';
    document.getElementById('task-priority').value = 'Medium';
    saveDataAndRefresh();
  } catch (error) {
    const newTask = normalizeTask({
      id: `local-${Date.now()}`,
      title,
      category,
      priority,
      dueDate,
      completed: false,
      important: false,
      description: '',
      createdAt: new Date().toISOString(),
      completedAt: null
    });
    tasks.unshift(newTask);
    saveDataAndRefresh();
  }
}

async function toggleTaskStatus(id) {
  const current = tasks.find((task) => task.id === id);
  if (!current) return;

  const nextCompleted = !current.completed;
  try {
    const response = await fetch(`/api/tasks/${id}/toggle`, { method: 'PATCH' });
    if (!response.ok) throw new Error('Toggle failed');
    const updated = await response.json();
    tasks = tasks.map((task) => (task.id === id ? normalizeTask(updated) : task));
  } catch (error) {
    tasks = tasks.map((task) => task.id === id ? { ...task, completed: nextCompleted, completedAt: nextCompleted ? new Date().toISOString() : null } : task);
  }
  saveDataAndRefresh();
}

async function deleteTask(id) {
  try {
    const response = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Delete failed');
  } catch (error) {
    console.warn('Delete fallback used');
  }
  tasks = tasks.filter((task) => task.id !== id);
  saveDataAndRefresh();
}

function openEditModal(id) {
  const task = tasks.find((item) => item.id === id);
  if (!task) return;
  document.getElementById('edit-task-id').value = task.id;
  document.getElementById('edit-task-title').value = task.title;
  document.getElementById('edit-task-category').value = task.category || 'Work';
  document.getElementById('edit-task-priority').value = task.priority || 'Medium';
  document.getElementById('edit-task-date').value = task.dueDate || task.date || '';
  editModal.classList.remove('hidden');
}

function closeEditModal() {
  editModal.classList.add('hidden');
  editTaskForm.reset();
}

async function handleEditTask(event) {
  event.preventDefault();
  const id = document.getElementById('edit-task-id').value;
  const title = document.getElementById('edit-task-title').value.trim();
  const category = document.getElementById('edit-task-category').value;
  const priority = document.getElementById('edit-task-priority').value;
  const dueDate = document.getElementById('edit-task-date').value;

  if (!title) return;

  const payload = { title, category, priority, dueDate, completed: false };
  try {
    const response = await fetch(`/api/tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error('Edit failed');
    const updated = await response.json();
    tasks = tasks.map((task) => (task.id === id ? normalizeTask(updated) : task));
  } catch (error) {
    tasks = tasks.map((task) => task.id === id ? { ...task, title, category, priority, dueDate: dueDate || '', date: dueDate || '' } : task);
  }
  closeEditModal();
  saveDataAndRefresh();
}

function updateStats() {
  const total = tasks.length;
  const completed = tasks.filter((task) => task.completed).length;
  const pending = total - completed;
  const overdue = tasks.filter((task) => isOverdue(task.dueDate || task.date, task.completed)).length;
  const highPriority = tasks.filter((task) => task.priority === 'High' && !task.completed).length;

  totalTasksEl.textContent = total;
  completedTasksEl.textContent = completed;
  pendingTasksEl.textContent = pending;
  overdueTasksEl.textContent = overdue;
  highPriorityTasksEl.textContent = highPriority;

  const rate = total === 0 ? 0 : Math.round((completed / total) * 100);
  completionRateEl.textContent = `${rate}% completion rate`;

  if (overdue > 0) {
    overdueFooterEl.textContent = `${overdue} needs attention`;
    overdueFooterEl.classList.add('danger-text');
  } else {
    overdueFooterEl.textContent = 'On track';
    overdueFooterEl.classList.remove('danger-text');
  }

  let score = rate;
  if (total > 0) {
    score = Math.max(0, Math.min(100, score - overdue * 5));
  }
  productivityScoreEl.textContent = score;

  let progressColor = 'var(--warning)';
  if (score >= 80) {
    progressColor = 'var(--success)';
    scoreMessageEl.textContent = 'Excellent work!';
  } else if (score >= 50) {
    progressColor = 'var(--primary)';
    scoreMessageEl.textContent = 'Keep it up!';
  } else {
    progressColor = 'var(--warning)';
    scoreMessageEl.textContent = 'Room for improvement';
  }

  scoreProgress.style.background = `conic-gradient(${progressColor} ${score}%, var(--surface-hover) 0)`;
  calculateStreak();
}

function calculateStreak() {
  const completedTasks = tasks.filter((task) => task.completed && task.completedAt);
  if (completedTasks.length === 0) {
    streakDaysEl.textContent = '0';
    streakDaysBadgeEl.textContent = '0';
    streakMessageEl.textContent = 'Complete a task to start a streak!';
    return;
  }

  const uniqueDays = new Set(completedTasks.map((task) => {
    const d = new Date(task.completedAt);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }));

  const sortedDays = Array.from(uniqueDays).sort((a, b) => b - a);
  let streak = 0;
  let currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);
  let expectedTime = currentDate.getTime();

  if (sortedDays.length > 0 && sortedDays[0] !== expectedTime) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    if (sortedDays[0] !== yesterday.getTime()) {
      streakDaysEl.textContent = '0';
      streakDaysBadgeEl.textContent = '0';
      streakMessageEl.textContent = 'Start a new streak today!';
      return;
    }
    expectedTime = yesterday.getTime();
  }

  for (const day of sortedDays) {
    if (day === expectedTime) {
      streak += 1;
      const nextDay = new Date(expectedTime);
      nextDay.setDate(nextDay.getDate() - 1);
      expectedTime = nextDay.getTime();
    } else {
      break;
    }
  }

  streakDaysEl.textContent = streak;
  streakDaysBadgeEl.textContent = streak;
  streakMessageEl.textContent = streak > 3 ? 'You\'re on fire! 🔥' : streak > 0 ? 'Great start, keep going!' : 'Complete a task to start a streak!';
}

function renderTasks() {
  const query = searchInput ? searchInput.value.toLowerCase() : '';
  const filteredTasks = tasks.filter((task) => {
    const matchesSearch = task.title.toLowerCase().includes(query);
    const matchesCategory = currentCategory === 'All' || task.category === currentCategory;
    let matchesStatus = true;
    if (currentFilter === 'pending') matchesStatus = !task.completed;
    else if (currentFilter === 'completed') matchesStatus = task.completed;
    else if (currentFilter === 'overdue') matchesStatus = isOverdue(task.dueDate || task.date, task.completed);
    else if (currentFilter === 'high') matchesStatus = task.priority === 'High' && !task.completed;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  taskList.innerHTML = '';
  if (filteredTasks.length === 0) {
    emptyState.classList.remove('hidden');
  } else {
    emptyState.classList.add('hidden');
    filteredTasks.forEach((task) => {
      const item = document.createElement('li');
      item.className = `task-item ${task.completed ? 'completed' : ''}`;
      const dateValue = task.dueDate || task.date || '';
      const isDue = isOverdue(dateValue, task.completed);
      item.innerHTML = `
        <div class="task-content">
          <div class="checkbox-wrapper">
            <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} onchange="toggleTaskStatus('${task.id}')" aria-label="Toggle status" />
            <div class="checkbox-custom"></div>
          </div>
          <div class="task-details">
            <div class="task-title"><span class="task-title-text">${escapeHTML(task.title)}</span></div>
            <div class="task-meta">
              <span class="badge priority-${task.priority.toLowerCase()}"><i data-lucide="flag"></i> ${task.priority}</span>
              <span class="badge category"><i data-lucide="folder"></i> ${task.category}</span>
              ${dateValue ? `<span class="badge date ${isDue ? 'overdue' : ''}"><i data-lucide="${isDue ? 'alert-circle' : 'calendar'}"></i> ${formatDateOnly(dateValue, { month: 'short', day: 'numeric' })}</span>` : ''}
            </div>
          </div>
        </div>
        <div class="task-actions">
          <button class="action-btn" type="button" onclick="openEditModal('${task.id}')" aria-label="Edit task"><i data-lucide="edit-2"></i></button>
          <button class="action-btn delete-btn" type="button" onclick="deleteTask('${task.id}')" aria-label="Delete task"><i data-lucide="trash-2"></i></button>
        </div>
      `;
      taskList.appendChild(item);
    });
  }
  lucide.createIcons();
}

function renderTasksPage() {
  if (!tasksPageList) return;
  const list = [...tasks].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  tasksPageList.innerHTML = list.map((task) => `
    <div class="task-card-item ${task.completed ? 'done' : ''}">
      <div>
        <div class="mini-tag ${task.priority.toLowerCase()}">${task.priority}</div>
        <h3>${escapeHTML(task.title)}</h3>
        <p>${task.category} • ${task.dueDate ? formatDateOnly(task.dueDate, { month: 'short', day: 'numeric' }) : 'No date'}</p>
      </div>
      <div class="task-inline-actions">
        <button type="button" onclick="toggleTaskStatus('${task.id}')">${task.completed ? 'Undo' : 'Done'}</button>
        <button type="button" onclick="openEditModal('${task.id}')">Edit</button>
      </div>
    </div>
  `).join('');
}

function renderUpcomingTasks() {
  if (!upcomingList) return;
  const nextTasks = tasks.filter((task) => !task.completed && (task.dueDate || task.date)).sort((a, b) => parseDateOnly(a.dueDate || a.date) - parseDateOnly(b.dueDate || b.date)).slice(0, 5);
  upcomingList.innerHTML = '';
  if (nextTasks.length === 0) {
    upcomingEmpty.classList.remove('hidden');
    return;
  }
  upcomingEmpty.classList.add('hidden');
  nextTasks.forEach((task) => {
    const due = task.dueDate || task.date;
    const isDueFlag = isOverdue(due, false);
    const li = document.createElement('li');
    li.className = `upcoming-item ${isDueFlag ? 'overdue' : ''}`;
    li.innerHTML = `
      <div class="upcoming-title">${escapeHTML(task.title)}</div>
      <div class="upcoming-meta">
        <span>${task.category}</span>
        <span class="upcoming-date">${isDueFlag ? '<i data-lucide="alert-circle"></i> Overdue' : `<i data-lucide="calendar"></i> ${formatDateOnly(due, { weekday: 'short', month: 'short', day: 'numeric' })}`}</span>
      </div>
    `;
    upcomingList.appendChild(li);
  });
  lucide.createIcons();
}

function renderImportantTasks() {
  const important = tasks.filter((task) => task.important || task.priority === 'High');
  if (!importantList) return;
  importantList.innerHTML = important.length ? important.map((task) => `
    <div class="task-card-item important-item">
      <div>
        <div class="mini-tag high">${task.priority}</div>
        <h3>${escapeHTML(task.title)}</h3>
        <p>${task.description || 'High-impact task that deserves attention.'}</p>
      </div>
      <button type="button" onclick="openEditModal('${task.id}')">View</button>
    </div>
  `).join('') : '<p class="empty-message">No important tasks right now.</p>';
}

function getWeeklyCompletionData() {
  const dates = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));
    return date;
  });

  return {
    labels: dates.map((date) => date.toLocaleDateString(undefined, { weekday: 'short' })),
    data: dates.map((date) => tasks.filter((task) => {
      if (!task.completed || !task.completedAt) return false;
      const completedDate = new Date(task.completedAt);
      return completedDate.toDateString() === date.toDateString();
    }).length)
  };
}

function renderAnalytics() {
  if (!analyticsMetrics) return;
  const total = tasks.length;
  const completed = tasks.filter((t) => t.completed).length;
  const pending = total - completed;
  const overdue = tasks.filter((t) => isOverdue(t.dueDate || t.date, t.completed)).length;
  const rate = total ? Math.round((completed / total) * 100) : 0;

  analyticsMetrics.innerHTML = `
    <div class="metric-box glass-card"><span>Total</span><strong>${total}</strong></div>
    <div class="metric-box glass-card"><span>Completed</span><strong>${completed}</strong></div>
    <div class="metric-box glass-card"><span>Pending</span><strong>${pending}</strong></div>
    <div class="metric-box glass-card"><span>Overdue</span><strong>${overdue}</strong></div>
    <div class="metric-box glass-card"><span>Rate</span><strong>${rate}%</strong></div>
  `;

  const { labels, data: values } = getWeeklyCompletionData();

  if (typeof Chart !== 'undefined') {
    const analyticsCtx = document.getElementById('analytics-weekly-chart');
    const donutCtx = document.getElementById('analytics-donut-chart');
    if (analyticsCtx && !analyticsCtx._chart) {
      analyticsCtx._chart = new Chart(analyticsCtx, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: 'Completed',
            data: values,
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99, 102, 241, 0.15)',
            fill: true,
            tension: 0.4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } }
        }
      });
    } else if (analyticsCtx && analyticsCtx._chart) {
      analyticsCtx._chart.data.labels = labels;
      analyticsCtx._chart.data.datasets[0].data = values;
      analyticsCtx._chart.update();
    }

    const categoryMap = {};
    tasks.forEach((task) => {
      categoryMap[task.category] = (categoryMap[task.category] || 0) + 1;
    });

    const donutData = Object.values(categoryMap);
    const donutLabels = Object.keys(categoryMap);
    if (donutCtx && !donutCtx._chart) {
      donutCtx._chart = new Chart(donutCtx, {
        type: 'doughnut',
        data: {
          labels: donutLabels,
          datasets: [{
            data: donutData,
            backgroundColor: ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#a855f7', '#f472b6']
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '65%',
          plugins: { legend: { position: 'bottom' } }
        }
      });
    } else if (donutCtx && donutCtx._chart) {
      donutCtx._chart.data.labels = donutLabels;
      donutCtx._chart.data.datasets[0].data = donutData;
      donutCtx._chart.update();
    }
  }
}

function renderCalendar() {
  if (!calendarGrid) return;
  const today = new Date();
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);
  const startDay = monthStart.getDay();

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const monthHeader = document.getElementById('calendar-month-header');
  if (monthHeader) {
    monthHeader.innerHTML = `
      <button type="button" class="icon-btn" id="previous-month" aria-label="Previous month" title="Previous month"><i data-lucide="chevron-left"></i></button>
      <h3>${monthNames[month]} ${year}</h3>
      <button type="button" class="icon-btn" id="next-month" aria-label="Next month" title="Next month"><i data-lucide="chevron-right"></i></button>
    `;
    document.getElementById('previous-month').addEventListener('click', () => changeCalendarMonth(-1));
    document.getElementById('next-month').addEventListener('click', () => changeCalendarMonth(1));
    lucide.createIcons();
  }

  const cells = [];
  for (let i = 0; i < startDay; i++) cells.push('<div class="day empty"></div>');

  for (let day = 1; day <= monthEnd.getDate(); day++) {
    const dateValue = new Date(year, month, day);
    const dateStr = toDateKey(dateValue);
    const matches = tasks.filter((task) => (task.dueDate || task.date) === dateStr);
    const isToday = dateValue.toDateString() === today.toDateString();
    cells.push(`
      <div class="day ${matches.length ? 'has-event' : ''} ${isToday ? 'today' : ''}">
        <span class="day-number">${day}</span>
        <div class="day-tasks">
          ${matches.map((task) => `<div class="task-dot" title="${escapeHTML(task.title)}"><small>${escapeHTML(task.title.substring(0, 10))}</small></div>`).join('')}
        </div>
      </div>
    `);
  }

  calendarGrid.innerHTML = cells.join('');

  const upcoming = tasks.filter((task) => (task.dueDate || task.date)).sort((a, b) => parseDateOnly(a.dueDate || a.date) - parseDateOnly(b.dueDate || b.date)).slice(0, 6);
  calendarEvents.innerHTML = upcoming.length ? upcoming.map((task) => `
    <div class="event-item">
      <strong>${escapeHTML(task.title)}</strong>
      <small>${task.dueDate ? formatDateOnly(task.dueDate, { month: 'short', day: 'numeric' }) : 'No date'}</small>
    </div>
  `).join('') : '<p class="empty-message">No scheduled items.</p>';
}

function changeCalendarMonth(offset) {
  calendarDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + offset, 1);
  renderCalendar();
}

function switchView(viewName) {
  const labels = {
    dashboard: ['Dashboard Overview', 'Here’s what’s happening today.'],
    tasks: ['My Tasks', 'Everything in your workflow.'],
    analytics: ['Analytics', 'Productivity insights and trends.'],
    calendar: ['Calendar', 'Keep deadlines and meetings on track.'],
    important: ['Important', 'Your top-priority tasks.'],
    settings: ['Settings', 'Fine tune your workspace.']
  };

  navButtons.forEach((button) => button.classList.toggle('active', button.dataset.view === viewName));
  viewPanes.forEach((pane) => pane.classList.toggle('active', pane.id === `${viewName}-view`));

  const meta = labels[viewName] || labels.dashboard;
  titleEl.textContent = meta[0];
  subtitleEl.textContent = meta[1];
}

function escapeHTML(str = '') {
  return String(str).replace(/[&<>"']/g, (tag) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[tag] || tag));
}

function initCharts() {
  if (typeof Chart === 'undefined') return;
  const colors = getChartColors();
  Chart.defaults.color = colors.text;
  Chart.defaults.font.family = "'Inter', system-ui, sans-serif";

  const weeklyCtx = document.getElementById('weekly-chart');
  const donutCtx = document.getElementById('donut-chart');

  if (weeklyCtx) {
    const { labels, data } = getWeeklyCompletionData();

    weeklyChart = new Chart(weeklyCtx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Completed',
          data,
          backgroundColor: colors.primary,
          borderRadius: 8
        }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: colors.grid } }, x: { grid: { display: false } } } }
    });
  }

  if (donutCtx) {
    const categories = {};
    tasks.forEach((task) => {
      categories[task.category] = (categories[task.category] || 0) + 1;
    });
    const keys = Object.keys(categories);
    const values = Object.values(categories);
    donutChart = new Chart(donutCtx, {
      type: 'doughnut',
      data: {
        labels: keys,
        datasets: [{
          data: values,
          backgroundColor: [colors.primary, colors.success, colors.warning, colors.danger, '#a855f7', '#f472b6']
        }]
      },
      options: { responsive: true, maintainAspectRatio: false, cutout: '72%', plugins: { legend: { position: 'bottom' } } }
    });
  }
}

function getChartColors() {
  const isDark = document.body.getAttribute('data-theme') === 'dark';
  const style = getComputedStyle(document.documentElement);
  return {
    text: style.getPropertyValue('--text-secondary').trim(),
    grid: style.getPropertyValue('--chart-grid').trim(),
    primary: style.getPropertyValue('--primary').trim(),
    success: style.getPropertyValue('--success').trim(),
    warning: style.getPropertyValue('--warning').trim(),
    danger: style.getPropertyValue('--danger').trim(),
    pending: isDark ? '#4b5563' : '#cbd5e1'
  };
}

function updateCharts() {
  if (!weeklyChart || !donutChart) return;
  const colors = getChartColors();
  const { labels, data } = getWeeklyCompletionData();

  weeklyChart.data.labels = labels;
  weeklyChart.data.datasets[0].data = data;
  weeklyChart.data.datasets[0].backgroundColor = colors.primary;
  weeklyChart.options.scales.y.grid.color = colors.grid;
  weeklyChart.update();

  const countMap = {};
  tasks.forEach((task) => {
    countMap[task.category] = (countMap[task.category] || 0) + 1;
  });

  donutChart.data.labels = Object.keys(countMap);
  donutChart.data.datasets[0].data = Object.values(countMap);
  donutChart.data.datasets[0].backgroundColor = [colors.primary, colors.success, colors.warning, colors.danger, '#a855f7', '#f472b6'];
  donutChart.update();
}

function updateChartsTheme() {
  if (!weeklyChart || !donutChart) return;
  updateCharts();
}

async function init() {
  setCurrentDate();
  restrictDateInputs();
  loadThemePreference();
  lucide.createIcons();

  if (!isAuthenticated()) {
    setAuthenticatedState(false);
    setupEventListeners();
    return;
  }

  setAuthenticatedState(true);

  const loaded = await fetchTasks();
  tasks = loaded.map(normalizeTask);
  renderTasks();
  updateStats();
  renderUpcomingTasks();
  renderTasksPage();
  renderImportantTasks();
  renderAnalytics();
  renderCalendar();
  initCharts();
  setupEventListeners();
}

function isAuthenticated() {
  return localStorage.getItem('taskmaster-user') === 'authenticated';
}

function setAuthenticatedState(isLoggedIn) {
  document.body.classList.toggle('logged-in', isLoggedIn);
  if (loginScreen) loginScreen.classList.toggle('hidden', isLoggedIn);
  if (appLayout) appLayout.classList.toggle('hidden', !isLoggedIn);
  if (logoutBtn) logoutBtn.classList.toggle('hidden', !isLoggedIn);
  if (loginError) loginError.classList.add('hidden');
}

function handleLogin(event) {
  event.preventDefault();

  const emailInput = document.getElementById('login-email');
  const passwordInput = document.getElementById('login-password');
  const email = (emailInput?.value || '').trim().toLowerCase();
  const password = passwordInput?.value || '';

  if (email === 'admin@taskmaster.com' && password === 'admin123') {
    localStorage.setItem('taskmaster-user', 'authenticated');
    setAuthenticatedState(true);
    return;
  }

  if (loginError) {
    loginError.classList.remove('hidden');
  }
}

function handleLogout() {
  localStorage.removeItem('taskmaster-user');
  setAuthenticatedState(false);
  const emailInput = document.getElementById('login-email');
  const passwordInput = document.getElementById('login-password');
  if (emailInput) emailInput.value = 'admin@taskmaster.com';
  if (passwordInput) passwordInput.value = 'admin123';
}

function setupEventListeners() {
  restrictDateInputs();
  if (loginForm) loginForm.addEventListener('submit', handleLogin);
  if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);

  addTaskForm.addEventListener('submit', handleAddTask);
  searchInput.addEventListener('input', renderTasks);
  categoryFilter.addEventListener('change', function (event) {
    currentCategory = event.target.value;
    renderTasks();
  });

  filterBtns.forEach((button) => {
    button.addEventListener('click', function (event) {
      filterBtns.forEach((btn) => btn.classList.remove('active'));
      event.target.classList.add('active');
      currentFilter = event.target.dataset.filter;
      renderTasks();
    });
  });

  closeModalBtn.addEventListener('click', closeEditModal);
  cancelEditBtn.addEventListener('click', closeEditModal);
  editTaskForm.addEventListener('submit', handleEditTask);
  themeToggleBtn.addEventListener('click', toggleTheme);
  settingsThemeToggleBtn.addEventListener('click', toggleTheme);
  document.getElementById('quick-add-btn').addEventListener('click', () => {
    switchView('dashboard');
    setTimeout(() => {
      const input = document.getElementById('task-title');
      if (input) input.focus();
    }, 100);
  });

  navButtons.forEach((button) => {
    button.addEventListener('click', () => switchView(button.dataset.view));
  });
}

document.addEventListener('DOMContentLoaded', init);
