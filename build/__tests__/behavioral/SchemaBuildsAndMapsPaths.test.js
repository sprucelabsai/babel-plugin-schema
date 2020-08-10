"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const test_1 = __importStar(require("@sprucelabs/test"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const index_1 = require("../../index");
class SchemaBuildsAndMapsPathsTest extends test_1.default {
    static async buildsSchemaWithoutError() {
        const cwd = await this.setupNewPackage();
        const fieldFactoryFile = path_1.default.join(cwd, 'node_modules/@sprucelabs/schema', 'build/factories/FieldFactory.js');
        const contents = fs_extra_1.default.readFileSync(fieldFactoryFile).toString();
        test_1.assert.doesInclude(contents, '#spruce');
        index_1.copyAndMap({ cwd, destination: cwd });
        const afterMapContents = fs_extra_1.default.readFileSync(fieldFactoryFile).toString();
        test_1.assert.doesNotInclude(afterMapContents, '#spruce');
    }
    static async setupNewPackage() {
        const today = new Date();
        const cwd = path_1.default.join(os_1.default.tmpdir(), 'babel-plugin-schema', `${today.getTime()}`);
        await fs_extra_1.default.ensureDir(cwd);
        await new Promise((resolve, reject) => {
            child_process_1.exec(`yarn init --yes && yarn add @sprucelabs/schema`, {
                cwd,
                env: {
                    PATH: process.env.PATH,
                },
            }, (err) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve();
                }
            });
        });
        const tsConfigContents = fs_extra_1.default.readFileSync(path_1.default.join(__dirname, '..', '..', '..', 'tsconfig.json'));
        fs_extra_1.default.writeFileSync(path_1.default.join(cwd, 'tsconfig.json'), tsConfigContents);
        return cwd;
    }
}
__decorate([
    test_1.test()
], SchemaBuildsAndMapsPathsTest, "buildsSchemaWithoutError", null);
exports.default = SchemaBuildsAndMapsPathsTest;
//# sourceMappingURL=SchemaBuildsAndMapsPaths.test.js.map