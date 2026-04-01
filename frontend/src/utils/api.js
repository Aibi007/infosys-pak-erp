const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://infosys-pak-erp-production-74cb.up.railway.app/api/v1';

export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('token');

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  };

  const response = await fetch(`${API_BASE_URL}${path}`, config);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'An unexpected error occurred.' }));
    throw new Error(errorData.message || `API request failed with status ${response.status}`);
  }

  // For 204 No Content, we can return a success indicator
  if (response.status === 204) {
    return { success: true };
  }

  return response.json();
}
