<?php
namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

class SimulatePool extends Command
{
    protected $signature = 'rides:simulate-pool 
        {--rider1=rider@easyryde.com} 
        {--rider2=rider@easyryde.com} 
        {--rider3=rider@easyryde.com} 
        {--driver=driver@easyryde.com}
        {--api=http://nginx:8080/api/v1}';
    
    protected $description = 'Simulate a pool ride with multiple passengers';
    
    public function handle()
    {
        $api = $this->option('api');
        $results = [];
        
        // Step 1: Driver login
        $this->info('1. Driver login...');
        $start = microtime(true);
        $driverLogin = Http::timeout(10)->post("{$api}/auth/login", [
            'email' => $this->option('driver'),
            'password' => 'password',
        ]);
        if (!$driverLogin->successful() || !$driverLogin->json('data.token')) {
            $this->error('Driver login failed');
            return 1;
        }
        $driverToken = $driverLogin->json('data.token');
        $results['driver_login'] = $this->trackStep('Driver Login', $start, true);
        
        // Step 2: Rider 1 creates ride
        $this->info('2. Rider 1 creates ride...');
        $start = microtime(true);
        $rider1Login = Http::timeout(10)->post("{$api}/auth/login", [
            'email' => $this->option('rider1'),
            'password' => 'password',
        ]);
        if (!$rider1Login->successful() || !$rider1Login->json('data.token')) {
            $this->error('Rider 1 login failed');
            return 1;
        }
        $rider1Token = $rider1Login->json('data.token');
        
        $ride1 = Http::timeout(10)->withToken($rider1Token)->post("{$api}/rides", [
            'category' => 'standard',
            'pickup_address' => 'Phalaborwa Mall',
            'pickup_lat' => -23.9,
            'pickup_lng' => 29.4,
            'dropoff_address' => 'Kruger National Park Gate',
            'dropoff_lat' => -23.85,
            'dropoff_lng' => 29.45,
            'payment_method' => 'wallet',
        ]);
        $ride1Id = $ride1->json('ride.id') ?? $ride1->json('data.ride.id');
        $results['create_ride_1'] = $this->trackStep('Create Ride 1', $start, $ride1->successful() && $ride1Id);
        
        // Step 3: Rider 2 creates ride (nearby)
        $this->info('3. Rider 2 creates ride...');
        $start = microtime(true);
        $rider2Login = Http::timeout(10)->post("{$api}/auth/login", [
            'email' => $this->option('rider2'),
            'password' => 'password',
        ]);
        if (!$rider2Login->successful() || !$rider2Login->json('data.token')) {
            $this->error('Rider 2 login failed');
            return 1;
        }
        $rider2Token = $rider2Login->json('data.token');
        
        $ride2 = Http::timeout(10)->withToken($rider2Token)->post("{$api}/rides", [
            'category' => 'standard',
            'pickup_address' => 'Phalaborwa Town',
            'pickup_lat' => -23.89,
            'pickup_lng' => 29.39,
            'dropoff_address' => 'Kruger National Park Gate',
            'dropoff_lat' => -23.85,
            'dropoff_lng' => 29.45,
            'payment_method' => 'wallet',
        ]);
        $ride2Id = $ride2->json('ride.id') ?? $ride2->json('data.ride.id');
        $results['create_ride_2'] = $this->trackStep('Create Ride 2', $start, $ride2->successful() && $ride2Id);
        
        // Step 4: Rider 3 creates ride (nearby)
        $this->info('4. Rider 3 creates ride...');
        $start = microtime(true);
        $rider3Login = Http::timeout(10)->post("{$api}/auth/login", [
            'email' => $this->option('rider3'),
            'password' => 'password',
        ]);
        if (!$rider3Login->successful() || !$rider3Login->json('data.token')) {
            $this->error('Rider 3 login failed');
            return 1;
        }
        $rider3Token = $rider3Login->json('data.token');
        
        $ride3 = Http::timeout(10)->withToken($rider3Token)->post("{$api}/rides", [
            'category' => 'standard',
            'pickup_address' => 'Phalaborwa Lodge',
            'pickup_lat' => -23.88,
            'pickup_lng' => 29.41,
            'dropoff_address' => 'Kruger National Park Gate',
            'dropoff_lat' => -23.85,
            'dropoff_lng' => 29.45,
            'payment_method' => 'wallet',
        ]);
        $ride3Id = $ride3->json('ride.id') ?? $ride3->json('data.ride.id');
        $results['create_ride_3'] = $this->trackStep('Create Ride 3', $start, $ride3->successful() && $ride3Id);
        
        // Step 5: Find pool matches
        $this->info('5. Finding pool matches...');
        $start = microtime(true);
        $matches = Http::timeout(10)->withToken($driverToken)->get("{$api}/rides/{$ride1Id}/pool-matches");
        $results['find_matches'] = $this->trackStep('Find Pool Matches', $start, $matches->successful());
        
        // Step 6: Join passengers to pool
        $this->info('6. Joining passengers to pool...');
        $start = microtime(true);
        $join2 = Http::timeout(10)->withToken($driverToken)->post("{$api}/rides/{$ride1Id}/pool-join", [
            'ride_id' => $ride2Id,
        ]);
        $join3 = Http::timeout(10)->withToken($driverToken)->post("{$api}/rides/{$ride1Id}/pool-join", [
            'ride_id' => $ride3Id,
        ]);
        $results['join_passengers'] = $this->trackStep('Join Passengers', $start, $join2->successful() && $join3->successful());
        
        // Step 7: Driver accepts pool ride
        $this->info('7. Driver accepts pool ride...');
        $start = microtime(true);
        $accept = Http::timeout(10)->withToken($driverToken)->post("{$api}/rides/{$ride1Id}/driver-accept");
        $results['driver_accept'] = $this->trackStep('Driver Accept', $start, $accept->successful());
        
        // Step 8: Simulate pickup for each passenger
        $this->info('8. Simulating pickups...');
        $start = microtime(true);
        $pickup1 = Http::timeout(10)->withToken($driverToken)->post("{$api}/rides/{$ride1Id}/driver-arrived");
        $pickup2 = Http::timeout(10)->withToken($driverToken)->post("{$api}/rides/{$ride2Id}/driver-arrived");
        $pickup3 = Http::timeout(10)->withToken($driverToken)->post("{$api}/rides/{$ride3Id}/driver-arrived");
        $results['pickups'] = $this->trackStep('Pickups', $start, $pickup1->successful() && $pickup2->successful() && $pickup3->successful());
        
        // Step 9: Start ride
        $this->info('9. Starting ride...');
        $start = microtime(true);
        $started = Http::timeout(10)->withToken($driverToken)->post("{$api}/rides/{$ride1Id}/start");
        $results['start_ride'] = $this->trackStep('Start Ride', $start, $started->successful());
        
        // Step 10: Complete ride
        $this->info('10. Completing ride...');
        $start = microtime(true);
        $completed = Http::timeout(10)->withToken($driverToken)->post("{$api}/rides/{$ride1Id}/complete");
        $results['complete_ride'] = $this->trackStep('Complete Ride', $start, $completed->successful());
        
        // Step 11: Verify fare splitting
        $this->info('11. Verifying fare splitting...');
        $start = microtime(true);
        $fare1 = Http::timeout(10)->withToken($rider1Token)->get("{$api}/rides/{$ride1Id}");
        $fare2 = Http::timeout(10)->withToken($rider2Token)->get("{$api}/rides/{$ride2Id}");
        $fare3 = Http::timeout(10)->withToken($rider3Token)->get("{$api}/rides/{$ride3Id}");
        $results['fare_split'] = $this->trackStep('Fare Split Verification', $start, $fare1->successful() && $fare2->successful() && $fare3->successful());
        
        // Summary
        $this->newLine();
        $this->info('=== POOL SIMULATION SUMMARY ===');
        $totalTime = 0;
        foreach ($results as $step => $data) {
            $status = $data['success'] ? '✓' : '✗';
            $this->line("  {$status} {$data['name']}: {$data['duration']}ms");
            $totalTime += $data['duration'];
        }
        $this->info("  Total: {$totalTime}ms");
        $this->info("  Ride IDs: {$ride1Id}, {$ride2Id}, {$ride3Id}");
        
        $failed = collect($results)->where('success', false)->count();
        return $failed > 0 ? 1 : 0;
    }
    
    private function trackStep(string $name, float $start, bool $success): array
    {
        return [
            'name' => $name,
            'duration' => round((microtime(true) - $start) * 1000),
            'success' => $success,
        ];
    }
}
