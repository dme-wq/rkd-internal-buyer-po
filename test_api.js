async function checkDropdowns() {
  const url = 'https://script.google.com/macros/s/AKfycbx3uuUE7Ru3GALWG5F0D6GHXNY1VwchaMnMmS3oWK4nzlhjiowCsvTUePQui73Cfu2j/exec';
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action: 'getDropdowns', data: {} })
  });
  const data = await res.json();
  console.log(Object.keys(data.data));
}

checkDropdowns();
