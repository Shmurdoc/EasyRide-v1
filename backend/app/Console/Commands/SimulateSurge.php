<?php
namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

class SimulateSurge extends Command
{
    protected $signature = 'rides:simulate-surge 
        {--rider=rider@easyryde.com} 
        {--category=standard}
        {--rides=5}
        {--api=http://nginx:8080/api/v1}';
    
    protected $description = 'Simulate surge pricing by spiking demand';
    
    public function handle()
    {
        $api = $this->option('api');
        $results = [];
        $rideCount = (int) $this->option('rides');
        
        // Step 1: Rider login
        $this->info('1. Rider login...');
        $start = microtime(true);
        $riderLogin = Http::timeout(10)->post("{$api}/auth/login", [
            'email' => $this->option('rider'),
            'password' => 'password',
        ]);
        if (!$riderLogin->successful() || !$riderLogin->json('data.token')) {
            $this->error('Rider login failed');
            return 1;
        }
        $riderToken = $riderLogin->json('data.token');
        $results['rider_login'] = $this->trackStep('Rider Login', $start, true);
        
        // Step 2: Get initial fare estimate
        $this->info('2. Getting initial fare estimate...');
        $start = microtime(true);
        $initialEstimate = Http::timeout(10)->withToken($riderToken)->get("{$api}/rides/fare-estimate", [
            'category' => $this->option('category'),
            'pickup_lat' => -23.9,
            'pickup_lng' => 29.4,
            'dropoff_lat' => -23.85,
            'dropoff_lng' => 29.45,
        ]);
        $initialFare = $initialEstimate->json('breakdown.total_fare');
        $results['initial_estimate'] = $this->trackStep('Initial Estimate', $start, $initialEstimate->successful());
        $this->info("   Initial fare: {$initialFare}");
        
        // Step 3: Create rides in rapid succession to spike demand
        $this->info("3. Creating {$rideCount} rides to spike demand...");
        $fareProgression = [$initialFare];
        
        for ($i = 1; $i <= $rideCount; $i++) {
            $start = microtime(true);
            $ride = Http::timeout(10)->withToken($riderToken)->post("{$api}/rides", [
                'category' => $this->option('category'),
                'pickup_address' => "Surge Test Location {$i}",
                'pickup_lat' => -23.9 + ($i * 0.001),
                'pickup_lng' => 29.4 + ($i * 0.001),
                'dropoff_address' => "Surge Test Destination {$i}",
                'dropoff_lat' => -23.85 + ($i * 0.001),
                'dropoff_lng' => 29.45 + ($i * 0.001),
                'payment_method' => 'wallet',
            ]);
            $results["create_ride_{$i}"] = $this->trackStep("Create Ride {$i}", $start, $ride->successful());
            
            // Check fare estimate after each ride
            $start = microtime(true);
            $estimate = Http::timeout(10)->withToken($riderToken)->get("{$api}/rides/fare-estimate", [
                'category' => $this->option('category'),
                'pickup_lat' => -23.9,
                'pickup_lng' => 29.4,
                'dropoff_lat' => -23.85,
                'dropoff_lng' => 29.45,
            ]);
            $currentFare = $estimate->json('breakdown.total_fare');
            $fareProgression[] = $currentFare;
            $results["estimate_{$i}"] = $this->trackStep("Estimate After Ride {$i}", $start, $estimate->successful());
            
            $this->info("   Ride {$i}: fare = {$currentFare}");
        }
        
        // Step 4: Log surge progression
        $this->newLine();
        $this->info('=== SURGE PROGRESSION ===');
        $this->line("  Initial fare: {$initialFare}");
        foreach ($fareProgression as $index => $fare) {
            if ($index === 0) continue;
            $surgeMultiplier = $initialFare > 0 ? round($fare / $initialFare, 2) : 0;
            $this->line("  After ride {$index}: {$fare} (surge: {$surgeMultiplier}x)");
        }
        
        // Summary
        $this->newLine();
        $this->info('=== SURGE SIMULATION SUMMARY ===');
        $totalTime = 0;
        foreach ($results as $step => $data) {
            $status = $data['success'] ? '✓' : '✗';
            $this->line("  {$status} {$data['name']}: {$data['duration']}ms");
            $totalTime += $data['duration'];
        }
        $this->info("  Total: {$totalTime}ms");
        
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
