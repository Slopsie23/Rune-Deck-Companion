const http = require('http');

const query = "is:paper -is:digital -is:art_series -is:funny -is:token -is:emblem -t:emblem";
http.get(`http://127.0.0.1:3000/api/scryfall/cards/search?q=${encodeURIComponent(query)}`, res => {
  console.log(res.statusCode);
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => console.log('Data:', data));
});
