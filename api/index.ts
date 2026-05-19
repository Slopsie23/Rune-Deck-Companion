import express from "express";
import cors from "cors";
import path from "path";
import axios from "axios";
import fs from "fs";
import * as cheerio from "cheerio";

// Load saved decks from local file (robust for serverless)
const getDecks = () => {
  try {
    const dataPath = path.resolve(process.cwd(), "my_decks.json");
    if (fs.existsSync(dataPath)) {
      const content = fs.readFileSync(dataPath, "utf-8");
      if (content.trim()) {
        return JSON.parse(content);
      }
    }
  } catch (error) {
    console.error("Error reading my_decks.json:", error);
  }
  return [];
};

const decks = getDecks();

const app = express();
app.use(cors());
app.use(express.json());

// Router to handle both /api/foo and /foo (for Vercel flexibility)
const router = express.Router();

// Health check
router.get("/health", (req, res) => {
  res.json({ status: "ok", version: "V2.6.21", env: process.env.NODE_ENV });
});

router.get("/", (req, res) => {
  res.json({ message: "RuneDeck API is active", version: "V2.6.21" });
});

// Get saved decks
router.get("/decks", (req, res) => {
  res.json(decks);
});

// Proxy for Scryfall
router.all("/sf/*", async (req, res) => {
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
router.get("/sfimg", async (req, res) => {
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

// Proxy for TappedOut
router.get("/to/:id", async (req, res) => {
  const deckId = req.params.id;
  const commonHeaders = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://tappedout.net/",
    "Cache-Control": "no-cache",
    "Pragma": "no-cache"
  };

  try {
    const apiResponse = await axios.get(`https://tappedout.net/api/v1/decks/${deckId}/`, {
      headers: { ...commonHeaders, "Accept": "application/json" },
      timeout: 6000
    });
    if (apiResponse.data && apiResponse.data.inventory) return res.json(apiResponse.data);
  } catch (e) {}

  try {
    const htmlResponse = await axios.get(`https://tappedout.net/mtg-decks/${deckId}/`, { 
      headers: commonHeaders, 
      responseType: 'text',
      timeout: 12000
    });
    const $ = cheerio.load(htmlResponse.data);
    const deckName = $('.h1-name').text().trim() || deckId;
    const commanders: string[] = [];
    $('.board-commander a.board-link').each((_, el) => {
      commanders.push($(el).text().replace(/\*CMDR\*/gi, '').trim());
    });
    
    const response = await axios.get(`https://tappedout.net/mtg-decks/${deckId}/?fmt=txt`, {
      headers: commonHeaders,
      responseType: 'text',
      timeout: 8000
    });
    res.json({ rawText: response.data, id: deckId, deckName, commanders });
  } catch (error: any) {
    res.status(500).json({ error: `Failed to fetch from TappedOut: ${error.message}` });
  }
});

// Proxy for Archidekt
router.get("/ad/:id", async (req, res) => {
  try {
    const response = await axios.get(`https://archidekt.com/api/decks/${req.params.id}/`, {
      headers: { "User-Agent": "RuneDeck/2.0" },
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch deck from Archidekt" });
  }
});

// Proxy for Moxfield
router.get("/mf/:id", async (req, res) => {
  const deckId = req.params.id;
  const deckPageUrl = `https://www.moxfield.com/decks/${deckId}`;
  
  const userAgents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
  ];

  const strategies = [
    {
      name: "Official API (api2)",
      url: `https://api2.moxfield.com/v2/decks/all/${deckId}`,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        "Accept": "application/json",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://www.moxfield.com/",
        "X-Requested-With": "XMLHttpRequest",
        "X-Moxfield-Application": "moxfield-web"
      },
      process: (data: any) => (data && data.name ? data : null)
    },
    {
      name: "Mobile App API (api2)",
      url: `https://api2.moxfield.com/v2/decks/all/${deckId}`,
      headers: {
        "User-Agent": "Moxfield/2.1.3 (com.moxfield.mobile; build:42; iOS 17.5.1) Alamofire/5.9.1",
        "Accept": "application/json",
        "Accept-Language": "en-US,en;q=0.9",
        "X-Moxfield-Application": "moxfield-mobile"
      },
      process: (data: any) => (data && data.name ? data : null)
    },
    {
      name: "Legacy Search API",
      url: `https://api.moxfield.com/v2/decks/all/${deckId}`,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json",
        "Referer": "https://www.moxfield.com/decks/public"
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
      const resp = await axios.get(s.url, {
        headers: s.headers,
        timeout: 8000,
        validateStatus: (status) => status === 200
      });
      const processed = s.process(resp.data);
      if (processed) return res.json(processed);
    } catch (e: any) {}
  }

  res.status(403).json({ 
    error: "Moxfield blokkeert de verbinding (403/Cloudflare).", 
    deckId,
    suggestManual: true 
  });
});

// Gemini API Proxy
router.post("/gemini", async (req, res) => {
  try {
    const { model, contents, config, systemInstruction } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "GEMINI_API_KEY is not set" });

    const body: any = { contents, generationConfig: config };
    if (systemInstruction) body.system_instruction = { parts: [{ text: systemInstruction }] };

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      body,
      { headers: { "Content-Type": "application/json" } }
    );
    res.json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
  }
});

// Mount router on both /api and / to ensure compatibility with Vercel routing
app.use("/api", router);
app.use("/", router);

export default app;
