const jwt = require("jsonwebtoken");
const _ = require("lodash");
const dotenv = require("dotenv");
const RequestHandler = require("../utils/RequestHandler");
const Logger = require("../utils/logger");
const UserRepository = require("../repositories/UserRepository");
const bcrypt = require("bcrypt"); // Import bcrypt
const userRepository = new UserRepository();
dotenv.config({
  path: "./.env",
});

const logger = new Logger();
const requestHandler = new RequestHandler(logger);

async function login(req) {
  const { email, password } = req.body;  
  try {
    // Retrieve the user by email
    const user = await userRepository.getUserByEmail(email);

    if (!user || user.length === 0) { 
      throw new Error("User not found");
    }

    const foundUser = user[0]; 
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log(hashedPassword);
    console.log(foundUser.password);
    
    const isMatch = await bcrypt.compare(password, foundUser.password);
    if (!isMatch) {
      throw new Error("Invalid Password");
    }

    const token = jwt.sign(
      { userId: foundUser.id, email: foundUser.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' } 
    );

    return token;
  } catch (error) {
    throw new Error(error.message);
  }
}

function getTokenFromHeader(req) {
  if (
    (req.headers.authorization &&
      req.headers.authorization.split(" ")[0] === "Token") ||
    (req.headers.authorization &&
      req.headers.authorization.split(" ")[0] === "Bearer")
  ) {
    return req.headers.authorization.split(" ")[1];
  }

  return null;
}

function verifyToken(req, res, next) {
  try {
    if (_.isUndefined(req.headers.authorization)) {
      requestHandler.throwError(
        401,
        "Unauthorized",
        "Not Authorized to access this resource!"
      )();
    }
    const Bearer = req.headers.authorization.split(" ")[0];

    if (!Bearer || Bearer !== "Bearer") {
      requestHandler.throwError(
        401,
        "Unauthorized",
        "Not Authorized to access this resource!"
      )();
    }

    const token = req.headers.authorization.split(" ")[1];

    if (!token) {
      requestHandler.throwError(
        401,
        "Unauthorized",
        "Not Authorized to access this resource!"
      )();
    }

    // verifies secret and checks exp
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        requestHandler.throwError(
          401,
          "Unauthorized",
          "Please provide a valid token; your token might be expired."
        )();
      }
      req.decoded = decoded;
      next();
    });
  } catch (err) {
    requestHandler.sendError(req, res, err);
  }
}

module.exports = {
  login: login,
  getJwtToken: getTokenFromHeader,
  isAuthenticated: verifyToken,
};
