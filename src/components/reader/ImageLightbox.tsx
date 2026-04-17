import { useEffect } from 'react';
import styles from './ImageLightbox.module.css';

interface Props {
  src: string;
  onClose: () => void;
}

export function ImageLightbox({ src, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <img src={src} alt="" onClick={(e) => e.stopPropagation()} />
    </div>
  );
}
