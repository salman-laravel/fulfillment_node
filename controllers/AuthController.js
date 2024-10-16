const FulFillmentService = require('../services/FulFillmentService');
const auth = require('../utils/auth');

class AuthController {
  static async login(req, res) {

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    try {
      const token = await auth.login(req);
      res.send(token);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }
}

module.exports = AuthController;