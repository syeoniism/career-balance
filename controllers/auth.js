// controllers/auth.js

const passport = require('passport');
const User = require('../models/userModel');

// 회원가입 처리
exports.join = async (req, res, next) => {
    try {
        const { email, nick, password } = req.body;
        const nickname = nick;

        if (!email || !password || !nickname) {
            return res.render('join', { joinError: '모든 값을 입력해주세요.', oldInput: req.body });
        }

        const existing = await User.findByEmail(email);
        if (existing) {
            return res.render('join', {
                joinError: '이미 존재하는 이메일입니다.',
                oldInput: req.body
            });
        }

        await User.create({ email, password, nickname });
        return res.redirect('/');
    } catch (err) {
        console.error(err);
        return next(err);
    }
};

// 로그인 처리 (Custom Callback)
exports.login = (req, res, next) => {
    passport.authenticate('local', (authError, user, info) => {
        if (authError) {
            console.error(authError);
            return next(authError);
        }

        // 로그인 실패 시 (비밀번호 틀림 등)
        if (!user) {
            return res.render('main', {
                loginError: info.message || '로그인 실패'
            });
        }

        // 로그인 성공 시
        return req.login(user, (loginError) => {
            if (loginError) {
                console.error(loginError);
                return next(loginError);
            }
            return res.redirect('/home');
        });
    })(req, res, next);
};

exports.logout = (req, res, next) => {
    req.logout((err) => {
        if (err) { return next(err); }
        req.session.destroy(() => {
            res.redirect('/');
        });
    });
};