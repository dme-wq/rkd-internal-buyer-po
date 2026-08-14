const url = 'https://script.google.com/macros/s/AKfycbzuCaNmLWQ_uGRTpAKpTJ9GvGxRX0JbnrxamPo-tA7fPQmIWsN15RKGw4NxC55kEXji/exec';

fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'text/plain' },
  body: JSON.stringify({ action: 'getDropdowns', data: {} })
})
.then(res => res.text())
.then(text => console.log('Response:', text))
.catch(err => console.error('Error:', err));
