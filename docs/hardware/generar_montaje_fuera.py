"""Dibuja la guía de montaje con el ESP32 FUERA de las dos mini protoboards de 170 puntos.

Uso (desde la raíz del repo):
    python3 docs/hardware/generar_montaje_fuera.py
Escribe docs/hardware/montaje-esp32-fuera.svg y, si existe rsvg-convert, también el .png.

Si cambia un pin en src/main.cpp, cambie aquí el cable correspondiente (función cable)
y la fila de la lista, y actualice docs/hardware/MONTAJE.md.
"""
import math
import os
import shutil
import subprocess
import sys
from html import escape

W, H = 1800, 2070
fondo, cables, encima = [], [], []

def t(x, y, s, size=14, fill='#222', anchor='middle', weight='normal', halo=False, capa=None):
    h = ' stroke="#fff" stroke-width="4" paint-order="stroke"' if halo else ''
    (capa if capa is not None else fondo).append(
        f'<text x="{x}" y="{y}" font-size="{size}" fill="{fill}" text-anchor="{anchor}" '
        f'font-weight="{weight}"{h}>{escape(s)}</text>')

def r(x, y, w, h, fill, stroke='none', rx=4, sw=1.5, capa=None, extra=''):
    (capa if capa is not None else fondo).append(
        f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" {extra}/>')

def c(x, y, rad, fill, stroke='none', sw=1.5, capa=None):
    (capa if capa is not None else fondo).append(
        f'<circle cx="{x}" cy="{y}" r="{rad}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>')

def ln(x1, y1, x2, y2, col, sw=2, capa=None):
    (capa if capa is not None else fondo).append(
        f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{col}" stroke-width="{sw}" stroke-linecap="round"/>')

C5V, C3V, CGND = '#d62828', '#f08c00', '#222222'
CSDA, CSCL = '#9c36b5', '#e0a800'
CTRIG, CECHO, CSERVO, CPIR, CTOQUE = '#1971c2', '#0b7285', '#15aabf', '#8d5524', '#6f7a84'
CLEDR, CLEDV = '#e64980', '#2f9e44'

# ---------- protoboards (filas 1..17 en horizontal, letras a..j en vertical)
OFF = dict(zip('abcdefghij', [0, 1, 2, 3, 4, 7, 8, 9, 10, 11]))
class Proto:
    def __init__(s, nombre, bx, by):
        s.nombre, s.bx, s.by = nombre, bx, by
        s.w, s.h = 80 + 16 * 30, 80 + 11 * 30
    def hx(s, n): return s.bx + 40 + (n - 1) * 30
    def hy(s, l): return s.by + 40 + OFF[l] * 30
    def __call__(s, hueco): return (s.hx(int(hueco[1:])), s.hy(hueco[0]))

P1 = Proto('PROTOBOARD 1 · 5 V y GND', 300, 960)
P2 = Proto('PROTOBOARD 2 · 3,3 V y GND', 1200, 960)

def dibujar_proto(p, tiras, notas):
    r(p.bx, p.by, p.w, p.h, '#f4f1ea', '#c9c2b0', rx=10, sw=2)
    yc = (p.hy('e') + p.hy('f')) / 2
    r(p.bx + 10, yc - 14, p.w - 20, 28, '#e3ddcf', rx=3)
    for (n, mitad, col) in tiras:  # resalta tiras usadas para energía
        ls = 'abcde' if mitad == 'arriba' else 'fghij'
        r(p.hx(n) - 13, p.hy(ls[0]) - 13, 26, p.hy(ls[-1]) - p.hy(ls[0]) + 26, col, rx=6, extra='opacity="0.22"')
    for n in range(1, 18):
        t(p.hx(n), p.by + 22, str(n), 11, '#777')
        t(p.hx(n), p.by + p.h - 10, str(n), 11, '#777')
        for l in 'abcdefghij':
            r(p.hx(n) - 4, p.hy(l) - 4, 8, 8, '#5c5c5c', rx=1.5)
    for l in 'abcdefghij':
        t(p.bx + 16, p.hy(l) + 4, l, 12, '#777')
        t(p.bx + p.w - 16, p.hy(l) + 4, l, 12, '#777')
    r(p.bx, p.by + p.h + 10, 300, 26, '#343a40', rx=13)
    t(p.bx + 150, p.by + p.h + 28, p.nombre, 14, '#fff', weight='bold')
    for i, s in enumerate(notas):
        t(p.bx, p.by + p.h + 58 + i * 20, s, 13, '#444', anchor='start')

dibujar_proto(P1, [(1, 'arriba', C5V), (1, 'abajo', C5V), (3, 'arriba', '#555'), (3, 'abajo', '#555')],
              ['Fila 1 (a–j) = 5 V   ·   Fila 3 (a–j) = GND',
               'Los puentes 3 y 4 unen las dos mitades de cada fila.'])
dibujar_proto(P2, [(1, 'arriba', C3V), (3, 'arriba', '#555')],
              ['Fila 1 (a–e) = 3,3 V   ·   Fila 3 (a–e) = GND',
               'Aquí NO llega 5 V. Solo 3,3 V, GND y el divisor del ECHO.'])

# ---------- ESP32 suelto
E = {}
izq = ['EN', 'VP', 'VN', 'D34', 'D35', 'D32', 'D33', 'D25', 'D26', 'D27', 'D14', 'D12', 'D13', 'GND', 'VIN']
der = ['D23', 'D22', 'TX0', 'RX0', 'D21', 'D19', 'D18', 'D5', 'TX2', 'RX2', 'D4', 'D2', 'D15', 'GND', '3V3']
usados = {'D25', 'D26', 'D27', 'D14', 'D13', 'GND', 'VIN', 'D22', 'D21', 'D18', 'D5', 'TX2', 'RX2', '3V3'}
r(760, 150, 280, 500, '#2b3a55', '#1b2638', rx=10, sw=2)
r(860, 172, 80, 120, '#c8ccd0', '#9aa0a6', rx=4)
t(900, 228, 'ESP32', 13, '#333', weight='bold'); t(900, 246, 'WROOM', 11, '#333')
r(875, 640, 50, 30, '#b0b5ba', '#868e96', rx=4); t(900, 690, 'USB', 12, '#555')
for i, (a, b) in enumerate(zip(izq, der)):
    y = 190 + 30 * i
    for nombre, x, anc, tx in ((a, 790, 'start', 805), (b, 1010, 'end', 995)):
        c(x, y, 7, '#d4a72c', '#8a6d1c')
        u = nombre in usados
        t(tx, y + 4, nombre, 13, '#ffe066' if u else '#aab4c3', anchor=anc, weight='bold' if u else 'normal')
        E[(nombre, 'L' if x == 790 else 'R')] = (x, y)
t(900, 725, 'ESP32 DOIT DevKit V1 — va FUERA de las protoboards', 16, '#1b2638', weight='bold')
t(900, 746, 'Todo se le conecta con cables (los pines amarillos son los que se usan)', 13, '#555')

# ---------- módulos
def pin(x, y, nombre, lado, capa=None):
    c(x, y, 6, '#d4a72c', '#8a6d1c')
    if lado == 'izq': t(x - 12, y + 4, nombre, 12, '#fff', anchor='end', weight='bold')
    elif lado == 'der': t(x + 12, y + 4, nombre, 12, '#fff', anchor='start', weight='bold')
    elif lado == 'arriba': t(x, y - 11, nombre, 11, '#fff', weight='bold')
    elif lado == 'abajo': t(x, y + 19, nombre, 11, '#fff', weight='bold')
    return (x, y)

M = {}
# LCD
r(60, 90, 330, 130, '#2f7d32', '#1e5a22', rx=8, sw=2)
r(76, 108, 230, 74, '#3b82c4', '#1e4f80', rx=3)
t(191, 150, 'LCD 16x2', 18, '#e7f5ff', weight='bold')
t(191, 205, 'LCD I2C (dirección 0x27)', 13, '#fff', weight='bold')
for n, y in (('GND', 110), ('VCC', 135), ('SDA', 160), ('SCL', 185)):
    M['LCD ' + n] = pin(380, y, n, 'izq')
# PIR
r(60, 420, 190, 140, '#2f7d32', '#1e5a22', rx=8, sw=2)
c(135, 490, 48, '#f8f9fa', '#ced4da', sw=2)
t(135, 495, 'PIR', 16, '#495057', weight='bold')
t(155, 580, 'Sensor PIR (HC-SR501)', 13, '#333', weight='bold')
for n, y in (('GND', 445), ('OUT', 490), ('VCC', 535)):
    M['PIR ' + n] = pin(240, y, n, 'izq')
# Servo
r(60, 1090, 170, 90, '#1864ab', '#0b3d6e', rx=6, sw=2)
c(105, 1135, 22, '#f1f3f5', '#adb5bd'); r(100, 1100, 10, 70, '#f1f3f5', rx=5)
t(170, 1140, 'SG90', 15, '#fff', weight='bold')
t(145, 1205, 'Servo (barrera)', 13, '#333', weight='bold')
for col, dx in (('#e8590c', 0), (C5V, 6), ('#6b3e1e', 12)):
    fondo.append(f'<path d="M{150+dx},1180 C{160+dx},1230 {255},{1215} {272},1248" fill="none" stroke="{col}" stroke-width="3"/>')
r(262, 1245, 26, 90, '#212529', rx=3)
for n, y, ctxt in (('SEÑAL (naranja)', 1260, '#e8590c'), ('V+ (rojo)', 1290, C5V), ('GND (marrón)', 1320, '#6b3e1e')):
    c(288, y, 6, '#adb5bd', '#495057')
    t(254, y + 4, n, 12, ctxt, anchor='end', weight='bold')
M['SERVO SEÑAL'], M['SERVO V+'], M['SERVO GND'] = (288, 1260), (288, 1290), (288, 1320)
# HC-SR04
r(1180, 80, 240, 120, '#1971c2', '#0b4f8f', rx=8, sw=2)
for cx in (1240, 1360):
    c(cx, 122, 32, '#ced4da', '#868e96', sw=2); c(cx, 122, 20, '#adb5bd')
t(1300, 70, 'HC-SR04 (ultrasonido)', 13, '#333', weight='bold')
for n, x in (('VCC', 1250), ('TRIG', 1283), ('ECHO', 1316), ('GND', 1349)):
    M['HC ' + n] = (x, 190); c(x, 190, 6, '#d4a72c', '#8a6d1c'); t(x, 176, n, 10, '#fff', weight='bold')
# OLED
r(1520, 300, 200, 150, '#212529', '#000', rx=8, sw=2)
r(1575, 318, 132, 114, '#0d1b2a', '#3a506b', rx=3)
t(1641, 380, 'OLED', 16, '#74c0fc', weight='bold')
t(1620, 470, 'OLED 0,96" I2C (0x3C)', 13, '#333', weight='bold')
t(1620, 488, 'Revise el orden impreso en su módulo', 11, '#c92a2a')
for n, y in (('SDA', 330), ('SCL', 360), ('VCC', 390), ('GND', 420)):
    M['OLED ' + n] = pin(1530, y, n, 'der')
# TTP223B
r(920, 1150, 170, 80, '#c92a2a', '#8f1d1d', rx=8, sw=2)
c(1005, 1200, 20, '#f1f3f5', '#adb5bd')
t(1005, 1252, 'Sensor de toque TTP223B', 13, '#333', weight='bold')
for n, x in (('I/O', 950), ('VCC', 1005), ('GND', 1060)):
    M['TTP ' + n] = (x, 1150); c(x, 1150, 6, '#d4a72c', '#8a6d1c'); t(x, 1172, n, 11, '#fff', weight='bold')

# ---------- componentes en la protoboard
def resistencia(a, b, bandas, nombre):
    (x1, y1), (x2, y2) = a, b
    ln(x1, y1, x2, y2, '#9aa0a6', 2.5, encima)
    mx, my = (x1 + x2) / 2, (y1 + y2) / 2
    vert = abs(x2 - x1) < 1
    L = 34
    g = f'<g transform="translate({mx},{my}) rotate({90 if vert else 0})">'
    g += f'<rect x="{-L/2}" y="-7" width="{L}" height="14" rx="6" fill="#e9d8a6" stroke="#b08d4a" stroke-width="1.5"/>'
    for i, col in enumerate(bandas):
        g += f'<rect x="{-L/2 + 5 + i*7}" y="-7" width="3.5" height="14" fill="{col}"/>'
    encima.append(g + '</g>')
    if vert: t(mx + 26, my + 4, nombre, 12, '#5f3d00', anchor='start', weight='bold', halo=True, capa=encima)
    else: t(mx, my - 12, nombre, 12, '#5f3d00', weight='bold', halo=True, capa=encima)
    for p in (a, b): c(*p, 3.5, '#9aa0a6', capa=encima)

def led(anodo, catodo, color, nombre):
    (x1, y1), (x2, y2) = anodo, catodo
    ln(x1, y1, x2, y2, '#9aa0a6', 2.5, encima)
    mx, my = (x1 + x2) / 2, (y1 + y2) / 2
    c(mx, my, 13, color, '#333', 1.5, encima)
    t(x1 - 4, y1 - 8, '+', 15, '#000', weight='bold', halo=True, capa=encima)
    t(mx, my + 30, nombre, 11, '#333', weight='bold', halo=True, capa=encima)

def condensador(mas, menos):
    (x1, y1), (x2, y2) = mas, menos
    ln(x1, y1, x2, y2, '#9aa0a6', 2.5, encima)
    mx, my = (x1 + x2) / 2, (y1 + y2) / 2
    c(mx, my, 18, '#1d3557', '#0b1d33', 1.5, encima)
    encima.append(f'<path d="M{mx+8},{my-16} A18,18 0 0,1 {mx+8},{my+16}" fill="none" stroke="#e9ecef" stroke-width="5"/>')
    t(x1 - 10, y1 - 10, '+', 15, '#000', weight='bold', halo=True, capa=encima)
    t(x2 + 12, y2 - 10, '−', 17, '#000', weight='bold', halo=True, capa=encima)
    t(mx, my + 38, '470 µF', 12, '#1d3557', weight='bold', halo=True, capa=encima)

B220 = ['#c92a2a', '#c92a2a', '#7a4a1f', '#c9a227']
B100 = ['#7a4a1f', '#111111', '#7a4a1f', '#c9a227']

# ---------- cables
def spline(pts, n=18):
    P = [pts[0]] + pts + [pts[-1]]
    res = []
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i-1], P[i], P[i+1], P[i+2]
        for k in range(n):
            s = k / n
            res.append(tuple(0.5 * (2*p1[j] + (-p0[j] + p2[j])*s + (2*p0[j] - 5*p1[j] + 4*p2[j] - p3[j])*s*s
                                    + (-p0[j] + 3*p1[j] - 3*p2[j] + p3[j])*s**3) for j in (0, 1)))
    return res + [pts[-1]]

badges = []
def cable(num, color, a, da, b, db, via=(), pos=0.5, k=45):
    pts = [a, (a[0] + da[0]*k, a[1] + da[1]*k), *via, (b[0] + db[0]*k, b[1] + db[1]*k), b]
    poly = spline(pts)
    d = 'M' + ' L'.join(f'{x:.1f},{y:.1f}' for x, y in poly)
    cables.append(f'<path d="{d}" fill="none" stroke="#fff" stroke-width="8.5" stroke-linecap="round" stroke-linejoin="round"/>')
    cables.append(f'<path d="{d}" fill="none" stroke="{color}" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>')
    for p in (a, b): c(*p, 5.5, color, '#fff', 2, encima)
    L = [0]
    for (x1, y1), (x2, y2) in zip(poly, poly[1:]): L.append(L[-1] + math.hypot(x2 - x1, y2 - y1))
    objetivo = L[-1] * pos
    i = next(i for i, v in enumerate(L) if v >= objetivo)
    badges.append((poly[i], num, color))

U, D, Lf, Rt = (0, -1), (0, 1), (-1, 0), (1, 0)
DG = (0.6, -1)  # entra por arriba-derecha (no pisa los otros cables de la misma fila)
# Protoboard 1
cable(1, C5V, E[('VIN', 'L')], Lf, P1('a1'), U, [(600, 700), (360, 880)])
cable(2, CGND, E[('GND', 'L')], Lf, P1('a3'), DG, [(650, 660), (470, 880)], pos=0.4)
cable(3, C5V, P1('e1'), (-0.6, 0), P1('f1'), (-0.6, 0), k=30, pos=0.5)
cable(4, CGND, P1('e3'), (-0.6, 0), P1('f3'), (-0.6, 0), k=30, pos=0.5)
cable(5, C5V, M['LCD VCC'], Rt, P1('b1'), Lf, [(430, 230), (315, 640), (262, 990)], pos=0.45)
cable(6, CGND, M['LCD GND'], Rt, P1('b3'), DG, [(460, 190), (420, 620), (470, 900)], pos=0.35)
cable(7, C5V, M['PIR VCC'], Rt, P1('c1'), Lf, [(300, 720), (252, 1030)], pos=0.55)
cable(8, CGND, M['PIR GND'], Rt, P1('c3'), DG, [(370, 600), (480, 910)], pos=0.45)
cable(9, C5V, M['HC VCC'], D, P1('d1'), Lf, [(1150, 760), (700, 800), (300, 870), (250, 1070)], pos=0.3)
cable(10, CGND, M['HC GND'], D, P1('d3'), DG, [(1175, 780), (700, 830), (500, 920)], pos=0.25)
cable(11, C5V, M['SERVO V+'], (0.3, 0), P1('i1'), (-0.3, 0), pos=0.5)
cable(12, CGND, M['SERVO GND'], (0.3, 0.3), P1('j3'), (-0.3, 0.4), pos=0.5)
cable(13, CGND, P1('j7'), (-0.4, 0.4), P1('g3'), (0.5, 0.3), k=30, pos=0.5)
cable(14, CLEDR, E[('D25', 'L')], Lf, P1('a6'), U, [(620, 520), (500, 880)], pos=0.55)
cable(15, CLEDV, E[('D26', 'L')], Lf, P1('a8'), U, [(670, 560), (560, 880)], pos=0.6)
# Protoboard 2
cable(16, C3V, E[('3V3', 'R')], Rt, P2('a1'), U, [(1110, 700), (1230, 880)], pos=0.55)
cable(17, CGND, E[('GND', 'R')], Rt, P2('a3'), U, [(1150, 640), (1300, 880)], pos=0.55)
cable(18, C3V, M['OLED VCC'], Lf, P2('b1'), Lf, [(1400, 580), (1165, 960)], pos=0.45)
cable(19, CGND, M['OLED GND'], Lf, P2('b3'), DG, [(1430, 620), (1345, 900)], pos=0.4)
cable(20, C3V, M['TTP VCC'], U, P2('c1'), Lf, [(1110, 1060)], pos=0.5)
cable(21, CGND, M['TTP GND'], U, P2('c3'), DG, [(1110, 975), (1290, 945)], pos=0.35)
cable(22, '#5f3dc4', E[('D18', 'R')], Rt, P2('a7'), U, [(1190, 500), (1420, 880)], pos=0.45)
cable(23, CECHO, M['HC ECHO'], D, P2('a11'), U, [(1350, 300), (1470, 620), (1540, 880)], pos=0.5)
# Directos ESP32 ↔ módulo
cable(24, CTRIG, E[('D5', 'R')], Rt, M['HC TRIG'], D, [(1160, 300)], pos=0.5)
cable(25, CSDA, E[('D21', 'R')], Rt, M['LCD SDA'], Rt, [(1100, 230), (1000, 105), (800, 100), (520, 140)], pos=0.6)
cable(26, CSCL, E[('D22', 'R')], Rt, M['LCD SCL'], Rt, [(1075, 160), (960, 120), (780, 118), (520, 190)], pos=0.62)
cable(27, CSDA, E[('RX2', 'R')], Rt, M['OLED SDA'], Lf, [(1250, 440)], pos=0.5)
cable(28, CSCL, E[('TX2', 'R')], Rt, M['OLED SCL'], Lf, [(1250, 405)], pos=0.5)
cable(29, CPIR, E[('D14', 'L')], Lf, M['PIR OUT'], Rt, [(520, 470)], pos=0.5)
cable(30, CTOQUE, E[('D27', 'L')], Lf, M['TTP I/O'], U, [(720, 560), (760, 790), (930, 990)], pos=0.55)
cable(31, CSERVO, E[('D13', 'L')], Lf, M['SERVO SEÑAL'], (0.4, -1), [(560, 640), (290, 800), (275, 1110)], pos=0.5)

resistencia(P1('e6'), P1('f6'), B220, '')
resistencia(P1('e8'), P1('f8'), B220, '220 Ω (las dos)')
led(P1('g6'), P1('g7'), '#ff4d4d', 'LED rojo')
led(P1('i8'), P1('i7'), '#51cf66', 'LED verde')
condensador(P1('h1'), P1('h3'))
resistencia(P2('d3'), P2('d7'), B220, '220 Ω (a GND)')
resistencia(P2('c7'), P2('c11'), B100, '100 Ω (del ECHO)')

for (x, y), num, col in badges:
    claro = col in (CSCL, C3V)
    c(x, y, 12, col, '#fff', 2, encima)
    t(x, y + 4.5, str(num), 12, '#000' if claro else '#fff', weight='bold', capa=encima)

# ---------- título
t(900, 38, 'SENA SMART PARK · Montaje con el ESP32 fuera de las protoboards', 24, '#111', weight='bold')
t(900, 62, 'Cada cable tiene un número: búsquelo en la lista de abajo. Conecte el USB solo al final.', 14, '#555')

# ---------- lista
Y0 = 1500
r(30, Y0 - 30, W - 60, H - Y0 + 10, '#ffffff', '#dee2e6', rx=12, sw=1.5)
def bloque(x, y, titulo, filas):
    t(x, y, titulo, 16, '#111', anchor='start', weight='bold')
    y += 28
    for f in filas:
        if isinstance(f, str):
            t(x, y, f, 13, '#333', anchor='start'); y += 22; continue
        num, col, texto = f
        c(x + 11, y - 5, 11, col, '#fff', 1.5)
        t(x + 11, y - 0.5, str(num), 11, '#000' if col in (CSCL, C3V) else '#fff', weight='bold')
        t(x + 30, y, texto, 13, '#222', anchor='start')
        y += 24
    return y

y = bloque(55, Y0, 'Protoboard 1 (5 V y GND)', [
    (1, C5V, 'VIN del ESP32 → P1 a1  ·  hembra-macho'),
    (2, CGND, 'GND (lado VIN) → P1 a3  ·  hembra-macho'),
    (3, C5V, 'Puente P1 e1 → f1  ·  macho-macho'),
    (4, CGND, 'Puente P1 e3 → f3  ·  macho-macho'),
    (5, C5V, 'LCD VCC → P1 b1  ·  hembra-macho'),
    (6, CGND, 'LCD GND → P1 b3  ·  hembra-macho'),
    (7, C5V, 'PIR VCC → P1 c1  ·  hembra-macho'),
    (8, CGND, 'PIR GND → P1 c3  ·  hembra-macho'),
    (9, C5V, 'HC-SR04 VCC → P1 d1  ·  hembra-macho'),
    (10, CGND, 'HC-SR04 GND → P1 d3  ·  hembra-macho'),
    (11, C5V, 'Servo rojo (V+) → P1 i1  ·  macho-macho'),
    (12, CGND, 'Servo marrón (GND) → P1 j3  ·  macho-macho'),
    (13, CGND, 'Puente P1 j7 → g3 (GND de los LED)  ·  macho-macho'),
    (14, CLEDR, 'D25 → P1 a6 (LED rojo)  ·  hembra-macho'),
    (15, CLEDV, 'D26 → P1 a8 (LED verde)  ·  hembra-macho'),
])
bloque(55, y + 8, 'Piezas en la protoboard 1', [
    'Condensador 470 µF: + en h1, − (raya blanca) en h3',
    'Resistencia 220 Ω de e6 a f6  ·  otra de e8 a f8',
    'LED rojo: pata larga (+) en g6, corta en g7',
    'LED verde: pata larga (+) en i8, corta en i7',
])
y = bloque(640, Y0, 'Protoboard 2 (3,3 V y GND)', [
    (16, C3V, '3V3 del ESP32 → P2 a1  ·  hembra-macho'),
    (17, CGND, 'GND (lado 3V3) → P2 a3  ·  hembra-macho'),
    (18, C3V, 'OLED VCC → P2 b1  ·  hembra-macho'),
    (19, CGND, 'OLED GND → P2 b3  ·  hembra-macho'),
    (20, C3V, 'TTP223B VCC → P2 c1  ·  hembra-macho'),
    (21, CGND, 'TTP223B GND → P2 c3  ·  hembra-macho'),
    (22, '#5f3dc4', 'D18 → P2 a7 (punto medio del divisor)  ·  hembra-macho'),
    (23, CECHO, 'HC-SR04 ECHO → P2 a11  ·  hembra-macho'),
])
bloque(640, y + 8, 'Piezas en la protoboard 2 (divisor del ECHO)', [
    'Resistencia 100 Ω de c7 a c11 (marrón-negro-marrón)',
    'Resistencia 220 Ω de d3 a d7 (rojo-rojo-marrón)',
    'Así D18 recibe ≈3,4 V y no los 5 V del ECHO.',
])
y = bloque(1225, Y0, 'Directos ESP32 ↔ módulo (sin protoboard)', [
    (24, CTRIG, 'D5 → HC-SR04 TRIG  ·  hembra-hembra'),
    (25, CSDA, 'D21 → LCD SDA  ·  hembra-hembra'),
    (26, CSCL, 'D22 → LCD SCL  ·  hembra-hembra'),
    (27, CSDA, 'RX2 (GPIO16) → OLED SDA  ·  hembra-hembra'),
    (28, CSCL, 'TX2 (GPIO17) → OLED SCL  ·  hembra-hembra'),
    (29, CPIR, 'D14 → PIR OUT  ·  hembra-hembra'),
    (30, CTOQUE, 'D27 → TTP223B I/O  ·  hembra-hembra'),
    (31, CSERVO, 'D13 → Servo naranja (señal)  ·  macho-hembra'),
])
y = bloque(1225, y + 8, 'Reglas', [
    '• Nunca una la fila de 5 V (P1) con la de 3,3 V (P2).',
    '• Todas las GND son la misma tierra: los dos GND',
    '   del ESP32 están unidos por dentro.',
    '• El ECHO nunca va directo al ESP32: pasa por el divisor.',
    '• Revise todo y conecte el USB al final.',
])

svg_body = '\n'.join(fondo + cables + encima)
grid = ('<defs><pattern id="g" width="30" height="30" patternUnits="userSpaceOnUse">'
        '<path d="M30 0 H0 V30" fill="none" stroke="#eef0f2" stroke-width="1"/></pattern></defs>'
        f'<rect width="{W}" height="{H}" fill="#fafbfc"/><rect width="{W}" height="{H}" fill="url(#g)"/>')
svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" '
       f'font-family="DejaVu Sans, Arial, sans-serif">{grid}{svg_body}</svg>')
aqui = os.path.dirname(os.path.abspath(__file__))
destino = sys.argv[1] if len(sys.argv) > 1 else os.path.join(aqui, 'montaje-esp32-fuera.svg')
with open(destino, 'w', encoding='utf-8') as f:
    f.write(svg)
print('SVG:', destino)
if shutil.which('rsvg-convert'):
    png = os.path.splitext(destino)[0] + '.png'
    subprocess.run(['rsvg-convert', '-w', str(W), destino, '-o', png], check=True)
    print('PNG:', png)
else:
    print('Sin rsvg-convert: abra el SVG en el navegador o instale librsvg para sacar el PNG.')
