const http = require('http');

http.get('http://127.0.0.1:3000/api/scryfall/cards/search?q=is:paper', res => {
  console.log(res.statusCode);
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => console.log('Data:', data));
});
