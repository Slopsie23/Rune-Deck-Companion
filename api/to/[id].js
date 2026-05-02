import * as cheerio from 'cheerio';

export default async function handler(req, res) {
  const { id } = req.query;

  // 1. Try JSON API first (often works better but sometimes blocked or missing fields)
  try {
    const apiResponse = await fetch(`https://tappedout.net/api/v1/decks/${id}/`, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
      },
    });

    if (apiResponse.ok) {
      const data = await apiResponse.json();
      return res.status(200).json(data);
    }
  } catch (e) {
    console.error("TappedOut API failed:", e);
  }

  // 2. Fallback to HTML Scraping & TXT
  try {
    const headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    };

    const htmlResponse = await fetch(`https://tappedout.net/mtg-decks/${id}/`, { headers });
    let deckName = id;
    let commanders = [];

    if (htmlResponse.ok) {
        const html = await htmlResponse.text();
        const $ = cheerio.load(html);
        
        // Extract Name
        deckName = $('.h1-name').text().trim();
        if (!deckName) {
          const title = $('title').text().trim();
          if (title) deckName = title.split('(')[0].replace('MTG Deck', '').trim();
        }
        if (!deckName) deckName = id;

        // Extract Commander(s)
        $('h3').each((i, el) => {
          const text = $(el).text().trim();
          if (text.includes("Commander")) {
            $(el).next().find('.card-hover').each((_, cardEl) => {
              const name = $(cardEl).attr('data-name');
              if (name) commanders.push(name);
            });
            $(el).next('ul').find('a.board-link').each((_, cardEl) => {
              const name = $(cardEl).text().trim();
              if (name && !commanders.includes(name)) commanders.push(name);
            });
          }
        });

        if (commanders.length === 0) {
          $('[id="board-commander"] a.board-link').each((i, el) => {
            commanders.push($(el).text().trim());
          });
        }
    }

    // TappedOut .txt download endpoint
    const response = await fetch(`https://tappedout.net/mtg-decks/${id}/?fmt=txt`, {
      method: "GET",
      headers
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: "Failed to fetch from TappedOut" });
    }

    const data = await response.text();
    // Verify it is not html
    if (data.includes("<html") || data.includes("<!DOCTYPE")) {
      return res.status(404).json({ error: "Deck not found or private on TappedOut" });
    }

    return res.status(200).json({ rawText: data, id, deckName, commanders });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

