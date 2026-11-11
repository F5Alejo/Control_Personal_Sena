#!/usr/bin/env bash
# Maneja cada pieza de SENA SMART PARK por separado.
#   ./scripts/servicio.sh <accion>
#
#   postgres          prende PostgreSQL
#   postgres-parar    apaga PostgreSQL
#   build             compila el frontend (lo sirve el backend en :3000)
#   backend           backend completo (API + MQTT + ESP32 simulado + frontend)
#   broker            solo el broker MQTT (:1883, solo loopback)
#   backend-esp32     backend con ESP32 real (exige MQTT_CLAVE=...; broker en la LAN)
#   dev-backend       backend con recarga en caliente
#   dev-frontend      Angular en :4200 con proxy al backend
#   firewall-abrir    abre 3000/tcp para el celular (y 1883/tcp con ESP32=1)
#   firewall-cerrar   cierra 3000/tcp y 1883/tcp
#   ip                IP que usará el celular
#   estado            qué está vivo (servicios, puertos, API, P01)
#   pruebas           corre las pruebas de backend y frontend
set -euo pipefail
RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export MODO_SIMULADO=true
ip_local() { ip route get 1.1.1.1 | awk '{for(i=1;i<=NF;i++) if($i=="src") print $(i+1)}'; }

case "${1:-}" in
  postgres)        sudo systemctl start postgresql; systemctl is-active postgresql ;;
  postgres-parar)  sudo systemctl stop postgresql ;;
  build)           cd "$RAIZ/frontend" && npx ng build ;;
  backend)         cd "$RAIZ/backend" && PUBLIC_URL="${PUBLIC_URL:-}" npm start ;;
  backend-esp32)   : "${MQTT_CLAVE:?Defina MQTT_CLAVE=...}"; cd "$RAIZ/backend" && MODO_SIMULADO=false BROKER_LAN=true MQTT_USUARIO="${MQTT_USUARIO:-senapark}" MQTT_CLAVE="$MQTT_CLAVE" PUBLIC_URL="${PUBLIC_URL:-http://$(ip_local):3000}" npm start ;;
  broker)          cd "$RAIZ/backend" && npm run broker ;;
  dev-backend)     cd "$RAIZ/backend" && npm run dev ;;
  dev-frontend)    cd "$RAIZ/frontend" && npm start ;;
  firewall-abrir)  sudo ufw allow 3000/tcp; [ "${ESP32:-0}" = 1 ] && sudo ufw allow 1883/tcp; sudo ufw status | grep 3000 || true ;;
  firewall-cerrar) sudo ufw delete allow 3000/tcp; sudo ufw delete allow 1883/tcp || true ;;
  ip)              echo "http://$(ip_local):3000   (úsela como PUBLIC_URL)" ;;
  estado)
    echo "postgresql : $(systemctl is-active postgresql || true)"
    echo "puertos    :"; ss -ltn | grep -E ':3000 |:1883 |:4200 ' || echo "  (ninguno de 3000/1883/4200 abierto)"
    echo "api        : $(curl -s -m 2 -o /dev/null -w '%{http_code}' http://localhost:3000/api/estado || true)"
    psql senapark -c "select codigo, estado from espacios;" 2>/dev/null || echo "bd         : sin acceso"
    sudo -n ufw status 2>/dev/null | grep 3000 || echo "firewall   : 3000 sin regla (o requiere sudo para verla)" ;;
  pruebas)         (cd "$RAIZ/backend" && npm test) && (cd "$RAIZ/frontend" && npx ng test --watch=false) ;;
  *) sed -n '2,17p' "$0"; exit 1 ;;
esac
