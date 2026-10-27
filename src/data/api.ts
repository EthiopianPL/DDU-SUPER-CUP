import { applySnapshot, type Snapshot } from './live';

export async function desk(path: string, options: { method?: string; body?: unknown } = {}) {
  const response = await fetch(path, {
    method: options.method ?? (options.body === undefined ? 'GET' : 'POST'),
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', 'X-DDU-Request': '1' },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const data = await response.json().catch(() => ({}));
  if (data.snapshot) applySnapshot(data.snapshot as Snapshot);
  if (!response.ok) throw new Error(data.error || 'The server rejected that.');
  return data;
}

export function imagePayload(file: File) {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
    return Promise.reject(new Error('Upload a PNG, JPEG, or WebP image.'));
  }
  if (file.size > 1_500_000) return Promise.reject(new Error('That image is larger than 1.5 MB.'));
  return new Promise<{ contentType: string; data: string }>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? '');
      resolve({ contentType: file.type, data: text.slice(text.indexOf(',') + 1) });
    };
    reader.onerror = () => reject(new Error('Could not read that image.'));
    reader.readAsDataURL(file);
  });
}

export async function uploadImage(path: string, file: File) {
  const response = await fetch(path, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': file.type || 'application/octet-stream', 'X-DDU-Request': '1' },
    body: file,
  });
  const data = await response.json().catch(() => ({}));
  if (data.snapshot) applySnapshot(data.snapshot as Snapshot);
  if (!response.ok) throw new Error(data.error || 'The image was not saved.');
  return data;
}
