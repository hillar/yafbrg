import { default as ts } from 'typescript'
import { convertTypeScriptToCoreTypes } from 'core-types-ts'
import { convertCoreTypesToOpenApi } from 'core-types-json-schema'
import { default as chalk } from 'chalk'

const primitives = ['number', 'string', 'boolean', 'bigint', 'symbol', 'null', 'undefined']

// TODO do diagnostics without emitting
// TODO prettier colors for tty
async function compile(filename, outDir = '../.build') {
  if (process.stdout.isTTY) console.log('compiling with', chalk.blue.bold('tsc --target esnext --module nodenext  --moduleResolution nodenext --declaration'), chalk.blue('--outDir', outDir), chalk.green(filename))
  const program = ts.createProgram([filename], {
    outDir,
    noEmitOnError: true,
    noImplicitAny: false,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.NodeNext,
    declaration: true,
  })

  let emitResult = await program.emit()
  let allDiagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics)

  allDiagnostics.forEach((diagnostic) => {
    if (process.stdout.isTTY) console.log(chalk.red(diagnostic.file.fileName))
    if (diagnostic.file) {
      let { line, character } = ts.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start)
      let message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')
      console.error(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`)
    } else {
      console.error(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'))
    }
  })

  let exitCode = emitResult.emitSkipped ? 1 : 0
  if (exitCode) process.exit(exitCode)

  return program
}

// TODO return only functions with HTTP method name
// TODO do not include imported but not used
function getImportsundMethods(main, mainFileName) {
  // Get the checker, we will use it to find types
  let checker = main.getTypeChecker()
  function getParam(parameter) {
    let type = checker.typeToString(checker.getTypeAtLocation(parameter), parameter, ts.TypeFormatFlags.None)
    const name = parameter.name.escapedText.toString()
    const required = parameter.questionToken?.kind !== ts.SyntaxKind.QuestionToken
    return { name, type, required }
  }
  // Visit every sourceFile in the program
  // Walk the tree to search for ..
  // export const x = (a,b) => {}
  // export const x = function y(a,b){}
  // export function x(a,b)
  const methods = []
  const imports = {}
  for (const sourceFile of main.getSourceFiles()) {
    if (!sourceFile.isDeclarationFile) {
      if (sourceFile.fileName !== mainFileName) continue
      ts.forEachChild(sourceFile, (node) => {
        if (ts.isVariableStatement(node)) {
          for (const declaration of node.declarationList.declarations) {
            // export const x = (a,b) => {}
            if (declaration.initializer.parameters && ts.getCombinedModifierFlags(declaration)) {
              const name = declaration.name.escapedText.toString()
              const parameters = []
              for (const parameter of declaration.initializer.parameters) {
                parameters.push(getParam(parameter))
              }
              let type = checker.typeToString(checker.getTypeAtLocation(declaration.initializer.type), declaration.initializer.type, ts.TypeFormatFlags.None)
              //TODO alternate tyes with |
              type = type.replace('Promise<', '').replace('>', '')
              // export const x = function y(a,b){}
              let aliasFor = declaration.initializer.symbol.escapedName.toString()
              if (aliasFor === '__function') aliasFor = undefined
              let jsDoc = []
              if (node.jsDoc) for (const { comment } of node.jsDoc) jsDoc.push(comment)
              else jsDoc = undefined
              methods.push({ name, type, parameters, aliasFor, jsDoc })
            }
          }
          // export function x(a,b)
        } else if (ts.isFunctionDeclaration(node)) {
          const name = node.name.escapedText.toString()
          const parameters = []
          for (const parameter of node.parameters) {
            parameters.push(getParam(parameter))
          }
          let type = checker.typeToString(checker.getTypeAtLocation(node.type), node.type, ts.TypeFormatFlags.None)
          //TODO Promise<foo>
          type = type.replace('Promise<', '').replace('>', '')
          let jsDoc = []
          if (node.jsDoc) for (const { comment } of node.jsDoc) jsDoc.push(comment)
          else jsDoc = undefined
          methods.push({ name, type, parameters, jsDoc })
        } else if (ts.isImportDeclaration(node)) {
          const moduleSpecifier = node.moduleSpecifier.text
          if (!imports[moduleSpecifier]) imports[moduleSpecifier] = []
          for (const element of node.importClause.namedBindings.elements) {
            imports[moduleSpecifier].push(element.name.escapedText)
          }
        }
      })
    }
  }
  return { imports, methods }
}

// TODO go recursive if subtype is not primitive
function getOAPISchemas(main, typesInUse) {
  const oapiSchemas = {}
  for (const sourceFile of main.getSourceFiles()) {
    ts.forEachChild(sourceFile, (node) => {
      if (ts.isInterfaceDeclaration(node)) {
        const name = node.name.text
        if (typesInUse.includes(name)) {
          if (!oapiSchemas[name]) {
            const { data } = convertCoreTypesToOpenApi(convertTypeScriptToCoreTypes(sourceFile.text).data, { title: undefined })
            for (const key of Object.keys(data.components.schemas)) {
              if (typesInUse.includes(key)) oapiSchemas[key] = data.components.schemas[key]
            }
          }
        }
      }
    })
  }
  return oapiSchemas
}

export async function compileundparse(fileName, outDir) {
  const main = await compile(fileName, outDir)
  //if (process.stdout.isTTY) console.log('OK',chalk.green(fileName))
  const { imports, methods } = getImportsundMethods(main, fileName)
  if (process.stdout.isTTY) console.log('parsed', chalk.green(fileName), 'imports:', Object.keys(imports).join(';'), 'methods:', methods.map(({ name }) => name).join(';'))
  // uniq param and return types
  let typesInUse = [...new Set(methods.map(({ parameters }) => parameters.map(({ type }) => type)).flat())].filter((x) => !primitives.includes(x))
  typesInUse = [...new Set([...typesInUse, ...new Set(methods.map(({ type }) => type))])]
  const schemas = getOAPISchemas(main, typesInUse)
  if (process.stdout.isTTY) console.log('parsed', chalk.green(fileName), 'schemas:', Object.keys(schemas).join(';'))
  return { imports, schemas, methods }
}

const r = await compileundparse(process.argv.slice(2)[0])
console.log(chalk.green(JSON.stringify(r,null,4)))
