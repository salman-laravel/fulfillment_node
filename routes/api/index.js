const router = require("express").Router();
const FulFillmentController = require('../../controllers/FulFillmentController');
const AuthController = require('../../controllers/AuthController');


router.post("/order/:id/create-fulfillment", FulFillmentController.create);
router.post('/login', AuthController.login);

module.exports = router;
