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
exports.useActiveRide = useActiveRide;
const react_1 = require("react");
const useSocket_1 = require("./useSocket");
const useRideStore_1 = require("./useRideStore");
const client_1 = require("../api/client");
function useActiveRide({ token, userId, enabled = true, }) {
    const store = (0, useRideStore_1.useRideStore)();
    const rideRef = (0, react_1.useRef)(null);
    const pollRef = (0, react_1.useRef)(null);
    const { isConnected, isReconnecting, on, joinRoom, leaveRoom, emit } = (0, useSocket_1.useSocket)({ token, enabled });
    const fetchActiveRide = (0, react_1.useCallback)(() => __awaiter(this, void 0, void 0, function* () {
        try {
            const ride = yield client_1.api.get('/rides/current');
            rideRef.current = ride;
            store.setRide(ride);
            if (ride === null || ride === void 0 ? void 0 : ride.id) {
                joinRoom(`ride:${ride.id}`);
                if (ride.driver_id) {
                    joinRoom(`driver:${ride.driver_id}`);
                }
            }
        }
        catch (_a) {
            if (rideRef.current) {
                store.setRide(null);
                rideRef.current = null;
            }
        }
    }), [joinRoom, store]);
    const refreshRide = (0, react_1.useCallback)(() => __awaiter(this, void 0, void 0, function* () {
        yield fetchActiveRide();
    }), [fetchActiveRide]);
    (0, react_1.useEffect)(() => {
        if (!enabled || !token)
            return;
        fetchActiveRide();
        pollRef.current = setInterval(() => {
            if (!isConnected) {
                fetchActiveRide();
            }
        }, 30000);
        return () => {
            var _a;
            if (pollRef.current) {
                clearInterval(pollRef.current);
                pollRef.current = null;
            }
            if ((_a = rideRef.current) === null || _a === void 0 ? void 0 : _a.id) {
                leaveRoom(`ride:${rideRef.current.id}`);
                if (rideRef.current.driver_id) {
                    leaveRoom(`driver:${rideRef.current.driver_id}`);
                }
            }
        };
    }, [enabled, token, isConnected, fetchActiveRide, leaveRoom]);
    (0, react_1.useEffect)(() => {
        var _a;
        if (!isConnected || !((_a = rideRef.current) === null || _a === void 0 ? void 0 : _a.id))
            return;
        const unsubs = [];
        unsubs.push(on('ride:status_changed', (data) => {
            var _a;
            if (data.ride_id === ((_a = rideRef.current) === null || _a === void 0 ? void 0 : _a.id)) {
                store.updateStatus(data.status);
            }
        }));
        unsubs.push(on('driver:location_update', (data) => {
            store.updateDriverLocation(data);
        }));
        unsubs.push(on('ride:eta_update', (data) => {
            var _a;
            if (data.ride_id === ((_a = rideRef.current) === null || _a === void 0 ? void 0 : _a.id)) {
                store.setEstimatedArrival(data.eta_seconds);
            }
        }));
        unsubs.push(on('ride:radius_expanded', (data) => {
            var _a;
            if (data.ride_id === ((_a = rideRef.current) === null || _a === void 0 ? void 0 : _a.id)) {
                store.setSearchRadius(data.radius_km);
            }
        }));
        unsubs.push(on('ride:cancellation_requested', (data) => {
            var _a;
            if (data.ride_id === ((_a = rideRef.current) === null || _a === void 0 ? void 0 : _a.id)) {
                store.setCancellationRequested(true);
                store.setCancellationFee(data.cancellation_fee);
            }
        }));
        unsubs.push(on('ride:cancellation_confirmed', (data) => {
            var _a;
            if (data.ride_id === ((_a = rideRef.current) === null || _a === void 0 ? void 0 : _a.id)) {
                store.updateStatus('cancelled');
                store.setCancellationRequested(false);
            }
        }));
        unsubs.push(on('ride:completed', (data) => {
            var _a;
            if (data.ride_id === ((_a = rideRef.current) === null || _a === void 0 ? void 0 : _a.id)) {
                store.updateStatus('completed');
            }
        }));
        unsubs.push(on('ride:driver_arrived', (data) => {
            var _a;
            if (data.ride_id === ((_a = rideRef.current) === null || _a === void 0 ? void 0 : _a.id)) {
                store.updateStatus('arrived');
            }
        }));
        unsubs.push(on('ride:near_dropoff', (data) => {
            var _a;
            if (data.ride_id === ((_a = rideRef.current) === null || _a === void 0 ? void 0 : _a.id)) {
                store.updateStatus('near_drop_off');
            }
        }));
        return () => {
            unsubs.forEach((unsub) => unsub());
        };
    }, [isConnected, on, store]);
    const requestCancellation = (0, react_1.useCallback)((reason) => __awaiter(this, void 0, void 0, function* () {
        var _a;
        if (!((_a = rideRef.current) === null || _a === void 0 ? void 0 : _a.id))
            return;
        yield client_1.api.post(`/rides/${rideRef.current.id}/cancel`, { reason });
        store.setCancellationRequested(true);
        emit('ride:cancel_request', { ride_id: rideRef.current.id, reason });
    }), [emit, store]);
    const confirmCancellation = (0, react_1.useCallback)(() => __awaiter(this, void 0, void 0, function* () {
        var _a;
        if (!((_a = rideRef.current) === null || _a === void 0 ? void 0 : _a.id))
            return;
        yield client_1.api.post(`/rides/${rideRef.current.id}/cancel/confirm`);
        store.updateStatus('cancelled');
        store.setCancellationRequested(false);
    }), [store]);
    const rejectCancellation = (0, react_1.useCallback)(() => __awaiter(this, void 0, void 0, function* () {
        var _a;
        if (!((_a = rideRef.current) === null || _a === void 0 ? void 0 : _a.id))
            return;
        yield client_1.api.post(`/rides/${rideRef.current.id}/cancel/reject`);
        store.setCancellationRequested(false);
        store.setCancellationFee(null);
    }), [store]);
    return {
        ride: store.ride,
        status: store.status,
        driverLocation: store.driverLocation,
        searchRadiusKm: store.searchRadiusKm,
        estimatedArrivalSeconds: store.estimatedArrivalSeconds,
        cancellationRequested: store.cancellationRequested,
        cancellationFee: store.cancellationFee,
        isConnected,
        isReconnecting,
        requestCancellation,
        confirmCancellation,
        rejectCancellation,
        refreshRide,
    };
}
