// Setup basic express server
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 3000;

server.listen(port, function () {
	console.log('Server listening at port http://localhost:%d', port);
});


app.use( "/images", express.static( __dirname + '/images' ) );

global.imagelist = ["https://media.qdraw.nl/Bezienswaardigheden/nu_inzetten_op_de_service_by_speech_revolutie/1000/20170323_094652_kl1k.jpg","https://media.qdraw.nl/log/deventer-op-stelten-2017/1000/20170707_212524__DSC09410_e_kl1k.jpg"]


// Routing
// app.use(express.static(__dirname + '/views'));
app.set('view engine', 'ejs');


app.get('/', function (req, res) {
	res.render('index.ejs');
})

app.get('/control', function (req, res) {
	res.render('control.ejs');
})


var currentItem = 0;
var allClients = [];

io.on('connection', function (socket) {
	socket.emit('status', { image: global.imagelist[currentItem] });

	allClients.push(socket);
	socket.on('disconnect', function() {
		console.log('Got disconnect!');

		var i = allClients.indexOf(socket);
		allClients.splice(i, 1);
   });


	socket.on('next', function (data) {
		io.clients((error, clients) => {
			if (error) throw error;
			console.log(clients); // => [6em3d4TJP8Et9EMNAAAA, G5p55dHhGgUnLUctAAAB]
		});

		console.log("next");
		currentItem++

		if (currentItem >= imagelist.length ) {
			currentItem = 0
		}
		socket.emit('status', { image: global.imagelist[currentItem] });
		socket.broadcast.emit('status', { image: global.imagelist[currentItem] });
	});

	socket.on('prev', function (data) {
		console.log("prev");

		currentItem--

		if (currentItem <= -1 ) {
			currentItem = imagelist.length-1
		}
		socket.emit('status', { image: global.imagelist[currentItem] });
		socket.broadcast.emit('status', { image: global.imagelist[currentItem] });
	});

});



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
