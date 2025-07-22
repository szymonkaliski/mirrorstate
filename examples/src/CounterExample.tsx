import { useMirrorState } from "react-mirrorstate";

function CounterExample() {
  const [count, updateCount] = useMirrorState("counter", 0);

  return (
    <div>
      <p>
        Synchronized with <code>counter.mirror.json</code>
      </p>
      <p>Counter: {count}</p>
      <button onClick={() => updateCount((draft) => draft - 1)}>-</button>
      <button onClick={() => updateCount((draft) => draft + 1)}>+</button>
    </div>
  );
}

export default CounterExample;
