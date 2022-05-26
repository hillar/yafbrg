"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = void 0;
const transformer_1 = __importDefault(require("./transformer"));
exports.default = transformer_1.default;
var register_1 = require("./register");
Object.defineProperty(exports, "register", { enumerable: true, get: function () { return register_1.register; } });
