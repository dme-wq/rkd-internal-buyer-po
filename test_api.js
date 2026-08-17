const url = 'https://script.google.com/macros/s/AKfycbxbYtUQMLe6CVD9JT5iTluNl7UNcmUXiF7WsCkJsx21G5aCnLJ32PgzvB9K3lwJnp57/exec';

fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'text/plain' },
  body: JSON.stringify({ action: 'getDropdowns', data: {} })
})
.then(res => res.text())
.then(text => console.log('Response:', text))
.catch(err => console.error('Error:', err));
