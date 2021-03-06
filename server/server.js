// importing
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import Pusher from "pusher";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import users from "./routes/api/users.js";
import messages from "./routes/api/messages.js";
import chats from "./routes/api/chats.js";
import config from "config";
import auth from "./routes/api/auth.js";

// app config
const port = process.env.PORT || 8080;
const app = express();

const corsSettings = {
  origin: "http://localhost:3000",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  credentials: true,
};

const pusher = new Pusher({
  appId: "1329508",
  key: "92f428a20d5de670ac76",
  secret: "e837f617f0d613797ce5",
  cluster: "eu",
  useTLS: true,
});

// middleware
app.use(cors(corsSettings));
app.use(express.urlencoded({ extended: true })); // support URL-encoded bodies
app.use(express.json());
app.use(cookieParser());

// use api routes
app.use("/api/users", users);
app.use("/api/messages", messages);
app.use("/api/chats", chats);
app.use("/auth", auth);

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["Authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (token === null) return res.sendStatus(401); //Unauthorized

  jwt.verify(token, secretKey, (err, user) => {
    if (err) return res.sendStatus(403); //Forbidden
    req.user = user;
    next();
  });
};

// DB config

mongoose
  .connect(config.get("dbUrl"))
  .then(() => console.log("DB connected"))
  .catch((err) => console.log(err));

const db = mongoose.connection;

db.once("open", () => {
  const msgCollection = db.collection("messages");
  const changeStream = msgCollection.watch();

  changeStream.on("change", (change) => {
    if (change.operationType === "insert") {
      const messageDetails = change.fullDocument;
      pusher.trigger("messages", "inserted", {
        name: messageDetails.name,
        message: messageDetails.message,
        timestamp: messageDetails.timestamp,
        chatId: messageDetails.chatId,
        _id: messageDetails._id,
        to: messageDetails._id,
      });
    } else {
      console.log("Error triggering pusher");
    }
  });
});

// API routes
app.get("/", (req, res) => res.status(200).send("WhatsApp API"));

app.get("/cookie", (req, res) => {
  return res
    .status(200)
    .cookie("testni", "adilesgsgsrg", { httpOnly: true })
    .send("Eo ga");
});

//404 route
app.get("*", (req, res) => {
  res.status(404).send("<h2>Error 404 - Page not found</h2>");
});
// API Users
// app.post("/register", r);

// listen
app.listen(port, () => {
  console.log(`Server running on localhost:${port}`);
});
