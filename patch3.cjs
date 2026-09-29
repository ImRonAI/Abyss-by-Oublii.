const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  '// Fallback endpoints for previously defined routes in the UI',
  '// Endpoints for previously defined routes in the UI'
);

code = code.replace(
  'console.warn("GEMINI_API_KEY not set. Returning fallback.");\\n',
  ''
);

fs.writeFileSync('server.ts', code);
