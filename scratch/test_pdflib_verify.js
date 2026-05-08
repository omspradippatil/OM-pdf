import { PDFDocument } from 'pdf-lib';

async function test() {
  const doc = await PDFDocument.create();
  doc.addPage([100, 100]);
  const bytes = await doc.save({ userPassword: '123' });
  
  try {
    await PDFDocument.load(bytes);
    console.log('FAILURE: PDF was loaded WITHOUT password!');
  } catch (e) {
    console.log('SUCCESS: PDF failed to load without password as expected.');
    console.log('Error:', e.message);
  }

  try {
    await PDFDocument.load(bytes, { password: '123' });
    console.log('SUCCESS: PDF was loaded WITH correct password!');
  } catch (e) {
    console.log('FAILURE: PDF failed to load with correct password!');
    console.log('Error:', e.message);
  }
}

test();
