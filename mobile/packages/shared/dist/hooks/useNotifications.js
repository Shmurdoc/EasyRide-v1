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
exports.setRideRequestNotificationHandler = setRideRequestNotificationHandler;
exports.useNotifications = useNotifications;
exports.scheduleLocalNotification = scheduleLocalNotification;
const react_1 = require("react");
const react_native_1 = require("react-native");
const Notifications = __importStar(require("expo-notifications"));
const Device = __importStar(require("expo-device"));
const client_1 = require("../api/client");
let _rideRequestCallback = null;
function setRideRequestNotificationHandler(handler) {
    _rideRequestCallback = handler;
}
function useNotifications(navigationRef) {
    const responseListener = (0, react_1.useRef)();
    const backgroundListener = (0, react_1.useRef)();
    const foregroundListener = (0, react_1.useRef)();
    const tokenRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(() => {
        Notifications.setNotificationHandler({
            handleNotification: (notification) => __awaiter(this, void 0, void 0, function* () {
                const data = notification.request.content.data;
                if ((data === null || data === void 0 ? void 0 : data.type) === 'ride:request') {
                    return {
                        shouldShowAlert: false,
                        shouldPlaySound: true,
                        shouldSetBadge: false,
                        shouldShowBanner: false,
                        shouldShowList: false,
                    };
                }
                return {
                    shouldShowAlert: true,
                    shouldPlaySound: true,
                    shouldSetBadge: false,
                };
            }),
        });
        if (react_native_1.Platform.OS === 'android') {
            Notifications.setNotificationChannelAsync('easyryde_default', {
                name: 'EasyRyde',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#FFAD7A',
            }).catch(() => { });
        }
        foregroundListener.current = Notifications.addNotificationReceivedListener((notification) => {
            const data = notification.request.content.data;
            if ((data === null || data === void 0 ? void 0 : data.type) === 'ride:request' && _rideRequestCallback) {
                _rideRequestCallback(data);
            }
        });
        backgroundListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
            const data = response.notification.request.content.data;
            if ((data === null || data === void 0 ? void 0 : data.type) === 'ride:request' && _rideRequestCallback) {
                _rideRequestCallback(data);
                return;
            }
            if ((data === null || data === void 0 ? void 0 : data.rideId) && (navigationRef === null || navigationRef === void 0 ? void 0 : navigationRef.current)) {
                navigationRef.current.navigate('RideTracking', { rideId: data.rideId });
            }
        });
        registerForPushNotificationsAsync()
            .then((token) => { tokenRef.current = token; })
            .catch(() => { });
        return () => {
            if (responseListener.current) {
                Notifications.removeNotificationSubscription(responseListener.current);
            }
            if (backgroundListener.current) {
                Notifications.removeNotificationSubscription(backgroundListener.current);
            }
            if (foregroundListener.current) {
                Notifications.removeNotificationSubscription(foregroundListener.current);
            }
        };
    }, []);
    const retryTokenRegistration = (0, react_1.useCallback)(() => __awaiter(this, void 0, void 0, function* () {
        if (!tokenRef.current) {
            const token = yield registerForPushNotificationsAsync();
            tokenRef.current = token;
        }
    }), []);
    return { retryTokenRegistration };
}
function registerForPushNotificationsAsync() {
    return __awaiter(this, arguments, void 0, function* (maxRetries = 3) {
        try {
            const { status: existingStatus } = yield Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;
            if (existingStatus !== 'granted') {
                const { status } = yield Notifications.requestPermissionsAsync();
                finalStatus = status;
            }
            if (finalStatus !== 'granted')
                return null;
            if (!Device.isDevice)
                return null;
            const tokenData = yield Notifications.getExpoPushTokenAsync();
            for (let i = 0; i < maxRetries; i++) {
                try {
                    yield client_1.api.post('/notifications/register-token', { token: tokenData.data });
                    return tokenData.data;
                }
                catch (_a) {
                    if (i < maxRetries - 1) {
                        yield new Promise((r) => setTimeout(r, 1000 * Math.pow(2, i)));
                    }
                }
            }
            return tokenData.data;
        }
        catch (_b) {
            return null;
        }
    });
}
function scheduleLocalNotification(title, body, data) {
    return __awaiter(this, void 0, void 0, function* () {
        yield Notifications.scheduleNotificationAsync({
            content: { title, body, data, sound: true },
            trigger: null,
        });
    });
}
