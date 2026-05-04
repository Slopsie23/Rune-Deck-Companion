const axios = require('axios');
axios.get('https://api.scryfall.com/cards/search?q=game:paper+-is:digital+-is:art_series+-is:funny+-is:token+-t:emblem+legal:commander+id%3C%3Dc&order=released&dir=desc')
.then(r => console.log("OK", r.data.total_cards))
.catch(e => console.error("ERR", e.message, e.response?.data));
