import axios from "axios";
import bodyParser from "body-parser";
import cors from "cors";
import express from "express";
import { exec } from "node:child_process";
import { db } from "./db";
import { extractCoordinates } from "./extractCoordinates";
import { updateScript } from "./updatescript";

async function reloadNavigationServer() {
  await updateScript();
  const empty =
    (await new Promise((resolve, reject) => {
      exec(
        `docker ps -qa`,
        { shell: "powershell.exe" },
        (err, stdout, stderr) => {
          if (err) {
            console.error(err);
            return;
          }
          resolve(stdout.toString());
        }
      );
    })) == "";

  if (!empty) {
    await new Promise((resolve, reject) => {
      exec(
        `docker rm -v -f $(docker ps -qa)`,
        { shell: "powershell.exe" },
        (err, stdout, stderr) => {
          if (err) {
            console.error(err);
            return;
          }
          resolve(stdout.toString());
        }
      );
    });
  }
  exec(
    `docker run --rm -t -v "${__dirname}/osrm:/data" ghcr.io/project-osrm/osrm-backend osrm-extract -p /data/foot.lua /data/Toronto.osm.pbf; docker run --rm -t -v "${__dirname}/osrm:/data" ghcr.io/project-osrm/osrm-backend osrm-partition /data/Toronto.osm.pbf; docker run --rm -t -v "${__dirname}/osrm:/data" ghcr.io/project-osrm/osrm-backend osrm-customize /data/Toronto.osm.pbf; docker run --rm -p 5000:5000 -v "${__dirname}/osrm:/data" ghcr.io/project-osrm/osrm-backend osrm-routed --algorithm mld /data/Toronto.osm.pbf`,
    { shell: "powershell.exe" },
    (err, stdout, stderr) => {
      if (err) {
        console.error(err);
        return;
      }
      console.log(1);
      console.log(stdout.toString());
    }
  );
}

async function start() {
  const PORT = 4000;

  const app = express();

  app.use(cors(), bodyParser.json());

  app.get("/", (req, res) => {
    res.send("Hello World!");
  });

  reloadNavigationServer();
  // await new Promise((resolve) => setTimeout(resolve, 5000));
  // exec("docker kill $(docker ps -q)");

  // ---------------------------- USERS ----------------------------

  app.get("/reset", async (req, res) => {
    const { name } = req.query;
    if (!name || typeof name !== "string") {
      res.sendStatus(400);
      return;
    }

    const user = await db.user.findFirst({
      where: {
        name: name,
      },
    });

    if (!user) {
      res.sendStatus(400);
      return;
    }

    await db.user.update({
      where: {
        name: name,
      },
      data: {
        lat: null,
        long: null,
        latGoingTo: null,
        longGoingTo: null,
      },
    });

    res.send(user);
  });

  app.get("/signup", async (req, res) => {
    const { name, phone } = req.query;
    if (
      !name ||
      typeof name !== "string" ||
      !phone ||
      typeof phone !== "string"
    ) {
      res.sendStatus(400);
      return;
    }

    const user = await db.user.create({
      data: {
        name: name,
        phone: phone,
        profilePicture:
          "https://static.vecteezy.com/system/resources/thumbnails/009/292/244/small/default-avatar-icon-of-social-media-user-vector.jpg",
      },
    });

    res.send(user);
  });

  app.get("/getProfile", async (req, res) => {
    const { name } = req.query;
    if (!name || typeof name !== "string") {
      res.sendStatus(400);
      return;
    }

    const user = await db.user.findFirst({
      where: {
        name: name,
      },
    });

    if (!user) {
      res.sendStatus(400);
      return;
    }

    res.send(user);
  });

  app.get("/getBuddies", async (req, res) => {
    const { name } = req.query;
    if (!name || typeof name !== "string") {
      res.sendStatus(400);
      return;
    }

    const user = await db.user.findFirst({
      where: {
        name: name,
      },
    });

    if (!user) {
      res.sendStatus(400);
      return;
    }

    const otherUsers = await db.user.findMany({
      where: {
        name: {
          not: name,
        },
      },
      include: {
        incomingRequests: true,
        outgoingRequests: true,
      },
    });

    const buddies = otherUsers.filter((otherUser) => {
      return (
        user.latGoingTo &&
        otherUser.latGoingTo &&
        user.longGoingTo &&
        otherUser.longGoingTo &&
        Math.abs(user.latGoingTo.toNumber() - otherUser.latGoingTo.toNumber()) <
          0.01 &&
        Math.abs(
          user.longGoingTo.toNumber() - otherUser.longGoingTo.toNumber()
        ) < 0.01
      );
    });

    res.send(
      await Promise.all(
        buddies.map(async (buddy) => ({
          ...buddy,
          path: await navigate(
            buddy.long!.toNumber(),
            buddy.lat!.toNumber(),
            buddy.longGoingTo!.toNumber(),
            buddy.latGoingTo!.toNumber(),
            name
          ),
        }))
      )
    );
  });

  app.get("/acceptRequest", async (req, res) => {
    const { name, buddyName } = req.query;
    if (
      !name ||
      typeof name !== "string" ||
      !buddyName ||
      typeof buddyName !== "string"
    ) {
      res.sendStatus(400);
      return;
    }

    const user = await db.user.findFirst({
      where: {
        name: name,
      },
    });

    const buddy = await db.user.findFirst({
      where: {
        name: buddyName,
      },
    });

    if (!user || !buddy) {
      res.sendStatus(400);
      return;
    }

    await db.request.updateMany({
      where: {
        OR: [
          { fromUser: buddy, toUser: user },
          { fromUser: user, toUser: buddy },
        ],
      },
      data: {
        accepted: true,
      },
    });

    res.sendStatus(200);
  });

  app.get("/sendRequest", async (req, res) => {
    const { name, buddyName } = req.query;
    if (
      !name ||
      typeof name !== "string" ||
      !buddyName ||
      typeof buddyName !== "string"
    ) {
      res.sendStatus(400);
      return;
    }

    const user = await db.user.findFirst({
      where: {
        name: name,
      },
    });

    const buddy = await db.user.findFirst({
      where: {
        name: buddyName,
      },
    });

    if (!user || !buddy) {
      res.sendStatus(400);
      return;
    }

    await db.request.create({
      data: {
        fromUserName: user.name,
        toUserName: buddy.name,
      },
    });

    res.sendStatus(200);
  });

  // ---------------------------- REPORTS ----------------------------

  app.get("/report", async (req, res) => {
    // CREATE REPORT
    const { longitude, latitude, severity, description } = req.query;

    if (
      isNaN(Number(longitude)) ||
      isNaN(Number(latitude)) ||
      isNaN(Number(severity)) ||
      typeof description !== "string"
    ) {
      res.sendStatus(400);
      return;
    }

    const report = await db.reports.create({
      data: {
        longitude: Number(longitude),
        latitude: Number(latitude),
        severity: Number(severity),
        description: description || "",
      },
    });

    await reloadNavigationServer(); // update
    res.sendStatus(200);
  });

  app.get("/navigate", async (req, res) => {
    const { startLat, startLon, endLat, endLon, name } = req.query;

    if (!name || typeof name !== "string") {
      res.sendStatus(400);
      return;
    }

    const user = await db.user.findFirst({
      where: {
        name: name,
      },
    });

    if (!user) {
      res.sendStatus(400);
      return;
    }

    await db.user.update({
      where: {
        name: name,
      },
      data: {
        lat: Number(startLat),
        long: Number(startLon),
        latGoingTo: Number(endLat),
        longGoingTo: Number(endLon),
      },
    });

    await db.request.deleteMany({
      where: {
        OR: [{ fromUserName: user.name }, { toUserName: user.name }],
      },
    });

    const response = await axios.get(
      `http://localhost:5000/route/v1/driving/${startLon},${startLat};${endLon},${endLat}?overview=full&alternatives=false&steps=true`
    );

    console.log(
      `http://localhost:5000/route/v1/driving/${startLon},${startLat};${endLon},${endLat}?overview=full&alternatives=false&steps=true`
    );

    res.send(extractCoordinates(response.data));
  });

  app.get("/reports", async (req, res) => {
    const reports = await db.reports.findMany();
    res.send(reports);
  });

  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

async function navigate(
  startLon: number,
  startLat: number,
  endLon: number,
  endLat: number,
  name: string
) {
  const response = await axios.get(
    `http://localhost:5000/route/v1/driving/${startLon},${startLat};${endLon},${endLat}?overview=full&alternatives=false&steps=true`
  );

  return extractCoordinates(response.data);
}

start();
