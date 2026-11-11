export interface Reloj { ahora(): Date }
export const relojSistema: Reloj = { ahora: () => new Date() };

export interface Publicador {
  publicar(topic: string, payload: unknown): Promise<void>;
}
export interface Emisor {
  emitir(evento: string, datos: unknown): void;
}
export interface Temporizador {
  programar(ms: number, fn: () => void): () => void;
}
export const temporizadorSistema: Temporizador = {
  programar(ms, fn) {
    const t = setTimeout(fn, ms);
    return () => clearTimeout(t);
  },
};
