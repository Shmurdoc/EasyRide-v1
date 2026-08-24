import type { Ride } from '../types';
interface ActivityCardProps {
    ride: Ride;
    onPress?: () => void;
}
export declare function ActivityCard({ ride, onPress }: ActivityCardProps): import("react/jsx-runtime").JSX.Element;
export {};
