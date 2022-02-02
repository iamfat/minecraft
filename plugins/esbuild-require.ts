import { Plugin } from 'esbuild';
import { readFile, readdir } from 'fs/promises';
import * as path from 'path';

const DEFAULT_PROJECT_BASE_PATH: string = process.cwd();
const DEFAULT_USE_RECURSIVE: boolean = true;
const DEFAULT_REGEXP: RegExp = /^.*$/;
const REQUIRE_CONTEXT_STRING_PREFIX: string = '__require_context_for_vite';

const requireContextRegex: RegExp = /require\.context\(([\w\W]+?)\)($|\)|;|\n|\r\n)/g;

export default function (): Plugin {
    return {
        name: 'esbuild:require',
        setup(build) {
            build.onLoad({ filter: /\.(js|ts|jsx|tsx)$/ }, async (args) => {
                if (args.namespace !== 'file') {
                    return {};
                }

                const code = await readFile(args.path, 'utf-8');
                const requireContextMatches = [...code.matchAll(requireContextRegex)];
                // only handle the files that contains require.context
                if (requireContextMatches.length === 0) {
                    return {};
                }

                let transformedCode: string = code;
                let addedCode: string = '';

                await Promise.all(
                    requireContextMatches.map(async (requireContextMatch, index) => {
                        const { paramsSyntax, tobeReplacedSyntax } = handleRequireContextSyntax(requireContextMatch[0]);
                        const params: string[] = paramsSyntax.split(',');
                        const directory: string = params[0] || '';
                        const recursive: boolean = !params[1] ? DEFAULT_USE_RECURSIVE : eval(params[1]);
                        const regExp: RegExp = !params[2] ? DEFAULT_REGEXP : eval(params[2]);

                        const { importsString, key2FilesMapString, contextFunctionString, requireContextFunctionName } =
                            await transformRequireContext(
                                eval(directory),
                                recursive,
                                regExp,
                                args.path,
                                DEFAULT_PROJECT_BASE_PATH,
                                index
                            );

                        const generatedRequireContextStart = `\n// start of generated code of ${requireContextFunctionName}\n`;
                        const generatedRequireContextEnd = `// end of generated code of ${requireContextFunctionName}\n`;
                        addedCode +=
                            generatedRequireContextStart +
                            importsString +
                            key2FilesMapString +
                            contextFunctionString +
                            generatedRequireContextEnd;
                        transformedCode = transformedCode.replace(tobeReplacedSyntax, requireContextFunctionName);
                    })
                );

                return { contents: addedCode + transformedCode };
            });
        }
    };
}

function handleRequireContextSyntax(originalSyntax: string) {
    if (!originalSyntax.startsWith('require.context')) {
        throw new Error(`Unexpected syntax met. Syntax does not start with 'require.context'`);
    }

    const stack = [];
    let paramsStart;
    let paramsEnd;
    for (let i = 0; i < originalSyntax.length; i++) {
        if (originalSyntax.charAt(i) == '(') {
            stack.push('(');
            if (stack.length == 1) {
                paramsStart = i + 1;
            }
            continue;
        }

        if (originalSyntax.charAt(i) == ')') {
            stack.pop();
            if (stack.length == 0) {
                paramsEnd = i;
                break;
            }
        }
    }

    return {
        paramsSyntax: originalSyntax.substring(paramsStart, paramsEnd),
        tobeReplacedSyntax: originalSyntax.substring(0, paramsEnd + 1)
    };
}

async function getFiles(dir: string, recusrive = false) {
    const dirents = await readdir(dir, { withFileTypes: true });
    const files = [];
    for (const dirent of dirents) {
        const res = path.resolve(dir, dirent.name);
        if (dirent.isDirectory()) {
            if (recusrive) files.push([...(await getFiles(res))]);
        } else {
            files.push(res);
        }
    }
    return files;
}

/**
 * Transform all the calls of require.context
 *
 * @param directory the directory from which to require the files. It's the first parameter of require.context
 * @param recursive search recursively or not. It's the second parameter of require.context
 * @param regExp the regex used to match files. It's the third parameter of require.context
 * @param workingFilePath the path of the file being transformed
 * @param projectBasePath the base path of the project
 * @param matchIndex the occurrence index of require.context
 */
async function transformRequireContext(
    directory: string,
    recursive: boolean = DEFAULT_USE_RECURSIVE,
    regExp: RegExp = DEFAULT_REGEXP,
    workingFilePath: string,
    projectBasePath: string = DEFAULT_PROJECT_BASE_PATH,
    matchIndex: number
) {
    let basePath: string;

    switch (directory[0]) {
        // relative path, starting with ./ or ../
        case '.':
            basePath = path.join(workingFilePath, '..' + path.sep, directory);
            break;
        // path based on the project base path
        case '/':
            basePath = path.join(projectBasePath, directory);
            break;
        // path based on the /src
        case '@':
            basePath = path.join(projectBasePath, 'src', directory.substr(1));
            break;
        // search in node_modules
        default:
            basePath = path.join(projectBasePath, 'node_modules', directory);
    }

    // for windows, the path.join will return with a path ending with a '/'
    // for linux/macos, the path.join will return with a path ending without '/'
    basePath = basePath.replace(/\\/g, '/');
    if (basePath.endsWith('/')) {
        basePath = basePath.substring(0, basePath.length - 1);
    }

    const absolutePaths: string[] = (await getFiles(basePath, recursive))
        .map((path) => {
            // deal with the file separator in windows
            let p = path.replace(/\\/g, '/');
            return './' + p.slice(basePath.length + 1);
        })
        .filter((file) => file.match(regExp))
        .map((file) => path.resolve(basePath, file));

    // the actual files to be imported
    const importedFiles: string[] = absolutePaths;

    // the keys of require.context
    const keys: string[] = absolutePaths.map((absolutePath) => {
        return './' + absolutePath.slice(basePath.length + 1);
    });

    const requireContextMapName = `${REQUIRE_CONTEXT_STRING_PREFIX}_map_${matchIndex}`;
    const requireContextFunctionName = `${REQUIRE_CONTEXT_STRING_PREFIX}_function_${matchIndex}`;

    const key2FilesMap = generateKey2FilesMap(keys, importedFiles, matchIndex);
    const importsString = generateImportsString(keys, importedFiles, matchIndex);
    const key2FilesMapString = generateKey2FilesMapString(key2FilesMap, requireContextMapName);
    const contextFunctionString = generateContextFunctionString(requireContextFunctionName, requireContextMapName);

    return {
        importsString,
        key2FilesMapString,
        contextFunctionString,
        requireContextFunctionName
    };
}

/**
 * Generate a map with imported entry and relative file path
 *
 * @param keys the keys of require.context
 * @param importedFiles the actual files to be imported
 * @param matchIndex the occurrence index of require.context
 */
function generateKey2FilesMap(keys: string[], importedFiles: string[], matchIndex: number): object {
    let key2FilesMap: object = {};
    keys.forEach((key, index) => {
        const importEntry: string = `${REQUIRE_CONTEXT_STRING_PREFIX}_${matchIndex}_${index}`;
        key2FilesMap[key] = {
            importEntry: importEntry,
            filePath: './' + importedFiles[index]
        };
    });

    return key2FilesMap;
}

/**
 * Generate the import string. The import string is something like :
 * import * as __require_context_for_vite_0_0 from "/src/components/a.vue";
 * import * as __require_context_for_vite_0_1 from "/src/components/b.vue";
 * import * as __require_context_for_vite_0_2 from "/src/components/c.vue";
 *
 * @param keys the keys of require.context
 * @param importedFiles the actual files to be imported
 * @param matchIndex the occurrence index of require.context
 */
function generateImportsString(keys: string[], importedFiles: string[], matchIndex: number): string {
    let importsString: string = '';
    for (let index = 0; index < keys.length; index++) {
        const importEntry: string = `${REQUIRE_CONTEXT_STRING_PREFIX}_${matchIndex}_${index}`;
        importsString += `import * as ${importEntry} from "${importedFiles[index]}";\n`;
    }
    importsString += '\n';

    return importsString;
}

/**
 * Generate the map of require.context. The map is something like :
 * var __require_context_for_vite_map_0 = {
 *	"./a.vue" : __require_context_for_vite_0_0,
 *	"./b.vue" : __require_context_for_vite_0_1,
 *	"./c.vue" : __require_context_for_vite_0_2
 * };
 *
 * @param key2FilesMap map generated by generateKey2FilesMap
 * @param requireContextMapName the name of the generated map. It's something like __require_context_for_vite_map_0
 */
function generateKey2FilesMapString(key2FilesMap: object, requireContextMapName: string): string {
    // return empty object if no files are matched
    if (Object.keys(key2FilesMap).length == 0) {
        return `const ${requireContextMapName} = {};\n`;
    }

    let key2FilesMapString = `const ${requireContextMapName} = {\n`;
    Object.keys(key2FilesMap).forEach((key) => {
        key2FilesMapString += `\t"${key}" : ${key2FilesMap[key].importEntry},\n`;
    });
    key2FilesMapString = key2FilesMapString.substring(0, key2FilesMapString.length - 2) + '\n};\n';

    return key2FilesMapString;
}

/**
 * Generate the function of require.context. The function is something like :
 * function __require_context_for_vite_function_0(req) {
 *    var id = __require_context_for_vite_function_0_resolve(req);
 *    return __require_context_for_vite_map_0[req];
 * }
 * function __require_context_for_vite_function_0_resolve(req) {
 *    if (req in __require_context_for_vite_map_0) {
 *        return __require_context_for_vite_map_0[req];
 *    }
 *    var e = new Error("Cannot find module '" + req + "'");
 *    e.code = 'MODULE_NOT_FOUND';
 *    throw e;
 * }
 * __require_context_for_vite_function_0.keys = function __require_context_for_vite_function_0_keys() {
 *    return Object.keys(__require_context_for_vite_map_0);
 * }
 * __require_context_for_vite_function_0.resolve = __require_context_for_vite_function_0_resolve
 * __require_context_for_vite_function_0.id = "__require_context_for_vite_function_0"
 *
 * @param requireContextFunctionName the name of the generated function. It's something like __require_context_for_vite_function_0
 * @param requireContextMapName the name of the generated map. It's something like __require_context_for_vite_map_0
 */
function generateContextFunctionString(requireContextFunctionName: string, requireContextMapName: string): string {
    const requireContextResolveFunctionName = `${requireContextFunctionName}_resolve`;
    const requireContextKeysFunctionName = `${requireContextFunctionName}_keys`;
    // webpackContext(req)
    let contextFunctionString = `function ${requireContextFunctionName}(req) {
    var id = ${requireContextResolveFunctionName}(req);
    return ${requireContextMapName}[req];
}\n`;

    // webpackContextResolve(req)
    contextFunctionString += `function ${requireContextResolveFunctionName}(req) {
    if (req in ${requireContextMapName}) {
        return ${requireContextMapName}[req];
    }
    var e = new Error("Cannot find module '" + req + "'");
    e.code = 'MODULE_NOT_FOUND';
    throw e;
}\n`;

    // webpackConext.keys
    contextFunctionString += `${requireContextFunctionName}.keys = function ${requireContextKeysFunctionName}() {
    return Object.keys(${requireContextMapName});
}\n`;

    // webpackContext.resolve
    contextFunctionString += `${requireContextFunctionName}.resolve = ${requireContextResolveFunctionName}\n`;

    // webpackContext.id
    // TODO: not implemented as webpack did
    contextFunctionString += `${requireContextFunctionName}.id = "${requireContextFunctionName}"\n`;

    return contextFunctionString;
}
