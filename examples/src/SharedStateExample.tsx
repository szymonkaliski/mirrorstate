import { useMirrorState } from "react-mirrorstate";

function ComponentA() {
  const [count, updateCount] = useMirrorState("shared", 0);

  return (
    <div data-testid="component-a">
      <strong>Component A</strong>
      <p data-testid="component-a-count">Count: {count}</p>
      <button
        data-testid="component-a-increment"
        onClick={() => updateCount((draft) => draft + 1)}
      >
        +
      </button>
    </div>
  );
}

function ComponentB() {
  const [count, updateCount] = useMirrorState("shared", 0);

  return (
    <div data-testid="component-b">
      <strong>Component B</strong>
      <p data-testid="component-b-count">Count: {count}</p>
      <button
        data-testid="component-b-decrement"
        onClick={() => updateCount((draft) => draft - 1)}
      >
        -
      </button>
    </div>
  );
}

function SharedStateExample() {
  return (
    <div>
      <p>
        Two components sharing <code>shared.mirror.json</code>
      </p>
      <div style={{ display: "flex", gap: "2rem" }}>
        <ComponentA />
        <ComponentB />
      </div>
    </div>
  );
}

export default SharedStateExample;
