# Guion de la demo — SENA SMART PARK

## Antes de empezar (10 min antes)

- [ ] PostgreSQL corriendo; `cd frontend && npx ng build` hecho.
- [ ] `cd backend && npm start` (con `MODO_SIMULADO=true` si no hay hardware conectado).
- [ ] Kiosco abierto en `http://localhost:3000`; indicador arriba en **ESP32 en línea**.
- [ ] Celular en la misma red; puerto 3000 abierto (ver README).
- [ ] Pulsar **Reiniciar demo** para empezar limpio. El historial se conserva.

## Recorrido (≈ 5 min)

1. **Entrada.** En el kiosco escribir la cédula `1000000001` y Enter. Elegir vehículo y pulsar **Entrada**.
2. El LCD muestra el nombre del aprendiz. En pantalla aparece el QR con cuenta regresiva de 60 s.
3. Con el celular, escanear el QR con la cámara nativa. Se ve "Hola Fabio…", la placa y "Esperando el vehículo en la entrada".
4. Acercar el carrito al sensor de la entrada. La barrera abre ("Barrera abierta, pase").
5. El carrito cruza y se estaciona en P01. El celular muestra **Registrado**; el panel marca P01 **Ocupado**.
6. **Salida.** Misma cédula, **Salida**, escanear, carrito a la barrera, cruzar y liberar P01. Queda en el historial con la permanencia.

## Casos para mostrar

| Caso | Qué hacer | Resultado esperado |
| --- | --- | --- |
| Sin carrito | Generar QR de entrada y no acercar el carrito. | A los 30 s: "Tiempo agotado", la barrera no abre. |
| QR vencido | Esperar 60 s sin escanear y escanear. | "El código venció, pida otro al celador". |
| QR reutilizado | Escanear dos veces el mismo QR. | "Este código ya se usó". |
| Segundo aprendiz | Con P01 ocupado, generar entrada de otro aprendiz. | El kiosco muestra "El espacio P01 está ocupado". |
| Apertura manual | Botón **Apertura manual** y un motivo. | La barrera abre y se cierra sola; queda el evento. |
| ESP32 sin conexión | Desconectar el ESP32 (o "ESP32 sin conexión" en el simulador). | Indicador rojo; no se generan accesos. |

## Si falla un sensor

El panel **Simulador ESP32** del kiosco solo aparece con `MODO_SIMULADO=true`. Con el ESP32 real, reinicie en modo simulado para usarlo.

| Falla | Qué pulsar en el simulador |
| --- | --- |
| No detecta el carrito en la entrada | **Carrito en la entrada** (y **Retirar carrito** al final). |
| No detecta el cruce | **Carrito cruza la barrera**. |
| El HC-SR04 de P01 no marca | **P01 ocupado** al estacionar y **P01 libre** al salir. |
| ESP32 sin conexión | **ESP32 en línea**. |

Si algo queda a medias: **Reiniciar demo**.

## Ajustes anotados en el ensayo

- (Pendiente) Ensayo completo en el computador con el celular: anotar aquí lo que haya que ajustar.
