import { PDFDocument } from 'pdf-lib';

async function test() {
  const doc = await PDFDocument.create();
  doc.addPage([100, 100]);
  try {
    const bytes = await doc.save({ userPassword: '123' });
    console.log('SUCCESS: pdf-lib supports encryption in save()');
    console.log('Byte length:', bytes.length);
  } catch (e) {
    console.log('FAILURE: pdf-lib does not support encryption in save()');
    console.log('Error:', e.message);
  }
}

test();
