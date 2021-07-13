const http = require("http");
const mongodb = require("mongodb");
const parse = require("co-body");

const dbUri = "mongodb://localhost:27017";
const dbClient = new mongodb.MongoClient(dbUri, {
	useUnifiedTopology: true
});

let database;
let tweets;
let users;
async function connectToDB() {
	await dbClient.connect();
	database = dbClient.db("nidhaltweets");
	tweets = database.collection("tweets");
	users = database.collection("users");
	console.log("DB connection successfull!");
};

connectToDB().catch(err => console.error(err));

async function handleTweet(req, res) {
	const ip = req.headers["x-forwarded-for"] ||
		req.connection.remoteAdress || "127.0.0.1";
	const { tweet } = await parse.form(req);
	await saveTweet(tweet, ip);
	await saveUser(ip);
}

async function getTweets(query = {}) {
	try {
		const tweetsCursor = tweets.find(query).sort({ createdAt: -1 });
		return await tweetsCursor.toArray();
	} catch (err) {
		console.error(err);
	}
}

async function saveTweet(tweet, user) {
	try {
		await tweets.insertOne({
			tweet,
			user,
			createdAt: new Date()
		});
	} catch (err) {
		console.error(err);
	}
}

async function saveUser(ip) {
	try {
		const exists = await users.findOne({ ip });
		if (exists) return;
		await users.insertOne({ ip });
	} catch (err) {
		console.error(err);
	}
}

function tweetsTable(twts) {
	return twts.map((twt, i) => {
		const twtDate = new Date(twt.createdAt);
		return 	`
		<tr>
		  <td>${i + 1}</td>
		  <td>${twt.tweet}</td>
		  <td>
		    ${twtDate.toLocaleDateString()} ${twtDate.toLocaleTimeString()}
		  </td>
		</tr>
		`;
	}).join("\n");
}

const server = http.createServer(async function(req, res) {
	res.writeHead(200, { "Content-Type": "text/html" });
	if (req.url === "/" && req.method === "POST") {
        	await handleTweet(req, res);
        }
	const table = tweetsTable(await getTweets());
	const layout = `
	<form action="/" method="POST">
	  <textarea name="tweet"></textarea>
	  <input type="submit" value="Tweet"/>
	</form>
	<table border="1">
	${table}
	</table>
	`;
	res.end(layout);
});

server.listen(3000, function() {
	console.log("Server is started...");
});
