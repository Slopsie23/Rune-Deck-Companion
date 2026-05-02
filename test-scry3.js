import axios from 'axios';

async function test() {
  try {
    const { data } = await axios.get("https://api.scryfall.com/cards/named?exact=Ashling, the Limitless");
    console.log("Colors:", data.color_identity);
    console.log("Image URIs:", data.image_uris);
    console.log("Type line:", data.type_line);
  } catch (err) {
    console.log("Error:", err.message);
  }
}
test();
