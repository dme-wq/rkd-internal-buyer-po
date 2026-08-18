const url = 'https://script.google.com/macros/s/AKfycbyMLQFr5MQ8F651yDB-7pIr6wNh1H-tOppJUJaHz1icVVmVzhxOk5ENf3TkGn5AbTqP/exec';
fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'text/plain' },
  body: JSON.stringify({ action: 'getDropdowns', data: {} })
})
.then(res => res.text())
.then(text => console.log('Response:', text))
.catch(err => console.error('Error:', err));
