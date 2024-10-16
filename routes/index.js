const router = require("express").Router();

router.use("/api/v1", require("./api/index"));

module.exports = router;