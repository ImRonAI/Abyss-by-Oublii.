import { Resend } from "resend";
import { GoogleGenAI } from "@google/genai";
import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;

// Core Agent API integration based on the OpenAPI schema
async function callAgent(model: string, instructions: string, contentParts: any[], schemaName: string) {
  const schemas: any = {
    asset_analysis: {
      type: "object",
      properties: {
        assetType: { type: "string", enum: ["IMAGE", "VIDEO", "LINK", "DOCUMENT"] },
        colorStory: { type: "array", items: { type: "string" } },
        aestheticPresentation: { type: "string" },
        brandIdentity: { type: "string" },
        visualWalkthrough: { type: "string" }
      },
      required: ["assetType", "colorStory", "aestheticPresentation", "brandIdentity", "visualWalkthrough"],
      additionalProperties: false
    },
    brand_synthesis: {
      type: "object",
      properties: {
        brandColors: { type: "array", items: { type: "string" } },
        typography: { type: "string" },
        robustDescription: { type: "string" }
      },
      required: ["brandColors", "typography", "robustDescription"],
      additionalProperties: false
    }
  };

  const payload = {
    model,
    input: [
      {
        type: "message",
        role: "user",
        content: contentParts
      }
    ],
    instructions: instructions + "\n\nYou are equipped with tools: web_search, fetch_url, finance_search, people_search, and sandbox. You MUST use the sandbox tool to optimize, format, and validate your outputs where applicable.",
    tools: [
      { type: "web_search" },
      { type: "fetch_url" },
      { type: "finance_search" },
      { type: "people_search" },
      { type: "sandbox" }
    ],
    response_format: schemas[schemaName] ? {
      type: "json_schema",
      json_schema: {
        name: schemaName,
        schema: schemas[schemaName],
        strict: true
      }
    } : undefined,
    stream: false
  };

  const response = await fetch("https://api.perplexity.ai/v1/agent", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${PERPLEXITY_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Perplexity API Error: ${response.status} ${await response.text()}`);
  }

  const dataObj = await response.json();
  const assistantMessage = dataObj.output?.find((item: any) => item.type === "message" && item.role === "assistant");
  let responseText = "";

  if (assistantMessage && Array.isArray(assistantMessage.content)) {
    const textPart = assistantMessage.content.find((part: any) => part.type === "output_text");
    if (textPart) {
      responseText = textPart.text || "";
    }
  } else if (assistantMessage && typeof assistantMessage.content === "string") {
    responseText = assistantMessage.content;
  }

  let text = responseText.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
  }
  return schemas[schemaName] ? JSON.parse(text || "{}") : text;
}

app.post("/api/analyze-single", async (req, res) => {
  const { type, content, name } = req.body;
  try {
    let contentParts: any[] = [];
    let textPrompt = `You are a visionary brand analyst.
Review this asset carefully and extract its aesthetic properties.
Return a strict JSON object:
{
  "assetType": "IMAGE" | "VIDEO" | "LINK" | "DOCUMENT",
  "colorStory": ["#hex1", "#hex2"],
  "aestheticPresentation": "A detailed analysis of the visual and structural presentation",
  "brandIdentity": "The implied brand identity and personality",
  "visualWalkthrough": "A step-by-step visual walkthrough of the asset"
}`;

    if (type === 'image' || type === 'video' || type === 'document') {
      if (content.startsWith('data:image/')) {
        contentParts.push({ type: "input_image", image_url: content });
      } else {
        contentParts.push({ type: "input_text", text: `Content:\n${content}` });
      }
    } else if (type === 'url') {
      contentParts.push({ type: "input_text", text: `URL to analyze: ${content}` });
    } else {
      contentParts.push({ type: "input_text", text: content });
    }
    
    contentParts.push({ type: "input_text", text: textPrompt });

    // Utilizing openai/gpt-5.5 as listed in the available models schema for agent API
    const result = await callAgent("openai/gpt-5.6-luna", "You are an elite brand analyst.", contentParts, "asset_analysis");
    res.json(result);
  } catch (err: any) {
    console.error("Single asset analysis error:", err);
    res.status(500).json({ error: "Analysis failed", details: err.message });
  }
});

app.post("/api/synthesize-all", async (req, res) => {
  const { assets } = req.body;
  try {
    const summary = assets.map((a: any, i: number) => `Asset ${i+1} (${a.name}):\nType: ${a.analysis?.assetType}\nColor Story: ${a.analysis?.colorStory?.join(', ')}\nAesthetic: ${a.analysis?.aestheticPresentation}\nIdentity: ${a.analysis?.brandIdentity}\nWalkthrough: ${a.analysis?.visualWalkthrough}`).join('\n\n');
    
    const prompt = `You are a master brand strategist.
Review the following analyses of multiple brand assets and synthesize the overall brand aesthetic.
Assets:
${summary}

Return a strict JSON object:
{
  "brandColors": ["#hex1", "#hex2", "#hex3", "#hex4", "#hex5"],
  "typography": "A description of the typography (e.g., 'sans', 'serif', 'mono', or specific font pairings)",
  "robustDescription": "A robust, highly detailed description of the unified brand aesthetic and vision."
}`;

    const result = await callAgent("openai/gpt-5.6-luna", "You are a master brand strategist.", [{ type: "input_text", text: prompt }], "brand_synthesis");

    try {
      const mdContent = `# Brand Aesthetic (Synthesized)\n\n## Typography\n${result.typography}\n\n## Colors\n${result.brandColors?.join(', ')}\n\n## Description\n${result.robustDescription}\n`;
      fs.writeFileSync(path.join(process.cwd(), 'DESIGN.md'), mdContent);
    } catch(e) {
      console.error("Failed to write DESIGN.md:", e);
    }

    res.json(result);
  } catch (err: any) {
    console.error("Synthesize all error:", err);
    res.status(500).json({ error: "Synthesis failed", details: err.message });
  }
});

// Endpoints for previously defined routes in the UI

app.post("/api/strategy/chat-stream", async (req, res) => {
  const { contents, systemInstruction } = req.body;
  try {
    const payload = {
      model: "openai/gpt-5.6-luna",
      input: Array.isArray(contents) ? contents.map((c) => ({
        type: "message",
        role: c.role === 'model' || c.role === 'assistant' ? 'assistant' : 'user',
        content: Array.isArray(c.parts) ? c.parts.map(p => {
          if (p.inlineData) return { type: "input_image", image_url: `data:${p.inlineData.mimeType};base64,${p.inlineData.data}` };
          return { type: "input_text", text: p.text || "" };
        }) : [{ type: "input_text", text: JSON.stringify(c) }]
      })) : [{ type: "message", role: "user", content: [{ type: "input_text", text: JSON.stringify(contents) }] }],
      instructions: (systemInstruction || "You are an elite Brand Strategist.") + "\n\nYou are equipped with tools: web_search, fetch_url, finance_search, people_search, and sandbox. You MUST use the sandbox tool to optimize, format, and validate your outputs where applicable.",
    tools: [
      { type: "web_search" },
      { type: "fetch_url" },
      { type: "finance_search" },
      { type: "people_search" },
      { type: "sandbox" }
    ],
      stream: true,
      max_output_tokens: 65536
    };

    const response = await fetch("https://api.perplexity.ai/v1/agent", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      res.status(500).json({ error: `Perplexity API Stream Error: ${response.status} ${errText}` });
      return;
    }

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || "";
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const dataStr = line.slice(6);
          if (dataStr === '[DONE]') continue;
          try {
            const data = JSON.parse(dataStr);
            if (data.type === 'response.output_text.delta' && data.delta && data.delta.text) {
               res.write(JSON.stringify({ text: data.delta.text }) + "\n");
            } else if (data.type === 'response.output_text.done' && data.text) {
               // Text already streamed via delta, no need to duplicate
            }
          } catch (e) {
            console.error("Error parsing SSE JSON:", e, "Data string:", dataStr);
          }
        }
      }
    }
    res.end();
  } catch (err) {
    console.error("Stream error:", err);
    res.status(500).end();
  }
});

app.post("/api/notify", async (req, res) => {
  try {
    const data = req.body;
    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: 'Acme <onboarding@resend.dev>',
        to: [data.email || 'hello@example.com'],
        subject: 'New Intake Form Submitted',
        html: `<p>New intake submission from ${data.name} (${data.company})</p>`
      });
    } else {
      console.warn("RESEND_API_KEY not set. Email not sent.");
    }
    res.json({ success: true });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: 'Failed to send notification', details: error.message });
  }
});
app.post("/api/notify-plan", async (req, res) => {
  try {
    const data = req.body;
    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: 'Acme <onboarding@resend.dev>',
        to: [data.email || 'hello@example.com'],
        subject: 'Your Strategic Plan is Ready',
        html: `<p>Your AI-generated strategic plan is ready for review.</p>`
      });
    }
    res.json({ success: true });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: 'Failed to send notification', details: error.message });
  }
});
app.post("/api/generate-logo", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: "No prompt provided" });
    
    if (!process.env.GEMINI_API_KEY) {
       throw new Error("GEMINI_API_KEY environment variable is required");
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateImages({
      model: 'gemini-3-pro-image',
      prompt: prompt,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/png',
        aspectRatio: '1:1'
      }
    });
    
    if (response.generatedImages && response.generatedImages.length > 0) {
      const b64 = response.generatedImages[0].image.imageBytes;
      res.json({ text: "Logo generated successfully", candidates: [`data:image/png;base64,${b64}`] });
    } else {
      res.status(500).json({ error: "Failed to generate logo" });
    }
  } catch (error: any) {
    console.error("Logo generation error:", error);
    res.status(500).json({ error: error.message });
  }
});

async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}


app.post("/api/gemini/generate", async (req, res) => {
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
});

app.post("/api/verify-location", async (req, res) => {
  try {
    const { value } = req.body;
    if (!process.env.GEMINI_API_KEY) {
       throw new Error("GEMINI_API_KEY environment variable is required");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: `Please verify and expand this location into a standard format (e.g. City, State, Country). Return ONLY the expanded location, nothing else. If invalid, return the original string. Location: ${value}`
    });
    res.json({ text: response.text });
  } catch (error) {
    console.error("Verify location error:", error);
    res.status(500).json({ error: error.message });
  }
});
setupVite().then(() => {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
});
