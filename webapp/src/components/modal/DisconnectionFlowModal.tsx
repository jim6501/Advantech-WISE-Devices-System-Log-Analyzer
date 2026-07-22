import flowImage from '../../assets/disconnection-flow.png';

export function DisconnectionFlowModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <span className="modal-close" onClick={onClose}>
          &times;
        </span>
        <img src={flowImage} alt="Disconnection Flow" />
        <p className="modal-caption">WISE-4000 Disconnection Flow</p>
      </div>
    </div>
  );
}
