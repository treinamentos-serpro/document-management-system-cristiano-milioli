const apiRequest = async (path, options = {}) => {
  const response = await fetch(`/api${path}`, options);
  const payload = response.headers.get('content-type')?.includes('application/json')
    ? await response.json()
    : null;

  if (!response.ok) {
    throw new Error(payload?.error?.message || 'Não foi possível concluir a operação.');
  }

  return { response, payload };
};

export const listDocuments = async (owner) => {
  const { payload } = await apiRequest('/documents', {
    headers: { 'x-user-id': owner },
  });
  return payload.documents;
};

export const uploadDocument = async (file, owner) => {
  const formData = new FormData();
  formData.append('file', file);
  const { payload } = await apiRequest('/upload', {
    method: 'POST',
    headers: { 'x-user-id': owner },
    body: formData,
  });
  return payload.document;
};

export const downloadDocument = async (id, owner) => {
  const { response } = await apiRequest(`/documents/${id}/download`, {
    headers: { 'x-user-id': owner },
  });
  return response.blob();
};