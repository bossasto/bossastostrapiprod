module.exports = ({ env }) => ({
  // email: {
  //   provider: 'smtp',
  //   providerOptions: {
  //     host: 'send.smtp.com', //SMTP Host
  //     port: 2525, //SMTP Port
  //     secure: true,
  //     username: 'noreply@bossasto.com',
  //     password: '12345678',
  //     rejectUnauthorized: true,
  //     requireTLS: true,
  //     connectionTimeout: 1,
  //   },
  //   settings: {
  //     from: 'noreply@bossasto.com',
  //     replyTo: 'your_email@gmail.com',
  //   },
  // },
  email: {
    provider: "sendgrid",
    providerOptions: {
      apiKey:
        "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",
      // "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",
    },
    settings: {
      defaultFrom: "bossasto@yopmail.com",
      defaultReplyTo: "bossasto@yopmail.com",
      testAddress: "bossasto@yopmail.com",
    },
  },
});
