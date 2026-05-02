import axios from 'axios';

async function test() {
  const deckId = "meren-of-clan-nel-toth-1";
  try {
    const headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    };
    console.log("Fetching HTML...");
    const htmlResponse = await axios.get(`https://tappedout.net/mtg-decks/${deckId}/`, { headers, responseType: 'text' });
    console.log("HTML fetched. Status:", htmlResponse.status);
  } catch (err) {
    console.log("Error on HTML:", err.message);
  }

  try {
    const headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    };
    console.log("Fetching TXT...");
    const txtResponse = await axios.get(`https://tappedout.net/mtg-decks/${deckId}/?fmt=txt`, { headers, responseType: 'text' });
    console.log("TXT fetched. Status:", txtResponse.status);
  } catch (err) {
    console.log("Error on TXT:", err.message);
  }
}
test();
