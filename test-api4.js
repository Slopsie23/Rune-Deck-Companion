import axios from 'axios';

async function test() {
  try {
    const slug = process.argv[2];
    const { data } = await axios.get(`https://tappedout.net/mtg-decks/${slug}/?fmt=csv`, {
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    });
    console.log(data);
  } catch (err) {
    console.log("Failed API:", err.message);
  }
}
test();
