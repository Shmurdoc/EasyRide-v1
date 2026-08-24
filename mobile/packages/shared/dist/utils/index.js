"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGreeting = exports.generateRouteCoords = exports.calculateDistance = exports.formatZAR = exports.formatDuration = exports.formatDistance = void 0;
exports.formatCurrency = formatCurrency;
exports.formatDate = formatDate;
exports.formatTime = formatTime;
exports.formatDateTime = formatDateTime;
exports.truncate = truncate;
exports.validateEmail = validateEmail;
exports.validatePhone = validatePhone;
exports.decodePolyline = decodePolyline;
exports.generateId = generateId;
function formatCurrency(amount, currency = 'ZAR') {
    return new Intl.NumberFormat('en-ZA', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
    }).format(amount);
}
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-ZA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}
function formatTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-ZA', {
        hour: '2-digit',
        minute: '2-digit',
    });
}
function formatDateTime(dateString) {
    return `${formatDate(dateString)} ${formatTime(dateString)}`;
}
var mapUtils_1 = require("./mapUtils");
Object.defineProperty(exports, "formatDistance", { enumerable: true, get: function () { return mapUtils_1.formatDistance; } });
Object.defineProperty(exports, "formatDuration", { enumerable: true, get: function () { return mapUtils_1.formatDuration; } });
Object.defineProperty(exports, "formatZAR", { enumerable: true, get: function () { return mapUtils_1.formatZAR; } });
Object.defineProperty(exports, "calculateDistance", { enumerable: true, get: function () { return mapUtils_1.calculateDistance; } });
Object.defineProperty(exports, "generateRouteCoords", { enumerable: true, get: function () { return mapUtils_1.generateRouteCoords; } });
Object.defineProperty(exports, "getGreeting", { enumerable: true, get: function () { return mapUtils_1.getGreeting; } });
function truncate(str, maxLength) {
    if (str.length <= maxLength)
        return str;
    return str.slice(0, maxLength - 3) + '...';
}
function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
function validatePhone(phone) {
    return /^\+?[0-9]{10,15}$/.test(phone.replace(/\s/g, ''));
}
function decodePolyline(encoded) {
    const points = [];
    let index = 0;
    const len = encoded.length;
    let lat = 0;
    let lng = 0;
    while (index < len) {
        let b;
        let shift = 0;
        let result = 0;
        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        const dlat = result & 1 ? ~(result >> 1) : result >> 1;
        lat += dlat;
        shift = 0;
        result = 0;
        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        const dlng = result & 1 ? ~(result >> 1) : result >> 1;
        lng += dlng;
        points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
    }
    return points;
}
function generateId() {
    return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
// mapUtils exports are explicit above (line 30) to avoid duplicates
