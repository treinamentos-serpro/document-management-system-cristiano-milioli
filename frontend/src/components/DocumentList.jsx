import DownloadButton from './DownloadButton';

const formatSize = (size) => `${(size / 1024).toFixed(size < 1024 ? 1 : 0)} KB`;
const formatDate = (date) => new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(new Date(date));

export default function DocumentList({ documents, isLoading, owner, onDownloadError }) {
  return (
    <>
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
              <DownloadButton document={document} owner={owner} onError={onDownloadError} />
            </article>
          ))}
        </div>
      )}
    </>
  );
}