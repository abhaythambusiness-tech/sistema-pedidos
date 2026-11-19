const fs = require('fs');
const path = require('path');
const MODE = process.env.PRINTER_MODE || 'mock';
const INTERFACE = process.env.PRINTER_INTERFACE || '';
let printerLib = null;
if (MODE !== 'mock') { try { const { printer: Printer, types } = require('node-thermal-printer'); printerLib = { Printer, types }; } catch (e) { console.warn('[printer] node-thermal-printer no instalado, usando mock:', e.message); } }
async function printTicket(orderId, text) {
  const dir = path.join(__dirname, '..', 'tickets');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${orderId}.txt`);
  fs.writeFileSync(file, text, 'utf8');
  console.log(`\n[ticket ${orderId}]\n${text}\n[fin ticket]\n`);
  if (MODE === 'mock' || !printerLib) return { ok: true, mode: 'mock', file };
  try {
    const { Printer, types } = printerLib;
    const iface = INTERFACE || (MODE === 'network' ? 'tcp://127.0.0.1:9100' : '/dev/usb/lp0');
    const printer = new Printer({ type: types.INTERFACE, interface: iface, characterSet: 'PC437_SPAIN', width: 42 });
    printer.alignCenter(); printer.println(text); printer.cut(); await printer.execute();
    return { ok: true, mode: MODE, interface: iface };
  } catch (e) { console.error('[printer] error al imprimir:', e.message); return { ok: false, mode: MODE, error: e.message }; }
}
module.exports = { printTicket };
