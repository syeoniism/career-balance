// middlewares/index.js

exports.isLoggedIn = (req, res, next) => {
    if (req.isAuthenticated()) {
        next();
    } else {
        res.status(403).send('로그인 필요');
    }
};

exports.isNotLoggedIn = (req, res, next) => {
    if (!req.isAuthenticated()) {
        next();
    } else {
        const message = encodeURIComponent('로그인한 상태입니다.');
        res.redirect(`/?error=${message}`);
    }
}

// 캐시 방지 미들웨어
exports.preventCache = (req, res, next) => {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate'); // HTTP 1.1
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    next();
};