import { TestBed } from '@angular/core/testing';
import { EstadoPanelComponent } from './estado-panel.component';
import { TiempoRealService } from '../../core/tiempo-real.service';
import { TiempoRealFalso, estadoBase } from '../../core/pruebas';

describe('EstadoPanelComponent', () => {
  it('marca "Sin conexión" cuando esp32Online es false', async () => {
    const rt = new TiempoRealFalso();
    TestBed.configureTestingModule({ imports: [EstadoPanelComponent], providers: [{ provide: TiempoRealService, useValue: rt }] });
    const f = TestBed.createComponent(EstadoPanelComponent);
    rt.estado$.next(estadoBase({ esp32Online: false }));
    await f.whenStable();
    expect(f.nativeElement.textContent).toContain('Sin conexión');
  });

  it('muestra P01 bloqueado por inconsistencia', async () => {
    const rt = new TiempoRealFalso();
    TestBed.configureTestingModule({ imports: [EstadoPanelComponent], providers: [{ provide: TiempoRealService, useValue: rt }] });
    const f = TestBed.createComponent(EstadoPanelComponent);
    rt.estado$.next(estadoBase({ p01Ocupado: true }, { bloqueoP01: true }));
    await f.whenStable();
    expect(f.nativeElement.textContent).toContain('Bloqueado por inconsistencia');
  });
});
