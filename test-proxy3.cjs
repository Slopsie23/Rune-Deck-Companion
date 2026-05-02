const http = require('http');

const query = "game:paper -game:digital -is:funny -t:token -t:art -t:emblem ci<=c";
http.get(`http://127.0.0.1:3000/api/scryfall/cards/search?q=${encodeURIComponent(query)}`, res => {
  console.log(res.statusCode);
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => console.log('Data len:', data.length));
});
