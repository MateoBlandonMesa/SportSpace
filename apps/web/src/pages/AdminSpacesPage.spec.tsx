import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ApiError, apiPatch, apiPost } from '../api/http';
import { useApiResource } from '../hooks/useApiResource';
import { AdminSpacesPage } from './AdminSpacesPage';

jest.mock('../hooks/useApiResource', () => ({ useApiResource: jest.fn() }));
jest.mock('../api/http', () => ({
  ...jest.requireActual<object>('../api/http'), apiPatch: jest.fn(), apiPost: jest.fn(),
}));
const resource = jest.mocked(useApiResource);
const post = jest.mocked(apiPost);
const patch = jest.mocked(apiPatch);
const space = {
  id: 's1', name: 'Cancha', type: 'pista', campus: 'Robledo', capacity: 20,
  usageRules: 'Usar tenis', imageUrl: '/spaces/old.jpg', isActive: true,
};

beforeEach(() => {
  jest.clearAllMocks();
  resource.mockReturnValue({ status: 'success', data: [space] });
});
function createForm() {
  return screen.getByRole('button', { name: 'Crear espacio' }).closest('form')!;
}
function fields(form: HTMLElement) {
  return within(form);
}
function fill(form: HTMLElement, imageUrl = '') {
  for (const [label, value] of [
    ['Nombre', ' Cancha nueva '], ['Tipo', ' pista '], ['Campus', ' Robledo '],
    ['Capacidad', '30'], ['Reglas de uso', ' Usar tenis '], ['Foto (opcional)', imageUrl],
  ]) {
    fireEvent.change(fields(form).getByLabelText(label), { target: { value } });
  }
}
function editForm() {
  fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
  return screen.getByRole('button', { name: 'Guardar cambios' }).closest('form')!;
}

describe('Space administration', () => {
  it('announces loading', () => {
    resource.mockReturnValue({ status: 'loading' }); render(<AdminSpacesPage />);
    expect(screen.getByRole('status').textContent).toContain('Cargando espacios');
  });
  it.each([403, 500])('explains catalogue error %s', (httpStatus) => {
    resource.mockReturnValue({ status: 'error', httpStatus, message: 'Servidor caído' });
    render(<AdminSpacesPage />);
    expect(screen.getByRole('alert').textContent).toContain(httpStatus === 403 ? 'personal autorizado' : 'Servidor caído');
  });
  it('keeps the create form available for an empty catalogue', () => {
    resource.mockReturnValue({ status: 'empty' }); render(<AdminSpacesPage />);
    expect(screen.getByText('Aún no hay espacios registrados.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Crear espacio' })).toBeTruthy();
  });
  it('validates before creating', () => {
    render(<AdminSpacesPage />);
    fireEvent.submit(createForm());
    expect(screen.getByRole('alert').textContent).toContain('nombre');
    expect(post).not.toHaveBeenCalled();
  });
  it.each(['', ' /spaces/new.jpg '])('creates a space with optional image %s and resets the form', async (image) => {
    post.mockResolvedValue({ ...space, name: 'Cancha nueva' });
    render(<AdminSpacesPage />);
    const form = createForm();
    fill(form, image);
    fireEvent.submit(form);
    expect(await screen.findByText('Cancha nueva quedó activo en el catálogo.')).toBeTruthy();
    const payload = { name: 'Cancha nueva', type: 'pista', campus: 'Robledo', capacity: 30, usageRules: 'Usar tenis', ...(image ? { imageUrl: '/spaces/new.jpg' } : {}) };
    expect(post).toHaveBeenCalledWith('/spaces', payload);
    expect((fields(form).getByLabelText('Nombre') as HTMLInputElement).value).toBe('');
    expect(resource).toHaveBeenCalledWith('/spaces', 1);
  });
  it('disables create fields while the request is pending and reports failures', async () => {
    let reject!: (reason: Error) => void;
    post.mockImplementationOnce(() => new Promise((_resolve, rejectPromise) => { reject = rejectPromise; }));
    render(<AdminSpacesPage />);
    const form = createForm(); fill(form);
    fireEvent.submit(form);
    expect((fields(form).getByLabelText('Nombre') as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Creando…' }) as HTMLButtonElement).disabled).toBe(true);
    await act(async () => { reject(new ApiError(403, 'Forbidden')); });
    expect(screen.getByRole('alert').textContent).toContain('personal autorizado');
    expect((fields(form).getByLabelText('Nombre') as HTMLInputElement).disabled).toBe(false);
    expect(resource).not.toHaveBeenCalledWith('/spaces', 1);
  });
  it('prepopulates edit fields and supports cancelling without saving', () => {
    render(<AdminSpacesPage />);
    const form = editForm();
    expect((fields(form).getByLabelText('Nombre') as HTMLInputElement).value).toBe('Cancha');
    expect((fields(form).getByLabelText('Foto (opcional)') as HTMLInputElement).value).toBe('/spaces/old.jpg');
    fireEvent.click(fields(form).getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('button', { name: 'Guardar cambios' })).toBeNull();
    expect(patch).not.toHaveBeenCalled();
  });
  it('rejects invalid edits', () => {
    render(<AdminSpacesPage />);
    const form = editForm();
    fireEvent.change(fields(form).getByLabelText('Capacidad'), { target: { value: '0' } });
    fireEvent.submit(form);
    expect(screen.getByRole('alert').textContent).toContain('capacidad');
    expect(patch).not.toHaveBeenCalled();
  });
  it.each(['', '/spaces/new.jpg'])('saves edits and handles image replacement/removal %s', async (image) => {
    patch.mockResolvedValue({ ...space, name: 'Cancha nueva' });
    render(<AdminSpacesPage />);
    const form = editForm(); fill(form, image);
    fireEvent.submit(form);
    expect(await screen.findByText('Se actualizó Cancha nueva.')).toBeTruthy();
    expect(patch).toHaveBeenCalledWith('/spaces/s1', {
      name: 'Cancha nueva', type: 'pista', campus: 'Robledo', capacity: 30,
      usageRules: 'Usar tenis', imageUrl: image || null,
    });
    expect(screen.queryByRole('button', { name: 'Guardar cambios' })).toBeNull();
    expect(resource).toHaveBeenCalledWith('/spaces', 1);
  });
  it('keeps the edit form and draft when saving fails', async () => {
    patch.mockRejectedValue(new ApiError(400, 'Invalid input'));
    resource.mockReturnValue({ status: 'success', data: [{ ...space, imageUrl: null }] });
    render(<AdminSpacesPage />);
    const form = editForm(); fill(form);
    fireEvent.submit(form);
    expect((await screen.findByRole('alert')).textContent).toContain('Revisa nombre');
    await waitFor(() => expect((screen.getByRole('button', { name: 'Guardar cambios' }) as HTMLButtonElement).disabled).toBe(false));
    expect((fields(form).getByLabelText('Nombre') as HTMLInputElement).value).toBe(' Cancha nueva ');
  });
  it.each([true, false])('changes active=%s to its opposite and refreshes', async (isActive) => {
    resource.mockReturnValue({ status: 'success', data: [{ ...space, isActive }] });
    patch.mockResolvedValue({ ...space, isActive: !isActive });
    render(<AdminSpacesPage />);
    fireEvent.click(screen.getByRole('button', { name: isActive ? 'Desactivar' : 'Activar' }));
    await waitFor(() => expect(resource).toHaveBeenCalledWith('/spaces', 1));
    expect(patch).toHaveBeenCalledWith('/spaces/s1', { isActive: !isActive });
    expect(screen.getByRole('status').textContent).toContain(isActive ? 'quedó inactivo' : 'volvió a estar activo');
  });
  it('reports activation errors without claiming success', async () => {
    patch.mockRejectedValue(new Error('offline'));
    render(<AdminSpacesPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Desactivar' }));
    expect((await screen.findByRole('alert')).textContent).toContain('conexión');
    expect(screen.queryByText(/quedó inactivo/)).toBeNull();
  });
});
