import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { AutorizacionQrComponent } from './autorizacion-qr.component';
import { ApiService } from '../../core/api.service';
import { QrService } from '../../core/qr.service';
import { TiempoRealService } from '../../core/tiempo-real.service';
import { TiempoRealFalso } from '../../core/pruebas';

const sel = {
  aprendiz: { id: 1, cedula: '1', nombre: 'Fabio Zorro', ficha: null, programa: null, jornada: null, activo: true },
  vehiculo: { id: 2, aprendiz_id: 1, placa: 'ABC123', tipo: 'CARRO', marca: null, color: null, activo: true },
  direccion: 'ENTRADA' as const,
};

async function montar(crear: () => Promise<unknown>) {
  const rt = new TiempoRealFalso();
  const api = { crearAutorizacion: vi.fn(crear) };
  TestBed.configureTestingModule({
    imports: [AutorizacionQrComponent],
    providers: [
      { provide: ApiService, useValue: api },
      { provide: QrService, useValue: { generar: vi.fn().mockResolvedValue('data:image/png;base64,AAA') } },
      { provide: TiempoRealService, useValue: rt },
    ],
  });
  const f = TestBed.createComponent(AutorizacionQrComponent);
  f.componentRef.setInput('seleccion', sel);
  await f.whenStable(); await f.whenStable();
  return { f, el: f.nativeElement as HTMLElement, rt, api };
}
const ok = () => Promise.resolve({ autorizacionId: 7, url: 'http://x/acceso/t', expiraEn: new Date(Date.now() + 60000).toISOString() });

describe('AutorizacionQrComponent', () => {
  it('muestra el QR y la cuenta regresiva tras crear la autorización', async () => {
    const { el } = await montar(ok);
    expect(el.querySelector('img')?.getAttribute('src')).toContain('data:image/png');
    expect(el.textContent).toContain('Fabio Zorro');
    expect(el.textContent).toContain('ABC123');
    expect(el.textContent).toMatch(/\b(59|60)\s*s/);
    expect(el.textContent).toContain('Esperando que el aprendiz escanee');
  });

  it('muestra el motivo legible ante 409', async () => {
    const { el } = await montar(() => Promise.reject(new HttpErrorResponse({ status: 409, error: { motivo: 'YA_ESTA_DENTRO' } })));
    expect(el.textContent).toContain('El vehículo ya está dentro del parqueadero');
    expect(el.textContent).toContain('Volver a empezar');
  });

  it('el estado en vivo cambia el texto cuando llega autorizacion:cambio de su propio autorizacionId', async () => {
    const { f, el, rt } = await montar(ok);
    rt.emitir('autorizacion:cambio', { autorizacionId: 7, estado: 'BARRERA_ABIERTA', direccion: 'ENTRADA' });
    await f.whenStable();
    expect(el.textContent).toContain('Barrera abierta, pase');
  });

  it('ignora cambios de otro autorizacionId', async () => {
    const { f, el, rt } = await montar(ok);
    rt.emitir('autorizacion:cambio', { autorizacionId: 99, estado: 'BARRERA_ABIERTA', direccion: 'ENTRADA' });
    await f.whenStable();
    expect(el.textContent).not.toContain('Barrera abierta, pase');
  });
});
