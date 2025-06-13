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
exports.formatDate = void 0;
exports.haversine = haversine;
exports.isVehicleInsideGeofence = isVehicleInsideGeofence;
exports.reverseGeocode = reverseGeocode;
const axios_1 = __importDefault(require("axios"));
//implement haversine here
/**
 * Calculate the distance between two lat/lng points in meters using the Haversine formula.
 * @param lat1 Latitude of point 1
 * @param lon1 Longitude of point 1
 * @param lat2 Latitude of point 2
 * @param lon2 Longitude of point 2
 * @returns Distance in meters
 */
function haversine(lat1, lon1, lat2, lon2) {
    const toRad = (value) => (value * Math.PI) / 180;
    const R = 6371000; // Earth's radius in meters
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}
function isVehicleInsideGeofence(geofence, vehicleLocation) {
    const [x, y] = vehicleLocation;
    let inside = false;
    for (let i = 0, j = geofence.length - 1; i < geofence.length; j = i++) {
        const [xi, yi] = geofence[i];
        const [xj, yj] = geofence[j];
        const intersect = yi > y !== yj > y &&
            x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
        if (intersect)
            inside = !inside;
    }
    return inside;
}
const formatDate = (dateString) => {
    if (!dateString)
        return "No date";
    try {
        const [datePart, timePart] = dateString.split("T");
        const [year, month, day] = datePart.split("-");
        const [hour, minute, secondPart] = timePart.split(":");
        const second = secondPart.split(".")[0];
        const date = new Date(Number.parseInt(year), Number.parseInt(month) - 1, Number.parseInt(day), Number.parseInt(hour), Number.parseInt(minute), Number.parseInt(second));
        return date.toLocaleString("en-US", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
        });
    }
    catch (error) {
        return "Invalid date";
    }
};
exports.formatDate = formatDate;
function reverseGeocode(lat, lon) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // return "";
            const reponse = yield axios_1.default.get(`${process.env.REVERSE_PROXY_URL}&lat=${lat}&lon=${lon}&format=json`);
            if (!reponse.data || !reponse.data.display_name) {
                return 'Address not found';
            }
            const address = reponse.data.address;
            const parts = [
                address.house_number,
                address.road,
                address.suburb || address.quarter,
                address.city || address.town || address.village,
                address.state_district,
                address.state,
                address.postcode,
                address.country
            ];
            //set a delay of 500ms 
            yield new Promise(resolve => setTimeout(resolve, 600));
            const formattedAddress = parts.filter(Boolean).join(', ');
            return formattedAddress || 'Address not found';
        }
        catch (error) {
            console.error('Error in reverse geocoding:', error);
            return 'Error retrieving address';
        }
    });
}
