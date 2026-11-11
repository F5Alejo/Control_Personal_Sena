import { iniciarBrokerDev } from './broker-dev.js';

await iniciarBrokerDev(1883);
console.log('Broker MQTT de desarrollo en mqtt://localhost:1883');
