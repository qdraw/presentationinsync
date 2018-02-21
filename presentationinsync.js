// Setup basic express server
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var path = require('path');
const fs = require('fs');
const jsonfile = require('jsonfile');
require('dotenv').config({path: path.join(__dirname,".env")});
var port = process.env.PORT || process.env.port || 3000;
var DEBUG = process.env.DEBUG || false;

server.listen(port, function () {
	console.log('Server listening at port http://localhost:%d', port);
});


app.use( "/images", express.static( __dirname + '/images' ) );
app.use( "/js", express.static( __dirname + '/js' ) );
app.use( "/media", express.static( __dirname + '/media' ) );
app.use( "/presentationinsync/media", express.static( __dirname + '/media' ) );

global.content = {};
global.contentHashCounter = 0;
global.contentIsReady = false;

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
		res.render('index');
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
		if (global.contentIsReady === false) {
			res.status(500);
			return res.render('reload');
		}
		if (global.contentIsReady === true) {
			res.status(404);
			return res.render('notfound');
		}
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
		if (global.contentIsReady === false) {
			res.status(500);
			return res.render('reload');
		}
		if (global.contentIsReady === true) {
			res.status(404);
			return res.render('notfound');
		}
	}

});

// app.get('/control', function (req, res) {
// 	res.render('control.ejs');
// })


global.currentItem = {};
global.allClients = [];


io.on('connection', function (socket) {

	global.allClients.push(socket);

	socket.on('disconnect', function() {
		if (DEBUG) console.log('Got disconnect!');

		var i = allClients.indexOf(socket);
		global.allClients.splice(i, 1);
	});

	socket.on('status', function (data) {

		if (global.currentItem[data.id] === undefined) {
			global.currentItem[data.id] = 0;
		}

		if (data.status !== undefined) {
			if (data.status >= 400) {
				getdropbox.syncFolder(process.env.DROPBOX_FOLDER);
			}
		}

		if (JSON.stringify(global.content) !== "{}") {

			if (global.content[data.id] !== undefined) {
				socket.emit('status', { id: data.id, image: "images" + global.content[data.id][global.currentItem[data.id]] });
			}
		}

	});

	socket.on('next', function (data) {
		if (JSON.stringify(global.content) !== "{}" && global.content[data.id] !== undefined) {
			global.currentItem[data.id]++

			if (global.currentItem[data.id] >= global.content[data.id].length ) {
				global.currentItem[data.id] = 0
			}
			socket.emit('status', { id: data.id, image: "images/" + global.content[data.id][global.currentItem[data.id]] });
			socket.broadcast.emit('status', { id: data.id, image: "images/" + global.content[data.id][global.currentItem[data.id]] });
		}
	});

	socket.on('prev', function (data) {
		if (JSON.stringify(global.content) !== "{}" && global.content[data.id] !== undefined) {
			global.currentItem[data.id]--

			if (global.currentItem[data.id] <= -1 ) {
				global.currentItem[data.id] = global.content[data.id].length-1
			}
			if (global.content[data.id][global.currentItem[data.id]] !== undefined) {
				socket.emit('status', { id: data.id, image: "images/" + global.content[data.id][global.currentItem[data.id]] });
				socket.broadcast.emit('status', { id: data.id, image: "images/" + global.content[data.id][global.currentItem[data.id]] });
			}
		}
	});

});

var updateDropboxContent = setInterval(function(){
	if (allClients.length >= 1) {
		global.content = {}
		getdropbox.syncFolder(process.env.DROPBOX_FOLDER);
	}
}, 30000);
