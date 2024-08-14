export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface Report {
  description: string;
  id: string;
  latitude: string;
  longitude: string;
  severity: number;
  timeCreated: string;
  timeUpdated: string;
}

export interface User {
  id: string;
  latGoingTo: string;
  longGoingTo: string;
  lat: string;
  long: string;
  name: string;
  phone: string;
  profilePicture: string;
  incomingRequests: {
    fromUserName: string;
    toUserName: string;
    accepted: boolean;
  }[];
  outgoingRequests: {
    fromUserName: string;
    accepted: boolean;
    toUserName: string;
  }[];
  path?: Coordinate[];
}
