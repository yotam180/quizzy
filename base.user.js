var GROUP_ID = "972558850336-1515864647@g.us";

var HOUR = 3.6e6;

window.corrects = [];
window.incorrects = [];
window.questionTime = -1;
window.failed = [];
window.answered = false;

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
	window.answered = false;
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
	}
};

var random_question = function() {
	if (new Date().getHours() > 21 || new Date().getHours() < 8) {
		setTimeout(random_question, HOUR);
		return;
	}
	
	send_question(window.questions[Math.round(Math.random() * questions.length - 1)]);
};

API.ready().then(function() {
	API.listener.ExternalHandlers.MESSAGE_RECEIVED.push(function(sender, origin, message) {
		if (origin == GROUP_ID) {
			msg_in_group(sender, origin, message);
		}
	});
});