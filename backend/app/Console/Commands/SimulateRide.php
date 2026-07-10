<?php
namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

class SimulateRide extends Command
{
    protected $signature = 'rides:simulate 
        {--rider=rider@easyryde.com} 
        {--driver=driver@easyryde.com} 
        {--category=standard}
        {--api=http://nginx:8080/api/v1}
        {--pickup-lat=-23.9} 
        {--pickup-lng=29.4} 
        {--dropoff-lat=-23.85} 
        {--dropoff-lng=29.45}';
    
    protected $description = 'Simulate a complete ride lifecycle';
    
    public function handle()
    {
        $api = $this->option('api');
        $results = [];
        
        // Step 1: Rider login
        $this->info('1. Rider login...');
        $start = microtime(true);
        $riderLogin = Http::timeout(10)->post("{$api}/auth/login", [
            'email' => $this->option('rider'),
            'password' => 'password',
        ]);
        if (!$riderLogin->successful() || !$riderLogin->json('data.token')) {
            $this->error('Rider login failed: ' . $riderLogin->body());
            return 1;
        }
        $riderToken = $riderLogin->json('data.token');
        $results['rider_login'] = $this->trackStep('Rider Login', $start, true);
        
        // Step 2: Create ride
        $this->info('2. Creating ride...');
        $start = microtime(true);
        $ride = Http::timeout(10)->withToken($riderToken)->post("{$api}/rides", [
            'category' => $this->option('category'),
            'pickup_address' => 'Phalaborwa Mall',
            'pickup_lat' => $this->option('pickup-lat'),
            'pickup_lng' => $this->option('pickup-lng'),
            'dropoff_address' => 'Kruger National Park Gate',
            'dropoff_lat' => $this->option('dropoff-lat'),
            'dropoff_lng' => $this->option('dropoff-lng'),
            'payment_method' => 'wallet',
        ]);
        $rideId = $ride->json('ride.id') ?? $ride->json('data.ride.id');
        $results['create_ride'] = $this->trackStep('Create Ride', $start, $ride->successful() && $rideId);
        
        if (!$rideId) {
            $this->error('Failed to create ride: ' . $ride->body());
            return 1;
        }
        
        // Step 3: Driver login
        $this->info('3. Driver login...');
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
        
        // Step 4: Driver accepts
        $this->info('4. Driver accepts ride...');
        $start = microtime(true);
        $accept = Http::timeout(10)->withToken($driverToken)->post("{$api}/rides/{$rideId}/driver-accept");
        $results['driver_accept'] = $this->trackStep('Driver Accept', $start, $accept->successful());
        
        // Step 5: Driver arrives
        $this->info('5. Driver arrives...');
        $start = microtime(true);
        $arrived = Http::timeout(10)->withToken($driverToken)->post("{$api}/rides/{$rideId}/driver-arrived");
        $results['driver_arrived'] = $this->trackStep('Driver Arrived', $start, $arrived->successful());
        
        // Step 6: Start ride
        $this->info('6. Starting ride...');
        $start = microtime(true);
        $started = Http::timeout(10)->withToken($driverToken)->post("{$api}/rides/{$rideId}/start");
        $results['start_ride'] = $this->trackStep('Start Ride', $start, $started->successful());
        
        // Step 7: Complete ride
        $this->info('7. Completing ride...');
        $start = microtime(true);
        $completed = Http::timeout(10)->withToken($driverToken)->post("{$api}/rides/{$rideId}/complete");
        $results['complete_ride'] = $this->trackStep('Complete Ride', $start, $completed->successful());
        
        // Step 8: Rate ride
        $this->info('8. Rating ride...');
        $start = microtime(true);
        $rated = Http::timeout(10)->withToken($riderToken)->post("{$api}/rides/{$rideId}/rate", [
            'score' => 5,
            'comment' => 'Great ride simulation!',
        ]);
        $results['rate_ride'] = $this->trackStep('Rate Ride', $start, $rated->successful());
        
        // Summary
        $this->newLine();
        $this->info('=== SIMULATION SUMMARY ===');
        $totalTime = 0;
        foreach ($results as $step => $data) {
            $status = $data['success'] ? '✓' : '✗';
            $this->line("  {$status} {$data['name']}: {$data['duration']}ms");
            $totalTime += $data['duration'];
        }
        $this->info("  Total: {$totalTime}ms");
        $this->info("  Ride ID: {$rideId}");
        
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
