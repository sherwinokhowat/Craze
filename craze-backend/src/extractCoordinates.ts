import { coordinate } from "./types/types";

export function extractCoordinates(path: any): coordinate[] {
  let coordinates: coordinate[] = [];

  // add first end point
  const latitude1 = path.waypoints[0].location[0];
  const longitude1 = path.waypoints[0].location[1];
  const a: coordinate = {
    latitude: latitude1,
    longitude: longitude1,
  };
  coordinates.push(a);

  // add everything in between
  coordinates = path.routes[0].legs[0].steps.flatMap((step: any) => {
    return step.intersections.map((intersection: any) => {
      const latitude = intersection.location[0];
      const longitude = intersection.location[1];
      return {
        latitude,
        longitude,
      };
    });
  });

  // add other endpoint
  const latitude2 = path.waypoints[1].location[0];
  const longitude2 = path.waypoints[1].location[1];

  const b: coordinate = {
    latitude: latitude2,
    longitude: longitude2,
  };

  coordinates.push(b);

  return coordinates;
}
