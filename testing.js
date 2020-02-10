const simpleGit = require('simple-git');
var fs = require('fs');
var child_process = require("child_process").exec;
var Mocha = require('mocha');
var request = require('request');
var exec = require('child_process').exec;

var config = require('./config/config.json');
var token = require(config.tokenPath);
var displayIdle = require('./displayIdle');
var oled = new (require('./OLED')).oled(0x3C);

var accessToken = token.accessToken;

// Post results to ServiceNow

function postTestResultsCallback(error, response, body) {
	if(error) {
		console.log("Posting Test Results to ServiceNow failed : " + error);
		return;
	}
	console.log("Posted back Test Results successfully to ServiceNow");
}

function postTestResults(owner, repo, branch, testResults, scan_id){
	console.log("Posting back Test Results to ServiceNow ...");
	var finalResultObj = {
		branch : branch,
		scanid : scan_id,
		finalResult : testResults
	};
	
	var postTestResultsURL = config.url + "/api/x_snc_devops_iot/get_test_results_from_the_iot_device/capture";
	var options = {
		url: postTestResultsURL,
		method: 'POST',
		headers: {
			"Accept":"application/json",
			"Content-Type":"application/json",
			"Authorization": ("Bearer " + accessToken)
		},
		json: true,
		body: finalResultObj
	};
	request(options,postTestResultsCallback);
}

// Deleting the downloading Repository
function deleteRepository(projDirPath){
	console.log("Removing the repo after testing ... ");
	exec('rm -Rf ' + projDirPath, function (error, stdout, stderr){
		if (error) {
			console.log('Failed to remove Repository after testing : ' + error);
			return;
		}
		console.log('Removed repository successfully after testing.');	
	});
}

// Testing the Code using Mocha
function testAndSend(projDir, projDirPath, owner, repo, branch, scan_id){
	
	// object to store results
	var testResults = {}; 
	var length = (process.cwd()+'/'+projDir).length + 1;
	console.log("Running mocha to test Testcases ...");
	var mocha = new Mocha({
		reporter: 'json'
	});
	var testDir = projDir +'/test';
	console.log("List of test files to be tested");
	fs.readdirSync(testDir).filter(function (file){
		console.log(file);
	    	return file.substr(-3) === '.js';
	}).forEach(function (file){
		mocha.addFile(testDir + '/' + file);
		testResults['test/' + file] = {
				passed : 0,
				failed : 0,
				pending : 0,
				tests : []
		}; 
	});
	
	console.log("Test Results - ");
	// filename should be truncated as test.file contains path of the file wrt local machine 
	mocha.run().on('test end', function (test){
		
		// Adding the result of the testing to the object testResults at the end of each file
		var filename = (test.file).substring(length, test.file.length);
		testResults[filename].tests.push(test);
		testResults[filename][test.state] += 1;
		
	}).on('end', function (){
		console.log("Testing Completed Successfully.");
		postTestResults(owner, repo, branch, testResults, scan_id);
		deleteRepository(projDirPath);
		oled.init();
		oled.writeString(24, 24, 1, "Test Completed", 1);
		oled.writeString(56, 48, 1, "100%", 1);
		setTimeout(function (){
			displayIdle.setIdle(true);
		}, 3000);
	});
}

// Deploy the program for testing
function testAnalysisUtil(projDir, projDirPath, owner, repo, branch, scan_id){
	console.log("Installing Dependencies ...");
	var npmCommand = 'npm install --prefix ' + projDir + ' --unsafe-perm';
	child_process(npmCommand, function (error, stdout, stderr){
		if (error !== null) {
			console.log('Error while installing dependencies - ' + error);
			return;
		};
		console.log('Dependencies Installed.');
		oled.writeString(56, 48, 1, "60%", 1);
		testAndSend(projDir, projDirPath, owner, repo, branch, scan_id);
	});
}

function testAnalysis(user, owner, repo, branch, scan_id) {
	oled.writeString(56, 48, 1, "0%", 1);
	var projDirPath = 'git/' + scan_id;
	var projDir = 'git/' + scan_id + '/' + repo;
	var projUrl = 'https://' + config.gituser + ':' + config.gitpass + '@github.com/'+owner+'/'+repo;
	fs.mkdir(projDirPath, { recursive: true }, function (){
		console.log("Cloning repo for testing ...");
		simpleGit().cwd(projDirPath).clone(projUrl, ["--branch", branch], function (){
			oled.writeString(56, 48, 1, "20%", 1);
			console.log("Cloned repository successfully for testing.");
			testAnalysisUtil(projDir, projDirPath, owner, repo, branch, scan_id);
		});
	});
}

module.exports.testAnalysis = testAnalysis;
