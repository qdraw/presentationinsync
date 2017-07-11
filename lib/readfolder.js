var imagelist = [];

function readItemsFolder(folderpath) {
	fs.readdirSync(folderpath).forEach(function (name) {
		var filePath = path.join(folderpath, name);
		var stat = fs.statSync(filePath);
		if (stat.isFile()) {

			if (filePath.match(/[\s\S]*.(JPG)|(jpeg)|(JPEG)$/)) {
				fs.renameSync(filePath, filePath.replace(/(jpeg)|(jpg)/i,"jpg"))
				filePath = filePath.replace(/(jpeg)|(jpg)/i,"jpg");
			}

			if (filePath.match(/[\s\S]*.jpg$/) && !filePath.match(/__fi*.jpg$/) ) {
				imagelist.push("images/" + name);
			}
		}
	});
	console.log(imagelist);
	if (imagelist.length === 0) {
		imagelist.push("https://media.qdraw.nl/Bezienswaardigheden/nu_inzetten_op_de_service_by_speech_revolutie/1000/20170323_094652_kl1k.jpg");
	}
}

readItemsFolder( __dirname + '/images')
