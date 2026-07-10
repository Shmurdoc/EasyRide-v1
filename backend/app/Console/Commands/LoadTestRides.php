<?php
namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

class LoadTestRides extends Command
{
    protected $signature = 'rides:load-test {--count=100} {--concurrent=10} {--api=http://nginx:8080/api/v1}';
    protected $description = 'Load test the ride creation endpoint';
    
    public function handle()
    {
        $count = (int) $this->option('count');
        $concurrent = (int) $this->option('concurrent');
        $api = $this->option('api');
        
        // Get auth tokens
        $riderTokens = [];
        
        // Login multiple riders for realistic load
        $this->info("Authenticating riders...");
        for ($i = 0; $i < min($count, 10); $i++) {
            try {
                $login = Http::timeout(10)->post("{$api}/auth/login", [
                    'email' => 'rider@easyryde.com',
                    'password' => 'password',
                ]);
                if ($login->successful() && $login->json('data.token')) {
                    $riderTokens[] = $login->json('data.token');
                }
            } catch (\Exception $e) {
                $this->warn("Login attempt {$i} failed: {$e->getMessage()}");
            }
        }
        
        if (empty($riderTokens)) {
            $this->error('Failed to authenticate any riders');
            return 1;
        }
        
        $this->info("Authenticated " . count($riderTokens) . " rider(s)");
        $this->info("Starting load test: {$count} rides, {$concurrent} concurrent");
        $this->newLine();
        
        $results = [];
        $startTime = microtime(true);
        $progressBar = $this->output->createProgressBar($count);
        $progressBar->start();
        
        // Create rides in batches
        $batches = collect(range(1, $count))->chunk($concurrent);
        
        foreach ($batches as $batchIndex => $batch) {
            $promises = [];
            foreach ($batch as $i) {
                $token = $riderTokens[$i % count($riderTokens)];
                try {
                    $promises[$i] = Http::timeout(10)->withToken($token)->async()->post("{$api}/rides", [
                        'category' => 'standard',
                        'pickup_address' => "Load Test Location {$i}",
                        'pickup_lat' => -23.9 + ($i * 0.001),
                        'pickup_lng' => 29.4 + ($i * 0.001),
                        'dropoff_address' => "Load Test Destination {$i}",
                        'dropoff_lat' => -23.85 + ($i * 0.001),
                        'dropoff_lng' => 29.45 + ($i * 0.001),
                        'payment_method' => 'wallet',
                    ]);
                } catch (\Exception $e) {
                    $this->warn("Ride {$i} request failed: {$e->getMessage()}");
                }
            }
            
            // Collect results
            foreach ($promises as $i => $promise) {
                try {
                    $response = $promise->wait();
                    $results[$i] = [
                        'success' => $response->successful(),
                        'status' => $response->status(),
                    ];
                } catch (\Exception $e) {
                    $results[$i] = [
                        'success' => false,
                        'status' => 0,
                    ];
                }
            }
            
            $progressBar->advance($concurrent);
        }
        
        $progressBar->finish();
        $totalTime = round((microtime(true) - $startTime) * 1000);
        
        // Summary
        $successCount = collect($results)->where('success', true)->count();
        $failCount = collect($results)->where('success', false)->count();
        
        $this->newLine();
        $this->newLine();
        $this->info('=== LOAD TEST RESULTS ===');
        $this->info("  Total rides: {$count}");
        $this->info("  Successful: {$successCount}");
        $this->info("  Failed: {$failCount}");
        $this->info("  Success rate: " . round(($successCount / $count) * 100, 1) . "%");
        $this->info("  Total time: {$totalTime}ms");
        $this->info("  Avg per ride: " . round($totalTime / $count, 1) . "ms");
        $this->info("  Throughput: " . round($count / ($totalTime / 1000), 1) . " rides/sec");
        
        // Show failed requests if any
        if ($failCount > 0) {
            $this->newLine();
            $this->error('Failed requests:');
            $shown = 0;
            foreach ($results as $i => $result) {
                if (!$result['success']) {
                    $this->line("  Ride {$i}: HTTP {$result['status']}");
                    $shown++;
                    if ($shown >= 10) {
                        $this->line("  ... and " . ($failCount - 10) . " more");
                        break;
                    }
                }
            }
        }
        
        return $failCount > 0 ? 1 : 0;
    }
}
