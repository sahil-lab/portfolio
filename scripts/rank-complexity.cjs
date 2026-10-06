const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),child=require('node:child_process'),assert=require('node:assert/strict'),ts=require('typescript');
const {values:options}=require('node:util').parseArgs({options:{python:{type:'string'},report:{type:'string',default:'docs/code-complexity.md'},output:{type:'string',default:'outputs/performance/complexity-inventory.json'},'self-test':{type:'boolean'}}});
const root=process.cwd(),scriptExtensions=new Set(['.ts','.tsx','.js','.jsx','.mjs','.cjs']);
const controlKinds=new Set([ts.SyntaxKind.IfStatement,ts.SyntaxKind.ForStatement,ts.SyntaxKind.ForInStatement,ts.SyntaxKind.ForOfStatement,ts.SyntaxKind.WhileStatement,ts.SyntaxKind.DoStatement,ts.SyntaxKind.CatchClause,ts.SyntaxKind.CaseClause,ts.SyntaxKind.ConditionalExpression]);
const logicalKinds=new Set([ts.SyntaxKind.AmpersandAmpersandToken,ts.SyntaxKind.BarBarToken,ts.SyntaxKind.QuestionQuestionToken]);

function analyzeScript(file,text){
 const source=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true),functions=[],imports=new Set(),module={name:'<module>',line:1,complexity:1};let decisions=0,maxNesting=0,astNodes=0;
 function visit(node,current=module,depth=0){
  astNodes++;
  if(ts.isFunctionLike(node)&&node.body){
   const parent=node.parent,name=node.name?.getText(source)??(ts.isVariableDeclaration(parent)||ts.isPropertyAssignment(parent)?parent.name.getText(source):'<callback>');
   current={name,line:source.getLineAndCharacterOfPosition(node.getStart(source)).line+1,complexity:1};functions.push(current);depth=0;
  }
  const decision=controlKinds.has(node.kind)||ts.isBinaryExpression(node)&&logicalKinds.has(node.operatorToken.kind);
  if(decision){decisions++;current.complexity++}
  const nesting=depth+(controlKinds.has(node.kind)?1:0);maxNesting=Math.max(maxNesting,nesting);
  if(ts.isImportDeclaration(node)||ts.isExportDeclaration(node)){if(node.moduleSpecifier&&ts.isStringLiteral(node.moduleSpecifier))imports.add(node.moduleSpecifier.text)}
  if(ts.isCallExpression(node)&&node.arguments.length&&ts.isStringLiteral(node.arguments[0])&&(node.expression.kind===ts.SyntaxKind.ImportKeyword||ts.isIdentifier(node.expression)&&node.expression.text==='require'))imports.add(node.arguments[0].text);
  ts.forEachChild(node,next=>visit(next,current,nesting));
 }
 visit(source);functions.push(module);functions.sort((first,second)=>second.complexity-first.complexity||first.line-second.line);
 return {language:/\.tsx?$/.test(file)?'TypeScript':'JavaScript',decisions,functions:functions.length-1,maxCyclomatic:functions[0].complexity,maxNesting,astNodes,imports:[...imports].sort(),hotFunctions:functions.slice(0,6),errors:source.parseDiagnostics.map(diagnostic=>ts.flattenDiagnosticMessageText(diagnostic.messageText,' '))};
}

const pythonAnalyzer=String.raw`
import ast, json, sys

class Metrics(ast.NodeVisitor):
    def __init__(self):
        self.functions = []
        self.current = dict(name='<module>', line=1, complexity=1)
        self.module = self.current
        self.depth = 0
        self.maximum_depth = 0
        self.decisions = 0
        self.nodes = 0
        self.imports = set()

    def visit(self, node):
        self.nodes += 1
        previous, depth = self.current, self.depth
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.Lambda)):
            self.current = dict(name=getattr(node, 'name', '<lambda>'), line=node.lineno, complexity=1)
            self.functions.append(self.current)
            self.depth = 0
        control = isinstance(node, (ast.If, ast.IfExp, ast.For, ast.AsyncFor, ast.While, ast.ExceptHandler, ast.comprehension))
        decisions = int(control)
        if isinstance(node, ast.BoolOp):
            decisions += len(node.values) - 1
        if isinstance(node, ast.comprehension):
            decisions += len(node.ifs)
        if hasattr(ast, 'match_case') and isinstance(node, ast.match_case):
            decisions += 1
        self.decisions += decisions
        self.current['complexity'] += decisions
        self.depth += int(control)
        self.maximum_depth = max(self.maximum_depth, self.depth)
        if isinstance(node, ast.Import):
            self.imports.update(alias.name for alias in node.names)
        if isinstance(node, ast.ImportFrom):
            self.imports.add('.' * node.level + (node.module or ''))
        super().visit(node)
        self.current, self.depth = previous, depth

results = {}
for source in json.load(sys.stdin):
    try:
        metrics = Metrics()
        metrics.visit(ast.parse(source['text'], filename=source['file']))
        functions = sorted(metrics.functions + [metrics.module], key=lambda item: (-item['complexity'], item['line']))
        results[source['file']] = dict(language='Python', decisions=metrics.decisions, functions=len(metrics.functions), maxCyclomatic=functions[0]['complexity'], maxNesting=metrics.maximum_depth, astNodes=metrics.nodes, imports=sorted(metrics.imports), hotFunctions=functions[:6], errors=[])
    except SyntaxError as error:
        results[source['file']] = dict(language='Python', errors=[str(error)])
json.dump(results, sys.stdout)
`;

function analyzePython(sources){
 if(!sources.length)return {};
 if(!options.python)throw Error('Pass --python with the verified interpreter path to rank Python source.');
 const result=child.spawnSync(options.python,['-c',pythonAnalyzer],{input:JSON.stringify(sources),encoding:'utf8',maxBuffer:16*1024*1024});
 if(result.status!==0)throw Error(result.stderr||'Python AST analysis failed');return JSON.parse(result.stdout);
}

function main(){
 if(options['self-test']){
  const sample=analyzeScript('probe.ts','export function choose(value:number){if(value>0){for(const item of [value]){if(item>1)return item}}return value>2?1:0}');
  assert.equal(sample.decisions,4);assert.equal(sample.maxCyclomatic,5);assert.equal(sample.maxNesting,3);assert.deepEqual(sample.errors,[]);
  const python=analyzePython([{file:'probe.py',text:'def choose(value):\n    if value and value > 1:\n        return value\n    return 0\n'}])['probe.py'];assert.equal(python.decisions,2);assert.equal(python.maxCyclomatic,3);console.log('COMPLEXITY_PARSERS_PASS');
 }
 const files=child.execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{encoding:'utf8',maxBuffer:16*1024*1024}).split('\0').filter(Boolean),unique=[...new Set(files)].sort(),inventory=[],pythonSources=[];
 for(const file of unique){
  const absolute=path.resolve(root,file);if(!fs.existsSync(absolute)||!fs.statSync(absolute).isFile())continue;
  const bytes=fs.readFileSync(absolute),extension=path.extname(file).toLowerCase(),source=scriptExtensions.has(extension)&&!file.endsWith('.d.ts')||extension==='.py';
    const generated=absolute===path.resolve(options.report),entry={file,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),generated,kind:generated?'generated-report':source?'source':file.endsWith('.d.ts')?'declaration':['.css','.html','.json','.yaml','.yml','.toml','.md','.txt','.xml'].includes(extension)?'style/config/document':'asset/other',scope:/^(app|components|hooks|lib)\//.test(file)?'application':file.startsWith('server/')?'server':file.startsWith('tests/')?'test':file.startsWith('scripts/')||extension==='.py'?'tooling':'configuration'};
  if(source){const text=bytes.toString('utf8');entry.lines=text.split(/\r?\n/).filter(line=>line.trim()).length;if(extension==='.py')pythonSources.push({file,text});else Object.assign(entry,analyzeScript(file,text))}
  inventory.push(entry);
 }
 const python=analyzePython(pythonSources);for(const entry of inventory)if(python[entry.file])Object.assign(entry,python[entry.file]);
 const byPath=new Map(inventory.map(entry=>[entry.file,entry]));for(const entry of inventory){entry.dependencies=[];entry.importedBy=[]}
 for(const entry of inventory)for(const specifier of entry.imports??[]){
  if(!specifier.startsWith('.')&&!specifier.startsWith('@/'))continue;
  const base=specifier.startsWith('@/')?specifier.slice(2):path.posix.normalize(path.posix.join(path.posix.dirname(entry.file),specifier)),candidates=[base,...['.ts','.tsx','.js','.jsx','.mjs','.cjs','.py','/index.ts','/index.tsx','/index.js'].map(extension=>base+extension)],dependency=candidates.find(candidate=>byPath.has(candidate));
  if(dependency&&!entry.dependencies.includes(dependency)){entry.dependencies.push(dependency);byPath.get(dependency).importedBy.push(entry.file)}
 }
 const ranked=inventory.filter(entry=>entry.kind==='source'&&!entry.errors.length);for(const entry of ranked)entry.score=5*entry.maxCyclomatic+entry.decisions+10*entry.maxNesting+3*Math.min(20,entry.importedBy.length);
 ranked.sort((first,second)=>second.score-first.score||second.decisions-first.decisions||first.file.localeCompare(second.file));ranked.forEach((entry,index)=>entry.rank=index+1);
 const runtime=ranked.filter(entry=>entry.scope==='application'||entry.scope==='server'),failures=inventory.filter(entry=>entry.errors?.length),revision=child.execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 const summary={files:inventory.length,source:ranked.length,application:runtime.length,python:pythonSources.length,parseFailures:failures.length,revision};
 const output=path.resolve(options.output);fs.mkdirSync(path.dirname(output),{recursive:true});
 const report=path.resolve(options.report),link=file=>path.relative(path.dirname(report),path.resolve(file)).replaceAll('\\','/').replaceAll(' ','%20'),lines=['# Code Complexity And Optimization Order','','## Scope','',`Scanned ${inventory.length} Git-tracked or non-ignored project files at revision ${revision}. Parsed ${ranked.length} executable source files, including ${pythonSources.length} Python files; ${runtime.length} are application/server modules. This is an automated, full-file AST audit, not a claim that every file has been manually optimized.`, '', 'Dependencies, build output, local environments, ignored photos and generated artifacts are excluded by Git ignore rules. Every included asset, document, stylesheet and configuration file is inventoried below without inventing a code complexity score.','','## Ranking Method','','Score = 5 x maximum function cyclomatic complexity + file decision count + 10 x maximum control nesting + 3 x min(20, local importers). Cyclomatic complexity starts at one per function/module and counts branches, loops, conditional expressions and short-circuit operators. Nested functions are measured separately. Python additionally counts comprehensions and match alternatives. This score is a transparent prioritization heuristic, not Big-O complexity, measured execution time or proof that a file needs rewriting.','','## Application Optimization Order','','All visuals, effects, content and behavior must be preserved. Start with the highest-ranked application module; follow its owning dependencies when the measured cost lives there. Test and benchmark each change before continuing. Rendering profiles, cold-start timing and frame-time percentiles determine whether an algorithmic change helps.','','| Order | File | Score | Max CC | Decisions | Nesting | Local Importers |','| ---: | --- | ---: | ---: | ---: | ---: | ---: |'];
 runtime.forEach((entry,index)=>lines.push(`| ${index+1} | [${entry.file}](${link(entry.file)}) | ${entry.score} | ${entry.maxCyclomatic} | ${entry.decisions} | ${entry.maxNesting} | ${entry.importedBy.length} |`));
 lines.push('','## All Source Files, Descending','','| Rank | File | Scope | Language | Score | Max CC | Decisions | Functions | Nonblank Lines |','| ---: | --- | --- | --- | ---: | ---: | ---: | ---: | ---: |');
 ranked.forEach(entry=>lines.push(`| ${entry.rank} | [${entry.file}](${link(entry.file)}) | ${entry.scope} | ${entry.language} | ${entry.score} | ${entry.maxCyclomatic} | ${entry.decisions} | ${entry.functions} | ${entry.lines} |`));
 lines.push('','## Non-Executable File Inventory','','These files have no applicable control-flow complexity score. They are retained, not candidates for removal. Byte size alone does not establish browser cost.','','| File | Kind | Bytes |','| --- | --- | ---: |');
 inventory.filter(entry=>entry.kind!=='source').sort((first,second)=>(first.generated?0:first.bytes)-(second.generated?0:second.bytes)).reverse().forEach(entry=>lines.push(`| [${entry.file}](${link(entry.file)}) | ${entry.kind} | ${entry.generated?'generated':entry.bytes} |`));
 if(failures.length){lines.push('','## Parse Failures','','These files were inventoried but are not ranked; resolve parser compatibility before assigning a score.');for(const entry of failures)lines.push(`- ${entry.file}: ${entry.errors.join('; ')}`)}
 lines.push('','## Reproduce','','Run the installed Node interpreter on scripts/rank-complexity.cjs with --python pointing to the verified Python interpreter. Add --self-test to validate the two parsers. The JSON inventory in outputs/performance/complexity-inventory.json records every file hash, metrics, local dependencies and highest-complexity functions. Metrics describe the current working tree based on the recorded revision, including uncommitted changes; they are not a historical checkout of that revision.','');
 fs.mkdirSync(path.dirname(report),{recursive:true});fs.writeFileSync(report,lines.join('\n'));const generated=inventory.find(entry=>entry.generated);if(generated){const bytes=fs.readFileSync(report);generated.bytes=bytes.length;generated.sha256=crypto.createHash('sha256').update(bytes).digest('hex')}
 fs.writeFileSync(output,JSON.stringify({summary,method:'Score = 5 * maximum function cyclomatic complexity + file decision count + 10 * maximum control nesting + 3 * min(20, local importers). Static prioritization heuristic, not time complexity or runtime profiling.',ranking:ranked.map(entry=>entry.file),runtimeRanking:runtime.map(entry=>entry.file),inventory},null,2)+'\n');console.log('COMPLEXITY_INVENTORY '+JSON.stringify(summary));console.log('TOP_APPLICATION '+JSON.stringify(runtime.slice(0,12).map(entry=>({file:entry.file,score:entry.score,maxCyclomatic:entry.maxCyclomatic,functions:entry.hotFunctions}))));if(failures.length)process.exitCode=1;
}

main();
