import https from 'https';

https.get('https://tappedout.net/mtg-decks/22-01-20-rhys-the-redeemed/?fmt=txt', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => { console.log(data); });
}).on('error', (err) => {
  console.log("Error: " + err.message);
});
