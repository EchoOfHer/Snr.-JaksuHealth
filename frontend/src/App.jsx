import { useState } from 'react'
import Navbar from './components/Navbar'
import SampleGallery from './components/SampleGallery'
import InputImagePanel from './components/InputImagePanel'
import ClinicalInfoPanel from './components/ClinicalInfoPanel'
import AnalysisPanel from './components/AnalysisPanel'
import { SAMPLES, parseFilename } from './services/sampleData'
import { analyzeImageMock /* swap to analyzeImage when Backend is ready */ } from './services/api'
import './App.css'

function App() {
  const [selectedSample, setSelectedSample] = useState(null)
  const [isAnalyzing, setIsAnalyzing]       = useState(false)
  const [result, setResult]                 = useState(null)

  const handleSelectSample = (sample) => {
    setSelectedSample(sample)
    setResult(null) // clear old result when selecting new image
  }

  const handleAnalyze = async () => {
    if (!selectedSample || isAnalyzing) return
    setIsAnalyzing(true)
    setResult(null)
    try {
      const data = await analyzeImageMock(selectedSample.id, selectedSample.img)
      setResult(data)
    } catch (err) {
      console.error('Analysis error:', err)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const metadata = selectedSample ? parseFilename(selectedSample.id) : null

  return (
    <div className="app">
      <Navbar />

      <div className="page-header">
        <h1 className="page-title">Retinal Image Analysis</h1>
        <p className="page-subtitle">
          Analyze fundus photographs for lesion distribution and structural density
        </p>
      </div>

      <div className="main-content">
        {/* ── LEFT COLUMN CARDS ── */}
        <div className="left-column">
          <SampleGallery
            samples={SAMPLES}
            selected={selectedSample}
            onSelect={handleSelectSample}
          />

          <InputImagePanel sample={selectedSample} />

          <ClinicalInfoPanel metadata={metadata} />
        </div>

        {/* ── RIGHT COLUMN CARDS ── */}
        <div className="right-column">
          <AnalysisPanel
            result={result}
            isAnalyzing={isAnalyzing}
            sample={selectedSample}
          />
        </div>

        {/* ── LEFT ACTION BUTTON ── */}
        <div className="left-action">
          <button
            type="button"
            className="action-btn analyze-btn"
            onClick={handleAnalyze}
            disabled={!selectedSample || isAnalyzing}
          >
            {isAnalyzing ? 'Analyzing...' : 'Analyze image'}
          </button>
        </div>

        {/* ── RIGHT ACTION BUTTON ── */}
        <div className="right-action">
          {result && (
            <button
              type="button"
              className="action-btn download-btn"
              onClick={() => alert('PDF export will be available once the Backend is connected.')}
            >
              Download PDF Report
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
