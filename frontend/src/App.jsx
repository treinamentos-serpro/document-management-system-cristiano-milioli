import { useEffect, useState } from 'react';
import {
  downloadDocument,
  listDocuments,
  uploadDocument,
} from './services/documentService';

const initialOwner = 'user-123';

export default function App() {
  const [owner, setOwner] = useState(initialOwner);
  const [documents, setDocuments] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
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

  const handleUpload = async (event) => {
    event.preventDefault();
    if (!selectedFile || !owner.trim()) {
      setError('Informe o usuário e selecione um arquivo.');
      return;
    }

    setIsLoading(true);
    setError('');
    setMessage('');
    try {
      await uploadDocument(selectedFile, owner.trim());
      setSelectedFile(null);
      event.target.reset();
      setMessage('Documento enviado com sucesso.');
      await refreshDocuments();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (document) => {
    setError('');
    try {
      const blob = await downloadDocument(document.id, owner.trim());
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = document.originalName;
      link.click();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(requestError.message);
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

        <form className="upload-panel" onSubmit={handleUpload}>
          <div>
            <p className="eyebrow">NOVO ARQUIVO</p>
            <h2>Adicionar documento</h2>
            <p>Arquivos de até 10 MB são armazenados localmente.</p>
          </div>
          <label className="file-picker" htmlFor="file">
            <span>{selectedFile ? selectedFile.name : 'Escolher arquivo'}</span>
            <input id="file" type="file" onChange={(event) => setSelectedFile(event.target.files[0] || null)} />
          </label>
          <button className="primary-button" type="submit" disabled={isLoading || !selectedFile}>
            {isLoading ? 'Enviando...' : 'Enviar documento'}
          </button>
        </form>

        {message && <p className="status success" role="status">{message}</p>}
        {error && <p className="status failure" role="alert">{error}</p>}

        <div className="list-header">
          <div>
            <p className="eyebrow">ARQUIVO LOCAL</p>
            <h2>Documentos recentes</h2>
          </div>
          <span className="count">{documents.length} {documents.length === 1 ? 'item' : 'itens'}</span>
        </div>

        {isLoading && documents.length === 0 && <p className="empty-state">Carregando documentos...</p>}
        {!isLoading && documents.length === 0 && <p className="empty-state">Nenhum documento enviado para este usuário.</p>}
        {documents.length > 0 && (
          <div className="document-list">
            {documents.map((document) => (
              <article className="document-row" key={document.id}>
                <div className="file-mark">DOC</div>
                <div className="document-info">
                  <strong>{document.originalName}</strong>
                  <span>{formatSize(document.size)} · {formatDate(document.uploadedAt)}</span>
                </div>
                <button type="button" className="download-button" onClick={() => handleDownload(document)} title={`Baixar ${document.originalName}`}>
                  Baixar <span aria-hidden="true">↓</span>
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

const formatSize = (size) => `${(size / 1024).toFixed(size < 1024 ? 1 : 0)} KB`;
const formatDate = (date) => new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(new Date(date));
