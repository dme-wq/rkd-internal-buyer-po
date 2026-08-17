const url = 'https://script.google.com/macros/s/AKfycbwpmHbpG8kx6BrdrXenm_U5gIfhGEScR07m2YMztlWEaAtjBDegGJmLyxcWxdLHj_mk/exec';

fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'text/plain' },
  body: JSON.stringify({ action: 'getDropdowns', data: {} })
})
.then(res => res.text())
.then(text => console.log('Response:', text))
.catch(err => console.error('Error:', err));
