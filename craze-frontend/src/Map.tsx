import "leaflet/dist/leaflet.css";
import { Fragment, ReactElement, useEffect, useRef, useState } from "react";
import { MapContainer, Polyline, TileLayer, useMapEvent } from "react-leaflet";
import { Marker, MarkerLayer } from "react-leaflet-marker";
import ReportDangerModal from "./ReportDangerModal";
import { Coordinate, Report, User } from "./types";

interface MapProps {
  currentPosition: Coordinate | null;
  buddies: User[];
}

const mald = [
  { latitude: -79.406288, longitude: 43.673161 },
  { latitude: -79.405908, longitude: 43.672264 },
  { latitude: -79.400675, longitude: 43.673344 },
  { latitude: -79.39939, longitude: 43.670185 },
  { latitude: -79.395259, longitude: 43.671051 },
  { latitude: -79.394986, longitude: 43.670428 },
  { latitude: -79.394711, longitude: 43.670466 },
  { latitude: -79.394313, longitude: 43.669593 },
  { latitude: -79.39348, longitude: 43.669764 },
  { latitude: -79.393188, longitude: 43.669009 },
  { latitude: -79.391917, longitude: 43.669275 },
  { latitude: -79.391851, longitude: 43.669115 },
  { latitude: -79.389578, longitude: 43.669585 },
  { latitude: -79.386231, longitude: 43.661473 },
  { latitude: -79.387587, longitude: 43.661183 },
  { latitude: -79.386238, longitude: 43.658132 },
  { latitude: -79.386445, longitude: 43.658077 },
  { latitude: -79.385915, longitude: 43.6569 },
  { latitude: -79.386582, longitude: 43.656755 },
  { latitude: -79.386288, longitude: 43.656033 },
  { latitude: -79.386433, longitude: 43.656002 },
  { latitude: -79.385536, longitude: 43.653885 },
  { latitude: -79.38635, longitude: 43.65347 },
  { latitude: -79.386259, longitude: 43.653333 },
  { latitude: -79.387258, longitude: 43.653091 },
  { latitude: -79.385937, longitude: 43.650073 },
  { latitude: -79.386989, longitude: 43.649845 },
  { latitude: -79.386466, longitude: 43.648599 },
  { latitude: -79.38667, longitude: 43.648554 },
  { latitude: -79.386153, longitude: 43.647285 },
  { latitude: -79.388756, longitude: 43.646723 },
  { latitude: -79.388689, longitude: 43.64656 },
  { latitude: -79.389524, longitude: 43.646384 },
  { latitude: -79.38911, longitude: 43.645397 },
  { latitude: -79.391689, longitude: 43.644835 },
  { latitude: -79.39117, longitude: 43.643544 },
  { latitude: -79.393834, longitude: 43.642891 },
  { latitude: -79.393834, longitude: 43.642891 },
];

function MyComponent({
  onClick,
  onZoom,
  r,
}: {
  onClick: (c: Coordinate) => void;
  r: React.MutableRefObject<HTMLDivElement | null>;
  onZoom: (z: number) => void;
}): null {
  useMapEvent("click", (event) => {
    if (r.current?.contains(event.originalEvent.target as Node)) {
      return;
    }
    onClick({ latitude: event.latlng.lat, longitude: event.latlng.lng });
  });
  useMapEvent("zoomend", (event) => {
    onZoom(event.target._zoom);
  });
  return null;
}

export default function Map({
  currentPosition,
  buddies,
}: MapProps): ReactElement {
  const position = [43.659, -79.397] as [number, number];
  const [path, setPath] = useState<Coordinate[]>([]);
  const [clickPosition, setClickPosition] = useState<Coordinate | null>(null);
  const clickMarkerRef = useRef(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [dangerModalOpen, setDangerModalOpen] = useState(false);
  const [zoom, setZoom] = useState(0);
  const [profile, setProfile] = useState<User | null>(null);

  useEffect(() => {
    fetch(
      `http://localhost:4000/getProfile?name=${window.location.pathname.slice(
        1
      )}`
    )
      .then((res) => res.json())
      .then((data) => {
        setProfile(data);
      });
  }, [clickPosition]);

  console.log(buddies);

  useEffect(() => {
    const interval = setInterval(() => {
      fetch("http://localhost:4000/reports")
        .then((res) => res.json())
        .then((data) => {
          setReports(data);
        });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetch("http://localhost:4000/reports")
      .then((res) => res.json())
      .then((data) => {
        setReports(data);
      });
  }, [clickPosition]);

  return (
    <div className="h-full w-full">
      {/* @ts-ignore */}
      <MapContainer center={position} zoom={13}>
        <MyComponent
          r={clickMarkerRef as any}
          onClick={async (c) => {
            setClickPosition(c);
            setDangerModalOpen(false);
          }}
          onZoom={(z) => setZoom(z)}
        />
        {/* @ts-ignore */}
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {/* @ts-ignore */}
        {/* <CircleMarker center={position} radius={10}>
          <Popup>I am a pop-up!</Popup>
        </CircleMarker> */}
        {currentPosition && profile && (
          <div>
            <Polyline
              pathOptions={{
                color: "black",
                opacity: 0.75,
                weight: 5,
                lineJoin: "round",
                lineCap: "round",
              }}
              positions={[
                {
                  latitude: currentPosition.longitude,
                  longitude: currentPosition.latitude,
                },
                ...path,
              ].map((a) => [a.longitude, a.latitude])}
            />
            {buddies.map((buddy) => (
              <Polyline
                pathOptions={{
                  color: "black",
                  opacity: 0.5,
                  weight: 5,
                  lineJoin: "round",
                  lineCap: "round",
                }}
                positions={[
                  {
                    latitude: buddy.long,
                    longitude: buddy.lat,
                  },
                  ...buddy.path!,
                ].map((a) => [a.longitude, a.latitude] as [number, number])}
              />
            ))}

            <MarkerLayer>
              {reports.map((report) => (
                <Marker
                  position={[Number(report.latitude), Number(report.longitude)]}
                >
                  <div
                    className={`absolute -left-4 -top-4 w-8 h-8 rounded-full text-white text-xl text-center ${
                      report.severity === 3
                        ? "bg-red-500"
                        : report.severity === 2
                        ? "bg-orange-500"
                        : "bg-orange-300"
                    }`}
                  >
                    {report.severity === 3
                      ? "!!!"
                      : report.severity === 2
                      ? "!!"
                      : "!"}
                  </div>
                  {zoom > 15 && (
                    <div
                      className={`absolute flex flex-col bg-zinc-50 w-max p-1 gap-1 border-2 ${
                        report.severity === 3
                          ? "border-red-500"
                          : report.severity === 2
                          ? "border-orange-500"
                          : "border-orange-300"
                      }`}
                    >
                      <p>Severity: {report.severity}</p>
                      <p>{report.description}</p>
                      <p>
                        {Math.round(
                          ((new Date().getTime() -
                            new Date(report.timeCreated).getTime()) /
                            1000 /
                            60 /
                            60 /
                            24) *
                            100
                        ) / 100}{" "}
                        days ago
                      </p>
                    </div>
                  )}
                </Marker>
              ))}
            </MarkerLayer>
            <MarkerLayer>
              <Marker
                position={[currentPosition.latitude, currentPosition.longitude]}
              >
                <img
                  src={profile.profilePicture}
                  alt="Pfp"
                  className="absolute -top-5 -left-5 w-10 h-10 rounded-full border-4 border-black "
                ></img>
              </Marker>
              <Marker
                position={[
                  Number(profile.latGoingTo),
                  Number(profile.longGoingTo),
                ]}
              >
                <img
                  src={profile.profilePicture}
                  alt="Pfp"
                  className="absolute -top-5 -left-5 w-10 h-10 rounded-full border-4 border-black opacity-50"
                ></img>
              </Marker>
              {buddies.map((buddy) => (
                <Fragment key={buddy.id}>
                  <Marker position={[Number(buddy.lat), Number(buddy.long)]}>
                    <img
                      src={buddy.profilePicture}
                      alt="Pfp"
                      className="absolute -top-5 -left-5 w-10 h-10 rounded-full border-4 border-black"
                    ></img>
                  </Marker>
                  <Marker
                    position={[
                      Number(buddy.latGoingTo),
                      Number(buddy.longGoingTo),
                    ]}
                  >
                    <img
                      src={buddy.profilePicture}
                      alt="Pfp"
                      className="absolute -top-5 -left-5 w-10 h-10 rounded-full border-4 border-black opacity-50"
                    ></img>
                    {/* <Popup>I am a pop-up!</Popup> */}
                  </Marker>
                </Fragment>
              ))}
            </MarkerLayer>
          </div>
        )}
        {clickPosition && (
          <MarkerLayer>
            <Marker
              position={[clickPosition.latitude, clickPosition.longitude]}
            >
              <div ref={clickMarkerRef} onClick={(event) => {}}>
                <div className="absolute -left-2 -top-2 w-4 h-4 rounded-full bg-red-500" />
                {dangerModalOpen ? (
                  <ReportDangerModal
                    onReport={async (description, severity) => {
                      const res = await fetch(
                        `http://localhost:4000/report?latitude=${clickPosition.latitude}&longitude=${clickPosition.longitude}&severity=${severity}&description=${description}}`
                      );
                      setClickPosition({ longitude: 0, latitude: 0 });
                    }}
                  />
                ) : (
                  <div className="flex flex-col bg-zinc-50 w-max p-1 gap-1 border-2 border-red-500">
                    <button
                      className="p-2 bg-zinc-200 rounded-sm"
                      onClick={async () => {
                        setDangerModalOpen(true);
                      }}
                    >
                      Report Danger
                    </button>
                    <button
                      className="p-2 bg-zinc-200 rounded-sm"
                      onClick={async () => {
                        const res = await fetch(
                          `http://localhost:4000/navigate?startLat=${
                            currentPosition?.latitude
                          }&startLon=${currentPosition?.longitude}&endLat=${
                            clickPosition.latitude
                          }&endLon=${
                            clickPosition.longitude
                          }&name=${window.location.pathname.slice(1)}`
                        );
                        const data = await res.json();
                        setPath(data);
                        setClickPosition({ longitude: 0, latitude: 0 });
                      }}
                    >
                      Navigate Here
                    </button>
                  </div>
                )}
              </div>
            </Marker>
          </MarkerLayer>
        )}
      </MapContainer>
    </div>
  );
}
