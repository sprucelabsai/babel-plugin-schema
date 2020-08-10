"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.copyAndMap = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const globby_1 = __importDefault(require("globby"));
const rimraf_1 = __importDefault(require("rimraf"));
const tsconfig_paths_1 = require("tsconfig-paths");
function assert(truthy, message) {
    if (!truthy) {
        throw new Error(message);
    }
}
// const DIVIDER = "\n\n\n************************************************\n\n\n";
function copyAndMap(options) {
    assert(options.cwd, "You must pass options.cwd. This is where I'll look for the schema module (root of workspace if in monorepo)");
    assert(options.destination, 'You need to pass a options.destination (sub project if mono repo)');
    // places to look for schema
    const target = path_1.default.join(options.cwd, 'node_modules', '@sprucelabs', 'schema');
    const destination = path_1.default.join(options.destination, 'node_modules', '@sprucelabs', 'schema');
    const schemaNodeModules = path_1.default.join(destination, 'node_modules');
    // clear out destination if it exists (and does not match the target)
    if (target !== destination) {
        if (fs_1.default.existsSync(destination)) {
            rimraf_1.default.sync(schemaNodeModules);
        }
        // copy schema over
        fs_extra_1.default.copySync(target, destination);
    }
    // clear out schemas' node_modules
    if (fs_1.default.existsSync(schemaNodeModules)) {
        rimraf_1.default.sync(schemaNodeModules);
    }
    // now map paths to the new schema
    const config = tsconfig_paths_1.loadConfig(options.cwd);
    if (config.resultType === 'failed') {
        throw new Error(config.message);
    }
    const { absoluteBaseUrl, paths } = config;
    const resolver = tsconfig_paths_1.createMatchPath(absoluteBaseUrl, paths);
    const files = globby_1.default.sync(path_1.default.join(destination, '**/*.js'));
    files.forEach((file) => {
        let contents = fs_1.default.readFileSync(file).toString();
        let found = false;
        contents = `${contents}`.replace(/"#spruce\/(.*?)"/gi, (match) => {
            found = true;
            const search = match.replace(/"/g, '');
            const resolved = resolver(search + '.js');
            if (!resolved) {
                throw new Error(`Could not map ${search}.`);
            }
            return `"${resolved}"`;
        });
        if (found) {
            fs_1.default.writeFileSync(file, contents);
        }
    });
}
exports.copyAndMap = copyAndMap;
function default_1(_, options) {
    copyAndMap(options);
    return {};
}
exports.default = default_1;
//# sourceMappingURL=index.js.map