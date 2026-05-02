const https = require('https');

const query = "is:paper -is:digital -is:art_series -is:funny -is:token -is:emblem -t:emblem ci<=c";
const url = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}&order=released&dir=desc`;

const options = {
  headers: {
    'User-Agent': 'RuneDeck/1.0',
    'Accept': 'application/json'
  }
};

https.get(url, options, (res) => {
  let data = '';
  console.log('Status Code:', res.statusCode);
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    if (res.statusCode >= 400) {
      console.log('Error data:', data);
    } else {
      console.log('Success, data length:', data.length);
    }
  });
}).on('error', (err) => {
  console.log('Error:', err.message);
});
