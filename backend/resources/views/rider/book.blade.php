@extends('layouts.app')

@section('title', 'Book a Ride')

@section('content')
    <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900">Book a Ride</h1>
        <p class="text-gray-500 text-sm mt-1">Enter your trip details to get started</p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div class="lg:col-span-2 space-y-6">

            <div class="bg-white rounded-xl border border-gray-200 p-5">
                <h2 class="text-lg font-semibold text-gray-900 mb-4">Trip Details</h2>
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Pickup Location</label>
                        <div class="relative">
                            <div class="absolute left-3 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-green-500 rounded-full"></div>
                            <input type="text" class="w-full pl-8 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" placeholder="Enter pickup address" value="123 Main Street, Downtown">
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Dropoff Location</label>
                        <div class="relative">
                            <div class="absolute left-3 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-red-500 rounded-full"></div>
                            <input type="text" class="w-full pl-8 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" placeholder="Enter destination" value="456 Oak Avenue, Uptown">
                        </div>
                    </div>
                </div>
            </div>

            <div class="bg-white rounded-xl border border-gray-200 p-5">
                <h2 class="text-lg font-semibold text-gray-900 mb-4">Select Ride Type</h2>
                <div class="space-y-3" x-data="{ selected: 'standard' }">
                    <label class="flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-colors" :class="selected === 'standard' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'" x-on:click="selected = 'standard'">
                        <input type="radio" name="ride_type" value="standard" class="sr-only">
                        <div class="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                            <i data-lucide="car" class="w-5 h-5 text-gray-600"></i>
                        </div>
                        <div class="flex-1">
                            <p class="text-sm font-semibold text-gray-900">Standard</p>
                            <p class="text-xs text-gray-500">Comfortable rides, sedans</p>
                        </div>
                        <p class="text-sm font-bold text-gray-900">$18.00</p>
                    </label>
                    <label class="flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-colors" :class="selected === 'premium' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'" x-on:click="selected = 'premium'">
                        <input type="radio" name="ride_type" value="premium" class="sr-only">
                        <div class="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                            <i data-lucide="sparkles" class="w-5 h-5 text-amber-600"></i>
                        </div>
                        <div class="flex-1">
                            <p class="text-sm font-semibold text-gray-900">Premium</p>
                            <p class="text-xs text-gray-500">Luxury vehicles, top drivers</p>
                        </div>
                        <p class="text-sm font-bold text-gray-900">$32.00</p>
                    </label>
                    <label class="flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-colors" :class="selected === 'minivan' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'" x-on:click="selected = 'minivan'">
                        <input type="radio" name="ride_type" value="minivan" class="sr-only">
                        <div class="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                            <i data-lucide="bus" class="w-5 h-5 text-green-600"></i>
                        </div>
                        <div class="flex-1">
                            <p class="text-sm font-semibold text-gray-900">Minivan</p>
                            <p class="text-xs text-gray-500">MPV/van, 6+ passengers</p>
                        </div>
                        <p class="text-sm font-bold text-gray-900">$24.00</p>
                    </label>
                    <label class="flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-colors" :class="selected === 'pets' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'" x-on:click="selected = 'pets'">
                        <input type="radio" name="ride_type" value="pets" class="sr-only">
                        <div class="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                            <i data-lucide="heart" class="w-5 h-5 text-purple-600"></i>
                        </div>
                        <div class="flex-1">
                            <p class="text-sm font-semibold text-gray-900">Pets</p>
                            <p class="text-xs text-gray-500">Pet-friendly vehicles</p>
                        </div>
                        <p class="text-sm font-bold text-gray-900">$20.00</p>
                    </label>
                </div>
            </div>

            <div class="bg-white rounded-xl border border-gray-200 p-5">
                <div class="flex items-center justify-between mb-2">
                    <h2 class="text-lg font-semibold text-gray-900">Estimated Fare</h2>
                    <p class="text-2xl font-bold text-gray-900">$18.00</p>
                </div>
                <p class="text-xs text-gray-400 mb-4">~15 min · 4.2 miles</p>
                <div class="space-y-2">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Promo Code</label>
                        <div class="flex gap-2">
                            <input type="text" class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" placeholder="Enter code">
                            <button class="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200">Apply</button>
                        </div>
                    </div>
                    <button class="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors text-sm">
                        <i data-lucide="car" class="w-4 h-4 inline-block mr-1"></i> Book Now
                    </button>
                </div>
            </div>
        </div>

        <div class="lg:col-span-3">
            <div class="bg-white rounded-xl border border-gray-200 p-5 h-full">
                <h2 class="text-lg font-semibold text-gray-900 mb-4">Map View</h2>
                <div class="bg-gray-100 rounded-lg h-[500px] flex items-center justify-center text-gray-400">
                    <div class="text-center">
                        <i data-lucide="map" class="w-16 h-16 mx-auto mb-3 text-gray-300"></i>
                        <p class="text-sm">Interactive Map Loading...</p>
                        <p class="text-xs text-gray-300 mt-1">Your route will appear here</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
@endsection