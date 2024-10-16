const UserRepository = require("../repositories/UserRepository");
const UserModel = require("../models/user");

let repository = new UserRepository(UserModel);

class UserService {
  async create(data) {
    return await repository.create(data);
  }

  async getByCondition(conditions) {
    return await repository.getByCondition(conditions);
  }
}

module.exports = UserService;
