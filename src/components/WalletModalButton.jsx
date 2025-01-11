import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { XMarkIcon } from '@heroicons/react/24/outline';

export const WalletModalButton = () => {
  const { visible, setVisible } = useWalletModal();

  const handleClose = () => {
    setVisible(false);
  };

  return (
    <>
      {visible && (
        <button
          onClick={handleClose}
          className="wallet-adapter-modal-close-button"
          aria-label="Close"
        >
          <XMarkIcon className="h-6 w-6" />
        </button>
      )}
    </>
  );
}; 