import axios from 'axios';

async function test() {
  try {
    // I need to use an ID that definitely exists on tappedout.
    // wait I'll use "14-07-14-animar-soul-of-elements"
    const { data } = await axios.get("https://tappedout.net/mtg-decks/14-07-14-animar-soul-of-elements/?fmt=csv");
    console.log(data);
  } catch (err) {
    console.log("Failed API:", err.message);
  }
}
test();
