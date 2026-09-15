import { useEffect, useRef, useState } from 'react';
import DocumentList from './components/DocumentList';
import UploadComponent from './components/UploadComponent';
import { listDocuments, uploadDocument } from './services/documentService';

const initialOwner = 'user-123';

export default function App() {
  const [owner, setOwner] = useState(initialOwner);
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const requestVersion = useRef(0);

  const refreshDocuments = async (currentOwner = owner) => {
    const normalizedOwner = currentOwner.trim();
    const version = ++requestVersion.current;
    if (!normalizedOwner) {
      setDocuments([]);
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      const nextDocuments = await listDocuments(normalizedOwner);
      if (version === requestVersion.current) {
        setDocuments(nextDocuments);
      }
    } catch (requestError) {
      if (version === requestVersion.current) {
        setError(requestError.message);
      }
    } finally {
      if (version === requestVersion.current) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    refreshDocuments();
  }, []);

  const handleUpload = async (file) => {
    if (!owner.trim()) {
      setError('Informe o usuário antes de enviar um arquivo.');
      return;
    }

    setIsUploading(true);
    setError('');
    setMessage('');
    try {
      await uploadDocument(file, owner.trim());
      setMessage('Documento enviado com sucesso.');
      await refreshDocuments();
      return true;
    } catch (requestError) {
      setError(requestError.message);
      return false;
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <main className="app-shell">
      <section className="hero">
        <p className="eyebrow">DMS / DOCUMENTOS LOCAIS</p>
        <h1>Seus documentos,<br /><em>em ordem.</em></h1>
        <p className="intro">Envie, encontre e baixe seus arquivos em um espaço simples e controlado.</p>
      </section>

      <section className="workspace" aria-label="Gerenciador de documentos">
        <div className="toolbar">
          <label htmlFor="owner">Usuário</label>
          <input id="owner" value={owner} onChange={(event) => setOwner(event.target.value)} onBlur={() => refreshDocuments()} />
          <button type="button" className="quiet-button" onClick={() => refreshDocuments()} disabled={isLoading}>Atualizar lista</button>
        </div>

        <UploadComponent isLoading={isUploading} onUpload={handleUpload} />

        {message && <p className="status success" role="status">{message}</p>}
        {error && <p className="status failure" role="alert">{error}</p>}

        <DocumentList
          documents={documents}
          isLoading={isLoading}
          owner={owner.trim()}
          onDownloadError={(downloadError) => setError(downloadError.message)}
        />
      </section>
    </main>
  );
}

