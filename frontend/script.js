const API_BASE_URL = 'http://localhost:3000/api';

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
});

// API functions
async function loadTasks() {
    try {
        const response = await fetch(`${API_BASE_URL}/tasks`);
        tasks = await response.json();
        renderTasks();
    } catch (error) {
        console.error('Error loading tasks:', error);
        showNotification('Failed to load tasks', 'error');
    }
}

async function addTask() {
    const text = taskInput.value.trim();
    if (!text) return;

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
            loadTasks();
            showNotification('Task added successfully', 'success');
        } else {
            throw new Error('Failed to add task');
        }
    } catch (error) {
        console.error('Error adding task:', error);
        showNotification('Failed to add task', 'error');
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
        
        loadTasks();
    } catch (error) {
        console.error('Error updating task:', error);
        showNotification('Failed to update task', 'error');
    }
}

async function deleteTask(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/tasks/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            loadTasks();
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
    try {
        const completedTasks = tasks.filter(task => task.completed);
        
        for (const task of completedTasks) {
            await deleteTask(task._id);
        }
        
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
                <p>${currentFilter === 'completed' ? 
                    'You haven\'t completed any tasks yet' : 
                    'Add a new task to get started'}</p>
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

function createTaskElement(task) {
    const li = document.createElement('li');
    li.className = `task-item ${task.completed ? 'completed' : ''}`;
    
    li.innerHTML = `
        <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
        <span class="task-text">${task.text}</span>
        <div class="task-actions">
            <button class="edit-btn">Edit</button>
            <button class="delete-btn">Delete</button>
        </div>
    `;
    
    const checkbox = li.querySelector('.task-checkbox');
    const editBtn = li.querySelector('.edit-btn');
    const deleteBtn = li.querySelector('.delete-btn');
    const taskText = li.querySelector('.task-text');
    
    checkbox.addEventListener('change', () => {
        updateTask(task._id, { completed: checkbox.checked });
    });
    
    deleteBtn.addEventListener('click', () => {
        deleteTask(task._id);
    });
    
    editBtn.addEventListener('click', () => {
        const newText = prompt('Edit your task:', task.text);
        if (newText !== null && newText.trim() !== '') {
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

function setFilter(filter) {
    currentFilter = filter.replace('show', '').toLowerCase();
    
    filterButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.id === `show${currentFilter.charAt(0).toUpperCase() + currentFilter.slice(1)}`) {
            btn.classList.add('active');
        }
    });
    
    renderTasks();
}

function updateTaskCount() {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.completed).length;
    const activeTasks = totalTasks - completedTasks;
    
    tasksCount.textContent = `${activeTasks} active ${activeTasks === 1 ? 'task' : 'tasks'}`;
}

function showNotification(message, type) {
    // Create notification element if it doesn't exist
    let notification = document.querySelector('.notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.className = 'notification';
        document.body.appendChild(notification);
    }
    
    notification.textContent = message;
    notification.className = `notification ${type}`;
    
    // Show notification
    notification.style.display = 'block';
    
    // Hide after 3 seconds
    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}

// Add notification styles
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
        display: none;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
    
    .notification.success {
        background: #48bb78;
    }
    
    .notification.error {
        background: #f56565;
    }
`;
document.head.appendChild(style);