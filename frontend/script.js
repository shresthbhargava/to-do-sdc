// Configuration - update this URL when deploying
const API_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000/api' 
    : 'https://your-backend-url.onrender.com/api'; // Replace with your deployed backend URL

// DOM elements
const taskInput = document.getElementById('taskInput');
const addBtn = document.getElementById('addBtn');
const taskList = document.getElementById('taskList');
const tasksCount = document.getElementById('tasksCount');
const clearCompletedBtn = document.getElementById('clearCompleted');
const filterButtons = document.querySelectorAll('.filter-btn');

let currentFilter = 'all';
let tasks = [];

// Event listeners
addBtn.addEventListener('click', addTask);
taskInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addTask();
});
clearCompletedBtn.addEventListener('click', clearCompletedTasks);
filterButtons.forEach(btn => {
    btn.addEventListener('click', () => setFilter(btn.id));
});

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    loadTasks();
    console.log('App initialized with API:', API_BASE_URL);
});

// API functions
async function loadTasks() {
    try {
        showLoading(true);
        const response = await fetch(`${API_BASE_URL}/tasks`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        tasks = await response.json();
        renderTasks();
        showNotification('Tasks loaded successfully', 'success');
    } catch (error) {
        console.error('Error loading tasks:', error);
        showNotification('Failed to load tasks. Check if server is running.', 'error');
        tasks = [];
        renderTasks();
    } finally {
        showLoading(false);
    }
}

async function addTask() {
    const text = taskInput.value.trim();
    if (!text) {
        showNotification('Please enter a task!', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/tasks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text })
        });

        if (response.ok) {
            taskInput.value = '';
            await loadTasks();
            showNotification('Task added successfully', 'success');
        } else {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to add task');
        }
    } catch (error) {
        console.error('Error adding task:', error);
        showNotification(error.message || 'Failed to add task', 'error');
    }
}

async function updateTask(id, updates) {
    try {
        const response = await fetch(`${API_BASE_URL}/tasks/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updates)
        });

        if (!response.ok) {
            throw new Error('Failed to update task');
        }
        
        await loadTasks();
        
        if (updates.completed !== undefined) {
            const message = updates.completed ? 'Task completed! 🎉' : 'Task marked as active';
            showNotification(message, 'success');
        }
    } catch (error) {
        console.error('Error updating task:', error);
        showNotification('Failed to update task', 'error');
    }
}

async function deleteTask(id) {
    if (!confirm('Are you sure you want to delete this task?')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/tasks/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            await loadTasks();
            showNotification('Task deleted successfully', 'success');
        } else {
            throw new Error('Failed to delete task');
        }
    } catch (error) {
        console.error('Error deleting task:', error);
        showNotification('Failed to delete task', 'error');
    }
}

async function clearCompletedTasks() {
    const completedTasks = tasks.filter(task => task.completed);
    
    if (completedTasks.length === 0) {
        showNotification('No completed tasks to clear', 'error');
        return;
    }

    if (!confirm(`Delete ${completedTasks.length} completed task(s)?`)) {
        return;
    }

    try {
        // Delete all completed tasks
        const deletePromises = completedTasks.map(task => 
            fetch(`${API_BASE_URL}/tasks/${task._id}`, { method: 'DELETE' })
        );
        
        await Promise.all(deletePromises);
        await loadTasks();
        showNotification('Completed tasks cleared', 'success');
    } catch (error) {
        console.error('Error clearing completed tasks:', error);
        showNotification('Failed to clear completed tasks', 'error');
    }
}

// UI functions
function renderTasks() {
    const filteredTasks = filterTasks();
    
    if (filteredTasks.length === 0) {
        taskList.innerHTML = `
            <div class="empty-state">
                <h3>No tasks found</h3>
                <p>${getEmptyStateMessage()}</p>
            </div>
        `;
    } else {
        taskList.innerHTML = '';
        filteredTasks.forEach(task => {
            const taskItem = createTaskElement(task);
            taskList.appendChild(taskItem);
        });
    }
    
    updateTaskCount();
}

function getEmptyStateMessage() {
    switch (currentFilter) {
        case 'completed':
            return 'You haven\'t completed any tasks yet';
        case 'active':
            return 'No active tasks! Great job!';
        default:
            return 'Add a new task to get started';
    }
}

function createTaskElement(task) {
    const li = document.createElement('li');
    li.className = `task-item ${task.completed ? 'completed' : ''}`;
    
    // Format date
    const date = new Date(task.createdAt).toLocaleDateString();
    
    li.innerHTML = `
        <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
        <div class="task-content">
            <span class="task-text">${escapeHtml(task.text)}</span>
            <small class="task-date">Created: ${date}</small>
        </div>
        <div class="task-actions">
            <button class="edit-btn" title="Edit task">Edit</button>
            <button class="delete-btn" title="Delete task">Delete</button>
        </div>
    `;
    
    const checkbox = li.querySelector('.task-checkbox');
    const editBtn = li.querySelector('.edit-btn');
    const deleteBtn = li.querySelector('.delete-btn');
    
    checkbox.addEventListener('change', () => {
        updateTask(task._id, { completed: checkbox.checked });
    });
    
    deleteBtn.addEventListener('click', () => {
        deleteTask(task._id);
    });
    
    editBtn.addEventListener('click', () => {
        const newText = prompt('Edit your task:', task.text);
        if (newText !== null && newText.trim() !== '' && newText.trim() !== task.text) {
            updateTask(task._id, { text: newText.trim() });
        }
    });
    
    return li;
}

function filterTasks() {
    switch (currentFilter) {
        case 'active':
            return tasks.filter(task => !task.completed);
        case 'completed':
            return tasks.filter(task => task.completed);
        default:
            return tasks;
    }
}

function setFilter(filterId) {
    // Map button IDs to filter values
    const filterMap = {
        'showAll': 'all',
        'showActive': 'active',
        'showCompleted': 'completed'
    };
    
    currentFilter = filterMap[filterId] || 'all';
    
    filterButtons.forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.getElementById(filterId).classList.add('active');
    renderTasks();
}

function updateTaskCount() {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.completed).length;
    const activeTasks = totalTasks - completedTasks;
    
    tasksCount.textContent = `${activeTasks} active ${activeTasks === 1 ? 'task' : 'tasks'}`;
    
    // Update page title with count
    document.title = activeTasks > 0 ? `(${activeTasks}) Interactive To-Do List` : 'Interactive To-Do List';
    
    // Show/hide clear completed button
    clearCompletedBtn.style.display = completedTasks > 0 ? 'block' : 'none';
}

function showLoading(show) {
    if (show) {
        taskList.innerHTML = '<div class="loading">Loading tasks...</div>';
    }
}

function showNotification(message, type = 'success') {
    // Create notification element if it doesn't exist
    let notification = document.querySelector('.notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.className = 'notification';
        document.body.appendChild(notification);
    }
    
    notification.textContent = message;
    notification.className = `notification ${type} show`;
    
    // Hide after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Add enhanced notification styles
const style = document.createElement('style');
style.textContent = `
    .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 6px;
        color: white;
        font-weight: 500;
        z-index: 1000;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        transform: translateX(100%);
        transition: transform 0.3s ease;
        max-width: 300px;
    }
    
    .notification.show {
        transform: translateX(0);
    }
    
    .notification.success {
        background: #48bb78;
    }
    
    .notification.error {
        background: #f56565;
    }
    
    .loading {
        text-align: center;
        padding: 20px;
        color: #718096;
        font-style: italic;
    }
    
    .task-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 4px;
    }
    
    .task-date {
        color: #a0aec0;
        font-size: 12px;
    }
`;
document.head.appendChild(style);