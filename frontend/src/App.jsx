import { useState } from 'react'
import Navbar from './components/Navbar'
import InputImagePanel from './components/InputImagePanel'
import ClinicalInfoPanel from './components/ClinicalInfoPanel'
import SampleGallery from './components/SampleGallery'
import AnalysisPanel from './components/AnalysisPanel'
import { SAMPLES, parseFilename } from './services/sampleData'
import { analyzeImageWithFallback } from './services/api'
import './App.css'

function App() {
  const [selectedSample, setSelectedSample] = useState(SAMPLES[0])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [result, setResult] = useState(null)

  const handleSelectSample = (sample) => {
    setSelectedSample(sample)
    setResult(null)
  }

  const handleAnalyze = async () => {
    if (!selectedSample || isAnalyzing) return
    setIsAnalyzing(true)
    setResult(null)
    try {
      const data = await analyzeImageWithFallback(selectedSample.id, selectedSample.img)
      setResult(data)
    } catch (err) {
      console.error('Analysis error:', err)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const metadata = selectedSample ? parseFilename(selectedSample.id) : null

  return (
    <div className="apple-app">
      <Navbar />

      <main className="content-container">
        {/* Title */}
        <header className="page-intro">
          <h1 className="main-title">Retinal Image Analysis</h1>
          <p className="main-subtitle">Automated fundus screening based on Beckman Clinical Classification</p>
        </header>

        {/* Dual Workstation: 2 Elegant Cards */}
        <div className="dual-grid">
          {/* ── LEFT: SOURCE WORKSTATION ── */}
          <section className="apple-card left-card">
            <div className="card-top">
              <span className="card-title">Source Image</span>
            </div>

            <InputImagePanel sample={selectedSample} />

            <ClinicalInfoPanel metadata={metadata} />

            <SampleGallery
              samples={SAMPLES}
              selected={selectedSample}
              onSelect={handleSelectSample}
            />

            <button
              type="button"
              className="apple-button primary"
              onClick={handleAnalyze}
              disabled={!selectedSample || isAnalyzing}
            >
              {isAnalyzing ? 'Analyzing...' : 'Analyze Image'}
            </button>
          </section>

          {/* ── RIGHT: DIAGNOSTIC FINDINGS ── */}
          <section className="apple-card right-card">
            <div className="card-top">
              <span className="card-title">Analysis</span>
            </div>

            <AnalysisPanel
              result={result}
              isAnalyzing={isAnalyzing}
              sample={selectedSample}
            />

            <button
              type="button"
              className="apple-button secondary"
              onClick={() => {
                if (result) {
                  alert('PDF export will be available once backend is connected.')
                }
              }}
              disabled={!result || isAnalyzing}
            >
              Download PDF Report
            </button>
          </section>
        </div>
      </main>
    </div>
  )
}

export default App
