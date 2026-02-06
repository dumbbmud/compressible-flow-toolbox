import { useMemo, useState } from 'react'
import './App.css'

const FLOW_MODELS = [
  {
    id: 'isentropic',
    label: 'Isentropic Flow',
    endpoint: '/api/isentropic/solve',
    description: '1-D adiabatic, no-friction flow relations.',
    fields: [
      { key: 'mach', label: 'Mach number (M)', type: 'number', step: '0.01', placeholder: '2.00' },
      { key: 'gamma', label: 'Specific heat ratio (γ)', type: 'number', step: '0.001', placeholder: '1.4' },
    ],
  },
  {
    id: 'normal-shock',
    label: 'Normal Shock',
    endpoint: '/api/normal-shock/solve',
    description: 'Across-shock state changes for 1-D shocks.',
    fields: [
      { key: 'mach1', label: 'Upstream Mach (M₁)', type: 'number', step: '0.01', placeholder: '2.20' },
      { key: 'gamma', label: 'Specific heat ratio (γ)', type: 'number', step: '0.001', placeholder: '1.4' },
    ],
  },
  {
    id: 'oblique-shock',
    label: 'Oblique Shock',
    endpoint: '/api/oblique-shock/solve',
    description: 'Shock-angle / deflection-angle relations for wedges.',
    fields: [
      { key: 'mach1', label: 'Upstream Mach (M₁)', type: 'number', step: '0.01', placeholder: '2.80' },
      { key: 'theta', label: 'Deflection angle θ (deg)', type: 'number', step: '0.1', placeholder: '12.0' },
      { key: 'gamma', label: 'Specific heat ratio (γ)', type: 'number', step: '0.001', placeholder: '1.4' },
    ],
  },
  {
    id: 'fanno',
    label: 'Fanno Flow',
    endpoint: '/api/fanno/solve',
    description: 'Adiabatic flow with wall friction effects.',
    fields: [
      { key: 'mach', label: 'Mach number (M)', type: 'number', step: '0.01', placeholder: '0.60' },
      { key: 'gamma', label: 'Specific heat ratio (γ)', type: 'number', step: '0.001', placeholder: '1.4' },
    ],
  },
  {
    id: 'rayleigh',
    label: 'Rayleigh Flow',
    endpoint: '/api/rayleigh/solve',
    description: 'Heat-addition effects in constant area flow.',
    fields: [
      { key: 'mach', label: 'Mach number (M)', type: 'number', step: '0.01', placeholder: '0.50' },
      { key: 'gamma', label: 'Specific heat ratio (γ)', type: 'number', step: '0.001', placeholder: '1.4' },
    ],
  },
]

const DEFAULT_VALUES = {
  mach: '2.0',
  mach1: '2.2',
  gamma: '1.4',
  theta: '12.0',
}

function safeNumber(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function buildSampleResults(modelId, values) {
  const gamma = safeNumber(values.gamma)
  if (!gamma || gamma <= 1) {
    return null
  }

  if (modelId === 'isentropic') {
    const mach = safeNumber(values.mach)
    if (!mach || mach <= 0) {
      return null
    }

    const term = 1 + ((gamma - 1) / 2) * mach ** 2
    return {
      'T/T₀': (1 / term).toFixed(5),
      'p/p₀': (term ** (-gamma / (gamma - 1))).toFixed(5),
      'ρ/ρ₀': (term ** (-1 / (gamma - 1))).toFixed(5),
      'A/A*': ((1 / mach) * ((2 / (gamma + 1)) * term) ** ((gamma + 1) / (2 * (gamma - 1)))).toFixed(5),
    }
  }

  return null
}

function App() {
  const [apiBase, setApiBase] = useState('http://localhost:8000')
  const [apiState, setApiState] = useState({ status: 'idle', message: 'Backend not checked yet.' })
  const [selectedModelId, setSelectedModelId] = useState('isentropic')
  const [values, setValues] = useState(DEFAULT_VALUES)

  const selectedModel = useMemo(
    () => FLOW_MODELS.find((model) => model.id === selectedModelId) ?? FLOW_MODELS[0],
    [selectedModelId],
  )

  const payload = useMemo(() => {
    const entries = selectedModel.fields
      .map((field) => [field.key, safeNumber(values[field.key])])
      .filter(([, value]) => value !== null)

    return Object.fromEntries(entries)
  }, [selectedModel, values])

  const previewResults = useMemo(() => buildSampleResults(selectedModel.id, values), [selectedModel.id, values])

  async function checkBackend() {
    setApiState({ status: 'loading', message: 'Checking backend...' })

    try {
      const [healthResponse, rootResponse] = await Promise.all([
        fetch(`${apiBase}/health`),
        fetch(`${apiBase}/`),
      ])

      if (!healthResponse.ok || !rootResponse.ok) {
        throw new Error(`HTTP status ${healthResponse.status} / ${rootResponse.status}`)
      }

      const healthPayload = await healthResponse.json()
      const rootPayload = await rootResponse.json()

      setApiState({
        status: 'ok',
        message: `${rootPayload.message} | health=${healthPayload.status}`,
      })
    } catch (error) {
      setApiState({
        status: 'error',
        message: `Could not connect: ${error.message}`,
      })
    }
  }

  return (
    <main className="app-shell">
      <header>
        <p className="eyebrow">Compressible Flow Toolbox</p>
        <h1>Frontend Workbench</h1>
        <p className="subtitle">
          Select a flow model, enter known values, and prepare request payloads for the FastAPI backend.
        </p>
      </header>

      <section className="panel">
        <div className="panel-header">
          <h2>Backend connectivity</h2>
          <span className={`status-dot status-${apiState.status}`} />
        </div>

        <div className="api-controls">
          <label htmlFor="apiBase">Backend URL</label>
          <input
            id="apiBase"
            value={apiBase}
            onChange={(event) => setApiBase(event.target.value)}
            placeholder="http://localhost:8000"
          />
          <button type="button" onClick={checkBackend}>Check backend</button>
        </div>

        <p className="api-message">{apiState.message}</p>
      </section>

      <section className="panel">
        <h2>Flow models</h2>
        <div className="model-grid">
          {FLOW_MODELS.map((model) => (
            <button
              key={model.id}
              type="button"
              className={`model-card ${selectedModelId === model.id ? 'active' : ''}`}
              onClick={() => setSelectedModelId(model.id)}
            >
              <strong>{model.label}</strong>
              <span>{model.description}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="panel split">
        <div>
          <h2>{selectedModel.label} input</h2>
          <p className="hint">Target endpoint: {selectedModel.endpoint}</p>
          <div className="input-grid">
            {selectedModel.fields.map((field) => (
              <label key={field.key}>
                {field.label}
                <input
                  type={field.type}
                  step={field.step}
                  value={values[field.key] ?? ''}
                  placeholder={field.placeholder}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      [field.key]: event.target.value,
                    }))
                  }
                />
              </label>
            ))}
          </div>
        </div>

        <div>
          <h2>Request preview</h2>
          <p className="hint">Send this payload when backend solver endpoints are ready.</p>
          <pre>{JSON.stringify(payload, null, 2)}</pre>

          <h3>Quick sample output</h3>
          {previewResults ? (
            <ul className="result-list">
              {Object.entries(previewResults).map(([label, value]) => (
                <li key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </li>
              ))}
            </ul>
          ) : (
            <p className="hint">Sample output is currently available for Isentropic Flow only.</p>
          )}
        </div>
      </section>
    </main>
  )
}

export default App
