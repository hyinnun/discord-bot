const { Client, GatewayIntentBits } = require('discord.js');
const { Guilds, GuildMessages, MessageContent } = GatewayIntentBits;
const client = new Client({ intents: [Guilds, GuildMessages, MessageContent] });

const token = process.env.DISCORD_TOKEN;
const prefix = '!';

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('balances.db');

const cooldownTime = 30 * 60 * 1000; // 30분

db.serialize(() => {
    db.run("CREATE TABLE IF NOT EXISTS balances (user_id TEXT PRIMARY KEY, balance INTEGER, last_claim INTEGER)");
});

client.once('ready', () => {
    console.log(client.user.tag + ' 준비 완료!');
});

function addMoney(userId, amount) {
    db.get("SELECT balance FROM balances WHERE user_id = ?", [userId], (err, row) => {
        if (err) {
            console.error(err);
            return;
        }

        const balance = row ? row.balance : 0;
        const newBalance = balance + amount;

        db.run("INSERT OR REPLACE INTO balances (user_id, balance, last_claim) VALUES (?, ?, ?)", [userId, newBalance, Date.now()], (err) => {
            if (err) {
                console.error(err);
                return;
            }

            console.log(`사용자 ${userId}에게 ${amount} 돈 추가됨`);
        });
    });
}

client.on('messageCreate', (msg) => {
    if (msg.author.bot) return;

    const content = msg.content.trim();

    if (content === 'ㅎㅇ') {
        msg.reply('안녕하세요');
    }

    if (content.startsWith(prefix)) {
        const args = content.slice(prefix.length).trim().split(/ +/);
        const command = args.shift().toLowerCase();

        if (command === '도박') {
            const betAmount = parseInt(args[0]);

            if (isNaN(betAmount) || betAmount <= 0) {
                msg.reply('올바른 금액을 입력하세요.');
                return;
            }

            db.get("SELECT balance FROM balances WHERE user_id = ?", [msg.author.id], (err, row) => {
                if (err) {
                    console.error(err);
                    return;
                }

                const balance = row ? row.balance : 0;

                if (balance < betAmount) {
                    msg.reply('잔고가 부족합니다.');
                    return;
                }

                const result = Math.random() < 0.5 ? '승리' : '패배';

                if (result === '승리') {
                    const winnings = betAmount * 2;
                    const newBalance = balance + winnings;
                    msg.reply(`도박 결과: ${result}, ${winnings} 돈을 획득했습니다.`);
                    db.run("UPDATE balances SET balance = ? WHERE user_id = ?", [newBalance, msg.author.id]);
                } else {
                    const newBalance = balance - betAmount;
                    msg.reply(`도박 결과: ${result}, ${betAmount} 돈을 잃었습니다.`);
                    db.run("UPDATE balances SET balance = ? WHERE user_id = ?", [newBalance, msg.author.id]);
                }
            });
        }

        if (command === '돈줘') {
            db.get("SELECT last_claim FROM balances WHERE user_id = ?", [msg.author.id], (err, row) => {
                if (err) {
                    console.error(err);
                    return;
                }

                const currentTime = Date.now();
                const lastClaimTime = row ? row.last_claim : 0;

                if (currentTime - lastClaimTime >= cooldownTime) {
                    const amount = 10000; // 지급할 돈의 양 (원하는 값으로 변경 가능)

                    addMoney(msg.author.id, amount);
                    msg.reply(`${amount} 돈을 지급했습니다.`);

                    db.run("UPDATE balances SET last_claim = ? WHERE user_id = ?", [currentTime, msg.author.id]);
                } else {
                    const remainingTime = cooldownTime - (currentTime - lastClaimTime);
                    const remainingMinutes = Math.floor(remainingTime / (60 * 1000));
                    const remainingSeconds = Math.floor((remainingTime % (60 * 1000)) / 1000);
                    msg.reply(`다음 돈을 받을 수 있는 시간: ${remainingMinutes}분 ${remainingSeconds}초`);
                }
            });
        }

        if (command === '잔액') {
            db.get("SELECT balance FROM balances WHERE user_id = ?", [msg.author.id], (err, row) => {
                if (err) {
                    console.error(err);
                    return;
                }

                const balance = row ? row.balance : 0;
                msg.reply(`현재 잔액은 ${balance} 돈입니다.`);
            });
        }

        if (command === '돈지급' && msg.member.hasPermission('ADMINISTRATOR')) {
            const user = msg.mentions.users.first();
            const amount = parseInt(args[1]);

            if (!user || isNaN(amount) || amount <= 0) {
                msg.reply('올바른 명령어 형식을 사용하세요.');
                return;
            }

            addMoney(user.id, amount);
            msg.reply(`${user.tag} 님에게 ${amount} 돈을 지급했습니다.`);
        }
    }
});

client.login('MTIyOTQwNzkxMTIzMTM2MTE0OA.G309IL.8eNkhm6k3N1ZC4Xno2lahuJn0_yZVcVFEvYY_k')
