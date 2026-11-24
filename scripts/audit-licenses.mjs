/**
 * Auditoria automatizada de licenças open-source (Propriedade Intelectual).
 * Verifica todas as dependências instaladas em node_modules buscando licenças
 * restritivas (copyleft forte como GPL, AGPL, SSPL, EUPL) incompatíveis com
 * distribuição comercial fechada.
 */
import fs from 'node:fs';
import path from 'node:path';

const RESTRICTIVE_PATTERNS = [
  /\bAGPL/i,
  /\bGPL/i,
  /\bSSPL/i,
  /\bEUPL/i,
  /\bCPAL/i,
  /\bOSL/i,
];

const SAFE_EXACT = new Set([
  'MIT',
  'MIT-0',
  'ISC',
  'Apache-2.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  '0BSD',
  'OFL-1.1',
  'CC0-1.0',
  'CC-BY-4.0',
  'BlueOak-1.0.0',
  'Unlicense',
  'Python-2.0',
  'MPL-2.0',
]);

const rootDir = process.cwd();
const nodeModulesDir = path.join(rootDir, 'node_modules');

if (!fs.existsSync(nodeModulesDir)) {
  console.error('node_modules não encontrado. Execute npm install primeiro.');
  process.exit(1);
}

const found = [];

function scanDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name.startsWith('@')) {
        scanDir(fullPath);
      } else {
        const pkgPath = path.join(fullPath, 'package.json');
        if (fs.existsSync(pkgPath)) {
          try {
            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
            const license =
              typeof pkg.license === 'string'
                ? pkg.license
                : pkg.license?.type ||
                  (Array.isArray(pkg.licenses)
                    ? pkg.licenses.map((l) => l.type || l).join(' OR ')
                    : 'UNKNOWN');
            found.push({
              name: pkg.name || entry.name,
              version: pkg.version || '0.0.0',
              license,
            });
          } catch {
            // ignore unreadable
          }
        }
      }
    }
  }
}

scanDir(nodeModulesDir);

const counts = {};
const flagged = [];
const unknown = [];

for (const item of found) {
  counts[item.license] = (counts[item.license] || 0) + 1;
  const isRestrictive =
    RESTRICTIVE_PATTERNS.some((rx) => rx.test(item.license)) &&
    !/\bMIT\b|\bApache-2\.0\b|\bBSD/i.test(item.license);
  if (isRestrictive) {
    flagged.push(item);
  } else if (item.license === 'UNKNOWN') {
    unknown.push(item);
  }
}

console.log(`\n=== FerroLab — Auditoria de Licenças Open-Source ===`);
console.log(`Total de pacotes auditados: ${found.length}`);
console.log('\nDistribuição de licenças:');
for (const [lic, count] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
  const badge = SAFE_EXACT.has(lic) ? '[OK]' : '[VERIFICAR]';
  console.log(`  ${badge} ${lic}: ${count}`);
}

if (flagged.length > 0) {
  console.error('\n[ALERTA] Licenças copyleft restritivas encontradas:');
  for (const item of flagged) {
    console.error(`  - ${item.name}@${item.version}: ${item.license}`);
  }
  process.exit(2);
}

if (unknown.length > 0) {
  console.warn('\n[AVISO] Pacotes sem campo license explícito:');
  for (const item of unknown) {
    console.warn(`  - ${item.name}@${item.version}`);
  }
}

console.log('\n[APROVADO] Nenhuma dependência GPL/AGPL/SSPL restritiva detectada.\n');
