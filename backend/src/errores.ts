export class ErrorHttp extends Error {
  constructor(public estado: number, mensaje: string, public extra: Record<string, unknown> = {}) {
    super(mensaje);
  }
}
