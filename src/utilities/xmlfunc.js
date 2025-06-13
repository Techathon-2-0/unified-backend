"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.readTripXMLData = readTripXMLData;
exports.readSingleXMLData = readSingleXMLData;
exports.readMultipleXMLData = readMultipleXMLData;
const fast_xml_parser_1 = require("fast-xml-parser");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
//working
function readTripXMLData(p) {
    try {
        // Read the XML file from public folder
        const xmlData = fs.readFileSync(path.join(process.cwd(), 'public/xml_output', p), 'utf-8');
        // Configure XML parser
        const parser = new fast_xml_parser_1.XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: "@_",
            parseAttributeValue: true,
            parseTagValue: true,
            trimValues: true
        });
        // Parse XML to JSON
        const result = parser.parse(xmlData);
        if (!result.Transmission) {
            throw new Error('Invalid XML format: Transmission element not found');
        }
        return result.Transmission;
    }
    catch (error) {
        console.error('Error reading Trip XML data:', error);
        throw error;
    }
}
//working
function readSingleXMLData() {
    try {
        // Read the XML file
        const xmlData = fs.readFileSync("gps.xml", 'utf-8');
        // Replace HTML entities with their actual characters
        const decodedXml = xmlData
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'");
        // Configure XML parser
        const parser = new fast_xml_parser_1.XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: "@_",
            parseAttributeValue: true,
            parseTagValue: true,
            trimValues: true
        });
        // Parse XML to JSON
        const result = parser.parse(decodedXml);
        if (!result.GPSData) {
            throw new Error('Invalid XML format: GPSData root element not found');
        }
        return result.GPSData;
    }
    catch (error) {
        console.error('Error reading GPS XML data:', error);
        throw error;
    }
}
//working
function readMultipleXMLData() {
    try {
        // Read the XML file
        const xmlData = fs.readFileSync("gpsbulk.xml", 'utf-8');
        // Replace HTML entities with their actual characters
        const decodedXml = xmlData
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'");
        // Configure XML parser
        const parser = new fast_xml_parser_1.XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: "@_",
            parseAttributeValue: true,
            parseTagValue: true,
            trimValues: true,
            isArray: (name) => name === 'GPSData'
        });
        // Parse XML to JSON
        const result = parser.parse(decodedXml);
        // Ensure the structure matches <data><GPSData>...</GPSData></data>
        if (!result.data || !result.data.GPSData) {
            throw new Error('Invalid XML format: data or GPSData elements not found');
        }
        return result.data.GPSData;
    }
    catch (error) {
        console.error('Error reading multiple GPS XML data:', error);
        throw error;
    }
}
