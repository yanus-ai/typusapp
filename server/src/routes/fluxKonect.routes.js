const express = require("express");
const router = express.Router();
const { authenticateJwt } = require("../middleware/auth.middleware");
const {runFluxKonect} = require("../controllers/flux.controller");


router.post(
  "/run",
  runFluxKonect
);

module.exports = router;
