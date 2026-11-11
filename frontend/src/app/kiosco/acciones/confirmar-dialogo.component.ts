import { Component, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

export interface DatosConfirmar { titulo: string; mensaje: string; pideMotivo?: boolean; }

/** Cierra con `true` (confirmar), el motivo escrito (si lo pide) o `undefined` (cancelar). */
@Component({
  selector: 'app-confirmar-dialogo',
  imports: [MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <h2 mat-dialog-title>{{ datos.titulo }}</h2>
    <mat-dialog-content>
      <p>{{ datos.mensaje }}</p>
      @if (datos.pideMotivo) {
        <mat-form-field appearance="outline" class="campo"><mat-label>Motivo</mat-label>
          <input matInput [value]="motivo()" (input)="motivo.set($any($event.target).value)" /></mat-form-field>
      }
    </mat-dialog-content>
    <mat-dialog-actions>
      <button mat-button [mat-dialog-close]="undefined">Cancelar</button>
      <button mat-flat-button [mat-dialog-close]="datos.pideMotivo ? motivo().trim() || undefined : true">Confirmar</button>
    </mat-dialog-actions>
  `,
  styles: `.campo { width: 100%; } h2 { font-family: var(--titulo); }`,
})
export class ConfirmarDialogoComponent {
  protected datos = inject<DatosConfirmar>(MAT_DIALOG_DATA);
  protected motivo = signal('');
}
