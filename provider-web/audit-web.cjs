const fs = require('fs'), ts = require('typescript'), path = require('path');
function scan(dir) {
  for (const entry of fs.readdirSync(dir, {withFileTypes:true})) {
    const file = path.join(dir,entry.name);
    if(entry.isDirectory()) scan(file);
    else if(file.endsWith('.tsx')) {
      const source = ts.createSourceFile(file, fs.readFileSync(file,'utf8'), ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
      function visit(node) {
        if(ts.isJsxElement(node) && node.openingElement.tagName.getText(source)==='button') {
          const props = node.openingElement.attributes.getText(source);
          const text = node.getText(source);
          if(!props.includes('onClick') && !props.includes('disabled') && !props.includes('type="submit"')) {
            let parent=node.parent, hasForm=false;
            while(parent) { if(ts.isJsxElement(parent)&&parent.openingElement.tagName.getText(source)==='form') hasForm=true; parent=parent.parent; }
            if(!hasForm) console.log(file+':'+(source.getLineAndCharacterOfPosition(node.getStart(source)).line+1)+' '+text.replace(/\s+/g,' ').slice(0,220));
          }
        }
        ts.forEachChild(node,visit);
      }
      visit(source);
    }
  }
}
scan(__dirname+'/src');
