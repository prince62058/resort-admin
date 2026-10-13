let csrf = '';
export function setCsrf(value) {
  csrf = value;
}
export async function api(path, options = {}) {
  const response = await fetch('/api/admin' + path, {
    ...options,
    headers: {
      'X-CMS-Request': '1',
      'X-CSRF-Token': csrf,
      ...(options.body && !options.binary ? {
        'Content-Type': 'application/json'
      } : {}),
      ...options.headers
    },
    body: options.body && !options.binary ? JSON.stringify(options.body) : options.body
  });
  const data = await response.json().catch(() => ({
    error: 'The server returned an unexpected response.'
  }));
  if (!response.ok) {
    const error = new Error(data.error || 'Request failed.');
    error.status = response.status;
    throw error;
  }
  if (data.csrf) setCsrf(data.csrf);
  return data;
}
