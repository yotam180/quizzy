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
	else if (message.body == "דירוג") {
		leaderboard();
	}
	else if (message.body == "מצב") {
		status(Core.contact(sender));
	}
	else if (message.body == "פודיום") {
		podium();
	}
};

var scores = function() {
	var res = [];
	Core.group(GROUP_ID).participants.models.forEach(x => {
		
		var m = Core.contact(x.__x_id);
		if (!m.__x_pushname) return;
		
		res.push({player: m, score: get_score(x.__x_id)});
	});
	res.sort((m, n) => n.score - m.score);
	return res;
};

var status = function(sid) {
	var v = scores();
	var i = v.findIndex(x => x.player.__x_id == sid.__x_id);
	
	API.sendTextMessage(GROUP_ID, sid.__x_pushname + ", יש לך " + v[i].score + " נקודות, ואתה במקום ה־" + (i + 1));
};

var podium = function() {
	var s =scores();
	if (s.length<3)
	{
		API.sendTextMessage(GROUP_ID, "אין מספיק שחקנים כדי להציג פודיום.");
		return;
	}
	var txt = "*פודיום:*\n";
	txt += "🥇 " + s[0].player.__x_pushname + ": " + s[0].score + " נק'\n";
	txt += "🥈 " + s[1].player.__x_pushname + ": " + s[1].score + " נק'\n";
	txt += "🥉 " + s[2].player.__x_pushname + ": " + s[2].score + " נק'\n";
	API.sendTextMessage(GROUP_ID, txt);
};

var leaderboard = function() {
	var s = scores();
	var txt = "*לוח מובילים:*\n";
	for (var i = 0; i < s.length && i < 20; i++) {
		txt += (i + 1) + ". " + s[i].player.__x_pushname + ": " + s[i].score + " נק'\n";
	}
	API.sendTextMessage(GROUP_ID, txt);
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
		return;
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

window.random_question = function(conservative_hours = false) {
	if (conservative_hours == true && (new Date().getHours() > 21 || new Date().getHours() < 8)) {
		setTimeout(() => { random_question(true); }, HOUR);
		return;
	}
	
	send_question(window.questions[Math.round(Math.random() * questions.length - 1)]);
	
	var t = 3e5 + Math.random() * 3e5;
	console.log(t);
	//setTimeout(random_question, t);
};

API.ready().then(function() {
	API.listener.ExternalHandlers.MESSAGE_RECEIVED.push(function(sender, origin, message) {
		if (origin == GROUP_ID) {
			msg_in_group(sender, origin, message);
		}
	});
	
	API.listener.ExternalHandlers.USER_JOIN_GROUP.push(function(o) {
		//API.sendTextMessage(GROUP_ID, window.HELP_MSG);
		set_score(o.__x_id, 0);
	});

});
	
document.body.innerHTML += `<div id='i_btn_rnd' style='z-index: 999999; position: fixed; top: 0; right: 0; height: 30px; width: 10%; background-color: gray; margin: 20px; border-radius: 20px; text-align: center; color: white; line-height: 30px; cursor: pointer;'>Send question</div>`;
document.body.innerHTML += `<div id='i_btn_clear' style='z-index: 999999; position: fixed; top: 50px; right: 0; height: 30px; width: 10%; background-color: gray; margin: 20px; border-radius: 20px; text-align: center; color: white; line-height: 30px; cursor: pointer;'>Clear group</div>`;
document.body.innerHTML += `<div id='i_btn_ldb' style='z-index: 999999; position: fixed; top: 100px; right: 0; height: 30px; width: 10%; background-color: gray; margin: 20px; border-radius: 20px; text-align: center; color: white; line-height: 30px; cursor: pointer;'>Leaderboard</div>`;
document.body.innerHTML += `<div id='i_btn_pdm' style='z-index: 999999; position: fixed; top: 150px; right: 0; height: 30px; width: 10%; background-color: gray; margin: 20px; border-radius: 20px; text-align: center; color: white; line-height: 30px; cursor: pointer;'>Podium</div>`;
document.body.innerHTML += `<img src='` + window.QUIZZY_LOGO + `' style='height: 100px; width: auto;'></img>`;

document.getElementById("i_btn_rnd").onclick = random_question;
document.getElementById("i_btn_clear").onclick = () => {
	Core.chat(GROUP_ID).sendClear();
};
document.getElementById("i_btn_ldb").onclick = () => {
	leaderboard();
};
document.getElementById("i_btn_pdm").onclick = () => {
	podium();
};
