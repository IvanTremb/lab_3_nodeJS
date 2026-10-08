function logger(req, res, next) {
    const date = new Date().toLocaleString('ru-RU');
    console.log(`${req.method} | ${req.originalUrl} | ${date}`);
    next();
}

module.exports = logger;
