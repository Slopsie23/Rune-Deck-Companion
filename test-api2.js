import axios from 'axios';
import * as cheerio from 'cheerio';

async function test() {
  try {
    const { data } = await axios.get("https://tappedout.net/mtg-decks/meren-of-clan-nel-toth-1/");
    const $ = cheerio.load(data);
    console.log("Title:", $('title').text());
    console.log("Deck name:", $('.h1-name').text().trim());
    
    // Find commander
    const cmdr = [];
    $('.board-container h3:contains("Commander")').next('ul').find('a.board-link').each((i, el) => {
      cmdr.push($(el).text().trim());
    });
    console.log("Commander from h3:", cmdr);
    
    // Sometimes it's in a different div?
    const cmdr2 = [];
    $('[id="board-commander"] a.board-link').each((i, el) => {
      cmdr2.push($(el).text().trim());
    });
    console.log("Commander from board-commander:", cmdr2);
    
  } catch (err) {
    console.log("Failed API:", err.message);
  }
}
test();
