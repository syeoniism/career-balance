// passport/index.js

const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const User = require('../models/userModel');

module.exports = () => {
    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

    passport.deserializeUser(async (id, done) => {
        try {
            const user = await User.findById(id);
            if (!user) return done(null, false);
            return done(null, user);
        } catch (err) {
            console.error(err);
            return done(err);
        }
    });

    passport.use(
        new LocalStrategy(
            {
                usernameField: 'email',
                passwordField: 'password',
            },
            async (email, password, done) => {
                try {
                    const user = await User.findByEmail(email);
                    if (!user) {
                        return done(null, false, { message: '존재하지 않는 이메일입니다.' });
                    }

                    const result = await bcrypt.compare(password, user.password);
                    if (!result) {
                        return done(null, false, { message: '비밀번호가 일치하지 않습니다.' });
                    }

                    return done(null, {
                        id: user.id,
                        email: user.email,
                        nickname: user.nickname,
                    });
                } catch (err) {
                    console.error(err);
                    return done(err);
                }
            }
        )
    );
};