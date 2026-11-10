import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { USUARIOS_DEMO } from '../../../core/api/simulada/mock-auth-api';
import { AuthService } from '../../../core/auth/auth.service';

/** Inicio de sesión con documento y contraseña (RF-01). */
@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly avisos = inject(MatSnackBar);

  protected readonly formulario = inject(NonNullableFormBuilder).group({
    documento: ['', [Validators.required, Validators.pattern(/^\d{6,12}$/)]],
    contrasena: ['', Validators.required],
  });
  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly verContrasena = signal(false);
  protected readonly demos = USUARIOS_DEMO.map((u) => ({
    rol: u.usuario.rol === 'ADMIN' ? 'Administrador' : 'Aprendiz',
    icono: u.usuario.rol === 'ADMIN' ? 'admin_panel_settings' : 'school',
    documento: u.usuario.documento,
    contrasena: u.contrasena,
  }));

  protected usarDemo(documento: string, contrasena: string): void {
    this.formulario.setValue({ documento, contrasena });
    this.error.set(null);
  }

  protected ingresar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    const { documento, contrasena } = this.formulario.getRawValue();
    this.enviando.set(true);
    this.error.set(null);
    this.auth.iniciarSesion(documento, contrasena).subscribe({
      next: (usuario) => this.router.navigateByUrl(this.auth.rutaInicio(usuario)),
      error: (e: Error) => {
        this.error.set(e.message);
        this.enviando.set(false);
      },
    });
  }

  protected recuperarContrasena(): void {
    this.avisos.open(
      'La recuperación de contraseña estará disponible con el backend (Fase 3).',
      'Entendido',
      {
        duration: 5000,
      },
    );
  }
}
