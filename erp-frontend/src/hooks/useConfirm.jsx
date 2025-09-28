import { useCallback, useRef, useState, useEffect } from 'react';
import ConfirmModal from '../components/ConfirmModal';

export default function useConfirm() {
  const [opts, setOpts] = useState(null);
  const resolverRef = useRef(null);

  const open = useCallback((options = {}) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setOpts({
        title: options.title || 'Confirmar',
        message: options.message || '',
        confirmLabel: options.confirmLabel || 'Confirmar',
        cancelLabel: options.cancelLabel || 'Cancelar',
      });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    if (resolverRef.current) resolverRef.current(true);
    resolverRef.current = null;
    setOpts(null);
  }, []);

  const handleCancel = useCallback(() => {
    if (resolverRef.current) resolverRef.current(false);
    resolverRef.current = null;
    setOpts(null);
  }, []);

  // cleanup on unmount: resolve false if pending
  useEffect(() => {
    return () => {
      if (resolverRef.current) {
        resolverRef.current(false);
        resolverRef.current = null;
      }
    };
  }, []);

  const ConfirmElement = (
    <ConfirmModal
      open={!!opts}
      title={opts?.title}
      message={opts?.message}
      confirmLabel={opts?.confirmLabel}
      cancelLabel={opts?.cancelLabel}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  );

  return [open, ConfirmElement];
}
