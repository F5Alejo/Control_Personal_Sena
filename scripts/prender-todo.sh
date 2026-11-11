#!/usr/bin/env bash
# Prende todo SENA SMART PARK: PostgreSQL, frontend compilado y backend
# (API + MQTT aedes + ESP32 simulado). Ctrl+C apaga el backend.
#
#   ./scripts/prender-todo.sh              solo en este computador
#   ./scripts/prender-todo.sh --celular    abre el puerto 3000 y fija la IP del QR
#   ./scripts/prender-todo.sh --esp32      hardware real: sin simulador, broker abierto a la LAN
#                                          (exige MQTT_CLAVE=...; abre 1883/tcp además de 3000/tcp)
#   ./scripts/prender-todo.sh --sin-build  no recompila el frontend
set -euo pipefail
RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CELULAR=0; BUILD=1; ESP32=0
for a in "$@"; do
  case "$a" in
    --celular) CELULAR=1 ;;
    --esp32) ESP32=1; CELULAR=1 ;;
    --sin-build) BUILD=0 ;;
    *) echo "Opción desconocida: $a"; exit 1 ;;
  esac
done

echo "==> PostgreSQL"
systemctl is-active --quiet postgresql || sudo systemctl start postgresql
for b in senapark; do psql -lqt | cut -d'|' -f1 | grep -qw "$b" || { echo "Falta la base $b: createdb $b && (cd backend && npm run migrar && npm run semilla)"; exit 1; }; done

if [ "$BUILD" = 1 ]; then
  echo "==> Compilando frontend"
  (cd "$RAIZ/frontend" && npx ng build >/dev/null)
fi

if ss -ltn | grep -q ':3000 '; then
  echo "El puerto 3000 ya está en uso (¿otro backend corriendo?): ss -ltnp | grep :3000"; exit 1
fi

export MODO_SIMULADO=true
if [ "$ESP32" = 1 ]; then
  : "${MQTT_CLAVE:?Defina la clave del broker: MQTT_CLAVE=miclave ./scripts/prender-todo.sh --esp32}"
  export MODO_SIMULADO=false BROKER_LAN=true MQTT_USUARIO="${MQTT_USUARIO:-senapark}" MQTT_CLAVE
  echo "==> ESP32 real: broker en 1883 (usuario $MQTT_USUARIO). Ponga esos datos y la IP de abajo en include/secrets.h"
  sudo ufw allow 1883/tcp
fi
if [ "$CELULAR" = 1 ]; then
  IP="$(ip route get 1.1.1.1 | awk '{for(i=1;i<=NF;i++) if($i=="src") print $(i+1)}')"
  echo "==> Celular: abriendo 3000/tcp, IP del QR $IP"
  sudo ufw allow 3000/tcp
  export PUBLIC_URL="http://$IP:3000"
  echo "==> IP del PC para el ESP32 (MQTT_HOST): $IP"
  trap 'echo; echo "Cerrando puertos"; sudo ufw delete allow 3000/tcp; [ "$ESP32" = 1 ] && sudo ufw delete allow 1883/tcp' EXIT
fi

echo "==> Backend. Kiosco: http://localhost:3000  (Ctrl+C para apagar)"
cd "$RAIZ/backend"
npm start
