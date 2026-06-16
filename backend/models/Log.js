const { mongoose } = require('../db_mongo');

const logSchema = new mongoose.Schema({
  evento:      { type: String, required: true },
  descricao:   { type: String, required: true },
  dados:       { type: mongoose.Schema.Types.Mixed, default: {} },
  usuario_api: { type: String, default: 'vet_app' },
  timestamp:   { type: Date, default: Date.now },
});

logSchema.index({ evento: 1 });
logSchema.index({ timestamp: -1 });

module.exports = mongoose.model('Log', logSchema);
