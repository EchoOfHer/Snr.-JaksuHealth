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
import { analyzeImageWithFallback } from './services/api'
import './App.css'

function App() {
  const [selectedSample, setSelectedSample] = useState(SAMPLES[0])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [result, setResult] = useState(null)
  const reportRef = useRef(null)

  // ฟังก์ชันสำหรับดาวน์โหลด PDF (ใช้ jsPDF + html2canvas ตรงๆ เพื่อบังคับ 1 หน้า)
  const handleDownloadPDF = async () => {
    const wrapper = reportRef.current
    if (!wrapper) return

    // ขั้นที่ 1: คลี่ Report ออกมาชั่วคราว
    wrapper.style.height = 'auto'
    wrapper.style.overflow = 'visible'

    // บังคับความสูงของเนื้อหาให้เท่ากับ A4 (297mm ที่ 96dpi ≈ 1123px)
    const A4_HEIGHT_PX = 1123
    const reportEl = wrapper.querySelector('.report-container')
    if (reportEl) {
      reportEl.style.height = A4_HEIGHT_PX + 'px'
      reportEl.style.maxHeight = A4_HEIGHT_PX + 'px'
      reportEl.style.overflow = 'hidden'
    }

    try {
      // ขั้นที่ 2: ถ่ายรูปด้วย html2canvas
      const canvas = await html2canvas(reportEl, {
        scale: 2, 
        useCORS: true,
        height: A4_HEIGHT_PX,
        windowHeight: A4_HEIGHT_PX
      })

      // ขั้นที่ 3: เอาภาพที่ถ่ายได้มาวางลงใน PDF (ขนาด A4 เป๊ะๆ 1 หน้า)
      const imgData = canvas.toDataURL('image/jpeg', 0.98)
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })
      
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight)
      
      // ตั้งชื่อไฟล์ตาม Patient ID
      const filename = `JaksuHealth_Report_${metadata?.patientId || 'unknown'}.pdf`
      pdf.save(filename)

    } catch (err) {
      console.error("PDF Generation Error: ", err)
    } finally {
      // ขั้นที่ 4: พับเก็บซ่อนกลับไปเหมือนเดิม
      wrapper.style.height = '0'
      wrapper.style.overflow = 'hidden'
      if (reportEl) {
        reportEl.style.height = ''
        reportEl.style.maxHeight = ''
        reportEl.style.overflow = ''
      }
    }
  }

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
              onClick={handleDownloadPDF}
              disabled={!result || isAnalyzing}
            >
              Download PDF Report
            </button>
          </section>
        </div>
      </main>

      {/* ReportTemplate ซ่อนไว้นอกจอ เพื่อให้ html2pdf มาถ่ายรูปตอนกดปุ่ม */}
      <div className="report-offscreen" ref={reportRef}>
        <ReportTemplate
          patientId={metadata?.patientId || 'N/A'}
          eyeLaterality={metadata?.eye || 'N/A'}
          findings={result?.findings || { Drusen: 1500, Exudates: 820, Hemorrhages: 340 }}
          imageBase64={selectedSample?.img || ''}
          maskBase64={result?.mask_base64 || ''}
        />
      </div>
    </div>
  )
}

export default App
