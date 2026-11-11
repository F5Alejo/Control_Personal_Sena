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

  function montar(h: Parameters<typeof estadoBase>[0]) {
    const rt = new TiempoRealFalso();
    TestBed.configureTestingModule({ imports: [EstadoPanelComponent], providers: [{ provide: TiempoRealService, useValue: rt }] });
    const f = TestBed.createComponent(EstadoPanelComponent);
    rt.estado$.next(estadoBase(h));
    return f;
  }

  it('muestra la distancia del HC-SR04 y el ángulo de la barrera', async () => {
    const f = montar({ distanciaCm: 18.6, telemetria: { rssi: -55, uptimeS: 125, ip: '192.168.1.40', heapLibre: 214000, angulo: 90 } });
    await f.whenStable();
    const t = f.nativeElement.textContent;
    expect(t).toContain('19 cm');
    expect(t).toContain('90°');
  });

  it('muestra WiFi, IP, tiempo encendido y memoria libre de la telemetría', async () => {
    const f = montar({ telemetria: { rssi: -55, uptimeS: 125, ip: '192.168.1.40', heapLibre: 214000, angulo: 0 } });
    await f.whenStable();
    const t = f.nativeElement.textContent;
    expect(t).toContain('Excelente');
    expect(t).toContain('-55 dBm');
    expect(t).toContain('192.168.1.40');
    expect(t).toContain('2 min 5 s');
    expect(t).toContain('209 KB');
  });

  it('sin telemetría no inventa datos', async () => {
    const f = montar({ esp32Online: false });
    await f.whenStable();
    expect(f.nativeElement.textContent).not.toContain('dBm');
    expect(f.nativeElement.textContent).toContain('Sin conexión');
  });
});
