import https from 'https';
const slug = process.argv[2] || "meren-of-clan-nel-toth-1"; // Just guessing a common one?
const url = `https://tappedout.net/mtg-decks/${slug}/?fmt=txt`;
https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => { 
    console.log(data);
  });
});
