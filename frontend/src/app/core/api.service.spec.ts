import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApiService } from './api.service';

describe('ApiService', () => {
  let api: ApiService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(ApiService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('buscarAprendiz devuelve null con 404', async () => {
    const p = api.buscarAprendiz('123');
    http.expectOne(r => r.url === '/api/aprendices' && r.params.get('cedula') === '123')
      .flush({ error: 'no' }, { status: 404, statusText: 'Not Found' });
    expect(await p).toBeNull();
  });

  it('crearAutorizacion envía el body y devuelve la respuesta', async () => {
    const dto = { aprendizId: 1, vehiculoId: 2, direccion: 'ENTRADA' as const };
    const p = api.crearAutorizacion(dto);
    const req = http.expectOne('/api/autorizaciones');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(dto);
    req.flush({ autorizacionId: 9, url: 'http://x/acceso/t', expiraEn: 'z' });
    expect((await p).autorizacionId).toBe(9);
  });

  it('eventos usa el límite como parámetro', async () => {
    const p = api.eventos(20);
    const req = http.expectOne(r => r.url === '/api/eventos');
    expect(req.request.params.get('limite')).toBe('20');
    req.flush([]);
    expect(await p).toEqual([]);
  });
});
