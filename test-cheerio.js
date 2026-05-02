import axios from 'axios';
import * as cheerio from 'cheerio';

async function test() {
  const { data } = await axios.get("https://tappedout.net/mtg-decks/the-command-zone-podcast-meren/");
  const $ = cheerio.load(data);
  console.log("Title:", $('title').text());
  console.log("Deck name:", $('.h1-name').text());
  const cmdr = [];
  $('div[id="board-commander"] a.board-link').each((i, el) => {
    cmdr.push($(el).text());
  });
  console.log("Commanders in board-commander:", cmdr);
  
  const cmdr2 = [];
  $('.board-container h3:contains("Commander")').next('ul').find('a.board-link').each((i, el) => {
    cmdr2.push($(el).text());
  });
  console.log("Commander from h3:", cmdr2);
}
test();
