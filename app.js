import "dotenv/config";
import { bot } from "./src/bot.js";
import express from "express"; // Tambahkan import express

const app = express(); // Inisialisasi aplikasi express

app.get("/health", (req, res) => { // Tambahkan endpoint untuk health check
    res.status(200).send("OK");
});

const PORT = 8000; // Tentukan port untuk health check
app.listen(PORT, () => { // Jalankan server pada port 8000
    console.log(`Health check server running on port ${PORT}`);
});

bot.launch();