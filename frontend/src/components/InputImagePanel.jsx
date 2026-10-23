import { LESION_CLASSES, imageSource } from '../services/evaluation'

export default function InputImagePanel({ sample, result, isAnalyzing, showOverlay }) {
  const overlay = imageSource(result?.biomarker_image)
  return (
    <>
      <div className="canvas-frame" aria-busy={isAnalyzing}>
        {sample ? <img src={showOverlay && overlay ? overlay : sample.img}
          alt={showOverlay && overlay ? 'Retinal image with AI mask overlay' : `Original retinal image: ${sample.id}`}
          className="retina-image" /> : <p className="empty-canvas">Select an image to preview</p>}
        {isAnalyzing && <div className="analysis-scrim" role="status"><div className="apple-spinner" /><p>Analyzing retina...</p></div>}
      </div>
      <div className="mask-legend" aria-label="Mask colors">
        {LESION_CLASSES.map((item) => <span key={item.type}><i className="color-dot" style={{ backgroundColor: item.color }} />{item.type}</span>)}
      </div>
    </>
  )
}
