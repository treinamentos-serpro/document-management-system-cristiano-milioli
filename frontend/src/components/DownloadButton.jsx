import { useState } from 'react';
import { downloadDocument } from '../services/documentService';

export default function DownloadButton({ document, owner, onError }) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const blob = await downloadDocument(document.id, owner);
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = document.originalName;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      onError(error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <button
      type="button"
      className="download-button"
      onClick={handleDownload}
      disabled={isDownloading}
      title={`Baixar ${document.originalName}`}
    >
      {isDownloading ? 'Baixando...' : 'Baixar'} <span aria-hidden="true">↓</span>
    </button>
  );
}