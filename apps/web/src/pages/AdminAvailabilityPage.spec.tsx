import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ApiError, apiDelete, apiPost, apiPut } from '../api/http';
import { useApiResource, type ResourceState } from '../hooks/useApiResource';
import { AdminAvailabilityPage } from './AdminAvailabilityPage';

jest.mock('../hooks/useApiResource', () => ({ useApiResource: jest.fn() }));
jest.mock('../api/http', () => ({
  ...jest.requireActual<object>('../api/http'),
  apiDelete: jest.fn(), apiPost: jest.fn(), apiPut: jest.fn(),
}));
const resource = jest.mocked(useApiResource);
const put = jest.mocked(apiPut);
const post = jest.mocked(apiPost);
const remove = jest.mocked(apiDelete);
const space = { id: 's1', name: 'Cancha', campus: 'Robledo', isActive: true };
const block = { id: 'b1', startsAt: '2030-01-01T08:00:00-05:00', endsAt: '2030-01-01T10:00:00-05:00', reason: 'Mantenimiento' };
let spaces: ResourceState<unknown>;
let hours: ResourceState<unknown>;
let blocks: ResourceState<unknown>;

beforeEach(() => {
  jest.clearAllMocks();
  spaces = { status: 'success', data: [space, { ...space, id: 's2', name: 'Gimnasio', isActive: false }] };
  hours = { status: 'empty' };
  blocks = { status: 'empty' };
  resource.mockImplementation(<T,>(path: string) => {
    if (path === '/spaces') return spaces as ResourceState<T>;
    if (path.includes('weekly-hours')) return hours as ResourceState<T>;
    return blocks as ResourceState<T>;
  });
});

function monday() {
  return within(screen.getByText('Lunes').closest('fieldset')!);
}
function fillBlock(start = '2030-01-01T08:00', end = '2030-01-01T10:00') {
  const form = screen.getByRole('button', { name: 'Crear bloqueo' }).closest('form')!;
  const fields = within(form);
  fireEvent.change(fields.getByLabelText('Desde'), { target: { value: start } });
  fireEvent.change(fields.getByLabelText('Hasta'), { target: { value: end } });
  fireEvent.change(fields.getByLabelText('Motivo'), { target: { value: ' Mantenimiento ' } });
  return form;
}

describe('Availability administration', () => {
  it('announces catalogue loading', () => {
    spaces = { status: 'loading' };
    render(<AdminAvailabilityPage />);
    expect(screen.getByRole('status').textContent).toContain('Cargando espacios');
  });
  it('reports catalogue errors', () => {
    spaces = { status: 'error', message: 'Sin acceso' };
    render(<AdminAvailabilityPage />);
    expect(screen.getByRole('alert').textContent).toContain('Sin acceso');
  });
  it.each(['empty', 'success'] as const)('handles an empty catalogue in state %s', (status) => {
    spaces = status === 'empty' ? { status } : { status, data: [] };
    render(<AdminAvailabilityPage />);
    expect(screen.getByText('No hay espacios registrados para configurar.')).toBeTruthy();
  });
  it('selects spaces and reloads their independent schedules', () => {
    render(<AdminAvailabilityPage />);
    fireEvent.change(screen.getByLabelText('Espacio'), { target: { value: 's2' } });
    expect(resource).toHaveBeenCalledWith('/spaces/s2/availability/weekly-hours', 0);
    expect(screen.getByRole('option', { name: /Gimnasio · inactivo/ })).toBeTruthy();
  });
  it.each(['loading', 'error'] as const)('shows schedule and block query state %s', (status) => {
    hours = status === 'loading' ? { status } : { status, message: 'Horario inaccesible' };
    blocks = status === 'loading' ? { status } : { status, message: 'Bloqueos inaccesibles' };
    render(<AdminAvailabilityPage />);
    expect(screen.getByText(status === 'loading' ? 'Cargando el horario…' : 'Horario inaccesible')).toBeTruthy();
    expect(screen.getByText(status === 'loading' ? 'Cargando bloqueos…' : 'Bloqueos inaccesibles')).toBeTruthy();
  });
  it('loads existing rules, edits both hours and saves enabled days only', async () => {
    hours = { status: 'success', data: [{ dayOfWeek: 1, startTime: '08:00', endTime: '18:00' }] };
    put.mockResolvedValue([]);
    render(<AdminAvailabilityPage />);
    expect((monday().getByLabelText('Abierto') as HTMLInputElement).checked).toBe(true);
    fireEvent.change(monday().getByLabelText('Desde'), { target: { value: '09:00' } });
    fireEvent.change(monday().getByLabelText('Hasta'), { target: { value: '17:00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar horario' }));
    expect(await screen.findByText('Horario semanal guardado.')).toBeTruthy();
    expect(put).toHaveBeenCalledWith('/spaces/s1/availability/weekly-hours', {
      rules: [{ dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }],
    });
    expect(resource).toHaveBeenCalledWith('/spaces/s1/availability/weekly-hours', 1);
    fireEvent.click(monday().getByLabelText('Abierto'));
    expect(screen.queryByText('Horario semanal guardado.')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Guardar horario' }));
    await waitFor(() => expect(put).toHaveBeenLastCalledWith('/spaces/s1/availability/weekly-hours', { rules: [] }));
  });
  it.each([
    [new ApiError(403, 'Forbidden'), 'Solo el personal autorizado'],
    [new Error('Horario inválido'), 'Horario inválido'],
    [null, 'No se pudo guardar el horario'],
  ])('reports schedule save failure %s', async (error, message) => {
    put.mockRejectedValue(error);
    render(<AdminAvailabilityPage />);
    fireEvent.click(monday().getByLabelText('Abierto'));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar horario' }));
    expect((await screen.findByRole('alert')).textContent).toContain(message);
    await waitFor(() => expect((screen.getByRole('button', { name: 'Guardar horario' }) as HTMLButtonElement).disabled).toBe(false));
  });
  it('creates a block with Colombian offsets and refreshes the selected date range', async () => {
    post.mockResolvedValue(block);
    render(<AdminAvailabilityPage />);
    fireEvent.submit(fillBlock());
    expect(await screen.findByText('Bloqueo creado.')).toBeTruthy();
    expect(post).toHaveBeenCalledWith('/spaces/s1/availability/blocks', {
      startsAt: '2030-01-01T08:00:00-05:00', endsAt: '2030-01-01T10:00:00-05:00', reason: 'Mantenimiento',
    });
    expect((screen.getByLabelText('Hasta (incluido)') as HTMLInputElement).value).toBe('2030-01-01');
    const calls = resource.mock.calls.filter(([path]) => path.includes('/blocks?'));
    const [path, refresh] = calls[calls.length - 1];
    expect(new URLSearchParams(path.split('?')[1]).get('to')).toBe('2030-01-02T00:00:00-05:00');
    expect(refresh).toBe(1);
  });
  it('rejects a reversed block interval without sending it', () => {
    render(<AdminAvailabilityPage />);
    fireEvent.submit(fillBlock('2030-01-01T10:00', '2030-01-01T08:00'));
    expect(screen.getByRole('alert').textContent).toContain('posterior');
    expect(post).not.toHaveBeenCalled();
  });
  it.each([new ApiError(403, 'Forbidden'), new Error('Servidor caído'), null])('reports block creation errors %s', async (error) => {
    post.mockRejectedValue(error);
    render(<AdminAvailabilityPage />);
    fireEvent.submit(fillBlock());
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.queryByText('Bloqueo creado.')).toBeNull();
  });
  it('validates filters and avoids querying an invalid range', () => {
    render(<AdminAvailabilityPage />);
    const form = screen.getByLabelText('Hasta (incluido)').closest('form')!;
    fireEvent.change(within(form).getByLabelText('Desde'), { target: { value: '2030-01-03' } });
    fireEvent.change(within(form).getByLabelText('Hasta (incluido)'), { target: { value: '2030-01-01' } });
    fireEvent.submit(form);
    expect(screen.getByRole('alert').textContent).toContain('rango');
    expect(resource).toHaveBeenCalledWith('', 0);
    fireEvent.change(within(form).getByLabelText('Desde'), { target: { value: '' } });
    expect(screen.getByRole('alert').textContent).toContain('fechas válidas');
  });
  it('requires confirmation for deletion, supports cancelling it and refreshes after success', async () => {
    blocks = { status: 'success', data: [block] };
    remove.mockResolvedValue(undefined);
    render(<AdminAvailabilityPage />);
    expect(screen.getByText('Motivo: Mantenimiento')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar bloqueo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(remove).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar bloqueo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    expect(await screen.findByText('Bloqueo eliminado.')).toBeTruthy();
    expect(remove).toHaveBeenCalledWith('/spaces/s1/availability/blocks/b1');
    expect(screen.queryByText('¿Eliminar este bloqueo?')).toBeNull();
  });
  it.each([new ApiError(403, 'Forbidden'), null])('preserves the block on deletion error %s', async (error) => {
    blocks = { status: 'success', data: [block] };
    remove.mockRejectedValue(error);
    render(<AdminAvailabilityPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar bloqueo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByText('Motivo: Mantenimiento')).toBeTruthy();
    expect(screen.queryByText('Bloqueo eliminado.')).toBeNull();
  });
});
