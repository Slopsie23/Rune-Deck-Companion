import axios from 'axios';

async function test() {
  try {
    const { data } = await axios.get("https://api.scryfall.com/cards/named?exact=Ashling, the Limitless");
    console.log(data.name);
  } catch (err) {
    console.log("Scryfall exact error:", err.message);
  }
  
  try {
    const { data } = await axios.get("https://api.scryfall.com/cards/named?fuzzy=Ashling, the Limitless");
    console.log("Fuzzy:", data.name);
  } catch (err) {
    console.log("Scryfall fuzzy error:", err.message);
  }
}
test();
