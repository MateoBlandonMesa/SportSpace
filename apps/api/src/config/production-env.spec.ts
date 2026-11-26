import { assertProductionSecrets } from './production-env';

describe('assertProductionSecrets', () => {
  const validProduction = {
    NODE_ENV: 'production',
    JWT_ACCESS_SECRET: 'access-secret-unique',
    JWT_REFRESH_SECRET: 'refresh-secret-unique',
    WEB_ORIGIN: 'https://sportspace.example',
    ADMIN_PASSWORD: 'NotTheDevPassword',
  };

  it('does nothing outside production', () => {
    expect(() =>
      assertProductionSecrets({
        NODE_ENV: 'development',
        JWT_ACCESS_SECRET: 'change-me-access-secret',
        WEB_ORIGIN: 'http://localhost:5173',
      }),
    ).not.toThrow();
  });

  it('accepts unique secrets and a public origin', () => {
    expect(() => assertProductionSecrets(validProduction)).not.toThrow();
  });

  it('rejects placeholder JWT secrets', () => {
    expect(() =>
      assertProductionSecrets({
        ...validProduction,
        JWT_ACCESS_SECRET: 'change-me-access-secret',
      }),
    ).toThrow(/JWT_ACCESS_SECRET/);
  });

  it('rejects identical access and refresh secrets', () => {
    expect(() =>
      assertProductionSecrets({
        ...validProduction,
        JWT_ACCESS_SECRET: 'same-secret',
        JWT_REFRESH_SECRET: 'same-secret',
      }),
    ).toThrow(/JWT_REFRESH_SECRET/);
  });

  it('rejects a loopback WEB_ORIGIN', () => {
    expect(() =>
      assertProductionSecrets({
        ...validProduction,
        WEB_ORIGIN: 'http://localhost:5173',
      }),
    ).toThrow(/WEB_ORIGIN/);
  });
  it.each(['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'WEB_ORIGIN'] as const)(
    'rejects a missing or whitespace-only %s',
    (key) => {
      expect(() => assertProductionSecrets({ ...validProduction, [key]: undefined })).toThrow(key);
      expect(() => assertProductionSecrets({ ...validProduction, [key]: '   ' })).toThrow(key);
    },
  );

  it.each([undefined, 'Admin1234'])('warns for an unsafe administrator password %s', (password) => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      assertProductionSecrets({ ...validProduction, ADMIN_PASSWORD: password });
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('ADMIN_PASSWORD'));
    } finally {
      warn.mockRestore();
    }
  });

});
