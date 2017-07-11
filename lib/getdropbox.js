
var path = require('path');
var fs = require('fs');

require('dotenv').config({path: path.join(__dirname,"..",".env")});
const request = require('request');

global.content_hash_list = [];
global.path_lower_list = [];

global.content_hash_list_counter = 0;

const dch = require('./vendor/dropbox-content-hasher.js');


module.exports = {
	syncFolder
}


function syncFolder() {
	if (process.env.DROPBOX_ACCESSTOKEN === undefined) {
		console.log("process.env.DROPBOX_ACCESSTOKEN === undefined");
	}
	if (process.env.DROPBOX_ACCESSTOKEN !== undefined) {
		var dropboxfolder = "/Camera uploads/";


		var formquery = '{"path":"' + dropboxfolder +'"}';
		var contentLength = formquery.lenght;

		request({
			headers: {
				'Authorization': 'Bearer ' + process.env.DROPBOX_ACCESSTOKEN,
				'Content-Length': contentLength,
				'Content-Type': 'application/json'
			},
			uri: 'https://api.dropboxapi.com/2/files/list_folder',
			body: formquery,
			method: 'POST'
			}, function (err, res, body) {
				try {
					var response = JSON.parse(body);
				} catch (e) {}
				if (response !== undefined) {
					for (var i = 0; i < response.entries.length; i++) {
						if (/.jpg$/ig.test(response.entries[i].path_lower)) {
							global.content_hash_list.push(response.entries[i].content_hash + ".jpg");
							global.path_lower_list.push(response.entries[i].path_lower);
							checkIfFileExist(response.entries[i].content_hash + ".jpg",response.entries[i].path_lower)
						}
					}
				}


		});
	}
}

function checkIfFileExist(content_hash,path_lower) {

	fs.access(path.join(__dirname,"..", "images",content_hash), fs.constants.R_OK | fs.constants.W_OK, (err) => {
		if (err) {
			// console.log("no");
			downloadFile(path_lower,path.join(__dirname,"..", "images",content_hash),content_hash)
		}
		if (!err) {
			dropboxContentHasher(path_lower,path.join(__dirname,"..", "images",content_hash),content_hash)
		}
		// console.log(err ? 'no access!' : 'can read/write');
	});
}

function dropboxContentHasher(path_lower,filePath,content_hash) {
	var content_hash_filename = content_hash;
	// console.log(content_hash);
	var content_hash = content_hash.split(".")
	content_hash = content_hash[0]
	// console.log(content_hash);

	const hasher = dch.create();
	const f = fs.createReadStream(filePath);
	f.on('data', function(buf) {
		hasher.update(buf);
	});
	f.on('end', function(err) {
		const hexDigest = hasher.digest('hex');
		if (content_hash === hexDigest) {
			// console.log("file== same");
			global.content_hash_list_counter++;
			if (global.content_hash_list_counter === global.content_hash_list.length) {
				console.log("all ready");
				console.log(global.path_lower_list);
			}
		}
		if (content_hash !== hexDigest) {

			fs.unlink(path.join(__dirname,"..", "images",content_hash_filename), (err) => {
				if (err) throw err;
				downloadFile(path_lower,path.join(__dirname,"..", "images",content_hash_filename),content_hash);
			});
		}
	});
	f.on('error', function(err) {
		console.error("Error reading from file: " + err);
	});
}

function downloadFile(inputPath,outputPath,content_hash) {
	console.log(outputPath);

	var formquery = "";
	var contentLength = formquery.lenght;

	request({
		headers: {
			'Authorization': 'Bearer ' + process.env.DROPBOX_ACCESSTOKEN,
			'Content-Length': contentLength,
			'Dropbox-API-Arg': '{"path":"' + inputPath + '"}'
		},
		uri: 'https://content.dropboxapi.com/2/files/download',
		body: formquery,
		method: 'POST',
		encoding: 'binary'
	}, function (err, res,body) {

			fs.writeFile(outputPath, body, 'binary', function(err){

				// Error handeling
				if (err) throw err;
				dropboxContentHasher(inputPath,outputPath,content_hash);

			})
	});
}
