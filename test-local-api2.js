import axios from 'axios';

async function test() {
  try {
    const { data } = await axios.get("http://localhost:3000/api/to/meren-of-clan-nel-toth-1");
  } catch (err) {
    if (err.response) {
      console.log("Error status:", err.response.status);
      console.log("Error data:", err.response.data);
    } else {
      console.log("Error:", err.message);
    }
  }
}
test();
