const GROUP_ID = "972558850336-1515864647@g.us";
const OPERATOR = "972558850336@c.us";

window.corrects = [];
window.incorrects = [];
window.questionTime = -1;
window.answerers = [];
window.failed = [];


window.msg_in_group = function(sender, origin, message) {
		
}

window.private_message = function(sender, origin, message) {
	if (message.body == "עזרה") {
		API.sendTextMessage(origin, window.HELP_MSG);
	}
	if (is_answer_msg(message.body)) {
		answer_question(sender, message.body);
	}
}

window.is_answer_msg = function(txt) {
	return !!txt.match("^[א-ד]{1,3}$")
}

window.get_score = function(num) {
	return parseInt(localStorage.getItem("score_" + num) || "0");
}

window.set_score = function(num, score) {
	localStorage.setItem("score_" + num, score);
}

window.random_question = function() {
	
	if (new Date().getHours() > 21 || new Date().getHours() < 8) {
		setTimeout(random_question, 3.6e6);
		return;
	}
	
	send_question(window.questions[Math.round(Math.random() * questions.length)]);
}

window.send_question = function(q) {
	var text = (q.multiple ? "_שאלת בחירה מרובה_\n" : "") + q.cat1 + " .. " + q.cat2 + "\n" + q.sentence + "\n\n" + q.question + "\n";
	var answerInedxes = "אבגד";
	for (var i = 0; i < q.answers.length; i++) {
		if (q.answers[i]) {
			text += "\n" + answerInedxes[i] + ") " + q.answers[i];
		}
	}
	text += "\n\nשלחו את התשובה למספר שלמטה " + "👇";
	
	API.sendTextMessage(GROUP_ID, text);
	API.sendContactMessage(GROUP_ID, [OPERATOR]);
	
	window.corrects = q.correct;
	window.incorrects = q.incorrect;
	window.questionTime = new Date().getTime();
	window.answerers = [];
	window.failed = [];
	
	setTimeout(function() {
		for (var i = 0; i < Store.Msg.models.length; i++) {
			if (Store.Msg.models[i].__x_eventType == "d" && Store.Msg.models[i].__x_from == OPERATOR && Store.Msg.models[i].__x_to == GROUP_ID && Store.Msg.models[i].__x_body.indexOf("BEGIN:VCARD") == 0) {
				Store.Msg.models[i].sendRevoke();
			}
		}
		window.questionTime = -1;
		for (var i = 0; i < window.failed.length; i++) {
			API.sendTextMessage(window.failed[i], "התשובה הנכונה לשאלה היא: " + window.corrects.join(", "));
		}
		setTimeout(function() {
			random_question();
		}, Math.random() * 3e5 + 1.8e5);
	}, 3e5);
}

window.answer_question = function(sender, answer) {
	
	if (window.questionTime == -1) {
		API.sendTextMessage(sender, "אין ברגע זה שאלה פעילה.");
		return;
	}
	
	if (~window.answerers.indexOf(sender)) {
		API.sentTextMessage(sender, "כבר ענית על שאלה זו!");
		return;
	}
	if (~window.failed.indexOf(sender)) {
		API.sendTextMessage("ניתן לנסות לענות על כל שאלה פעם אחת בלבד");
		return;
	}
	
	var name = Core.contact(sender).__x_pushname;
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
		window.answerers.push(sender);
		if (window.answerers.length < 4) {
			API.sendTextMessage(sender, "תשובה נכונה!");
			API.sendTextMessage(GROUP_ID, ["", "1⃣","2⃣","3⃣"][window.answerers.length] + " " + name + " ענה נכון על שאלה זו!");
		}
	}
	else {
		window.failed.push(sender);
		API.sendTextMessage(sender, "תשובתך אינה נכונה.");
	}
	
}

API.ready().then(function() {
		
	API.listener.ExternalHandlers.MESSAGE_RECEIVED.push(function(sender, origin, message) {
		if (origin == GROUP_ID)
			msg_in_group(sender, origin, message);
		else if (!~origin.indexOf("-"))
			private_message(sender, origin, message);
	});
	
	random_question();
	
});