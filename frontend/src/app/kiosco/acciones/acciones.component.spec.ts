import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { AccionesComponent } from './acciones.component';
import { ApiService } from '../../core/api.service';

function montar(resultado: unknown) {
  const api = { aperturaManual: vi.fn().mockResolvedValue(undefined), reiniciarDemo: vi.fn().mockResolvedValue(undefined) };
  const dialog = { open: vi.fn(() => ({ afterClosed: () => of(resultado) })) };
  TestBed.configureTestingModule({ imports: [AccionesComponent], providers: [
    { provide: ApiService, useValue: api }, { provide: MatDialog, useValue: dialog }] });
  const f = TestBed.createComponent(AccionesComponent);
  f.detectChanges();
  const click = async (texto: string) => {
    (Array.from((f.nativeElement as HTMLElement).querySelectorAll('button')).find(b => b.textContent?.includes(texto))!).click();
    await f.whenStable(); await f.whenStable();
  };
  return { api, click, f };
}

describe('AccionesComponent', () => {
  it('no llama a la API si el usuario cancela el diálogo', async () => {
    const { api, click } = montar(undefined);
    await click('Reiniciar demo'); await click('Apertura manual');
    expect(api.reiniciarDemo).not.toHaveBeenCalled();
    expect(api.aperturaManual).not.toHaveBeenCalled();
  });

  it('reiniciar demo llama a la API tras confirmar', async () => {
    const { api, click } = montar(true);
    await click('Reiniciar demo');
    expect(api.reiniciarDemo).toHaveBeenCalledOnce();
  });

  it('apertura manual envía el motivo escrito', async () => {
    const { api, click } = montar('Prueba de barrera');
    await click('Apertura manual');
    expect(api.aperturaManual).toHaveBeenCalledWith('Prueba de barrera');
  });

  it('en modo solo manual no ofrece reiniciar la demo', async () => {
    const { f } = montar(true);
    f.componentRef.setInput('soloManual', true);
    f.detectChanges();
    const textos = Array.from((f.nativeElement as HTMLElement).querySelectorAll('button')).map(b => b.textContent);
    expect(textos.join()).toContain('Apertura manual');
    expect(textos.join()).not.toContain('Reiniciar demo');
  });
});
