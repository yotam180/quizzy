var GROUP_ID = "972558850336-1515864647@g.us";

var HOUR = 3.6e6;

window.corrects = [];
window.incorrects = [];
window.questionTime = -1;
window.failed = [];
window.answerer = null;

var msg_in_group = function(sender, origin, message) {
	if (is_answer(message.body)) {
		answer_q(sender, message.body);
	}
};

var is_answer = function(txt) {
	return !!txt.match("^[א-ד]{1,3}$");
};

var get_score = function(id) {
	return parseInt(localStorage.getItem("score_" + id) || "0");
};

var set_score = function(id, score) {
	localStorage.setItem("score_" + id, score);
};

var question_txt = function(q) {
	var text = (q.multiple ? "_שאלת בחירה מרובה_\n" : "") + q.cat1 + " .. " + q.cat2 + "\n" + q.sentence + "\n\n" + q.question + "\n";
	var answerInedxes = "אבגד";
	for (var i = 0; i < q.answers.length; i++) {
		if (q.answers[i]) {
			text += "\n" + answerInedxes[i] + ") " + q.answers[i];
		}
	}
	
	return text;
};

var reset_vars = function(q) {
	window.corrects = q.correct;
	window.incorrects = q.incorrect;
	window.questionTime = new Date().getTime();
	window.failed = [];
	window.answerer = null;
};

var send_question = function(q) {
	var text = question_txt(q);
	
	API.sendTextMessage(GROUP_ID, text);
	
	reset_vars(q);
};

var answer_q = function(sender, answer) {
	sender = Core.contact(sender);
	
	if (window.questionTime == -1) {
		API.sendTextMessage(GROUP_ID, sender.__x_pushname + ", אין ברגע זה שאלה פעילה.");
		return;
	}
	
	if (window.answerer) {
		API.sendTextMessage(GROUP_ID, sender.__x_pushname + ", שאלה זו כבר נענתה על ידי " + window.answerer.__x_pushname);
		return;
	}
	
	if (~window.failed.indexOf(sender.__x_id)) {
		API.sendTextMessage(GROUP_ID, sender.__x_pushname + ", כבר ניסית לענות על שאלה זו.");
	}
	
	var correct = true;
	for (var i = 0; i < window.corrects.length; i++) {
		if (!~answer.indexOf(window.corrects[i])) {
			console.log("correct " + window.corrects[i] + " not here");
			correct = false;
		}
	}
	for (var i = 0; i < window.incorrects.length; i++) {
		if (~answer.indexOf(window.incorrects[i])) {
			console.log("incorrect " + window.incorrects[i] + " here");
			correct = false;
		}
	}
	
	if (correct) {
		window.answerer = sender;
		var mins = (new Date().getTime() - window.questionTime) / 60000;
		var score = Math.max(1, Math.round(20 - mins)); 
		set_score(sender.__x_id, get_score(sender.__x_id) + score);
		API.sendTextMessage(GROUP_ID, sender.__x_pushname + ", תשובה נכונה!" + "\nקיבלת " + score + "נקודות.\nעכשיו יש לך " + get_score(sender.__x_id) + " נקודות!");
	}
	else {
		window.failed.push(sender.__x_id);
		API.sendTextMessage(GROUP_ID, sender.__x_pushname + ", תשובתך אינה נכונה.");
		if (window.failed.length > 2) {
			API.sendTextMessage(GROUP_ID, "הקבוצה נכשלה במענה על השאלה. נא המתינו לשאלה חדשה.");
			window.questionTime = -1;
		}
	}
};

window.random_question = function() {
	if (new Date().getHours() > 21 || new Date().getHours() < 8) {
		setTimeout(random_question, HOUR);
		return;
	}
	
	send_question(window.questions[Math.round(Math.random() * questions.length - 1)]);
	
	var t = 3e5 + Math.random() * 3e5;
	console.log(t);
	setTimeout(random_question, t);
};

API.ready().then(function() {
	API.listener.ExternalHandlers.MESSAGE_RECEIVED.push(function(sender, origin, message) {
		if (origin == GROUP_ID) {
			msg_in_group(sender, origin, message);
		}
	});
	
	API.listener.ExternalHandlers.USER_JOIN_GROUP.push(function(o) {
		API.sendTextMessage(GROUP_ID, window.HELP_MSG);
		set_score(o.__x_id, 0);
	});
});