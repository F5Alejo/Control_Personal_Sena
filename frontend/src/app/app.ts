import { Component, inject } from '@angular/core';
import { MatIconRegistry } from '@angular/material/icon';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
export class App {
  constructor() {
    // Los íconos usan la fuente Material Symbols empaquetada en el proyecto (funciona sin internet).
    inject(MatIconRegistry).setDefaultFontSetClass('material-symbols-outlined');
  }
}
