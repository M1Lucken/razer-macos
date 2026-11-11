const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../node_modules/webpack/lib/util/createHash.js');
if (!fs.existsSync(file)) {
  process.exit(0);
}

const source = fs.readFileSync(file, 'utf8');
const patched = source.replace(
  'return new BulkUpdateDecorator(require("crypto").createHash(algorithm));',
  'const name = algorithm === "md4" ? "sha256" : algorithm;\n\t\t\treturn new BulkUpdateDecorator(require("crypto").createHash(name));'
);

if (patched !== source) {
  fs.writeFileSync(file, patched);
}
