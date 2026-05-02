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
