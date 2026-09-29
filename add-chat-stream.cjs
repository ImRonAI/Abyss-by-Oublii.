const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const chatStreamCode = `
app.post("/api/strategy/chat-stream", async (req, res) => {
  const { contents, systemInstruction } = req.body;
  try {
    const payload = {
      model: "openai/gpt-5.5",
      input: Array.isArray(contents) ? contents.map((c) => ({
        type: "message",
        role: c.role === 'model' || c.role === 'assistant' ? 'assistant' : 'user',
        content: Array.isArray(c.parts) ? c.parts.map(p => {
          if (p.inlineData) return { type: "input_image", image_url: \`data:\${p.inlineData.mimeType};base64,\${p.inlineData.data}\` };
          return { type: "input_text", text: p.text || "" };
        }) : [{ type: "input_text", text: JSON.stringify(c) }]
      })) : [{ type: "message", role: "user", content: [{ type: "input_text", text: JSON.stringify(contents) }] }],
      instructions: systemInstruction || "You are an elite Brand Strategist.",
      stream: true,
      max_output_tokens: 65536
    };

    const response = await fetch("https://api.perplexity.ai/v1/agent", {
      method: "POST",
      headers: {
        "Authorization": \`Bearer \${process.env.PERPLEXITY_API_KEY}\`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      res.status(500).json({ error: \`Perplexity API Stream Error: \${response.status} \${errText}\` });
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
      const lines = buffer.split('\\n');
      buffer = lines.pop() || "";
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const dataStr = line.slice(6);
          if (dataStr === '[DONE]') continue;
          try {
            const data = JSON.parse(dataStr);
            if (data.type === 'response.output_text.delta' && data.delta && data.delta.text) {
               res.write(JSON.stringify({ text: data.delta.text }) + "\\n");
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
`;

code = code.replace(
  'app.post("/api/notify",',
  chatStreamCode + '\napp.post("/api/notify",'
);

fs.writeFileSync('server.ts', code);
