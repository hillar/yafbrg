import ts from "typescript";
import tsThree from "../declarations/typescript3";
declare type TypeMapping = [
    [
        ts.SourceFile,
        tsThree.SourceFile
    ],
    [
        ts.StringLiteral,
        tsThree.StringLiteral
    ],
    [
        ts.CompilerOptions,
        tsThree.CompilerOptions
    ],
    [
        ts.EmitResolver,
        tsThree.EmitResolver
    ],
    [
        ts.CallExpression,
        tsThree.CallExpression
    ],
    [
        ts.ExternalModuleReference,
        tsThree.ExternalModuleReference
    ],
    [
        ts.LiteralTypeNode,
        tsThree.LiteralTypeNode
    ],
    [
        ts.ExternalModuleReference,
        tsThree.ExternalModuleReference
    ],
    [
        ts.ImportTypeNode,
        tsThree.ImportTypeNode
    ],
    [
        ts.LiteralTypeNode,
        tsThree.LiteralTypeNode
    ],
    [
        ts.ImportDeclaration,
        tsThree.ImportDeclaration
    ],
    [
        ts.ImportClause,
        tsThree.ImportClause
    ],
    [
        ts.Identifier,
        tsThree.Identifier
    ],
    [
        ts.NamedImportBindings,
        tsThree.NamedImportBindings
    ],
    [
        ts.ImportDeclaration,
        tsThree.ImportDeclaration
    ],
    [
        ts.ExportDeclaration,
        tsThree.ExportDeclaration
    ],
    [
        ts.ExportDeclaration["exportClause"],
        tsThree.ExportDeclaration["exportClause"]
    ]
];
declare type TsType = Exclude<TypeMapping[number][0], undefined>;
declare type TsThreeType = Exclude<TypeMapping[number][1], undefined>;
export declare type TsTypeConversion<Tuple extends [...unknown[]]> = {
    [i in keyof Tuple]: Tuple[i] extends any[] ? TsTypeConversion<Tuple[i]> : DownSampleTsType<Tuple[i]>;
} & {
    length: Tuple["length"];
};
declare type DownSampleTsType<T> = T extends TsType ? Extract<TypeMapping[number], [T, any]>[1] : T;
export declare type UpSampleTsTypes<Tuple extends [...unknown[]]> = {
    [i in keyof Tuple]: Tuple[i] extends any[] ? UpSampleTsTypes<Tuple[i]> : UpSampleTsType<Tuple[i]>;
} & {
    length: Tuple["length"];
};
declare type UpSampleTsType<T> = T extends TsThreeType ? Extract<TypeMapping[number], [any, T]>[0] : T;
/**
 * Convert TS4 to TS3 types
 */
export declare function downSampleTsTypes<T extends [...unknown[]]>(...args: T): TsTypeConversion<T>;
/**
 * Convert TS4 to TS3 type
 */
export declare function downSampleTsType<T>(v: T): DownSampleTsType<T>;
/**
 * Convert TS3 to TS4 types
 */
export declare function upSampleTsTypes<T extends [...unknown[]]>(...args: T): UpSampleTsTypes<T>;
/**
 * Convert TS3 to TS4 type
 */
export declare function upSampleTsType<T extends TsThreeType>(v: T): UpSampleTsType<T>;
export {};
