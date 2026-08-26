import { readFileSync, writeFileSync } from 'node:fs';

const src = readFileSync('/home/user/Your-AI-Stack/src/data.ts', 'utf8');
const disc = readFileSync('/home/user/Your-AI-Stack/src/data/discontinuedAi.ts', 'utf8');

const toolsStart = src.indexOf('export const tools: Tool[] = [');
if (toolsStart < 0) throw new Error('tools marker not found');
let toolsBody = src.slice(toolsStart + 'export const tools: Tool[] = '.length).trimEnd();
if (toolsBody.endsWith(';')) toolsBody = toolsBody.slice(0, -1);

const metaMatch = disc.match(/export const discontinuedAiMeta = (\{[\s\S]*?\n\});/);
if (!metaMatch) throw new Error('meta marker not found');
const metaBody = metaMatch[1];

const itemsStart = disc.indexOf('export const discontinuedAiItems: DiscontinuedAIItem[] = [');
if (itemsStart < 0) throw new Error('items marker not found');
let itemsBody = disc.slice(itemsStart + 'export const discontinuedAiItems: DiscontinuedAIItem[] = '.length).trimEnd();
if (itemsBody.endsWith(';')) itemsBody = itemsBody.slice(0, -1);

const header = `// =============================================================================
// Your AI Stack — the catalogue itself.
//
// Generated from the Your-AI-Stack repository's src/data.ts and
// src/data/discontinuedAi.ts by scripts/port-ai-stack.mjs. Edit the source
// there and re-run the script rather than hand-editing this file, so the two
// copies of the catalogue cannot drift apart.
//
// The rendering and interaction live in ai-stack.js; this file is data only.
// =============================================================================

window.AI_STACK_TOOLS = `;

const out = header + toolsBody + ';\n\nwindow.AI_STACK_DISCONTINUED_META = ' + metaBody +
  ';\n\nwindow.AI_STACK_DISCONTINUED = ' + itemsBody + ';\n';

writeFileSync('/home/user/AI_Learning_Hub/assets/ai-stack-data.js', out);
console.log('written', out.length, 'bytes');
