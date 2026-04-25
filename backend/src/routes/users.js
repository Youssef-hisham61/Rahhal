const express = require("express");
const router = express.Router();
const { getOnline } = require("../controllers/users");
const { authenticate } = require("../middleware/auth");
const { adminOrAbove } = require("../middleware/roles");

router.get("/online", authenticate, adminOrAbove, getOnline);

module.exports = router;
