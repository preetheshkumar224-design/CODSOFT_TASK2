const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const dbPath = path.join(__dirname, 'tasks.db');
const db = new sqlite3.Database(dbPath);

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

function taskFromRow(row) {
  return {
    id: String(row.id),
    title: row.title,
    category: row.category || 'General',
    priority: row.priority || 'Medium',
    dueDate: row.dueDate || '',
    completed: Boolean(row.completed),
    important: Boolean(row.important),
    description: row.description || '',
    createdAt: row.createdAt || new Date().toISOString(),
    completedAt: row.completedAt || null
  };
}

function getToday() {
  return new Date().toISOString();
}

function isOverdue(dateStr, completed) {
  if (!dateStr || completed) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const taskDate = new Date(dateStr);
  taskDate.setHours(0, 0, 0, 0);
  return taskDate < today;
}

function createInitialData() {
  const seeds = [
    {
      id: 'task-1',
      title: 'Finalize Q3 product roadmap',
      category: 'Work',
      priority: 'High',
      dueDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
      completed: false,
      important: true,
      description: 'Review roadmap and align timelines with the engineering team.',
      createdAt: getToday(),
      completedAt: null
    },
    {
      id: 'task-2',
      title: 'Plan weekly workout routine',
      category: 'Health',
      priority: 'Medium',
      dueDate: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
      completed: false,
      important: false,
      description: 'Schedule gym sessions and daily hydration goals.',
      createdAt: getToday(),
      completedAt: null
    },
    {
      id: 'task-3',
      title: 'Complete marketing research notes',
      category: 'Study',
      priority: 'High',
      dueDate: new Date(Date.now() - 86400000).toISOString().slice(0, 10),
      completed: true,
      important: true,
      description: 'Compile the customer feedback summary and growth insights.',
      createdAt: getToday(),
      completedAt: getToday()
    }
  ];

  const insertQuery = `
    INSERT INTO tasks (id, title, category, priority, dueDate, completed, important, description, createdAt, completedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.serialize(() => {
    seeds.forEach((task) => {
      db.run(insertQuery, [
        task.id,
        task.title,
        task.category,
        task.priority,
        task.dueDate,
        task.completed ? 1 : 0,
        task.important ? 1 : 0,
        task.description,
        task.createdAt,
        task.completedAt
      ]);
    });
  });
}

function initDatabase() {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        category TEXT,
        priority TEXT,
        dueDate TEXT,
        completed INTEGER DEFAULT 0,
        important INTEGER DEFAULT 0,
        description TEXT,
        createdAt TEXT,
        completedAt TEXT
      )
    `, (err) => {
      if (err) {
        console.error('Database init error:', err.message);
        return;
      }

      db.get('SELECT COUNT(*) AS total FROM tasks', (countErr, row) => {
        if (!countErr && Number(row.total) === 0) {
          createInitialData();
        }
      });
    });
  });
}

app.get('/api/tasks', (req, res) => {
  db.all('SELECT * FROM tasks ORDER BY createdAt DESC', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows.map(taskFromRow));
  });
});

app.post('/api/tasks', (req, res) => {
  const task = req.body || {};
  const title = (task.title || '').trim();
  if (!title) {
    return res.status(400).json({ error: 'Task title is required' });
  }

  const newTask = {
    id: task.id || `task-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title,
    category: task.category || 'General',
    priority: task.priority || 'Medium',
    dueDate: task.dueDate || '',
    completed: Boolean(task.completed),
    important: Boolean(task.important),
    description: task.description || '',
    createdAt: task.createdAt || getToday(),
    completedAt: task.completed ? getToday() : null
  };

  db.run(
    `INSERT INTO tasks (id, title, category, priority, dueDate, completed, important, description, createdAt, completedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      newTask.id,
      newTask.title,
      newTask.category,
      newTask.priority,
      newTask.dueDate,
      newTask.completed ? 1 : 0,
      newTask.important ? 1 : 0,
      newTask.description,
      newTask.createdAt,
      newTask.completedAt
    ],
    (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json(newTask);
    }
  );
});

app.put('/api/tasks/:id', (req, res) => {
  const task = req.body || {};
  const id = req.params.id;
  const title = (task.title || '').trim();

  if (!title) {
    return res.status(400).json({ error: 'Task title is required' });
  }

  const updatedTask = {
    title,
    category: task.category || 'General',
    priority: task.priority || 'Medium',
    dueDate: task.dueDate || '',
    completed: Boolean(task.completed),
    important: Boolean(task.important),
    description: task.description || '',
    completedAt: task.completed ? (task.completedAt || getToday()) : null
  };

  db.run(
    `UPDATE tasks
     SET title = ?, category = ?, priority = ?, dueDate = ?, completed = ?, important = ?, description = ?, completedAt = ?
     WHERE id = ?`,
    [
      updatedTask.title,
      updatedTask.category,
      updatedTask.priority,
      updatedTask.dueDate,
      updatedTask.completed ? 1 : 0,
      updatedTask.important ? 1 : 0,
      updatedTask.description,
      updatedTask.completedAt,
      id
    ],
    (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      db.get('SELECT * FROM tasks WHERE id = ?', [id], (getErr, row) => {
        if (getErr || !row) {
          return res.status(404).json({ error: 'Task not found' });
        }
        res.json(taskFromRow(row));
      });
    }
  );
});

app.patch('/api/tasks/:id/toggle', (req, res) => {
  const id = req.params.id;
  db.get('SELECT * FROM tasks WHERE id = ?', [id], (err, row) => {
    if (err || !row) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const completed = !Boolean(row.completed);
    db.run(
      'UPDATE tasks SET completed = ?, completedAt = ? WHERE id = ?',
      [completed ? 1 : 0, completed ? getToday() : null, id],
      (updateErr) => {
        if (updateErr) {
          return res.status(500).json({ error: updateErr.message });
        }
        db.get('SELECT * FROM tasks WHERE id = ?', [id], (getErr, updatedRow) => {
          if (getErr || !updatedRow) {
            return res.status(404).json({ error: 'Task not found' });
          }
          res.json(taskFromRow(updatedRow));
        });
      }
    );
  });
});

app.delete('/api/tasks/:id', (req, res) => {
  const id = req.params.id;
  db.run('DELETE FROM tasks WHERE id = ?', [id], (err) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ success: true, id });
  });
});

app.get('/api/analytics', (req, res) => {
  db.all('SELECT * FROM tasks ORDER BY createdAt DESC', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    const tasks = rows.map(taskFromRow);
    const total = tasks.length;
    const completed = tasks.filter((task) => task.completed).length;
    const pending = total - completed;
    const overdue = tasks.filter((task) => isOverdue(task.dueDate, task.completed)).length;
    const highPriority = tasks.filter((task) => task.priority === 'High' && !task.completed).length;
    const completionRate = total ? Math.round((completed / total) * 100) : 0;
    const productivityScore = Math.max(0, Math.min(100, completionRate - overdue * 5));

    const byCategory = tasks.reduce((acc, task) => {
      acc[task.category] = (acc[task.category] || 0) + 1;
      return acc;
    }, {});

    const byPriority = {
      High: tasks.filter((task) => task.priority === 'High').length,
      Medium: tasks.filter((task) => task.priority === 'Medium').length,
      Low: tasks.filter((task) => task.priority === 'Low').length
    };

    res.json({
      total,
      completed,
      pending,
      overdue,
      highPriority,
      completionRate,
      productivityScore,
      byCategory,
      byPriority,
      weeklyProgress: [4, 6, 8, 7, 10, 9, 12]
    });
  });
});

app.get('/api/dashboard', (req, res) => {
  db.all('SELECT * FROM tasks ORDER BY createdAt DESC', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    const tasks = rows.map(taskFromRow);
    const upcoming = tasks
      .filter((task) => !task.completed && task.dueDate)
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
      .slice(0, 5);

    res.json({
      tasks,
      upcoming,
      metrics: {
        total: tasks.length,
        completed: tasks.filter((task) => task.completed).length,
        pending: tasks.filter((task) => !task.completed).length,
        overdue: tasks.filter((task) => isOverdue(task.dueDate, task.completed)).length
      }
    });
  });
});

app.get('/api/calendar', (req, res) => {
  db.all('SELECT * FROM tasks WHERE dueDate IS NOT NULL AND dueDate != "" ORDER BY dueDate ASC', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows.map(taskFromRow));
  });
});

app.get('/api/important', (req, res) => {
  db.all('SELECT * FROM tasks WHERE important = 1 ORDER BY createdAt DESC', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows.map(taskFromRow));
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

initDatabase();

app.listen(PORT, () => {
  console.log(`TaskMaster Pro running on http://localhost:${PORT}`);
});
