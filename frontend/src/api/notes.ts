import { apiClient } from './client';
import { Note } from '../types';

export async function listNotes(limit?: number): Promise<Note[]> {
  const res = await apiClient.get('/notes', { params: limit ? { limit } : undefined });
  return res.data;
}

export async function createNote(data: { content: string; color?: string }): Promise<Note> {
  const res = await apiClient.post('/notes', data);
  return res.data;
}

export async function updateNote(id: string, data: { content?: string; color?: string }): Promise<Note> {
  const res = await apiClient.patch(`/notes/${id}`, data);
  return res.data;
}

export async function deleteNote(id: string): Promise<void> {
  await apiClient.delete(`/notes/${id}`);
}
