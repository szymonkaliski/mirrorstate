import { useMirrorState } from 'react-mirrorstate'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

function App() {
  const [count, updateCount] = useMirrorState('counter', 0)

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>MirrorState Counter</h1>
      <div className="card">
        <button onClick={() => updateCount(count => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>counter.mirror.json</code> to see the state sync!
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  )
}

export default App
