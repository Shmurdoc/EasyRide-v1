<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Redis;

class SocketService
{
    private static string $prefix = 'laravel_database_';

    public static function broadcastToUser(string $userId, string $event, array $data): void
    {
        self::broadcast("user:{$userId}", $event, $data);
    }

    public static function broadcastToDriver(string $driverId, string $event, array $data): void
    {
        self::broadcast("driver:{$driverId}", $event, $data);
    }

    public static function broadcastToRide(string $rideId, string $event, array $data): void
    {
        self::broadcast("ride:{$rideId}", $event, $data);
    }

    public static function broadcastToDelivery(string $deliveryId, string $event, array $data): void
    {
        self::broadcast("delivery:{$deliveryId}", $event, $data);
    }

    public static function broadcastToAdmins(string $event, array $data): void
    {
        self::broadcast('admin', $event, $data);
    }

    public static function broadcastToAllDrivers(string $event, array $data): void
    {
        $drivers = User::where('role', 'driver')
            ->where('is_online', true)
            ->pluck('id');

        foreach ($drivers as $driverId) {
            self::broadcast("driver:{$driverId}", $event, $data);
        }
    }

    public static function broadcast(string $channel, string $event, array $data): void
    {
        $payload = json_encode([
            'event' => $event,
            'data' => $data,
        ]);

        $fullChannel = self::$prefix . $channel;

        try {
            $host = config('database.redis.default.host', 'redis');
            $port = (int) config('database.redis.default.port', 6379);
            $fp = @stream_socket_client("tcp://{$host}:{$port}", $errno, $errstr, 2);
            if ($fp) {
                $cmd = "*3\r\n\$7\r\nPUBLISH\r\n\$" . strlen($fullChannel) . "\r\n" . $fullChannel . "\r\n\$" . strlen($payload) . "\r\n" . $payload . "\r\n";
                // Log the raw command bytes
                \Log::info("SocketService::broadcast CMD", [
                    'cmd_hex' => substr(bin2hex($cmd), 0, 200),
                    'cmd_len' => strlen($cmd),
                    'channel' => $fullChannel,
                    'payload' => $payload,
                ]);
                fwrite($fp, $cmd);
                $result = fgets($fp);
                fclose($fp);
                \Log::info("SocketService::broadcast OK", ['channel' => $fullChannel, 'event' => $event, 'result' => trim($result), 'payload_len' => strlen($payload)]);
            } else {
                \Log::error("SocketService::broadcast FAILED", ['channel' => $fullChannel, 'error' => "$errstr ($errno)"]);
            }
        } catch (\Throwable $e) {
            \Log::error("SocketService::broadcast EXCEPTION", ['channel' => $fullChannel, 'error' => $e->getMessage()]);
        }
    }
}
