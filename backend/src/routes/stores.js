const express = require("express");
const router = express.Router();
const { publicStores } = require("../controllers/stores");

router.get("/public", publicStores);

module.exports = router;
