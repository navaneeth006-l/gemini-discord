import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

app.post("/chat",async (req,res) => {
    const {prompt} =req.body;

    try {
        const response = await fetch("http://localhost:11434/api/generate", {
            method : "POST",
            headers : {"Content-Type": "application/json"},
            body : JSON.stringify({model: "llama3:8b", prompt,stream:false}),
        });

        const data = await response.json();
        res.json({reply:data.response});
    } catch (err) {
        console.error("Error calling Ollama:",err);
        res.status(500).json({error:"Error communicating with local model"});
    }
});
app.listen(3000, ()=> console.log("🚀 Local API running on http://localhost:3000"));