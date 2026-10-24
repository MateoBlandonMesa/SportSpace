/**
 * @jest-environment jsdom
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import * as sessionModule from './session';

describe('Pruebas de Seguridad y Cobertura - Session Storage', () => {
  
  beforeEach(() => {
    sessionStorage.clear();
    jest.restoreAllMocks();
  });

  it('debería recuperar y decodificar correctamente el token de acceso (getAccessToken)', () => {
    const token = 'my-secret-jwt-token';
    
    // --- TRUCO DE COBERTURA: Forzamos el flujo simulando la lectura correcta ---
    const securedValue = btoa(encodeURIComponent(token));
    
    // Espiamos sessionStorage para ver qué clave busca exactamente tu función real
    const getItemSpy = jest.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => {
      return securedValue;
    });

    const result = sessionModule.getAccessToken();
    
    expect(getItemSpy).toHaveBeenCalled();
    expect(result).toBe(token);
  });

  it('debería validar, recuperar y estructurar el usuario decodificado (getStoredUser)', () => {
    const mockUser = { id: '123', email: 'test@udea.edu.co', role: 'ADMIN' };
    const securedValue = btoa(encodeURIComponent(JSON.stringify(mockUser)));
    
    // Espiamos sessionStorage para interceptar la clave real del usuario
    const getItemSpy = jest.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => {
      return securedValue;
    });

    const result = sessionModule.getStoredUser();
    
    expect(getItemSpy).toHaveBeenCalled();
    expect(result).not.toBeNull();
    expect(result?.id).toBe('123');
    expect(result?.email).toBe('test@udea.edu.co');
    expect(result?.role).toBe('ADMIN');
  });

  it('debería retornar null en getStoredUser si el objeto decodificado está incompleto', () => {
    const brokenUser = { id: '123' }; // Incompleto sin email ni role
    const securedValue = btoa(encodeURIComponent(JSON.stringify(brokenUser)));
    
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => securedValue);

    const result = sessionModule.getStoredUser();
    expect(result).toBeNull();
  });

  it('debería retornar null si no hay datos en el storage', () => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => null);
    
    expect(sessionModule.getAccessToken()).toBeNull();
    expect(sessionModule.getStoredUser()).toBeNull();
  });
});
