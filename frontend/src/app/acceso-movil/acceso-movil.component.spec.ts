import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AccesoMovilComponent } from './acceso-movil.component';
import { ApiService } from '../core/api.service';
import { TiempoRealService } from '../core/tiempo-real.service';
import { TiempoRealFalso } from '../core/pruebas';

const confirmacion = { autorizacionId: 7, direccion: 'ENTRADA', aprendiz: { nombre: 'Fabio Zorro' }, vehiculo: { placa: 'ABC123' } };

async function montar(confirmar: () => Promise<unknown>) {
  const rt = new TiempoRealFalso();
  const api = { confirmarToken: vi.fn(confirmar) };
  TestBed.configureTestingModule({
    imports: [AccesoMovilComponent],
    providers: [
      { provide: ApiService, useValue: api }, { provide: TiempoRealService, useValue: rt },
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map([['token', 'tok-123']]) } } },
    ],
  });
  const f = TestBed.createComponent(AccesoMovilComponent);
  await f.whenStable(); await f.whenStable();
  return { f, api, rt, el: f.nativeElement as HTMLElement };
}
const falla = (status: number, motivo: string) => () => Promise.reject(new HttpErrorResponse({ status, error: { motivo } }));

describe('AccesoMovilComponent', () => {
  it('llama a confirmarToken una sola vez con el token de la ruta', async () => {
    const { f, api, rt } = await montar(() => Promise.resolve(confirmacion));
    rt.emitir('autorizacion:cambio', { autorizacionId: 7, estado: 'AUTORIZADA', direccion: 'ENTRADA' });
    await f.whenStable();
    expect(api.confirmarToken).toHaveBeenCalledTimes(1);
    expect(api.confirmarToken).toHaveBeenCalledWith('tok-123');
  });

  it('muestra el nombre, la placa y la dirección', async () => {
    const { el } = await montar(() => Promise.resolve(confirmacion));
    expect(el.textContent).toContain('Hola Fabio Zorro');
    expect(el.textContent).toContain('ABC123');
    expect(el.textContent).toContain('ENTRADA');
    expect(el.textContent).toContain('SENA SMART PARK');
  });

  it('muestra el aviso de código vencido ante 410 TOKEN_EXPIRADO', async () => {
    const { el } = await montar(falla(410, 'TOKEN_EXPIRADO'));
    expect(el.textContent).toContain('El código venció, pida otro al celador');
  });

  it('muestra "ya se usó" ante TOKEN_USADO', async () => {
    const { el } = await montar(falla(410, 'TOKEN_USADO'));
    expect(el.textContent).toContain('Este código ya se usó');
  });

  it('ante un token inválido muestra un mensaje genérico sin detalles', async () => {
    const { el } = await montar(falla(404, 'TOKEN_INVALIDO'));
    expect(el.textContent).toContain('Código no válido');
    expect(el.textContent).not.toContain('TOKEN_INVALIDO');
  });

  it('actualiza el texto de estado con autorizacion:cambio de su autorizacionId y ignora otros', async () => {
    const { f, rt, el } = await montar(() => Promise.resolve(confirmacion));
    rt.emitir('autorizacion:cambio', { autorizacionId: 99, estado: 'BARRERA_ABIERTA', direccion: 'ENTRADA' });
    await f.whenStable();
    expect(el.textContent).not.toContain('Barrera abierta, pase');
    rt.emitir('autorizacion:cambio', { autorizacionId: 7, estado: 'BARRERA_ABIERTA', direccion: 'ENTRADA' });
    await f.whenStable();
    expect(el.textContent).toContain('Barrera abierta, pase');
  });

  it('muestra "Registrado" cuando el estado es FINALIZADA', async () => {
    const { f, rt, el } = await montar(() => Promise.resolve(confirmacion));
    rt.emitir('autorizacion:cambio', { autorizacionId: 7, estado: 'FINALIZADA', direccion: 'ENTRADA' });
    await f.whenStable();
    expect(el.textContent).toContain('Registrado');
  });
});
