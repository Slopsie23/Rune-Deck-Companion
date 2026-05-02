import axios from 'axios';

async function test() {
  const name = 'Ashling, the Limitless';
  try {
    const { data } = await axios.get(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(name)}`);
    console.log(data.name);
  } catch (err) {
    console.log("Error:", err.message);
  }
}
test();
