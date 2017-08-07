// Setup basic express server
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var path = require('path');
require('dotenv').config({path: path.join(__dirname,".env")});
var port = process.env.PORT || process.env.port || 3000;

server.listen(port, function () {
	console.log('Server listening at port http://localhost:%d', port);
});


app.use( "/images", express.static( __dirname + '/images' ) );
app.use( "/media", express.static( __dirname + '/media' ) );
app.use( "/presentationinsync/media", express.static( __dirname + '/media' ) );

global.content = {};


var getdropbox = require('./lib/getdropbox.js');
getdropbox.syncFolder(process.env.DROPBOX_FOLDER);


// Routing
// app.use(express.static(__dirname + '/views'));

app.set('view engine', 'ejs');


app.get('/', function (req, res) {
	if (global.content["root"] !== undefined) {
		res.render('viewer', {id: "root"});
	}
	if (global.content["root"] === undefined) {
		res.render('index.ejs');
	}
})

app.get('/:id', function(req, res) {
	var id = req.params.id;

	var allProjects = [];
	Object.keys(global.content).forEach(function(key) {
	    allProjects.push(key);
	});

	if (allProjects.indexOf(id) >= 0) {
		return res.render('viewer', {id: id});
	}
	if (allProjects.indexOf(id) === -1 && id !== "control") {
		return res.render('index');
	}
	if ( id === "control") {
		return res.render('control', {id: "root"});
	}
});

app.get('/:id/control', function(req, res) {
	var id = req.params.id;

	var allProjects = [];
	Object.keys(global.content).forEach(function(key) {
	    allProjects.push(key);
	});

	if (allProjects.indexOf(id) >= 0) {
		return res.render('control', {id: id});
	}
	if (allProjects.indexOf(id) === -1) {
		return res.render('index');
	}

});

// app.get('/control', function (req, res) {
// 	res.render('control.ejs');
// })


var currentItem = {};
var allClients = [];

io.on('connection', function (socket) {

	allClients.push(socket);

	socket.on('disconnect', function() {
		console.log('Got disconnect!');

		var i = allClients.indexOf(socket);
		allClients.splice(i, 1);
	});

	socket.on('status', function (data) {
		console.log(data.id);

		if (currentItem[data.id] === undefined) {
			currentItem[data.id] = 0;
		}

		console.log(currentItem[data.id]);
		console.log(global.content[data.id].length);

		if (global.content[data.id] !== undefined) {
			socket.emit('status', { image: "images" + global.content[data.id][currentItem[data.id]] });
		}
	});


	socket.on('next', function (data) {

		currentItem[data.id]++

		console.log(global.content[data.id]);
		console.log(global.content[data.id].length);

		if (currentItem[data.id] >= global.content[data.id].length ) {
			currentItem[data.id] = 0
		}
		socket.emit('status', { image: "images/" + global.content[data.id][currentItem[data.id]] });
		socket.broadcast.emit('status', { image: "images/" + global.content[data.id][currentItem[data.id]] });
	});

	socket.on('prev', function (data) {
		// console.log("prev");

		currentItem[data.id]--

		if (currentItem[data.id] <= -1 ) {
			currentItem[data.id] = global.content[data.id].length-1
		}
		if (global.content[data.id][currentItem[data.id]] !== undefined) {
			socket.emit('status', { image: "images/" + global.content[data.id][currentItem[data.id]] });
			socket.broadcast.emit('status', { image: "images/" + global.content[data.id][currentItem[data.id]] });
		}
	});

});

var updateDropboxContent = setInterval(function(){
	if (allClients.length >= 1) {
		global.content = {}
		getdropbox.syncFolder(process.env.DROPBOX_FOLDER);
	}
}, 20000);


// io.on('connection', function (socket) {
//
// 	// when the client emits 'new message', this listens and executes
// 	socket.on('message', function (data) {
// 		// we tell the client to execute 'new message'
// 		socket.broadcast.emit('message', {
// 			username: socket.username,
// 			message: data
// 		});
// 	});
//
// });
