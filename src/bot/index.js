const Telegraf = require('telegraf');
const nconf = require('nconf');
const { encrypt } = require('./utils');
const { showBalance, showMyBalances, showBalances, transfer, addAddress, getAddress, removeAddress, startListenAccount, stopListenAccount, initListen } = require('./tron');

const { token, myChatId } = nconf.get('telegram');
const bot = new Telegraf(token);

const run = async () => {
  const hasBotCommands = (entities) => {
    if (!entities || !(entities instanceof Array)) {
      return false;
    }
  
    return entities.some(e => e.type === 'bot_command');
  };

  const helpMsg = ['/addaddress Add tron address',
    '/getaddress Show added addresses',
    '/removeaddress Remove tron address',
    '/startlisten Start listening to change balance',
    '/stoplisten Stop listening to change balance.',
    '/address Show balance of input address',
    '/showbalances Show balance of added address'];

  bot.help(ctx => ctx.reply(helpMsg.join('\n')));
  bot.start(ctx => ctx.reply(helpMsg.join('\n')));

  bot.command('address', ({ reply }) => reply('/address  Reply tron address to show balance.', { reply_markup: { force_reply: true, selective: true } }));

  bot.command('showbalances', async ({ reply, from: { id: resChatId } }) => {
    await showBalances(reply, resChatId);
  });

  bot.command('startlisten', async ({ from: { id: resChatId } }) => {
    await startListenAccount(resChatId);
  });

  bot.command('stoplisten', async ({ reply, from: { id: resChatId } }) => {
    await stopListenAccount(reply, resChatId);
  });

  bot.command('addaddress', ({ reply }) => reply('/addaddress Reply tron address to add.', { reply_markup: { force_reply: true, selective: true } }));

  bot.command('getaddress', ({ reply, from: { id: resChatId } }) => {
    getAddress(reply, resChatId);
  });

  bot.command('removeaddress', ({ reply }) => reply('/removeaddress Reply tron address to remove.', { reply_markup: { force_reply: true, selective: true } }));

  bot.command('transfer', ({ reply }) => reply('/transfer Reply password.', { reply_markup: { force_reply: true, selective: true } }));

  bot.command('show', ({ reply }) => reply('/show Reply password.', { reply_markup: { force_reply: true, selective: true } }));

  bot.command('encrypt', async ({ reply, from: { id: resChatId }, message: { text } }) => {
    if (myChatId === resChatId) {
      const [, password] = (text || '').split(' ');
      encrypt(password);
      reply('updated.');
    } else {
      reply('Unauthorized user.');
    }
  });

  bot.on('message', async (ctx) => {
    const { message, reply } = ctx;
    const resChatId = ctx.from.id;
    if (!hasBotCommands(message.entities)) {
      console.log(JSON.stringify(message, null, 2));
      const { reply_to_message } = message;
      if (reply_to_message) {
        const { text } = reply_to_message;
        if (text.startsWith('/transfer')) {
          if (myChatId === resChatId) {
            try {
              const [password, amount, address] = message.text.split(' ');
              console.log(password, amount === 'null' ? null : amount, address);
              await transfer(resChatId, reply, password, amount === 'null' ? null : amount, address === 'null' ? null : address);
            } catch (err) {
              reply(`Error Occured: ${JSON.stringify(err)}`);
            }
          } else {
            reply('Unauthorized user.');
          }
        }

        if (text.startsWith('/show')) {
          if (myChatId === resChatId) {
            try {
              const password = message.text;
              await showMyBalances(reply, password);
            } catch (err) {
              reply(`Error Occured: ${JSON.stringify(err)}`);
            }
          } else {
            reply('Unauthorized user.');
          }
        }

        if (text.startsWith('/addaddress')) {
          try {
            const address = message.text;
            await addAddress(resChatId, address, reply);
          } catch (err) {
            reply(`Error Occured: ${JSON.stringify(err)}`);
          }
        }

        if (text.startsWith('/removeaddress')) {
          try {
            const address = message.text;
            await removeAddress(resChatId, address, reply);
          } catch (err) {
            reply(`Error Occured: ${JSON.stringify(err)}`);
          }
        }

        if (text.startsWith('/address')) {
          try {
            const address = message.text;
            await showBalance(reply, address);
          } catch (err) {
            reply(`Error Occured: ${JSON.stringify(err)}`);
          }
        }
      }
    }
  });

  bot.catch((err) => {
    console.log('Ooops', err);
  });

  bot.startPolling();
  await initListen(bot);
};

module.exports = async () => {
  await run();
};