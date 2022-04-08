import { default as ts } from 'typescript'
import { convertTypeScriptToCoreTypes, convertCoreTypesToTypeScript } from 'core-types-ts'
import { convertCoreTypesToOpenApi, convertCoreTypesToJsonSchema } from 'core-types-json-schema'
import { convertCoreTypesToGraphql } from 'core-types-graphql'
import { default as chalk } from 'chalk'
import { resolve, join, basename, dirname} from 'node:path'
import typescripttransformpaths from 'typescript-transform-paths'

const createTransform = typescripttransformpaths.default

export const toOpenApi = (data) => convertCoreTypesToOpenApi(data,{ title: undefined })
export const toJsonSchema = convertCoreTypesToJsonSchema
export const toGraphql = convertCoreTypesToGraphql
export const toTypeScript = convertCoreTypesToTypeScript

export const primitives = ['number', 'string', 'boolean', 'bigint', 'symbol', 'null', 'undefined']

// TODO do diagnostics without emitting
// TODO prettier colors for tty
// TODO write files only once ..
/*
  const createdFiles = {}
  const host = ts.createCompilerHost(options);
  host.writeFile = (fileName: string, contents: string) => createdFiles[fileName] = contents
  const program = ts.createProgram(fileNames, options, host);
  for (createdFiles)
*/
async function compile(filename, outDir, rootDir, paths) {
  let counter = 0
  if (process.stdout.isTTY) console.log('compiling with', chalk.blue.bold('tsc --target esnext --module nodenext  --moduleResolution nodenext --declaration'), chalk.blue('--outDir', outDir), chalk.green(filename))
  const tscConfig = {
    baseUrl: rootDir,
    rootDir,
    outDir,
    paths,
    noEmitOnError: true,
    noImplicitAny: false,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.NodeNext,
    declaration: true,
    listEmittedFiles: true,
    esModuleInterop: true
  }
  const program = ts.createProgram([filename], tscConfig)
  let emitResult = await program.emit(
    undefined,
    (fileName, content) => {
      ts.sys.writeFile(fileName, `// ! do not edit @generated  ${JSON.stringify(new Date())}  ${ts.sys.newLine}${content}`);
    },
    undefined,
    undefined,
    {
      before: [],
      after: [createTransform(program)],
      afterDeclarations: [createTransform(program)],
    })
  let allDiagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics)
  allDiagnostics.forEach((diagnostic) => {
    if (process.stdout.isTTY) console.log(chalk.red(diagnostic?.file?.fileName||''))
    if (diagnostic?.file) {
      let { line, character } = ts.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start)
      let message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')
      console.error(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`)
    } else {
      console.error(chalk.red(filename),ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'))
    }
  })

  let exitCode = emitResult.emitSkipped ? 1 : 0
  if (exitCode) process.exit(exitCode)
  const tmp = join(basename(dirname(filename)),basename(filename,'.mts')+'.mjs')
  const root = emitResult.emittedFiles.filter(x=>x.endsWith(tmp)).pop()
  return { program, root, emittedFiles: [...emitResult.emittedFiles.map(x=>resolve(x))]}
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
  // walk the AST for ..
  // export const x = (a,b) => {}
  // export const x = function y(a,b){}
  // export function x(a,b)
  const methods = []
  const imports = {}

    const sourceFile = main.getSourceFile(mainFileName)
    if (!sourceFile.isDeclarationFile) {
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
              // TODO alternate types with |
              let isAsync
              if (type.startsWith('Promise<')) isAsync = true
              type = type.replace('Promise<', '').replace('>', '')
              // export const x = function y(a,b){}
              let aliasFor = declaration.initializer.symbol.escapedName.toString()
              if (aliasFor === '__function') aliasFor = undefined
              let jsDoc = []
              if (node.jsDoc) for (const { comment } of node.jsDoc) jsDoc.push(comment)
              else jsDoc = undefined
              methods.push({ name, type, isAsync, parameters, aliasFor, jsDoc })
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
          let isAsync
          if (type.startsWith('Promise<')) isAsync = true
          type = type.replace('Promise<', '').replace('>', '')
          let jsDoc = []
          if (node.jsDoc) for (const { comment } of node.jsDoc) jsDoc.push(comment)
          else jsDoc = undefined
          methods.push({ name, type,isAsync, parameters, jsDoc })
        }
      }
      )
      for (const {parent:node} of sourceFile.imports){
        const moduleSpecifier = node.moduleSpecifier.text
        if (!imports[moduleSpecifier]) imports[moduleSpecifier] = []
        for (const element of node.importClause.namedBindings.elements) {
          // import {x as y} from '...'
          if (element.propertyName){
            const name = element.name.escapedText
            const realname =  element.propertyName.escapedText
            imports[moduleSpecifier].push(`${realname} as ${name}`)
          } else imports[moduleSpecifier].push(element.name.escapedText)
        }
      }
    }
  let typesInUse = [...new Set(methods.map(({ parameters }) => parameters.map(({ type }) => type)).flat())].filter((x) => !primitives.includes(x))
  typesInUse = [...new Set([...typesInUse, ...new Set(methods.map(({ type }) => type).filter((x) => !primitives.includes(x)))])]
  const x = geetTypes(typesInUse,mainFileName,main)
  return { imports, types:typesInUse, interfaces:x,methods }
}


function geetTypes(types, filename, main){
  const result = {}
  const sourceFile = main.getSourceFile(filename)
  const coreTypes = convertTypeScriptToCoreTypes(sourceFile.text)
  const refs = []
  const needed = coreTypes.data.types.filter(({name})=> types.includes(name))
  for (const type of needed){
    const {name, properties} = type
    result[name] = type
    result[name].orig = filename
    for (const key of Object.keys(properties)) {
      const ref = properties[key].node.ref
      if (ref && !types.includes(ref)){
        refs.push(ref)
      }
    }
  }
  const found = Object.keys(result)
  const notFound = [...new Set([...refs,...types])].filter(x => !found.includes(x))
  if (notFound.length){
    // TODO there is list of imports ..
    // for now just brute force over all imports
    for (const node of sourceFile.imports){
      const y = geetTypes(notFound, resolve(join(dirname(sourceFile.path)),dirname(node.text),basename(node.text,'.mjs')+'.mts'), main)
      for (const key of Object.keys(y)){
        result[key] = y[key]
      }
    }
  }
  return result
}


export async function compileundparse(fileName, outDir,rootDir, paths) {
  const { program:main, root:compiledFilename } = await compile(fileName, outDir,rootDir, paths)
  const { imports, methods, types, interfaces } = getImportsundMethods(main, fileName)
  if (process.stdout.isTTY) {
    console.log('parsed', chalk.green(fileName))
    console.log('imports:', chalk.blue(Object.keys(imports).join(';')))
    console.log('interfaces:', chalk.blue(Object.keys(interfaces).join(';')))
    console.log('methods:', chalk.blue(methods.map(({ name }) => name).join(';')))
}
  return { imports, interfaces, methods, compiledFilename }
}
