const url = 'https://script.google.com/macros/s/AKfycbxaOJThwxTyD2P1X__xZhndQQjTFkxuoaSgGXxGKyUjmz5VOFxcTstBIsuqXGmu-uIw/exec';

fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'text/plain' },
  body: JSON.stringify({ action: 'getDropdowns', data: {} })
})
.then(res => res.text())
.then(text => console.log('Response:', text))
.catch(err => console.error('Error:', err));
