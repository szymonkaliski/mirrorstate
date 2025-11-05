import { useMirrorState } from "react-mirrorstate";
import { useRef } from "react";

function BatchingExample() {
  const [state, updateState] = useMirrorState("batching", {
    count: 0,
    clicks: 0,
  });

  const renderCount = useRef(0);
  renderCount.current += 1;

  console.log("batching state", state, "renders:", renderCount.current);

  const handleBatchedUpdates = () => {
    // These three updates should be batched together
    updateState((draft) => {
      draft.count += 1;
    });
    updateState((draft) => {
      draft.count += 1;
    });
    updateState((draft) => {
      draft.clicks += 1;
    });
  };

  const handleMultipleBatchedUpdates = () => {
    // Five updates in quick succession
    for (let i = 0; i < 5; i++) {
      updateState((draft) => {
        draft.count += 1;
      });
    }
  };

  return (
    <div>
      <p>
        Synchronized with <code>batching.mirror.json</code>
      </p>
      <p data-testid="batching-count">Count: {state?.count ?? 0}</p>
      <p data-testid="batching-clicks">Clicks: {state?.clicks ?? 0}</p>
      <p data-testid="batching-renders">Renders: {renderCount.current}</p>
      <button data-testid="batched-update-btn" onClick={handleBatchedUpdates}>
        Batched Update (3 updates)
      </button>
      <button
        data-testid="multiple-batched-update-btn"
        onClick={handleMultipleBatchedUpdates}
      >
        Multiple Batched Updates (5 updates)
      </button>
    </div>
  );
}

export default BatchingExample;
