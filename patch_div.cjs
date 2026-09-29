const fs = require('fs');
let code = fs.readFileSync('src/components/ClientIntakeForm.tsx', 'utf8');

code = code.replace(
  '        </div>\\n        </div>\\n      </div>\\n\\n      <AnimatePresence mode="wait">',
  '        </div>\\n      </div>\\n\\n      <AnimatePresence mode="wait">'
);

fs.writeFileSync('src/components/ClientIntakeForm.tsx', code);
