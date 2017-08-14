
var path = require('path');
var fs = require('fs');
var slug = require('slug')

require('dotenv').config({path: path.join(__dirname,"..",".env")});
const request = require('request');


const dch = require('./vendor/dropbox-content-hasher.js');


module.exports = {
	syncFolder
}

function syncFolder(folderpath) {
	if (process.env.DROPBOX_ACCESSTOKEN === undefined || process.env.DROPBOX_FOLDER === undefined) {
		console.log("process.env.DROPBOX_ACCESSTOKEN === undefined OR DROPBOX_FOLDER");
	}
	if (process.env.DROPBOX_ACCESSTOKEN !== undefined && folderpath !== undefined) {

		global.contentHashCounter = 0;
		global.contentIsReady = false;

		var formquery = '{"path":"' + folderpath +'"}';
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
				} catch (e) {
					if (DEBUG) console.log("Error List folder");
				}

				if (response !== undefined) {
					if (response.error_summary === undefined) {
							for (var i = 0; i < response.entries.length; i++) {
								if (response.entries[i][".tag"] === "folder") {
									syncFolder(response.entries[i].path_lower)
								}

								if (/.jpg$/ig.test(response.entries[i].path_lower)) {
									// global.content_hash_list.push(response.entries[i].content_hash + ".jpg");
									// global.path_lower_list.push(response.entries[i].path_lower);
									// console.log(response.entries[i].path_lower);
									pathLowerToCheckDir(response.entries[i].path_lower,response.entries[i].content_hash)
								}
							}

					}
					// if (response.error_summary !== undefined) {
					// 	global.content_hash_list.push("default.png")
					// 	console.log("Error loading dropbox >>" + response.error_summary);
					// }
				}



		});
	}
}
function pathLowerToCheckDir(dropbox_path_lower,dropbox_content_hash) {

	if (process.env.DROPBOX_FOLDER.substr(process.env.DROPBOX_FOLDER.length-1, process.env.DROPBOX_FOLDER.length) !== "/") {
		console.log("please add tailing slash after process.env.DROPBOX_FOLDER");
	}

	if (process.env.DROPBOX_FOLDER.substr(process.env.DROPBOX_FOLDER.length-1, process.env.DROPBOX_FOLDER.length) === "/") {
		DROPBOX_FOLDER_NOSLASH = process.env.DROPBOX_FOLDER.substr(0, process.env.DROPBOX_FOLDER.length-1);
		relativeFilePath = dropbox_path_lower.replace(DROPBOX_FOLDER_NOSLASH,"");

		pushContentVar(relativeFilePath);

		absoluteFilePath = path.join(__dirname,"..", "images",relativeFilePath);

		checkDirectory(path.dirname(absoluteFilePath), checkIfFileExist, absoluteFilePath,dropbox_content_hash,dropbox_path_lower)
	}
}

function slugify(inputpath) {
	var thisDir = inputpath.split(path.sep)[inputpath.split(path.sep).length-1];
	if (thisDir !== "images") {
		absoluteFilePath = inputpath.replace(thisDir,slug(thisDir,{lower: true}))
		console.log(inputpath);
	}
	return inputpath;
}

function pushContentVar(relativeFilePath) {

	DROPBOX_FOLDER_CONTENTVAR = path.dirname(relativeFilePath);

	DROPBOX_FOLDER_CONTENTVAR = DROPBOX_FOLDER_CONTENTVAR.substr(1, DROPBOX_FOLDER_CONTENTVAR.length);
	if (DROPBOX_FOLDER_CONTENTVAR === "") {
		DROPBOX_FOLDER_CONTENTVAR = "root"
	}
	if (global.content[DROPBOX_FOLDER_CONTENTVAR] === undefined) {
		global.content[DROPBOX_FOLDER_CONTENTVAR] = [];
	}
	global.content[DROPBOX_FOLDER_CONTENTVAR].push(relativeFilePath)
}

function checkIfFileExist(err,absoluteFilePath,dropbox_content_hash,dropbox_path_lower) {
		fs.access(absoluteFilePath, fs.constants.R_OK | fs.constants.W_OK, (err) => {
			if (err) {
				// console.log("no");
				downloadFile(dropbox_path_lower,absoluteFilePath,dropbox_content_hash)
			}
			if (!err) {
				dropboxContentHasher(dropbox_path_lower,absoluteFilePath,dropbox_content_hash)
			}
			console.log(err ? 'no access!' + dropbox_path_lower : 'can read/write ' + dropbox_path_lower);
		});
}

function checkDirectory(directory, callback, absoluteFilePath,dropbox_content_hash,dropbox_path_lower) {

	fs.stat(directory, function(err, stats) {
		//Check if error defined and the error code is "not exists"
		if (err && err.code === "ENOENT") {
			//Create the directory, call the callback.
			fs.mkdir(directory, function () {
				checkIfFileExist(err,absoluteFilePath,dropbox_content_hash,dropbox_path_lower)
			});
		}
		if (err === null) {
			//just in case there was a different error:
			callback(err,absoluteFilePath,dropbox_content_hash,dropbox_path_lower)
		}
	});
}

function downloadFile(inputPath,outputPath,content_hash) {
	if (DEBUG) console.log(outputPath);

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
			global.contentHashCounter++;
			if (ObjectLength(global.content) === global.contentHashCounter) {
				console.log("ready>>>>>>>>>>>");
				global.contentIsReady = true;
			}
		}
		if (content_hash !== hexDigest) {

			fs.unlink(filePath, (err) => {
				if (err) throw err;
				downloadFile(path_lower,filePath,content_hash);
			});
		}
	});
	f.on('error', function(err) {
		console.error("Error reading from file: " + err);
	});
}

function ObjectLength( object ) {
    var length = 0;
    for( var key in object ) {
		length += Object.keys(key).length
    }
    return length;
};
