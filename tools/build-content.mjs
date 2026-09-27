import fs from 'node:fs';
import path from 'node:path';
import {ROOT,compile,serialize,sha} from './lib.mjs';
const bytes=serialize(compile());
fs.mkdirSync(path.join(ROOT,'app/data'),{recursive:true});
fs.writeFileSync(path.join(ROOT,'app/data/content.json'),bytes);
fs.writeFileSync(path.join(ROOT,'app/data/content.sha256'),sha(bytes)+'\n');
console.log(`Built app/data/content.json\nSHA256 ${sha(bytes)}`);
