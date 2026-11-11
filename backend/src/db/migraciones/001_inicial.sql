CREATE TABLE aprendices (
  id serial PRIMARY KEY,
  cedula text UNIQUE NOT NULL,
  nombre text NOT NULL,
  ficha text, programa text, jornada text,
  activo boolean NOT NULL DEFAULT true,
  fecha_creacion timestamptz NOT NULL DEFAULT now(),
  fecha_modificacion timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE vehiculos (
  id serial PRIMARY KEY,
  aprendiz_id integer NOT NULL REFERENCES aprendices(id),
  placa text UNIQUE NOT NULL,
  tipo text NOT NULL, marca text, color text,
  activo boolean NOT NULL DEFAULT true,
  fecha_creacion timestamptz NOT NULL DEFAULT now(),
  fecha_modificacion timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE espacios (
  id serial PRIMARY KEY,
  codigo text UNIQUE NOT NULL,
  estado text NOT NULL CHECK (estado IN ('LIBRE','OCUPADO')) DEFAULT 'LIBRE',
  activo boolean NOT NULL DEFAULT true,
  fecha_creacion timestamptz NOT NULL DEFAULT now(),
  fecha_modificacion timestamptz NOT NULL DEFAULT now()
);
INSERT INTO espacios (codigo, estado) VALUES ('P01', 'LIBRE');
CREATE TABLE autorizaciones_qr (
  id serial PRIMARY KEY,
  token_hash text UNIQUE NOT NULL,
  aprendiz_id integer NOT NULL REFERENCES aprendices(id),
  vehiculo_id integer NOT NULL REFERENCES vehiculos(id),
  direccion text NOT NULL CHECK (direccion IN ('ENTRADA','SALIDA')),
  estado text NOT NULL,
  expira_en timestamptz NOT NULL,
  usado_en timestamptz,
  motivo text,
  fecha_creacion timestamptz NOT NULL DEFAULT now(),
  fecha_modificacion timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE accesos (
  id serial PRIMARY KEY,
  aprendiz_id integer NOT NULL REFERENCES aprendices(id),
  vehiculo_id integer NOT NULL REFERENCES vehiculos(id),
  espacio_id integer NOT NULL REFERENCES espacios(id),
  autorizacion_id integer NOT NULL REFERENCES autorizaciones_qr(id),
  entrada_en timestamptz NOT NULL,
  salida_en timestamptz,
  estado text NOT NULL CHECK (estado IN ('ENTRANDO','DENTRO','SALIENDO','FINALIZADO','ANULADO')),
  fecha_creacion timestamptz NOT NULL DEFAULT now(),
  fecha_modificacion timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX accesos_vehiculo_activo ON accesos (vehiculo_id) WHERE estado IN ('ENTRANDO','DENTRO','SALIENDO');
CREATE UNIQUE INDEX accesos_espacio_activo ON accesos (espacio_id) WHERE estado IN ('ENTRANDO','DENTRO','SALIENDO');
CREATE TABLE eventos (
  id serial PRIMARY KEY,
  tipo text NOT NULL,
  detalle jsonb NOT NULL DEFAULT '{}'::jsonb,
  fecha timestamptz NOT NULL DEFAULT now()
);
