const url = 'https://script.google.com/macros/s/AKfycbz3-Oy0K3tiRFH22srkNO-BTgjJGHT_jTkpf8Xxi46_hoNQtwSbs0eeItevsrmSNErk/exec';

fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'text/plain' },
  body: JSON.stringify({ action: 'getDropdowns', data: {} })
})
.then(res => res.text())
.then(text => console.log('Response:', text))
.catch(err => console.error('Error:', err));
