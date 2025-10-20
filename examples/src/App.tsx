import CounterExample from "./CounterExample";
import TodoExample1 from "./TodoExample1";
import TodoExample2 from "./TodoExample2";

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

      <h2>Todo List 1 (without initial value)</h2>
      <TodoExample1 />

      <h2>Todo List 2 (with initial value)</h2>
      <TodoExample2 />
    </div>
  );
}

export default App;
