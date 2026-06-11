import React from 'react';
import { MdClose } from 'react-icons/md';
import styles from './FishResultsModal.module.css';

const FishResultsModal = ({ fishInfo, image, onClose }) => {
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={handleOverlayClick}>
      <div className={styles.modalContent}>
        <button onClick={onClose} className={styles.closeButton} aria-label="Close modal">
          <MdClose />
        </button>
        <div className={styles.fishImageContainer}>
          <img src={URL.createObjectURL(image)} alt={fishInfo.fishName} className={styles.fishImage} />
        </div>
        <h2 className={styles.fishName}>{fishInfo.fishName}</h2>
        {fishInfo.joke && <p className={styles.fishJoke}>{fishInfo.joke}</p>}
        {fishInfo.aiStatus === 'demo' && (
          <p className={styles.fishJoke}>
            Live AI is temporarily unavailable, so this demo-safe result keeps the upload flow running.
          </p>
        )}

        <div className={styles.progressContainer}>
          <div className={styles.statRow}>
            <span className={styles.statLabel}>Rarity:</span>
            <span className={styles.statValue}>{fishInfo.rarityScore}/10</span>
          </div>
          <div className={styles.progressBar}>
            <div className={styles.progress} style={{width: `${fishInfo.rarityScore * 10}%`}}></div>
          </div>
        </div>

        <div className={styles.statRow}>
          <span className={styles.statLabel}>Weight:</span>
          <span className={styles.statValue}>{fishInfo.weight} grams</span>
        </div>
        <div className={styles.statRow}>
          <span className={styles.statLabel}>Length:</span>
          <span className={styles.statValue}>{fishInfo.length} cm</span>
        </div>
        <div className={styles.statRow}>
          <span className={styles.statLabel}>Date Caught:</span>
          <span className={styles.statValue}>{fishInfo.dateCaught}</span>
        </div>
        <div className={styles.statRow}>
          <span className={styles.statLabel}>Location:</span>
          <span className={styles.statValue}>{fishInfo.location}</span>
        </div>

        <h3 className={styles.sectionTitle}>Description</h3>
        <p className={styles.sectionContent}>{fishInfo.description}</p>
      </div>
    </div>
  );
};

export default FishResultsModal;
