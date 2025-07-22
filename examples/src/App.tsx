import CounterExample from "./CounterExample";
import TodoExample from "./TodoExample";

function App() {
  return (
    <div
      style={{
        fontFamily: "sans-serif",
      }}
    >
      <h1>MirrorState</h1>
      <p>
        Bidirectional state synchronization through <code>*.mirror.json</code>{" "}
        files
      </p>

      <h2>Counter</h2>
      <CounterExample />

      <h2>Todo List</h2>
      <TodoExample />
    </div>
  );
}

export default App;
