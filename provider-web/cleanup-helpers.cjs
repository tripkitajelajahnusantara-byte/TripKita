const fs = require('fs');
const ts = require('typescript');
const root = __dirname + '/src/';
const read = p => fs.readFileSync(root + p, 'utf8').replace(/\r\n/g, '\n');
const write = (p, s) => fs.writeFileSync(root + p, s);
function between(s, a, b, replacement = '') {
  const start = s.indexOf(a), end = s.indexOf(b, start + a.length);
  if (start < 0 || end < 0) throw Error(`Missing markers: ${a} / ${b}`);
  return s.slice(0, start) + replacement + s.slice(end);
}
function removeNodes(s, predicate) {
  const source = ts.createSourceFile('page.tsx', s, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const ranges = [];
  function visit(node) {
    if (predicate(node, source)) ranges.push([node.getStart(source), node.end]);
    else ts.forEachChild(node, visit);
  }
  visit(source);
  for (const [start, end] of ranges.sort((a,b) => b[0]-a[0])) s = s.slice(0,start)+s.slice(end);
  return s;
}
const removeVars = (s, names) => removeNodes(s, (n, sf) => ts.isVariableStatement(n) && n.declarationList.declarations.some(d => names.includes(d.name.getText(sf))));
const removeJsx = (s, tag, match) => removeNodes(s, (n, sf) => ts.isJsxElement(n) && n.openingElement.tagName.getText(sf) === tag && match(n.getText(sf)));
module.exports = {fs, ts, read, write, between, removeNodes, removeVars, removeJsx};
