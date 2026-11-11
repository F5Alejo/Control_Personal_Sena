INSERT INTO espacios (codigo, estado) VALUES ('P02','LIBRE'),('P03','LIBRE'),('P04','LIBRE'),('P05','LIBRE'),('P06','LIBRE')
ON CONFLICT (codigo) DO NOTHING;
