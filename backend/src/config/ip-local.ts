import os from 'node:os';

export function detectarIpLocal(interfaces: NodeJS.Dict<os.NetworkInterfaceInfo[]> = os.networkInterfaces()): string | null {
  for (const [nombre, infos] of Object.entries(interfaces)) {
    if (/^(docker|veth|br-)/.test(nombre)) continue;
    for (const i of infos ?? []) {
      if ((i.family === 'IPv4' || (i.family as unknown) === 4) && !i.internal) return i.address;
    }
  }
  return null;
}
