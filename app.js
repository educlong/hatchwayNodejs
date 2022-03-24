var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
//define the routes for this assignment
var hatchwayPost = require('./routes/field')
var hatchwayTest = require('./routes/test')

var session = require("express-session")
var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

//configuration for session to store a list of the authors in fields
app.use(session({
  secret: "hatchway-paul",
  resave: false,
  saveUninitialized: true
}))

app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/api',hatchwayPost)  //using the define the routes for this assignment above
app.use('/api/test',hatchwayTest)  //using the define the routes for this assignment above

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
x
  // render the error page
  res.status(err.status || 500);
  res.render('error');
});


// app.locals.fakeDataPortfolioDemo2 = require("https://api.hatchways.io/assessment/blog/posts?tag=tech");

module.exports = app;
