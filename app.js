/*
  Entry point for mongopop express app.
*/
var express=require('express');
var path=require('path');
var favicon=require('serve-favicon');
var logger=require('morgan');
var bodyParser=require('body-parser');
var app=express();

//Routes
var pop=require('./routes/pop');

// Make generated html easier to read
app.locals.pretty=true;

//View engines
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// Indicate the middleware that express should use
app.use(favicon(path.join(__dirname,'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

// static
app.use(express.static(path.join(__dirname, 'public')));
// APi
app.use('/pop', pop);

// For other routes, set status to 404 and forward to error handler
app.use(function(req,res,next){
  var err=new Error("Not found");
  err.status=404;
  next(err);
});

// Error handlers
if(app.get('env')==='development'){
  app.use(function(err,req,res,next){
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

//Production error handler
app.use(function(err,req,res,next){
  res.status(err.status || 500);
  res.render('error',{
    message: err.message,
    error: {}
  });
});

module.exports=app;
