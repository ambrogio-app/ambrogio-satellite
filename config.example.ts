export default {
  backend: { baseUrl: process.env.AMBROGIO_BACKEND_URL },
  client: {
    ...(process.env.AMBROGIO_CLIENT_ID ? { id: process.env.AMBROGIO_CLIENT_ID } : {}),
    ...(process.env.AMBROGIO_CLIENT_NAME ? { name: process.env.AMBROGIO_CLIENT_NAME } : {}),
  },
  audio: {
    ...(process.env.AMBROGIO_MICROPHONE ? { microphone: process.env.AMBROGIO_MICROPHONE } : {}),
    ...(process.env.AMBROGIO_SPEAKER ? { speaker: process.env.AMBROGIO_SPEAKER } : {}),
    ...(process.env.AMBROGIO_ATTENUATION_DEVICE ? { attenuation: {
      device: process.env.AMBROGIO_ATTENUATION_DEVICE,
      control: process.env.AMBROGIO_ATTENUATION_CONTROL,
      level: Number(process.env.AMBROGIO_ATTENUATION_LEVEL),
    } } : {}),
  },
  wakeWord: {
    model: process.env.AMBROGIO_WAKE_WORD_MODEL || 'hey_jarvis',
    threshold: Number(process.env.AMBROGIO_WAKE_WORD_THRESHOLD || 0.5),
    patience: Number(process.env.AMBROGIO_WAKE_WORD_PATIENCE || 2),
  },
  interaction: { replyTimeoutMs: Number(process.env.AMBROGIO_REPLY_TIMEOUT_MS || 15000) },
};
