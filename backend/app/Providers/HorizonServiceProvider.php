<?php

namespace App\Providers;

use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use Laravel\Horizon\Horizon;

class HorizonServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        Horizon::auth(function ($request) {
            return $request->user()
                && $request->user()->hasAnyRole(['admin', 'super-admin']);
        });
    }

    public function register(): void
    {
        //
    }
}
