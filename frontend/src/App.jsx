import { useEffect, useState } from 'react';
import DocumentList from './components/DocumentList';
import UploadComponent from './components/UploadComponent';
import { listDocuments, uploadDocument } from './services/documentService';

const initialOwner = 'user-123';

export default function App() {
  const [owner, setOwner] = useState(initialOwner);
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const refreshDocuments = async (currentOwner = owner) => {
    if (!currentOwner.trim()) {
      setDocuments([]);
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      setDocuments(await listDocuments(currentOwner.trim()));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsLoading(false);
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

    setIsLoading(true);
    setError('');
    setMessage('');
    try {
      await uploadDocument(file, owner.trim());
      setMessage('Documento enviado com sucesso.');
      await refreshDocuments();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsLoading(false);
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

        <UploadComponent isLoading={isLoading} onUpload={handleUpload} />

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

