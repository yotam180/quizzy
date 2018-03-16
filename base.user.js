var GAMES = {};

function game() {
	return {
		questionTime: -1,
		answerer: null,
		corrects: [],
		incorrects: [],
		failed: []
	};
}

function msg_received(sender, origin, message) {
	if (!Object.keys(GAMES).includes(origin)) {
		return;
	}
	
	if (is_answer(message.body)) {
		answer_q(origin, sender, message.body);
	}
	else if (message.body == "דירוג") {
		leaderboard(origin);
	}
	else if (message.body == "מצב") {
		status(origin, Core.contact(sender));
	}
	else if (message.body == "פודיום") {
		podium(origin);
	}
}

function msg_sent(origin, message, m) {
	if (!Object.keys(GAMES).includes(origin)) {
		return;
	}
	
	if (message.body == "שאלה") {
		random_question(origin);
		Core.chat(origin).sendRevokeMsgs([m]);
	}
	else if (!isNaN(message.body)) {
		if (m.__x_quotedParticipant) {
			set_score(m.__x_quotedParticipant, get_score(m.__x_quotedParticipant) + parseInt(message.body));
			API.sendTextMessage(origin, "ניקודו של " + Core.contact(m.__x_quotedParticipant).__x_pushname + " שונה.");
		}
	}
	else if (message.body == "אפס") {
		if (m.__x_quotedParticipant) {
			set_score(m.__x_quotedParticipant, 0);
			API.sendTextMessage(origin, "ניקודו של " + Core.contact(m.__x_quotedParticipant).__x_pushname + " אופס.");
		}
		else {
			Core.group(origin).participants.models.forEach(x => {
				set_score(x.__x_id, 0);
			});
			API.sendTextMessage(origin, "ניקודם של כל חברי הקבוצה אופס.");
		}
	}
}

function scores(group_id) {
	var res = [];
	Core.group(group_id).participants.models.forEach(x => {
		
		var m = Core.contact(x.__x_id);
		if (!m.__x_pushname) return;
		
		res.push({player: m, score: get_score(x.__x_id)});
	});
	res.sort((m, n) => n.score - m.score);
	return res;
	
}

function status(group_id, sender_id) {
	var v = scores(group_id);
	var i = v.findIndex(x => x.player.__x_id == sender_id.__x_id);
	
	API.sendTextMessage(group_id, sender_id.__x_pushname + ", יש לך " + v[i].score + " נקודות, ואתה במקום ה־" + (i + 1));
}

function podium(group_id) {
	var s = scores(group_id);
	if (s.length < 3) {
		API.sendTextMessage(group_id, "אין מספיק שחקנים כדי להציג פודיום.");
		return;
	}
	
	var txt = "*פודיום:*\n";
	txt += "🥇 " + s[0].player.__x_pushname + ": " + s[0].score + " נק'\n";
	txt += "🥈 " + s[1].player.__x_pushname + ": " + s[1].score + " נק'\n";
	txt += "🥉 " + s[2].player.__x_pushname + ": " + s[2].score + " נק'\n";
	API.sendTextMessage(group_id, txt);
}

function leaderboard(group_id) {
	var s = scores(group_id);
	var txt = "*לוח מובילים:*\n";
	for (var i = 0; i < s.length && i < 20; i++) {
		txt += (i + 1) + ". " + s[i].player.__x_pushname + ": " + s[i].score + " נק'\n";
	}
	API.sendTextMessage(group_id, txt);
}

function is_answer(txt) {
	return !!txt.match("^[א-ד]{1,3}$");
}

function get_score(id) {
	return parseInt(localStorage.getItem("score_" + id) || "0");
}

function set_score(id, score) {
	localStorage.setItem("score_" + id, score);
}

function question_txt(q) {
	var text = (q.multiple ? "_שאלת בחירה מרובה_\n" : "") + q.cat1 + " .. " + q.cat2 + "\n" + q.sentence + "\n\n" + q.question + "\n";
	var answerInedxes = "אבגד";
	for (var i = 0; i < q.answers.length; i++) {
		if (q.answers[i]) {
			text += "\n" + answerInedxes[i] + ") " + q.answers[i];
		}
	}
	
	return text;
}

function reset_vars(group_id, q) {
	GAMES[group_id].corrects = q.correct;
	GAMES[group_id].incorrects = q.incorrect;
	GAMES[group_id].questionTime = new Date().getTime();
	GAMES[group_id].failed = [];
	GAMES[group_id].answerer = null;
}

function send_question(group_id, q) {
	var text = question_txt(q);
	
	API.sendTextMessage(group_id, text);
	
	reset_vars(group_id, q);
}

function answer_q(group_id, sender, answer) {
	sender = Core.contact(sender);
	
	if (GAMES[group_id].questionTime == -1) {
		API.sendTextMessage(group_id, sender.__x_pushname + ", אין ברגע זה שאלה פעילה.");
		return;
	}
	
	if (GAMES[group_id].answerer) {
		API.sendTextMessage(group_id, sender.__x_pushname + ", שאלה זו כבר נענתה על ידי " + window.answerer.__x_pushname);
		return;
	}
	
	if (~GAMES[group_id].failed.indexOf(sender.__x_id)) {
		API.sendTextMessage(group_id, sender.__x_pushname + ", כבר ניסית לענות על שאלה זו.");
		return;
	}
	
	var correct = true;
	for (var i = 0; i < GAMES[group_id].corrects.length; i++) {
		if (!~answer.indexOf(GAMES[group_id].corrects[i])) {
			console.log("correct " + GAMES[group_id].corrects[i] + " not here");
			correct = false;
		}
	}
	for (var i = 0; i < GAMES[group_id].incorrects.length; i++) {
		if (~answer.indexOf(GAMES[group_id].incorrects[i])) {
			console.log("incorrect " + GAMES[group_id].incorrects[i] + " here");
			correct = false;
		}
	}
	
	if (correct) {
		GAMES[group_id].answerer = sender;
		var mins = (new Date().getTime() - GAMES[group_id].questionTime) / 60000;
		var score = Math.ceil(100 / (mins + 0.5));
		set_score(sender.__x_id, get_score(sender.__x_id) + score);
		API.sendTextMessage(group_id, sender.__x_pushname + ", תשובה נכונה!" + "\nקיבלת " + score + "נקודות.\nעכשיו יש לך " + get_score(sender.__x_id) + " נקודות!");
	}
	else {
		GAMES[group_id].failed.push(sender.__x_id);
		API.sendTextMessage(group_id, sender.__x_pushname + ", תשובתך אינה נכונה.");
		if (GAMES[group_id].failed.length > 2) {
			API.sendTextMessage(group_id, "הקבוצה נכשלה במענה על השאלה. נא המתינו לשאלה חדשה.");
			GAMES[group_id].questionTime = -1;
		}
	}
}

window.random_question = function(group_id, conservative_hours = false) {
	if (conservative_hours == true && (new Date().getHours() > 21 || new Date().getHours() < 8)) {
		return;
	}
	
	send_question(group_id, window.questions[Math.round(Math.random() * questions.length - 1)]);
};

function cycle(group_id) {
	var time = Math.random() * 5e5 + 3e5;
	console.log("Cycle " + group_id, new Date(new Date().getTime() + time).toString());
	setTimeout(() => { 
		random_question(group_id);
		cycle(group_id); 
	}, time);
}

API.ready().then(function() {
	setTimeout(function() {
		console.log("Running");
		GROUP_IDS = API.findChatIds("Quizzy");
		GROUP_IDS.forEach(x => {
			Core.group(x).update().then(y => {
				console.log("Updated ", x);
				GAMES[x] = game();
				cycle(x);
			});
		});
		
			
		API.listener.ExternalHandlers.MESSAGE_RECEIVED.push(msg_received);
		API.listener.ExternalHandlers.MESSAGE_SENT.push(msg_sent);
		
		API.listener.ExternalHandlers.USER_JOIN_GROUP.push(function(o, s, origin) {
			if (!Object.keys(GAMES).includes(origin)) {
				return;
			}
	
	
			API.sendTextMessage(origin, Core.contact(o).__x_pushname + ", " + window.HELP_MSG);
			set_score(o.__x_id, 0);
		});
		
	}, 5000);
});