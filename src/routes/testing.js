"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const TripController_1 = require("../controller/TripController");
const testingRouter = express_1.default.Router();
testingRouter.post('/testing', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // const data = await insertdumpdata();
    // const data = await 
    const data = yield (0, TripController_1.insertTripFromXML)();
    // res.send({ message:""});
    // const data = await insertGpsDataFromXML();
    res.send({ message: data });
}));
exports.default = testingRouter;
