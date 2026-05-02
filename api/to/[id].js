export default async function handler(req, res) {
  const { id } = req.query;

  try {
    const response = await fetch(`https://tappedout.net/api/v1/decks/${id}/`, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Accept": "application/json",
      },
    });

    if (response.ok) {
      const data = await response.json();
      return res.status(200).json(data);
    }
  } catch (e) {}

  // Fallback to txt format
  try {
    const response = await fetch(`https://tappedout.net/mtg-decks/${id}/?fmt=txt`, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: "Failed to fetch from TappedOut" });
    }

    const data = await response.text();
    // Verify it is not html
    if (data.includes("<html") || data.includes("<!DOCTYPE")) {
      return res.status(404).json({ error: "Deck not found or private on TappedOut" });
    }

    return res.status(200).json({ rawText: data, id });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

