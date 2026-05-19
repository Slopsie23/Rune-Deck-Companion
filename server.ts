import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import axios from "axios";
import fs from "fs";
import * as cheerio from "cheerio";

// Load saved decks from local file (robust)
const getDecks = () => {
  try {
    const dataPath = path.join(process.cwd(), "my_decks.json");
    if (fs.existsSync(dataPath)) {
      return JSON.parse(fs.readFileSync(dataPath, "utf-8"));
    }
  } catch (error) {
    console.error("Error reading my_decks.json:", error);
  }
  return [];
};

const decks = getDecks();

async function startServer() {
  const app = express();
  app.use(cors());
  const PORT = 3000;

  app.use(express.json());

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", version: "V2.6.20" });
  });

  // Get saved decks from imported JSON
  app.get("/api/decks", (req, res) => {
    res.json(decks);
  });

  // Proxy for Scryfall to avoid CORS and ad-blocker issues
  app.all("/api/sf/*", async (req, res) => {
    try {
      const endpoint = req.params[0];
      const queryParams = new URLSearchParams(req.query as Record<string, string>).toString();
      const url = `https://api.scryfall.com/${endpoint}${queryParams ? '?' + queryParams : ''}`;
      
      const config: any = {
        headers: {
          "User-Agent": "RuneDeck/2.0",
          "Accept": "application/json"
        }
      };

      let response;
      if (req.method === "POST") {
        response = await axios.post(url, req.body, config);
      } else {
        response = await axios.get(url, config);
      }
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
    const deckId = req.params.id;
    const commonHeaders = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Referer": "https://tappedout.net/",
      "Cache-Control": "no-cache",
      "Pragma": "no-cache"
    };

    // 1. Try JSON API first
    try {
      // Try both plural and singular just in case, prioritizing what's there
      const apiResponse = await axios.get(`https://tappedout.net/api/v1/decks/${deckId}/`, {
        headers: {
          ...commonHeaders,
          "Accept": "application/json",
        },
        timeout: 6000
      });
      if (apiResponse.data && apiResponse.data.inventory) {
        return res.json(apiResponse.data);
      }
    } catch (e: any) {
      // JSON API often fails if deck is not publicly shared in a certain way or due to rate limiting
      // Quiet log - this is a standard fallback path
      if (e.response?.status !== 404) {
        console.log(`TappedOut JSON API status: ${e.response?.status || 'unknown'} for ${deckId}, falling back to scraping`);
      }
    }

    try {
      // 2. Fetch HTML to extract name, commander and card list
      let deckName = deckId;
      let commanders: string[] = [];
      let scrapedCards: any[] = [];

      try {
        const htmlResponse = await axios.get(`https://tappedout.net/mtg-decks/${deckId}/`, { 
          headers: commonHeaders, 
          responseType: 'text',
          timeout: 12000
        });
        const html = htmlResponse.data;
        
        const $ = cheerio.load(html);
        
        deckName = $('.h1-name').text().trim();
        if (!deckName) {
          const title = $('title').text().trim();
          if (title) deckName = title.split('(')[0].replace('MTG Deck', '').trim();
        }

        // Commanders extraction
        const cleanToName = (name: string) => {
          if (!name) return "";
          return name.replace(/\*CMDR\*/gi, '')
                     .replace(/\*F\*/gi, '')
                     .replace(/\*E\*/gi, '')
                     .replace(/\*A\*/gi, '')
                     .replace(/\*L\*/gi, '')
                     .replace(/\*B\*/gi, '')
                     .replace(/\*P\*/gi, '')
                     .replace(/\*S\*/gi, '')
                     .replace(/\*M\*/gi, '') // Maybeboard marker
                     .replace(/ \(F\)$/i, '')
                     .replace(/ \(V\.\d+\)$/i, '')
                     .replace(/ #\d+$/, '')
                     .replace(/ \d+x /, '') // Sometimes numbers are included
                     .trim();
        };

        // Improved commander detection
        const commanderSelectors = [
          '[id="board-commander"] a.board-link', 
          '.board-commander a.board-link', 
          '.board-col h3:contains("Commander") + ul a.board-link', 
          '.board-col h3:contains("Commandand") + ul a.board-link',
          '.board-link[data-board="commander"]',
          'a.board-link[href*="commander"]'
        ];

        commanderSelectors.forEach(selector => {
          $(selector).each((_, el) => {
            const name = cleanToName($(el).text());
            if (name && !commanders.includes(name)) commanders.push(name);
          });
        });
        
        // Fallback: Check for *CMDR* identifier in text of any board link
        if (commanders.length === 0) {
          $('a.board-link').each((_, el) => {
            const text = $(el).text();
            if (text.includes('*CMDR*')) {
               const name = cleanToName(text);
               if (name && !commanders.includes(name)) commanders.push(name);
            }
          });
        }
        
        // Final fallback for commanders
        if (commanders.length === 0) {
          $('h3').each((_, el) => {
            const h3Text = $(el).text().toLowerCase();
            if (h3Text.includes('commander')) {
               $(el).nextUntil('h3').find('a.board-link').each((__, link) => {
                 const name = cleanToName($(link).text());
                 if (name && !commanders.includes(name)) commanders.push(name);
               });
            }
          });
        }

        // Card list extraction from HTML (backup if txt fails)
        $('.board-col .boardlist a.board-link').each((_, el) => {
          const name = $(el).text().trim();
          const qtyText = $(el).parent().text().match(/^(\d+)x/);
          const qty = qtyText ? parseInt(qtyText[1]) : 1;
          const board = $(el).closest('.board-col').find('h3').text().toLowerCase();
          
          if (name && !board.includes('maybeboard')) {
            scrapedCards.push({
              card: { oracleCard: { name: name } },
              quantity: qty,
              categories: board.includes('sideboard') ? ['sideboard'] : (board.includes('commander') ? ['commander'] : [])
            });
          }
        });

      } catch (e: any) {
        console.error("Failed to parse HTML for TappedOut deck info:", e.message);
      }

      // 3. TappedOut .txt download endpoint
      let rawText = "";
      try {
        const response = await axios.get(`https://tappedout.net/mtg-decks/${deckId}/?fmt=txt`, {
          headers: commonHeaders,
          responseType: 'text',
          timeout: 8000
        });
        rawText = response.data;
      } catch (e: any) {
        console.log(`TappedOut TXT format failed for ${deckId} (status: ${e.response?.status || 'unknown'}), using scraped cards if available`);
      }
      
      if (!rawText && scrapedCards.length === 0) {
        return res.status(404).json({ error: "Deck not found (might be private) on TappedOut" });
      }

      if (rawText && (rawText.includes("<html") || rawText.includes("<!DOCTYPE"))) {
        // If txt returns HTML, it usually means redirect to login/error or deck is private
        if (scrapedCards.length > 0) {
          return res.json({ inventory: scrapedCards, id: deckId, deckName, commanders });
        }
        return res.status(404).json({ error: "Deck not found or requires login on TappedOut" });
      }

      if (rawText) {
        console.log(`Successfully fetched TappedOut deck ${deckId} via txt format`);
        res.json({ rawText, id: deckId, deckName, commanders });
      } else {
        console.log(`Successfully scraped TappedOut deck ${deckId} via HTML parsing`);
        res.json({ inventory: scrapedCards, id: deckId, deckName, commanders });
      }
    } catch (error: any) {
      console.error("TappedOut Proxy Critical Error:", error.message);
      const status = error.response?.status || 500;
      res.status(status).json({ error: `Failed to fetch from TappedOut: ${error.message}` });
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

  // Proxy for Moxfield to avoid CORS
  app.get("/api/mf/:id", async (req, res) => {
    const deckId = req.params.id;
    const deckPageUrl = `https://www.moxfield.com/decks/${deckId}`;
    
    const userAgents = [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    ];

    // Strategies in order of reliability
    const strategies = [
      {
        name: "Mobile App API",
        url: `https://api.moxfield.com/v2/decks/all/${deckId}`,
        headers: {
          "User-Agent": "Moxfield/2.1.0 (com.moxfield.mobile; build:40; iOS 17.4.1) Alamofire/5.8.1",
          "Accept": "application/json",
          "Accept-Language": "en-US,en;q=0.9",
          "X-Moxfield-Application": "moxfield-mobile"
        },
        process: (data: any) => (data && data.name ? data : null)
      },
      {
        name: "Official API (v2)",
        url: `https://api.moxfield.com/v2/decks/all/${deckId}`,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          "Accept": "application/json",
          "Referer": "https://www.moxfield.com/",
          "X-Requested-With": "XMLHttpRequest"
        },
        process: (data: any) => (data && data.name ? data : null)
      },
      {
        name: "Bot Spoof API",
        url: `https://api2.moxfield.com/v2/decks/all/${deckId}`,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
          "Accept": "application/json",
          "Referer": "https://www.google.com/"
        },
        process: (data: any) => (data && data.name ? data : null)
      },
      {
        name: "Secondary API (api2)",
        url: `https://api2.moxfield.com/v2/decks/all/${deckId}`,
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          "Accept": "application/json",
          "Referer": "https://www.moxfield.com/",
          "X-Moxfield-Application": "moxfield-web"
        },
        process: (data: any) => (data && data.name ? data : null)
      },
      {
        name: "Text Export",
        url: `${deckPageUrl}/export`,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
          "Accept": "text/plain, */*",
          "Referer": deckPageUrl
        },
        process: (data: any) => (data && typeof data === 'string' && !data.includes("<html") ? { rawText: data, id: deckId } : null)
      },
      {
        name: "HTML Scraper",
        url: deckPageUrl,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "Referer": "https://www.moxfield.com/decks/public"
        },
        process: (data: any) => {
          if (typeof data !== 'string') return null;
          const match = data.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
          if (match && match[1]) {
            try {
              const d = JSON.parse(match[1]).props?.pageProps?.deck;
              if (d) return {
                name: d.name,
                commanders: d.commanders,
                commandersPartner: d.commandersPartner,
                mainboard: d.mainboard,
                sideboard: d.sideboard,
                maybeboard: d.maybeboard
              };
            } catch (e) {}
          }
          return null;
        }
      }
    ];

    for (const s of strategies) {
      try {
        console.log(`[MF Proxy] Trying: ${s.name} for ${deckId}`);
        const resp = await axios.get(s.url, {
          headers: s.headers,
          timeout: 8000,
          validateStatus: (status) => status === 200
        });
        const processed = s.process(resp.data);
        if (processed) {
          console.log(`[MF Proxy] SUCCESS: ${s.name}`);
          return res.json(processed);
        }
      } catch (e: any) {
        console.warn(`[MF Proxy] ${s.name} failed: ${e.message}`);
      }
    }

    res.status(403).json({ 
      error: "Moxfield blokkeert alle automatische verbindingspogingen (Cloudflare).", 
      message: "Tip: Gebruik de 'Copy to clipboard' tekst functie op Moxfield en plak de lijst handmatig.",
      deckId,
      suggestManual: true 
    });
  });

  // Gemini API Proxy
  app.post("/api/gemini", async (req, res) => {
    try {
      const { model, contents, config, systemInstruction } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not set on the server" });
      }

      const body: any = { 
        contents,
        generationConfig: config 
      };

      if (systemInstruction) {
        body.system_instruction = {
          parts: [{ text: systemInstruction }]
        };
      }

      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        body,
        { headers: { "Content-Type": "application/json" } }
      );
      res.json(response.data);
    } catch (error: any) {
      console.error("Gemini Proxy Error:", error.response?.data || error.message);
      const status = error.response?.status || 500;
      res.status(status).json(error.response?.data || { error: error.message });
    }
  });

  // Serve static files from public directory
  app.use(express.static(path.join(process.cwd(), "public")));

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
