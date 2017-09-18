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

// /* CONFIG JSON FILES FOR SLIDESHOWS DEFAULT OPTION*/
// app.get('/images/:id/config.json', function(req, res) {
// 	return res.json({
// 		"slideshow": false
// 	})
// });
//
// app.get('/images/config.json', function(req, res) {
// 	return res.json({
// 		"slideshow": false
// 	})
// });
//
// app.get('/:id/slideshow', function(req, res) {
// 	var id = req.params.id;
//
// 	if (global.currentItem[id] === undefined) {
// 		global.currentItem[id] = 0;
// 	}
//
// 	if (global.content[id] === undefined) {
// 		return res.json({})
// 	}
// 	if (global.content[id] !== undefined) {
// 		return res.json({"image": global.content[id][global.currentItem[id]]})
// 	}
// });
//

//
// function updateSlideshow() {
// 	var allProjects = [];
// 	Object.keys(global.content).forEach(function(key) {
// 		allProjects.push(key);
// 	});
//
// 	if (allProjects.length >= 0) {
// 		var item = 0
// 		nextConfigItem()
// 		function nextConfigItem() {
// 			configFile = path.join(__dirname, "images" , allProjects[item] ,"config.json")
// 			item++
// 			if (item <= allProjects.length-1) {
// 				readConfigFromDisk(configFile,item,nextConfigItem)
// 			}
// 			if (item === allProjects.length) {
// 				readConfigFromDisk(configFile,item,function () {
// 				})
// 			}
//
// 		}
// 	}
// }
//
//
// function readConfigFromDisk(configFile,item,callback) {
// 	fs.access(configFile, fs.constants.R_OK | fs.constants.W_OK, (err) => {
// 		if (err === null) {
// 			try {
// 				jsonfile.readFile(configFile, function(err, data) {
// 					if (data.slideshow !== undefined) {
// 						if (isNaN(data.slideshow) === false) {
// 							console.log(configFile,item);
// 							var updateSlideshowItem = setInterval(function(){
// 								console.log(configFile);
// 								// global.currentItem[data.id]++
// 								//
// 								// if (global.currentItem[data.id] >= global.content[data.id].length ) {
// 								// 	global.currentItem[data.id] = 0
// 								// }
// 								// socket.emit('status', { id: data.id, image: "images/" + global.content[data.id][global.currentItem[data.id]] });
// 								// socket.broadcast.emit('status', { id: data.id, image: "images/" + global.content[data.id][global.currentItem[data.id]] });
//
// 							}, data.slideshow);
// 							callback(configFile,item)
// 							// // console.log(global.content);
// 							// console.log(this.configFile);
// 							// if (global.currentItem[allProjects[i]] === undefined) {
// 							// 	global.currentItem[allProjects[i]] = 0;
// 							// }
// 							//
// 							// if (global.content[allProjects[i]] !== undefined) {
// 							// 	io.sockets.emit('status', {"id":data.id, "image": global.content[allProjects[i]] })
// 							//
// 							// 	console.log(data.slideshow);
// 							// }
// 						}
// 					}
// 				})
// 			} catch (e) {}
// 		}
// 		if (err !== null) {
// 			callback(configFile,item)
// 		}
// 	});
// }


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

// var updateSlideshowContent = setInterval(function(){
// 	if (allClients.length >= 1) {
// 		updateSlideshow()
// 	}
// }, 20000);
//
// setTimeout(function(){
// 	updateSlideshow()
// }, 2000);



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
