const {ts, fs, read, write, removeJsx} = require('./cleanup-helpers.cjs');
let s = read('pages/AddPackagePage.tsx');
s = s.replace(/^\s*setMinGuests\('[^']+'\);\n/gm, '');
s = s.replace('(Min: {minGuests} s/d Max: {maxGuests})', '(Min: {quotaMin || \'0\'})');
s = removeJsx(s, 'span', text => text.includes('{minAge}'));
write('pages/AddPackagePage.tsx', s);
s = read('pages/CustomerSearchPage.tsx').replace('pkg.schedule || getDynamicScheduleStr(0, 3)', "pkg.schedule || 'Jadwal belum tersedia'");
write('pages/CustomerSearchPage.tsx', s);
s = read('pages/CustomerSettingsPage.tsx').replace('customerProfile, setCustomerProfile, navigateTo, setSelectedPackageForDetail', 'customerProfile, setCustomerProfile');
write('pages/CustomerSettingsPage.tsx', s);
s = read('App.tsx').replace('providerProfile, customerProfile, navigateTo', 'providerProfile, navigateTo');
write('App.tsx', s);
s = read('components/Sidebar.tsx').replace("'Wisata Nusantara'", "'Mitra'");
write('components/Sidebar.tsx', s);

// Remove only unused imports identified by TypeScript after deleting unsupported features.
const configPath = ts.findConfigFile(__dirname, ts.sys.fileExists, 'tsconfig.app.json');
const config = ts.readConfigFile(configPath, ts.sys.readFile);
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, __dirname);
const program = ts.createProgram(parsed.fileNames, parsed.options);
const diagnostics = ts.getPreEmitDiagnostics(program);
const unusedByFile = new Map();
for (const d of diagnostics.filter(d => d.code === 6133 && d.file)) {
  const text = d.file.text.slice(d.start, d.start + d.length);
  const names = unusedByFile.get(d.file.fileName) || [];
  names.push(text); unusedByFile.set(d.file.fileName, names);
}
for (const [file, names] of unusedByFile) {
  let source = fs.readFileSync(file, 'utf8');
  source = source.replace(/import\s+([\s\S]*?)\s+from\s+(['"][^'"\n]+['"]);/g, (whole, bindings, module) => {
    const match = bindings.match(/^\{([\s\S]+)\}$/);
    if (match) {
      const kept = match[1].split(',').map(x=>x.trim()).filter(x=>x && !names.includes(x));
      return kept.length ? 'import { ' + kept.join(', ') + ' } from ' + module + ';' : '';
    }
    return whole;
  });
  fs.writeFileSync(file, source);
}
