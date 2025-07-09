import { useMirrorState } from 'react-mirrorstate'
import './CounterExample.css'

function CounterExample() {
  const [count, updateCount] = useMirrorState('counter', 0)

  return (
    <div className="counter-example">
      <div className="counter-display">
        <h2>Counter: {count}</h2>
        <div className="counter-controls">
          <button onClick={() => updateCount(draft => draft - 1)}>
            -
          </button>
          <button onClick={() => updateCount(draft => draft + 1)}>
            +
          </button>
        </div>
      </div>

      <div className="counter-info">
        <p>
          This counter's value is synchronized with <code>counter.mirror.json</code>
        </p>
        <p>
          Try editing the file manually to see the counter update in real-time!
        </p>
      </div>
    </div>
  )
}

export default CounterExample
