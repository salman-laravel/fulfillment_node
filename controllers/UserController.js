const UserService = require("../services/UserService");
const bcrypt = require("bcrypt");
const Joi = require("joi");
const Logger = require("../utils/logger");
const RequestHandler = require("../utils/RequestHandler");

let userService = new UserService();
const logger = new Logger();
const requestHandler = new RequestHandler(logger);
const tokenList = {};

class UserController {
  static async create(req, res) {
    const data = req.body;

    const schema = Joi.object({
      email: Joi.string().email().allow("").optional(),
      phone: Joi.string().allow("").optional(),
      password: Joi.string()
        .pattern(new RegExp("^[a-zA-Z0-9]{3,30}$"))
        .required(),
    }).xor("email", "phone");

    const { error, value } = schema.validate({
      email: data.email,
      phone: data.phone,
      password: data.password,
    });

    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const existingUser = await userService.getByCondition({
      email: data.email,
    });

    if (existingUser.length > 0) {
      return res
        .status(400)
        .json({ error: "Account with this Email Already exists" });
    }

    const hashedPass = bcrypt.hashSync(data.password, 10);
    data.password = hashedPass;

    const User = await userService.create(data);

    res.send(User);
  }
}

module.exports = UserController;
