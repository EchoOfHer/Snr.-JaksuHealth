import { useState, useRef } from 'react'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import Navbar from './components/Navbar'
import InputImagePanel from './components/InputImagePanel'
import ClinicalInfoPanel from './components/ClinicalInfoPanel'
import SampleGallery from './components/SampleGallery'
import AnalysisPanel from './components/AnalysisPanel'
import ReportTemplate from './components/ReportTemplate/ReportTemplate'
import { SAMPLES, parseFilename } from './services/sampleData'
import { analyzeImageFile, analyzeImageMock } from './services/api'
import { evaluateLesions } from './services/evaluation'
import './App.css'

function App() {
  const [selectedSample, setSelectedSample] = useState(SAMPLES[0])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [result, setResult] = useState(null)
  const [showOverlay, setShowOverlay] = useState(false)
  const [error, setError] = useState('')
  const reportRef = useRef(null)
  const metadata = selectedSample ? parseFilename(selectedSample.id) : null

  const handleDownloadPDF = async () => {
    if (!result || !reportRef.current || isExporting) return
    setIsExporting(true)
    setError('')
    try {
      const report = reportRef.current.querySelector('.report-container')
      await document.fonts.ready
      await Promise.all([...report.querySelectorAll('img')].map((img) => img.decode().catch(() => {})))
      const canvas = await html2canvas(report, { scale: 2, useCORS: true, windowWidth: 1200 })
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.98), 'JPEG', 0, 0, 210, 297)
      pdf.save(`JaksuHealth_Report_${metadata?.patientId || 'unknown'}.pdf`)
    } catch (err) {
      console.error('PDF export failed:', err)
      setError('Could not download the report. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  const handleSelectSample = (sample) => {
    if (isAnalyzing || isExporting) return
    setSelectedSample(sample)
    setResult(null)
    setShowOverlay(false)
    setError('')
  }

  const handleAnalyze = async () => {
    if (!selectedSample || isAnalyzing || isExporting) return
    setIsAnalyzing(true)
    setResult(null)
    setShowOverlay(false)
    setError('')
    try {
      const response = await fetch(selectedSample.img)
      if (!response.ok) throw new Error('Sample image could not be loaded')
      const blob = await response.blob()
      const file = new File([blob], `${selectedSample.id}.png`, { type: 'image/png' })
      let data
      try {
        data = await analyzeImageFile(file)
      } catch (err) {
        console.info('Server unavailable; showing explicitly labeled simulation:', err)
        data = { ...await analyzeImageMock(selectedSample.id, selectedSample.img), is_simulated: true, biomarker_image: null }
      }
      setResult({ ...data, lesions: evaluateLesions(data.lesions ?? [], selectedSample.groundTruth, data.is_simulated) })
      setShowOverlay(Boolean(data.biomarker_image))
    } catch (err) {
      console.error('Analysis failed:', err)
      setError('Could not analyze this sample. Please try again or select another image.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <div className="apple-app">
      <Navbar />
      <main className="content-container">
        <header className="page-intro"><h1>Retinal Image Analysis</h1><p>Automated fundus screening based on Beckman Clinical Classification</p></header>
        <div className="dual-grid">
          <section className="apple-card left-card" aria-labelledby="image-title">
            <div className="card-top">
              <h2 id="image-title">Image &amp; Mask</h2>
              <div className="image-toggle" role="group" aria-label="Image display">
                <button type="button" aria-pressed={!showOverlay} onClick={() => setShowOverlay(false)}>Original</button>
                <button type="button" aria-pressed={showOverlay} disabled={!result?.biomarker_image || isAnalyzing} onClick={() => setShowOverlay(true)}>Mask Overlay</button>
              </div>
            </div>
            <InputImagePanel sample={selectedSample} result={result} isAnalyzing={isAnalyzing} showOverlay={showOverlay} />
            <ClinicalInfoPanel metadata={metadata} />
            <SampleGallery samples={SAMPLES} selected={selectedSample} onSelect={handleSelectSample} disabled={isAnalyzing || isExporting} />
            <button type="button" className="apple-button primary" onClick={handleAnalyze} disabled={!selectedSample || isAnalyzing || isExporting}>{isAnalyzing ? 'Analyzing...' : 'Analyze Image'}</button>
          </section>
          <section className="apple-card right-card" aria-label="Instructions and analysis">
            <aside className="usage-guide" aria-labelledby="usage-title">
              <h2 id="usage-title">How to Use</h2>
              <ol className="usage-steps">
                <li><strong>Select a sample</strong><p>Choose from the sample images on the left.</p></li>
                <li><strong>Analyze image</strong><p>Run analysis and review the mask.</p></li>
                <li><strong>Review &amp; download</strong><p>Check the results and download a report.</p></li>
              </ol>
              <details className="usage-detail"><summary>Show instructions</summary><p>Choose a sample image, select Analyze Image, then review the mask and results. Select Download PDF Report to save a report.</p></details>
            </aside>
            <AnalysisPanel result={result} isAnalyzing={isAnalyzing} />
            {error && <p className="notice error-notice" role="alert">{error}</p>}
            <button type="button" className="apple-button secondary" onClick={handleDownloadPDF} disabled={!result || isAnalyzing || isExporting}>{isExporting ? 'Preparing report...' : 'Download PDF Report'}</button>
          </section>
        </div>
      </main>
      <div className="report-offscreen" ref={reportRef} aria-hidden="true">
        <ReportTemplate patientId={metadata?.patientId || 'N/A'} eyeLaterality={metadata?.eye || 'N/A'}
          lesions={result?.lesions || []} severity={result?.severity || '—'} confidence={result?.confidence ?? '—'}
          imageBase64={selectedSample?.img || ''} maskBase64={result?.biomarker_image || ''}
          simulated={result?.is_simulated} approximate={result?.mm_conversion_approximate} />
      </div>
    </div>
  )
}

export default App
