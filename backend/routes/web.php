<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::middleware(['auth:sanctum'])->group(function () {
    Route::get('/dashboard', function () {
        return view('dashboard.index');
    })->name('web.dashboard');

    Route::get('/rides', function () {
        return view('rides.index');
    })->name('web.rides.index');

    Route::get('/rides/{ride}', function () {
        return view('rides.show');
    })->name('web.rides.show');

    Route::get('/users', function () {
        return view('users.index');
    })->name('web.users.index');

    Route::get('/users/{user}', function () {
        return view('users.show');
    })->name('web.users.show');

    Route::get('/drivers', function () {
        return view('drivers.index');
    })->name('web.drivers.index');

    Route::get('/drivers/{driver}', function () {
        return view('drivers.show');
    })->name('web.drivers.show');

    Route::get('/payments', function () {
        return view('payments.index');
    })->name('web.payments');

    Route::get('/wallet', function () {
        return view('wallet.index');
    })->name('web.wallet');

    Route::get('/promotions', function () {
        return view('promotions.index');
    })->name('web.promotions');

    Route::get('/deliveries', function () {
        return view('deliveries.index');
    })->name('web.deliveries');

    Route::get('/settings', function () {
        return view('settings.index');
    })->name('web.settings');

    Route::get('/rider/book', function () {
        return view('rider.book');
    })->name('web.rider.book');

    Route::get('/rider/track', function () {
        return view('rider.track');
    })->name('web.rider.track');

    Route::get('/driver/rides', function () {
        return view('driver.rides');
    })->name('web.driver.rides');

    Route::get('/driver/live', function () {
        return view('driver.live');
    })->name('web.driver.live');
});
