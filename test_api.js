const url = 'https://script.google.com/macros/s/AKfycbwPFtbOrvXu60ibaNFwT1IgMdAGGMO7wKKEO7hvSVGnJEP9mK6eD8d1h3PhMcvEQJtO/exec';

fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'text/plain' },
  body: JSON.stringify({ action: 'getDropdowns', data: {} })
})
.then(res => res.text())
.then(text => console.log('Response:', text))
.catch(err => console.error('Error:', err));
