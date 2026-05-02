import axios from 'axios';

async function test() {
  try {
    const { data } = await axios.get("http://localhost:3000/api/to/02-05-26-elemental");
    console.log("Response:", data);
  } catch (err) {
    console.log("Error:", err.message);
  }
}
test();
