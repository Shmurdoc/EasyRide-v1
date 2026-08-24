"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useRideStore = void 0;
const zustand_1 = require("zustand");
const initialState = {
    ride: null,
    status: null,
    driverLocation: null,
    searchRadiusKm: 5,
    estimatedArrivalSeconds: null,
    cancellationRequested: false,
    cancellationFee: null,
    lastUpdated: 0,
};
exports.useRideStore = (0, zustand_1.create)((set) => (Object.assign(Object.assign({}, initialState), { setRide: (ride) => {
        var _a;
        return set({
            ride,
            status: (_a = ride === null || ride === void 0 ? void 0 : ride.status) !== null && _a !== void 0 ? _a : null,
            lastUpdated: Date.now(),
        });
    }, updateStatus: (status) => set((state) => ({
        status,
        ride: state.ride ? Object.assign(Object.assign({}, state.ride), { status }) : null,
        lastUpdated: Date.now(),
    })), updateDriverLocation: (location) => set({ driverLocation: location, lastUpdated: Date.now() }), setSearchRadius: (km) => set({ searchRadiusKm: km, lastUpdated: Date.now() }), setEstimatedArrival: (seconds) => set({ estimatedArrivalSeconds: seconds, lastUpdated: Date.now() }), setCancellationRequested: (requested) => set({ cancellationRequested: requested, lastUpdated: Date.now() }), setCancellationFee: (fee) => set({ cancellationFee: fee, lastUpdated: Date.now() }), updatePartial: (updates) => set((state) => (Object.assign(Object.assign(Object.assign({}, state), updates), { lastUpdated: Date.now() }))), reset: () => set(Object.assign(Object.assign({}, initialState), { lastUpdated: Date.now() })) })));
