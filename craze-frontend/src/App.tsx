import { useEffect, useState } from "react";
import { name } from "./consts";
import Map from "./Map";
import { Coordinate, User } from "./types";

function App() {
  const [position, setPosition] = useState<Coordinate | null>(null);
  const [buddies, setBuddies] = useState<User[]>([]);
  const [profile, setProfile] = useState<User | null>(null);
  const [signupUsername, setSignupUsername] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  useEffect(() => {
    navigator.geolocation.getCurrentPosition((position) => {
      setPosition(position.coords);
    });
  }, []);

  useEffect(() => {
    fetch(`http://localhost:4000/reset?name=${name}`);
  }, []);

  useEffect(() => {
    fetch(`http://localhost:4000/getProfile?name=${name}`)
      .then((res) => res.json())
      .then((data) => {
        setProfile(data);
      });
  }, [buddies]);

  useEffect(() => {
    const interval = setInterval(async () => {
      const res = await fetch(`http://localhost:4000/getBuddies?name=${name}`);
      const data = await res.json();
      setBuddies(data);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (window.location.pathname === "/") {
    return (
      <div className="flex flex-col gap-10 mt-20">
        <div className="flex flex-col items-center gap-3">
          <p>Sign Up</p>
          <input
            placeholder="Username"
            className="p-2 w-48 border border-black rounded-sm"
            value={signupUsername}
            onChange={(e) => setSignupUsername(e.target.value)}
          />
          <input
            placeholder="Phone"
            className="p-2 w-48 border border-black rounded-sm"
            value={signupPhone}
            onChange={(e) => setSignupPhone(e.target.value)}
          />
          <input
            placeholder="Password"
            className="p-2 w-48 border border-black rounded-sm"
            value={signupPassword}
            type="password"
            onChange={(e) => setSignupPassword(e.target.value)}
          />
          <button
            className="p-2 bg-zinc-200 rounded-md"
            onClick={async () => {
              await fetch(
                `http://localhost:4000/signup?name=${signupUsername}&phone=${signupPhone}`
              );

              window.location.replace("/" + signupUsername);
            }}
          >
            Sign Up
          </button>
        </div>
        <div className="flex flex-col items-center gap-3">
          <p>Login</p>
          <input
            placeholder="Username"
            className="p-2 w-48 border border-black rounded-sm"
            value={loginUsername}
            onChange={(e) => setLoginUsername(e.target.value)}
          />
          <input
            placeholder="Password"
            className="p-2 w-48 border border-black rounded-sm"
            value={loginPassword}
            type="password"
            onChange={(e) => setLoginPassword(e.target.value)}
          />
          <button
            className="p-2 bg-zinc-200 rounded-md"
            onClick={() => {
              window.location.replace("/" + loginUsername);
            }}
          >
            Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="">
      <div className="flex w-full">
        <div className="w-96 h-screen bg-zinc-50 flex flex-col items-center p-5 gap-5">
          Buddies to Walk With
          <div className="flex flex-col gap-5 w-full">
            {!buddies.length && (
              <div className="text-center text-xs">No buddies found {":("}</div>
            )}
            {buddies.map((buddy) => {
              console.log(buddies);
              return (
                <div className="flex gap-2 items-center">
                  <img
                    src={buddy.profilePicture}
                    alt="Pfp"
                    className="w-10 h-10 rounded-full border-4 border-black"
                  />
                  <div key={buddy.id} className="flex flex-col w-48">
                    <div>{buddy.name}</div>
                    <div className="text-xs">
                      Destination within{" "}
                      {Math.round(
                        Math.sqrt(
                          ((Number(buddy.latGoingTo) -
                            Number(profile?.latGoingTo)) *
                            110) **
                            2 +
                            ((Number(buddy.longGoingTo) -
                              Number(profile?.longGoingTo)) *
                              110) **
                              2
                        ) * 100
                      ) / 100}
                      km of yours.
                    </div>
                  </div>
                  {buddy.incomingRequests.some(
                    (r) => r.accepted && r.fromUserName === name
                  ) ||
                  buddy.outgoingRequests.some(
                    (r) => r.accepted && r.toUserName === name
                  ) ? (
                    <div className="text-xs">{buddy.phone}</div>
                  ) : (
                    <button
                      className="bg-zinc-200 rounded-md px-3 py-2 text-xs w-max"
                      onClick={() => {
                        if (
                          buddy.incomingRequests.some(
                            (r) => r.fromUserName === name
                          )
                        ) {
                          return;
                        }

                        if (
                          buddy.outgoingRequests.some(
                            (r) => r.toUserName === name
                          )
                        ) {
                          fetch(
                            `http://localhost:4000/acceptRequest?name=${name}&buddyName=${buddy.name}`
                          );
                          return;
                        }

                        fetch(
                          `http://localhost:4000/sendRequest?name=${name}&buddyName=${buddy.name}`
                        );
                      }}
                    >
                      {buddy.incomingRequests.some(
                        (r) => r.fromUserName === name
                      )
                        ? "Request Sent"
                        : buddy.outgoingRequests.some(
                            (r) => r.toUserName === name
                          )
                        ? "Accept Request"
                        : "Send Request"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <div className="flex-grow">
          <Map
            currentPosition={position}
            buddies={buddies.filter(
              (buddy) =>
                buddy.incomingRequests.some(
                  (r) => r.accepted && r.fromUserName === name
                ) ||
                buddy.outgoingRequests.some(
                  (r) => r.accepted && r.toUserName === name
                )
            )}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
