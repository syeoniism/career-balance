const express = require("express");
const router = express.Router();

function requireLogin(req, res, next) {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "로그인이 필요합니다." });
    }
    next();
}


module.exports = router;
