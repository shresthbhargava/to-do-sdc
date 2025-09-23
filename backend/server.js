const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/todoapp';


// Middleware
origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-frontend-url.vercel.app', 'https://your-frontend-url.netlify.app'] 
    : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:8000', 'http://127.0.0.1:5500']

app.use(express.json());

// MongoDB Connection with better error handling
mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => {
    console.log('✅ Connected to MongoDB Atlas');
    console.log(`📊 Database: ${mongoose.connection.db.databaseName}`);
})
.catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
});

// Handle connection events
mongoose.connection.on('disconnected', () => {
    console.log('⚠️  MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
    console.log('✅ MongoDB reconnected');
});

// Task Model - Import the model
const Task = require('./models/Task.js');

// Routes

// GET all tasks
app.get('/api/tasks', async (req, res) => {
    try {
        const tasks = await Task.find().sort({ createdAt: -1 });
        res.json(tasks);
    } catch (error) {
        console.error('Error fetching tasks:', error);
        res.status(500).json({ error: 'Failed to fetch tasks' });
    }
});

// GET a single task by ID
app.get('/api/tasks/:id', async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ error: 'Invalid task ID' });
        }

        const task = await Task.findById(req.params.id);
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }
        res.json(task);
    } catch (error) {
        console.error('Error fetching task:', error);
        res.status(500).json({ error: 'Failed to fetch task' });
    }
});

// POST a new task
app.post('/api/tasks', async (req, res) => {
    try {
        const { text } = req.body;
        
        if (!text || text.trim() === '') {
            return res.status(400).json({ error: 'Task text is required' });
        }

        if (text.trim().length > 500) {
            return res.status(400).json({ error: 'Task text too long (max 500 characters)' });
        }
        
        const task = new Task({
            text: text.trim(),
            completed: false
        });
        
        const savedTask = await task.save();
        console.log(`✅ New task created: ${savedTask._id}`);
        res.status(201).json(savedTask);
    } catch (error) {
        console.error('Error creating task:', error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: 'Failed to create task' });
    }
});

// PUT (update) a task
app.put('/api/tasks/:id', async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ error: 'Invalid task ID' });
        }

        const { text, completed } = req.body;
        const updates = {};
        
        if (text !== undefined) {
            if (text.trim() === '') {
                return res.status(400).json({ error: 'Task text cannot be empty' });
            }
            if (text.trim().length > 500) {
                return res.status(400).json({ error: 'Task text too long (max 500 characters)' });
            }
            updates.text = text.trim();
        }
        
        if (completed !== undefined) {
            updates.completed = Boolean(completed);
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: 'No valid updates provided' });
        }
        
        const updatedTask = await Task.findByIdAndUpdate(
            req.params.id,
            { ...updates, updatedAt: new Date() },
            { new: true, runValidators: true }
        );
        
        if (!updatedTask) {
            return res.status(404).json({ error: 'Task not found' });
        }
        
        console.log(`✅ Task updated: ${updatedTask._id}`);
        res.json(updatedTask);
    } catch (error) {
        console.error('Error updating task:', error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: 'Failed to update task' });
    }
});

// DELETE a task
app.delete('/api/tasks/:id', async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ error: 'Invalid task ID' });
        }

        const deletedTask = await Task.findByIdAndDelete(req.params.id);
        
        if (!deletedTask) {
            return res.status(404).json({ error: 'Task not found' });
        }
        
        console.log(`✅ Task deleted: ${req.params.id}`);
        res.json({ message: 'Task deleted successfully', task: deletedTask });
    } catch (error) {
        console.error('Error deleting task:', error);
        res.status(500).json({ error: 'Failed to delete task' });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Server is running',
        database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
        timestamp: new Date().toISOString()
    });
});

// API info endpoint
app.get('/api', (req, res) => {
    res.json({
        message: 'Todo List API',
        version: '1.0.0',
        endpoints: {
            'GET /api/tasks': 'Get all tasks',
            'GET /api/tasks/:id': 'Get task by ID',
            'POST /api/tasks': 'Create new task',
            'PUT /api/tasks/:id': 'Update task',
            'DELETE /api/tasks/:id': 'Delete task'
        }
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ 
        error: 'Something went wrong!',
        ...(process.env.NODE_ENV === 'development' && { details: err.message })
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ 
        error: 'Endpoint not found',
        availableEndpoints: '/api, /api/tasks, /health'
    });
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n⏹️  Shutting down gracefully...');
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed.');
    process.exit(0);
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📝 API available at: http://localhost:${PORT}/api`);
});

module.exports = app;