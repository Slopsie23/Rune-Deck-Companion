import axios from 'axios';
import * as cheerio from 'cheerio';

async function test() {
  const url = "https://tappedout.net/mtg-decks/02-05-26-elemental/";
  try {
    const { data } = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
    });
    const $ = cheerio.load(data);
    
    let commanders = [];
    $('h3').each((i, el) => {
      const text = $(el).text().trim();
      if (text.includes("Commander")) {
        // TappedOut sometimes has commander as images 
        // e.g. <a class="card-hover" data-name="...">
        $(el).next().find('.card-hover').each((_, cardEl) => {
            const name = $(cardEl).attr('data-name');
            if (name) commanders.push(name);
        });
        
        // Also fallback if it is a list
        $(el).next('ul').find('a.board-link').each((_, cardEl) => {
            const name = $(cardEl).text().trim();
            if (name) commanders.push(name);
        });
      }
    });

    console.log("Commanders found:", commanders);

  } catch (err) {
    console.log("Failed API:", err.message);
  }
}
test();
