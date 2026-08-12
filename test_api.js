async function checkPOs() {
  const url = 'https://script.google.com/macros/s/AKfycbyNJOhDuoVL049S6_e3-Pg6CFSkfCHNTpINduno9t9qSflEVXHvk-iB-wsZEuAgw280/exec';
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action: 'getPendingInternalPOs', data: {} })
  });
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}

checkPOs();
