export interface TripStop {
  point: number;
  name: string;
  status: string;
  locationId: string;
  stopType: string;
  plannedTime: string;
  ceta: string;
  geta: string;
  actualSequence: number;
  entryTime: string;
  exitTime: string;
  detentionTime: string;
}

export interface Trip {
  id: string;
  status: "Active" | "Completed" | "Delayed" | "Cancelled" | "Manually Closed";
  routeId: string;
  routeName: string;
  routeType: string;
  startTime: string;
  endTime: string;
  driverName: string;
  driverMobile: string;
  driverDetails: string;
  location: string;
  locationDateTime: string;
  shipmentId: string;
  vehicleName: string;
  vehicleStatus: string;
  statusDuration: string;
  totalDetentionTime: string;
  totalStoppageTime: string;
  totalDriveTime: string;
  domainName: string;
  equipmentId: string;
  coordinates: [number, number];
  stops: TripStop[];
}
