import CounterExample from "./examples/CounterExample";
import TodoExample from "./examples/TodoExample";

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

      <section>
        <h2>Counter</h2>
        <CounterExample />
      </section>

      <section>
        <h2>Todo List</h2>
        <TodoExample />
      </section>
    </div>
  );
}

export default App;
