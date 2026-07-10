<?php

namespace App\Listeners;

use App\Events\DriverArrived;
use App\Events\PaymentSucceeded;
use App\Events\RideAccepted;
use App\Events\RideCancelled;
use App\Events\RideCompleted;
use App\Events\RideStarted;
use App\Services\PushNotificationService;
use Illuminate\Events\Dispatcher;

class SendPushNotification
{
    public function __construct(protected PushNotificationService $push) {}

    public function handleRideAccepted(RideAccepted $event): void
    {
        $ride = $event->ride;
        $this->push->send($ride->rider, 'Driver Accepted', 'Your driver is on the way!', [
            'deep_link' => "easyryde://ride/{$ride->id}",
            'ride_id' => $ride->id,
        ]);
    }

    public function handleDriverArrived(DriverArrived $event): void
    {
        $ride = $event->ride;
        $this->push->send($ride->rider, 'Driver Arrived', 'Your driver has arrived at the pickup location.', [
            'deep_link' => "easyryde://ride/{$ride->id}",
            'ride_id' => $ride->id,
        ]);
    }

    public function handleRideStarted(RideStarted $event): void
    {
        $ride = $event->ride;
        $this->push->send($ride->rider, 'Ride Started', 'Your ride is in progress.', [
            'deep_link' => "easyryde://ride/{$ride->id}",
            'ride_id' => $ride->id,
        ]);
    }

    public function handleRideCompleted(RideCompleted $event): void
    {
        $ride = $event->ride;
        $this->push->send($ride->rider, 'Ride Complete', 'Thank you for riding with EasyRyde!', [
            'deep_link' => "easyryde://ride/{$ride->id}",
            'ride_id' => $ride->id,
        ]);
        $this->push->send($ride->driver, 'Ride Complete', 'Ride completed. Payment has been processed.', [
            'deep_link' => "easyryde://ride/{$ride->id}",
            'ride_id' => $ride->id,
        ]);
    }

    public function handleRideCancelled(RideCancelled $event): void
    {
        $ride = $event->ride;
        $this->push->send($ride->driver, 'Ride Cancelled', 'A ride has been cancelled by the rider.', [
            'deep_link' => "easyryde://ride/{$ride->id}",
            'ride_id' => $ride->id,
        ]);
    }

    public function handlePaymentSucceeded(PaymentSucceeded $event): void
    {
        $payment = $event->payment;
        $this->push->send($payment->payer, 'Payment Successful', "Your payment of R{$payment->amount} was successful.", [
            'deep_link' => "easyryde://payment/{$payment->id}",
            'payment_id' => $payment->id,
        ]);
    }

    public function subscribe(Dispatcher $events): void
    {
        $events->listen(RideAccepted::class, [self::class, 'handleRideAccepted']);
        $events->listen(DriverArrived::class, [self::class, 'handleDriverArrived']);
        $events->listen(RideStarted::class, [self::class, 'handleRideStarted']);
        $events->listen(RideCompleted::class, [self::class, 'handleRideCompleted']);
        $events->listen(RideCancelled::class, [self::class, 'handleRideCancelled']);
        $events->listen(PaymentSucceeded::class, [self::class, 'handlePaymentSucceeded']);
    }
}
