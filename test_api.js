const url = 'https://script.google.com/macros/s/AKfycby0UMECC5gLKpHRNWCkJJlJGV3oWVUb_Q8fygKEqgfIq8F-CGrURyzF06ceMjjmeZEX/exec';

fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'text/plain' },
  body: JSON.stringify({ action: 'getDropdowns', data: {} })
})
.then(res => res.text())
.then(text => console.log('Response:', text))
.catch(err => console.error('Error:', err));
