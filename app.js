// app.js

const express = require('express');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const path = require('path');
const session = require('express-session');
const nunjucks = require('nunjucks');
const dotenv = require('dotenv');
const passport = require('passport');
const cors = require('cors');

dotenv.config();

const pageRouter = require('./routes/page');
const authRouter = require('./routes/auth');
const postRouter = require('./routes/post');
const userRouter = require('./routes/user');
const voteRouter = require('./routes/vote');
const commentRouter = require('./routes/comment');

const resumeRouter = require('./routes/resume'); // API
const coverLetterRouter = require('./routes/coverLetter');
const portfolioRouter = require('./routes/portfolio');
const activityRouter = require('./routes/activity');
const resumePageRouter = require('./routes/resumePage'); // VIEW 페이지 렌더링 라우터
const coverletterPageRouter = require('./routes/coverletterPage');

const passportConfig = require('./passport');

const app = express();
passportConfig();

app.set('port', process.env.PORT || 8001);
app.set('view engine', 'html');
nunjucks.configure('views', {
    express: app,
    watch: true,
});

app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/img', express.static(path.join(__dirname, 'uploads')));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(session({
    resave: false,
    saveUninitialized: false,
    secret: process.env.COOKIE_SECRET || 'cookiesecret',
    cookie: { httpOnly: true, secure: false },
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(cors());

app.use((req, res, next) => {
    res.locals.user = req.user;
    next();
});

// ----------------------------
// API 라우터
// ----------------------------
app.use('/auth', authRouter);
app.use('/post', postRouter);
app.use('/user', userRouter);
app.use('/vote', voteRouter);
app.use('/comment', commentRouter);
app.use('/api/resumes', resumeRouter);
app.use('/api/coverletters', coverLetterRouter);
app.use('/portfolio', portfolioRouter);
app.use('/api/data', activityRouter);



// ----------------------------
// 페이지 라우터 (순서 매우 중요)
// ----------------------------

// 1) resume 페이지 라우터 먼저!!
app.use('/resume', resumePageRouter);
app.use('/coverletter', coverletterPageRouter);
app.use('/', pageRouter);


// ----------------------------
// 404 처리
// ----------------------------
app.use((req, res, next) => {
    const error = new Error(`${req.method} ${req.url} 라우터가 없습니다.`);
    error.status = 404;
    next(error);
});


// ----------------------------
// 에러 핸들러
// ----------------------------
app.use((err, req, res, next) => {
    res.locals.message = err.message;
    res.locals.error = process.env.NODE_ENV !== 'production' ? err : {};
    res.status(err.status || 500);
    res.render('error');
});


// ----------------------------
//   서버 실행
// ----------------------------
app.listen(app.get('port'), () => {
    console.log(app.get('port'), '번 포트에서 대기중');
});
