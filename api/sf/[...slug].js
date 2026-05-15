import axios from "axios";

export default async function handler(req, res) {
  const { slug } = req.query;
  const path = Array.isArray(slug) ? slug.join("/") : slug;
  
  // Extract query parameters from req.url because req.query might be merged
  const urlObj = new URL(req.url, `http://${req.headers.host}`);
  const searchParams = urlObj.searchParams;
  // Remove 'slug' from searchParams because it's the path
  searchParams.delete("slug");
  
  const queryString = searchParams.toString();
  const url = `https://api.scryfall.com/${path}${queryString ? "?" + queryString : ""}`;

  try {
    const config = {
      method: req.method,
      url: url,
      headers: {
        "User-Agent": "RuneDeck/2.0",
        "Accept": "application/json",
      },
    };

    if (req.method === "POST") {
      config.data = req.body;
    }

    const response = await axios(config);
    return res.status(200).json(response.data);
  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    return res.status(500).json({ error: error.message });
  }
}
