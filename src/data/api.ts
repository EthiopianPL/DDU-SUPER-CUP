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
