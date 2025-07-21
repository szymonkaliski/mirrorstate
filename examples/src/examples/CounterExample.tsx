import { useMirrorState } from "react-mirrorstate";

function CounterExample() {
  const [count, updateCount] = useMirrorState("counter", 0);

  return (
    <div>
      <p>Counter: {count}</p>
      <button onClick={() => updateCount((draft) => draft - 1)}>-</button>
      <button onClick={() => updateCount((draft) => draft + 1)}>+</button>
      <p>
        Synchronized with <code>counter.mirror.json</code>
      </p>
    </div>
  );
}

export default CounterExample;
