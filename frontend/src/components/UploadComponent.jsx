import { useRef, useState } from 'react';

export default function UploadComponent({ isLoading, onUpload }) {
  const formRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedFile) {
      return;
    }

    const uploaded = await onUpload(selectedFile);
    if (uploaded) {
      setSelectedFile(null);
      formRef.current?.reset();
    }
  };

  return (
    <form ref={formRef} className="upload-panel" onSubmit={handleSubmit}>
      <div>
        <p className="eyebrow">NOVO ARQUIVO</p>
        <h2>Adicionar documento</h2>
        <p>Arquivos de até 10 MB são armazenados localmente.</p>
      </div>
      <label className="file-picker" htmlFor="file">
        <span>{selectedFile ? selectedFile.name : 'Escolher arquivo'}</span>
        <input
          id="file"
          type="file"
          onChange={(event) => setSelectedFile(event.target.files[0] || null)}
        />
      </label>
      <button className="primary-button" type="submit" disabled={isLoading || !selectedFile}>
        {isLoading ? 'Enviando...' : 'Enviar documento'}
      </button>
    </form>
  );
}