const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const newGemini = `app.post("/api/gemini/generate", async (req, res) => {
  try {
    const { model, contents, config } = req.body;
    if (!process.env.GEMINI_API_KEY) {
       throw new Error("GEMINI_API_KEY environment variable is required");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: model || 'gemini-3.5-flash',
      contents: contents,
      config: config
    });
    res.json({ text: response.text });
  } catch (error) {
    console.error("Generate error:", error);
    res.status(500).json({ error: error.message });
  }
});`;

const newVerifyLocation = `app.post("/api/verify-location", async (req, res) => {
  try {
    const { value } = req.body;
    if (!process.env.GEMINI_API_KEY) {
       throw new Error("GEMINI_API_KEY environment variable is required");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: \`Please verify and expand this location into a standard format (e.g. City, State, Country). Return ONLY the expanded location, nothing else. If invalid, return the original string. Location: \${value}\`
    });
    res.json({ text: response.text });
  } catch (error) {
    console.error("Verify location error:", error);
    res.status(500).json({ error: error.message });
  }
});`;

code = code.replace(/app\.post\("\/api\/gemini\/generate"[\s\S]*?res\.status\(500\)\.json\(\{ error: error\.message \}\);\n  \}\n\}\);/, newGemini);
code = code.replace(/app\.post\("\/api\/verify-location"[\s\S]*?res\.status\(500\)\.json\(\{ error: error\.message \}\);\n  \}\n\}\);/, newVerifyLocation);

fs.writeFileSync('server.ts', code);
