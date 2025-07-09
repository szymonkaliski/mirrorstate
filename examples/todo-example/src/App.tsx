import { useMirrorState } from 'react-mirrorstate'
import { useState } from 'react'
import './App.css'

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
}

interface TodoState {
  todos: Todo[];
  filter: 'all' | 'active' | 'completed';
}

function App() {
  const [todoState, updateTodoState] = useMirrorState<TodoState>('todos', {
    todos: [],
    filter: 'all'
  });

  const [inputValue, setInputValue] = useState('');

  const addTodo = () => {
    if (inputValue.trim()) {
      updateTodoState(draft => {
        draft.todos.push({
          id: Date.now().toString(),
          text: inputValue.trim(),
          completed: false,
          createdAt: Date.now()
        });
      });
      setInputValue('');
    }
  };

  const toggleTodo = (id: string) => {
    updateTodoState(draft => {
      const todo = draft.todos.find(t => t.id === id);
      if (todo) {
        todo.completed = !todo.completed;
      }
    });
  };

  const deleteTodo = (id: string) => {
    updateTodoState(draft => {
      const index = draft.todos.findIndex(t => t.id === id);
      if (index !== -1) {
        draft.todos.splice(index, 1);
      }
    });
  };

  const setFilter = (filter: 'all' | 'active' | 'completed') => {
    updateTodoState(draft => {
      draft.filter = filter;
    });
  };

  const clearCompleted = () => {
    updateTodoState(draft => {
      draft.todos = draft.todos.filter(todo => !todo.completed);
    });
  };

  const filteredTodos = todoState.todos.filter(todo => {
    if (todoState.filter === 'active') return !todo.completed;
    if (todoState.filter === 'completed') return todo.completed;
    return true;
  });

  const activeTodosCount = todoState.todos.filter(todo => !todo.completed).length;
  const completedTodosCount = todoState.todos.filter(todo => todo.completed).length;

  return (
    <div className="app">
      <h1>MirrorState Todo</h1>
      
      <div className="todo-input">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && addTodo()}
          placeholder="What needs to be done?"
        />
        <button onClick={addTodo}>Add</button>
      </div>

      <div className="filters">
        <button 
          className={todoState.filter === 'all' ? 'active' : ''}
          onClick={() => setFilter('all')}
        >
          All ({todoState.todos.length})
        </button>
        <button 
          className={todoState.filter === 'active' ? 'active' : ''}
          onClick={() => setFilter('active')}
        >
          Active ({activeTodosCount})
        </button>
        <button 
          className={todoState.filter === 'completed' ? 'active' : ''}
          onClick={() => setFilter('completed')}
        >
          Completed ({completedTodosCount})
        </button>
      </div>

      <div className="todo-list">
        {filteredTodos.map(todo => (
          <div key={todo.id} className={`todo-item ${todo.completed ? 'completed' : ''}`}>
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={() => toggleTodo(todo.id)}
            />
            <span className="todo-text">{todo.text}</span>
            <button onClick={() => deleteTodo(todo.id)} className="delete-btn">
              Delete
            </button>
          </div>
        ))}
      </div>

      {completedTodosCount > 0 && (
        <div className="actions">
          <button onClick={clearCompleted}>Clear Completed</button>
        </div>
      )}

      <div className="instructions">
        <p>Edit <code>todos.mirror.json</code> to see the state sync in real-time!</p>
      </div>
    </div>
  );
}

export default App;
