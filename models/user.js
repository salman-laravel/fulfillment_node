"use strict";
const { Model, DataTypes, Sequelize } = require("sequelize");
const sequelize = new Sequelize("iherb", "root", "", {
  host: "localhost",
  dialect: "mysql",
});
// Valid
class User extends Model {
  otherPublicField;
}

User.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    firstName: {
      type: DataTypes.STRING,
    },
    lastName: {
      type: DataTypes.STRING,
    },
    email: {
      type: DataTypes.STRING,
    },
    phone: {
      type: DataTypes.STRING,
    },
    password: {
      type: DataTypes.STRING,
    },
    social_id: {
      type: DataTypes.STRING,
    },
    social_platform: {
      type: DataTypes.STRING,
    },
    last_login_date: {
      type: DataTypes.STRING,
    },
  },
  { sequelize },
);

module.exports = User;
