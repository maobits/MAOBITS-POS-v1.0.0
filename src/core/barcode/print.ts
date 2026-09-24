import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
function bars(value: string) { return [...value].map((d, i) => `<span style="display:inline-block;width:${1 + (Number(d) % 3)}px;height:${i % 2 ? 44 : 52}px;background:#101828;margin-right:1px"></span>`).join(''); }
export async function printBarcodeLabel(input: {
    name: string;
    barcode: string;
    priceText: string;
}) { const html = `<html><body style="font-family:Arial;text-align:center;padding:24px"><h3>${escapeHtml(input.name)}</h3><div style="white-space:nowrap">${bars(input.barcode)}</div><div style="letter-spacing:3px;margin:8px">${input.barcode}</div><strong>${escapeHtml(input.priceText)}</strong><p style="font-size:9px">MAOBITS POS</p></body></html>`; return Print.printAsync({ html }); }
export async function shareBarcodeLabel(input: {
    name: string;
    barcode: string;
    priceText: string;
}) { const html = `<html><body style="font-family:Arial;text-align:center;padding:24px"><h3>${escapeHtml(input.name)}</h3><div>${bars(input.barcode)}</div><p>${input.barcode}</p><strong>${escapeHtml(input.priceText)}</strong></body></html>`; const file = await Print.printToFileAsync({ html }); if (await Sharing.isAvailableAsync())
    await Sharing.shareAsync(file.uri, { mimeType: 'application/pdf', dialogTitle: 'MAOBITS POS' }); return file.uri; }
function escapeHtml(v: string) { return v.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c] ?? c)); }

