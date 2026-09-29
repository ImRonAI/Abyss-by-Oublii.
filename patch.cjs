const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Add imports
if (!code.includes('import { GoogleGenAI }')) {
  code = code.replace("import express from 'express';", "import express from 'express';\nimport { GoogleGenAI } from '@google/genai';\nimport { Resend } from 'resend';");
}

code = code.replace(
  'app.post("/api/notify", (req, res) => res.json({ success: true }));',
  `app.post("/api/notify", async (req, res) => {
  try {
    const data = req.body;
    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: 'Acme <onboarding@resend.dev>',
        to: [data.email || 'hello@example.com'],
        subject: 'New Intake Form Submitted',
        html: \`<p>New intake submission from \${data.name} (\${data.company})</p>\`
      });
    } else {
      console.warn("RESEND_API_KEY not set. Email not sent.");
    }
    res.json({ success: true });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: 'Failed to send notification', details: error.message });
  }
});`
);

code = code.replace(
  'app.post("/api/notify-plan", (req, res) => res.json({ success: true }));',
  `app.post("/api/notify-plan", async (req, res) => {
  try {
    const data = req.body;
    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: 'Acme <onboarding@resend.dev>',
        to: [data.email || 'hello@example.com'],
        subject: 'Your Strategic Plan is Ready',
        html: \`<p>Your AI-generated strategic plan is ready for review.</p>\`
      });
    }
    res.json({ success: true });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: 'Failed to send notification', details: error.message });
  }
});`
);

code = code.replace(
  'app.post("/api/generate-logo", (req, res) => res.json({ text: "Fallback Logo", candidates: [] }));',
  `app.post("/api/generate-logo", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: "No prompt provided" });
    
    if (!process.env.GEMINI_API_KEY) {
       console.warn("GEMINI_API_KEY not set. Returning fallback.");
       return res.json({ text: "Fallback Logo", candidates: [] });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateImages({
      model: 'imagen-3.0-generate-002',
      prompt: prompt,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/png',
        aspectRatio: '1:1'
      }
    });
    
    if (response.generatedImages && response.generatedImages.length > 0) {
      const b64 = response.generatedImages[0].image.imageBytes;
      res.json({ text: "Logo generated successfully", candidates: [\`data:image/png;base64,\${b64}\`] });
    } else {
      res.status(500).json({ error: "Failed to generate logo" });
    }
  } catch (error: any) {
    console.error("Logo generation error:", error);
    res.status(500).json({ error: error.message });
  }
});`
);

fs.writeFileSync('server.ts', code);
