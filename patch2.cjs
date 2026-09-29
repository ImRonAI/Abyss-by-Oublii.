const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  'if (!process.env.GEMINI_API_KEY) {\\n       console.warn("GEMINI_API_KEY not set. Returning fallback.");\\n       return res.json({ text: "Fallback Logo", candidates: [] });\\n    }',
  'if (!process.env.GEMINI_API_KEY) {\\n       throw new Error("GEMINI_API_KEY not set.");\\n    }'
);

fs.writeFileSync('server.ts', code);
