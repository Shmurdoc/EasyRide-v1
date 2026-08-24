<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\User;

class FleetModeService
{
    public const VERTICAL_RIDES = 'rides';

    public const VERTICAL_FOOD = 'food';

    public const MODE_BOTH = 'both';

    public const MODE_PRIVATE_ONLY = 'private_only';

    public const MODE_EASYRYDE_ONLY = 'easyryde_only';

    public const FLEET_PRIVATE = 'private';

    public const FLEET_EASYRYDE = 'easyryde';

    public function __construct(
        private readonly SettingService $settingService,
    ) {}

    public function getMode(string $vertical, ?string $tenantId = null): string
    {
        return $this->settingService->getString(
            "{$vertical}_pool_mode",
            self::MODE_BOTH,
            $tenantId,
        );
    }

    public function allows(User $driver, string $vertical, ?string $tenantId = null): bool
    {
        $mode = $this->getMode($vertical, $tenantId ?? $driver->tenant_id);

        if ($mode === self::MODE_BOTH) {
            return true;
        }

        $fleetType = $driver->driverProfile?->fleet_type ?? self::FLEET_PRIVATE;

        return match ($mode) {
            self::MODE_PRIVATE_ONLY => $fleetType === self::FLEET_PRIVATE,
            self::MODE_EASYRYDE_ONLY => $fleetType === self::FLEET_EASYRYDE,
            default => true,
        };
    }

    public static function isValidMode(string $mode): bool
    {
        return in_array($mode, [self::MODE_BOTH, self::MODE_PRIVATE_ONLY, self::MODE_EASYRYDE_ONLY], true);
    }

    public static function isValidFleetType(string $fleetType): bool
    {
        return in_array($fleetType, [self::FLEET_PRIVATE, self::FLEET_EASYRYDE], true);
    }
}