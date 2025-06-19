import axios from 'axios';
type Coordinate = [number, number]; // [longitude, latitude]

//implement haversine here
/**
 * Calculate the distance between two lat/lng points in meters using the Haversine formula.
 * @param lat1 Latitude of point 1
 * @param lon1 Longitude of point 1
 * @param lat2 Latitude of point 2
 * @param lon2 Longitude of point 2
 * @returns Distance in meters
 */
export function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const R = 6371000; // Earth's radius in meters

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c/1000;
}


export function isVehicleInsideGeofence(
  geofence: Coordinate[],
  vehicleLocation: Coordinate
): boolean {
  const [x, y] = vehicleLocation;
  let inside = false;

  for (let i = 0, j = geofence.length - 1; i < geofence.length; j = i++) {
    const [xi, yi] = geofence[i];
    const [xj, yj] = geofence[j];

    const intersect =
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }

  return inside;
}

type GpsSchema = {
    speed?: number | string;
    address?: string;
    gpstimestamp?: number;
    gprstimestamp?: number;
    power?: string | number;
    internalBatteryLevel?: string | number;
    latitude?: string | number;
    longitude?: string | number;
    // Add other fields as needed
};
export const formatDate = (dateString?: string) => {
    if (!dateString) return "No date"

    try {
      const [datePart, timePart] = dateString.split("T")
      const [year, month, day] = datePart.split("-")
      const [hour, minute, secondPart] = timePart.split(":")
      const second = secondPart.split(".")[0]

      const date = new Date(
        Number.parseInt(year),
        Number.parseInt(month) - 1,
        Number.parseInt(day),
        Number.parseInt(hour),
        Number.parseInt(minute),
        Number.parseInt(second),
      )

      return date.toLocaleString("en-US", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    } catch (error) {
      return "Invalid date"
    }
  }

  export async function reverseGeocode(lat: number, lon: number): Promise<string> {
    try{
      if(!lat || !lon) {
        return 'Invalid coordinates';
      }
   const rep = await axios.get(`https://api.olamaps.io/places/v1/reverse-geocode?latlng=${lat},${lon}&api_key=${process.env.OLA_API_KEY}`);
// console.log(rep.data.results[0].formatted_address);

    // const data = await rep.json();
    // console.log(rep.results);
    return rep.data.results[0].formatted_address;
    //   const reponse=await axios.get(`${process.env.REVERSE_PROXY_URL}&lat=${lat}&lon=${lon}&format=json`);
    //   if(!reponse.data || !reponse.data.display_name) {
    //     return 'Address not found';
    //   }
    //   const address = reponse.data.address;

    // const parts = [
    //   address.house_number,
    //   address.road,
    //   address.suburb || address.quarter,
    //   address.city || address.town || address.village,
    //   address.state_district,
    //   address.state,
    //   address.postcode,
    //   address.country
    // ];
    // //set a delay of 500ms 
    // await new Promise(resolve => setTimeout(resolve, 600));
    // const formattedAddress = parts.filter(Boolean).join(', ');
    // return formattedAddress || 'Address not found';
    }catch (error) {
      console.error('Error in reverse geocoding:', error);
      return 'Error retrieving address';
    }
  }
