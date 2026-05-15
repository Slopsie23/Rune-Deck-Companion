export default async function handler(req, res) {
  const { id } = req.query;
  const url = `https://api2.moxfield.com/v2/decks/all/${id}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "RuneDeck/2.0",
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return res.status(response.status).json({ error: errorData.message || "Failed to fetch from Moxfield" });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
