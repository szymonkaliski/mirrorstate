import { useState } from 'react'
import './App.css'
import CounterExample from './examples/CounterExample'
import TodoExample from './examples/TodoExample'

type ExampleType = 'home' | 'counter' | 'todo'

interface Example {
  id: ExampleType
  title: string
  description: string
  component: React.ComponentType
}

const examples: Example[] = [
  {
    id: 'counter',
    title: 'Counter Example',
    description: 'Simple counter with bidirectional sync',
    component: CounterExample
  },
  {
    id: 'todo',
    title: 'Todo Example',
    description: 'Full-featured todo app with complex state management',
    component: TodoExample
  }
]

function App() {
  const [currentExample, setCurrentExample] = useState<ExampleType>('home')

  const renderExample = () => {
    if (currentExample === 'home') {
      return (
        <div className="home">
          <h1>MirrorState Examples</h1>
          <p className="subtitle">
            Explore bidirectional state synchronization through <code>*.mirror.json</code> files
          </p>
          
          <div className="examples-grid">
            {examples.map(example => (
              <div 
                key={example.id} 
                className="example-card"
                onClick={() => setCurrentExample(example.id)}
              >
                <h3>{example.title}</h3>
                <p>{example.description}</p>
                <button>Try Example</button>
              </div>
            ))}
          </div>

          <div className="info-section">
            <h2>How it works</h2>
            <div className="info-cards">
              <div className="info-card">
                <h4>🔄 Bidirectional Sync</h4>
                <p>Changes in the UI instantly update the corresponding <code>.mirror.json</code> file</p>
              </div>
              <div className="info-card">
                <h4>📁 File-based State</h4>
                <p>Edit <code>.mirror.json</code> files directly to see live updates in the UI</p>
              </div>
              <div className="info-card">
                <h4>⚡ Real-time</h4>
                <p>WebSocket connection ensures instant synchronization</p>
              </div>
            </div>
          </div>
        </div>
      )
    }

    const example = examples.find(ex => ex.id === currentExample)
    if (!example) return <div>Example not found</div>

    const ExampleComponent = example.component
    return (
      <div className="example-container">
        <div className="example-header">
          <button 
            className="back-button"
            onClick={() => setCurrentExample('home')}
          >
            ← Back to Examples
          </button>
          <h2>{example.title}</h2>
        </div>
        <ExampleComponent />
      </div>
    )
  }

  return (
    <div className="app">
      <nav className="navbar">
        <div className="nav-brand" onClick={() => setCurrentExample('home')}>
          MirrorState
        </div>
        <div className="nav-links">
          {examples.map(example => (
            <button
              key={example.id}
              className={`nav-link ${currentExample === example.id ? 'active' : ''}`}
              onClick={() => setCurrentExample(example.id)}
            >
              {example.title}
            </button>
          ))}
        </div>
      </nav>

      <main className="main-content">
        {renderExample()}
      </main>
    </div>
  )
}

export default App
