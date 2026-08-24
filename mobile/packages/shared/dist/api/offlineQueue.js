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
Object.defineProperty(exports, "__esModule", { value: true });
exports.enqueueOfflineRequest = enqueueOfflineRequest;
exports.getOfflineQueueLength = getOfflineQueueLength;
exports.hasPendingMutations = hasPendingMutations;
exports.flushOfflineQueue = flushOfflineQueue;
let queue = [];
let flushing = false;
function enqueueOfflineRequest(request) {
    return new Promise((resolve, reject) => {
        queue.push({ request, resolve, reject });
    });
}
function getOfflineQueueLength() {
    return queue.length;
}
function hasPendingMutations() {
    return queue.length > 0;
}
function flushOfflineQueue() {
    return __awaiter(this, void 0, void 0, function* () {
        if (flushing)
            return;
        flushing = true;
        const items = queue.splice(0);
        for (const item of items) {
            try {
                const result = yield item.request();
                item.resolve(result);
            }
            catch (e) {
                item.reject(e);
            }
        }
        flushing = false;
    });
}
