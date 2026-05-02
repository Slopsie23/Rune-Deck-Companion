import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Get saved decks from local file
  app.get("/api/decks", async (req, res) => {
    try {
      const dataPath = path.join(process.cwd(), "my_decks.json");
      const { readFile } = await import("fs/promises");
      const data = await readFile(dataPath, "utf-8");
      res.json(JSON.parse(data));
    } catch (error) {
      console.error("Error reading my_decks.json:", error);
      res.status(500).json({ error: "Failed to load decks from file" });
    }
  });

  // Proxy for Scryfall to avoid CORS and ad-blocker issues
  app.get("/api/sf/*", async (req, res) => {
    try {
      const endpoint = req.params[0];
      const queryParams = new URLSearchParams(req.query as Record<string, string>).toString();
      const url = `https://api.scryfall.com/${endpoint}${queryParams ? '?' + queryParams : ''}`;
      
      const response = await axios.get(url, {
        headers: {
          "User-Agent": "RuneDeck/2.0",
          "Accept": "application/json"
        }
      });
      res.json(response.data);
    } catch (error: any) {
      if (error.response) {
        res.status(error.response.status).json(error.response.data);
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  });

  // Image redirect proxy
  app.get("/api/sfimg", async (req, res) => {
    try {
      const name = req.query.name as string;
      if (!name) return res.status(400).send("Name required");
      const url = `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(name)}`;
      const response = await axios.get(url, {
        headers: { "User-Agent": "RuneDeck/2.0", "Accept": "application/json" }
      });
      
      const imgUrl = response.data?.image_uris?.normal || response.data?.card_faces?.[0]?.image_uris?.normal;
      if (imgUrl) {
        res.redirect(imgUrl);
      } else {
        res.status(404).send("Image not found");
      }
    } catch (error) {
      res.status(404).send("Card not found");
    }
  });

  // Proxy for TappedOut to avoid CORS and get txt format
  app.get("/api/to/:id", async (req, res) => {
    // 1. Try JSON API first
    try {
      const apiResponse = await axios.get(`https://tappedout.net/api/v1/decks/${req.params.id}/`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "application/json",
        }
      });
      if (apiResponse.data) {
        return res.json(apiResponse.data);
      }
    } catch (e) {
      console.error("TappedOut API failed:", e instanceof Error ? e.message : e);
    }

    try {
      const headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      };

      // 2. Fetch HTML to extract name and commander 
      let deckName = req.params.id;
      let commanders: string[] = [];

      try {
        const htmlResponse = await axios.get(`https://tappedout.net/mtg-decks/${req.params.id}/`, { 
          headers, 
          responseType: 'text' 
        });
        const html = htmlResponse.data;
        
        const cheerio = await import('cheerio');
        const $ = cheerio.load(html);
        
        deckName = $('.h1-name').text().trim();
        if (!deckName) {
          const title = $('title').text().trim();
          if (title) deckName = title.split('(')[0].replace('MTG Deck', '').trim();
        }
        if (!deckName) deckName = req.params.id;

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
      } catch (e) {
        console.error("Failed to parse HTML for commanders:", e instanceof Error ? e.message : e);
      }

      // 3. TappedOut .txt download endpoint
      const response = await axios.get(`https://tappedout.net/mtg-decks/${req.params.id}/?fmt=txt`, {
        headers,
        responseType: 'text'
      });
      
      const data = response.data;
      if (typeof data === 'string' && (data.includes("<html") || data.includes("<!DOCTYPE"))) {
        return res.status(404).json({ error: "Deck not found or private on TappedOut" });
      }

      res.json({ rawText: data, id: req.params.id, deckName, commanders });
    } catch (error) {
      console.error("TappedOut Proxy Error:", error);
      res.status(500).json({ error: "Failed to fetch deck from TappedOut" });
    }
  });

  // Proxy for Archidekt to avoid CORS
  app.get("/api/ad/:id", async (req, res) => {
    try {
      const response = await axios.get(`https://archidekt.com/api/decks/${req.params.id}/`, {
        headers: {
          "User-Agent": "SlopsDeckAdds/2.0",
        },
      });
      res.json(response.data);
    } catch (error) {
      console.error("Archidekt Proxy Error:", error);
      res.status(500).json({ error: "Failed to fetch deck from Archidekt" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
