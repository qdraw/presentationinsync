var express   =   require( 'express' );
var ejs    =   require( 'ejs' );
const app = express()

const fs = require('fs');
const path = require('path');

app.set('view engine', 'ejs');

app.use( "/images", express.static( __dirname + '/images' ) );

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

var currentItem = 0;

app.get('/status', function (req, res) {
	res.json(imagelist[currentItem]);
})

app.get('/next', function (req, res) {
	currentItem++

	if (currentItem >= imagelist.length ) {
		currentItem = 0
	}
	res.json(imagelist[currentItem]);
})


app.get('/prev', function (req, res) {
	currentItem--

	if (currentItem <= -1 ) {
		currentItem = imagelist.length-1
	}
	res.json(imagelist[currentItem]);
})

app.get('/', function (req, res) {
	res.render('index.ejs');
})

app.get('/master.html', function (req, res) {
	res.render('master.ejs');
})




app.listen(3089, function () {
  console.log('Example app listening on port http://localhost:3089')
})
