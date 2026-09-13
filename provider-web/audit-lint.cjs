const { ESLint } = require('eslint');
const { execFileSync } = require('child_process');
const fs = require('fs');
(async () => {
  const eslint = new ESLint();
  const results = await eslint.lintFiles(['src']);
  const report = { errors: 0, warnings: 0, introduced: [] };
  for(const result of results) {
    report.errors += result.errorCount; report.warnings += result.warningCount;
    const relative = 'provider-web/' + result.filePath.replace(__dirname+'\\','').replaceAll('\\','/');
    let before;
    try { before = execFileSync('git', ['show', 'HEAD:'+relative], {encoding:'utf8',stdio:['ignore','pipe','ignore']}); }
    catch { before = ''; }
    const [baseline] = await eslint.lintText(before, {filePath:result.filePath});
    const counts = new Map();
    for(const issue of baseline.messages) counts.set(issue.ruleId, (counts.get(issue.ruleId)||0)+1);
    const afterCounts = new Map();
    for(const issue of result.messages) afterCounts.set(issue.ruleId, (afterCounts.get(issue.ruleId)||0)+1);
    for(const [rule,count] of afterCounts) {
      const added = count - (counts.get(rule)||0);
      if(added>0) report.introduced.push({file:relative,rule,added,issues:result.messages.filter(m=>m.ruleId===rule).map(m=>({line:m.line,message:m.message.split('\n')[0]}))});
    }
  }
  fs.writeFileSync('lint-audit.json',JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
})();
