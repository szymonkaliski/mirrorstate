import { useEffect } from "react";
import { useMirrorState } from "react-mirrorstate";

function CounterExample() {
  const [count, updateCount] = useMirrorState("counter", 0);

  useEffect(() => {
    console.log("initial counter value", count);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
