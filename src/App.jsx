import { useEffect, useState } from "react";

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [text, setText] = useState("");

  // Fetch tasks from backend
  const getTasks = async () => {
    try {
      const res = await fetch("http://localhost:3000/api/tasks");
      const data = await res.json();
      setTasks(data);
    } catch (err) {
      console.error(err);
    }
  };

  // Add a new task
  const addTask = async () => {
    if (!text.trim()) return;
    try {
      const res = await fetch("http://localhost:3000/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
      });
      const newTask = await res.json();
      setTasks([newTask, ...tasks]);
      setText("");
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    getTasks();
  }, []);

  return (
    <div>
      <h1>Todo List</h1>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Add a new task"
      />
      <button onClick={addTask}>Add Task</button>

      <ul>
        {tasks.map((task) => (
          <li key={task._id}>{task.text} {task.completed ? "✅" : "❌"}</li>
        ))}
      </ul>
    </div>
  );
}
