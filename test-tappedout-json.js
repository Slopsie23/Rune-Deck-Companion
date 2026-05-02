import https from 'https';

https.get('https://tappedout.net/mtg-decks/22-01-20-rhys-the-redeemed/?fmt=json', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => { 
    try {
      console.log(JSON.parse(data)); 
    } catch (e) {
      console.error("Not JSON:", data.substring(0, 500));
    }
  });
}).on('error', (err) => {
  console.log("Error: " + err.message);
});
