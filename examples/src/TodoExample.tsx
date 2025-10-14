import { useMirrorState } from "react-mirrorstate";
import { useEffect, useState } from "react";

interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

interface TodoState {
  todos: Todo[];
}

function TodoExample() {
  const [todoState, updateTodoState] = useMirrorState<TodoState>("todos");
  const [inputValue, setInputValue] = useState("");

  useEffect(() => {
    console.log("initial todo state", todoState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addTodo = () => {
    if (inputValue.trim()) {
      updateTodoState((draft) => {
        draft.todos.push({
          id: Date.now().toString(),
          text: inputValue.trim(),
          completed: false,
        });
      });
      setInputValue("");
    }
  };

  const toggleTodo = (id: string) => {
    updateTodoState((draft) => {
      const todo = draft.todos.find((t) => t.id === id);
      if (todo) {
        todo.completed = !todo.completed;
      }
    });
  };

  const deleteTodo = (id: string) => {
    updateTodoState((draft) => {
      const index = draft.todos.findIndex((t) => t.id === id);
      if (index !== -1) {
        draft.todos.splice(index, 1);
      }
    });
  };

  return (
    <div>
      <p>
        Synchronized with <code>todos.mirror.json</code>
      </p>

      <div>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              addTodo();
            }
          }}
          placeholder="What needs to be done?"
        />
        <button onClick={addTodo}>Add</button>
      </div>

      <div>
        {todoState?.todos.map((todo) => (
          <div key={todo.id}>
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={() => toggleTodo(todo.id)}
            />
            <span
              style={{
                textDecoration: todo.completed ? "line-through" : "none",
              }}
            >
              {todo.text}
            </span>
            <button onClick={() => deleteTodo(todo.id)}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default TodoExample;
