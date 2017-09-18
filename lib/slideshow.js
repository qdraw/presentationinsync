const fs = require('fs');
var path = require('path');
const jsonfile = require('jsonfile');

module.exports = {
	slideshow
}

function slideshow(socket) {

	socket.on('status', function (data) {
		dataid = data.id

		configFile = path.join(path.dirname(__dirname), "images" , dataid ,"config.json")
		fs.access(configFile, fs.constants.R_OK | fs.constants.W_OK, (err) => {
			if (err === null) {
				try {
					jsonfile.readFile(configFile, function(err, data) {
						if (data.slideshow !== undefined) {
							if (isNaN(data.slideshow) === false) {
								if (data.slideshow < 3000) {
									data.slideshow = 3000
								}
								setTimeout(function(){
									if (JSON.stringify(global.content) !== "{}" && global.content[dataid] !== undefined) {
										global.currentItem[dataid]++
										console.log(global.currentItem[dataid]);

										if (currentItem[dataid] >= global.content[dataid].length ) {
											currentItem[dataid] = 0
										}

										socket.emit('status', { id: dataid, image: "images/" + global.content[dataid][currentItem[dataid]] });
										socket.broadcast.emit('status', { id: dataid, image: "images/" + global.content[dataid][currentItem[dataid]] });
									}

								}, data.slideshow);
							}
						}
					})
				} catch (e) {}
			}
			if (err !== null) {
				console.log(err);
			}
		});

	});

}
