
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

const generateAccessToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role_id: user.role_id,
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: "30m" },
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: "7d" },
  );
};

export { generateAccessToken, generateRefreshToken };