import express from "express";
import User from "../../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import config from "config";
import UserDto from "../../dtos/UserDto.js";
import Chat from "../../models/Chat.js";
import ChatDto from "../../dtos/ChatDto.js";
import auth from "../../middleware/auth.js";

const router = express.Router();

// /api/users
router.get("/:username?", async (req, res) => {
  const { username } = req.params;
  let result = await User.find().sort({ date: -1 });
  if (username) {
    result = result.filter((u) => u.username.includes(username.toLowerCase()));
  }
  const users = result.map((user) => new UserDto(user));
  return res.status(200).json(users);
});

router.post("/:username", auth, async (req, res) => {
  const { user, existingUserIds } = req.body;
  console.log(existingUserIds);
  const { username } = req.params;

  let result = await User.find().sort({ date: -1 });
  if (username) {
    result = result.filter((u) => u.username.includes(username.toLowerCase()));

    result = result.filter(
      (u) =>
        u.username.includes(username.toLowerCase()) &&
        u.id !== user.id &&
        !existingUserIds.includes(u.id)
    );
  }
  const users = result.map((user) => new UserDto(user));
  //console.log(users);
  return res.status(201).json(users);
});

router.get("/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    return res.status(200).json(new UserDto(user));
  } catch (error) {
    return res.status(404).json({});
  }
});

router.post("/", async (req, res) => {
  const { username, password, email, avatarUrl } = req.body;

  // Validation
  if (!username || !password || !email)
    return res.status(400).json({ errorMessage: "Please enter all fields" });

  // Does email already exists
  const userEmail = await User.findOne({ email: email });
  if (userEmail)
    return res.status(400).json({ errorMessage: "Email already exists" });

  // Does username already exists
  const userName = await User.findOne({ username: username });
  if (userName)
    return res.status(400).json({ errorMessage: "Username already exists" });

  const newUser = new User({
    email,
    username,
    avatarUrl,
  });
  // Creating salt && hash
  bcrypt.genSalt(10, (err, salt) => {
    bcrypt.hash(password, salt, (err, hash) => {
      if (err)
        return res.status(500).json({ errorMessage: "Internal server error" });
      newUser.passwordSalt = salt;
      newUser.passwordHash = hash;

      // Saving user in DB
      newUser
        .save()
        .then((data) => {
          jwt.sign(
            { id: data.id },
            config.get("secretKey"),
            { expiresIn: "3600" },
            (err, token) => {
              if (err)
                return res
                  .status(500)
                  .json({ errorMessage: "Error creating token" });

              const user = new UserDto(data);
              return res.status(201).json({ token: token, user: user });
            }
          );
        })
        .catch((err) => res.status(500).json({ errorMessage: err }));
    });
  });

  // Insert user in DB
});

export default router;
