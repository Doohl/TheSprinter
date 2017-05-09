const Discord = require('discord.js');
const client = new Discord.Client();

/* Sprint objects currently running */
var activeSprints = [];

/* Current sprint ID */
var currentSprintID = 0;

/* List of sprinters and their highest WPMs */
var sprinterWPM = {};
var sprinterWords = {};

/* Total words written in all sprints */
var sprintWordcount = 0;

/* List of authors and their daily goals */
var dailyGoals = [];


var helpMessage = "```\
{} - mandatory \n\
() - optional \n\
\n\
-=== Writing Sprint ===-\n\
# !sprint {minutes} (wordcount) :: Begin a sprint of the input duration, in minutes. You may specify a starting wordcount. \n\
# !join (wordcount) (sprintID) :: Join the current sprint. Can specify starting wordcount and a specific, non-expired sprint. \n\
# !quit :: Forfeit from the current sprint. \n\
# !wc {wordcount} :: Update your wordcount from the current sprint. This is the total amount - it overwrites your previous wordcount! \n\
# !time :: Display the time remaining in the current sprint. \n\
\n\
-=== Miscellaneous Utilities ===-\n\
# !dailygoal {wordcount} :: Sets a daily goal for you to achieve. Resets 24hrs after assignment. Use this command again if you want to increase / decrease your goal. \n\
# !dailywc {wordcount} :: Sets your current wordcount for the day. This it the total amount - it overwrites your previous wordcount! \n\
# !dailycheck :: Tells you how many words you've written today, what your goal is, and how much time you have left.\n\
\n\
# !sprintwords :: Displays total wordcount recorded from all the writing sprints. \n\
```";

var preEncouragement = ["Good luck!", "Good luck, everyone!", "", "", "Get ready!"];
var encouragement = [];

function getRandFromList(myArray) {
	return myArray[Math.floor(Math.random() * myArray.length)];
}

function timeRemaining(time, maxTime) {
	let dT = maxTime - time;
	let minutes = Math.floor(dT / 60);
	let seconds = dT - (minutes * 60);
	if(seconds < 10) {
		seconds = "0" + seconds;
	}
	if(minutes < 10) {
		minutes = "0" + minutes;
	}
	return minutes + ":" + seconds;
}

function hoursRemaining(time, maxTime) {
	var dT = time - (time - maxTime);
	let hours = Math.floor(dT / 3600);
	let minutes = Math.floor((dT - (hours * 3600))/60);
	let seconds = dT - (minutes * 60) - (hours * 3600);
	if(hours > 0) {
		hours = hours + " hour" + (hours == 1 ? ", " : "s, ");
	} else {
		hours = "";
	}
	if(minutes > 0) {
		minutes = minutes + " minute" + (minutes == 1 ? ", " : "s, ");
	} else {
		minutes = "";
	}
	seconds = seconds + " second" + (seconds == 1 ? "" : "s");
	
	return hours + minutes + seconds;
}

/*
	Main Interaction
*/
client.on('message', message => {
	if(message.content[0] === '!') {
		let tokens = message.content.substring(1).split(" ");
		
		/* Writing-sprint related commands */
		if(message.channel.name == 'writing_sprint') {
			/**
				@command	"!help"
				@desc		Displays the 'helpMessage' text to the channel
			*/
			if (tokens[0] === 'help') {
				message.channel.send(`Here is a list of all the commands ${message.author}:\n`)
				message.channel.send(helpMessage);
			
			/**
				@command	"!sprint"
				@desc		Begins the main 'writing sprint' functionality
			*/
			} else if (tokens[0] === "sprint") {
				// Cannot sprint if already in a sprint
				let inSprint = false;
				for(let sprint of activeSprints) {
					for(let sprinter of sprint.sprinters) {
						if(sprinter.name === '' + message.author) {
							inSprint = true;
							break;
						}
					}
					if(inSprint) {
						break;
					}
				}
				if(inSprint) {
					message.reply("you're already in a sprint! You can't be in more than one at a time.");
					return;
				}
				
				if(tokens.length < 2) {
					message.reply("correct syntax is: `!sprint {minutes}` ex: '!sprint 15'");
					return;
				}
				let minutes = parseInt(tokens[1]);
				if(isNaN(minutes)) {
					message.reply("correct syntax is: `!sprint {minutes}` ex: '!sprint 15'");
					return;
				}
				if(minutes > 40) {
					message.reply("you can't do sprints longer than 40 minutes. Sorry.");
					return;
				}
				if(minutes < 5) {
					message.reply("your sprint must be at least 5 minutes long.");
					return;
				}
				var defaultWordcount = 0;
				if(tokens.length > 2) {
					defaultWordcount = parseInt(tokens[2]);
					if(isNaN(defaultWordcount)) {
						defaultWordcount = 0;
					}
				}
				
				
				currentSprintID++;
				minutes = Math.floor(minutes);
				
				message.channel.send(`@Sprinters ${message.author} has started a new Sprint (#${currentSprintID})! \n**Duration**: ${minutes} ${minutes > 1 ? 'minutes' : 'minute'}`);
				message.channel.send("To participate, type `!join`. The sprint will begin in *1 minute*. " + getRandFromList(preEncouragement));
				
				let sprint = {'id': currentSprintID, 'owner': '' + message.author, 'duration': minutes, 'sprinters': []};
				sprint.sprinters.push({'name': '' + message.author, 'wordcount': 0, 'startingCount': defaultWordcount});
				activeSprints.unshift(sprint);
				
				sprint.paused = true;
				
				/*
					Function to call when the sprint's time is up
				*/
				let finish = () => {
					if(!sprint.cancelled) {
						let rawSprinters = [];
						for(let sprinter of sprint.sprinters) {
							rawSprinters.push(sprinter.name);
						}
						message.channel.send(`${rawSprinters.join(", ")}\nTime's up! Sprint #${sprint.id} has ended. You have **1 minute** to update your wordcount using` + " `!wc`.");
						
						setTimeout(() => {
							sprint.sprinters.sort((a, b) => {
								return (b.wordcount - b.startingCount) - (a.wordcount - a.startingCount);
							});
							
							let ending = "**RESULTS**:";
							let place = 1;
							for(let sprinter of sprint.sprinters) {
								ending += "\n";
								if(place == 1) {
									ending += ":first_place: ";
								} else if(place == 2) {
									ending += ":second_place: ";
								} else if(place == 3) {
									ending += ":third_place: ";
								} else {
									ending += ":pencil: ";
								}
								let wpm = Math.ceil((sprinter.wordcount - sprinter.startingCount) / minutes);
								ending += `${sprinter.name} finished with **${sprinter.wordcount - sprinter.startingCount}** words written (${wpm} WPM)`;
								
								if(!sprinterWPM[sprinter.name] || sprinterWPM[sprinter.name] < wpm) {
									ending += " (PERSONAL BEST!)";
								}
								if(!sprinterWords[sprinter.name]) {
									sprinterWords[sprinter.name] = (sprinter.wordcount - sprinter.startingCount);
								} else {
									sprinterWords[sprinter.name] += (sprinter.wordcount - sprinter.startingCount);
								}
								sprinterWPM[sprinter.name] = wpm;
								sprintWordcount += (sprinter.wordcount - sprinter.startingCount)
								
								place++;
							}
							message.channel.send(ending);
							
							for(let i = 0, l = activeSprints.length; i < l; i++) {
								if(activeSprints[i].id === sprint.id) {
									activeSprints.splice(i, 1);
									break;
								}
							}
							
						}, 60000);
					}
				};
				
				setTimeout(() => {
					if(!sprint.cancelled) {
						sprint.paused = false;
						
						var alertText = "";
						
						sprint.second = 0;
						sprint.maxSeconds = sprint.duration * 60;
						let editMessage = undefined;
						message.channel.send(`The sprint has begun!`);
						message.channel.send(`--> **TIME REMAINING: [${timeRemaining(sprint.second, sprint.maxSeconds)}]**`)
							.then(message => {
								editMessage = message;
							});
						
						let timer = setInterval(() => {
							if(sprint.cancelled) {
								clearInterval(timer);
								return;
							}
							if(sprint.second >= sprint.maxSeconds) {
								editMessage.edit(`--> **TIME REMAINING: [FINISHED!!]**`);
								clearInterval(timer);
								finish();
								return;
							}
							sprint.second += 5;
							if(editMessage) {
								editMessage.edit(`--> **TIME REMAINING: [${timeRemaining(sprint.second, sprint.maxSeconds)}]**`)
									.then(message => {
										editMessage = message;
									});
							}
							
						}, 5000);
						
					}
				}, 60000);
			
			/**
				@command	"!join"
				@desc		Joins a writing sprint in session
			*/
			} else if (tokens[0] === "join") {
				// Cannot sprint if already in a sprint
				let inSprint = false;
				for(let sprint of activeSprints) {
					for(let sprinter of sprint.sprinters) {
						if(sprinter.name === '' + message.author) {
							inSprint = true;
							break;
						}
					}
					if(inSprint) {
						break;
					}
				}
				if(inSprint) {
					message.reply("you're already in a sprint! You can't be in more than one at a time.");
					return;
				}
				if(!activeSprints.length) {
					message.reply("no active sprint found. Consider starting one yourself with the `!sprint` command.");
					return;
				}
				var startingCount = 0;
				var id = 0;
				if(tokens.length >= 2) {
					startingCount = parseInt(tokens[1]);
					if(isNaN(startingCount)) {
						startingCount = 0;
					}
				}
				if(tokens.length >= 3) {
					id = parseInt(tokens[2]);
					if(isNaN(id)) {
						id = 0;
					}
				}
				
				let sprint = activeSprints[0];
				if(!startingCount) {
					message.channel.send(`:white_check_mark: ${message.author} has joined the sprint.`);
				} else {
					message.channel.send(`:white_check_mark: ${message.author} has joined the sprint. Starting wordcount: ${startingCount}`);
				}
				sprint.sprinters.push({'name': '' + message.author, 'wordcount': 0, 'startingCount': startingCount});
			
			/**
				@command	"!wc"
				@desc		Update wordcount during a writing sprint
			*/
			} else if (tokens[0] === "wc") {
				let inSprint = undefined;
				for(let sprint of activeSprints) {
					for(let sprinter of sprint.sprinters) {
						if(sprinter.name === '' + message.author) {
							if(sprint.paused) {
								message.reply("you must wait for the sprint to actually begin!");
								return;
							}
							inSprint = sprinter;
							break;
						}
					}
					if(inSprint) {
						break;
					}
				}
				if(!inSprint) {
					message.reply("you are not in a sprint. Consider starting one yourself with the `!sprint` command.");
					return;
				}
				
				if(tokens.length < 2) {
					message.reply("correct syntax is: `!wc {wordcount}` ex: '!wc 400'");
					return;
				}
				let wordcount = parseInt(tokens[1]);
				if(isNaN(wordcount)) {
					message.reply("correct syntax is: `!wc {wordcount}` ex: '!wc 400'");
					return;
				}
				wordcount = Math.floor(wordcount);
				if(wordcount <= 0) {
					message.reply("i'm sorry, i'm afraid i can't let you do that :angry:");
					return;
				}
				
				let oldcount = inSprint.wordcount;
				inSprint.wordcount = wordcount;
				message.channel.send(`:white_check_mark: ${message.author} has written ${wordcount - oldcount} words. Total now: ${wordcount} words`)
			
			/**
				@command	"!time"
				@desc		Check the time left during a writing sprint
			*/
			} else if (tokens[0] === "time") {
				let inSprint = undefined;
				for(let sprint of activeSprints) {
					for(let sprinter of sprint.sprinters) {
						if(sprinter.name === '' + message.author) {
							inSprint = sprint;
							break;
						}
					}
					if(inSprint) {
						break;
					}
				}
				if(!inSprint) {
					message.reply("you are not in a sprint. Consider starting one yourself with the `!sprint` command.");
					return;
				}
				message.reply(`time remaining: **[${timeRemaining(inSprint.second, inSprint.maxSeconds)}]**`)
			
			}
		}	
		/* Miscellaneous commands */
			
		/**
			@command	"!dailygoal"
			@desc		Set or update your personal daily goal
		*/
		if (tokens[0] === "dailygoal") {
			if(tokens.length < 2) {
				message.reply("correct syntax is: `!dailygoal {wordcount}` ex: '!dailygoal 5000'");
				return;
			}
			let wordcount = parseInt(tokens[1]);
			if(isNaN(wordcount)) {
				message.reply("correct syntax is: `!dailygoal {wordcount}` ex: '!dailygoal 5000'");
				return;
			}
			wordcount = Math.floor(wordcount);
			if(wordcount <= 0) {
				message.reply("i'm sorry, i'm afraid i can't let you do that :angry:");
				return;
			}
			
			let entry = undefined;
			for(let E of dailyGoals) {
				if(E.user === '' + message.author) {
					entry = E;
				}
			}
			if(!entry) {
				entry = {'user': '' + message.author};
				dailyGoals.push(entry);
			} else {
				entry.done = false;
			}
			entry.channel = message.channel;
			entry.goal = wordcount;
			entry.wordcount = 0;
			entry.time = 86400;
			message.reply(`you have 24hrs to write ${wordcount} words. Good luck! You can check your progress with ` + "`!dailycheck` and update your wordcount with `!dailywc`.")
		
		/**
			@command	"!dailywc"
			@desc		Update your daily wordcount
		*/
		} else if (tokens[0] === "dailywc") {
			if(tokens.length < 2) {
				message.reply("correct syntax is: `!dailywc {wordcount}` ex: '!dailywc 2000'");
				return;
			}
			let wordcount = parseInt(tokens[1]);
			if(isNaN(wordcount)) {
				message.reply("correct syntax is: `!dailywc {wordcount}` ex: '!dailywc 2000'");
				return;
			}
			wordcount = Math.floor(wordcount);
			if(wordcount <= 0) {
				message.reply("i'm sorry, i'm afraid i can't let you do that :angry:");
				return;
			}
			let entry = undefined;
			for(let E of dailyGoals) {
				if(E.user === '' + message.author && !E.done) {
					entry = E;
				}
			}
			if(!entry) {
				message.reply("you'll first need to set a daily goal with `!dailygoal {wordcount}`");
				return;
			}
			entry.wordcount = wordcount;
			if(entry.wordcount < entry.goal) {
				message.reply(`you have written ${wordcount} words today! You have ${hoursRemaining(86400, entry.time)} to meet your goal of ${entry.goal} words.`);
			} else {
				entry.done = true;
				entry.channel.send(`:sparkles: ${entry.user}, you have **met** your daily goal of ${entry.goal} words! :sparkles: \nYou finished with ${entry.wordcount} words at ${hoursRemaining(86400, entry.time)} remaining!`)
			} 
		
		/**
			@command	"!dailycheck"
			@desc		Check the progress on your daily goal
		*/
		} else if (tokens[0] === "dailycheck") {
			let entry = undefined;
			for(let E of dailyGoals) {
				if(E.user === '' + message.author && !E.done) {
					entry = E;
				}
			}
			if(!entry) {
				message.reply("you'll first need to set a daily goal with `!dailygoal {wordcount}`");
				return;
			}
			message.reply(`you have written ${entry.wordcount} words today! You have ${hoursRemaining(86400, entry.time)} to meet your goal of ${entry.goal} words.`);
		
		/**
			@command	"!sprintwords"
			@desc		Output all sprinted words
		*/
		} else if (tokens[0] === "sprintwords") {
			message.reply(`sprinters have written a grand total of ${sprintWordcount} words!`);
		}
	}
  
});

/*
	Application entry point. Called when the bot connects to the server
*/

client.on('ready', () => {
	console.log('[JEREMY 2.0] started on ' + new Date());
	
	// Main iterary logic loop: T = 1000ms = 1s
	let i = 0;
	setInterval(() => {
		i++
		
		// Update the bot's status every 10 seconds
		if(!(i % 10)) {
			client.user.setGame(`${sprintWordcount} words | !help`);
		}
		// Update daily goals progress every 1s
		for(let entry of dailyGoals) {
			if(!entry.done) {
				entry.time --;
				if(entry.time <= 0) {
					if(entry.wordcount >= entry.goal) {
						entry.channel.send(`:sparkles: ${entry.user}, you have met your daily goal of ${entry.goal} words! :sparkles: \nYou finished with ${entry.wordcount} words.`);
					} else {
						entry.channel.send(`${entry.user}, your daily goal of ${entry.goal} words was not met.\nYou finished with ${entry.wordcount} words.`);
					}
					entry.done = true;
				}
			}
		}
	}, 1000);
});

client.login('[USER TOKEN GOES HERE]');