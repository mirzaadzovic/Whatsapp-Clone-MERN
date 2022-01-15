import express from "express";
import User from "../../models/User.js";
import UserDto from "../../dtos/UserDto.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import config from "config";
import auth from "../../middleware/auth.js";

const router = express.Router();

// api login

router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    // Does user exist
    const user = await User.findOne({ username }).then(async (user) => {
      if (!user) return null;
      return user;
    });

    console.log(user);
    if (!user)
      return res
        .status(400)
        .json({ errorMessage: "Wrong username or password" });
    // Password validation
    const doesItMatch = await bcrypt.compare(password, user.passwordHash);

    if (!doesItMatch)
      return res.json({ errorMessage: "Wrong username or password" });

    //Generate JWT
    const token = jwt.sign({ id: user.id }, config.get("secretKey"), {
      expiresIn: 3600,
    });

    return res
      .status(200)
      .cookie("wat", token, { httpOnly: true })
      .json({ token: token, user: new UserDto(user) });
  } catch (err) {
    return res.send(500).json({ errorMessage: err });
  }
});

// API logged in user
router.get("/user", auth, (req, res) => {
  console.log(req.user.id);
  User.findById(req.user.id)
    .then((user) => res.status(200).json(new UserDto(user)))
    .catch((e) => res.status(400).json({ errorMessage: "Invalid token!" }));
});

export default router;
