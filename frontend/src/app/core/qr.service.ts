import { Injectable } from '@angular/core';
import QRCode from 'qrcode';

@Injectable({ providedIn: 'root' })
export class QrService {
  generar(url: string): Promise<string> {
    return QRCode.toDataURL(url, { width: 320, margin: 1 });
  }
}
