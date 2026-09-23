export default function InputImagePanel({ sample }) {
  return (
    <div className="canvas-frame">
      {sample ? (
        <img src={sample.img} alt={sample.id} className="retina-image" />
      ) : (
        <div className="empty-canvas">
          <span>Select an image to preview</span>
        </div>
      )}
    </div>
  )
}
