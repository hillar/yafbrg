"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const typescript_1 = __importDefault(require("typescript"));
const utils_1 = require("./utils");
const visitor_1 = require("./visitor");
const harmony_factory_1 = require("./utils/harmony-factory");
const minimatch_1 = require("minimatch");
const ts_helpers_1 = require("./utils/ts-helpers");
/* ****************************************************************************************************************** */
// region: Helpers
/* ****************************************************************************************************************** */
function getTsProperties(args) {
    var _a;
    let tsInstance;
    let compilerOptions;
    let fileNames;
    let isTsNode = false;
    const { 0: program, 2: extras, 3: manualTransformOptions } = args;
    tsInstance = (_a = extras === null || extras === void 0 ? void 0 : extras.ts) !== null && _a !== void 0 ? _a : typescript_1.default;
    compilerOptions = manualTransformOptions === null || manualTransformOptions === void 0 ? void 0 : manualTransformOptions.compilerOptions;
    if (program) {
        compilerOptions !== null && compilerOptions !== void 0 ? compilerOptions : (compilerOptions = program.getCompilerOptions());
    }
    else if (manualTransformOptions) {
        fileNames = manualTransformOptions.fileNames;
    }
    else {
        const tsNodeProps = (0, ts_helpers_1.getTsNodeRegistrationProperties)(tsInstance);
        if (!tsNodeProps)
            throw new Error(`Cannot transform without a Program, ts-node instance, or manual parameters supplied. ` +
                `Make sure you're using ts-patch or ts-node with transpileOnly.`);
        isTsNode = true;
        compilerOptions = tsNodeProps.compilerOptions;
        fileNames = tsNodeProps.fileNames;
    }
    return { tsInstance, compilerOptions, fileNames, isTsNode };
}
// endregion
/* ****************************************************************************************************************** */
// region: Transformer
/* ****************************************************************************************************************** */
function transformer(program, pluginConfig, transformerExtras, 
/**
 * Supply if manually transforming with compiler API via 'transformNodes' / 'transformModule'
 */
manualTransformOptions) {
    return (transformationContext) => {
        var _a, _b, _c;
        // prettier-ignore
        const { tsInstance, compilerOptions, fileNames, isTsNode } = getTsProperties([program, pluginConfig, transformerExtras, manualTransformOptions]);
        const rootDirs = (_a = compilerOptions.rootDirs) === null || _a === void 0 ? void 0 : _a.filter(path_1.default.isAbsolute);
        const config = pluginConfig !== null && pluginConfig !== void 0 ? pluginConfig : {};
        const getCanonicalFileName = tsInstance.createGetCanonicalFileName(tsInstance.sys.useCaseSensitiveFileNames);
        let emitHost = transformationContext.getEmitHost();
        if (!emitHost) {
            if (!fileNames)
                throw new Error(`No EmitHost found and could not determine files to be processed. Please file an issue with a reproduction!`);
            emitHost = (0, ts_helpers_1.createSyntheticEmitHost)(compilerOptions, tsInstance, getCanonicalFileName, fileNames);
        }
        else if (isTsNode) {
            Object.assign(emitHost, { getCompilerOptions: () => compilerOptions });
        }
        const { configFile, paths } = compilerOptions;
        // TODO - Remove typecast when tryParsePatterns is recognized (probably after ts v4.4)
        const { tryParsePatterns } = tsInstance;
        const tsTransformPathsContext = {
            compilerOptions,
            config,
            elisionMap: new Map(),
            tsFactory: transformationContext.factory,
            program,
            rootDirs,
            transformationContext,
            tsInstance,
            emitHost,
            isTsNode,
            tsThreeInstance: (0, utils_1.cast)(tsInstance),
            excludeMatchers: (_b = config.exclude) === null || _b === void 0 ? void 0 : _b.map((globPattern) => new minimatch_1.Minimatch(globPattern, { matchBase: true })),
            outputFileNamesCache: new Map(),
            // Get paths patterns appropriate for TS compiler version
            pathsPatterns: paths &&
                (tryParsePatterns
                    ? // TODO - Remove typecast when pathPatterns is recognized (probably after ts v4.4)
                        ((_c = configFile === null || configFile === void 0 ? void 0 : configFile.configFileSpecs) === null || _c === void 0 ? void 0 : _c.pathPatterns) || tryParsePatterns(paths)
                    : tsInstance.getOwnKeys(paths)),
        };
        return (sourceFile) => {
            const visitorContext = Object.assign(Object.assign({}, tsTransformPathsContext), { sourceFile, isDeclarationFile: sourceFile.isDeclarationFile, originalSourceFile: tsInstance.getOriginalSourceFile(sourceFile), getVisitor() {
                    return visitor_1.nodeVisitor.bind(this);
                }, factory: (0, harmony_factory_1.createHarmonyFactory)(tsTransformPathsContext) });
            return tsInstance.visitEachChild(sourceFile, visitorContext.getVisitor(), transformationContext);
        };
    };
}
exports.default = transformer;
// endregion
